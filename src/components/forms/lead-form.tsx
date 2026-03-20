"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { UserPlus } from "lucide-react";
import { TEMPERATURES, LEAD_ORIGINS } from "@/lib/utils/constants";
import { useCreateLead, useUpdateLead } from "@/lib/hooks/use-leads";
import { useCreateContact } from "@/lib/hooks/use-contacts";
import { usePipelines } from "@/lib/hooks/use-pipelines";
import { useCompanies } from "@/lib/hooks/use-companies";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useUser } from "@/lib/hooks/use-user";
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
  // Novo contato inline
  new_contact_name: z.string().optional(),
  new_contact_email: z.string().optional(),
  new_contact_phone: z.string().optional(),
  new_contact_job_title: z.string().optional(),
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
  open, onClose, lead, defaultPipelineId, defaultStageId,
}: LeadFormProps) => {
  const { user } = useUser();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const createContact = useCreateContact();
  const { data: pipelines } = usePipelines();
  const { data: companies } = useCompanies();
  const { data: contacts } = useContacts();

  const [createNewContact, setCreateNewContact] = useState(false);

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({ resolver: zodResolver(leadSchema) });

  const pipelineId = watch("pipeline_id");
  const stageId = watch("stage_id");
  const temperatureValue = watch("temperature");
  const originValue = watch("origin");
  const companyIdValue = watch("company_id");
  const contactIdValue = watch("contact_id");

  const selectedPipeline = pipelines?.find((p) => p.id === pipelineId);

  useEffect(() => {
    if (open) setCreateNewContact(false);
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
        title: "", company_id: "", contact_id: "", value: "",
        temperature: "", origin: "", expected_close_date: "", notes: "", tags: "",
        new_contact_name: "", new_contact_email: "", new_contact_phone: "", new_contact_job_title: "",
      });
    }
  }, [lead, defaultPipelineId, defaultStageId, reset, open]);

  const onSubmit = async (values: LeadFormValues) => {
    const tags = values.tags
      ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    let contactId = values.contact_id || null;

    // Auto-criar contato se o toggle estiver ativo e nome preenchido
    if (createNewContact && values.new_contact_name?.trim()) {
      const newContact = await createContact.mutateAsync({
        org_id: user?.org_id ?? "",
        full_name: values.new_contact_name.trim(),
        email: values.new_contact_email?.trim() || null,
        phone: values.new_contact_phone?.trim() || null,
        job_title: values.new_contact_job_title?.trim() || null,
        company_id: values.company_id || null,
        origin: values.origin || null,
        tags: [],
      });
      contactId = (newContact as { id: string })?.id ?? null;
    }

    const payload = {
      title: values.title,
      pipeline_id: values.pipeline_id,
      stage_id: values.stage_id,
      company_id: values.company_id || null,
      contact_id: contactId,
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
      await createLead.mutateAsync({ ...payload, org_id: user?.org_id ?? "" });
    }
    onClose();
  };

  const isPending = isSubmitting || createLead.isPending || updateLead.isPending || createContact.isPending;

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
          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" {...register("title")} placeholder="Nome da oportunidade" />
            {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
          </div>

          {/* Pipeline + Estágio */}
          <div className="space-y-1.5">
            <Label>Pipeline *</Label>
            <Select value={pipelineId ?? ""} onValueChange={(v) => { setValue("pipeline_id", v); setValue("stage_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar pipeline" /></SelectTrigger>
              <SelectContent>
                {pipelines?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.pipeline_id && <p className="text-xs text-danger">{errors.pipeline_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Estágio *</Label>
            <Select value={stageId ?? ""} onValueChange={(v) => setValue("stage_id", v)} disabled={!pipelineId}>
              <SelectTrigger><SelectValue placeholder="Selecionar estágio" /></SelectTrigger>
              <SelectContent>
                {selectedPipeline?.stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.stage_id && <p className="text-xs text-danger">{errors.stage_id.message}</p>}
          </div>

          {/* Empresa */}
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={companyIdValue ?? "__none__"} onValueChange={(v) => setValue("company_id", v === "__none__" ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {companies?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Contato existente OU novo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Contato</Label>
              {!lead && (
                <button
                  type="button"
                  onClick={() => setCreateNewContact((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors ${
                    createNewContact
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-text-muted hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  <UserPlus size={12} />
                  {createNewContact ? "Usar contato existente" : "Criar novo contato"}
                </button>
              )}
            </div>

            {!createNewContact ? (
              <Select value={contactIdValue ?? "__none__"} onValueChange={(v) => setValue("contact_id", v === "__none__" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar contato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {contacts?.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <UserPlus size={12} />
                  Novo contato — será criado junto com o lead
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Nome *</Label>
                    <Input {...register("new_contact_name")} placeholder="Nome completo" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">E-mail</Label>
                    <Input {...register("new_contact_email")} placeholder="email@empresa.com" className="h-8 text-sm" type="email" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone</Label>
                    <Input {...register("new_contact_phone")} placeholder="(11) 99999-9999" className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Cargo</Label>
                    <Input {...register("new_contact_job_title")} placeholder="ex: CEO, Diretor Comercial" className="h-8 text-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Temperatura + Origem */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Temperatura</Label>
              <Select value={temperatureValue ?? "__none__"} onValueChange={(v) => setValue("temperature", v === "__none__" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecionar</SelectItem>
                  {TEMPERATURES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select value={originValue ?? "__none__"} onValueChange={(v) => setValue("origin", v === "__none__" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecionar</SelectItem>
                  {LEAD_ORIGINS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input id="value" type="number" step="0.01" {...register("value")} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expected_close_date">Prev. Fechamento</Label>
              <Input id="expected_close_date" type="date" {...register("expected_close_date")} />
            </div>
          </div>

          {/* Tags + Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" {...register("tags")} placeholder="ia, saas, enterprise (separadas por vírgula)" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" {...register("notes")} rows={3} placeholder="Notas internas..." />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending} style={{ background: "var(--primary)" }}>
              {lead ? "Salvar" : createNewContact ? "Criar Lead + Contato" : "Criar Lead"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
