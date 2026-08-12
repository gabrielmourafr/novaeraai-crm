"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { differenceInCalendarDays, parseISO } from "date-fns";

export interface BillingAlert {
  id: string;
  kind: "parcela_final" | "vencimento_proximo";
  companyId: string;
  companyName: string;
  projectId: string | null;
  projectName: string | null;
  description: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
  href: string;
}

type InstallmentRow = {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: string;
  project: { id: string; name: string; company_id: string | null; company: { id: string; name: string } | null } | null;
};

type RevenueRow = {
  id: string;
  description: string;
  value: number;
  due_date: string | null;
  status: string;
  project_id: string | null;
  company_id: string | null;
  company: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
};

// Dois alertas de vencimento, pedidos pelos sócios após o relatório de melhorias:
//  - "parcela_final": 30 dias antes da ÚLTIMA parcela de implementação de um
//    cliente vencer (ainda em aberto) — sinal pra negociar renovação/mensalidade
//  - "vencimento_proximo": 7 dias antes de QUALQUER parcela vencer, seja de
//    implementação ou mensalidade — sinal pra agilizar emissão de boleto
export const useBillingAlerts = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["billing-alerts"],
    queryFn: async () => {
      const [instRes, revRes] = await Promise.all([
        supabase
          .from("project_installments")
          .select("id, description, amount, due_date, status, project:projects(id, name, company_id, company:companies(id, name))")
          .not("due_date", "is", null)
          .neq("status", "cancelado"),
        supabase
          .from("revenues")
          .select("id, description, value, due_date, status, project_id, company_id, company:companies(id, name), project:projects(id, name)")
          .not("due_date", "is", null)
          .eq("recurrence", "mensal")
          .in("status", ["pendente", "atrasado"]),
      ]);
      if (instRes.error) throw instRes.error;
      if (revRes.error) throw revRes.error;

      const installments = (instRes.data ?? []) as unknown as InstallmentRow[];
      const revenues = (revRes.data ?? []) as unknown as RevenueRow[];
      const alerts: BillingAlert[] = [];

      // ── Regra 30 dias: última parcela de implementação por cliente ──
      const lastByCompany = new Map<string, InstallmentRow>();
      for (const inst of installments) {
        const companyId = inst.project?.company_id;
        if (!companyId || !inst.due_date) continue;
        const current = lastByCompany.get(companyId);
        if (!current || (current.due_date && inst.due_date > current.due_date)) {
          lastByCompany.set(companyId, inst);
        }
      }
      for (const inst of Array.from(lastByCompany.values())) {
        if (!inst.due_date || inst.status === "pago") continue;
        const days = differenceInCalendarDays(parseISO(inst.due_date), new Date());
        if (days >= 0 && days <= 30) {
          alerts.push({
            id: `final-${inst.id}`,
            kind: "parcela_final",
            companyId: inst.project!.company_id!,
            companyName: inst.project?.company?.name ?? "Sem empresa",
            projectId: inst.project?.id ?? null,
            projectName: inst.project?.name ?? null,
            description: `Última parcela do contrato: ${inst.description}`,
            amount: Number(inst.amount),
            dueDate: inst.due_date,
            daysUntil: days,
            href: inst.project ? `/projects/${inst.project.id}?tab=financeiro` : "/dashboard",
          });
        }
      }

      // ── Regra 7 dias: qualquer parcela (implementação ou mensalidade) ──
      for (const inst of installments) {
        if (!inst.due_date || inst.status === "pago") continue;
        const days = differenceInCalendarDays(parseISO(inst.due_date), new Date());
        if (days >= 0 && days <= 7) {
          alerts.push({
            id: `due-inst-${inst.id}`,
            kind: "vencimento_proximo",
            companyId: inst.project?.company_id ?? "",
            companyName: inst.project?.company?.name ?? "Sem empresa",
            projectId: inst.project?.id ?? null,
            projectName: inst.project?.name ?? null,
            description: `Parcela de implementação: ${inst.description}`,
            amount: Number(inst.amount),
            dueDate: inst.due_date,
            daysUntil: days,
            href: inst.project ? `/projects/${inst.project.id}?tab=financeiro` : "/dashboard",
          });
        }
      }
      for (const rev of revenues) {
        if (!rev.due_date) continue;
        const days = differenceInCalendarDays(parseISO(rev.due_date), new Date());
        if (days >= 0 && days <= 7) {
          alerts.push({
            id: `due-rev-${rev.id}`,
            kind: "vencimento_proximo",
            companyId: rev.company_id ?? "",
            companyName: rev.company?.name ?? "Sem empresa",
            projectId: rev.project_id,
            projectName: rev.project?.name ?? null,
            description: `Mensalidade: ${rev.description}`,
            amount: Number(rev.value),
            dueDate: rev.due_date,
            daysUntil: days,
            href: rev.project_id ? `/projects/${rev.project_id}?tab=financeiro` : "/dashboard",
          });
        }
      }

      return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
    },
  });
};
