"use client";

import { useQuery } from "@tanstack/react-query";
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
