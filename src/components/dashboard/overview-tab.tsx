"use client";

import Link from "next/link";
import {
  Target, Briefcase, FileText, DollarSign, CheckSquare, TrendingDown, TrendingUp,
  CalendarClock, ArrowRight, Clock, AlertCircle,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { useLeads } from "@/lib/hooks/use-leads";
import { useProjects } from "@/lib/hooks/use-projects";
import { useProposals } from "@/lib/hooks/use-proposals";
import { useAllTasks } from "@/lib/hooks/use-tasks";
import { useRevenues, useExpenses } from "@/lib/hooks/use-finance";
import { formatCurrency, formatDate, isPastDate } from "@/lib/utils/format";

export function OverviewTab() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: leads = [] } = useLeads();
  const { data: projects = [] } = useProjects();
  const { data: proposals = [] } = useProposals();
  const { data: tasks = [] } = useAllTasks();
  const { data: revenues = [] } = useRevenues(year, month);
  const { data: expenses = [] } = useExpenses(year, month);

  const totalRevenues = revenues.reduce((s, r) => s + r.value, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.value, 0);
  const paidRevenues = revenues.filter((r) => r.status === "pago").reduce((s, r) => s + r.value, 0);
  // Saldo é caixa real: só conta receita já recebida, não o que ainda está pendente
  const balance = paidRevenues - totalExpenses;

  const activeLeads = leads.filter((l) => !l.archived);
  const pendingTasks = tasks.filter((t) => t.status === "pendente");
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "concluida" || t.status === "cancelada") return false;
    return isPastDate(t.due_date);
  });
  const inactiveProjectStatuses = new Set(["cancelado", "concluido", "churned", "pausado"]);
  const activeProjects = projects.filter((p) => !inactiveProjectStatuses.has(p.status));
  const sentProposals = proposals.filter((p) => p.status === "enviada");

  const contractsExpiringSoon = projects.filter((p) => {
    if (!p.contract_end || p.billing_status !== "ativo") return false;
    const d = Math.ceil((new Date(p.contract_end).getTime() - now.getTime()) / 86400000);
    return d >= 0 && d <= 30;
  });

  const recentTasks = [...tasks]
    .filter((t) => t.status !== "concluida" && t.status !== "cancelada")
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 6);

  const priorityColor: Record<string, string> = {
    urgente: "#ef4444", alta: "#f59e0b", media: "#0B87C3", baixa: "#22c55e",
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Leads Ativos" value={activeLeads.length} icon={Target} />
        <StatCard label="Projetos Ativos" value={activeProjects.length} icon={Briefcase} />
        <StatCard label="Propostas Enviadas" value={sentProposals.length} icon={FileText} />
        <StatCard label="Saldo do Mês" value={formatCurrency(balance)} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tarefas Pendentes" value={pendingTasks.length} icon={CheckSquare} />
        <StatCard label="Despesas do Mês" value={formatCurrency(totalExpenses)} icon={TrendingDown} />
        <StatCard label="Receitas do Mês" value={formatCurrency(totalRevenues)} icon={TrendingUp} />
        <StatCard label="Contratos a vencer" value={contractsExpiringSoon.length} icon={CalendarClock} />
      </div>

      {/* Próximas Tarefas */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recentTasks.map((task) => {
              const isOverdue = task.due_date && isPastDate(task.due_date);
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
