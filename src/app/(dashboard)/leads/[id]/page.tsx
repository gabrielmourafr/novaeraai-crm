"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  User,
  Thermometer,
  Pencil,
  Plus,
  CheckCircle2,
  Circle,
  FileText,
  ClipboardList,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Mail,
  Phone,
  File,
  Download,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Timeline } from "@/components/shared/timeline";
import { LeadForm } from "@/components/forms/lead-form";
import { TaskForm } from "@/components/forms/task-form";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate, formatInitials } from "@/lib/utils/format";
import {
  TEMPERATURES,
  LEAD_ORIGINS,
  LOSS_REASONS,
  PROPOSAL_STATUSES,
  TASK_PRIORITIES,
  BUSINESS_UNITS,
} from "@/lib/utils/constants";
import { useLead, useUpdateLead, useDeleteLead, useMoveLead } from "@/lib/hooks/use-leads";
import { usePipeline } from "@/lib/hooks/use-pipelines";
import { useActivities, useAddActivity } from "@/lib/hooks/use-activities";
import { useLeadTasks, useUpdateTask } from "@/lib/hooks/use-tasks";
import { useProposals } from "@/lib/hooks/use-proposals";
import { useContact } from "@/lib/hooks/use-contacts";
import { useCompany } from "@/lib/hooks/use-companies";
import { useUser } from "@/lib/hooks/use-user";
import { useDocuments, useUploadDocument, useDeleteDocument, getDocumentUrl } from "@/lib/hooks/use-documents";
import { cn } from "@/lib/utils";
import { parseISO, isPast } from "date-fns";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const temperatureColors: Record<string, string> = {
  frio: "bg-blue-950/60 text-blue-300 border-blue-200",
  morno: "bg-amber-100 text-amber-700 border-amber-200",
  quente: "bg-red-950/60 text-red-300 border-red-200",
};

const businessUnitColors: Record<string, string> = {
  labs: "bg-violet-100 text-violet-700",
  advisory: "bg-sky-100 text-sky-700",
  enterprise: "bg-emerald-100 text-emerald-700",
};

const priorityColors: Record<string, string> = {
  baixa: "#10B981",
  media: "#6366F1",
  alta: "#F59E0B",
  urgente: "#EF4444",
};

