"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Save, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/format";
import { BUSINESS_UNITS } from "@/lib/utils/constants";
import {
  useCreateProposal,
  useUpdateProposal,
  useUpdateProposalItems,
  type ProposalWithRelations,
  type Proposal,
} from "@/lib/hooks/use-proposals";
import { useLeads, type LeadWithRelations } from "@/lib/hooks/use-leads";
import { useProducts } from "@/lib/hooks/use-products";
import { useUser } from "@/lib/hooks/use-user";

const proposalSchema = z.object({
  number: z.string().min(1, "Número é obrigatório"),
  business_unit: z.string().min(1, "Unidade de negócio é obrigatória"),
  lead_id: z.string().optional(),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  discount: z.string().optional(),
  valid_until: z.string().optional(),
  conditions: z.string().optional(),
  template: z.string().optional(),
});

type FormValues = z.infer<typeof proposalSchema>;

interface LineItem {
  product_id: string | null;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

interface Props {
  proposal?: ProposalWithRelations;
}

export function ProposalEditor({ proposal }: Props) {
  const router = useRouter();
  const { user } = useUser();
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const updateItems = useUpdateProposalItems();
  const { data: leads = [] } = useLeads();
  const { data: products = [] } = useProducts();

  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [items, setItems] = useState<LineItem[]>([
    { product_id: null, name: "", description: "", quantity: 1, unit_price: 0, discount: 0 },
  ]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: { number: generateNumber(), business_unit: "labs" },
  });

  const businessUnitValue = watch("business_unit");
  const leadIdValue = watch("lead_id");
  const templateValue = watch("template");

  function generateNumber() {
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return `PROP-${year}-${seq}`;
  }

  useEffect(() => {
    if (proposal) {
      reset({
        number: proposal.number,
        business_unit: proposal.business_unit,
        lead_id: proposal.lead_id ?? "",
        company_name: proposal.company?.name ?? "",
        contact_name: proposal.contact?.full_name ?? "",
        discount: proposal.discount?.toString() ?? "",
        valid_until: proposal.valid_until ? proposal.valid_until.split("T")[0] : "",
        conditions: proposal.conditions ?? "",
        template: proposal.template ?? "",
      });
      setGlobalDiscount(proposal.discount ?? 0);
      if (proposal.items && proposal.items.length > 0) {
        setItems(
          proposal.items.map((item) => ({
            product_id: item.product_id ?? null,
            name: item.name,
            description: "",
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount ?? 0,
          }))
        );
      }
    } else {
      // Default validity: 30 days from now
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setValue("valid_until", d.toISOString().split("T")[0]);
    }
  }, [proposal, reset, setValue]);

  // When lead is selected, auto-fill
  useEffect(() => {
    if (!leadIdValue) {
      setSelectedLead(null);
      return;
    }
    const lead = leads.find((l) => l.id === leadIdValue);
    if (lead) {
      setSelectedLead(lead);
      setValue("company_name", lead.company?.name ?? "");
      setValue("contact_name", lead.contact?.full_name ?? "");
      if (lead.business_unit) {
        setValue("business_unit", lead.business_unit);
      }
    }
  }, [leadIdValue, leads, setValue]);

