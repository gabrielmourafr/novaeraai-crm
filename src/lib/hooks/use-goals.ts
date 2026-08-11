"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type RevenueGoal = Database["public"]["Tables"]["revenue_goals"]["Row"];
type RevenueGoalInsert = Database["public"]["Tables"]["revenue_goals"]["Insert"];

const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}-01`;

export const useGoal = (year: number, month: number) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["revenue-goal", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_goals")
        .select("*")
        .eq("reference_month", monthKey(year, month))
        .maybeSingle();
      if (error) throw error;
      return data as RevenueGoal | null;
    },
  });
};

export const useUpsertGoal = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RevenueGoalInsert) => {
      const { data, error } = await supabase
        .from("revenue_goals")
        .upsert(input, { onConflict: "org_id,reference_month" })
        .select()
        .single();
      if (error) throw error;
      return data as RevenueGoal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue-goal"] });
      toast.success("Meta salva!");
    },
    onError: () => toast.error("Erro ao salvar meta"),
  });
};
