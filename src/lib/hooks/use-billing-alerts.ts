"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { differenceInCalendarDays, parseISO } from "date-fns";

// Janela de aviso. Eram 7 dias, curto demais na prática: uma mensalidade
// vencendo dia 12 não aparecia em nenhum momento útil pra emitir boleto.
export const DUE_SOON_DAYS = 20;
export const FINAL_INSTALLMENT_DAYS = 30;

export interface BillingAlert {
  id: string;
  kind: "parcela_final" | "vencimento_proximo";
  // "previsto" = data que ainda não virou lançamento (mensalidade que será
  // gerada, valor a receber do projeto). Aparece igual, marcado como tal.
  forecast: boolean;
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
      const [instRes, revRes, projRes] = await Promise.all([
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
        supabase
          .from("projects")
          .select(
            "id, name, company_id, billing_status, billing_day, billing_amount, contract_end, receivable_value, receivable_due_date, company:companies(id, name)"
          ),
      ]);
      if (instRes.error) throw instRes.error;
      if (revRes.error) throw revRes.error;
      if (projRes.error) throw projRes.error;

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
        if (days >= 0 && days <= FINAL_INSTALLMENT_DAYS) {
          alerts.push({
            id: `final-${inst.id}`,
            kind: "parcela_final",
            forecast: false,
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
        if (days >= 0 && days <= DUE_SOON_DAYS) {
          alerts.push({
            id: `due-inst-${inst.id}`,
            kind: "vencimento_proximo",
            forecast: false,
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
        if (days >= 0 && days <= DUE_SOON_DAYS) {
          alerts.push({
            id: `due-rev-${rev.id}`,
            kind: "vencimento_proximo",
            forecast: false,
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

      // ── Previstos: datas que ainda não viraram lançamento ──
      // Sem isso, o alerta só existe depois que alguém (ou o gerador mensal)
      // cria a linha — e é justamente ANTES disso que avisar é útil.
      type ProjectRow = {
        id: string; name: string; company_id: string | null;
        billing_status: string | null; billing_day: number | null; billing_amount: number | null;
        contract_end: string | null; receivable_value: number | null; receivable_due_date: string | null;
        company: { id: string; name: string } | null;
      };
      const projects = (projRes.data ?? []) as unknown as ProjectRow[];

      const revenueMonthsByProject = new Set(
        revenues
          .filter((r) => r.project_id && r.due_date)
          .map((r) => `${r.project_id}__${r.due_date!.slice(0, 7)}`)
      );

      for (const p of projects) {
        // Mensalidade ativa: projeta o próximo vencimento pelo dia de cobrança.
        if (p.billing_status === "ativo" && p.billing_day && p.billing_amount) {
          const today = new Date();
          for (const monthOffset of [0, 1]) {
            const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, Math.min(p.billing_day, 28));
            const days = differenceInCalendarDays(d, today);
            if (days < 0 || days > DUE_SOON_DAYS) continue;
            if (p.contract_end && d > parseISO(p.contract_end)) continue;

            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            // Já existe receita lançada nesse mês? Então o alerta real já saiu.
            if (revenueMonthsByProject.has(`${p.id}__${monthKey}`)) continue;

            alerts.push({
              id: `forecast-billing-${p.id}-${monthKey}`,
              kind: "vencimento_proximo",
              forecast: true,
              companyId: p.company_id ?? "",
              companyName: p.company?.name ?? "Sem empresa",
              projectId: p.id,
              projectName: p.name,
              description: `Mensalidade prevista: ${p.name}`,
              amount: Number(p.billing_amount),
              dueDate: `${monthKey}-${String(d.getDate()).padStart(2, "0")}`,
              daysUntil: days,
              href: `/projects/${p.id}?tab=financeiro`,
            });
          }
        }

        // Valor a receber com data prevista no projeto.
        if (p.receivable_value && p.receivable_due_date) {
          const days = differenceInCalendarDays(parseISO(p.receivable_due_date), new Date());
          if (days >= 0 && days <= DUE_SOON_DAYS) {
            alerts.push({
              id: `forecast-receivable-${p.id}`,
              kind: "vencimento_proximo",
              forecast: true,
              companyId: p.company_id ?? "",
              companyName: p.company?.name ?? "Sem empresa",
              projectId: p.id,
              projectName: p.name,
              description: `A receber previsto: ${p.name}`,
              amount: Number(p.receivable_value),
              dueDate: p.receivable_due_date,
              daysUntil: days,
              href: `/projects/${p.id}?tab=financeiro`,
            });
          }
        }
      }

      return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
    },
  });
};
