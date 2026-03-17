"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

export const useCompanies = (search?: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["companies", search],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select("id, name, trade_name, cnpj, segment, size, website, tags, created_at")
        .order("name");
      if (search) query = query.ilike("name", `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCompany = (id: string) => {
  const supabase = createClient();
  return useQuery<Company | null>({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Company;
    },
    enabled: !!id,
  });
};

export const useCreateCompany = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CompanyInsert) => {
      const { data, error } = await supabase.from("companies").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa criada!");
    },
    onError: () => toast.error("Erro ao criar empresa"),
  });
};

export const useUpdateCompany = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: CompanyUpdate & { id: string }) => {
      const { error } = await supabase.from("companies").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["company", vars.id] });
      toast.success("Empresa atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar empresa"),
  });
};

export const useDeleteCompany = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa removida!");
    },
    onError: () => toast.error("Erro ao remover empresa"),
  });
};
