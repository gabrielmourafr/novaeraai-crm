"use client";

import { Calendar, Clock, User, Building2, Rocket, Target, AlertCircle, CheckCircle2, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToggleTask, useUpdateTask, type TaskWithRelations } from "@/lib/hooks/use-tasks";
import { formatDate, formatDateTime, formatHoursDecimal, isPastDate } from "@/lib/utils/format";
import { TASK_TYPES, TASK_COMPLEXITIES } from "@/lib/utils/constants";

// Visualização da tarefa — é o que abre pelo link do email ("Abrir no CRM")
// e pelo clique no título na lista. Leitura, não edição: quem precisa
// alterar campos clica em "Editar" e cai no formulário de sempre.

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgente: { label: "Urgente", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  alta:    { label: "Alta",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  media:   { label: "Média",   color: "#0B87C3", bg: "rgba(11,135,195,0.12)" },
  baixa:   { label: "Baixa",   color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendente:     { label: "Pendente",     color: "#f59e0b" },
  em_andamento: { label: "Em Andamento", color: "#0B87C3" },
  concluida:    { label: "Concluída",    color: "#22c55e" },
  cancelada:    { label: "Cancelada",    color: "#7BA3C6" },
};

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TASK_TYPES.map((t) => [t.value, t.label]));
const COMPLEXITY_LABELS: Record<string, { label: string; color: string }> = Object.fromEntries(
  TASK_COMPLEXITIES.map((c) => [c.value, { label: c.label, color: c.color }])
);

function Field({
  icon: Icon, label, value, valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#3D5A78" }} />
      <div className="min-w-0">
        <p className="text-[11px]" style={{ color: "#3D5A78" }}>{label}</p>
        <p className="text-sm mt-0.5" style={{ color: valueColor ?? "#E2EBF8" }}>{value}</p>
      </div>
    </div>
  );
}

export function TaskDetailDialog({
  task, open, onClose, onEdit,
}: {
  task: TaskWithRelations | undefined;
  open: boolean;
  onClose: () => void;
  onEdit: (t: TaskWithRelations) => void;
}) {
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();

  if (!task) return null;

  const prio = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media;
  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pendente;
  const complexity = task.complexity ? COMPLEXITY_LABELS[task.complexity] : null;
  const isOverdue =
    task.due_date && isPastDate(task.due_date) && task.status !== "concluida" && task.status !== "cancelada";
  const isDone = task.status === "concluida";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: prio.bg, color: prio.color }}
            >
              {prio.label}
            </span>
            <span className="text-[11px]" style={{ color: status.color }}>
              {status.label}
            </span>
            {isOverdue && (
              <span className="text-[11px] flex items-center gap-1 text-red-400">
                <AlertCircle size={11} /> Atrasada
              </span>
            )}
          </div>
          <DialogTitle className="text-lg leading-snug">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {task.notes && (
            <div
              className="rounded-lg p-3"
              style={{ background: "rgba(11,135,195,0.05)", border: "1px solid rgba(11,135,195,0.12)" }}
            >
              <p className="text-[11px] mb-1" style={{ color: "#3D5A78" }}>Descrição</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "#C3D4E8" }}>
                {task.notes}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field
              icon={Calendar}
              label="Prazo"
              value={
                task.due_date
                  ? task.has_time
                    ? `${formatDateTime(task.due_date)} · na agenda`
                    : formatDate(task.due_date)
                  : "Sem prazo"
              }
              valueColor={isOverdue ? "#ef4444" : undefined}
            />
            <Field icon={Target} label="Tipo" value={TYPE_LABELS[task.type] ?? task.type} />
            <Field
              icon={User}
              label="Responsável"
              value={task.assignee?.full_name ?? "Não atribuída"}
            />
            {complexity && (
              <Field icon={Target} label="Complexidade" value={complexity.label} valueColor={complexity.color} />
            )}
            {task.estimated_hours != null && (
              <Field icon={Clock} label="Horas estimadas" value={formatHoursDecimal(task.estimated_hours)} />
            )}
            {task.company && <Field icon={Building2} label="Cliente" value={task.company.name} />}
            {task.project && <Field icon={Rocket} label="Projeto" value={task.project.name} />}
            {task.started_at && (
              <Field icon={Play} label="Iniciada em" value={formatDateTime(task.started_at)} />
            )}
            {task.completed_at && (
              <Field icon={CheckCircle2} label="Concluída em" value={formatDateTime(task.completed_at)} />
            )}
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 pt-4 mt-2 border-t" style={{ borderColor: "rgba(11,135,195,0.12)" }}>
          <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
            Editar
          </Button>
          <div className="flex gap-2">
            {task.status === "pendente" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTask.mutate({ id: task.id, status: "em_andamento" })}
              >
                <Play size={13} className="mr-1.5" />
                Iniciar
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                toggleTask.mutate({ id: task.id, currentStatus: task.status });
                onClose();
              }}
              style={
                isDone
                  ? undefined
                  : { background: "linear-gradient(135deg, #0B87C3, #0CA8F5)", color: "#fff" }
              }
              variant={isDone ? "outline" : "default"}
            >
              <CheckCircle2 size={13} className="mr-1.5" />
              {isDone ? "Reabrir" : "Concluir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
