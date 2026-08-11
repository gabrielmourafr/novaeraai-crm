"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Target, Briefcase, FileText, DollarSign, CheckSquare, TrendingDown, TrendingUp,
  CalendarClock, ArrowRight, Clock, AlertCircle, Pencil, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { StatCard } from "@/components/shared/stat-card";
import { useLeads } from "@/lib/hooks/use-leads";
import { useProjects } from "@/lib/hooks/use-projects";
import { useProposals } from "@/lib/hooks/use-proposals";
import { useAllTasks } from "@/lib/hooks/use-tasks";
import { useRevenues, useExpenses } from "@/lib/hooks/use-finance";
import { useGoal, useUpsertGoal } from "@/lib/hooks/use-goals";
import { useUser } from "@/lib/hooks/use-user";
import { formatCurrency, formatDate, isPastDate, parseCurrencyInput } from "@/lib/utils/format";

const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export function OverviewTab() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { user } = useUser();
  const { data: leads = [] } = useLeads();
  const { data: projects = [] } = useProjects();
  const { data: proposals = [] } = useProposals();
  const { data: tasks = [] } = useAllTasks();
  const { data: revenues = [] } = useRevenues(year, month);
  const { data: expenses = [] } = useExpenses(year, month);
  const { data: goal } = useGoal(year, month);
  const upsertGoal = useUpsertGoal();

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [revenueTargetInput, setRevenueTargetInput] = useState("");
  const [commercialTargetInput, setCommercialTargetInput] = useState("");

  const openGoalDialog = () => {
    setRevenueTargetInput(goal?.revenue_target?.toString() ?? "");
    setCommercialTargetInput(goal?.commercial_target?.toString() ?? "");
    setGoalDialogOpen(true);
  };

  const handleSaveGoal = async () => {
    if (!user) return;
    await upsertGoal.mutateAsync({
      org_id: user.org_id,
      reference_month: `${year}-${String(month).padStart(2, "0")}-01`,
      revenue_target: revenueTargetInput ? parseCurrencyInput(revenueTargetInput) : 0,
      commercial_target: commercialTargetInput ? parseInt(commercialTargetInput) : 0,
      notes: null,
    });
    setGoalDialogOpen(false);
  };

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

  // Metas do mês: faturamento = receita já paga no mês; comercial = novos
  // contratos assinados (projetos criados) no mês.
  const commercialClosedThisMonth = projects.filter((p) => {
    const d = new Date(p.created_at);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  }).length;
  const revenueTarget = goal?.revenue_target ?? 0;
  const commercialTarget = goal?.commercial_target ?? 0;
  const revenueProgress = revenueTarget > 0 ? Math.min(100, (paidRevenues / revenueTarget) * 100) : 0;
  const commercialProgress = commercialTarget > 0 ? Math.min(100, (commercialClosedThisMonth / commercialTarget) * 100) : 0;

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

      {/* Metas do Mês */}
      <div
        className="rounded-xl p-5"
        style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "#E2EBF8" }}>
              <Trophy size={14} />
              Metas de {monthNames[month - 1]}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>Faturamento recebido e novos contratos fechados</p>
          </div>
          <Button size="sm" variant="outline" onClick={openGoalDialog}>
            <Pencil size={13} className="mr-1.5" />
            {goal ? "Editar meta" : "Definir meta"}
          </Button>
        </div>

        {!goal ? (
          <p className="text-sm text-center py-4" style={{ color: "#3D5A78" }}>
            Nenhuma meta definida para este mês. Clique em <b>Definir meta</b> para começar a acompanhar.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: "#7BA3C6" }}>Faturamento</span>
                <span className="text-xs font-medium" style={{ color: "#E2EBF8" }}>
                  {formatCurrency(paidRevenues)} / {formatCurrency(revenueTarget)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${revenueProgress}%`, background: revenueProgress >= 100 ? "#10B981" : "#0B87C3" }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: "#3D5A78" }}>{revenueProgress.toFixed(0)}% da meta</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: "#7BA3C6" }}>Comercial (novos contratos)</span>
                <span className="text-xs font-medium" style={{ color: "#E2EBF8" }}>
                  {commercialClosedThisMonth} / {commercialTarget}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${commercialProgress}%`, background: commercialProgress >= 100 ? "#10B981" : "#0B87C3" }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: "#3D5A78" }}>{commercialProgress.toFixed(0)}% da meta</p>
            </div>
          </div>
        )}
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

      {/* Dialog: Definir Meta */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Meta de {monthNames[month - 1]}</DialogTitle>
            <DialogDescription>Defina os alvos de faturamento e comercial para o mês</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Meta de faturamento (R$)</Label>
              <Input
                value={revenueTargetInput}
                onChange={(e) => setRevenueTargetInput(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meta comercial (novos contratos)</Label>
              <Input
                type="number"
                min={0}
                value={commercialTargetInput}
                onChange={(e) => setCommercialTargetInput(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveGoal} disabled={upsertGoal.isPending} style={{ background: "var(--primary)" }}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
