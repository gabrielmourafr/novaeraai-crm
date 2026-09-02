"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type UserGoal = Database["public"]["Tables"]["user_goals"]["Row"];
type UserGoalInsert = Database["public"]["Tables"]["user_goals"]["Insert"];

// Tipos de evento que contam como reunião comercial. Interno e follow-up
// ficam de fora de propósito: reunião de equipe não é meta de vendedor.
export const MEETING_EVENT_TYPES = ["demo", "reuniao_exploratoria", "kickoff", "review"] as const;

const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}-01`;

export interface GoalProgressRow {
  userId: string;
  userName: string;
  meetingsTargetMonth: number;
  meetingsTargetWeek: number;
  vgvTarget: number;
  meetingsMonth: number;
  meetingsWeek: number;
  vgv: number;
}

// Semana corrente: segunda 00:00 até domingo 23:59, no fuso local.
export function currentWeekRange(reference = new Date()) {
  const start = new Date(reference);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export const useUserGoals = (year: number, month: number) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["user-goals", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_goals")
        .select("*")
        .eq("reference_month", monthKey(year, month));
      if (error) throw error;
      return (data ?? []) as UserGoal[];
    },
  });
};

export const useUpsertUserGoal = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UserGoalInsert) => {
      const { data, error } = await supabase
        .from("user_goals")
        .upsert(input, { onConflict: "user_id,reference_month" })
        .select()
        .single();
      if (error) throw error;
      return data as UserGoal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-goals"] });
      toast.success("Meta salva!");
    },
    onError: (e: Error) => toast.error(`Erro ao salvar meta: ${e.message}`),
  });
};

// Realizado do mês por pessoa. Nunca é gravado: sai sempre do dado real,
// pra não existir número desencontrado entre meta e execução.
//
// Reuniões: eventos comerciais em que a pessoa é participante (ou criadora,
//   quando ninguém foi marcado).
// VGV: valor dos contratos em que ela consta como "Fechado por".
export const useGoalProgress = (year: number, month: number) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["user-goals", "progress", year, month],
    queryFn: async () => {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      const { start: weekStart, end: weekEnd } = currentWeekRange();

      const [usersRes, eventsRes, projectsRes] = await Promise.all([
        supabase.from("users").select("id, full_name, role"),
        supabase
          .from("events")
          .select("start_at, type, participant_ids, created_by")
          .gte("start_at", monthStart.toISOString())
          .lte("start_at", monthEnd.toISOString())
          .in("type", MEETING_EVENT_TYPES),
        supabase
          .from("projects")
          .select("contract_value, closed_by_user_id, created_at")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString()),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      const meetingsMonth = new Map<string, number>();
      const meetingsWeek = new Map<string, number>();
      for (const ev of eventsRes.data ?? []) {
        const people =
          (ev.participant_ids ?? []).length > 0
            ? (ev.participant_ids as string[])
            : ev.created_by
            ? [ev.created_by]
            : [];
        const at = new Date(ev.start_at).getTime();
        const inWeek = at >= weekStart.getTime() && at <= weekEnd.getTime();
        for (const pid of people) {
          meetingsMonth.set(pid, (meetingsMonth.get(pid) ?? 0) + 1);
          if (inWeek) meetingsWeek.set(pid, (meetingsWeek.get(pid) ?? 0) + 1);
        }
      }

      const vgv = new Map<string, number>();
      for (const p of projectsRes.data ?? []) {
        if (!p.closed_by_user_id) continue;
        vgv.set(p.closed_by_user_id, (vgv.get(p.closed_by_user_id) ?? 0) + Number(p.contract_value ?? 0));
      }

      return { meetingsMonth, meetingsWeek, vgv, users: usersRes.data ?? [] };
    },
  });
};
