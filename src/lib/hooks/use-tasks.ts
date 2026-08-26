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
  company?: { id: string; name: string } | null;
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
           company:companies(id, name),
           assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url)`
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
      if (error) {
        console.error("[useCreateTask] insert error:", error);
        throw error;
      }
      return data as unknown as Task;
    },
    onSuccess: async (data) => {
      console.log("[useCreateTask] criada:", data);
      // refetchQueries força a busca imediatamente (não só marca stale).
      // Resolve o caso em que o user já estava em /tasks ou /calendar com
      // cache fresh (staleTime 30s) e a query não refazia sozinha.
      await Promise.all([
        qc.refetchQueries({ queryKey: ["tasks"], type: "all" }),
        qc.refetchQueries({ queryKey: ["leads-contact-summary"], type: "all" }),
        qc.refetchQueries({ queryKey: ["activities"], type: "all" }),
      ]);
      toast.success("Tarefa criada!");

      // Avisa o responsável por email. Fire-and-forget de propósito: se o
      // envio falhar, a tarefa já está criada e o CRM não pode travar por
      // causa disso — o erro fica no log do servidor.
      if (data?.assignee_id) {
        fetch("/api/tasks/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: data.id }),
        })
          .then((r) => r.json())
          .then((r) => {
            if (r?.ok) toast.success(`Email enviado para ${r.to}`);
            else console.warn("[useCreateTask] email não enviado:", r);
          })
          .catch((e) => console.warn("[useCreateTask] falha ao notificar:", e));
      }
    },
    onError: (err: Error & { message?: string; code?: string }) => {
      console.error("[useCreateTask] error:", err);
      const msg = err?.message ?? "Erro ao criar tarefa";
      toast.error(`Erro ao criar tarefa: ${msg}`);
    },
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
    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({ queryKey: ["tasks"], type: "all" }),
        qc.refetchQueries({ queryKey: ["leads-contact-summary"], type: "all" }),
        qc.refetchQueries({ queryKey: ["activities"], type: "all" }),
      ]);
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
      qc.invalidateQueries({ queryKey: ["leads-contact-summary"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
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
      qc.invalidateQueries({ queryKey: ["leads-contact-summary"] });
      toast.success("Tarefa removida!");
    },
    onError: () => toast.error("Erro ao remover tarefa"),
  });
};
