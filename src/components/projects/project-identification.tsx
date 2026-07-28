"use client";

import { useState } from "react";
import { Pencil, Phone, User as UserIcon, Building2, Hash, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateProject, type ProjectWithRelations } from "@/lib/hooks/use-projects";
import { useOrgUsers } from "@/lib/hooks/use-user";

interface Props {
  project: ProjectWithRelations;
}

export function ProjectIdentification({ project }: Props) {
  const update = useUpdateProject();
  const { data: orgUsers = [] } = useOrgUsers();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    niche: project.niche ?? "",
    primary_contact_name: project.primary_contact_name ?? "",
    primary_contact_whatsapp: project.primary_contact_whatsapp ?? "",
    closed_by_user_id: project.closed_by_user_id ?? "",
    closed_by_external_label: project.closed_by_external_label ?? "",
    developer_user_id: project.developer_user_id ?? "",
  });

  const handleOpen = () => {
    setForm({
      niche: project.niche ?? "",
      primary_contact_name: project.primary_contact_name ?? "",
      primary_contact_whatsapp: project.primary_contact_whatsapp ?? "",
      closed_by_user_id: project.closed_by_user_id ?? "",
      closed_by_external_label: project.closed_by_external_label ?? "",
      developer_user_id: project.developer_user_id ?? "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    await update.mutateAsync({
      id: project.id,
      niche: form.niche.trim() || null,
      primary_contact_name: form.primary_contact_name.trim() || null,
      primary_contact_whatsapp: form.primary_contact_whatsapp.trim() || null,
      closed_by_user_id: form.closed_by_user_id || null,
      closed_by_external_label: form.closed_by_external_label.trim() || null,
      developer_user_id: form.developer_user_id || null,
    });
    setOpen(false);
  };

  const closedByLabel = project.closed_by_user_id
    ? orgUsers.find((u) => u.id === project.closed_by_user_id)?.full_name
    : project.closed_by_external_label;

  const developerLabel = project.developer_user_id
    ? orgUsers.find((u) => u.id === project.developer_user_id)?.full_name
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Identificação e Contexto</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Quem é o cliente, quem fechou e quem desenvolve
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleOpen}>
          <Pencil size={13} className="mr-1.5" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field icon={Hash} label="ID do Projeto" value={project.code || "—"} mono />
        <Field icon={Building2} label="Empresa" value={project.company?.name ?? "—"} />
        <Field icon={Tag} label="Nicho / Setor" value={project.niche ?? "—"} />
        <Field
          icon={UserIcon}
          label="Contato Principal"
          value={project.primary_contact_name ?? "—"}
        />
        <Field
          icon={Phone}
          label="WhatsApp"
          value={project.primary_contact_whatsapp ?? "—"}
        />
        <Field icon={UserIcon} label="Fechado por" value={closedByLabel ?? "—"} />
        <Field icon={UserIcon} label="Desenvolvedor responsável" value={developerLabel ?? "—"} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Identificação</DialogTitle>
            <DialogDescription>Atualize os dados de identificação do projeto.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Nicho / Setor</Label>
              <Input
                value={form.niche}
                onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
                placeholder="Ex: Administração de Condomínios"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contato Principal</Label>
                <Input
                  value={form.primary_contact_name}
                  onChange={(e) => setForm((f) => ({ ...f, primary_contact_name: e.target.value }))}
                  placeholder="Nome"
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={form.primary_contact_whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, primary_contact_whatsapp: e.target.value }))}
                  placeholder="(34) 9xxxx-xxxx"
                />
              </div>
            </div>

            <div>
              <Label>Fechado por (membro da equipe)</Label>
              <Select
                value={form.closed_by_user_id || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, closed_by_user_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Externo / Indicação</SelectItem>
                  {orgUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!form.closed_by_user_id && (
              <div>
                <Label>Fonte externa (se indicação)</Label>
                <Input
                  value={form.closed_by_external_label}
                  onChange={(e) => setForm((f) => ({ ...f, closed_by_external_label: e.target.value }))}
                  placeholder="Ex: Indicação João Silva"
                />
              </div>
            )}

            <div>
              <Label>Desenvolvedor responsável</Label>
              <Select
                value={form.developer_user_id || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, developer_user_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem dev alocado</SelectItem>
                  {orgUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-text-muted mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-medium text-text-primary ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
