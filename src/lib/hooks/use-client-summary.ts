"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface ClientFinancialSummary {
  companyId: string;
  companyName: string;
  implementacao: number;
  mensalidade: number;
  total: number;
}

// Acumulado por cliente: soma de "Valor de Implementação" (contract_value) e
// mensalidade ativa (billing_amount) de todos os projetos de cada empresa.
export const useClientsFinancialSummary = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["clients-financial-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("company_id, contract_value, billing_amount, billing_status, company:companies(id, name)");
      if (error) throw error;

      type Row = {
        company_id: string | null;
        contract_value: number | null;
        billing_amount: number | null;
        billing_status: string | null;
        company: { id: string; name: string } | null;
      };
      const rows = (data ?? []) as unknown as Row[];

      const map = new Map<string, ClientFinancialSummary>();
      for (const p of rows) {
        const company = p.company;
        if (!p.company_id || !company) continue;
        if (!map.has(p.company_id)) {
          map.set(p.company_id, {
            companyId: p.company_id,
            companyName: company.name,
            implementacao: 0,
            mensalidade: 0,
            total: 0,
          });
        }
        const entry = map.get(p.company_id)!;
        entry.implementacao += Number(p.contract_value ?? 0);
        if (p.billing_status === "ativo") {
          entry.mensalidade += Number(p.billing_amount ?? 0);
        }
      }

      return Array.from(map.values())
        .map((e) => ({ ...e, total: e.implementacao + e.mensalidade }))
        .sort((a, b) => b.total - a.total);
    },
  });
};
