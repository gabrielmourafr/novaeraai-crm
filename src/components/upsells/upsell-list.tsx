"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Trash2, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/format";
import {
  useUpsells,
  useCreateUpsell,
  useUpdateUpsell,
  useDeleteUpsell,
  UPSELL_STATUS_META,
  UPSELL_PRIORITY_META,
  computeAutoSuggestions,
  type UpsellSuggestion,
  type AutoSuggestion,
} from "@/lib/hooks/use-upsells";
import { useProducts } from "@/lib/hooks/use-products";
import { useProjects } from "@/lib/hooks/use-projects";
import { useCompanies } from "@/lib/hooks/use-companies";
import { differenceInDays, parseISO } from "date-fns";

interface Props {
  scope: "company" | "project" | "global";
  companyId?: string;
  projectId?: string;
  orgId: string;
}

const initialForm = {
  title: "",
  description: "",
  reason: "",
  product_id: null as string | null,
  estimated_value: "",
  priority: "media" as UpsellSuggestion["priority"],
  status: "sugerido" as UpsellSuggestion["status"],
  company_id: "",
  project_id: null as string | null,
};

export function UpsellList({ scope, companyId, projectId, orgId }: Props) {
  const { data: upsells = [], isLoading } = useUpsells({ companyId, projectId });
  const { data: products = [] } = useProducts();
  const { data: projects = [] } = useProjects();
  const { data: companies = [] } = useCompanies();
  const createUpsell = useCreateUpsell();
  const updateUpsell = useUpdateUpsell();
  const deleteUpsell = useDeleteUpsell();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UpsellSuggestion | null>(null);
  const [form, setForm] = useState({ ...initialForm, company_id: companyId ?? "", project_id: projectId ?? null });

  // Compute auto suggestions
  const autoSuggestions = useMemo<AutoSuggestion[]>(() => {
    if (scope === "project") return []; // only at company/global level
    const result: AutoSuggestion[] = [];
    const targetCompanies = companyId
      ? companies.filter((c) => c.id === companyId)
      : companies;
    for (const c of targetCompanies) {
      const companyProjects = projects.filter((p) => p.company_id === c.id);
      const nearestContractEnd = companyProjects
        .filter((p) => p.contract_end && p.billing_status === "ativo")
        .map((p) => differenceInDays(parseISO(p.contract_end!), new Date()))
        .filter((d) => d >= 0)
        .sort((a, b) => a - b)[0];
      const auto = computeAutoSuggestions({
        companyId: c.id,
        companyName: c.name,
        catalogProducts: products.map((p) => ({
          id: p.id,
          name: p.name,
          base_price: p.base_price,
          status: p.status,
        })),
        contractEndingSoonDays: nearestContractEnd ?? null,
      });
      result.push(...auto);
    }
    return result;
  }, [scope, companyId, companies, projects, products]);

  // Hide auto suggestions that already exist as manual entries (same company + product)
  const filteredAuto = useMemo(() => {
    return autoSuggestions.filter(
      (a) =>
        !upsells.some(
          (u) => u.company_id === a.companyId && u.product_id === (a.productId ?? null) && u.status !== "descartado"
        )
    );
  }, [autoSuggestions, upsells]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...initialForm, company_id: companyId ?? "", project_id: projectId ?? null });
    setOpen(true);
  };

  const openEdit = (u: UpsellSuggestion) => {
    setEditing(u);
    setForm({
      title: u.title,
      description: u.description ?? "",
      reason: u.reason ?? "",
      product_id: u.product_id,
      estimated_value: u.estimated_value?.toString() ?? "",
      priority: u.priority,
      status: u.status,
      company_id: u.company_id,
      project_id: u.project_id,
    });
    setOpen(true);
  };

  const convertAuto = (auto: AutoSuggestion) => {
    setEditing(null);
    setForm({
      title: `${auto.productName} (sugerido)`,
      description: "",
      reason: auto.reason,
      product_id: auto.productId ?? null,
      estimated_value: auto.estimatedValue ? String(auto.estimatedValue) : "",
      priority: auto.priority,
      status: "sugerido",
      company_id: auto.companyId,
      project_id: null,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.company_id) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      reason: form.reason.trim() || null,
      product_id: form.product_id,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      priority: form.priority,
      status: form.status,
      project_id: form.project_id,
    };
    if (editing) {
      await updateUpsell.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createUpsell.mutateAsync({ org_id: orgId, company_id: form.company_id, ...payload });
    }
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            {scope === "global" ? "Oportunidades de Upsell" : "Sugestões de Upsell"}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {scope === "global"
              ? "Algoritmo automático + sugestões manuais"
              : scope === "company"
              ? "Sugestões para este cliente"
              : "Sugestões para este projeto"}
          </p>
        </div>
        <Button size="sm" onClick={openCreate} style={{ background: "var(--primary)" }}>
          <Plus size={14} className="mr-1.5" />
          Nova Sugestão
        </Button>
      </div>

      {/* Auto suggestions */}
      {filteredAuto.length > 0 && (
        <div className="rounded-xl border border-blue-200/30 bg-blue-50/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-blue-400" />
            <h4 className="text-sm font-semibold text-blue-300">Sugestões automáticas</h4>
            <span className="text-xs text-text-muted">({filteredAuto.length})</span>
          </div>
          <div className="space-y-2">
            {filteredAuto.slice(0, 5).map((a) => (
              <div key={a.key} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{a.productName}</p>
                    {scope === "global" && (
                      <Link
                        href={`/companies/${a.companyId}`}
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {a.companyName}
                      </Link>
                    )}
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: `${UPSELL_PRIORITY_META[a.priority].color}20`, color: UPSELL_PRIORITY_META[a.priority].color }}
                    >
                      {UPSELL_PRIORITY_META[a.priority].label}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{a.reason}</p>
                </div>
                {a.estimatedValue > 0 && (
                  <p className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                    {formatCurrency(a.estimatedValue)}
                  </p>
                )}
                <Button size="sm" variant="outline" onClick={() => convertAuto(a)}>
                  Salvar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual suggestions */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Carregando...</p>
      ) : upsells.length === 0 ? (
        filteredAuto.length === 0 && (
          <EmptyState
            icon={TrendingUp}
            title="Nenhuma sugestão"
            description={
              scope === "project"
                ? "Adicione manualmente oportunidades de upsell para este projeto."
                : "Aguardando dados — sem oportunidades sugeridas para este escopo no momento."
            }
            action={{ label: "Nova Sugestão", onClick: openCreate }}
          />
        )
      ) : (
        <div className="space-y-2">
          {upsells.map((u) => {
            const statusMeta = UPSELL_STATUS_META[u.status];
            const priorityMeta = UPSELL_PRIORITY_META[u.priority];
            return (
              <div
                key={u.id}
                onClick={() => openEdit(u)}
                className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-text-primary">{u.title}</p>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: `${statusMeta.color}20`, color: statusMeta.color }}
                      >
                        {statusMeta.label}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: `${priorityMeta.color}20`, color: priorityMeta.color }}
                      >
                        {priorityMeta.label}
                      </span>
                      {scope === "global" && u.company && (
                        <Link
                          href={`/companies/${u.company.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary hover:underline"
                        >
                          {u.company.name}
                        </Link>
                      )}
                      {u.product && (
                        <span className="text-[10px] text-text-muted">⟶ {u.product.name}</span>
                      )}
                    </div>
                    {u.reason && (
                      <p className="text-xs text-text-muted mt-0.5 italic">💡 {u.reason}</p>
                    )}
                    {u.description && (
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">{u.description}</p>
                    )}
                  </div>
                  {u.estimated_value && (
                    <p className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                      {formatCurrency(Number(u.estimated_value))}
                    </p>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remover "${u.title}"?`)) deleteUpsell.mutate(u.id);
                    }}
                    className="p-1.5 rounded hover:bg-red-50 text-text-muted hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Sugestão" : "Nova Sugestão de Upsell"}</DialogTitle>
            <DialogDescription>
              Oportunidades de venda adicional pra um cliente existente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Adicionar consultoria de growth"
              />
            </div>

            {scope === "global" && (
              <div>
                <Label>Cliente *</Label>
                <Select
                  value={form.company_id || "__none__"}
                  onValueChange={(v) => setForm((f) => ({ ...f, company_id: v === "__none__" ? "" : v }))}
                  disabled={!!companyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Produto do catálogo (opcional)</Label>
              <Select
                value={form.product_id ?? "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, product_id: v === "__none__" ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem produto vinculado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem produto vinculado</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.base_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Por que sugerir? (motivo)</Label>
              <Textarea
                rows={2}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ex: Cliente expandindo equipe, sem cobertura de growth..."
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detalhes adicionais..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Valor estimado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.estimated_value}
                  onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as UpsellSuggestion["priority"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(UPSELL_PRIORITY_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as UpsellSuggestion["status"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(UPSELL_STATUS_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.title.trim() || !form.company_id}
              style={{ background: "var(--primary)" }}
            >
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
