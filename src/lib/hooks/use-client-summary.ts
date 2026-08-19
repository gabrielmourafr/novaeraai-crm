"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface ClientFinancialSummary {
  companyId: string;
  companyName: string;
  implementacaoReceber: number;
  implementacaoRecebida: number;
  mensalidade: number;
  total: number;
}

// Acumulado por cliente:
// - Implementação a Receber / Recebida: soma de revenues (categoria "projeto"),
//   dividido por status pago x pendente/atrasado. Cobre tanto o que é gerado
//   automaticamente a partir do projeto (Valor a Receber/Recebido) quanto o
//   que é lançado manualmente no Financeiro com a empresa vinculada.
// - Mensalidade: soma de billing_amount dos projetos com mensalidade ativa.
export const useClientsFinancialSummary = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["clients-financial-summary"],
    queryFn: async () => {
      const [revenuesRes, projectsRes] = await Promise.all([
        supabase
          .from("revenues")
          .select("company_id, value, status, category, company:companies(id, name)")
          .eq("category", "projeto"),
        supabase
          .from("projects")
          .select("company_id, billing_amount, billing_status, company:companies(id, name)")
          .eq("billing_status", "ativo"),
      ]);
      if (revenuesRes.error) throw revenuesRes.error;
      if (projectsRes.error) throw projectsRes.error;

      type RevenueRow = { company_id: string | null; value: number; status: string; company: { id: string; name: string } | null };
      type ProjectRow = { company_id: string | null; billing_amount: number | null; company: { id: string; name: string } | null };

      const map = new Map<string, ClientFinancialSummary>();
      const getEntry = (companyId: string, companyName: string) => {
        if (!map.has(companyId)) {
          map.set(companyId, {
            companyId,
            companyName,
            implementacaoReceber: 0,
            implementacaoRecebida: 0,
            mensalidade: 0,
            total: 0,
          });
        }
        return map.get(companyId)!;
      };

      for (const r of (revenuesRes.data ?? []) as unknown as RevenueRow[]) {
        const companyId = r.company_id ?? "__sem_empresa__";
        const companyName = r.company?.name ?? "Sem empresa";
        const entry = getEntry(companyId, companyName);
        if (r.status === "pago") {
          entry.implementacaoRecebida += Number(r.value);
        } else if (r.status === "pendente" || r.status === "atrasado") {
          entry.implementacaoReceber += Number(r.value);
        }
      }

      for (const p of (projectsRes.data ?? []) as unknown as ProjectRow[]) {
        if (!p.billing_amount) continue;
        const companyId = p.company_id ?? "__sem_empresa__";
        const companyName = p.company?.name ?? "Sem empresa";
        const entry = getEntry(companyId, companyName);
        entry.mensalidade += Number(p.billing_amount);
      }

      return Array.from(map.values())
        .map((e) => ({ ...e, total: e.implementacaoReceber + e.implementacaoRecebida + e.mensalidade }))
        .sort((a, b) => b.total - a.total);
    },
  });
};

export interface ClientTotalRevenue {
  companyId: string;
  companyName: string;
  total: number;
}

// Faturamento total (todas as categorias de receita, já pago) agrupado por
// cliente — usado no breakdown do card "Faturamento Total" em Implementação.
export const useFaturamentoTotalByClient = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["clients-financial-summary", "faturamento-total"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenues")
        .select("company_id, value, company:companies(id, name)")
        .eq("status", "pago");
      if (error) throw error;

      type RevenueRow = { company_id: string | null; value: number; company: { id: string; name: string } | null };

      const map = new Map<string, ClientTotalRevenue>();
      for (const r of (data ?? []) as unknown as RevenueRow[]) {
        const companyId = r.company_id ?? "__sem_empresa__";
        const companyName = r.company?.name ?? "Sem empresa";
        const entry = map.get(companyId) ?? { companyId, companyName, total: 0 };
        entry.total += Number(r.value);
        map.set(companyId, entry);
      }

      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    },
  });
};
