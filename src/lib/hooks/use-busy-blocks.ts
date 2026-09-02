"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type BusyBlock = Database["public"]["Tables"]["external_busy_blocks"]["Row"];

// Ocupação vinda do Google Calendar de cada pessoa. Fica fora da tabela de
// eventos de propósito: agenda pessoal bloqueia horário, mas não é
// compromisso do CRM e não deve aparecer na agenda comercial.
export const useBusyBlocks = (fromISO: string, toISO: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["busy-blocks", fromISO, toISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_busy_blocks")
        .select("*")
        .gte("start_at", fromISO)
        .lte("start_at", toISO)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BusyBlock[];
    },
  });
};

// Puxa a agenda de TODA a organização antes de mostrar disponibilidade.
//
// A sincronização por sessão não serve aqui: a ocupação do colega só era
// atualizada quando ele mesmo abria o CRM, e até lá ele aparecia livre —
// que é exatamente o erro que não pode acontecer nessa tela.
export const useSyncAllCalendars = () => {
  const qc = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    fetch("/api/calendar/sync-all", { method: "POST" })
      .then((r) => r.json())
      .then(() => {
        if (cancelled) return;
        qc.invalidateQueries({ queryKey: ["busy-blocks"] });
        qc.invalidateQueries({ queryKey: ["events"] });
        qc.invalidateQueries({ queryKey: ["google-calendar"] });
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export interface CalendarCoverage {
  userId: string;
  connected: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
}

// Quem tem (ou não) agenda do Google conectada e sincronizando. A tela
// precisa avisar quando a ocupação de alguém não é confiável, em vez de
// deixar a pessoa achar que o dia está vago.
export const useCalendarCoverage = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["google-calendar", "coverage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("user_id, last_synced_at, sync_error, sync_enabled");
      if (error) throw error;
      return (data ?? []).map((c): CalendarCoverage => ({
        userId: c.user_id as string,
        connected: Boolean(c.sync_enabled),
        lastSyncedAt: (c.last_synced_at as string | null) ?? null,
        syncError: (c.sync_error as string | null) ?? null,
      }));
    },
  });
};
