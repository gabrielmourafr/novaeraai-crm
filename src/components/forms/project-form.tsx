"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_UNIT_PREFIX, PROJECT_STATUSES } from "@/lib/utils/constants";
import { useCreateProject, useUpdateProject, useProjects } from "@/lib/hooks/use-projects";
import { useCompanies } from "@/lib/hooks/use-companies";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useUser, useOrgUsers } from "@/lib/hooks/use-user";
import type { Project } from "@/lib/hooks/use-projects";

const projectSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  company_id: z.string().min(1, "Empresa é obrigatória"),
  contact_id: z.string().optional(),
  business_unit: z.string().min(1, "Unidade de negócio é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
  start_date: z.string().optional(),
  expected_end_date: z.string().optional(),
  contract_value: z.string().optional(),
  billing_amount: z.string().optional(),
  receivable_value: z.string().optional(),
  receivable_due_date: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  // V2
  niche: z.string().optional(),
  primary_contact_name: z.string().optional(),
  primary_contact_whatsapp: z.string().optional(),
  closed_by_user_id: z.string().optional(),
  closed_by_external_label: z.string().optional(),
  developer_user_id: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  project?: Project;
}

export const ProjectForm = ({ open, onClose, project }: ProjectFormProps) => {
  const { user } = useUser();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { data: companies } = useCompanies();
  const { data: contacts } = useContacts();
  const { data: orgUsers = [] } = useOrgUsers();
  const { data: allProjects = [] } = useProjects();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
  });

  const businessUnitValue = watch("business_unit");
  const statusValue = watch("status");
  const companyIdValue = watch("company_id");
  const contactIdValue = watch("contact_id");

  useEffect(() => {
    if (project) {
      reset({
        code: project.code,
        name: project.name,
        company_id: project.company_id,
        contact_id: project.contact_id ?? "",
        business_unit: project.business_unit,
        status: project.status,
        start_date: project.start_date ?? "",
        expected_end_date: project.expected_end_date ?? "",
        contract_value: project.contract_value?.toString() ?? "",
        billing_amount: project.billing_amount?.toString() ?? "",
        receivable_value: project.receivable_value?.toString() ?? "",
        receivable_due_date: project.receivable_due_date ?? "",
        description: project.description ?? "",
        tags: project.tags?.join(", ") ?? "",
        niche: project.niche ?? "",
        primary_contact_name: project.primary_contact_name ?? "",
        primary_contact_whatsapp: project.primary_contact_whatsapp ?? "",
        closed_by_user_id: project.closed_by_user_id ?? "",
        closed_by_external_label: project.closed_by_external_label ?? "",
        developer_user_id: project.developer_user_id ?? "",
      });
    } else {
      // V2: default status é "contrato_assinado" (início do pipeline)
      reset({ status: "contrato_assinado", business_unit: "intelligence" });
    }
  }, [project, reset, open]);

  // Auto-gera o código no padrão FRENTE-ANO-NNN ao mudar a frente (apenas em criação)
  useEffect(() => {
    if (project) return;
    const bu = businessUnitValue;
    if (!bu) return;
    const prefix = BUSINESS_UNIT_PREFIX[bu] ?? "PRJ";
    const year = new Date().getFullYear();
    // Conta projetos existentes dessa frente neste ano
    const existing = allProjects.filter((p) => {
      const m = p.code?.match(/^([A-Z]+)-(\d{4})-(\d{3,})$/);
      return m && m[1] === prefix && Number(m[2]) === year;
    });
    const seq = String(existing.length + 1).padStart(3, "0");
    const code = `${prefix}-${year}-${seq}`;
    setValue("code", code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessUnitValue, project, allProjects.length]);

  const onSubmit = async (values: ProjectFormValues) => {
    const tags = values.tags
      ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const payload = {
      code: values.code,
      name: values.name,
      company_id: values.company_id,
      contact_id: values.contact_id || null,
      business_unit: values.business_unit as Project["business_unit"],
      status: values.status as Project["status"],
      start_date: values.start_date || null,
      expected_end_date: values.expected_end_date || null,
      contract_value: values.contract_value ? parseFloat(values.contract_value) : null,
      billing_amount: values.billing_amount ? parseFloat(values.billing_amount) : null,
      receivable_value: values.receivable_value ? parseFloat(values.receivable_value) : null,
      receivable_due_date: values.receivable_due_date || null,
      description: values.description || null,
      tags,
      progress: project?.progress ?? 0,
      niche: values.niche || null,
      primary_contact_name: values.primary_contact_name || null,
      primary_contact_whatsapp: values.primary_contact_whatsapp || null,
      closed_by_user_id: values.closed_by_user_id || null,
      closed_by_external_label: values.closed_by_external_label || null,
      developer_user_id: values.developer_user_id || null,
    };

    if (project) {
      await updateProject.mutateAsync({ id: project.id, ...payload });
    } else {
      await createProject.mutateAsync({ ...payload, org_id: user?.org_id ?? "" });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{project ? "Editar Projeto" : "Novo Projeto"}</SheetTitle>
          <SheetDescription>
            {project ? "Atualize os dados do projeto." : "Crie um novo projeto."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código *</Label>
              <Input id="code" {...register("code")} placeholder="PROJ-001" />
              {errors.code && <p className="text-xs text-danger">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={statusValue ?? "__none__"} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...register("name")} placeholder="Nome do projeto" />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Empresa *</Label>
            <Select value={companyIdValue ?? "__none__"} onValueChange={(v) => setValue("company_id", v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.company_id && <p className="text-xs text-danger">{errors.company_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Contato</Label>
            <Select value={contactIdValue ?? "__none__"} onValueChange={(v) => setValue("contact_id", v === "__none__" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {contacts?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Data de Início</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expected_end_date">Previsão de Término</Label>
              <Input id="expected_end_date" type="date" {...register("expected_end_date")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contract_value">Valor de Implementação (R$)</Label>
              <Input
                id="contract_value"
                type="number"
                step="0.01"
                {...register("contract_value")}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billing_amount">Mensalidade (R$/mês)</Label>
              <Input
                id="billing_amount"
                type="number"
                step="0.01"
                {...register("billing_amount")}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="receivable_value">Valor a Receber (R$)</Label>
              <Input
                id="receivable_value"
                type="number"
                step="0.01"
                {...register("receivable_value")}
                placeholder="0,00"
              />
              <p className="text-xs text-text-muted">
                Diminui automaticamente conforme você registra receitas pagas deste projeto
                em Financeiro &gt; Receitas — não precisa editar aqui toda vez.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receivable_due_date">Previsão de Recebimento</Label>
              <Input id="receivable_due_date" type="date" {...register("receivable_due_date")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="niche">Nicho / Setor</Label>
            <Input
              id="niche"
              {...register("niche")}
              placeholder="Ex: Administração de Condomínios"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="primary_contact_name">Contato Principal</Label>
              <Input id="primary_contact_name" {...register("primary_contact_name")} placeholder="Nome" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primary_contact_whatsapp">WhatsApp do Contato</Label>
              <Input id="primary_contact_whatsapp" {...register("primary_contact_whatsapp")} placeholder="(34) 9xxxx-xxxx" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fechado por</Label>
              <Select
                value={watch("closed_by_user_id") || "__none__"}
                onValueChange={(v) => setValue("closed_by_user_id", v === "__none__" ? "" : v)}
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
            <div className="space-y-1.5">
              <Label>Desenvolvedor responsável</Label>
              <Select
                value={watch("developer_user_id") || "__none__"}
                onValueChange={(v) => setValue("developer_user_id", v === "__none__" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Sem dev alocado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem dev alocado</SelectItem>
                  {orgUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              {...register("tags")}
              placeholder="ia, automação (separadas por vírgula)"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" {...register("description")} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createProject.isPending || updateProject.isPending}
              style={{ background: "var(--primary)" }}
            >
              {project ? "Salvar" : "Criar Projeto"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