const proposalStatusColors: Record<string, string> = {
  rascunho: "bg-white/5 text-slate-600",
  enviada: "bg-blue-950/60 text-blue-300",
  visualizada: "bg-purple-950/60 text-purple-300",
  aceita: "bg-green-950/60 text-green-300",
  recusada: "bg-red-950/60 text-red-300",
  expirada: "bg-amber-100 text-amber-700",
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [editOpen, setEditOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [noteText, setNoteText] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileType, setUploadFileType] = useState<"proposta" | "briefing" | "contrato" | "outro">("proposta");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: lead, isLoading } = useLead(id);
  const { data: pipeline } = usePipeline(lead?.pipeline_id ?? "");
  const { data: activities } = useActivities("lead", id);
  const { data: tasks = [] } = useLeadTasks(id);
  const { data: allProposals } = useProposals();
  const { data: contact } = useContact(lead?.contact_id ?? "");
  const { data: company } = useCompany(lead?.company_id ?? "");
  const { data: documents = [] } = useDocuments({ leadId: id });

  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const moveLead = useMoveLead();
  const addActivity = useAddActivity();
  const updateTask = useUpdateTask();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();

  const leadProposals = allProposals?.filter((p) => p.lead_id === id) ?? [];

  // ─── Stage navigation ───────────────────────────────────────────────────────
  const sortedStages = pipeline?.stages ?? [];
  const currentStageIndex = sortedStages.findIndex((s) => s.id === lead?.stage_id);
  const prevStage = currentStageIndex > 0 ? sortedStages[currentStageIndex - 1] : null;
  const nextStage =
    currentStageIndex < sortedStages.length - 1
      ? sortedStages[currentStageIndex + 1]
      : null;

  const handleMoveStage = (stageId: string) => {
    if (!lead) return;
    moveLead.mutate({ id: lead.id, stage_id: stageId });
  };

  // ─── Mark as lost ───────────────────────────────────────────────────────────
  const handleMarkLost = async () => {
    if (!lead) return;
    await updateLead.mutateAsync({
      id: lead.id,
      archived: true,
      loss_reason: lossReason || null,
      closed_at: new Date().toISOString(),
    });
    setLostOpen(false);
    router.push("/leads");
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!lead) return;
    await deleteLead.mutateAsync(lead.id);
    router.push("/leads");
  };

  // ─── Add note ───────────────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!noteText.trim() || !lead || !user) return;
    await addActivity.mutateAsync({
      entity_type: "lead",
      entity_id: lead.id,
      type: "note_added",
      description: noteText.trim(),
      org_id: user.org_id,
      created_by: user.id,
    });
    setNoteText("");
  };

  // ─── Save notes field ───────────────────────────────────────────────────────
  const handleSaveNotes = async () => {
    if (!lead) return;
    await updateLead.mutateAsync({ id: lead.id, notes: notesText });
    setEditingNotes(false);
  };

  // ─── Upload document ────────────────────────────────────────────────────────
  const handleUploadDocument = async () => {
    if (!uploadFile || !uploadFileName.trim() || !lead || !user) return;
    const companyId = lead.company_id || "";
    await uploadDocument.mutateAsync({
      file: uploadFile,
      name: uploadFileName,
      type: uploadFileType as "proposta" | "briefing" | "contrato" | "outro",
      leadId: id,
      companyId: companyId || undefined,
      description: uploadDescription || undefined,
      orgId: user.org_id,
      uploadedBy: user.id,
      onProgress: setUploadProgress,
    });
    setUploadOpen(false);
    setUploadFile(null);
    setUploadFileName("");
    setUploadDescription("");
    setUploadProgress(0);
  };

  const handleDeleteDocument = async (docId: string, filePath: string) => {
    await deleteDocument.mutateAsync({ id: docId, filePath });
  };

  // ─── Toggle task status ──────────────────────────────────────────────────────
  const handleToggleTask = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "concluida" ? "pendente" : "concluida";
    updateTask.mutate({ id: taskId, status: newStatus as "pendente" | "concluida" });
  };

  // ─── Loading / Not found ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Carregando...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-text-muted">Lead não encontrado.</p>
        <Button variant="outline" asChild>
          <Link href="/leads">Voltar</Link>
        </Button>
      </div>
    );
  }

  const tempMeta = TEMPERATURES.find((t) => t.value === lead.temperature);
  const originLabel = LEAD_ORIGINS.find((o) => o.value === lead.origin)?.label;
  const buLabel = BUSINESS_UNITS.find((b) => b.value === lead.business_unit)?.label;

  const isFollowupOverdue =
    lead.next_followup && isPast(parseISO(lead.next_followup));

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4">
        {/* Back + title row */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
            <Link href="/leads">
              <ArrowLeft size={18} />
            </Link>
          </Button>

          <div className="flex-1 min-w-0">
            {/* Stage + pipeline pill */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {lead.stage && (
                <span className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: lead.stage.color ?? "#94a3b8" }}
                  />
                  {lead.stage.name}
                </span>
              )}
              {lead.pipeline && (
                <span className="text-xs text-text-muted">· {lead.pipeline.name}</span>
              )}
            </div>

            <h1 className="font-display font-bold text-2xl text-text-primary leading-tight">
              {lead.title}
            </h1>

            {/* Sub-info */}
            <div className="flex items-center gap-3 flex-wrap mt-1">
              {lead.company && (
                <Link
                  href={`/companies/${lead.company.id}`}
                  className="text-sm text-text-muted hover:text-primary transition-colors"
                >
                  <Building2 size={12} className="inline mr-1" />
                  {lead.company.name}
                </Link>
              )}
              {lead.contact && (
                <Link
                  href={`/contacts/${lead.contact.id}`}
                  className="text-sm text-text-muted hover:text-primary transition-colors"
                >
                  <User size={12} className="inline mr-1" />
                  {lead.contact.full_name}
                </Link>
              )}
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {lead.temperature && (
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    temperatureColors[lead.temperature]
                  )}
                >
                  <Thermometer size={11} className="mr-1" />
                  {tempMeta?.label}
                </span>
              )}
              {lead.stage && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-slate-700 border border-slate-200">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: lead.stage.color ?? "#94a3b8" }}
                  />
                  {lead.stage.name}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={14} className="mr-1.5" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTaskFormOpen(true)}
            >
              <Plus size={14} className="mr-1.5" />
              Criar Tarefa
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href={`/proposals?lead_id=${id}`}>
                <FileText size={14} className="mr-1.5" />
                Criar Proposta
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white border-0"
              onClick={() => setLostOpen(true)}
            >
              Marcar como Perdido
            </Button>
          </div>
        </div>

        {/* Stage navigation */}
        {sortedStages.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-card rounded-xl border border-border">
            <Button
              variant="ghost"
              size="sm"
              disabled={!prevStage}
              onClick={() => prevStage && handleMoveStage(prevStage.id)}
              className="text-text-muted hover:text-text-primary"
            >
              <ChevronLeft size={16} className="mr-1" />
              {prevStage?.name ?? "Stage anterior"}
            </Button>
            <div className="flex-1 flex items-center justify-center gap-1">
              {sortedStages.map((s) => (
                <div
                  key={s.id}
                  title={s.name}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    s.id === lead.stage_id ? "w-6" : "w-2 opacity-30"
                  )}
                  style={{ background: s.color ?? "#94a3b8" }}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={!nextStage}
              onClick={() => nextStage && handleMoveStage(nextStage.id)}
              className="text-text-muted hover:text-text-primary"
            >
              {nextStage?.name ?? "Próximo stage"}
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* ── LEFT: Tabs ── */}
        <div>
          <Tabs defaultValue="activities">
            <TabsList className="mb-4">
              <TabsTrigger value="activities">
                <MessageSquare size={14} className="mr-1.5" />
                Atividades
              </TabsTrigger>
              <TabsTrigger value="proposals">
                <FileText size={14} className="mr-1.5" />
                Propostas
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <ClipboardList size={14} className="mr-1.5" />
                Tarefas
              </TabsTrigger>
              <TabsTrigger value="documents">
                <File size={14} className="mr-1.5" />
                Documentos
              </TabsTrigger>
              <TabsTrigger value="notes">
                <Pencil size={14} className="mr-1.5" />
                Notas
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Atividades ── */}
            <TabsContent value="activities">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-text-primary mb-4">Histórico</h3>
                <Timeline items={activities ?? []} />

                {/* Quick note input */}
                <div className="mt-6 pt-4 border-t border-border space-y-2">
                  <Label className="text-xs text-text-muted uppercase tracking-wide">
                    Adicionar Nota
                  </Label>
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Escreva uma nota rápida..."
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!noteText.trim() || addActivity.isPending}
                      style={{ background: "var(--primary)" }}
                    >
                      Adicionar Nota
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Tab: Propostas ── */}
            <TabsContent value="proposals">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-text-primary">Propostas</h3>
                  <Button size="sm" asChild style={{ background: "var(--primary)" }}>
                    <Link href={`/proposals?lead_id=${id}`}>
                      <Plus size={14} className="mr-1.5" />
                      Nova Proposta
                    </Link>
                  </Button>
                </div>

                {leadProposals.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="Nenhuma proposta"
                    description="Crie a primeira proposta para este lead."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-1 text-xs text-text-muted font-medium">Número</th>
                          <th className="text-right py-2 px-1 text-xs text-text-muted font-medium">Valor Total</th>
                          <th className="text-left py-2 px-1 text-xs text-text-muted font-medium">Status</th>
                          <th className="text-left py-2 px-1 text-xs text-text-muted font-medium">Validade</th>
                          <th className="text-left py-2 px-1 text-xs text-text-muted font-medium">Criado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadProposals.map((p) => {
                          const statusMeta = PROPOSAL_STATUSES.find((s) => s.value === p.status);
                          return (
                            <tr
                              key={p.id}
                              className="border-b border-border hover:bg-white/5 cursor-pointer transition-colors"
                              onClick={() => router.push(`/proposals/${p.id}`)}
                            >
                              <td className="py-3 px-1 font-medium text-primary">{p.number}</td>
                              <td className="py-3 px-1 text-right font-semibold">
                                {formatCurrency(p.total)}
                              </td>
                              <td className="py-3 px-1">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-medium",
                                    proposalStatusColors[p.status]
                                  )}
                                >
                                  {statusMeta?.label}
                                </span>
                              </td>
                              <td className="py-3 px-1 text-text-muted">
                                {p.valid_until ? formatDate(p.valid_until) : "—"}
                              </td>
                              <td className="py-3 px-1 text-text-muted">
                                {formatDate(p.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Tab: Tarefas ── */}
            <TabsContent value="tasks">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-text-primary">Tarefas</h3>
                  <Button
                    size="sm"
                    onClick={() => setTaskFormOpen(true)}
                    style={{ background: "var(--primary)" }}
                  >
                    <Plus size={14} className="mr-1.5" />
                    Nova Tarefa
                  </Button>
                </div>

                {tasks.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="Nenhuma tarefa"
                    description="Crie tarefas para acompanhar este lead."
                    action={{ label: "Nova Tarefa", onClick: () => setTaskFormOpen(true) }}
                  />
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => {
                      const isDone = task.status === "concluida";
                      const priorityColor = priorityColors[task.priority] ?? "#94A3B8";
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-white/5 transition-colors"
                        >
                          <button
                            onClick={() => handleToggleTask(task.id, task.status)}
                            className="shrink-0 text-text-muted hover:text-primary transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 size={18} className="text-success" />
                            ) : (
                              <Circle size={18} />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                isDone && "line-through text-text-muted"
                              )}
                            >
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-text-muted capitalize">{task.type}</span>
                              {task.due_date && (
                                <span className="text-xs text-text-muted">
                                  · {formatDate(task.due_date)}
                                </span>
                              )}
                            </div>
                          </div>

                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            title={TASK_PRIORITIES.find((p) => p.value === task.priority)?.label}
                            style={{ background: priorityColor }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Tab: Documentos ── */}
            <TabsContent value="documents">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-text-primary">Documentos</h3>
                  <Button size="sm" onClick={() => setUploadOpen(true)} style={{ background: "var(--primary)" }}>
                    <Upload size={14} className="mr-1.5" />
                    Enviar Documento
                  </Button>
                </div>

                {documents.length === 0 ? (
                  <EmptyState icon={File} title="Nenhum documento" description="Envie documentos, propostas ou diagnósticos para este lead." />
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <File size={16} className="text-text-muted shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{doc.name}</p>
                            <p className="text-xs text-text-muted capitalize">{doc.type} • {formatDate(doc.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <a href={getDocumentUrl(doc.file_path)} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Baixar">
                              <Download size={14} />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                            disabled={deleteDocument.isPending}
                            title="Deletar"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Dialog */}
              {uploadOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-xl">
                  <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Enviar Documento</h3>

                    <div className="space-y-4">
                      <div>
                        <Label>Nome do arquivo *</Label>
                        <input
                          type="text"
                          value={uploadFileName}
                          onChange={(e) => setUploadFileName(e.target.value)}
                          placeholder="Ex: Proposta - Q1 2026"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-white/5 text-text-primary text-sm mt-1"
                        />
                      </div>

                      <div>
                        <Label>Tipo de documento</Label>
                        <select
                          value={uploadFileType}
                          onChange={(e) => setUploadFileType(e.target.value as typeof uploadFileType)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-white/5 text-text-primary text-sm mt-1"
                        >
                          <option value="proposta">Proposta</option>
                          <option value="briefing">Briefing</option>
                          <option value="contrato">Contrato</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>

                      <div>
                        <Label>Descrição</Label>
                        <textarea
                          value={uploadDescription}
                          onChange={(e) => setUploadDescription(e.target.value)}
                          placeholder="Descrição opcional..."
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-white/5 text-text-primary text-sm mt-1"
                        />
                      </div>

                      <div>
                        <Label>Arquivo *</Label>
                        <div className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center">
                          <input
                            type="file"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="file-input"
                          />
                          <label htmlFor="file-input" className="cursor-pointer">
                            {uploadFile ? (
                              <div className="text-sm text-text-primary font-medium">{uploadFile.name}</div>
                            ) : (
                              <div className="text-sm text-text-muted">Clique ou arraste um arquivo</div>
                            )}
                          </label>
                        </div>
                      </div>

                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-4 border-t border-border">
                        <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploadDocument.isPending}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleUploadDocument}
                          disabled={!uploadFile || !uploadFileName.trim() || uploadDocument.isPending}
                          style={{ background: "var(--primary)" }}
                        >
                          {uploadDocument.isPending ? "Enviando..." : "Enviar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Tab: Notas ── */}
            <TabsContent value="notes">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-text-primary">Notas</h3>
                  {!editingNotes && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNotesText(lead.notes ?? "");
                        setEditingNotes(true);
                      }}
                    >
                      <Pencil size={13} className="mr-1.5" />
                      Editar
                    </Button>
                  )}
                </div>

                {editingNotes ? (
                  <div className="space-y-3">
                    <Textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      rows={8}
                      placeholder="Adicione notas sobre este lead..."
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingNotes(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={updateLead.isPending}
                        style={{ background: "var(--primary)" }}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : lead.notes ? (
                  <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                    {lead.notes}
                  </p>
                ) : (
                  <p className="text-sm text-text-muted italic">Nenhuma nota adicionada.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="space-y-4">
          {/* Card 1: Lead Details */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-text-primary text-sm uppercase tracking-wide">
              Detalhes
            </h3>

            {/* Business Unit */}
            {lead.business_unit && (
              <div>
                <p className="text-xs text-text-muted mb-1">Frente</p>
                <span
                  className={cn(
                    "inline-flex px-2.5 py-1 rounded-lg text-xs font-medium",
                    businessUnitColors[lead.business_unit]
                  )}
                >
                  {buLabel}
                </span>
              </div>
            )}

            {/* Value */}
            {lead.value != null && (
              <div>
                <p className="text-xs text-text-muted mb-1">Valor Estimado</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(lead.value)}</p>
              </div>
            )}

            {/* Probability */}
            {lead.probability != null && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-text-muted">Probabilidade</p>
                  <p className="text-xs font-semibold text-text-primary">{lead.probability}%</p>
                </div>
                <Progress value={lead.probability} className="h-1.5" />
              </div>
            )}

            {/* Origin */}
            {lead.origin && (
              <div>
                <p className="text-xs text-text-muted mb-1">Origem</p>
                <p className="text-sm text-text-primary">{originLabel}</p>
              </div>
            )}

            {/* Temperature */}
            {lead.temperature && (
              <div>
                <p className="text-xs text-text-muted mb-1">Temperatura</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    temperatureColors[lead.temperature]
                  )}
                >
                  <Thermometer size={11} />
                  {tempMeta?.label}
                </span>
              </div>
            )}

            {/* Created at */}
            <div>
              <p className="text-xs text-text-muted mb-1">Criado em</p>
              <p className="text-sm text-text-secondary">{formatDate(lead.created_at)}</p>
            </div>

            {/* Next Follow-up */}
            {lead.next_followup && (
              <div>
                <p className="text-xs text-text-muted mb-1">Próximo Follow-up</p>
                <p
                  className={cn(
                    "text-sm font-medium flex items-center gap-1",
                    isFollowupOverdue ? "text-red-600" : "text-text-primary"
                  )}
                >
                  {isFollowupOverdue && <AlertCircle size={13} />}
                  {formatDate(lead.next_followup)}
                </p>
              </div>
            )}

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-1">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded bg-white/5 border border-border text-xs text-text-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Contato Principal */}
          {contact && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <h3 className="font-semibold text-text-primary text-sm uppercase tracking-wide">
                Contato Principal
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {formatInitials(contact.full_name)}
                  </span>
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="text-sm font-semibold text-text-primary hover:text-primary transition-colors block truncate"
                  >
                    {contact.full_name}
                  </Link>
                  {contact.job_title && (
                    <p className="text-xs text-text-muted truncate">{contact.job_title}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 pl-1">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 text-xs text-text-muted hover:text-primary transition-colors"
                  >
                    <Mail size={12} />
                    <span className="truncate">{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-text-muted hover:text-primary transition-colors"
                  >
                    <Phone size={12} />
                    <span>{contact.phone}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Card 3: Empresa */}
          {company && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <h3 className="font-semibold text-text-primary text-sm uppercase tracking-wide">
                Empresa
              </h3>
              <Link
                href={`/companies/${company.id}`}
                className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-2 -mx-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary hover:text-primary truncate">
                    {company.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {company.segment && (
                      <span className="text-xs text-text-muted capitalize">{company.segment}</span>
                    )}
                    {company.size && (
                      <span className="text-xs text-text-muted uppercase">· {company.size}</span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Edit Lead */}
      <LeadForm open={editOpen} onClose={() => setEditOpen(false)} lead={lead} />

      {/* Task Form */}
      <TaskForm
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        leadId={id}
        onSuccess={() => setTaskFormOpen(false)}
      />

      {/* Mark as Lost */}
      <AlertDialog open={lostOpen} onOpenChange={setLostOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Perdido?</AlertDialogTitle>
            <AlertDialogDescription>
              O lead <strong>{lead.title}</strong> será arquivado. Selecione o motivo da perda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Label className="text-sm">Motivo da Perda</Label>
            <Select value={lossReason} onValueChange={setLossReason}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecionar motivo" />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkLost}
              className="bg-danger hover:bg-danger/90"
            >
              Marcar como Perdido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead{" "}
              <strong>{lead.title}</strong> será removido permanentemente.
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
