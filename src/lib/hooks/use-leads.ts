"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export type LeadWithRelations = Lead & {
  company?: { id: string; name: string } | null;
  contact?: { id: string; full_name: string } | null;
  stage?: { id: string; name: string; color: string | null; position: number } | null;
  pipeline?: { id: string; name: string } | null;
};

interface UseLeadsOptions {
  pipelineId?: string;
  stageId?: string;
  search?: string;
  companyId?: string;
  contactId?: string;
}

export const useLeads = (
  pipelineIdOrOptions?: string | UseLeadsOptions,
  stageId?: string,
  search?: string
) => {
  const supabase = createClient();

  const opts: UseLeadsOptions =
    typeof pipelineIdOrOptions === "object"
      ? pipelineIdOrOptions
      : { pipelineId: pipelineIdOrOptions, stageId, search };

  return useQuery({
    queryKey: ["leads", opts.pipelineId, opts.stageId, opts.search, opts.companyId, opts.contactId],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select(
          `id, org_id, pipeline_id, stage_id, company_id, contact_id, title, value, temperature,
           origin, loss_reason, notes, tags, expected_close_date, closed_at, created_at, updated_at, created_by,
           company:companies(id, name),
           contact:contacts(id, full_name),
           stage:pipeline_stages(id, name, color, position),
           pipeline:pipelines(id, name)`
        )
        .order("created_at", { ascending: false });

      if (opts.pipelineId) query = query.eq("pipeline_id", opts.pipelineId);
      if (opts.stageId) query = query.eq("stage_id", opts.stageId);
      if (opts.search) query = query.ilike("title", `%${opts.search}%`);
      if (opts.companyId) query = query.eq("company_id", opts.companyId);
      if (opts.contactId) query = query.eq("contact_id", opts.contactId);

      const { data, error } = await query;
      if (error) throw error;
      return data as LeadWithRelations[];
    },
  });
};

export const useLead = (id: string) => {
  const supabase = createClient();
  return useQuery<LeadWithRelations | null>({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          `*, company:companies(id, name), contact:contacts(id, full_name),
           stage:pipeline_stages(id, name, color, position),
           pipeline:pipelines(id, name)`
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as LeadWithRelations;
    },
    enabled: !!id,
  });
};

export const useCreateLead = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeadInsert) => {
      const { data, error } = await supabase.from("leads").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead criado!");
    },
    onError: () => toast.error("Erro ao criar lead"),
  });
};

export const useUpdateLead = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: LeadUpdate & { id: string }) => {
      const { error } = await supabase.from("leads").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", vars.id] });
      toast.success("Lead atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar lead"),
  });
};

export const useDeleteLead = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead removido!");
    },
    onError: () => toast.error("Erro ao remover lead"),
  });
};

export const useMoveLead = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage_id }: { id: string; stage_id: string }) => {
      const { error } = await supabase.from("leads").update({ stage_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => toast.error("Erro ao mover lead"),
  });
};
