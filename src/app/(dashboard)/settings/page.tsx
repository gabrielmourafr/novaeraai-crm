"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Settings,
  GitBranch,
  Users,
  BookTemplate,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Check,
  X,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { PageHeader } from "@/components/shared/page-header";
import { formatDate, formatInitials } from "@/lib/utils/format";
import { PROJECT_TEMPLATES, PROGRAMS, BUSINESS_UNITS } from "@/lib/utils/constants";
import {
  usePipelines,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  type PipelineStage,
} from "@/lib/hooks/use-pipelines";
import {
  useUser,
  useOrg,
  useOrgUsers,
  useUpdateUserRole,
  useUpdateOrg,
} from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const businessUnitColors: Record<string, string> = {
  labs: "bg-violet-100 text-violet-700",
  advisory: "bg-sky-100 text-sky-700",
  enterprise: "bg-emerald-100 text-emerald-700",
};

// ─── Tab: Organização ─────────────────────────────────────────────────────────

const OrgTab = () => {
  const { data: org, isLoading } = useOrg();
  const updateOrg = useUpdateOrg();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const handleSave = async () => {
    if (!org || !nameValue.trim()) return;
    await updateOrg.mutateAsync({ id: org.id, name: nameValue.trim() });
    setEditing(false);
  };

  if (isLoading) {
    return <div className="text-sm text-text-muted py-8 text-center">Carregando...</div>;
  }

  if (!org) {
    return <div className="text-sm text-text-muted py-8 text-center">Organização não encontrada.</div>;
  }

  return (
    <div className="rounded-xl p-6 max-w-xl space-y-5" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
      <h2 className="font-semibold text-text-primary">Dados da Organização</h2>

      <div className="space-y-1">
        <Label className="text-xs text-text-muted uppercase tracking-wide">Nome</Label>
        {editing ? (
          <div className="flex gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="max-w-sm"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateOrg.isPending}
              style={{ background: "var(--primary)" }}
            >
              <Check size={14} />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              <X size={14} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-text-primary font-medium">{org.name}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNameValue(org.name);
                setEditing(true);
              }}
            >
              <Pencil size={13} className="mr-1" />
              Editar
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-text-muted uppercase tracking-wide">Slug</Label>
        <p className="text-sm text-text-muted font-mono px-3 py-1.5 rounded-lg border border-border inline-block" style={{ background: "rgba(11,135,195,0.05)" }}>
          {org.slug}
        </p>
        <p className="text-xs text-text-muted">O slug não pode ser alterado.</p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-text-muted uppercase tracking-wide">Criado em</Label>
        <p className="text-sm text-text-secondary">{formatDate(org.created_at)}</p>
      </div>
    </div>
  );
};

// ─── Stage Row ────────────────────────────────────────────────────────────────

interface StageRowProps {
  stage: PipelineStage;
  isFirst: boolean;
  isLast: boolean;
  pipelineId: string;
  totalStages: number;
  onMoveUp: (stage: PipelineStage) => void;
  onMoveDown: (stage: PipelineStage) => void;
}

