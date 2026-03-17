"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"];
export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];

type StageInsert = Database["public"]["Tables"]["pipeline_stages"]["Insert"];
type StageUpdate = Database["public"]["Tables"]["pipeline_stages"]["Update"];

export type PipelineWithStages = Pipeline & {
  stages: PipelineStage[];
};

export const usePipelines = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipelines")
        .select("*, stages:pipeline_stages(*)")
        .order("created_at");
      if (error) throw error;
      return (data as PipelineWithStages[]).map((p) => ({
        ...p,
        stages: [...p.stages].sort((a, b) => a.position - b.position),
      }));
    },
  });
};

export const usePipeline = (id: string) => {
  const supabase = createClient();
  return useQuery<PipelineWithStages | null>({
    queryKey: ["pipeline", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipelines")
        .select("*, stages:pipeline_stages(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      const pipeline = data as PipelineWithStages;
      return {
        ...pipeline,
        stages: [...pipeline.stages].sort((a, b) => a.position - b.position),
      };
    },
    enabled: !!id,
  });
};

export const useCreateStage = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StageInsert) => {
      const { data, error } = await supabase.from("pipeline_stages").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Estágio criado!");
    },
    onError: () => toast.error("Erro ao criar estágio"),
  });
};

export const useUpdateStage = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: StageUpdate & { id: string }) => {
      const { error } = await supabase.from("pipeline_stages").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Estágio atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar estágio"),
  });
};

export const useDeleteStage = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Estágio removido!");
    },
    onError: () => toast.error("Erro ao remover estágio"),
  });
};

