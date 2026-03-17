"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  CheckSquare,
  Square,
  Calendar,
  DollarSign,
  BarChart3,
  Clock,
  ListTodo,
  Download,
  Eye,
  Trash2,
  GripVertical,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  File,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Timeline } from "@/components/shared/timeline";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskForm } from "@/components/forms/task-form";
import { ProjectForm } from "@/components/forms/project-form";
import { formatCurrency, formatDate, formatInitials } from "@/lib/utils/format";
import { PROJECT_STATUSES, PROGRAMS } from "@/lib/utils/constants";
import { useProject, useToggleMilestone } from "@/lib/hooks/use-projects";
import { useProjectTasks, useUpdateTask } from "@/lib/hooks/use-tasks";
import { useActivities } from "@/lib/hooks/use-activities";
import { useProjectRevenues, useUpdateRevenue } from "@/lib/hooks/use-finance";
import { useDocuments, useUploadDocument, useDeleteDocument, getDocumentSignedUrl, DOCUMENT_TYPES } from "@/lib/hooks/use-documents";
import { useOrgUsers } from "@/lib/hooks/use-user";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import type { Database } from "@/types/database";

type TaskStatus = Database["public"]["Tables"]["tasks"]["Row"]["status"];
type DocumentType = Database["public"]["Tables"]["documents"]["Row"]["type"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  kickoff:      { bg: "bg-indigo-100", text: "text-indigo-700" },
  em_andamento: { bg: "bg-[#0B87C3]/10", text: "text-[#0B87C3]" },
  pausado:      { bg: "bg-amber-100", text: "text-amber-700" },
  em_revisao:   { bg: "bg-orange-100", text: "text-orange-700" },
  concluido:    { bg: "bg-emerald-100", text: "text-emerald-700" },
  cancelado:    { bg: "bg-red-100", text: "text-red-700" },
};

const PHASE_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pendente:     { bg: "bg-gray-100", text: "text-gray-600" },
  em_andamento: { bg: "bg-[#0B87C3]/10", text: "text-[#0B87C3]" },
  concluida:    { bg: "bg-emerald-100", text: "text-emerald-700" },
};

const REVENUE_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pendente:   { bg: "bg-amber-100", text: "text-amber-700" },
  pago:       { bg: "bg-emerald-100", text: "text-emerald-700" },
  atrasado:   { bg: "bg-red-100", text: "text-red-700" },
  cancelado:  { bg: "bg-gray-100", text: "text-gray-600" },
};

const PRIORITY_COLORS: Record<string, string> = {
  baixa:   "#10B981",
  media:   "#6366F1",
  alta:    "#F59E0B",
  urgente: "#EF4444",
};


type OrgUser = { id: string; full_name: string; avatar_url: string | null; org_id: string; email: string; role: "admin" | "member"; created_at: string };

function UserAvatar({ userId, users, size = "sm" }: { userId: string | null; users: OrgUser[]; size?: "sm" | "md" }) {
  if (!userId) return <span className="text-xs text-[#94A3B8]">—</span>;
  const user = users.find((u) => u.id === userId);
  if (!user) return <span className="text-xs text-[#94A3B8]">—</span>;
  const dim = size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]";
  return (
    <div
      className={cn("rounded-full bg-[#0B87C3]/20 text-[#0B87C3] font-semibold flex items-center justify-center flex-shrink-0", dim)}
      title={user.full_name}
    >
      {formatInitials(user.full_name)}
    </div>
  );
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return FileText;
  if (t.includes("spreadsheet") || t.includes("excel") || t.includes("csv") || t.endsWith("xlsx") || t.endsWith("xls")) return FileSpreadsheet;
  if (t.includes("presentation") || t.includes("powerpoint") || t.endsWith("pptx") || t.endsWith("ppt")) return Presentation;
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg") || t.includes("gif") || t.includes("webp")) return Image;
  if (t.includes("word") || t.includes("document") || t.endsWith("docx") || t.endsWith("doc")) return FileText;
  return File;
}

