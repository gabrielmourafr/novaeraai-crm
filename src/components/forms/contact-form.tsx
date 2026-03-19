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
import { DECISION_ROLES, LEAD_ORIGINS } from "@/lib/utils/constants";
import { useCreateContact, useUpdateContact } from "@/lib/hooks/use-contacts";
import { useCompanies } from "@/lib/hooks/use-companies";
import { useUser } from "@/lib/hooks/use-user";
import type { Database } from "@/types/database";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];

const contactSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  company_id: z.string().optional(),
  decision_role: z.string().optional(),
  linkedin: z.string().optional(),
  origin: z.string().optional(),
  tags: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  contact?: Contact;
  defaultCompanyId?: string;
}

export const ContactForm = ({ open, onClose, contact, defaultCompanyId }: ContactFormProps) => {
  const { user } = useUser();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const { data: companies } = useCompanies();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  useEffect(() => {
    if (contact) {
      reset({
        full_name: contact.full_name,
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        job_title: contact.job_title ?? "",
        company_id: contact.company_id ?? "",
        decision_role: contact.decision_role ?? "",
        linkedin: contact.linkedin ?? "",
        origin: contact.origin ?? "",
        tags: contact.tags?.join(", ") ?? "",
      });
    } else {
      reset({ company_id: defaultCompanyId ?? "" });
    }
  }, [contact, defaultCompanyId, reset, open]);

  const onSubmit = async (values: ContactFormValues) => {
    const tags = values.tags
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const payload = {
      full_name: values.full_name,
      email: values.email || null,
      phone: values.phone || null,
      job_title: values.job_title || null,
      company_id: values.company_id || null,
      decision_role: (values.decision_role as Contact["decision_role"]) || null,
      linkedin: values.linkedin || null,
      origin: values.origin || null,
      tags,
    };

    if (contact) {
      await updateContact.mutateAsync({ id: contact.id, ...payload });
    } else {
      await createContact.mutateAsync({ ...payload, org_id: user?.org_id ?? "" });
    }
    onClose();
  };

  const companyIdValue = watch("company_id");
  const decisionRoleValue = watch("decision_role");
  const originValue = watch("origin");

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{contact ? "Editar Contato" : "Novo Contato"}</SheetTitle>
          <SheetDescription>
            {contact
              ? "Atualize os dados do contato."
              : "Preencha os dados para criar um novo contato."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nome *</Label>
            <Input id="full_name" {...register("full_name")} placeholder="Nome completo" />
            {errors.full_name && (
              <p className="text-xs text-danger">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register("email")} placeholder="email@empresa.com" />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...register("phone")} placeholder="+55 11 99999-9999" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="job_title">Cargo</Label>
            <Input id="job_title" {...register("job_title")} placeholder="CEO, Gerente, etc." />
          </div>

          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select
              value={companyIdValue ?? "__none__"}
              onValueChange={(v) => setValue("company_id", v === "__none__" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {companies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Papel de Decisão</Label>
            <Select
              value={decisionRoleValue ?? "__none__"}
              onValueChange={(v) => setValue("decision_role", v === "__none__" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {DECISION_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              {...register("linkedin")}
              placeholder="https://linkedin.com/in/usuario"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Origem</Label>
            <Select value={originValue ?? ""} onValueChange={(v) => setValue("origin", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_ORIGINS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              {...register("tags")}
              placeholder="decisor, parceiro (separadas por vírgula)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createContact.isPending || updateContact.isPending}
              style={{ background: "var(--primary)" }}
            >
              {contact ? "Salvar" : "Criar Contato"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