  const addItem = () => {
    setItems([
      ...items,
      { product_id: null, name: "", description: "", quantity: 1, unit_price: 0, discount: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number | null) => {
    const newItems = [...items];
    if (field === "product_id" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value as string,
          name: product.name,
          description: product.description ?? "",
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
    return acc + lineTotal * (1 - item.discount / 100);
  }, 0);

  const total = subtotal * (1 - globalDiscount / 100);

  const buildPayload = (status: Proposal["status"]) => ({
    number: watch("number"),
    business_unit: watch("business_unit") as Proposal["business_unit"],
    lead_id: selectedLead?.id ?? null,
    company_id: selectedLead?.company_id ?? null,
    contact_id: selectedLead?.contact_id ?? null,
    discount: globalDiscount || null,
    valid_until: watch("valid_until") || null,
    status,
    conditions: watch("conditions") || null,
    template: watch("template") || null,
    total,
  });

  const buildLineItems = () =>
    items
      .filter((item) => item.name.trim())
      .map((item) => ({
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || null,
        subtotal: item.quantity * item.unit_price * (1 - item.discount / 100),
      }));

  const handleSaveDraft = async () => {
    const isValid = await new Promise<boolean>((resolve) => {
      handleSubmit(() => resolve(true), () => resolve(false))();
    });
    if (!isValid) return;

    const payload = buildPayload("rascunho");
    const lineItems = buildLineItems();

    try {
      if (proposal) {
        await updateProposal.mutateAsync({ id: proposal.id, ...payload });
        await updateItems.mutateAsync({ proposalId: proposal.id, items: lineItems });
        router.push(`/proposals/${proposal.id}`);
      } else {
        const result = await createProposal.mutateAsync({
          proposal: { ...payload, org_id: user?.org_id ?? "" },
          items: lineItems,
        });
        const created = result as { id: string };
        router.push(`/proposals/${created.id}`);
      }
    } catch {
      // erro já tratado pelo onError do hook
    }
  };

  const handleSend = async () => {
    const isValid = await new Promise<boolean>((resolve) => {
      handleSubmit(() => resolve(true), () => resolve(false))();
    });
    if (!isValid) return;

    const payload = buildPayload("enviada");
    const lineItems = buildLineItems();

    try {
      if (proposal) {
        await updateProposal.mutateAsync({ id: proposal.id, ...payload });
        await updateItems.mutateAsync({ proposalId: proposal.id, items: lineItems });
        router.push(`/proposals/${proposal.id}`);
      } else {
        const result = await createProposal.mutateAsync({
          proposal: { ...payload, org_id: user?.org_id ?? "" },
          items: lineItems,
        });
        const created = result as { id: string };
        router.push(`/proposals/${created.id}`);
      }
    } catch {
      // erro já tratado pelo onError do hook
    }
  };

  const isPending =
    isSubmitting || createProposal.isPending || updateProposal.isPending || updateItems.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/proposals")}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {proposal ? `Editar ${proposal.number}` : "Nova Proposta"}
          </h1>
          <p className="text-sm text-text-muted">
            {proposal ? "Edite os dados da proposta" : "Preencha os dados da proposta comercial"}
          </p>
        </div>
      </div>

      {/* Section 1: Lead & Cliente */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Lead & Cliente
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="number">Número da Proposta *</Label>
            <Input id="number" {...register("number")} placeholder="PROP-2025-0001" />
            {errors.number && <p className="text-xs text-danger">{errors.number.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Frente *</Label>
            <Select
              value={businessUnitValue ?? ""}
              onValueChange={(v) => setValue("business_unit", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar frente" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.business_unit && (
              <p className="text-xs text-danger">{errors.business_unit.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Lead</Label>
          <Select value={leadIdValue ?? "__none__"} onValueChange={(v) => setValue("lead_id", v === "__none__" ? undefined : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar lead..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.title}
                  {l.company ? ` — ${l.company.name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="company_name">Empresa</Label>
            <Input
              id="company_name"
              {...register("company_name")}
              placeholder="Auto-preenchido ao selecionar lead"
              readOnly={!!selectedLead}
              className={selectedLead ? "bg-white/5 text-text-muted" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_name">Contato</Label>
            <Input
              id="contact_name"
              {...register("contact_name")}
              placeholder="Auto-preenchido ao selecionar lead"
              readOnly={!!selectedLead}
              className={selectedLead ? "bg-white/5 text-text-muted" : ""}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Itens */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Itens da Proposta
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus size={14} className="mr-1" />
            Adicionar Item
          </Button>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-2 text-xs text-text-muted font-medium">Produto</th>
                <th className="text-left py-2 pr-2 text-xs text-text-muted font-medium">Descrição</th>
                <th className="text-left py-2 pr-2 text-xs text-text-muted font-medium w-16">Qtd</th>
                <th className="text-left py-2 pr-2 text-xs text-text-muted font-medium w-28">Valor Unit.</th>
                <th className="text-left py-2 pr-2 text-xs text-text-muted font-medium w-20">Desc. %</th>
                <th className="text-right py-2 text-xs text-text-muted font-medium w-28">Subtotal</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const sub = item.quantity * item.unit_price * (1 - item.discount / 100);
                return (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="py-2 pr-2">
                      <Select
                        value={item.product_id ?? "__none__"}
                        onValueChange={(v) => updateItem(index, "product_id", v === "__none__" ? null : v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Personalizado</SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        placeholder="Descrição do item"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", parseFloat(e.target.value) || 1)
                        }
                        className="h-8 text-xs w-16"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.unit_price === 0 ? "" : item.unit_price}
                        placeholder="0,00"
                        onChange={(e) =>
                          updateItem(index, "unit_price", parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs w-28"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(index, "discount", parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs w-20"
                      />
                    </td>
                    <td className="py-2 text-right font-medium text-text-primary">
                      {formatCurrency(sub)}
                    </td>
                    <td className="py-2 pl-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="text-danger disabled:text-text-muted/30 hover:text-danger/80 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>Desconto Global (%)</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                className="h-7 w-20 text-xs text-right"
              />
            </div>
            {globalDiscount > 0 && (
              <div className="flex justify-between text-sm text-danger">
                <span>Desconto</span>
                <span>- {formatCurrency((subtotal * globalDiscount) / 100)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-primary text-base border-t border-border pt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Detalhes */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Detalhes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="valid_until">Validade</Label>
            <Input id="valid_until" type="date" {...register("valid_until")} />
          </div>

          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={templateValue ?? "__none__"} onValueChange={(v) => setValue("template", v === "__none__" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Padrão</SelectItem>
                {BUSINESS_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="conditions">Condições Comerciais</Label>
          <Textarea
            id="conditions"
            {...register("conditions")}
            rows={4}
            placeholder="Condições de pagamento, prazo de entrega, vigência do contrato..."
          />
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#040912]/95 backdrop-blur border-t border-border p-4 flex justify-end gap-3 z-50">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/proposals")}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isPending}
        >
          <Save size={16} className="mr-2" />
          Salvar Rascunho
        </Button>
        <Button
          type="button"
          style={{ background: "var(--primary)" }}
          onClick={handleSend}
          disabled={isPending}
        >
          <Send size={16} className="mr-2" />
          Enviar Proposta
        </Button>
      </div>
    </div>
  );
}
