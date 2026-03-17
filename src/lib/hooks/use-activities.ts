"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type ActivityInsert = Database["public"]["Tables"]["activities"]["Insert"];
type ActivityEntityType = "lead" | "contact" | "company" | "proposal" | "project" | "task" | "event";

export const useActivities = (entityType: ActivityEntityType, entityId: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["activities", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, user:users(full_name)")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });
};

export const useAddActivity = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ActivityInsert) => {
      const { data, error } = await supabase.from("activities").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["activities", vars.entity_type, vars.entity_id] });
    },
    onError: () => toast.error("Erro ao adicionar nota"),
  });
};
