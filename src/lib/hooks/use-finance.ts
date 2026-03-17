"use client";

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
        const to = `${year}-${String(month).padStart(2, "0")}-31`;
        query = query.gte("due_date", from).lte("due_date", to);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Revenue[];
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
        const to = `${year}-${String(month).padStart(2, "0")}-31`;
        query = query.gte("due_date", from).lte("due_date", to);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
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
