"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type ActiveSubscription = Pick<
  Database["public"]["Tables"]["projects"]["Row"],
  | "id"
  | "name"
  | "code"
  | "company_id"
  | "business_unit"
  | "billing_amount"
  | "billing_day"
  | "contract_start"
  | "contract_end"
  | "renewal_type"
  | "billing_status"
> & {
  company?: { id: string; name: string } | null;
};

export const useActiveSubscriptions = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["subscriptions", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, name, code, company_id, business_unit, billing_amount, billing_day, contract_start, contract_end, renewal_type, billing_status, company:companies(id, name)"
        )
        .eq("billing_status", "ativo")
        .order("billing_day", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as ActiveSubscription[];
    },
  });
};

// Garante que toda mensalidade ativa tenha a receita do mês corrente no
// Financeiro, sem depender de um cron externo — roda uma vez ao abrir a página.
export const useEnsureMonthlyBilling = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  useEffect(() => {
    supabase.rpc("ensure_monthly_billing_revenues").then(({ error }) => {
      if (error) {
        console.error("Erro ao gerar receitas de mensalidade:", error);
        return;
      }
      qc.invalidateQueries({ queryKey: ["revenues"] });
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export const formatMonthLabel = (monthKey: string) => {
  const [y, m] = monthKey.split("-");
  const names = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${names[Number(m) - 1]} / ${y}`;
};

export const nextBillingDate = (billingDay: number | null): Date | null => {
  if (!billingDay) return null;
  const today = new Date();
  const daysInThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const day = Math.min(billingDay, daysInThisMonth);
  let next = new Date(today.getFullYear(), today.getMonth(), day);
  if (next < today) {
    const daysInNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
    next = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(billingDay, daysInNextMonth));
  }
  return next;
};

export interface ClientMensalidadeSummary {
  projectId: string;
  companyId: string;
  companyName: string;
  projectName: string;
  billingAmount: number;
  contractStart: string | null;
  contractEnd: string | null;
  totalExpectedCycles: number | null; // null = contrato sem prazo definido
  paidCount: number;
  remainingCount: number | null; // null = sem prazo definido
}

const monthsBetweenInclusive = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
};

// Pra cada mensalidade ativa: quantos meses já foram pagos e quantos restam
// até o fim do contrato — hoje só dava pra saber calculando de cabeça pela
// data de término.
export const useClientMensalidadeSummary = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["subscriptions", "client-summary"],
    queryFn: async () => {
      const { data: subs, error: subsError } = await supabase
        .from("projects")
        .select("id, name, company_id, billing_amount, contract_start, contract_end, company:companies(id, name)")
        .eq("billing_status", "ativo");
      if (subsError) throw subsError;

      const subscriptions = (subs ?? []) as unknown as {
        id: string; name: string; company_id: string | null; billing_amount: number | null;
        contract_start: string | null; contract_end: string | null;
        company: { id: string; name: string } | null;
      }[];
      if (subscriptions.length === 0) return [] as ClientMensalidadeSummary[];

      const { data: paidRevenues, error: revError } = await supabase
        .from("revenues")
        .select("project_id")
        .in("project_id", subscriptions.map((s) => s.id))
        .eq("auto_source", "project_monthly_billing")
        .eq("status", "pago");
      if (revError) throw revError;

      const paidCountByProject = new Map<string, number>();
      for (const r of (paidRevenues ?? []) as { project_id: string | null }[]) {
        if (!r.project_id) continue;
        paidCountByProject.set(r.project_id, (paidCountByProject.get(r.project_id) ?? 0) + 1);
      }

      return subscriptions.map((s): ClientMensalidadeSummary => {
        const paidCount = paidCountByProject.get(s.id) ?? 0;
        const rawCycles =
          s.contract_start && s.contract_end ? monthsBetweenInclusive(s.contract_start, s.contract_end) : null;
        // contract_end anterior ao contract_start (dado inconsistente) vira "sem prazo definido"
        const totalExpectedCycles = rawCycles !== null && rawCycles > 0 ? rawCycles : null;
        return {
          projectId: s.id,
          companyId: s.company_id ?? "",
          companyName: s.company?.name ?? "Sem empresa",
          projectName: s.name,
          billingAmount: Number(s.billing_amount ?? 0),
          contractStart: s.contract_start,
          contractEnd: s.contract_end,
          totalExpectedCycles,
          paidCount,
          remainingCount: totalExpectedCycles !== null ? Math.max(0, totalExpectedCycles - paidCount) : null,
        };
      });
    },
  });
};

export interface MensalidadeReceivedItem {
  id: string;
  description: string;
  value: number;
  paidAt: string;
  companyName: string;
  projectName: string | null;
}

export interface MensalidadeReceivedMonth {
  month: string; // yyyy-mm-01
  total: number;
  items: MensalidadeReceivedItem[];
}

// Histórico de mensalidades já recebidas, agrupado por mês — pra ver
// exatamente qual mês cada mensalidade caiu, além do total geral.
export const useMensalidadeReceivedHistory = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["subscriptions", "received-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenues")
        .select("id, description, value, paid_at, due_date, company:companies(name), project:projects(name)")
        .eq("auto_source", "project_monthly_billing")
        .eq("status", "pago")
        .order("paid_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      type Row = {
        id: string; description: string; value: number; paid_at: string | null; due_date: string | null;
        company: { name: string } | null; project: { name: string } | null;
      };

      const byMonth = new Map<string, MensalidadeReceivedMonth>();
      for (const r of (data ?? []) as unknown as Row[]) {
        const ref = r.paid_at ?? r.due_date;
        if (!ref) continue;
        const monthKey = `${ref.slice(0, 7)}-01`;
        if (!byMonth.has(monthKey)) byMonth.set(monthKey, { month: monthKey, total: 0, items: [] });
        const entry = byMonth.get(monthKey)!;
        entry.total += Number(r.value);
        entry.items.push({
          id: r.id,
          description: r.description,
          value: Number(r.value),
          paidAt: r.paid_at ?? r.due_date!,
          companyName: r.company?.name ?? "Sem empresa",
          projectName: r.project?.name ?? null,
        });
      }

      return Array.from(byMonth.values()).sort((a, b) => b.month.localeCompare(a.month));
    },
  });
};

export const useMensalidadeReceivedTotal = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["subscriptions", "received-total"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenues")
        .select("value")
        .eq("auto_source", "project_monthly_billing")
        .eq("status", "pago");
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + Number(r.value), 0);
    },
  });
};

export const RENEWAL_LABEL: Record<string, string> = {
  auto: "Automática",
  manual: "Manual",
  no_renewal: "Sem renovação",
};
