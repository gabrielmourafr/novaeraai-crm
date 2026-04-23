"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Users, Briefcase, FileText,
  CheckSquare, DollarSign, Target, ArrowRight, Clock, AlertCircle
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useLeads } from "@/lib/hooks/use-leads";
import { useProjects } from "@/lib/hooks/use-projects";
import { useProposals } from "@/lib/hooks/use-proposals";
import { useAllTasks } from "@/lib/hooks/use-tasks";
import { useRevenues, useExpenses, useRevenuesLastMonths, useExpensesLastMonths } from "@/lib/hooks/use-finance";
import { useUser } from "@/lib/hooks/use-user";
import { formatCurrency, formatDate } from "@/lib/utils/format";


const tooltipStyle = {
  backgroundColor: "#0C1526",
  border: "1px solid rgba(11,135,195,0.25)",
  borderRadius: "8px",
  color: "#E2EBF8",
  fontSize: "12px",
};

function StatCard({
  label, value, sub, icon: Icon, color = "#0B87C3", trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string; trend?: number;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.01]"
      style={{
        background: "rgba(12,21,38,0.8)",
        border: "1px solid rgba(11,135,195,0.15)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7BA3C6" }}>
          {label}
        </span>
        <div className="p-2 rounded-lg" style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="font-display font-bold text-2xl" style={{ color: "#E2EBF8" }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>{sub}</p>}
      </div>
      {trend !== undefined && (
        <p className={`text-xs flex items-center gap-1 ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
          {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {trend >= 0 ? "+" : ""}{trend}% vs mês anterior
        </p>
      )}
    </div>
  );
}

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function DashboardPage() {
  const { user } = useUser();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: leads = [] } = useLeads();
  const { data: projects = [] } = useProjects();
  const { data: proposals = [] } = useProposals();
  const { data: tasks = [] } = useAllTasks();
  const { data: revenues = [] } = useRevenues(year, month);
  const { data: expenses = [] } = useExpenses(year, month);
  const { data: revenuesLastMonths = {} } = useRevenuesLastMonths(year, month, 6);
  const { data: expensesLastMonths = {} } = useExpensesLastMonths(year, month, 6);

  const totalRevenues = revenues.reduce((s, r) => s + r.value, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.value, 0);
  const balance = totalRevenues - totalExpenses;

  const activeLeads = leads.filter((l) => !("archived" in l && l.archived));
  const hotLeads = activeLeads.filter((l) => l.temperature === "quente");
  const pendingTasks = tasks.filter((t) => t.status === "pendente");
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "concluida" || t.status === "cancelada") return false;
    return new Date(t.due_date) < now;
  });
  const activeProjects = projects.filter((p) => p.status === "em_andamento");
  const sentProposals = proposals.filter((p) => p.status === "enviada");

  // Lead pipeline data (last 6 months mock based on count)
  const pipelineData = useMemo(() => {
    return MONTHS_SHORT.slice(Math.max(0, month - 6), month).map((m, i, arr) => {
      const isLast = i === arr.length - 1;
      return {
        name: m,
        leads: isLast ? activeLeads.length : Math.max(0, activeLeads.length - (arr.length - 1 - i) * 2),
        fechados: isLast ? leads.filter((l) => l.stage?.name?.toLowerCase().includes("ganho")).length : 0,
      };
    });
  }, [leads, activeLeads, month]);

  // Revenue vs Expense by month (current month + 5 previous)
  const financeData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 - (5 - i), 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const monthRevenues = revenuesLastMonths[key] ?? [];
      const monthExpenses = expensesLastMonths[key] ?? [];
      const monthRevTotal = monthRevenues.reduce((s, r) => s + r.value, 0);
      const monthExpTotal = monthExpenses.reduce((s, e) => s + e.value, 0);
      return {
        name: MONTHS_SHORT[d.getMonth()],
        receitas: monthRevTotal,
        despesas: monthExpTotal,
      };
    });
  }, [year, month, revenuesLastMonths, expensesLastMonths]);

  // Proposal status pie
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

  // Project status breakdown
  const projectStatusData = useMemo(() => {
    const map: Record<string, { label: string; color: string; count: number }> = {
      planejamento: { label: "Planejamento", color: "#7BA3C6", count: 0 },
      em_andamento: { label: "Em Andamento", color: "#0B87C3", count: 0 },
      pausado: { label: "Pausado", color: "#f59e0b", count: 0 },
      concluido: { label: "Concluído", color: "#22c55e", count: 0 },
      cancelado: { label: "Cancelado", color: "#ef4444", count: 0 },
    };
    projects.forEach((p) => { if (p.status in map) map[p.status].count++; });
    return Object.values(map).filter((v) => v.count > 0);
  }, [projects]);

  const recentTasks = [...tasks]
    .filter((t) => t.status !== "concluida" && t.status !== "cancelada")
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 5);

  const priorityColor: Record<string, string> = {
    critica: "#ef4444", alta: "#f59e0b", media: "#0B87C3", baixa: "#22c55e",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight" style={{ color: "#E2EBF8" }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7BA3C6" }}>
            Bom dia, {user?.full_name?.split(" ")[0] ?? "Admin"} — visão geral do CRM
          </p>
        </div>
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: "rgba(11,135,195,0.1)", border: "1px solid rgba(11,135,195,0.2)", color: "#0B87C3" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Leads Ativos" value={activeLeads.length} sub={`${hotLeads.length} quentes`} icon={Target} trend={8} />
        <StatCard label="Projetos Ativos" value={activeProjects.length} sub={`${projects.length} total`} icon={Briefcase} color="#22c55e" />
        <StatCard label="Propostas Enviadas" value={sentProposals.length} sub={`${proposals.length} total`} icon={FileText} color="#f59e0b" />
        <StatCard label="Saldo do Mês" value={formatCurrency(balance)} sub={`Receitas: ${formatCurrency(totalRevenues)}`} icon={DollarSign} color={balance >= 0 ? "#22c55e" : "#ef4444"} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tarefas Pendentes" value={pendingTasks.length} sub={`${overdueTasks.length} atrasadas`} icon={CheckSquare} color={overdueTasks.length > 0 ? "#f59e0b" : "#0B87C3"} />
        <StatCard label="Despesas do Mês" value={formatCurrency(totalExpenses)} sub="mês atual" icon={TrendingDown} color="#ef4444" />
        <StatCard label="Receitas do Mês" value={formatCurrency(totalRevenues)} sub="mês atual" icon={TrendingUp} color="#22c55e" />
        <StatCard label="Empresas/Contatos" value={`${leads.length}`} sub="leads no CRM" icon={Users} color="#7BA3C6" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline chart */}
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
                <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B87C3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0B87C3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" />
              <XAxis dataKey="name" tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(11,135,195,0.2)" }} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke="#0B87C3" strokeWidth={2} fill="url(#gradLeads)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Proposals Pie */}
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

      {/* Finance + Projects Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Finance Bar Chart */}
        <div
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Receitas vs Despesas</h3>
              <p className="text-xs" style={{ color: "#7BA3C6" }}>Mês atual</p>
            </div>
            <Link href="/finance" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#0B87C3" }}>
              Ver Financeiro <ArrowRight size={11} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={financeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" />
              <XAxis dataKey="name" tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status */}
        <div
          className="rounded-xl p-5"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Projetos</h3>
              <p className="text-xs" style={{ color: "#7BA3C6" }}>{projects.length} no total</p>
            </div>
            <Link href="/projects" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#0B87C3" }}>
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          {projectStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs" style={{ color: "#3D5A78" }}>
              Nenhum projeto ainda
            </div>
          ) : (
            <div className="space-y-3">
              {projectStatusData.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: "#7BA3C6" }}>{item.label}</span>
                    <span className="font-semibold" style={{ color: "#E2EBF8" }}>{item.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(11,135,195,0.1)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(item.count / projects.length) * 100}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Tasks + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Tasks */}
        <div
          className="rounded-xl p-5"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Próximas Tarefas</h3>
              <p className="text-xs" style={{ color: "#7BA3C6" }}>{overdueTasks.length} atrasadas</p>
            </div>
            <Link href="/tasks" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#0B87C3" }}>
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs" style={{ color: "#3D5A78" }}>
              Nenhuma tarefa pendente
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < now;
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{ background: "rgba(11,135,195,0.04)", border: "1px solid rgba(11,135,195,0.08)" }}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: priorityColor[task.priority] ?? "#0B87C3" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "#E2EBF8" }}>{task.title}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: isOverdue ? "#ef4444" : "#7BA3C6" }}>
                        {task.due_date ? (
                          <span className="flex items-center gap-1">
                            {isOverdue && <AlertCircle size={9} />}
                            {isOverdue ? "Atrasada — " : <Clock size={9} className="inline" />}
                            {formatDate(task.due_date)}
                          </span>
                        ) : "Sem prazo"}
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                      style={{
                        background: `${priorityColor[task.priority] ?? "#0B87C3"}18`,
                        color: priorityColor[task.priority] ?? "#0B87C3",
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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
              {hotLeads.slice(0, 5).map((lead) => (
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
    </div>
  );
}
