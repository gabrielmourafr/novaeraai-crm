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
import { COMPANY_SEGMENTS, COMPANY_SIZES } from "@/lib/utils/constants";
import { useCreateCompany, useUpdateCompany } from "@/lib/hooks/use-companies";
import type { Database } from "@/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];

const companySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  trade_name: z.string().optional(),
  cnpj: z.string().optional(),
  segment: z.string().optional(),
  size: z.string().optional(),
  website: z.string().optional(),
  estimated_revenue: z.string().optional(),
  digital_maturity: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanyFormProps {
  open: boolean;
  onClose: () => void;
  company?: Company;
}

export const CompanyForm = ({ open, onClose, company }: CompanyFormProps) => {
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
  });

  useEffect(() => {
    if (company) {
      reset({
        name: company.name,
        trade_name: company.trade_name ?? "",
        cnpj: company.cnpj ?? "",
        segment: company.segment ?? "",
        size: company.size ?? "",
        website: company.website ?? "",
        estimated_revenue: company.estimated_revenue?.toString() ?? "",
        digital_maturity: company.digital_maturity ?? "",
        notes: company.notes ?? "",
        tags: company.tags?.join(", ") ?? "",
      });
    } else {
      reset({});
    }
  }, [company, reset, open]);

  const onSubmit = async (values: CompanyFormValues) => {
    const tags = values.tags
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const payload = {
      name: values.name,
      trade_name: values.trade_name || null,
      cnpj: values.cnpj || null,
      segment: values.segment || null,
      size: (values.size as Company["size"]) || null,
      website: values.website || null,
      estimated_revenue: values.estimated_revenue ? parseFloat(values.estimated_revenue) : null,
      digital_maturity: (values.digital_maturity as Company["digital_maturity"]) || null,
      notes: values.notes || null,
      tags,
    };

    if (company) {
      await updateCompany.mutateAsync({ id: company.id, ...payload });
    } else {
      await createCompany.mutateAsync({ ...payload, org_id: "" });
    }
    onClose();
  };

  const segmentValue = watch("segment");
  const sizeValue = watch("size");
  const digitalMaturityValue = watch("digital_maturity");

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{company ? "Editar Empresa" : "Nova Empresa"}</SheetTitle>
          <SheetDescription>
            {company ? "Atualize os dados da empresa." : "Preencha os dados para criar uma nova empresa."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...register("name")} placeholder="Razão social" />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trade_name">Nome Fantasia</Label>
            <Input id="trade_name" {...register("trade_name")} placeholder="Nome fantasia" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" {...register("cnpj")} placeholder="00.000.000/0000-00" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <Select value={segmentValue ?? ""} onValueChange={(v) => setValue("segment", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SEGMENTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Porte</Label>
              <Select value={sizeValue ?? ""} onValueChange={(v) => setValue("size", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register("website")} placeholder="https://empresa.com.br" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estimated_revenue">Faturamento Estimado (R$)</Label>
            <Input
              id="estimated_revenue"
              type="number"
              {...register("estimated_revenue")}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Maturidade Digital</Label>
            <Select
              value={digitalMaturityValue ?? ""}
              onValueChange={(v) => setValue("digital_maturity", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basica">Básica</SelectItem>
                <SelectItem value="intermediaria">Intermediária</SelectItem>
                <SelectItem value="avancada">Avançada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              {...register("tags")}
              placeholder="ia, automação, saude (separadas por vírgula)"
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
              disabled={isSubmitting || createCompany.isPending || updateCompany.isPending}
              style={{ background: "var(--primary)" }}
            >
              {company ? "Salvar" : "Criar Empresa"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
