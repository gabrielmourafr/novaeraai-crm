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
import { BUSINESS_UNITS } from "@/lib/utils/constants";
import { useCreateProduct, useUpdateProduct } from "@/lib/hooks/use-products";
import { useUser } from "@/lib/hooks/use-user";
import type { Product } from "@/lib/hooks/use-products";

const CATEGORIES = [
  { value: "saas_plan", label: "Plano SaaS" },
  { value: "workshop", label: "Workshop" },
  { value: "consultoria", label: "Consultoria" },
  { value: "projeto", label: "Projeto" },
  { value: "programa", label: "Programa" },
];

const RECURRENCES = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual", label: "Anual" },
  { value: "pontual", label: "Pontual" },
];

const STATUSES = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "desenvolvimento", label: "Em Desenvolvimento" },
];

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  business_unit: z.string().min(1, "Unidade de negócio é obrigatória"),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().optional(),
  base_price: z.string().min(1, "Preço é obrigatório"),
  recurrence: z.string().min(1, "Recorrência é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: Product;
}

export const ProductForm = ({ open, onClose, product }: ProductFormProps) => {
  const { user } = useUser();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  const businessUnitValue = watch("business_unit");
  const categoryValue = watch("category");
  const recurrenceValue = watch("recurrence");
  const statusValue = watch("status");

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        business_unit: product.business_unit,
        category: product.category,
        description: product.description ?? "",
        base_price: product.base_price.toString(),
        recurrence: product.recurrence,
        status: product.status,
      });
    } else {
      reset({ status: "ativo", recurrence: "pontual" });
    }
  }, [product, reset, open]);

  const onSubmit = async (values: ProductFormValues) => {
    const payload = {
      name: values.name,
      business_unit: values.business_unit as Product["business_unit"],
      category: values.category as Product["category"],
      description: values.description || null,
      base_price: parseFloat(values.base_price),
      recurrence: values.recurrence as Product["recurrence"],
      status: values.status as Product["status"],
    };

    if (product) {
      await updateProduct.mutateAsync({ id: product.id, ...payload });
    } else {
      await createProduct.mutateAsync({ ...payload, org_id: user?.org_id ?? "" });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{product ? "Editar Produto" : "Novo Produto"}</SheetTitle>
          <SheetDescription>
            {product ? "Atualize os dados do produto." : "Adicione um novo produto ao catálogo."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...register("name")} placeholder="Nome do produto/serviço" />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Unidade de Negócio *</Label>
              <Select value={businessUnitValue ?? ""} onValueChange={(v) => setValue("business_unit", v)}>
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

            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={categoryValue ?? ""} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-danger">{errors.category.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="base_price">Preço Base (R$) *</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                {...register("base_price")}
                placeholder="0,00"
              />
              {errors.base_price && <p className="text-xs text-danger">{errors.base_price.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Recorrência *</Label>
              <Select value={recurrenceValue ?? ""} onValueChange={(v) => setValue("recurrence", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status *</Label>
            <Select value={statusValue ?? ""} onValueChange={(v) => setValue("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register("description")}
              rows={3}
              placeholder="Descrição do produto ou serviço..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createProduct.isPending || updateProduct.isPending}
              style={{ background: "var(--primary)" }}
            >
              {product ? "Salvar" : "Criar Produto"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
