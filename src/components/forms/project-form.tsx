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
import { BUSINESS_UNITS, PROJECT_STATUSES } from "@/lib/utils/constants";
import { useCreateProject, useUpdateProject } from "@/lib/hooks/use-projects";
import { useCompanies } from "@/lib/hooks/use-companies";
import { useContacts } from "@/lib/hooks/use-contacts";
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
  description: z.string().optional(),
  tags: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  project?: Project;
}

export const ProjectForm = ({ open, onClose, project }: ProjectFormProps) => {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { data: companies } = useCompanies();
  const { data: contacts } = useContacts();

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
        description: project.description ?? "",
        tags: project.tags?.join(", ") ?? "",
      });
    } else {
      reset({ status: "kickoff" });
    }
  }, [project, reset, open]);

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
      description: values.description || null,
      tags,
      progress: project?.progress ?? 0,
    };

    if (project) {
      await updateProject.mutateAsync({ id: project.id, ...payload });
    } else {
      await createProject.mutateAsync({ ...payload, org_id: "" });
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

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-1.5">
              <Label>Unidade de Negócio *</Label>
              <Select value={businessUnitValue ?? "__none__"} onValueChange={(v) => setValue("business_unit", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.business_unit && <p className="text-xs text-danger">{errors.business_unit.message}</p>}
            </div>
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

          <div className="space-y-1.5">
            <Label htmlFor="contract_value">Valor do Contrato (R$)</Label>
            <Input
              id="contract_value"
              type="number"
              step="0.01"
              {...register("contract_value")}
              placeholder="0,00"
            />
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
