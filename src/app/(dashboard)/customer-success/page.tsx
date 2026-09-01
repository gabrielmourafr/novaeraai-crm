"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  HeartHandshake, Star, AlertTriangle, CalendarClock, MessageSquare,
  TrendingUp, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCsClients, useNpsTrend } from "@/lib/hooks/use-customer-success";
import { useUser } from "@/lib/hooks/use-user";
import { CHURN_RISK_OPTIONS } from "@/lib/utils/constants";
import { formatDate } from "@/lib/utils/format";

const monthsShort = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const tooltipStyle = {
  backgroundColor: "#0C1526",
  border: "1px solid rgba(11,135,195,0.25)",
  borderRadius: "8px",
  color: "#E2EBF8",
  fontSize: "12px",
};

const churnMeta = (risk: string | null) => CHURN_RISK_OPTIONS.find((o) => o.value === risk);

export default function CustomerSuccessPage() {
  const { user } = useUser();
  // Vendedor vê só a carteira dele (projetos em que consta como "Fechado por").
  const isComercial = user?.role === "comercial";
  const { data: clients = [], isLoading } = useCsClients(isComercial ? user?.id : undefined);
  const { data: npsTrend = [] } = useNpsTrend();

  const stats = useMemo(() => {
    const withNps = clients.filter((c) => c.npsScore !== null);
    const avgNps = withNps.length > 0 ? withNps.reduce((s, c) => s + (c.npsScore ?? 0), 0) / withNps.length : null;
    const atRisk = clients.filter((c) => c.churnRisk === "alto" || c.churnRisk === "medio").length;
    const riskPct = clients.length > 0 ? (atRisk / clients.length) * 100 : 0;
    const pendingCheckins = clients.filter((c) => !c.checkinDoneThisMonth).length;
    const totalCrsOpen = clients.reduce((s, c) => s + c.crsOpen, 0);
    return { avgNps, riskPct, pendingCheckins, totalCrsOpen };
  }, [clients]);

  // Fila de atenção: risco alto/médio, check-in atrasado, ou CRs abertos
  const attentionQueue = useMemo(() => {
    return clients
      .filter((c) => c.churnRisk === "alto" || !c.checkinDoneThisMonth || c.crsOpen > 0)
      .sort((a, b) => {
        const score = (c: typeof a) => (c.churnRisk === "alto" ? 3 : 0) + (!c.checkinDoneThisMonth ? 2 : 0) + (c.crsOpen > 0 ? 1 : 0);
        return score(b) - score(a);
      });
  }, [clients]);

  const chartData = npsTrend.map((p) => {
    const [y, m] = p.month.split("-");
    return { name: `${monthsShort[Number(m) - 1]}/${y.slice(2)}`, nps: Number(p.avgNps.toFixed(1)) };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <HeartHandshake size={22} className="text-primary" />
          Customer Success
        </h1>
        <p className="text-sm text-text-muted">Visão consolidada da carteira de clientes ativos (mensalidade)</p>
      </div>

      {/* Visão geral */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="NPS Médio da Carteira"
          value={stats.avgNps !== null ? `${stats.avgNps.toFixed(1)}/10` : "—"}
          icon={Star}
        />
        <StatCard label="Clientes em Risco (médio/alto)" value={`${stats.riskPct.toFixed(0)}%`} icon={AlertTriangle} />
        <StatCard label="Check-ins Pendentes (mês)" value={stats.pendingCheckins} icon={CalendarClock} />
        <StatCard label="CRs Abertos" value={stats.totalCrsOpen} icon={MessageSquare} />
      </div>

      {/* Fila de atenção */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Fila de Atenção</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Clientes com risco alto de churn, check-in mensal atrasado, ou CRs em aberto
          </p>
        </div>
        {isLoading ? (
          <p className="text-sm text-text-muted text-center py-6">Carregando...</p>
        ) : attentionQueue.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title="Nenhum cliente precisando de atenção"
            description="Todos os check-ins em dia, sem CRs abertos e sem risco alto de churn."
          />
        ) : (
          <div className="space-y-2">
            {attentionQueue.map((c) => {
              const meta = churnMeta(c.churnRisk);
              return (
                <Link
                  key={c.projectId}
                  href={`/projects/${c.projectId}?tab=pos_entrega`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{c.companyName}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {c.churnRisk === "alto" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${meta?.color}20`, color: meta?.color }}>
                          Risco {meta?.label}
                        </span>
                      )}
                      {!c.checkinDoneThisMonth && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          Check-in do mês pendente
                        </span>
                      )}
                      {c.crsOpen > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                          {c.crsOpen} CR{c.crsOpen > 1 ? "s" : ""} aberto{c.crsOpen > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-text-muted flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carteira de clientes ativos */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Carteira de Clientes Ativos ({clients.length})</h3>
          {clients.length === 0 ? (
            <EmptyState icon={HeartHandshake} title="Nenhum cliente ativo" description="Clientes com mensalidade ativa aparecem aqui." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">NPS</TableHead>
                  <TableHead className="text-center">Risco</TableHead>
                  <TableHead>Último contato</TableHead>
                  <TableHead>Upsell</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => {
                  const meta = churnMeta(c.churnRisk);
                  return (
                    <TableRow key={c.projectId}>
                      <TableCell className="text-sm">
                        <Link href={`/projects/${c.projectId}?tab=pos_entrega`} className="font-medium text-text-primary hover:text-primary hover:underline">
                          {c.companyName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {c.npsScore !== null ? `${c.npsScore}/10` : <span className="text-text-muted">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {meta ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${meta.color}20`, color: meta.color }}>
                            {meta.label}
                          </span>
                        ) : <span className="text-text-muted text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-text-muted">
                        {c.lastMeetingDate ? formatDate(c.lastMeetingDate) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-text-muted max-w-[200px] truncate">
                        {c.upsellNote ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Tendência de NPS */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <TrendingUp size={14} className="text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Tendência de NPS</h3>
          </div>
          {chartData.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-10">Sem check-ins com NPS registrado ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" />
                <XAxis dataKey="name" tick={{ fill: "#7BA3C6", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: "#7BA3C6", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="nps" name="NPS médio" fill="#0B87C3" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
