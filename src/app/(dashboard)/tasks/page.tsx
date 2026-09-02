"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckSquare, Plus, Search, Trash2, Edit2, AlertCircle, Clock, CheckCircle2, List, LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TaskForm, type TaskInitialData } from "@/components/forms/task-form";
import { TasksKanbanBoard } from "@/components/tasks/tasks-kanban-board";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { useAllTasks, useToggleTask, useUpdateTask, useDeleteTask, type TaskWithRelations } from "@/lib/hooks/use-tasks";
import { useOrgUsers, useUser } from "@/lib/hooks/use-user";
import { formatDate, formatInitials, formatDurationBetween, formatHoursDecimal, isPastDate } from "@/lib/utils/format";
import { TASK_TYPES, TASK_TYPES_CURRENT, TASK_TYPES_LEGACY, TASK_COMPLEXITIES, TASK_PRIORITIES } from "@/lib/utils/constants";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgente: { label: "Urgente", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  alta:    { label: "Alta",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  media:   { label: "Média",   color: "#0B87C3", bg: "rgba(11,135,195,0.12)" },
  baixa:   { label: "Baixa",   color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
};

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TASK_TYPES.map((t) => [t.value, t.label]));
const COMPLEXITY_CONFIG: Record<string, { label: string; color: string }> = Object.fromEntries(
  TASK_COMPLEXITIES.map((c) => [c.value, { label: c.label, color: c.color }])
);

// O recorte principal virou "quando", não "status": é assim que a pessoa
// abre a tela de manhã. Status continua disponível, como filtro.
const HORIZON_TABS = [
  { value: "hoje",       label: "Hoje" },
  { value: "proximos",   label: "Próximos 3 dias" },
  { value: "geral",      label: "Geral" },
  { value: "concluidas", label: "Concluídas" },
] as const;

const STATUS_OPTIONS = [
  { value: "pendente",     label: "Pendente" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida",    label: "Concluída" },
  { value: "cancelada",    label: "Cancelada" },
];

function TaskRow({
  task, onEdit, onDelete, onToggle, onOpen,
}: {
  task: TaskWithRelations;
  onEdit: (t: TaskWithRelations) => void;
  onDelete: (t: TaskWithRelations) => void;
  onToggle: (id: string, status: string) => void;
  onOpen: (t: TaskWithRelations) => void;
}) {
  const prio = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media;
  const isOverdue = task.due_date && isPastDate(task.due_date) && task.status !== "concluida" && task.status !== "cancelada";
  const isDone = task.status === "concluida";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b transition-all last:border-0 group"
      style={{ borderColor: "rgba(11,135,195,0.08)", opacity: isDone ? 0.6 : 1 }}
    >
      {/* Toggle checkbox */}
      <button
        onClick={() => onToggle(task.id, task.status)}
        className="flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all"
        style={{
          borderColor: isDone ? "#22c55e" : "rgba(11,135,195,0.3)",
          background: isDone ? "rgba(34,197,94,0.12)" : "transparent",
        }}
      >
        {isDone && <CheckCircle2 size={14} className="text-green-400" />}
      </button>

      {/* Priority dot */}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: prio.color }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => onOpen(task)}
          className={`text-sm font-medium truncate text-left hover:underline ${isDone ? "line-through" : ""}`}
          style={{ color: isDone ? "#3D5A78" : "#E2EBF8" }}
        >
          {task.title}
        </button>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px]" style={{ color: "#3D5A78" }}>
            {TYPE_LABELS[task.type] ?? task.type}
          </span>
          {task.company && (
            <span className="text-[11px]" style={{ color: "#3D5A78" }}>• Cliente: {task.company.name}</span>
          )}
          {task.lead && (
            <span className="text-[11px]" style={{ color: "#3D5A78" }}>• Lead: {task.lead.title}</span>
          )}
          {task.project && (
            <span className="text-[11px]" style={{ color: "#3D5A78" }}>• Projeto: {task.project.name}</span>
          )}
          {task.estimated_hours !== null && (
            <span className="text-[11px]" style={{ color: "#3D5A78" }}>• Estimado: {formatHoursDecimal(Number(task.estimated_hours))}</span>
          )}
        </div>
      </div>

      {/* Responsável */}
      <div className="hidden md:flex items-center gap-1.5 flex-shrink-0" title={task.assignee?.full_name ?? "Sem responsável"}>
        {task.assignee ? (
          <>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
              style={{ background: "rgba(11,135,195,0.15)", color: "#0CA8F5" }}
            >
              {formatInitials(task.assignee.full_name)}
            </div>
            <span className="text-[11px] truncate max-w-[100px]" style={{ color: "#7BA3C6" }}>
              {task.assignee.full_name}
            </span>
          </>
        ) : (
          <span className="text-[11px]" style={{ color: "#3D5A78" }}>Sem responsável</span>
        )}
      </div>

      {/* Due date */}
      <div className="hidden sm:flex items-center gap-1 text-xs flex-shrink-0" style={{ color: isOverdue ? "#ef4444" : "#7BA3C6" }}>
        {isOverdue ? <AlertCircle size={11} /> : <Clock size={11} />}
        {task.due_date
          ? task.has_time
            ? `${formatDate(task.due_date)} ${new Date(task.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : formatDate(task.due_date)
          : "—"}
      </div>

      {/* Complexity badge */}
      {task.complexity && (
        <span
          className="hidden md:inline text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
          style={{ color: COMPLEXITY_CONFIG[task.complexity].color, background: `${COMPLEXITY_CONFIG[task.complexity].color}20` }}
          title="Complexidade"
        >
          {COMPLEXITY_CONFIG[task.complexity].label}
        </span>
      )}

      {/* Priority badge */}
      <span
        className="hidden md:inline text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
        style={{ color: prio.color, background: prio.bg }}
      >
        {prio.label}
      </span>

      {/* Status */}
      <span
        className="hidden lg:inline text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize"
        style={{
          color: isDone ? "#22c55e" : task.status === "em_andamento" ? "#0B87C3" : "#7BA3C6",
          background: isDone ? "rgba(34,197,94,0.1)" : task.status === "em_andamento" ? "rgba(11,135,195,0.1)" : "rgba(11,135,195,0.05)",
        }}
      >
        {task.status === "em_andamento" ? "Em andamento" : task.status === "concluida" ? "Concluída" : task.status === "cancelada" ? "Cancelada" : "Pendente"}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 rounded transition-colors"
          style={{ color: "#7BA3C6" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0B87C3")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#7BA3C6")}
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={() => onDelete(task)}
          className="p-1.5 rounded transition-colors"
          style={{ color: "#7BA3C6" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#7BA3C6")}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function TasksPageContent() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  // hoje/proximos: em aberto dentro da janela. geral: em aberto SEM prazo —
  // é a lista do que não tem data e some das outras abas. concluidas: histórico.
  const [horizon, setHorizon] = useState<"hoje" | "proximos" | "geral" | "concluidas">("hoje");
  const [onlyMine, setOnlyMine] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskInitialData | undefined>();
  const [deletingTask, setDeletingTask] = useState<TaskWithRelations | undefined>();
  const [viewingTask, setViewingTask] = useState<TaskWithRelations | undefined>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusTaskId = searchParams.get("task");

  const { data: rawTasks = [], isLoading } = useAllTasks({ search: search || undefined });
  const { data: orgUsers = [] } = useOrgUsers();
  const { user } = useUser();

  // Developer só enxerga o que foi atribuído a ele — o acesso dele é a
  // Entrega, e Tarefas entrou no menu só por causa do link do email.
  const isDeveloper = user?.role === "developer";
  const allTasks = isDeveloper ? rawTasks.filter((t) => t.assignee_id === user?.id) : rawTasks;
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Janela de datas do horizonte selecionado. "Hoje" inclui o que venceu e
  // ainda está aberto — atrasada é problema de hoje, não do dia que passou.
  const horizonEnd = useMemo(() => {
    if (horizon === "geral" || horizon === "concluidas") return null;
    const d = new Date();
    d.setDate(d.getDate() + (horizon === "hoje" ? 0 : 3));
    d.setHours(23, 59, 59, 999);
    return d;
  }, [horizon]);

  const inHorizon = (t: TaskWithRelations) => {
    if (!horizonEnd) return true;
    if (!t.due_date) return false;
    return new Date(t.due_date).getTime() <= horizonEnd.getTime();
  };

  // Base dos filtros (responsável + tipo + prioridade). É dela que saem os
  // contadores, pra que os cards reflitam o recorte que está na tela.
  const assigneeFilteredTasks = allTasks.filter((t) => {
    if (assigneeFilter === "unassigned" && t.assignee_id) return false;
    if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && t.assignee_id !== assigneeFilter) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  // "Suas tarefas": Hoje e Próximos 3 dias abrem no que é seu; Geral mostra
  // tudo. Developer já vem restrito a si mesmo lá em cima.
  const scopedTasks = useMemo(() => {
    if (horizon === "concluidas") {
      return assigneeFilteredTasks.filter((t) => t.status === "concluida");
    }

    // As três primeiras abas são listas de trabalho: só o que está em aberto,
    // e por padrão só o que é seu.
    const base = assigneeFilteredTasks.filter(
      (t) => t.status !== "concluida" && t.status !== "cancelada"
    );
    const byScope =
      onlyMine && user?.id && assigneeFilter === "all"
        ? base.filter((t) => t.assignee_id === user.id)
        : base;

    // Geral é o balde do que não tem data limite — some das outras abas,
    // então precisa de um lugar próprio pra não sumir do radar.
    if (horizon === "geral") return byScope.filter((t) => !t.due_date);

    return byScope.filter(inHorizon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigneeFilteredTasks, onlyMine, horizon, user?.id, assigneeFilter, horizonEnd]);

  const filteredTasks = scopedTasks.filter((t) => statusFilter === "all" || t.status === statusFilter);

  // Contadores das abas: cada uma calculada com a sua própria janela, senão
  // "Hoje (3)" mostraria o número da aba que está aberta.
  const horizonCounts = useMemo(() => {
    const open = assigneeFilteredTasks.filter(
      (t) => t.status !== "concluida" && t.status !== "cancelada"
    );
    const mine = onlyMine && user?.id && assigneeFilter === "all"
      ? open.filter((t) => t.assignee_id === user.id)
      : open;
    const endOf = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(23, 59, 59, 999);
      return d.getTime();
    };
    const upTo = (limit: number) =>
      mine.filter((t) => t.due_date && new Date(t.due_date).getTime() <= endOf(limit)).length;
    return {
      hoje: upTo(0),
      proximos: upTo(3),
      geral: mine.filter((t) => !t.due_date).length,
      concluidas: assigneeFilteredTasks.filter((t) => t.status === "concluida").length,
    };
  }, [assigneeFilteredTasks, onlyMine, user?.id, assigneeFilter]);

  const pendingCount = assigneeFilteredTasks.filter((t) => t.status === "pendente").length;
  const overdueCount = assigneeFilteredTasks.filter((t) =>
    t.due_date && isPastDate(t.due_date) && t.status !== "concluida" && t.status !== "cancelada"
  ).length;

  // Tempo médio de conclusão (started_at -> completed_at, só tarefas com os dois)
  const tasksWithDuration = assigneeFilteredTasks.filter((t) => t.started_at && t.completed_at);
  const avgCompletionMs = tasksWithDuration.length > 0
    ? tasksWithDuration.reduce((s, t) => s + (new Date(t.completed_at!).getTime() - new Date(t.started_at!).getTime()), 0) / tasksWithDuration.length
    : null;
  const avgCompletionLabel = avgCompletionMs !== null
    ? formatDurationBetween(new Date(0).toISOString(), new Date(avgCompletionMs).toISOString())
    : "—";

  // Complexidade média (baixa=1, média=2, alta=3 — arredonda pro rótulo mais próximo)
  const complexityWeight: Record<string, number> = { baixa: 1, media: 2, alta: 3 };
  const tasksWithComplexity = assigneeFilteredTasks.filter((t) => t.complexity);
  const complexityCounts = { baixa: 0, media: 0, alta: 0 };
  tasksWithComplexity.forEach((t) => { complexityCounts[t.complexity as "baixa" | "media" | "alta"]++; });
  const avgComplexityScore = tasksWithComplexity.length > 0
    ? tasksWithComplexity.reduce((s, t) => s + complexityWeight[t.complexity!], 0) / tasksWithComplexity.length
    : null;
  const avgComplexityValue = avgComplexityScore !== null
    ? (avgComplexityScore <= 1.5 ? "baixa" : avgComplexityScore <= 2.5 ? "media" : "alta")
    : null;

  const handleEdit = (task: TaskWithRelations) => {
    setEditingTask({
      id: task.id,
      title: task.title,
      type: task.type,
      due_date: task.due_date,
      has_time: task.has_time,
      scheduled_start: task.scheduled_start,
      scheduled_end: task.scheduled_end,
      priority: task.priority,
      status: task.status,
      notes: task.notes,
      lead_id: task.lead_id,
      project_id: task.project_id,
      complexity: task.complexity,
      estimated_hours: task.estimated_hours,
      company_id: task.company_id,
      started_at: task.started_at,
      completed_at: task.completed_at,
    });
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTask(undefined);
  };

  // Depois de concluir/iniciar pelo painel, a lista refaz o fetch e o
  // objeto antigo fica defasado — repõe pela versão nova.
  useEffect(() => {
    if (!viewingTask) return;
    const fresh = allTasks.find((t) => t.id === viewingTask.id);
    if (fresh && fresh !== viewingTask) setViewingTask(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks]);

  // Link do email ("Abrir no CRM") chega como /tasks?task=<id>: abre o
  // painel daquela tarefa e limpa o parâmetro, pra fechar o painel não
  // reabrir sozinho no próximo render.
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || !focusTaskId || allTasks.length === 0) return;
    const target = allTasks.find((t) => t.id === focusTaskId);
    if (!target) return;
    openedFromUrl.current = true;
    setViewingTask(target);
    router.replace("/tasks", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTaskId, allTasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight" style={{ color: "#E2EBF8" }}>
            Tarefas
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7BA3C6" }}>
            {pendingCount} pendentes
            {overdueCount > 0 && (
              <span className="ml-2 text-red-400 flex-inline items-center gap-1">
                · <AlertCircle size={11} className="inline" /> {overdueCount} atrasadas
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #0B87C3, #0CA8F5)", color: "#fff", boxShadow: "0 0 16px rgba(11,135,195,0.3)" }}
        >
          <Plus size={15} />
          Nova Tarefa
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", count: assigneeFilteredTasks.length, color: "#0B87C3" },
          { label: "Pendentes", count: assigneeFilteredTasks.filter((t) => t.status === "pendente").length, color: "#f59e0b" },
          { label: "Em Andamento", count: assigneeFilteredTasks.filter((t) => t.status === "em_andamento").length, color: "#0B87C3" },
          { label: "Concluídas", count: assigneeFilteredTasks.filter((t) => t.status === "concluida").length, color: "#22c55e" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4 text-center"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            <p className="font-display font-bold text-2xl" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs mt-1" style={{ color: "#7BA3C6" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tempo médio + complexidade média */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
        >
          <p className="text-xs" style={{ color: "#7BA3C6" }}>Tempo Médio de Conclusão</p>
          <p className="font-display font-bold text-xl mt-1" style={{ color: "#E2EBF8" }}>{avgCompletionLabel}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#3D5A78" }}>
            {tasksWithDuration.length > 0 ? `Baseado em ${tasksWithDuration.length} tarefa(s) concluída(s)` : "Ainda sem tarefas com tempo registrado"}
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
        >
          <p className="text-xs" style={{ color: "#7BA3C6" }}>Complexidade Média</p>
          <p
            className="font-display font-bold text-xl mt-1"
            style={{ color: avgComplexityValue ? COMPLEXITY_CONFIG[avgComplexityValue].color : "#E2EBF8" }}
          >
            {avgComplexityValue ? COMPLEXITY_CONFIG[avgComplexityValue].label : "—"}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "#3D5A78" }}>
            {tasksWithComplexity.length > 0
              ? `${complexityCounts.baixa} baixa · ${complexityCounts.media} média · ${complexityCounts.alta} alta`
              : "Ainda sem tarefas com complexidade definida"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 flex-1 max-w-xs px-3 py-2 rounded-lg text-sm"
          style={{ background: "rgba(11,135,195,0.05)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <Search size={14} style={{ color: "#3D5A78" }} />
          <input
            className="bg-transparent outline-none flex-1 text-sm"
            style={{ color: "#E2EBF8" }}
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            <SelectItem value="unassigned">Sem responsável</SelectItem>
            {orgUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TASK_TYPES_CURRENT.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
            <SelectSeparator />
            {TASK_TYPES_LEGACY.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label} (legado)</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(typeFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all") && (
          <button
            onClick={() => { setTypeFilter("all"); setPriorityFilter("all"); setAssigneeFilter("all"); }}
            className="text-xs px-2.5 py-2 rounded-lg whitespace-nowrap"
            style={{ background: "rgba(11,135,195,0.1)", color: "#0B87C3" }}
          >
            Limpar filtros
          </button>
        )}

        <div className="flex gap-1 rounded-lg p-1" style={{ background: "rgba(11,135,195,0.05)", border: "1px solid rgba(11,135,195,0.15)" }}>
          <button
            onClick={() => setView("list")}
            className="p-1.5 rounded transition-colors"
            style={view === "list" ? { background: "var(--primary)", color: "#fff" } : { color: "#7BA3C6" }}
            title="Lista"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setView("kanban")}
            className="p-1.5 rounded transition-colors"
            style={view === "kanban" ? { background: "var(--primary)", color: "#fff" } : { color: "#7BA3C6" }}
            title="Kanban"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Kanban view */}
      {view === "kanban" && (
        <TasksKanbanBoard
          tasks={assigneeFilteredTasks}
          onMoveTask={(id, status) => updateTask.mutate({ id, status: status as "pendente" | "em_andamento" | "concluida" | "cancelada" })}
          onEdit={handleEdit}
          onDelete={setDeletingTask}
        />
      )}

      {/* Tasks list with tabs */}
      {view === "list" && (
      <Tabs value={horizon} onValueChange={(v) => setHorizon(v as typeof horizon)}>
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList
            className="h-9"
            style={{ background: "rgba(11,135,195,0.05)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            {HORIZON_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">
                {t.label}
                <span className="ml-1.5 text-[10px] opacity-60">({horizonCounts[t.value]})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {horizon === "geral" && (
            <span className="text-[11px]" style={{ color: "#3D5A78" }}>
              Tarefas sem data limite definida
            </span>
          )}

          {horizon !== "concluidas" && assigneeFilter === "all" && (
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "#7BA3C6" }}>
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              Só as minhas
            </label>
          )}

          {horizon !== "concluidas" && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40 text-xs ml-auto">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
        </div>

        {HORIZON_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
            >
              {isLoading ? (
                <div className="p-12 text-center text-sm" style={{ color: "#3D5A78" }}>Carregando...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckSquare size={32} className="mx-auto mb-3 opacity-20" style={{ color: "#0B87C3" }} />
                  <p className="text-sm" style={{ color: "#3D5A78" }}>
                    {horizon === "hoje"
                      ? "Nada pra hoje — dia limpo"
                      : horizon === "proximos"
                      ? "Nada nos próximos 3 dias"
                      : horizon === "geral"
                      ? "Nenhuma tarefa sem data limite"
                      : "Nenhuma tarefa concluída ainda"}
                  </p>
                </div>
              ) : (
                <div>
                  {/* Header */}
                  <div
                    className="flex items-center gap-3 px-4 py-2 border-b text-[11px] font-semibold uppercase tracking-wider"
                    style={{ borderColor: "rgba(11,135,195,0.1)", color: "#3D5A78" }}
                  >
                    <span className="w-5 flex-shrink-0" />
                    <span className="w-2 flex-shrink-0" />
                    <span className="flex-1">Tarefa</span>
                    <span className="hidden md:inline w-[124px]">Responsável</span>
                    <span className="hidden sm:inline w-24 text-right">Prazo</span>
                    <span className="hidden md:inline w-16 text-right">Prioridade</span>
                    <span className="hidden lg:inline w-24 text-right">Status</span>
                    <span className="w-16" />
                  </div>
                  {filteredTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={setDeletingTask}
                      onOpen={setViewingTask}
                      onToggle={(id, status) => toggleTask.mutate({ id, currentStatus: status as "pendente" | "concluida" | "em_andamento" | "cancelada" })}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      )}

      {/* Visualização da tarefa (link do email e clique no título) */}
      <TaskDetailDialog
        task={viewingTask}
        open={!!viewingTask}
        onClose={() => setViewingTask(undefined)}
        onEdit={(t) => { setViewingTask(undefined); handleEdit(t); }}
      />

      {/* Task Form */}
      <TaskForm
        open={formOpen}
        onClose={handleFormClose}
        initialData={editingTask}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingTask} onOpenChange={(v) => !v && setDeletingTask(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              A tarefa <strong>{deletingTask?.title}</strong> será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (deletingTask) {
                  await deleteTask.mutateAsync(deletingTask.id);
                  setDeletingTask(undefined);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// useSearchParams precisa de um boundary de Suspense pro Next conseguir
// pré-renderizar a rota.
export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm" style={{ color: "#3D5A78" }}>Carregando...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}
