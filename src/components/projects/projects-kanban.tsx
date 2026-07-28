"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { differenceInDays, parseISO } from "date-fns";
import { Building2, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PROJECT_PIPELINE_V2, PROJECT_STATUSES } from "@/lib/utils/constants";
import { useUpdateProject } from "@/lib/hooks/use-projects";
import type { ProjectWithRelations } from "@/lib/hooks/use-projects";
import type { Database } from "@/types/database";

type ProjectStatus = Database["public"]["Tables"]["projects"]["Row"]["status"];
type V2Status = (typeof PROJECT_PIPELINE_V2)[number];

interface Props {
  projects: ProjectWithRelations[];
  orgUsers: { id: string; full_name: string }[];
  onCardClick: (p: ProjectWithRelations) => void;
}

export function ProjectsKanban({ projects, onCardClick, orgUsers }: Props) {
  const update = useUpdateProject();

  // Agrupar por status (apenas V2). Legacy ficam num bucket "Outros"
  const grouped = PROJECT_PIPELINE_V2.reduce<Record<V2Status, ProjectWithRelations[]>>((acc, s) => {
    acc[s] = [];
    return acc;
  }, {} as Record<V2Status, ProjectWithRelations[]>);

  const legacy: ProjectWithRelations[] = [];
  for (const p of projects) {
    if ((PROJECT_PIPELINE_V2 as readonly string[]).includes(p.status)) {
      grouped[p.status as V2Status].push(p);
    } else {
      legacy.push(p);
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as ProjectStatus;
    const projectId = result.draggableId;
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;
    update.mutate({ id: projectId, status: newStatus });
  };

  return (
    <div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PROJECT_PIPELINE_V2.map((status) => {
            const items = grouped[status];
            const meta = PROJECT_STATUSES.find((s) => s.value === status)!;
            return (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-72 rounded-xl p-3 transition-colors ${
                      snapshot.isDraggingOver ? "bg-[#0B87C3]/5" : "bg-card"
                    }`}
                    style={{ border: "1px solid rgba(11,135,195,0.12)" }}
                  >
                    <div className="flex items-center justify-between mb-3 sticky top-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: meta.color }}
                        />
                        <h4 className="text-sm font-semibold text-text-primary truncate">
                          {meta.label}
                        </h4>
                      </div>
                      <span className="text-[10px] text-text-muted bg-white/5 px-1.5 py-0.5 rounded">
                        {items.length}
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[80px]">
                      {items.map((p, idx) => (
                        <Draggable key={p.id} draggableId={p.id} index={idx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onCardClick(p)}
                              className={`bg-card rounded-lg border border-border p-3 cursor-pointer hover:border-primary/30 transition-all ${
                                snapshot.isDragging ? "shadow-lg ring-2 ring-[#0B87C3]" : ""
                              }`}
                            >
                              <ProjectCard project={p} orgUsers={orgUsers} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {legacy.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200/30 bg-amber-50/5 p-4">
          <p className="text-xs text-amber-300 font-semibold mb-2">
            {legacy.length} projeto(s) em status legado (kickoff/em_andamento/etc) —
            ajuste o status pra encaixar no novo pipeline V2:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {legacy.map((p) => (
              <div
                key={p.id}
                onClick={() => onCardClick(p)}
                className="bg-card rounded-lg border border-border p-2 cursor-pointer hover:border-primary/30 transition-colors"
              >
                <ProjectCard project={p} orgUsers={orgUsers} compact />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  orgUsers,
  compact,
}: {
  project: ProjectWithRelations;
  orgUsers: { id: string; full_name: string }[];
  compact?: boolean;
}) {
  const dev = project.developer_user_id ? orgUsers.find((u) => u.id === project.developer_user_id) : null;
  const slipDays =
    project.promised_delivery_date && project.status !== "ativo_mensalidade" && project.status !== "churned"
      ? differenceInDays(parseISO(project.promised_delivery_date), new Date())
      : null;

  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-text-primary line-clamp-2">{project.name}</p>
      </div>
      <p className="text-[10px] text-text-muted font-mono mb-2">{project.code}</p>

      {project.company && (
        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1.5">
          <Building2 size={11} className="shrink-0" />
          <span className="truncate">{project.company.name}</span>
        </div>
      )}

      {!compact && (
        <div className="space-y-1.5">
          {project.contract_value && (
            <div className="text-xs">
              <span className="text-text-muted">Contrato: </span>
              <span className="font-semibold text-text-primary">
                {formatCurrency(Number(project.contract_value))}
              </span>
            </div>
          )}

          {project.completion_percent != null && project.completion_percent > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0B87C3] rounded-full"
                  style={{ width: `${project.completion_percent}%` }}
                />
              </div>
              <span className="text-[10px] text-text-muted">{project.completion_percent}%</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] gap-2">
            {dev && <span className="text-text-muted truncate">DEV: {dev.full_name}</span>}
            {slipDays !== null && (
              <span
                className={`flex items-center gap-0.5 whitespace-nowrap flex-shrink-0 ${
                  slipDays < 0 ? "text-red-600 font-semibold" : slipDays <= 7 ? "text-amber-600 font-medium" : "text-text-muted"
                }`}
                title={project.promised_delivery_date ? formatDate(project.promised_delivery_date) : undefined}
              >
                {slipDays < 0 && <AlertTriangle size={9} />}
                {slipDays < 0
                  ? `Atrasado ${Math.abs(slipDays)}d`
                  : slipDays === 0
                  ? "Entrega hoje"
                  : `Faltam ${slipDays}d`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
