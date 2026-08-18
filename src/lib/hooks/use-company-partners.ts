"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type CompanyPartner = Database["public"]["Tables"]["company_partners"]["Row"];
type CompanyPartnerInsert = Database["public"]["Tables"]["company_partners"]["Insert"];
type CompanyPartnerUpdate = Database["public"]["Tables"]["company_partners"]["Update"];

export const useCompanyPartners = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["company-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_partners")
        .select("*")
        .eq("active", true)
        .order("percentage", { ascending: false });
      if (error) throw error;
      return data as CompanyPartner[];
    },
  });
};

export const useCreateCompanyPartner = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CompanyPartnerInsert) => {
      const { data, error } = await supabase.from("company_partners").insert(input).select().single();
      if (error) throw error;
      return data as CompanyPartner;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-partners"] });
      toast.success("Sócio adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar sócio"),
  });
};

export const useUpdateCompanyPartner = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: CompanyPartnerUpdate & { id: string }) => {
      const { error } = await supabase.from("company_partners").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-partners"] });
      toast.success("Sócio atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar sócio"),
  });
};

export const useDeleteCompanyPartner = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-partners"] });
      toast.success("Sócio removido!");
    },
    onError: () => toast.error("Erro ao remover sócio"),
  });
};
