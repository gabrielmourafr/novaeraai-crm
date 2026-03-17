"use client";

import { useState } from "react";
import {
  CheckSquare, Plus, Search, Trash2, Edit2, AlertCircle, Clock, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TaskForm, type TaskInitialData } from "@/components/forms/task-form";
import { useAllTasks, useToggleTask, useDeleteTask, type TaskWithRelations } from "@/lib/hooks/use-tasks";
import { formatDate } from "@/lib/utils/format";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critica: { label: "Crítica", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  alta:    { label: "Alta",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  media:   { label: "Média",   color: "#0B87C3", bg: "rgba(11,135,195,0.12)" },
  baixa:   { label: "Baixa",   color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
};

const TYPE_LABELS: Record<string, string> = {
  followup: "Follow-up", ligacao: "Ligação", email: "Email",
  reuniao: "Reunião", proposta: "Proposta", entrega: "Entrega",
  interno: "Interno", outro: "Outro",
};

const STATUS_TABS = [
  { value: "all",         label: "Todas" },
  { value: "pendente",    label: "Pendentes" },
  { value: "em_andamento",label: "Em Andamento" },
  { value: "concluida",   label: "Concluídas" },
];

function TaskRow({
  task, now, onEdit, onDelete, onToggle,
}: {
  task: TaskWithRelations;
  now: Date;
  onEdit: (t: TaskWithRelations) => void;
  onDelete: (t: TaskWithRelations) => void;
  onToggle: (id: string, status: string) => void;
}) {
  const prio = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media;
  const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== "concluida" && task.status !== "cancelada";
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
        <p className={`text-sm font-medium truncate ${isDone ? "line-through" : ""}`} style={{ color: isDone ? "#3D5A78" : "#E2EBF8" }}>
          {task.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px]" style={{ color: "#3D5A78" }}>
            {TYPE_LABELS[task.type] ?? task.type}
          </span>
          {task.lead && (
            <span className="text-[11px]" style={{ color: "#3D5A78" }}>• Lead: {task.lead.title}</span>
          )}
          {task.project && (
            <span className="text-[11px]" style={{ color: "#3D5A78" }}>• Projeto: {task.project.name}</span>
          )}
        </div>
      </div>

      {/* Due date */}
      <div className="hidden sm:flex items-center gap-1 text-xs flex-shrink-0" style={{ color: isOverdue ? "#ef4444" : "#7BA3C6" }}>
        {isOverdue ? <AlertCircle size={11} /> : <Clock size={11} />}
        {task.due_date ? formatDate(task.due_date) : "—"}
      </div>

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

export default function TasksPage() {
  const now = new Date();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskInitialData | undefined>();
  const [deletingTask, setDeletingTask] = useState<TaskWithRelations | undefined>();

  const { data: allTasks = [], isLoading } = useAllTasks({ search: search || undefined });
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();

  const filteredTasks = allTasks.filter((t) => {
    if (tab === "all") return true;
    return t.status === tab;
  });

  const pendingCount = allTasks.filter((t) => t.status === "pendente").length;
  const overdueCount = allTasks.filter((t) =>
    t.due_date && new Date(t.due_date) < now && t.status !== "concluida" && t.status !== "cancelada"
  ).length;

  const handleEdit = (task: TaskWithRelations) => {
    setEditingTask({
      id: task.id,
      title: task.title,
      type: task.type,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
      notes: task.notes,
      lead_id: task.lead_id,
      project_id: task.project_id,
    });
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTask(undefined);
  };

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
          { label: "Total", count: allTasks.length, color: "#0B87C3" },
          { label: "Pendentes", count: allTasks.filter((t) => t.status === "pendente").length, color: "#f59e0b" },
          { label: "Em Andamento", count: allTasks.filter((t) => t.status === "em_andamento").length, color: "#0B87C3" },
          { label: "Concluídas", count: allTasks.filter((t) => t.status === "concluida").length, color: "#22c55e" },
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
      </div>

      {/* Tasks list with tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList
          className="h-9"
          style={{ background: "rgba(11,135,195,0.05)", border: "1px solid rgba(11,135,195,0.12)" }}
        >
          {STATUS_TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="text-xs"
            >
              {t.label}
              {t.value !== "all" && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  ({allTasks.filter((task) => t.value === "all" || task.status === t.value).length})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((t) => (
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
                  <p className="text-sm" style={{ color: "#3D5A78" }}>Nenhuma tarefa encontrada</p>
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
                    <span className="hidden sm:inline w-24 text-right">Prazo</span>
                    <span className="hidden md:inline w-16 text-right">Prioridade</span>
                    <span className="hidden lg:inline w-24 text-right">Status</span>
                    <span className="w-16" />
                  </div>
                  {filteredTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      now={now}
                      onEdit={handleEdit}
                      onDelete={setDeletingTask}
                      onToggle={(id, status) => toggleTask.mutate({ id, currentStatus: status as "pendente" | "concluida" | "em_andamento" | "cancelada" })}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

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
