"use client";

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { AlertCircle, Clock, Edit2, Trash2 } from "lucide-react";
import type { TaskWithRelations } from "@/lib/hooks/use-tasks";
import { formatDate, formatInitials, isPastDate } from "@/lib/utils/format";
import { TASK_TYPES, TASK_COMPLEXITIES } from "@/lib/utils/constants";

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

const COLUMNS = [
  { status: "pendente", label: "Pendentes", color: "#f59e0b" },
  { status: "em_andamento", label: "Em Andamento", color: "#0B87C3" },
  { status: "concluida", label: "Concluídas", color: "#22c55e" },
] as const;

interface TasksKanbanBoardProps {
  tasks: TaskWithRelations[];
  onMoveTask: (id: string, status: string) => void;
  onEdit: (task: TaskWithRelations) => void;
  onDelete: (task: TaskWithRelations) => void;
}

export const TasksKanbanBoard = ({ tasks, onMoveTask, onEdit, onDelete }: TasksKanbanBoardProps) => {
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.droppableId === result.source.droppableId) return;
    onMoveTask(result.draggableId, result.destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="flex flex-col flex-1 min-w-[280px]">
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span className="text-sm font-medium text-text-primary">{col.label}</span>
                <span className="text-xs text-text-muted bg-white/5 rounded-full px-1.5 py-0.5">
                  {colTasks.length}
                </span>
              </div>

              <Droppable droppableId={col.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 rounded-xl p-2 space-y-2 min-h-[120px] transition-colors"
                    style={{
                      background: snapshot.isDraggingOver ? "rgba(11,135,195,0.06)" : "rgba(12,21,38,0.4)",
                      border: "1px solid rgba(11,135,195,0.1)",
                    }}
                  >
                    {colTasks.map((task, index) => {
                      const prio = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media;
                      const isOverdue =
                        task.due_date && isPastDate(task.due_date) &&
                        task.status !== "concluida" && task.status !== "cancelada";

                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className="rounded-lg p-3 group"
                              style={{
                                background: "rgba(12,21,38,0.9)",
                                border: "1px solid rgba(11,135,195,0.15)",
                                opacity: task.status === "concluida" ? 0.7 : 1,
                                boxShadow: dragSnapshot.isDragging ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
                                ...dragProvided.draggableProps.style,
                              }}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: prio.color }} />
                                  <p
                                    className={`text-sm font-medium truncate ${task.status === "concluida" ? "line-through" : ""}`}
                                    style={{ color: "#E2EBF8" }}
                                  >
                                    {task.title}
                                  </p>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button onClick={() => onEdit(task)} className="p-1 rounded text-text-muted hover:text-primary">
                                    <Edit2 size={11} />
                                  </button>
                                  <button onClick={() => onDelete(task)} className="p-1 rounded text-text-muted hover:text-red-400">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] mb-2" style={{ color: "#7BA3C6" }}>
                                <span>{TYPE_LABELS[task.type] ?? task.type}</span>
                                {(task.lead || task.project) && (
                                  <span className="truncate">
                                    • {task.project ? task.project.name : task.lead?.title}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                                    style={{ color: prio.color, background: prio.bg }}
                                  >
                                    {prio.label}
                                  </span>
                                  {task.complexity && (
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                                      style={{ color: COMPLEXITY_CONFIG[task.complexity].color, background: `${COMPLEXITY_CONFIG[task.complexity].color}20` }}
                                    >
                                      {COMPLEXITY_CONFIG[task.complexity].label}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {task.due_date && (
                                    <span
                                      className="flex items-center gap-1 text-[10px]"
                                      style={{ color: isOverdue ? "#ef4444" : "#7BA3C6" }}
                                    >
                                      {isOverdue ? <AlertCircle size={10} /> : <Clock size={10} />}
                                      {formatDate(task.due_date)}
                                    </span>
                                  )}
                                  {task.assignee && (
                                    <div
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                                      style={{ background: "rgba(11,135,195,0.15)", color: "#0CA8F5" }}
                                      title={task.assignee.full_name}
                                    >
                                      {formatInitials(task.assignee.full_name)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {colTasks.length === 0 && (
                      <div className="text-center py-6 text-xs" style={{ color: "#3D5A78" }}>
                        Nenhuma tarefa
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
