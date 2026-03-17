"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Event = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

export type EventWithRelations = Event & {
  lead?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
  contact?: { id: string; full_name: string } | null;
};

interface UseEventsFilters {
  month?: number;
  year?: number;
  leadId?: string;
  projectId?: string;
}

export const useEvents = (filters?: UseEventsFilters) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["events", filters],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(
          `*,
           lead:leads(id, title),
           project:projects(id, name),
           contact:contacts(id, full_name)`
        )
        .order("start_at", { ascending: true });

      if (filters?.month !== undefined && filters?.year !== undefined) {
        const start = new Date(filters.year, filters.month, 1);
        const end = new Date(filters.year, filters.month + 1, 0, 23, 59, 59);
        query = query
          .gte("start_at", start.toISOString())
          .lte("start_at", end.toISOString());
      }

      if (filters?.leadId) query = query.eq("lead_id", filters.leadId);
      if (filters?.projectId) query = query.eq("project_id", filters.projectId);

      const { data, error } = await query;
      if (error) throw error;
      return data as EventWithRelations[];
    },
  });
};

export const useEvent = (id: string) => {
  const supabase = createClient();
  return useQuery<EventWithRelations | null>({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          `*,
           lead:leads(id, title),
           project:projects(id, name),
           contact:contacts(id, full_name)`
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as EventWithRelations;
    },
    enabled: !!id,
  });
};

export const useCreateEvent = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EventInsert) => {
      const { data, error } = await supabase.from("events").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento criado!");
    },
    onError: () => toast.error("Erro ao criar evento"),
  });
};

export const useUpdateEvent = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: EventUpdate & { id: string }) => {
      const { error } = await supabase.from("events").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event", vars.id] });
      toast.success("Evento atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar evento"),
  });
};

export const useDeleteEvent = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento removido!");
    },
    onError: () => toast.error("Erro ao remover evento"),
  });
};