const StageRow = ({
  stage,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: StageRowProps) => {
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(stage.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    await updateStage.mutateAsync({ id: stage.id, name: nameValue.trim() });
    setEditing(false);
  };

  return (
    <>
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 group transition-colors">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: stage.color ?? "#94a3b8" }}
        />
        <span className="text-xs text-text-muted w-5 shrink-0">{stage.position}</span>

        {editing ? (
          <div className="flex-1 flex gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="h-7 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <Button size="sm" className="h-7 px-2" onClick={handleSaveName} disabled={updateStage.isPending} style={{ background: "var(--primary)" }}>
              <Check size={13} />
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditing(false)}>
              <X size={13} />
            </Button>
          </div>
        ) : (
          <span className="flex-1 text-sm text-text-primary">{stage.name}</span>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onMoveUp(stage)}
            disabled={isFirst}
            className="p-1 rounded hover:bg-white/5 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Mover para cima"
          >
            <ChevronUp size={14} className="text-text-muted" />
          </button>
          <button
            onClick={() => onMoveDown(stage)}
            disabled={isLast}
            className="p-1 rounded hover:bg-white/5 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Mover para baixo"
          >
            <ChevronDown size={14} className="text-text-muted" />
          </button>
          <button
            onClick={() => {
              setNameValue(stage.name);
              setEditing(true);
            }}
            className="p-1 rounded hover:bg-white/5 hover:shadow-sm transition-all"
            title="Editar nome"
          >
            <Pencil size={13} className="text-text-muted" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1 rounded hover:bg-red-950/40 transition-all"
            title="Excluir estágio"
          >
            <Trash2 size={13} className="text-danger" />
          </button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estágio?</AlertDialogTitle>
            <AlertDialogDescription>
              O estágio <strong>{stage.name}</strong> será excluído. Leads neste estágio ficarão sem
              estágio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStage.mutate(stage.id)}
              className="bg-danger hover:bg-danger/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ─── Tab: Pipelines ───────────────────────────────────────────────────────────

const PipelinesTab = () => {
  const { data: pipelines, isLoading } = usePipelines();
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();

  const [addingToPipeline, setAddingToPipeline] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#6366F1");

  const handleAddStage = async (pipelineId: string, currentCount: number) => {
    if (!newStageName.trim()) return;
    await createStage.mutateAsync({
      pipeline_id: pipelineId,
      name: newStageName.trim(),
      position: currentCount + 1,
      color: newStageColor,
    });
    setNewStageName("");
    setNewStageColor("#6366F1");
    setAddingToPipeline(null);
  };

  const handleMoveUp = async (stage: PipelineStage, stages: PipelineStage[]) => {
    const idx = stages.findIndex((s) => s.id === stage.id);
    if (idx <= 0) return;
    const prevStage = stages[idx - 1];
    await Promise.all([
      updateStage.mutateAsync({ id: stage.id, position: prevStage.position }),
      updateStage.mutateAsync({ id: prevStage.id, position: stage.position }),
    ]);
  };

  const handleMoveDown = async (stage: PipelineStage, stages: PipelineStage[]) => {
    const idx = stages.findIndex((s) => s.id === stage.id);
    if (idx >= stages.length - 1) return;
    const nextStage = stages[idx + 1];
    await Promise.all([
      updateStage.mutateAsync({ id: stage.id, position: nextStage.position }),
      updateStage.mutateAsync({ id: nextStage.id, position: stage.position }),
    ]);
  };

  if (isLoading) {
    return <div className="text-sm text-text-muted py-8 text-center">Carregando pipelines...</div>;
  }

  return (
    <div className="space-y-4">
      {pipelines?.map((pipeline) => (
        <div
          key={pipeline.id}
          className="rounded-xl p-6" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-semibold text-text-primary">{pipeline.name}</h3>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                businessUnitColors[pipeline.business_unit]
              )}
            >
              {BUSINESS_UNITS.find((b) => b.value === pipeline.business_unit)?.label}
            </span>
          </div>

          <div className="space-y-0.5 mb-4">
            {pipeline.stages.length === 0 ? (
              <p className="text-sm text-text-muted py-2 text-center">Nenhum estágio.</p>
            ) : (
              pipeline.stages.map((stage, i) => (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  pipelineId={pipeline.id}
                  totalStages={pipeline.stages.length}
                  isFirst={i === 0}
                  isLast={i === pipeline.stages.length - 1}
                  onMoveUp={(s) => handleMoveUp(s, pipeline.stages)}
                  onMoveDown={(s) => handleMoveDown(s, pipeline.stages)}
                />
              ))
            )}
          </div>

          {addingToPipeline === pipeline.id ? (
            <div className="flex items-center gap-2 mt-2 p-3 rounded-lg" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}>
              <input
                type="color"
                value={newStageColor}
                onChange={(e) => setNewStageColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                title="Cor do estágio"
              />
              <Input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Nome do estágio..."
                className="h-8 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddStage(pipeline.id, pipeline.stages.length);
                  if (e.key === "Escape") setAddingToPipeline(null);
                }}
              />
              <Button
                size="sm"
                className="h-8 px-3"
                onClick={() => handleAddStage(pipeline.id, pipeline.stages.length)}
                disabled={createStage.isPending}
                style={{ background: "var(--primary)" }}
              >
                <Check size={14} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3"
                onClick={() => {
                  setAddingToPipeline(null);
                  setNewStageName("");
                }}
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingToPipeline(pipeline.id)}
              className="w-full border-dashed text-text-muted hover:text-text-primary"
            >
              <Plus size={14} className="mr-1.5" />
              Adicionar Estágio
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Tab: Time ────────────────────────────────────────────────────────────────

const TeamTab = () => {
  const { data: members, isLoading } = useOrgUsers();
  const updateRole = useUpdateUserRole();
  const { user: currentUser } = useUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    toast.success(`Convite enviado para ${inviteEmail}`);
    setInviteEmail("");
    setInviteRole("member");
    setInviteOpen(false);
  };

  if (isLoading) {
    return <div className="text-sm text-text-muted py-8 text-center">Carregando...</div>;
  }

  return (
    <>
      <div className="rounded-xl p-6" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-text-primary">Membros do Time</h2>
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            style={{ background: "var(--primary)" }}
          >
            <Mail size={14} className="mr-1.5" />
            Convidar Usuário
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs text-text-muted font-medium">Usuário</th>
                <th className="text-left py-2 px-2 text-xs text-text-muted font-medium">Email</th>
                <th className="text-left py-2 px-2 text-xs text-text-muted font-medium">Papel</th>
                <th className="text-left py-2 px-2 text-xs text-text-muted font-medium">Entrou em</th>
              </tr>
            </thead>
            <tbody>
              {members?.map((member) => (
                <tr key={member.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {formatInitials(member.full_name)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{member.full_name}</p>
                        {member.id === currentUser?.id && (
                          <span className="text-xs text-text-muted">(você)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-text-muted">{member.email}</td>
                  <td className="py-3 px-2">
                    <Select
                      value={member.role}
                      onValueChange={(v) =>
                        updateRole.mutate({ id: member.id, role: v as "admin" | "member" })
                      }
                      disabled={member.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Membro</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-2 text-text-muted text-xs">
                    {formatDate(member.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Sheet */}
      <Sheet open={inviteOpen} onOpenChange={(v) => !v && setInviteOpen(false)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Convidar Usuário</SheetTitle>
            <SheetDescription>
              Envie um convite de acesso para um novo membro do time.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nome@empresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim()}
                style={{ background: "var(--primary)" }}
              >
                Enviar Convite
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

// ─── Tab: Templates ───────────────────────────────────────────────────────────

const TemplatesTab = () => {
  const templateKeys = Object.keys(PROJECT_TEMPLATES);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templateKeys.map((key) => {
        const phases = PROJECT_TEMPLATES[key];
        const programMeta = PROGRAMS.find((p) => p.value === key);
        return (
          <div
            key={key}
            className="rounded-xl p-6" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
          >
            <div className="mb-4">
              <h3 className="font-semibold text-text-primary">
                {programMeta?.label ?? key}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {phases.length} {phases.length === 1 ? "fase" : "fases"}
              </p>
            </div>

            <ol className="space-y-2">
              {phases.map((phase, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm text-text-secondary">{phase}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie a organização, pipelines, time e templates"
      />

      <Tabs defaultValue="org">
        <TabsList className="mb-6">
          <TabsTrigger value="org">
            <Settings size={14} className="mr-1.5" />
            Organização
          </TabsTrigger>
          <TabsTrigger value="pipelines">
            <GitBranch size={14} className="mr-1.5" />
            Pipelines
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users size={14} className="mr-1.5" />
            Time
          </TabsTrigger>
          <TabsTrigger value="templates">
            <BookTemplate size={14} className="mr-1.5" />
            Templates de Projeto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <OrgTab />
        </TabsContent>

        <TabsContent value="pipelines">
          <PipelinesTab />
        </TabsContent>

        <TabsContent value="team">
          <TeamTab />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
