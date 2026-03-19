"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
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
import { BUSINESS_UNITS, PROPOSAL_STATUSES } from "@/lib/utils/constants";
import { useCreateProposal, useUpdateProposal } from "@/lib/hooks/use-proposals";
import { useLeads } from "@/lib/hooks/use-leads";
import { useCompanies } from "@/lib/hooks/use-companies";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useUser } from "@/lib/hooks/use-user";
import { useProducts } from "@/lib/hooks/use-products";
import { formatCurrency } from "@/lib/utils/format";
import type { ProposalWithRelations, Proposal } from "@/lib/hooks/use-proposals";

const proposalSchema = z.object({
  number: z.string().min(1, "Número é obrigatório"),
  business_unit: z.string().min(1, "Unidade de negócio é obrigatória"),
  lead_id: z.string().optional(),
  company_id: z.string().optional(),
  contact_id: z.string().optional(),
  discount: z.string().optional(),
  valid_until: z.string().optional(),
  status: z.string().min(1, "Status é obrigatório"),
  conditions: z.string().optional(),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

interface LineItem {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

interface ProposalFormProps {
  open: boolean;
  onClose: () => void;
  proposal?: ProposalWithRelations;
}

export const ProposalForm = ({ open, onClose, proposal }: ProposalFormProps) => {
  const { user } = useUser();
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const { data: leads } = useLeads();
  const { data: companies } = useCompanies();
  const { data: contacts } = useContacts();
  const { data: products } = useProducts();

  const [items, setItems] = useState<LineItem[]>([
    { product_id: null, name: "", quantity: 1, unit_price: 0, discount: 0 },
  ]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: { status: "rascunho" },
  });

  const businessUnitValue = watch("business_unit");
  const statusValue = watch("status");
  const leadIdValue = watch("lead_id");
  const companyIdValue = watch("company_id");
  const contactIdValue = watch("contact_id");
  const discountValue = watch("discount");

  useEffect(() => {
    if (proposal) {
      reset({
        number: proposal.number,
        business_unit: proposal.business_unit,
        lead_id: proposal.lead_id ?? "",
        company_id: proposal.company_id ?? "",
        contact_id: proposal.contact_id ?? "",
        discount: proposal.discount?.toString() ?? "",
        valid_until: proposal.valid_until ?? "",
        status: proposal.status,
        conditions: proposal.conditions ?? "",
      });
      if (proposal.items && proposal.items.length > 0) {
        setItems(
          proposal.items.map((item) => ({
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount ?? 0,
          }))
        );
      }
    } else {
      reset({ status: "rascunho" });
      setItems([{ product_id: null, name: "", quantity: 1, unit_price: 0, discount: 0 }]);
    }
  }, [proposal, reset, open]);

  const addItem = () => {
    setItems([...items, { product_id: null, name: "", quantity: 1, unit_price: 0, discount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number | null) => {
    const newItems = [...items];
    if (field === "product_id" && value) {
      const product = products?.find((p) => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value as string,
          name: product.name,
          unit_price: product.base_price,
        };
        setItems(newItems);
        return;
      }
    }
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const subtotal = items.reduce((acc, item) => {
    const lineTotal = item.quantity * item.unit_price;
    const lineDiscount = (lineTotal * item.discount) / 100;
    return acc + lineTotal - lineDiscount;
  }, 0);

  const globalDiscount = discountValue ? parseFloat(discountValue) : 0;
  const total = subtotal - (subtotal * globalDiscount) / 100;

  const onSubmit = async (values: ProposalFormValues) => {
    const payload = {
      number: values.number,
      business_unit: values.business_unit as Proposal["business_unit"],
      lead_id: values.lead_id || null,
      company_id: values.company_id || null,
      contact_id: values.contact_id || null,
      discount: values.discount ? parseFloat(values.discount) : null,
      valid_until: values.valid_until || null,
      status: (values.status as Proposal["status"]) || "rascunho",
      conditions: values.conditions || null,
      total,
    };

    const lineItems = items
      .filter((item) => item.name.trim())
      .map((item) => ({
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || null,
        subtotal: item.quantity * item.unit_price * (1 - item.discount / 100),
      }));

    if (proposal) {
      await updateProposal.mutateAsync({ id: proposal.id, ...payload });
    } else {
      await createProposal.mutateAsync({
        proposal: { ...payload, org_id: user?.org_id ?? "" },
        items: lineItems,
      });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{proposal ? "Editar Proposta" : "Nova Proposta"}</SheetTitle>
          <SheetDescription>
            {proposal ? "Atualize os dados da proposta." : "Crie uma nova proposta comercial."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="number">Número *</Label>
              <Input id="number" {...register("number")} placeholder="PROP-001" />
              {errors.number && <p className="text-xs text-danger">{errors.number.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={statusValue ?? "__none__"} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {PROPOSAL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Lead</Label>
              <Select value={leadIdValue ?? "__none__"} onValueChange={(v) => setValue("lead_id", v === "__none__" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {leads?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Select value={companyIdValue ?? "__none__"} onValueChange={(v) => setValue("company_id", v === "__none__" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
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
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Itens da Proposta</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus size={14} className="mr-1" />
                Adicionar item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="p-3 border border-border rounded-lg space-y-2 bg-white/5">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value={item.product_id ?? "__none__"}
                      onValueChange={(v) => updateItem(index, "product_id", v === "__none__" ? null : v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Do catálogo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Personalizado</SelectItem>
                        {products?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-danger hover:text-danger shrink-0"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(index, "name", e.target.value)}
                  placeholder="Descrição do item"
                  className="h-8 text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-text-muted">Qtd</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 1)}
                      className="h-8 text-sm"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted">Preço unit.</label>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted">Desc. %</label>
                    <Input
                      type="number"
                      value={item.discount}
                      onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
                <p className="text-xs text-right text-text-secondary font-medium">
                  Subtotal:{" "}
                  {formatCurrency(
                    item.quantity * item.unit_price * (1 - item.discount / 100)
                  )}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="discount">Desconto Global (%)</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min={0}
                max={100}
                {...register("discount")}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valid_until">Validade</Label>
              <Input id="valid_until" type="date" {...register("valid_until")} />
            </div>
          </div>

          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {globalDiscount > 0 && (
              <div className="flex justify-between text-sm text-danger">
                <span>Desconto ({globalDiscount}%)</span>
                <span>- {formatCurrency((subtotal * globalDiscount) / 100)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-primary mt-1 pt-1 border-t border-primary/20">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conditions">Condições</Label>
            <Textarea
              id="conditions"
              {...register("conditions")}
              rows={3}
              placeholder="Condições comerciais, prazo de pagamento, etc..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createProposal.isPending || updateProposal.isPending}
              style={{ background: "var(--primary)" }}
            >
              {proposal ? "Salvar" : "Criar Proposta"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
