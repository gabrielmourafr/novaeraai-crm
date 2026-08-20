"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface ProjectProfitEntry {
  projectId: string;
  recebido: number;
  custos: number;
}

// Lucro por projeto (recebido - custos), tudo já pago/realizado, all-time.
// "Custos" soma despesas pagas vinculadas ao projeto + comissões de
// parceiro/dev pagas vinculadas ao projeto — sem contar a despesa
// gerada automaticamente a partir dessa comissão (source_partner_payment_id),
// senão a mesma saída conta duas vezes (uma como partner_payment, outra
// como a expense espelhada por ela).
export const useProjectProfitSummary = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["project-profit-summary"],
    queryFn: async () => {
      const [revRes, expRes, payRes] = await Promise.all([
        supabase.from("revenues").select("project_id, value").eq("status", "pago").not("project_id", "is", null),
        supabase.from("expenses").select("project_id, value").eq("status", "pago").not("project_id", "is", null).is("source_partner_payment_id", null),
        supabase.from("partner_payments").select("project_id, amount").eq("status", "pago").not("project_id", "is", null),
      ]);
      if (revRes.error) throw revRes.error;
      if (expRes.error) throw expRes.error;
      if (payRes.error) throw payRes.error;

      const map = new Map<string, ProjectProfitEntry>();
      const getEntry = (projectId: string) => {
        if (!map.has(projectId)) map.set(projectId, { projectId, recebido: 0, custos: 0 });
        return map.get(projectId)!;
      };

      for (const r of (revRes.data ?? []) as { project_id: string; value: number }[]) {
        getEntry(r.project_id).recebido += Number(r.value);
      }
      for (const e of (expRes.data ?? []) as { project_id: string; value: number }[]) {
        getEntry(e.project_id).custos += Number(e.value);
      }
      for (const p of (payRes.data ?? []) as { project_id: string; amount: number }[]) {
        getEntry(p.project_id).custos += Number(p.amount);
      }

      return map;
    },
  });
};
