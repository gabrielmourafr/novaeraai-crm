"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type UpsellSuggestion = Database["public"]["Tables"]["upsell_suggestions"]["Row"];
type Insert = Database["public"]["Tables"]["upsell_suggestions"]["Insert"];
type Update = Database["public"]["Tables"]["upsell_suggestions"]["Update"];

export type UpsellWithRelations = UpsellSuggestion & {
  company?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  product?: { id: string; name: string; base_price: number; business_unit: string } | null;
};

export const useUpsells = (filters?: { companyId?: string; projectId?: string; status?: UpsellSuggestion["status"] }) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["upsells", filters?.companyId, filters?.projectId, filters?.status],
    queryFn: async () => {
      let query = supabase
        .from("upsell_suggestions")
        .select(
          "*, company:companies(id, name), project:projects(id, name), product:products(id, name, base_price, business_unit)"
        )
        .order("created_at", { ascending: false });
      if (filters?.companyId) query = query.eq("company_id", filters.companyId);
      if (filters?.projectId) query = query.eq("project_id", filters.projectId);
      if (filters?.status) query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as UpsellWithRelations[];
    },
  });
};

export const useCreateUpsell = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Insert) => {
      const { data, error } = await supabase.from("upsell_suggestions").insert(input).select().single();
      if (error) throw error;
      return data as UpsellSuggestion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["upsells"] });
      toast.success("Sugestão de upsell adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar sugestão"),
  });
};

export const useUpdateUpsell = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Update & { id: string }) => {
      const { error } = await supabase.from("upsell_suggestions").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["upsells"] }),
    onError: () => toast.error("Erro ao atualizar sugestão"),
  });
};

export const useDeleteUpsell = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("upsell_suggestions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["upsells"] });
      toast.success("Sugestão removida!");
    },
    onError: () => toast.error("Erro ao remover"),
  });
};

export const UPSELL_STATUS_META: Record<UpsellSuggestion["status"], { label: string; color: string }> = {
  sugerido:       { label: "Sugerido", color: "#94A3B8" },
  em_negociacao:  { label: "Em negociação", color: "#0B87C3" },
  convertido:     { label: "Convertido", color: "#10B981" },
  descartado:     { label: "Descartado", color: "#64748B" },
};

export const UPSELL_PRIORITY_META: Record<UpsellSuggestion["priority"], { label: string; color: string }> = {
  baixa:    { label: "Baixa", color: "#10B981" },
  media:    { label: "Média", color: "#6366F1" },
  alta:     { label: "Alta", color: "#F59E0B" },
  urgente:  { label: "Urgente", color: "#EF4444" },
};

// Auto-suggestion algorithm
type AutoUpsellInput = {
  companyId: string;
  companyName: string;
  catalogProducts: { id: string; name: string; base_price: number; status: string }[];
  contractEndingSoonDays?: number | null;
};

export type AutoSuggestion = {
  key: string;
  companyId: string;
  companyName: string;
  productId?: string;
  productName: string;
  reason: string;
  estimatedValue: number;
  priority: UpsellSuggestion["priority"];
};

export function computeAutoSuggestions(input: AutoUpsellInput): AutoSuggestion[] {
  const suggestions: AutoSuggestion[] = [];
  const { companyId, companyName, catalogProducts, contractEndingSoonDays } = input;

  // Se o contrato está prestes a vencer (≤60 dias), sugerir renovação/upgrade
  if (contractEndingSoonDays !== null && contractEndingSoonDays !== undefined && contractEndingSoonDays >= 0 && contractEndingSoonDays <= 60) {
    const activeProducts = catalogProducts.filter((p) => p.status === "ativo");
    const topProduct = [...activeProducts].sort((a, b) => b.base_price - a.base_price)[0];
    suggestions.push({
      key: `${companyId}-renewal`,
      companyId,
      companyName,
      productId: topProduct?.id,
      productName: topProduct?.name ?? "Renovação Premium",
      reason: `Contrato vence em ${contractEndingSoonDays} dias — oportunidade de renovação/upgrade`,
      estimatedValue: topProduct?.base_price ?? 0,
      priority: contractEndingSoonDays <= 30 ? "alta" : "media",
    });
  }

  return suggestions;
}
