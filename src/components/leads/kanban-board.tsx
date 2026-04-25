"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { LeadCard } from "./lead-card";
import type { LeadWithRelations } from "@/lib/hooks/use-leads";
import type { PipelineWithStages } from "@/lib/hooks/use-pipelines";

interface KanbanBoardProps {
  pipeline: PipelineWithStages;
  leads: LeadWithRelations[];
  onMoveLead: (leadId: string, stageId: string) => void;
  onEditLead: (lead: LeadWithRelations) => void;
  onDeleteLead: (lead: LeadWithRelations) => void;
  onAddLead: (stageId: string) => void;
  onQuickTask?: (lead: LeadWithRelations) => void;
  onOpenLead?: (lead: LeadWithRelations) => void;
}

export const KanbanBoard = ({
  pipeline,
  leads,
  onMoveLead,
  onEditLead,
  onDeleteLead,
  onAddLead,
  onQuickTask,
  onOpenLead,
}: KanbanBoardProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const getStageLeads = useCallback(
    (stageId: string) => leads.filter((l) => l.stage_id === stageId),
    [leads]
  );

  const getStageValue = useCallback(
    (stageId: string) =>
      leads
        .filter((l) => l.stage_id === stageId && l.value)
        .reduce((acc, l) => acc + (l.value ?? 0), 0),
    [leads]
  );

  const onDragStart = () => setIsDragging(true);

  const onDragEnd = (result: DropResult) => {
    setIsDragging(false);
    if (!result.destination) return;
    if (result.destination.droppableId === result.source.droppableId) return;
    onMoveLead(result.draggableId, result.destination.droppableId);
  };

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {pipeline.stages.map((stage) => {
          const stageLeads = getStageLeads(stage.id);
          const stageValue = getStageValue(stage.id);

          return (
            <div key={stage.id} className="flex flex-col shrink-0 w-64">
              {/* Column header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: stage.color ?? "#94a3b8" }}
                  />
                  <span className="text-sm font-medium text-text-primary">{stage.name}</span>
                  <span className="text-xs text-text-muted bg-white/5 rounded-full px-1.5 py-0.5">
                    {stageLeads.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddLead(stage.id)}
                  className="p-1 rounded hover:bg-white/5 text-text-muted hover:text-primary"
                >
                  <Plus size={14} />
                </button>
              </div>

              {stageValue > 0 && (
                <p className="text-xs text-text-muted px-1 mb-2">
                  {formatCurrency(stageValue)}
                </p>
              )}

              {/* Droppable column */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 rounded-lg p-2 space-y-2 min-h-[100px] transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-primary/5 border-2 border-dashed border-primary/30"
                        : "bg-white/5"
                    }`}
                  >
                    {stageLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={snapshot.isDragging ? "rotate-1 scale-105" : ""}
                          >
                            <LeadCard
                              lead={lead}
                              onEdit={onEditLead}
                              onDelete={onDeleteLead}
                              onQuickTask={onQuickTask}
                              onOpen={onOpenLead}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {stageLeads.length === 0 && !isDragging && (
                      <button
                        onClick={() => onAddLead(stage.id)}
                        className="w-full py-6 border-2 border-dashed border-border rounded-lg text-xs text-text-muted hover:border-primary/40 hover:text-primary transition-colors"
                      >
                        + Adicionar lead
                      </button>
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
