"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type PartnerAdvance = Database["public"]["Tables"]["partner_advances"]["Row"];
type PartnerAdvanceInsert = Database["public"]["Tables"]["partner_advances"]["Insert"];
type PartnerAdvanceUpdate = Database["public"]["Tables"]["partner_advances"]["Update"];

export const usePartnerAdvances = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["partner-advances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_advances")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PartnerAdvance[];
    },
  });
};

export const useCreatePartnerAdvance = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PartnerAdvanceInsert) => {
      const { data, error } = await supabase.from("partner_advances").insert(input).select().single();
      if (error) throw error;
      return data as PartnerAdvance;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-advances"] });
      toast.success("Adiantamento registrado!");
    },
    onError: () => toast.error("Erro ao registrar adiantamento"),
  });
};

export const useUpdatePartnerAdvance = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: PartnerAdvanceUpdate & { id: string }) => {
      const { error } = await supabase.from("partner_advances").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-advances"] });
      toast.success("Adiantamento atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar adiantamento"),
  });
};

export const useDeletePartnerAdvance = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_advances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-advances"] });
      toast.success("Adiantamento removido!");
    },
    onError: () => toast.error("Erro ao remover adiantamento"),
  });
};
