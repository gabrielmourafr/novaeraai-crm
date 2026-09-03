"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Revenue = Database["public"]["Tables"]["revenues"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type RevenueInsert = Database["public"]["Tables"]["revenues"]["Insert"];
type RevenueUpdate = Database["public"]["Tables"]["revenues"]["Update"];
type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];
type ExpenseUpdate = Database["public"]["Tables"]["expenses"]["Update"];

export const useProjectRevenues = (projectId: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["revenues", "project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenues")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as Revenue[];
    },
    enabled: !!projectId,
  });
};

export const useCompanyRevenues = (companyId: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["revenues", "company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenues")
        .select("*")
        .eq("company_id", companyId)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data as Revenue[];
    },
    enabled: !!companyId,
  });
};

export const useRevenues = (year?: number, month?: number) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["revenues", year, month],
    queryFn: async () => {
      let query = supabase.from("revenues").select("*").order("due_date", { ascending: false });
      if (year && month) {
        const from = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        query = query.gte("due_date", from).lte("due_date", to);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Revenue[];
    },
  });
};

export const useTotalRevenues = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["revenues", "total"],
    queryFn: async () => {
      const { data, error } = await supabase.from("revenues").select("value").eq("status", "pago");
      if (error) throw error;
      return (data ?? []).reduce((sum, r) => sum + Number(r.value), 0);
    },
  });
};

export const useExpenses = (year?: number, month?: number) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["expenses", year, month],
    queryFn: async () => {
      let query = supabase.from("expenses").select("*").order("due_date", { ascending: false });
      if (year && month) {
        const from = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        query = query.gte("due_date", from).lte("due_date", to);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
  });
};

// Previsão de pagamento das despesas fixas — todas as pendentes/atrasadas
// marcadas como "fixo", com vencimento futuro, independente do mês
// selecionado no filtro. Usado no bloco de previsão da aba Despesas.
export const useUpcomingFixedExpenses = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["expenses", "upcoming-fixed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("expense_type", "fixo")
        .in("status", ["pendente", "atrasado"])
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as Expense[];
    },
  });
};

export const useRevenuesLastMonths = (year: number, month: number, months = 6) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["revenues", "months", year, month, months],
    queryFn: async () => {
      const result: Record<string, Revenue[]> = {};
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const from = `${y}-${String(m).padStart(2, "0")}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        const { data, error } = await supabase
          .from("revenues")
          .select("*")
          .gte("due_date", from)
          .lte("due_date", to)
          .order("due_date", { ascending: false });
        if (error) throw error;
        result[`${y}-${String(m).padStart(2, "0")}`] = data as Revenue[];
      }
      return result;
    },
  });
};

// Igual a useRevenuesLastMonths, mas olhando pra frente: começa no mês
// selecionado e segue os N meses seguintes — usado nos gráficos de
// previsibilidade (Implementação), onde o que importa é o que vem
// depois do período escolhido, não o histórico.
export const useRevenuesForwardMonths = (year: number, month: number, months = 6) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["revenues", "months-forward", year, month, months],
    queryFn: async () => {
      const result: Record<string, Revenue[]> = {};
      for (let i = 0; i < months; i++) {
        const d = new Date(year, month - 1 + i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const from = `${y}-${String(m).padStart(2, "0")}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        const { data, error } = await supabase
          .from("revenues")
          .select("*")
          .gte("due_date", from)
          .lte("due_date", to)
          .order("due_date", { ascending: false });
        if (error) throw error;
        result[`${y}-${String(m).padStart(2, "0")}`] = data as Revenue[];
      }
      return result;
    },
  });
};

export const useExpensesLastMonths = (year: number, month: number, months = 6) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["expenses", "months", year, month, months],
    queryFn: async () => {
      const result: Record<string, Expense[]> = {};
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const from = `${y}-${String(m).padStart(2, "0")}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .gte("due_date", from)
          .lte("due_date", to)
          .order("due_date", { ascending: false });
        if (error) throw error;
        result[`${y}-${String(m).padStart(2, "0")}`] = data as Expense[];
      }
      return result;
    },
  });
};

export const useCreateRevenue = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RevenueInsert) => {
      const { data, error } = await supabase.from("revenues").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenues"] });
      toast.success("Receita adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar receita"),
  });
};

export const useUpdateRevenue = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: RevenueUpdate & { id: string }) => {
      const { error } = await supabase.from("revenues").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenues"] });
      toast.success("Receita atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar receita"),
  });
};

export const useDeleteRevenue = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("revenues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenues"] });
      toast.success("Receita removida!");
    },
    onError: () => toast.error("Erro ao remover receita"),
  });
};

export const useCreateExpense = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseInsert) => {
      const { data, error } = await supabase.from("expenses").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Despesa adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar despesa"),
  });
};

export const useUpdateExpense = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: ExpenseUpdate & { id: string }) => {
      const { error } = await supabase.from("expenses").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Despesa atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar despesa"),
  });
};

export const useDeleteExpense = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Despesa removida!");
    },
    onError: () => toast.error("Erro ao remover despesa"),
  });
};

export type ExpenseWithCompany = Expense & { company?: { id: string; name: string } | null };

// Modelos de despesa fixa recorrente vinculada a cliente (ex: VPS de um
// cliente, cobrada todo dia X, com prazo de contrato) — a linha em si não
// tem vencimento, ela só gera a despesa do mês via ensure_monthly_fixed_expenses.
export const useRecurringExpenseTemplates = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["expenses", "recurring-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, company:companies(id, name)")
        .eq("is_recurring_template", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ExpenseWithCompany[];
    },
  });
};

// Despesa "agendada" (pagamento programado, tipo débito automático ou
// boleto agendado) vira "pago" sozinha ao chegar a data de vencimento —
// sem esperar alguém abrir o sistema e trocar manualmente. Mesmo padrão
// sem cron das demais rotinas daqui: dispara por RPC ao abrir a tela.
export const useMarkScheduledExpensesAsPaid = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  useEffect(() => {
    supabase.rpc("mark_scheduled_expenses_as_paid").then(({ error }) => {
      if (error) {
        console.error("Erro ao efetivar despesas agendadas:", error);
        return;
      }
      qc.invalidateQueries({ queryKey: ["expenses"] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

// Garante que toda despesa fixa recorrente de cliente tenha o lançamento do
// mês corrente gerado, sem depender de cron externo — roda ao abrir a página,
// igual já acontece com a mensalidade dos projetos.
export const useEnsureMonthlyFixedExpenses = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  useEffect(() => {
    supabase.rpc("ensure_monthly_fixed_expenses").then(({ error }) => {
      if (error) {
        console.error("Erro ao gerar despesas fixas recorrentes:", error);
        return;
      }
      qc.invalidateQueries({ queryKey: ["expenses"] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
