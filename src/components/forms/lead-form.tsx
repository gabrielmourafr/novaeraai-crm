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
import { TEMPERATURES, LEAD_ORIGINS } from "@/lib/utils/constants";
import { useCreateLead, useUpdateLead } from "@/lib/hooks/use-leads";
import { usePipelines } from "@/lib/hooks/use-pipelines";
import { useCompanies } from "@/lib/hooks/use-companies";
import { useContacts } from "@/lib/hooks/use-contacts";
import type { LeadWithRelations, Lead } from "@/lib/hooks/use-leads";

const leadSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  pipeline_id: z.string().min(1, "Pipeline é obrigatório"),
  stage_id: z.string().min(1, "Estágio é obrigatório"),
  company_id: z.string().optional(),
  contact_id: z.string().optional(),
  value: z.string().optional(),
  temperature: z.string().optional(),
  origin: z.string().optional(),
  expected_close_date: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface LeadFormProps {
  open: boolean;
  onClose: () => void;
  lead?: LeadWithRelations;
  defaultPipelineId?: string;
  defaultStageId?: string;
}

export const LeadForm = ({
  open,
  onClose,
  lead,
  defaultPipelineId,
  defaultStageId,
}: LeadFormProps) => {
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const { data: pipelines } = usePipelines();
  const { data: companies } = useCompanies();
  const { data: contacts } = useContacts();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
  });

  const pipelineId = watch("pipeline_id");
  const stageId = watch("stage_id");
  const temperatureValue = watch("temperature");
  const originValue = watch("origin");
  const companyIdValue = watch("company_id");
  const contactIdValue = watch("contact_id");

  const selectedPipeline = pipelines?.find((p) => p.id === pipelineId);

  useEffect(() => {
    if (lead) {
      reset({
        title: lead.title,
        pipeline_id: lead.pipeline_id,
        stage_id: lead.stage_id,
        company_id: lead.company_id ?? "",
        contact_id: lead.contact_id ?? "",
        value: lead.value?.toString() ?? "",
        temperature: lead.temperature ?? "",
        origin: lead.origin ?? "",
        expected_close_date: lead.expected_close_date ?? "",
        notes: lead.notes ?? "",
        tags: lead.tags?.join(", ") ?? "",
      });
    } else {
      reset({
        pipeline_id: defaultPipelineId ?? "",
        stage_id: defaultStageId ?? "",
        title: "",
        company_id: "",
        contact_id: "",
        value: "",
        temperature: "",
        origin: "",
        expected_close_date: "",
        notes: "",
        tags: "",
      });
    }
  }, [lead, defaultPipelineId, defaultStageId, reset, open]);

  const onSubmit = async (values: LeadFormValues) => {
    const tags = values.tags
      ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const payload = {
      title: values.title,
      pipeline_id: values.pipeline_id,
      stage_id: values.stage_id,
      company_id: values.company_id || null,
      contact_id: values.contact_id || null,
      value: values.value ? parseFloat(values.value) : null,
      temperature: (values.temperature || null) as Lead["temperature"],
      origin: values.origin || null,
      expected_close_date: values.expected_close_date || null,
      notes: values.notes || null,
      tags,
      archived: false,
    };

    if (lead) {
      await updateLead.mutateAsync({ id: lead.id, ...payload });
    } else {
      await createLead.mutateAsync({ ...payload, org_id: "" });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{lead ? "Editar Lead" : "Novo Lead"}</SheetTitle>
          <SheetDescription>
            {lead ? "Atualize os dados do lead." : "Preencha os dados para criar um novo lead."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" {...register("title")} placeholder="Nome da oportunidade" />
            {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Pipeline *</Label>
            <Select value={pipelineId ?? ""} onValueChange={(v) => {
              setValue("pipeline_id", v);
              setValue("stage_id", "");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pipeline_id && <p className="text-xs text-danger">{errors.pipeline_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Estágio *</Label>
            <Select value={stageId ?? ""} onValueChange={(v) => setValue("stage_id", v)} disabled={!pipelineId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar estágio" />
              </SelectTrigger>
              <SelectContent>
                {selectedPipeline?.stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.stage_id && <p className="text-xs text-danger">{errors.stage_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Select value={companyIdValue ?? "__none__"} onValueChange={(v) => setValue("company_id", v === "__none__" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {companies?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Contato</Label>
              <Select value={contactIdValue ?? "__none__"} onValueChange={(v) => setValue("contact_id", v === "__none__" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {contacts?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Temperatura</Label>
              <Select value={temperatureValue ?? ""} onValueChange={(v) => setValue("temperature", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPERATURES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select value={originValue ?? ""} onValueChange={(v) => setValue("origin", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_ORIGINS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                {...register("value")}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expected_close_date">Previsão de Fechamento</Label>
              <Input id="expected_close_date" type="date" {...register("expected_close_date")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              {...register("tags")}
              placeholder="ia, saas, enterprise (separadas por vírgula)"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" {...register("notes")} rows={3} placeholder="Notas internas..." />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createLead.isPending || updateLead.isPending}
              style={{ background: "var(--primary)" }}
            >
              {lead ? "Salvar" : "Criar Lead"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
