"use client";

import { useState, useMemo } from "react";
import { Pencil, DollarSign, TrendingUp, Server, Award } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/format";
import { useUpdateProject, type ProjectWithRelations } from "@/lib/hooks/use-projects";
import { CONTRACT_PLANS } from "@/lib/utils/constants";

interface Props {
  project: ProjectWithRelations;
}

export function ProjectFinancialSummary({ project }: Props) {
  const update = useUpdateProject();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    contract_value: project.contract_value?.toString() ?? "",
    contract_plan: (project.contract_plan ?? "core") as NonNullable<ProjectWithRelations["contract_plan"]>,
    dev_commission_pct: project.dev_commission_pct?.toString() ?? "20",
    infra_setup_cost: project.infra_setup_cost?.toString() ?? "",
    infra_monthly_cost: project.infra_monthly_cost?.toString() ?? "",
    billing_amount: project.billing_amount?.toString() ?? "",
    receivable_value: project.receivable_value?.toString() ?? "",
  });

  const commission = useMemo(() => {
    const v = Number(project.contract_value ?? 0);
    const pct = Number(project.dev_commission_pct ?? 20);
    return (v * pct) / 100;
  }, [project.contract_value, project.dev_commission_pct]);

  const implementationMargin = useMemo(() => {
    const v = Number(project.contract_value ?? 0);
    const infra = Number(project.infra_setup_cost ?? 0);
    if (v <= 0) return null;
    return ((v - infra - commission) / v) * 100;
  }, [project.contract_value, project.infra_setup_cost, commission]);

  const monthlyMargin = useMemo(() => {
    const v = Number(project.billing_amount ?? 0);
    const infra = Number(project.infra_monthly_cost ?? 0);
    if (v <= 0) return null;
    return ((v - infra) / v) * 100;
  }, [project.billing_amount, project.infra_monthly_cost]);

  const handleOpen = () => {
    setForm({
      contract_value: project.contract_value?.toString() ?? "",
      contract_plan: (project.contract_plan ?? "core") as NonNullable<ProjectWithRelations["contract_plan"]>,
      dev_commission_pct: project.dev_commission_pct?.toString() ?? "20",
      infra_setup_cost: project.infra_setup_cost?.toString() ?? "",
      infra_monthly_cost: project.infra_monthly_cost?.toString() ?? "",
      billing_amount: project.billing_amount?.toString() ?? "",
      receivable_value: project.receivable_value?.toString() ?? "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    await update.mutateAsync({
      id: project.id,
      contract_value: form.contract_value ? Number(form.contract_value) : null,
      contract_plan: form.contract_plan,
      dev_commission_pct: form.dev_commission_pct ? Number(form.dev_commission_pct) : 20,
      infra_setup_cost: form.infra_setup_cost ? Number(form.infra_setup_cost) : null,
      infra_monthly_cost: form.infra_monthly_cost ? Number(form.infra_monthly_cost) : null,
      billing_amount: form.billing_amount ? Number(form.billing_amount) : null,
      receivable_value: form.receivable_value ? Number(form.receivable_value) : null,
    });
    setOpen(false);
  };

  const receivableValue = project.receivable_value ?? project.contract_value ?? null;

  const planLabel = CONTRACT_PLANS.find((p) => p.value === project.contract_plan)?.label ?? "—";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Resumo Financeiro</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Implementação, mensalidade, comissão DEV e margem bruta
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleOpen}>
          <Pencil size={13} className="mr-1.5" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile
          icon={DollarSign}
          label="Implementação"
          value={project.contract_value ? formatCurrency(Number(project.contract_value)) : "—"}
        />
        <Tile
          icon={DollarSign}
          label="A Receber"
          value={receivableValue != null ? formatCurrency(Number(receivableValue)) : "—"}
          accent="#F59E0B"
        />
        <Tile
          icon={DollarSign}
          label="Mensalidade"
          value={project.billing_amount ? formatCurrency(Number(project.billing_amount)) : "—"}
          accent="#0B87C3"
        />
        <Tile icon={Award} label="Plano" value={planLabel} />
        <Tile
          icon={Award}
          label={`Comissão DEV (${project.dev_commission_pct ?? 20}%)`}
          value={commission > 0 ? formatCurrency(commission) : "—"}
          accent="#8B5CF6"
        />

        <Tile
          icon={Server}
          label="Custo infra (setup)"
          value={project.infra_setup_cost ? formatCurrency(Number(project.infra_setup_cost)) : "—"}
        />
        <Tile
          icon={Server}
          label="Custo infra (mensal)"
          value={project.infra_monthly_cost ? formatCurrency(Number(project.infra_monthly_cost)) : "—"}
        />
        <Tile
          icon={TrendingUp}
          label="Margem implementação"
          value={implementationMargin != null ? `${implementationMargin.toFixed(0)}%` : "—"}
          accent={implementationMargin != null ? (implementationMargin >= 70 ? "#10B981" : implementationMargin >= 40 ? "#F59E0B" : "#EF4444") : undefined}
        />
        <Tile
          icon={TrendingUp}
          label="Margem mensalidade"
          value={monthlyMargin != null ? `${monthlyMargin.toFixed(0)}%` : "—"}
          accent={monthlyMargin != null ? (monthlyMargin >= 70 ? "#10B981" : monthlyMargin >= 40 ? "#F59E0B" : "#EF4444") : undefined}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Resumo Financeiro</DialogTitle>
            <DialogDescription>
              Valores do contrato, plano, comissão e custos de infra.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor de implementação</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.contract_value}
                  onChange={(e) => setForm((f) => ({ ...f, contract_value: e.target.value }))}
                  placeholder="22000.00"
                />
              </div>
              <div>
                <Label>Mensalidade (R$/mês)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.billing_amount}
                  onChange={(e) => setForm((f) => ({ ...f, billing_amount: e.target.value }))}
                  placeholder="1500.00"
                />
              </div>
            </div>

            <div>
              <Label>A Receber (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.receivable_value}
                onChange={(e) => setForm((f) => ({ ...f, receivable_value: e.target.value }))}
                placeholder="0.00"
              />
              <p className="text-xs text-text-muted mt-1">
                Diminui sozinho conforme você registra receitas pagas deste projeto em Financeiro &gt; Receitas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plano contratado</Label>
                <Select
                  value={form.contract_plan}
                  onValueChange={(v) => setForm((f) => ({ ...f, contract_plan: v as typeof f.contract_plan }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_PLANS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Comissão DEV (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.dev_commission_pct}
                  onChange={(e) => setForm((f) => ({ ...f, dev_commission_pct: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Custo infra (setup)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.infra_setup_cost}
                  onChange={(e) => setForm((f) => ({ ...f, infra_setup_cost: e.target.value }))}
                  placeholder="350.00"
                />
              </div>
              <div>
                <Label>Custo infra (mensal)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.infra_monthly_cost}
                  onChange={(e) => setForm((f) => ({ ...f, infra_monthly_cost: e.target.value }))}
                  placeholder="350.00"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} style={{ background: "var(--primary)" }} disabled={update.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg p-3 bg-white/5 border border-border">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={12} className="text-text-muted" />
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-base font-bold" style={{ color: accent ?? "#0F172A" }}>{value}</p>
    </div>
  );
}
