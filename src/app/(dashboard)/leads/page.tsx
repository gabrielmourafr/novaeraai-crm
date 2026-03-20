"use client";

import { useState } from "react";
import { Plus, LayoutGrid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KanbanBoard } from "@/components/leads/kanban-board";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadForm } from "@/components/forms/lead-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLeads, useDeleteLead, useMoveLead, type LeadWithRelations } from "@/lib/hooks/use-leads";
import { usePipelines } from "@/lib/hooks/use-pipelines";

type ViewMode = "kanban" | "list";

export default function LeadsPage() {
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithRelations | undefined>();
  const [deletingLead, setDeletingLead] = useState<LeadWithRelations | undefined>();
  const [defaultStageId, setDefaultStageId] = useState<string>("");

  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines();
  const activePipelineId = selectedPipelineId || pipelines?.[0]?.id || "";
  const activePipeline = pipelines?.find((p) => p.id === activePipelineId);

  const { data: leads = [], isLoading: leadsLoading } = useLeads(
    view === "kanban" ? activePipelineId : undefined,
    undefined,
    search
  );

  const deleteLead = useDeleteLead();
  const moveLead = useMoveLead();

  const handleAddLead = (stageId: string) => {
    setEditingLead(undefined);
    setDefaultStageId(stageId);
    setFormOpen(true);
  };

  const handleEdit = (lead: LeadWithRelations) => {
    setEditingLead(lead);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingLead) return;
    await deleteLead.mutateAsync(deletingLead.id);
    setDeletingLead(undefined);
  };

  const handleMoveLead = (leadId: string, stageId: string) => {
    moveLead.mutate({ id: leadId, stage_id: stageId });
  };

  const isLoading = pipelinesLoading || leadsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Gerencie suas oportunidades comerciais"
        action={
          <Button
            style={{ background: "var(--primary)" }}
            onClick={() => {
              setEditingLead(undefined);
              setDefaultStageId("");
              setFormOpen(true);
            }}
          >
            <Plus size={16} className="mr-2" />
            Novo Lead
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        {pipelines && pipelines.length > 0 && (
          <Select value={activePipelineId} onValueChange={setSelectedPipelineId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1 border border-border rounded-lg p-1 bg-white/5">
          <button
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded ${
              view === "kanban" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded ${
              view === "list" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {view === "kanban" && activePipeline && (
        <div className="flex gap-3 text-sm text-text-muted">
          <span>{leads.length} leads</span>
          <span>·</span>
          <span>
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
              leads.reduce((acc, l) => acc + (l.value ?? 0), 0)
            )}{" "}
            em aberto
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-text-muted text-sm">Carregando...</div>
        </div>
      ) : !pipelines?.length ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nenhum pipeline encontrado"
          description="Os pipelines são criados automaticamente ao registrar-se."
        />
      ) : view === "kanban" && activePipeline ? (
        <KanbanBoard
          pipeline={activePipeline}
          leads={leads}
          onMoveLead={handleMoveLead}
          onEditLead={handleEdit}
          onDeleteLead={setDeletingLead}
          onAddLead={handleAddLead}
        />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nenhum lead encontrado"
          description={search ? "Tente outro termo de busca." : "Crie seu primeiro lead."}
          action={{ label: "Novo Lead", onClick: () => setFormOpen(true) }}
        />
      ) : (
        <LeadsTable leads={leads} onEdit={handleEdit} onDelete={setDeletingLead} />
      )}

      <LeadForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingLead(undefined);
        }}
        lead={editingLead}
        defaultPipelineId={activePipelineId}
        defaultStageId={defaultStageId}
      />

      <AlertDialog open={!!deletingLead} onOpenChange={(v) => !v && setDeletingLead(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead{" "}
              <strong>{deletingLead?.title}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-danger hover:bg-danger/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