function getFileIconColor(fileType: string | null): string {
  if (!fileType) return "text-gray-400";
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return "text-red-500";
  if (t.includes("spreadsheet") || t.includes("excel") || t.endsWith("xlsx") || t.endsWith("xls")) return "text-green-600";
  if (t.includes("presentation") || t.endsWith("pptx") || t.endsWith("ppt")) return "text-orange-500";
  if (t.includes("image")) return "text-purple-500";
  if (t.includes("word") || t.endsWith("docx") || t.endsWith("doc")) return "text-blue-500";
  return "text-gray-400";
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskFormPhaseId, setTaskFormPhaseId] = useState<string | undefined>();
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<"all" | "pendente" | "concluida">("all");
  const [uploadFiles, setUploadFiles] = useState<{ file: File; name: string; type: DocumentType; progress: number }[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: project, isLoading } = useProject(projectId);
  const { data: tasks = [] } = useProjectTasks(projectId);
  const { data: activities = [] } = useActivities("project", projectId);
  const { data: revenues = [] } = useProjectRevenues(projectId);
  const { data: documents = [] } = useDocuments({ projectId });
  const { data: orgUsers = [] } = useOrgUsers();
  const { user } = useUser();

  const toggleMilestone = useToggleMilestone();
  const updateTask = useUpdateTask();
  const updateRevenue = useUpdateRevenue();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();

  const projectStatusLabel = PROJECT_STATUSES.find((s) => s.value === project?.status)?.label ?? project?.status ?? "";
  const programLabel = PROGRAMS.find((p) => p.value === project?.program)?.label ?? project?.program ?? "";

  // Days remaining
  const daysInfo = (() => {
    if (!project?.expected_end_date) return null;
    const diff = differenceInDays(parseISO(project.expected_end_date), new Date());
    return diff;
  })();

  // Revenues summary
  const contractValue = project?.contract_value ?? 0;
  const receivedValue = revenues.filter((r) => r.status === "pago").reduce((acc, r) => acc + r.value, 0);
  const pendingValue = revenues.filter((r) => r.status !== "pago" && r.status !== "cancelado").reduce((acc, r) => acc + r.value, 0);

  // Tasks pending
  const pendingTasksCount = tasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada").length;

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "all") return true;
    if (taskFilter === "pendente") return t.status !== "concluida" && t.status !== "cancelada";
    if (taskFilter === "concluida") return t.status === "concluida";
    return true;
  });

  // Kanban drag handler
  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const taskId = result.draggableId;
      const newPhaseId = result.destination.droppableId === "no-phase" ? null : result.destination.droppableId;
      updateTask.mutate({ id: taskId, phase_id: newPhaseId });
    },
    [updateTask]
  );

  // Dropzone
  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted.map((file) => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ""),
      type: "outro" as DocumentType,
      progress: 0,
    }));
    setUploadFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  const handleUploadAll = async () => {
    if (!user || !project) return;
    setUploading(true);
    for (let i = 0; i < uploadFiles.length; i++) {
      const f = uploadFiles[i];
      await uploadDocument.mutateAsync({
        file: f.file,
        name: f.name,
        type: f.type,
        companyId: project.company_id,
        projectId: project.id,
        orgId: project.org_id,
        uploadedBy: user.id,
        onProgress: (pct) => {
          setUploadFiles((prev) => prev.map((x, idx) => idx === i ? { ...x, progress: pct } : x));
        },
      });
    }
    setUploadFiles([]);
    setUploading(false);
  };

  const handleDownload = async (filePath: string, name: string) => {
    const url = await getDocumentSignedUrl(filePath);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  const handlePreview = async (filePath: string) => {
    const url = await getDocumentSignedUrl(filePath);
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        icon={ListTodo}
        title="Projeto não encontrado"
        description="O projeto solicitado não existe."
        action={{ label: "Voltar", onClick: () => router.push("/projects") }}
      />
    );
  }

  const statusStyles = STATUS_STYLES[project.status] ?? { bg: "bg-gray-100", text: "text-gray-600" };

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/projects")}
        className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A] transition-colors"
      >
        <ArrowLeft size={16} />
        Projetos
      </button>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-mono text-[#94A3B8]">{project.code}</span>
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                  statusStyles.bg,
                  statusStyles.text
                )}
              >
                {projectStatusLabel}
              </span>
              {project.program && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {programLabel}
                </span>
              )}
            </div>
            <h1 className="font-display font-bold text-2xl text-[#0F172A] mt-1">{project.name}</h1>
            {project.company && (
              <Link
                href={`/companies/${project.company.id}`}
                className="text-sm text-[#0B87C3] hover:underline mt-0.5 inline-block"
              >
                {project.company.name}
              </Link>
            )}

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-[#64748B]">Progresso geral</span>
                <span className="font-semibold text-[#0F172A]">{project.progress}%</span>
              </div>
              <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0B87C3] rounded-full transition-all"
                  style={{ width: `${Math.min(100, project.progress)}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 mt-4 text-sm text-[#64748B]">
              {project.start_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{formatDate(project.start_date)}</span>
                  <span>→</span>
                  {project.expected_end_date && <span>{formatDate(project.expected_end_date)}</span>}
                </div>
              )}
              {daysInfo !== null && (
                <div className={cn("flex items-center gap-1.5", daysInfo < 0 ? "text-red-500" : "text-[#64748B]")}>
                  <Clock size={14} />
                  <span>
                    {daysInfo < 0
                      ? `${Math.abs(daysInfo)} dias atrasado`
                      : `${daysInfo} dias restantes`}
                  </span>
                </div>
              )}
              {contractValue > 0 && (
                <div className="flex items-center gap-1.5">
                  <DollarSign size={14} />
                  <span>Contrato: <strong className="text-[#0F172A]">{formatCurrency(contractValue)}</strong></span>
                  <span>·</span>
                  <span>Recebido: <strong className="text-emerald-600">{formatCurrency(receivedValue)}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditFormOpen(true)}
            >
              Editar
            </Button>
            <Button
              size="sm"
              style={{ background: "var(--primary)" }}
              onClick={() => { setTaskFormPhaseId(undefined); setTaskFormOpen(true); }}
            >
              <Plus size={14} className="mr-1.5" />
              Criar Tarefa
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs font-semibold uppercase text-[#94A3B8] tracking-wider">Progresso</p>
          <p className="font-display font-bold text-3xl text-[#0F172A] mt-2">{project.progress}%</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs font-semibold uppercase text-[#94A3B8] tracking-wider">Dias Restantes</p>
          <p className={cn("font-display font-bold text-3xl mt-2", daysInfo !== null && daysInfo < 0 ? "text-red-500" : "text-[#0F172A]")}>
            {daysInfo !== null ? (daysInfo < 0 ? `+${Math.abs(daysInfo)}` : daysInfo) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs font-semibold uppercase text-[#94A3B8] tracking-wider">Tarefas Pendentes</p>
          <p className="font-display font-bold text-3xl text-[#0F172A] mt-2">{pendingTasksCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs font-semibold uppercase text-[#94A3B8] tracking-wider">Valor a Receber</p>
          <p className="font-display font-bold text-2xl text-[#0F172A] mt-2">{formatCurrency(pendingValue)}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-white border border-border rounded-xl p-1 h-auto flex flex-wrap gap-1">
          {["overview", "kanban", "tarefas", "documentos", "financeiro", "timeline"].map((tab) => {
            const labels: Record<string, string> = {
              overview: "Overview",
              kanban: "Fases & Kanban",
              tarefas: "Tarefas",
              documentos: "Documentos",
              financeiro: "Financeiro",
              timeline: "Timeline",
            };
            return (
              <TabsTrigger key={tab} value={tab} className="text-sm data-[state=active]:bg-[#0B87C3] data-[state=active]:text-white rounded-lg px-4 py-1.5">
                {labels[tab]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: description + milestones */}
            <div className="space-y-4">
              {project.description && (
                <div className="rounded-xl border border-border bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Descrição / Escopo</h3>
                  <p className="text-sm text-[#475569] whitespace-pre-wrap leading-relaxed">{project.description}</p>
                </div>
              )}

              {/* Milestones across all phases */}
              {project.phases && project.phases.length > 0 && (
                <div className="rounded-xl border border-border bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Marcos</h3>
                  <div className="space-y-2">
                    {project.phases.flatMap((phase) =>
                      phase.milestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <button
                            onClick={() => toggleMilestone.mutate({ id: m.id, completed: !m.completed, projectId: project.id })}
                            className="flex-shrink-0"
                          >
                            {m.completed ? (
                              <CheckSquare size={16} className="text-emerald-500" />
                            ) : (
                              <Square size={16} className="text-[#94A3B8]" />
                            )}
                          </button>
                          <span className={cn("text-sm flex-1", m.completed && "line-through text-[#94A3B8]")}>
                            {m.name}
                          </span>
                          {m.due_date && (
                            <span className="text-xs text-[#94A3B8]">{formatDate(m.due_date)}</span>
                          )}
                          <span className="text-[10px] text-[#94A3B8] bg-[#F8FAFC] px-1.5 py-0.5 rounded">
                            {phase.name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: phases */}
            {project.phases && project.phases.length > 0 && (
              <div className="rounded-xl border border-border bg-white p-5">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Fases</h3>
                <div className="space-y-3">
                  {project.phases.map((phase) => {
                    const ps = PHASE_STATUS_STYLES[phase.status] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                    const phaseLabel = phase.status === "pendente" ? "Pendente" : phase.status === "em_andamento" ? "Em andamento" : "Concluída";
                    return (
                      <div key={phase.id} className="flex items-center gap-4 p-3 rounded-lg bg-[#F8FAFC]">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0F172A]">{phase.name}</p>
                          <div className="flex gap-3 text-xs text-[#94A3B8] mt-0.5">
                            {phase.start_date && <span>{formatDate(phase.start_date)}</span>}
                            {phase.end_date && <span>→ {formatDate(phase.end_date)}</span>}
                          </div>
                        </div>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", ps.bg, ps.text)}>
                          {phaseLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Kanban ── */}
        <TabsContent value="kanban" className="mt-4">
          {(!project.phases || project.phases.length === 0) ? (
            <EmptyState
              icon={BarChart3}
              title="Sem fases"
              description="Adicione fases ao projeto para usar o Kanban."
              action={{ label: "Editar Projeto", onClick: () => setEditFormOpen(true) }}
            />
          ) : (
            <div className="overflow-x-auto pb-4">
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 min-w-max">
                  {project.phases.map((phase) => {
                    const phaseTasks = tasks.filter((t) => t.phase_id === phase.id);
                    const ps = PHASE_STATUS_STYLES[phase.status] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                    const phaseLabel = phase.status === "pendente" ? "Pendente" : phase.status === "em_andamento" ? "Em andamento" : "Concluída";

                    return (
                      <div key={phase.id} className="w-72 flex-shrink-0">
                        <div className="rounded-t-xl bg-white border border-border border-b-0 p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">{phase.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-[#94A3B8]">{phaseTasks.length} tarefas</span>
                              <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", ps.bg, ps.text)}>
                                {phaseLabel}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#64748B]"
                            onClick={() => { setTaskFormPhaseId(phase.id); setTaskFormOpen(true); }}
                          >
                            <Plus size={14} />
                          </Button>
                        </div>

                        <Droppable droppableId={phase.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                "min-h-[200px] rounded-b-xl border border-border p-2 space-y-2 transition-colors",
                                snapshot.isDraggingOver ? "bg-[#0B87C3]/5" : "bg-[#F8FAFC]"
                              )}
                            >
                              {phaseTasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={cn(
                                        "bg-white rounded-lg border border-border p-3 space-y-2 transition-shadow",
                                        snapshot.isDragging && "shadow-lg"
                                      )}
                                    >
                                      <div className="flex items-start gap-2">
                                        <div {...provided.dragHandleProps} className="text-[#CBD5E1] mt-0.5 flex-shrink-0">
                                          <GripVertical size={14} />
                                        </div>
                                        <p className="text-sm text-[#0F172A] flex-1 leading-snug">{task.title}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-2 h-2 rounded-full flex-shrink-0"
                                          style={{ background: PRIORITY_COLORS[task.priority] ?? "#94A3B8" }}
                                          title={task.priority}
                                        />
                                        <span className="text-[10px] text-[#94A3B8] bg-[#F8FAFC] px-1.5 py-0.5 rounded">
                                          {task.type}
                                        </span>
                                        <div className="ml-auto">
                                          <UserAvatar userId={task.assignee_id} users={orgUsers} />
                                        </div>
                                      </div>
                                      {task.due_date && (
                                        <p className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                                          <Calendar size={10} />
                                          {formatDate(task.due_date)}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              {phaseTasks.length === 0 && !snapshot.isDraggingOver && (
                                <p className="text-xs text-[#CBD5E1] text-center py-4">Sem tarefas</p>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                </div>
              </DragDropContext>
            </div>
          )}
        </TabsContent>

        {/* ── Tarefas ── */}
        <TabsContent value="tarefas" className="mt-4">
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2">
              {(["all", "pendente", "concluida"] as const).map((f) => {
                const labels = { all: "Todas", pendente: "Pendente", concluida: "Concluída" };
                return (
                  <button
                    key={f}
                    onClick={() => setTaskFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      taskFilter === f
                        ? "bg-[#0B87C3] text-white"
                        : "bg-white border border-border text-[#64748B] hover:bg-white/5"
                    )}
                  >
                    {labels[f]}
                  </button>
                );
              })}
              <div className="ml-auto">
                <Button
                  size="sm"
                  style={{ background: "var(--primary)" }}
                  onClick={() => { setTaskFormPhaseId(undefined); setTaskFormOpen(true); }}
                >
                  <Plus size={14} className="mr-1.5" />
                  Nova Tarefa
                </Button>
              </div>
            </div>

            {/* Grouped by phase */}
            {project.phases && project.phases.length > 0 ? (
              project.phases.map((phase) => {
                const phaseTasks = filteredTasks.filter((t) => t.phase_id === phase.id);
                if (phaseTasks.length === 0) return null;
                return (
                  <div key={phase.id} className="rounded-xl border border-border bg-white overflow-hidden">
                    <div className="px-4 py-3 bg-[#F8FAFC] border-b border-border">
                      <p className="text-sm font-semibold text-[#64748B]">{phase.name}</p>
                    </div>
                    <div className="divide-y divide-[#F1F5F9]">
                      {phaseTasks.map((task) => (
                        <TaskRow key={task.id} task={task} users={orgUsers} onToggle={(id, status) =>
                          updateTask.mutate({ id, status: status as TaskStatus })
                        } />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Tasks without phases
              filteredTasks.length === 0 ? (
                <EmptyState
                  icon={ListTodo}
                  title="Nenhuma tarefa"
                  description="Crie a primeira tarefa deste projeto."
                  action={{ label: "Nova Tarefa", onClick: () => setTaskFormOpen(true) }}
                />
              ) : (
                <div className="rounded-xl border border-border bg-white overflow-hidden">
                  <div className="divide-y divide-[#F1F5F9]">
                    {filteredTasks.map((task) => (
                      <TaskRow key={task.id} task={task} users={orgUsers} onToggle={(id, status) =>
                        updateTask.mutate({ id, status: status as TaskStatus })
                      } />
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Tasks without phase */}
            {project.phases && project.phases.length > 0 && (() => {
              const noPhase = filteredTasks.filter((t) => !t.phase_id);
              if (noPhase.length === 0) return null;
              return (
                <div className="rounded-xl border border-border bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8FAFC] border-b border-border">
                    <p className="text-sm font-semibold text-[#64748B]">Sem fase</p>
                  </div>
                  <div className="divide-y divide-[#F1F5F9]">
                    {noPhase.map((task) => (
                      <TaskRow key={task.id} task={task} users={orgUsers} onToggle={(id, status) =>
                        updateTask.mutate({ id, status: status as TaskStatus })
                      } />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </TabsContent>

        {/* ── Documentos ── */}
        <TabsContent value="documentos" className="mt-4">
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              {...getRootProps()}
              className={cn(
                "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-[#0B87C3] bg-[#0B87C3]/5"
                  : "border-border bg-[#F8FAFC] hover:border-[#0B87C3]/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#0B87C3]/10 flex items-center justify-center">
                  <FileText size={20} className="text-[#0B87C3]" />
                </div>
                <p className="text-sm font-medium text-[#0F172A]">
                  {isDragActive ? "Solte os arquivos aqui" : "Arraste arquivos ou clique para fazer upload"}
                </p>
                <p className="text-xs text-[#94A3B8]">PDF, Word, Excel, imagens e outros</p>
              </div>
            </div>

            {/* Staged files */}
            {uploadFiles.length > 0 && (
              <div className="rounded-xl border border-border bg-white p-4 space-y-3">
                <h3 className="text-sm font-semibold text-[#0F172A]">Arquivos para upload</h3>
                {uploadFiles.map((f, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-[#0F172A] flex-1 truncate">{f.file.name}</p>
                      <select
                        value={f.type}
                        onChange={(e) =>
                          setUploadFiles((prev) =>
                            prev.map((x, idx) => idx === i ? { ...x, type: e.target.value as DocumentType } : x)
                          )
                        }
                        className="text-xs border border-border rounded px-2 py-1 bg-white"
                      >
                        {DOCUMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-[#94A3B8] hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {f.progress > 0 && (
                      <div className="h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0B87C3] transition-all" style={{ width: `${f.progress}%` }} />
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  size="sm"
                  style={{ background: "var(--primary)" }}
                  onClick={handleUploadAll}
                  disabled={uploading}
                >
                  {uploading ? "Enviando..." : `Enviar ${uploadFiles.length} arquivo(s)`}
                </Button>
              </div>
            )}

            {/* Documents grid */}
            {documents.length === 0 && uploadFiles.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhum documento"
                description="Faça upload do primeiro documento deste projeto."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {documents.map((doc) => {
                  const DocIcon = getFileIcon(doc.file_type);
                  const iconColor = getFileIconColor(doc.file_type);
                  const isPreviewable =
                    doc.file_type?.includes("pdf") || doc.file_type?.includes("image");
                  const docTypeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type;

                  return (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-border bg-white p-4 space-y-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <DocIcon size={28} className={iconColor} />
                        <span className="text-[10px] font-medium bg-[#F1F5F9] text-[#64748B] px-1.5 py-0.5 rounded">
                          v{doc.version}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#0F172A] line-clamp-2">{doc.name}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#64748B] mt-1">
                          {docTypeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8]">
                        {formatDate(doc.created_at)}
                        {doc.uploader && ` · ${doc.uploader.full_name}`}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-[#F1F5F9]">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDownload(doc.file_path, doc.name)}
                          title="Download"
                        >
                          <Download size={13} />
                        </Button>
                        {isPreviewable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handlePreview(doc.file_path)}
                            title="Preview"
                          >
                            <Eye size={13} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600 ml-auto"
                          onClick={() => deleteDocument.mutate({ id: doc.id, filePath: doc.file_path })}
                          title="Remover"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Financeiro ── */}
        <TabsContent value="financeiro" className="mt-4">
          <div className="space-y-4">
            {/* Summary */}
            {contractValue > 0 && (
              <div className="rounded-xl border border-border bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Resumo Financeiro</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-[#94A3B8]">Valor Contrato</p>
                    <p className="text-lg font-bold text-[#0F172A]">{formatCurrency(contractValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8]">Recebido</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(receivedValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8]">Pendente</p>
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(pendingValue)}</p>
                  </div>
                </div>
                <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: contractValue > 0 ? `${Math.min(100, (receivedValue / contractValue) * 100)}%` : "0%" }}
                  />
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  {contractValue > 0 ? `${Math.round((receivedValue / contractValue) * 100)}% pago` : ""}
                </p>
              </div>
            )}

            {/* Revenue list */}
            {revenues.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="Nenhuma receita"
                description="Adicione parcelas/receitas vinculadas a este projeto."
              />
            ) : (
              <div className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="divide-y divide-[#F1F5F9]">
                  {revenues.map((rev) => {
                    const rs = REVENUE_STATUS_STYLES[rev.status] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                    const statusLabel = rev.status === "pendente" ? "Pendente" : rev.status === "pago" ? "Pago" : rev.status === "atrasado" ? "Atrasado" : "Cancelado";
                    return (
                      <div key={rev.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0F172A]">{rev.description}</p>
                          {rev.installment && (
                            <p className="text-xs text-[#94A3B8]">Parcela: {rev.installment}</p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-[#0F172A]">{formatCurrency(rev.value)}</p>
                        <p className="text-xs text-[#94A3B8] w-24 text-right">
                          {rev.due_date ? formatDate(rev.due_date) : "—"}
                        </p>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", rs.bg, rs.text)}>
                          {statusLabel}
                        </span>
                        {rev.status === "pendente" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() =>
                              updateRevenue.mutate({
                                id: rev.id,
                                status: "pago",
                                paid_at: new Date().toISOString().split("T")[0],
                              })
                            }
                          >
                            Marcar pago
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Timeline ── */}
        <TabsContent value="timeline" className="mt-4">
          <div className="rounded-xl border border-border bg-white p-6">
            <Timeline items={activities ?? []} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Task form */}
      <TaskForm
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        projectId={projectId}
        phaseId={taskFormPhaseId}
      />

      {/* Edit form */}
      <ProjectForm
        open={editFormOpen}
        onClose={() => setEditFormOpen(false)}
        project={project}
      />
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

type TaskRowProps = {
  task: {
    id: string;
    title: string;
    type: string;
    priority: string;
    status: string;
    assignee_id: string | null;
    due_date: string | null;
  };
  users: OrgUser[];
  onToggle: (id: string, newStatus: string) => void;
};

function TaskRow({ task, users, onToggle }: TaskRowProps) {
  const isDone = task.status === "concluida";
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors">
      <Checkbox
        checked={isDone}
        onCheckedChange={(checked) => onToggle(task.id, checked ? "concluida" : "pendente")}
      />
      <p className={cn("text-sm flex-1", isDone && "line-through text-[#94A3B8]")}>{task.title}</p>
      <span className="text-xs text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">{task.type}</span>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: PRIORITY_COLORS[task.priority] ?? "#94A3B8" }}
        title={task.priority}
      />
      <UserAvatar userId={task.assignee_id} users={users} />
      <span className="text-xs text-[#94A3B8] w-20 text-right">
        {task.due_date ? formatDate(task.due_date) : "—"}
      </span>
    </div>
  );
}
