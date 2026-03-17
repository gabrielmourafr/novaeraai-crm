"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
export type ProposalItem = Database["public"]["Tables"]["proposal_items"]["Row"];
type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];
type ProposalUpdate = Database["public"]["Tables"]["proposals"]["Update"];
type ProposalItemInsert = Database["public"]["Tables"]["proposal_items"]["Insert"];

export type ProposalWithRelations = Proposal & {
  company?: { id: string; name: string } | null;
  contact?: { id: string; full_name: string } | null;
  lead?: { id: string; title: string } | null;
  items?: ProposalItem[];
};

export const useProposals = (search?: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["proposals", search],
    queryFn: async () => {
      let query = supabase
        .from("proposals")
        .select(
          `*, company:companies(id, name), contact:contacts(id, full_name), lead:leads(id, title)`
        )
        .order("created_at", { ascending: false });
      if (search) query = query.ilike("number", `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as ProposalWithRelations[];
    },
  });
};

export const useProposal = (id: string) => {
  const supabase = createClient();
  return useQuery<ProposalWithRelations | null>({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select(
          `*, company:companies(id, name), contact:contacts(id, full_name),
           lead:leads(id, title), items:proposal_items(*)`
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as ProposalWithRelations;
    },
    enabled: !!id,
  });
};

export const useCreateProposal = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposal,
      items,
    }: {
      proposal: ProposalInsert;
      items: Omit<ProposalItemInsert, "proposal_id">[];
    }) => {
      const { data: created, error } = await supabase
        .from("proposals")
        .insert(proposal)
        .select("id")
        .single();
      if (error) throw error;
      const { id: proposalId } = created as { id: string };

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("proposal_items").insert(
          items.map((item) => ({ ...item, proposal_id: proposalId }))
        );
        if (itemsError) throw itemsError;
      }

      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta criada!");
    },
    onError: () => toast.error("Erro ao criar proposta"),
  });
};

export const useUpdateProposal = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: ProposalUpdate & { id: string }) => {
      const { error } = await supabase.from("proposals").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposal", vars.id] });
      toast.success("Proposta atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar proposta"),
  });
};

export const useDeleteProposal = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta removida!");
    },
    onError: () => toast.error("Erro ao remover proposta"),
  });
};

export const useAcceptProposal = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, accepted_ip }: { id: string; accepted_ip?: string }) => {
      const { error } = await supabase
        .from("proposals")
        .update({
          status: "aceita",
          accepted_at: new Date().toISOString(),
          accepted_ip: accepted_ip ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposal", vars.id] });
      toast.success("Proposta aceita!");
    },
    onError: () => toast.error("Erro ao aceitar proposta"),
  });
};

export const useSendProposal = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proposals")
        .update({ status: "enviada" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposal", id] });
      toast.success("Proposta enviada!");
    },
    onError: () => toast.error("Erro ao enviar proposta"),
  });
};

export const useUpdateProposalItems = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposalId,
      items,
    }: {
      proposalId: string;
      items: Omit<ProposalItemInsert, "proposal_id">[];
    }) => {
      const { error: delError } = await supabase
        .from("proposal_items")
        .delete()
        .eq("proposal_id", proposalId);
      if (delError) throw delError;

      if (items.length > 0) {
        const { error: insError } = await supabase
          .from("proposal_items")
          .insert(items.map((item) => ({ ...item, proposal_id: proposalId })));
        if (insError) throw insError;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["proposal", vars.proposalId] });
    },
    onError: () => toast.error("Erro ao atualizar itens da proposta"),
  });
};
