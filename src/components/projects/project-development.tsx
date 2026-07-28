"use client";

import { useState } from "react";
import {
  Pencil,
  GitBranch,
  FileCode2,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Percent,
} from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils/format";
import { useUpdateProject, type ProjectWithRelations } from "@/lib/hooks/use-projects";

interface Props {
  project: ProjectWithRelations;
}

export function ProjectDevelopment({ project }: Props) {
  const update = useUpdateProject();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    repo_url: project.repo_url ?? "",
    architecture_doc_url: project.architecture_doc_url ?? "",
    dev_started_at: project.dev_started_at ?? "",
    promised_delivery_date: project.promised_delivery_date ?? "",
    completion_percent: project.completion_percent?.toString() ?? "",
    risks_blockers: project.risks_blockers ?? "",
    code_review_done: project.code_review_done ?? false,
    homologation_url: project.homologation_url ?? "",
    implementation_notes: project.implementation_notes ?? "",
  });

  const handleOpen = () => {
    setForm({
      repo_url: project.repo_url ?? "",
      architecture_doc_url: project.architecture_doc_url ?? "",
      dev_started_at: project.dev_started_at ?? "",
      promised_delivery_date: project.promised_delivery_date ?? "",
      completion_percent: project.completion_percent?.toString() ?? "",
      risks_blockers: project.risks_blockers ?? "",
      code_review_done: project.code_review_done ?? false,
      homologation_url: project.homologation_url ?? "",
      implementation_notes: project.implementation_notes ?? "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    await update.mutateAsync({
      id: project.id,
      repo_url: form.repo_url.trim() || null,
      architecture_doc_url: form.architecture_doc_url.trim() || null,
      dev_started_at: form.dev_started_at || null,
      promised_delivery_date: form.promised_delivery_date || null,
      completion_percent: form.completion_percent ? Number(form.completion_percent) : null,
      risks_blockers: form.risks_blockers.trim() || null,
      code_review_done: form.code_review_done,
      homologation_url: form.homologation_url.trim() || null,
      implementation_notes: form.implementation_notes.trim() || null,
    });
    setOpen(false);
  };

  const progress = project.completion_percent ?? 0;
  const slipDays =
    project.promised_delivery_date
      ? differenceInDays(parseISO(project.promised_delivery_date), new Date())
      : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Desenvolvimento</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Repositório, arquitetura, prazos e code review
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleOpen}>
          <Pencil size={13} className="mr-1.5" />
          Editar
        </Button>
      </div>

      {/* Progresso */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-muted">Progresso de desenvolvimento</span>
          <span className="text-sm font-bold text-text-primary">{progress}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0B87C3] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LinkField icon={GitBranch} label="Repositório" url={project.repo_url} />
        <LinkField icon={FileCode2} label="Doc. de arquitetura" url={project.architecture_doc_url} />
        <Field
          icon={Calendar}
          label="Início do desenvolvimento"
          value={project.dev_started_at ? formatDate(project.dev_started_at) : "—"}
        />
        <Field
          icon={Calendar}
          label="Prazo de entrega (contrato)"
          value={
            project.promised_delivery_date ? (
              <span>
                {formatDate(project.promised_delivery_date)}
                {slipDays !== null && slipDays > 7 && (
                  <span className="ml-2 text-[10px] text-text-muted font-medium">
                    faltam {slipDays}d
                  </span>
                )}
                {slipDays !== null && slipDays >= 0 && slipDays <= 7 && (
                  <span className="ml-2 text-[10px] text-amber-600 font-medium">
                    {slipDays === 0 ? "entrega hoje" : `faltam ${slipDays}d`}
                  </span>
                )}
                {slipDays !== null && slipDays < 0 && (
                  <span className="ml-2 text-[10px] text-red-600 font-medium flex items-center gap-0.5">
                    <AlertTriangle size={10} /> atrasado {Math.abs(slipDays)}d
                  </span>
                )}
              </span>
            ) : (
              "—"
            )
          }
        />
        <LinkField icon={ExternalLink} label="Ambiente de homologação" url={project.homologation_url} />
        <Field
          icon={project.code_review_done ? CheckCircle2 : XCircle}
          label="Code Review"
          value={
            project.code_review_done ? (
              <span className="text-emerald-600 font-medium">Feito ✓</span>
            ) : (
              <span className="text-amber-600">Pendente</span>
            )
          }
        />
      </div>

      {project.risks_blockers && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={13} className="text-red-600" />
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">
              Riscos / Bloqueios
            </p>
          </div>
          <p className="text-sm text-red-700 whitespace-pre-wrap">{project.risks_blockers}</p>
        </div>
      )}

      {project.implementation_notes && (
        <div className="p-3 rounded-lg bg-white/5 border border-border">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
            Notas de implementação
          </p>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">
            {project.implementation_notes}
          </p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Desenvolvimento</DialogTitle>
            <DialogDescription>
              Atualize os campos técnicos do projeto. Estes campos são visíveis para o
              dev responsável e o Gabriel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Link do repositório (GitHub/GitLab)</Label>
              <Input
                value={form.repo_url}
                onChange={(e) => setForm((f) => ({ ...f, repo_url: e.target.value }))}
                placeholder="https://github.com/..."
              />
            </div>

            <div>
              <Label>Documento de arquitetura</Label>
              <Input
                value={form.architecture_doc_url}
                onChange={(e) => setForm((f) => ({ ...f, architecture_doc_url: e.target.value }))}
                placeholder="URL para o doc de spec técnica"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início real do desenvolvimento</Label>
                <Input
                  type="date"
                  value={form.dev_started_at}
                  onChange={(e) => setForm((f) => ({ ...f, dev_started_at: e.target.value }))}
                />
              </div>
              <div>
                <Label>Prazo de entrega previsto</Label>
                <Input
                  type="date"
                  value={form.promised_delivery_date}
                  onChange={(e) => setForm((f) => ({ ...f, promised_delivery_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1">
                  <Percent size={12} /> Conclusão (0-100)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.completion_percent}
                  onChange={(e) => setForm((f) => ({ ...f, completion_percent: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Ambiente de homologação</Label>
                <Input
                  value={form.homologation_url}
                  onChange={(e) => setForm((f) => ({ ...f, homologation_url: e.target.value }))}
                  placeholder="https://staging..."
                />
              </div>
            </div>

            <div>
              <Label>Riscos / Bloqueios</Label>
              <Textarea
                rows={2}
                value={form.risks_blockers}
                onChange={(e) => setForm((f) => ({ ...f, risks_blockers: e.target.value }))}
                placeholder="Alertas técnicos, dependências, decisões pendentes..."
              />
            </div>

            <div>
              <Label>Notas de implementação</Label>
              <Textarea
                rows={3}
                value={form.implementation_notes}
                onChange={(e) => setForm((f) => ({ ...f, implementation_notes: e.target.value }))}
                placeholder="Anotações da sessão de implementação com o cliente..."
              />
            </div>

            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.code_review_done}
                onChange={(e) => setForm((f) => ({ ...f, code_review_done: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-sm text-text-primary">Code review feito pelo Gabriel</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} style={{ background: "var(--primary)" }} disabled={update.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-text-muted mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function LinkField({
  icon: Icon,
  label,
  url,
}: {
  icon: React.ElementType;
  label: string;
  url: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-text-muted mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline truncate block"
          >
            {url}
          </a>
        ) : (
          <p className="text-sm text-text-muted">—</p>
        )}
      </div>
    </div>
  );
}
