"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type PartnerPayment = Database["public"]["Tables"]["partner_payments"]["Row"];
type PartnerPaymentInsert = Database["public"]["Tables"]["partner_payments"]["Insert"];
type PartnerPaymentUpdate = Database["public"]["Tables"]["partner_payments"]["Update"];

export type PartnerPaymentWithRelations = PartnerPayment & {
  project?: { id: string; name: string; code: string } | null;
};

export const usePartnerPayments = (statusFilter?: PartnerPayment["status"][]) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["partner-payments", statusFilter?.join(",") ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("partner_payments")
        .select("*, project:projects(id, name, code)")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (statusFilter && statusFilter.length > 0) query = query.in("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PartnerPaymentWithRelations[];
    },
  });
};

export const useCreatePartnerPayment = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PartnerPaymentInsert) => {
      const { data, error } = await supabase.from("partner_payments").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-payments"] });
      toast.success("Pagamento registrado!");
    },
    onError: () => toast.error("Erro ao registrar pagamento"),
  });
};

export const useUpdatePartnerPayment = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: PartnerPaymentUpdate & { id: string }) => {
      const { error } = await supabase.from("partner_payments").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-payments"] });
      toast.success("Pagamento atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar pagamento"),
  });
};

export const useMarkPartnerPaymentPaid = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_payments")
        .update({ status: "pago", paid_at: new Date().toISOString().slice(0, 10) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-payments"] });
      toast.success("Marcado como pago!");
    },
    onError: () => toast.error("Erro ao marcar como pago"),
  });
};

export const useDeletePartnerPayment = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-payments"] });
      toast.success("Pagamento removido!");
    },
    onError: () => toast.error("Erro ao remover pagamento"),
  });
};

export const RECIPIENT_TYPE_LABEL: Record<PartnerPayment["recipient_type"], string> = {
  parceiro: "Parceiro Comercial",
  desenvolvedor: "Desenvolvedor",
};

export const PAYMENT_STATUS_META: Record<PartnerPayment["status"], { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "#94A3B8" },
  pago: { label: "Pago", color: "#10B981" },
  atrasado: { label: "Atrasado", color: "#EF4444" },
  cancelado: { label: "Cancelado", color: "#64748B" },
};
