"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectPhase = Database["public"]["Tables"]["project_phases"]["Row"];
export type ProjectMilestone = Database["public"]["Tables"]["project_milestones"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type PhaseWithMilestones = ProjectPhase & {
  milestones: ProjectMilestone[];
};

export type ProjectWithRelations = Project & {
  company?: { id: string; name: string } | null;
  contact?: { id: string; full_name: string } | null;
  phases?: PhaseWithMilestones[];
};

interface UseProjectsOptions {
  search?: string;
  companyId?: string;
}

export const useProjects = (searchOrOptions?: string | UseProjectsOptions) => {
  const supabase = createClient();

  const opts: UseProjectsOptions =
    typeof searchOrOptions === "object"
      ? searchOrOptions
      : { search: searchOrOptions };

  return useQuery({
    queryKey: ["projects", opts.search, opts.companyId],
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select("*, company:companies(id, name), contact:contacts(id, full_name)")
        .order("created_at", { ascending: false });
      if (opts.search) query = query.ilike("name", `%${opts.search}%`);
      if (opts.companyId) query = query.eq("company_id", opts.companyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as ProjectWithRelations[];
    },
  });
};

export const useProject = (id: string) => {
  const supabase = createClient();
  return useQuery<ProjectWithRelations | null>({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `*, company:companies(id, name), contact:contacts(id, full_name),
           phases:project_phases(*, milestones:project_milestones(*))`
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      const project = data as ProjectWithRelations;
      return {
        ...project,
        phases: project.phases
          ? [...project.phases]
              .sort((a, b) => a.position - b.position)
              .map((phase) => ({
                ...phase,
                milestones: [...(phase.milestones ?? [])].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                ),
              }))
          : [],
      };
    },
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInsert) => {
      const { data, error } = await supabase.from("projects").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado!");
    },
    onError: () => toast.error("Erro ao criar projeto"),
  });
};

export const useUpdateProject = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: ProjectUpdate & { id: string }) => {
      const { error } = await supabase.from("projects").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", vars.id] });
      toast.success("Projeto atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar projeto"),
  });
};

export const useDeleteProject = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto removido!");
    },
    onError: () => toast.error("Erro ao remover projeto"),
  });
};

export const useToggleMilestone = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed, projectId }: { id: string; completed: boolean; projectId: string }) => {
      const { error } = await supabase
        .from("project_milestones")
        .update({ completed })
        .eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
};
