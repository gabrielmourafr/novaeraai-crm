"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useUser } from "@/lib/hooks/use-user";
import type { Database } from "@/types/database";

export type GoogleCalendarConnection = Database["public"]["Tables"]["google_calendar_connections"]["Row"];

export const useGoogleCalendarConnection = () => {
  const supabase = createClient();
  const { user } = useUser();
  return useQuery({
    queryKey: ["google-calendar-connection", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as GoogleCalendarConnection | null;
    },
    enabled: !!user?.id,
  });
};

export const useSyncGoogleCalendar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Erro ao sincronizar");
      return body as { pushed: number; pulled: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success(`Sincronizado! ${data.pushed} enviado(s), ${data.pulled} recebido(s).`);
    },
    onError: (err: Error) => toast.error(`Erro ao sincronizar: ${err.message}`),
  });
};

export const useDisconnectGoogleCalendar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calendar/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Erro ao desconectar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success("Google Calendar desconectado.");
    },
    onError: () => toast.error("Erro ao desconectar"),
  });
};

export const useUpdateGoogleSyncEnabled = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("google_calendar_connections").update({ sync_enabled: enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["google-calendar-connection"] }),
  });
};
