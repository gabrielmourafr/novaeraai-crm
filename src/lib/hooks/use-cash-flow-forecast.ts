"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CashFlowForecastMonth {
  month: string; // yyyy-mm-01
  label: string;
  receitasReais: number;
  receitasProjetadas: number;
  despesasReais: number;
  despesasProjetadas: number;
  totalPrevisto: number;
  saldoPrevisto: number;
}

const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

// Fluxo de caixa pra frente: mês atual + próximos 2. Combina o que já está
// registrado (receitas/despesas com due_date no período) com uma projeção
// simples pro que ainda não tem lançamento: mensalidades ativas sem receita
// gerada ainda no mês, e despesas fixas recorrentes sem lançamento no mês.
export const useCashFlowForecast = (monthsAhead = 3) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["cash-flow-forecast", monthsAhead],
    queryFn: async () => {
      const now = new Date();
      const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const rangeEnd = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 0);
      const rangeStartStr = monthKey(rangeStart);
      const rangeEndStr = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, "0")}-${String(rangeEnd.getDate()).padStart(2, "0")}`;

      const [revenuesRes, expensesRes, subsRes] = await Promise.all([
        supabase
          .from("revenues")
          .select("value, due_date, project_id, status")
          .neq("status", "cancelado")
          .gte("due_date", rangeStartStr)
          .lte("due_date", rangeEndStr),
        supabase
          .from("expenses")
          .select("value, due_date, description, recurrence, expense_type, status")
          .gte("due_date", rangeStartStr)
          .lte("due_date", rangeEndStr),
        supabase
          .from("projects")
          .select("id, billing_amount, contract_end")
          .eq("billing_status", "ativo"),
      ]);
      if (revenuesRes.error) throw revenuesRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (subsRes.error) throw subsRes.error;

      // Última despesa fixa recorrente conhecida por descrição, pra projetar
      // meses futuros sem lançamento — pega a mais recente de cada.
      const { data: fixedRecurring } = await supabase
        .from("expenses")
        .select("description, value, due_date")
        .eq("recurrence", "mensal")
        .eq("expense_type", "fixo")
        .order("due_date", { ascending: false });
      const latestFixedByDescription = new Map<string, number>();
      for (const e of fixedRecurring ?? []) {
        if (!latestFixedByDescription.has(e.description)) {
          latestFixedByDescription.set(e.description, Number(e.value));
        }
      }

      const months: CashFlowForecastMonth[] = [];
      for (let i = 0; i < monthsAhead; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const key = monthKey(d);

        const monthRevenues = (revenuesRes.data ?? []).filter((r) => r.due_date?.startsWith(key.slice(0, 7)));
        const monthExpenses = (expensesRes.data ?? []).filter((e) => e.due_date?.startsWith(key.slice(0, 7)));

        const receitasReais = monthRevenues.reduce((s, r) => s + Number(r.value), 0);
        const despesasReais = monthExpenses.reduce((s, e) => s + Number(e.value), 0);

        // Mensalidades ativas sem receita ainda gerada nesse mês
        const projectsWithRevenueThisMonth = new Set(monthRevenues.map((r) => r.project_id));
        let receitasProjetadas = 0;
        for (const sub of subsRes.data ?? []) {
          if (projectsWithRevenueThisMonth.has(sub.id)) continue;
          if (sub.contract_end && new Date(sub.contract_end) < d) continue;
          receitasProjetadas += Number(sub.billing_amount ?? 0);
        }

        // Despesas fixas recorrentes sem lançamento ainda nesse mês
        const descriptionsThisMonth = new Set(monthExpenses.map((e) => e.description));
        let despesasProjetadas = 0;
        for (const [description, value] of Array.from(latestFixedByDescription.entries())) {
          if (descriptionsThisMonth.has(description)) continue;
          despesasProjetadas += value;
        }

        const totalPrevisto = receitasReais + receitasProjetadas;
        const totalDespesaPrevisto = despesasReais + despesasProjetadas;
        months.push({
          month: key,
          label: `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
          receitasReais,
          receitasProjetadas,
          despesasReais,
          despesasProjetadas,
          totalPrevisto,
          saldoPrevisto: totalPrevisto - totalDespesaPrevisto,
        });
      }

      return months;
    },
  });
};
