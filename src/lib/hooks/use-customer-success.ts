"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CsClient {
  projectId: string;
  projectName: string;
  companyId: string;
  companyName: string;
  npsScore: number | null;
  churnRisk: "baixo" | "medio" | "alto" | null;
  lastMeetingDate: string | null;
  crsOpen: number;
  upsellNote: string | null;
  checkinDoneThisMonth: boolean;
}

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};

// Carteira de clientes ativos (mensalidade), com o dado de Customer Success
// já registrado em cada projeto (NPS, churn risk, CRs, upsell) e se o
// check-in mensal desse mês já foi feito.
// ownerId restringe à carteira de um vendedor: os projetos em que ele
// consta como "Fechado por". Usado pelo papel "comercial".
export const useCsClients = (ownerId?: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["customer-success", "clients", ownerId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select(
          "id, name, company_id, company:companies(id, name), latest_nps_score, latest_meeting_date, crs_opened_count, crs_resolved_count, upsell_opportunity_note, churn_risk"
        )
        .eq("billing_status", "ativo");
      if (ownerId) query = query.eq("closed_by_user_id", ownerId);
      const { data: projects, error: projectsError } = await query;
      if (projectsError) throw projectsError;

      const rows = (projects ?? []) as unknown as {
        id: string; name: string; company_id: string | null; company: { id: string; name: string } | null;
        latest_nps_score: number | null; latest_meeting_date: string | null;
        crs_opened_count: number | null; crs_resolved_count: number | null;
        upsell_opportunity_note: string | null; churn_risk: "baixo" | "medio" | "alto" | null;
      }[];
      if (rows.length === 0) return [] as CsClient[];

      const { data: checkinsThisMonth, error: checkinsError } = await supabase
        .from("project_monthly_checkins")
        .select("project_id")
        .in("project_id", rows.map((r) => r.id))
        .eq("reference_month", currentMonthKey());
      if (checkinsError) throw checkinsError;

      const doneThisMonth = new Set((checkinsThisMonth ?? []).map((c) => c.project_id));

      return rows.map((r): CsClient => ({
        projectId: r.id,
        projectName: r.name,
        companyId: r.company_id ?? "",
        companyName: r.company?.name ?? "Sem empresa",
        npsScore: r.latest_nps_score,
        churnRisk: r.churn_risk,
        lastMeetingDate: r.latest_meeting_date,
        crsOpen: Math.max(0, (r.crs_opened_count ?? 0) - (r.crs_resolved_count ?? 0)),
        upsellNote: r.upsell_opportunity_note,
        checkinDoneThisMonth: doneThisMonth.has(r.id),
      }));
    },
  });
};

export interface NpsTrendPoint {
  month: string; // yyyy-mm-01
  avgNps: number;
  count: number;
}

// Média de NPS por mês, últimos 6 meses com dado — pra ver se a satisfação
// da base está subindo ou caindo.
export const useNpsTrend = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["customer-success", "nps-trend"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_monthly_checkins")
        .select("reference_month, nps_score")
        .not("nps_score", "is", null)
        .order("reference_month", { ascending: true });
      if (error) throw error;

      const byMonth = new Map<string, { sum: number; count: number }>();
      for (const row of (data ?? []) as { reference_month: string; nps_score: number }[]) {
        const entry = byMonth.get(row.reference_month) ?? { sum: 0, count: 0 };
        entry.sum += row.nps_score;
        entry.count += 1;
        byMonth.set(row.reference_month, entry);
      }

      return Array.from(byMonth.entries())
        .map(([month, { sum, count }]): NpsTrendPoint => ({ month, avgNps: sum / count, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);
    },
  });
};
