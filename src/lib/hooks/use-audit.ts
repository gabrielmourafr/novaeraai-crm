"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export interface OrgUserActivity {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "member";
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UseAuditLogsFilters {
  entityType?: string;
  action?: AuditLog["action"];
  limit?: number;
}

export const useAuditLogs = (filters?: UseAuditLogsFilters) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters?.limit ?? 200);
      if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
      if (filters?.action) query = query.eq("action", filters.action);
      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });
};

export const useOrgUsersActivity = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["audit-users-activity"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_org_users_with_activity");
      if (error) throw error;
      return data as OrgUserActivity[];
    },
  });
};

export const ENTITY_LABEL: Record<string, string> = {
  users: "Usuário",
  companies: "Empresa",
  contacts: "Contato",
  leads: "Lead",
  proposals: "Proposta",
  projects: "Projeto",
  revenues: "Receita",
  expenses: "Despesa",
  tasks: "Tarefa",
  events: "Evento",
};

export const ACTION_META: Record<AuditLog["action"], { label: string; color: string }> = {
  created: { label: "Criou", color: "#10B981" },
  updated: { label: "Editou", color: "#0B87C3" },
  deleted: { label: "Excluiu", color: "#EF4444" },
  login: { label: "Login", color: "#A855F7" },
};
