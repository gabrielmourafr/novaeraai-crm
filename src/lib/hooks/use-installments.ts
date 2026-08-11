"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Installment = Database["public"]["Tables"]["project_installments"]["Row"];
type InstallmentInsert = Database["public"]["Tables"]["project_installments"]["Insert"];
type InstallmentUpdate = Database["public"]["Tables"]["project_installments"]["Update"];

export type InstallmentWithRelations = Installment & {
  project?: { id: string; name: string; company_id: string | null } | null;
  phase?: { id: string; name: string; status: string } | null;
};

export const useProjectInstallments = (projectId: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["installments", "project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_installments")
        .select("*, phase:project_phases(id, name, status)")
        .eq("project_id", projectId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as InstallmentWithRelations[];
    },
    enabled: !!projectId,
  });
};

export const useAllInstallments = (statusFilter?: Installment["status"][]) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["installments", "all", statusFilter?.join(",") ?? "any"],
    queryFn: async () => {
      let query = supabase
        .from("project_installments")
        .select("*, project:projects(id, name, company_id), phase:project_phases(id, name, status)")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (statusFilter && statusFilter.length > 0) {
        query = query.in("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as InstallmentWithRelations[];
    },
  });
};

export const useCreateInstallment = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InstallmentInsert) => {
      const { data, error } = await supabase
        .from("project_installments")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Installment;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["installments"] });
      qc.invalidateQueries({ queryKey: ["installments", "project", vars.project_id] });
      toast.success("Parcela adicionada!");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao adicionar parcela");
    },
  });
};

export const useUpdateInstallment = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: InstallmentUpdate & { id: string }) => {
      const { error } = await supabase.from("project_installments").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["installments"] });
      toast.success("Parcela atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar parcela"),
  });
};

export const useDeleteInstallment = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_installments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["installments"] });
      toast.success("Parcela removida!");
    },
    onError: () => toast.error("Erro ao remover parcela"),
  });
};

export const useMarkInstallmentPaid = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_installments")
        .update({ status: "pago", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["installments"] });
      toast.success("Parcela marcada como paga!");
    },
    onError: () => toast.error("Erro ao marcar como paga"),
  });
};

// Helper para gerar parcelas a partir de um split de % (ex: [50, 50] ou [30, 40, 30])
export const buildInstallmentsPayload = ({
  projectId,
  orgId,
  contractValue,
  splits,
}: {
  projectId: string;
  orgId: string;
  contractValue: number;
  splits: { description: string; percentage: number; phase_id?: string | null; due_date?: string | null }[];
}): InstallmentInsert[] => {
  return splits.map((s, idx) => ({
    org_id: orgId,
    project_id: projectId,
    position: idx + 1,
    description: s.description,
    percentage: s.percentage,
    amount: Math.round((contractValue * s.percentage) / 100 * 100) / 100,
    phase_id: s.phase_id ?? null,
    due_date: s.due_date ?? null,
    status: "pendente",
  }));
};

export interface ClientInstallmentsSummary {
  companyId: string;
  companyName: string;
  totalCount: number;
  paidCount: number;
  remainingCount: number;
  paidValue: number;
  remainingValue: number;
  finalDueDate: string | null;
  installments: InstallmentWithRelations[];
}

// Acumulado de parcelas de implementação por cliente: quantas parcelas
// restam, o que já foi pago, e o total a receber até a data da última
// parcela do contrato (data de finalização das parcelas).
export const useClientInstallmentsSummary = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["installments", "clients-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_installments")
        .select("*, project:projects(id, name, company_id, company:companies(id, name))")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;

      type Row = InstallmentWithRelations & {
        project?: { id: string; name: string; company_id: string | null; company?: { id: string; name: string } | null } | null;
      };

      const map = new Map<string, ClientInstallmentsSummary>();
      for (const inst of (data ?? []) as unknown as Row[]) {
        const companyId = inst.project?.company_id ?? "__sem_empresa__";
        const companyName = inst.project?.company?.name ?? "Sem empresa";
        if (!map.has(companyId)) {
          map.set(companyId, {
            companyId,
            companyName,
            totalCount: 0,
            paidCount: 0,
            remainingCount: 0,
            paidValue: 0,
            remainingValue: 0,
            finalDueDate: null,
            installments: [],
          });
        }
        const entry = map.get(companyId)!;
        entry.totalCount += 1;
        entry.installments.push(inst);
        if (inst.status === "pago") {
          entry.paidCount += 1;
          entry.paidValue += Number(inst.amount);
        } else if (inst.status !== "cancelado") {
          entry.remainingCount += 1;
          entry.remainingValue += Number(inst.amount);
        }
        if (inst.due_date && (!entry.finalDueDate || inst.due_date > entry.finalDueDate)) {
          entry.finalDueDate = inst.due_date;
        }
      }

      return Array.from(map.values()).sort((a, b) => b.remainingValue - a.remainingValue);
    },
  });
};

export const INSTALLMENT_STATUS_META: Record<Installment["status"], { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "#94A3B8" },
  faturado: { label: "Faturado", color: "#0B87C3" },
  pago: { label: "Pago", color: "#10B981" },
  atrasado: { label: "Atrasado", color: "#EF4444" },
  cancelado: { label: "Cancelado", color: "#64748B" },
};
