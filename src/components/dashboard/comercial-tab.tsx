"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Target, FileText, ArrowRight, Flame } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { useLeads } from "@/lib/hooks/use-leads";
import { useProposals } from "@/lib/hooks/use-proposals";
import { formatCurrency } from "@/lib/utils/format";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const tooltipStyle = {
  backgroundColor: "#0C1526",
  border: "1px solid rgba(11,135,195,0.25)",
  borderRadius: "8px",
  color: "#E2EBF8",
  fontSize: "12px",
};

export function ComercialTab() {
  const now = new Date();
  const month = now.getMonth() + 1;

  const { data: leads = [] } = useLeads();
  const { data: proposals = [] } = useProposals();

  const activeLeads = leads.filter((l) => !l.archived && l.closed_at === null);
  const hotLeads = activeLeads.filter((l) => l.temperature === "quente");
  const sentProposals = proposals.filter((p) => p.status === "enviada");
  const pipelineValue = activeLeads.reduce((s, l) => s + (l.value ?? 0), 0);
  const hotLeadsPipeline = hotLeads.reduce((s, l) => s + (l.value ?? 0), 0);

  const pipelineData = useMemo(() => {
    return MONTHS_SHORT.slice(Math.max(0, month - 6), month).map((m, i, arr) => {
      const isLast = i === arr.length - 1;
      return {
        name: m,
        leads: isLast ? activeLeads.length : Math.max(0, activeLeads.length - (arr.length - 1 - i) * 2),
      };
    });
  }, [activeLeads, month]);

  const proposalStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    proposals.forEach((p) => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    const labels: Record<string, string> = {
      rascunho: "Rascunho", enviada: "Enviada", aceita: "Aceita", recusada: "Recusada",
    };
    const colors: Record<string, string> = {
      rascunho: "#3D5A78", enviada: "#0B87C3", aceita: "#22c55e", recusada: "#ef4444",
    };
    return Object.entries(counts).map(([key, value]) => ({
      name: labels[key] ?? key, value, color: colors[key] ?? "#3D5A78",
    }));
  }, [proposals]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Leads Ativos" value={activeLeads.length} icon={Target} />
        <StatCard label="Leads Quentes" value={hotLeads.length} icon={Target} />
        <StatCard label="Propostas Enviadas" value={sentProposals.length} icon={FileText} />
        <StatCard label="Valor em Pipeline" value={formatCurrency(pipelineValue)} icon={Target} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label={`Pipeline Quente — Projeção (${hotLeads.length})`}
          value={formatCurrency(hotLeadsPipeline)}
          icon={Flame}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Pipeline de Leads</h3>
              <p className="text-xs" style={{ color: "#7BA3C6" }}>Últimos 6 meses</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={pipelineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradLeadsCom" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B87C3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0B87C3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" />
              <XAxis dataKey="name" tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(11,135,195,0.2)" }} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke="#0B87C3" strokeWidth={2} fill="url(#gradLeadsCom)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className="rounded-xl p-5 flex flex-col"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <div className="mb-4">
            <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Status Propostas</h3>
            <p className="text-xs" style={{ color: "#7BA3C6" }}>Distribuição atual</p>
          </div>
          {proposalStatusData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs" style={{ color: "#3D5A78" }}>
              Nenhuma proposta ainda
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={proposalStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {proposalStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {proposalStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span style={{ color: "#7BA3C6" }}>{item.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: "#E2EBF8" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hot Leads */}
      <div
        className="rounded-xl p-5"
        style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Leads Quentes</h3>
            <p className="text-xs" style={{ color: "#7BA3C6" }}>Alta prioridade</p>
          </div>
          <Link href="/leads" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#0B87C3" }}>
            Ver todos <ArrowRight size={11} />
          </Link>
        </div>
        {hotLeads.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs" style={{ color: "#3D5A78" }}>
            Nenhum lead quente no momento
          </div>
        ) : (
          <div className="space-y-2">
            {hotLeads.slice(0, 8).map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg transition-all"
                style={{ background: "rgba(11,135,195,0.04)", border: "1px solid rgba(11,135,195,0.08)" }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "#E2EBF8" }}>{lead.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#7BA3C6" }}>
                    {lead.company?.name ?? lead.pipeline?.name ?? "—"}
                  </p>
                </div>
                {lead.value && (
                  <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>
                    {formatCurrency(lead.value)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
