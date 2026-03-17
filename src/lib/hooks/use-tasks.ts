"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type TaskStatus = Database["public"]["Tables"]["tasks"]["Row"]["status"];
type TaskType = Database["public"]["Tables"]["tasks"]["Row"]["type"];
type TaskPriority = Database["public"]["Tables"]["tasks"]["Row"]["priority"];

export type TaskWithRelations = Task & {
  lead?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
  assignee?: { id: string; full_name: string; avatar_url: string | null } | null;
};

interface UseAllTasksFilters {
  status?: TaskStatus;
  search?: string;
  type?: TaskType;
  priority?: TaskPriority;
  assigneeId?: string;
  leadId?: string;
  projectId?: string;
}

export const useAllTasks = (filters?: UseAllTasksFilters) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["tasks", "all", filters],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(
          `*,
           lead:leads(id, title),
           project:projects(id, name),
           assignee:users(id, full_name, avatar_url)`
        )
        .order("due_date", { ascending: true });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters?.type) query = query.eq("type", filters.type);
      if (filters?.priority) query = query.eq("priority", filters.priority);
      if (filters?.assigneeId) query = query.eq("assignee_id", filters.assigneeId);
      if (filters?.leadId) query = query.eq("lead_id", filters.leadId);
      if (filters?.projectId) query = query.eq("project_id", filters.projectId);

      const { data, error } = await query;
      if (error) throw error;
      return data as TaskWithRelations[];
    },
  });
};

export const useTasks = (status?: TaskStatus, search?: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["tasks", status, search],
    queryFn: async () => {
      let query = supabase.from("tasks").select("*").order("due_date", { ascending: true });
      if (status) query = query.eq("status", status);
      if (search) query = query.ilike("title", `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
  });
};

export const useLeadTasks = (leadId: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["tasks", "lead", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("lead_id", leadId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!leadId,
  });
};

export const useProjectTasks = (projectId: string, phaseId?: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["tasks", "project", projectId, phaseId],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date", { ascending: true });
      if (phaseId) query = query.eq("phase_id", phaseId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!projectId,
  });
};

export const useCreateTask = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInsert) => {
      const { data, error } = await supabase.from("tasks").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa criada!");
    },
    onError: () => toast.error("Erro ao criar tarefa"),
  });
};

export const useUpdateTask = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: TaskUpdate & { id: string }) => {
      const { error } = await supabase.from("tasks").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar tarefa"),
  });
};

export const useToggleTask = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: TaskStatus }) => {
      const newStatus: TaskStatus =
        currentStatus === "concluida" ? "pendente" : "concluida";
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Erro ao atualizar tarefa"),
  });
};

export const useDeleteTask = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa removida!");
    },
    onError: () => toast.error("Erro ao remover tarefa"),
  });
};
