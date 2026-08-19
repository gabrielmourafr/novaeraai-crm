"use client";

import { useState } from "react";
import { Settings, CalendarClock, AlertTriangle, Pencil } from "lucide-react";
import { differenceInDays, differenceInCalendarMonths, parseISO, addDays, addMonths, format as formatDateFns } from "date-fns";
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
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useUpdateProject } from "@/lib/hooks/use-projects";
import type { ProjectWithRelations } from "@/lib/hooks/use-projects";

interface Props {
  project: ProjectWithRelations;
}

const STATUS_LABEL: Record<NonNullable<ProjectWithRelations["billing_status"]>, { label: string; color: string }> = {
  sem_mensalidade: { label: "Sem mensalidade", color: "#94A3B8" },
  ativo:           { label: "Ativo", color: "#10B981" },
  suspenso:        { label: "Suspenso", color: "#F59E0B" },
  encerrado:       { label: "Encerrado", color: "#64748B" },
};

const RENEWAL_LABEL: Record<NonNullable<ProjectWithRelations["renewal_type"]>, string> = {
  auto:        "Renovação automática",
  manual:      "Renovação manual",
  no_renewal:  "Sem renovação",
};

export function ProjectBilling({ project }: Props) {
  const update = useUpdateProject();
  const [open, setOpen] = useState(false);
  const [predictionOpen, setPredictionOpen] = useState(false);
  const [predictionOverride, setPredictionOverride] = useState(project.predicted_first_billing_override ?? "");
  const computeDurationLabel = (start: string, end: string) => {
    if (!start || !end) return "";
    const months = differenceInCalendarMonths(parseISO(end), parseISO(start));
    return months > 0 ? String(months) : "";
  };

  const [form, setForm] = useState({
    billing_status: (project.billing_status ?? "sem_mensalidade") as NonNullable<ProjectWithRelations["billing_status"]>,
    billing_day: project.billing_day?.toString() ?? "",
    billing_amount: project.billing_amount?.toString() ?? "",
    contract_start: project.contract_start ?? "",
    contract_end: project.contract_end ?? "",
    contract_duration: computeDurationLabel(project.contract_start ?? "", project.contract_end ?? ""),
    renewal_type: (project.renewal_type ?? "manual") as NonNullable<ProjectWithRelations["renewal_type"]>,
  });

  const openConfig = () => {
    setForm({
      billing_status: (project.billing_status ?? "sem_mensalidade") as NonNullable<ProjectWithRelations["billing_status"]>,
      billing_day: project.billing_day?.toString() ?? "",
      billing_amount: project.billing_amount?.toString() ?? "",
      contract_start: project.contract_start ?? "",
      contract_end: project.contract_end ?? "",
      contract_duration: computeDurationLabel(project.contract_start ?? "", project.contract_end ?? ""),
      renewal_type: (project.renewal_type ?? "manual") as NonNullable<ProjectWithRelations["renewal_type"]>,
    });
    setOpen(true);
  };

  // Duração é só uma conveniência pra preencher o término automaticamente —
  // não existe coluna própria, é sempre derivada de início + término.
  const applyDuration = (months: string) => {
    setForm((f) => {
      const base = f.contract_start || project.predicted_first_billing_override || "";
      if (!base || !months) return { ...f, contract_duration: months };
      const end = formatDateFns(addMonths(parseISO(base), Number(months)), "yyyy-MM-dd");
      return { ...f, contract_duration: months, contract_start: f.contract_start || base, contract_end: end };
    });
  };

  const handleSave = async () => {
    await update.mutateAsync({
      id: project.id,
      billing_status: form.billing_status,
      billing_day: form.billing_day ? Number(form.billing_day) : null,
      billing_amount: form.billing_amount ? Number(form.billing_amount) : null,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      renewal_type: form.renewal_type,
    });
    setOpen(false);
  };

  const status = project.billing_status ?? "sem_mensalidade";
  const meta = STATUS_LABEL[status];
  const daysToEnd = project.contract_end
    ? differenceInDays(parseISO(project.contract_end), new Date())
    : null;

  const hasMensalidade = status !== "sem_mensalidade";

  // Previsão da 1ª cobrança de mensalidade: por padrão, prazo de entrega
  // (prometido, ou previsto se não houver data prometida) + 30 dias de
  // período de teste — mas pode ser sobrescrita manualmente quando o
  // contrato combinar um prazo diferente com o cliente.
  const deliveryDate = project.promised_delivery_date ?? project.expected_end_date;
  const computedPrediction = deliveryDate ? addDays(parseISO(deliveryDate), 30) : null;
  const predictedFirstBilling = project.predicted_first_billing_override
    ? parseISO(project.predicted_first_billing_override)
    : computedPrediction;
  const isOverridden = !!project.predicted_first_billing_override;

  // Duração do contrato (meses), derivada de início + término — usada tanto
  // pra clientes já ativos quanto pra previsão, já que a mensalidade (ativa
  // ou prevista) só conta até essa data de término no Financeiro.
  const projectDurationMonths =
    project.contract_start && project.contract_end
      ? differenceInCalendarMonths(parseISO(project.contract_end), parseISO(project.contract_start))
      : null;

  const handleSavePrediction = async () => {
    await update.mutateAsync({
      id: project.id,
      predicted_first_billing_override: predictionOverride || null,
    });
    setPredictionOpen(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Contrato de Mensalidade</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Dia de cobrança, valor recorrente e prazo de contrato
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={openConfig}>
          <Settings size={14} className="mr-1.5" />
          Configurar
        </Button>
      </div>

      {!hasMensalidade ? (
        <div className="space-y-3">
          <p className="text-sm text-text-muted text-center py-4">
            Este projeto não possui contrato de mensalidade. Clique em <b>Configurar</b> para adicionar o valor previsto.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Tile
              label="Mensalidade prevista"
              value={project.billing_amount ? formatCurrency(Number(project.billing_amount)) : "Não definida"}
            />
            <Tile
              label="Tempo de Contrato"
              value={
                projectDurationMonths != null
                  ? `${projectDurationMonths} meses (até ${formatDate(project.contract_end!)})`
                  : "Não definido"
              }
            />
            <div className="rounded-lg p-3 bg-white/5 border border-border flex items-center gap-2">
              <CalendarClock size={14} className="text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Previsão da 1ª mensalidade</p>
                {predictedFirstBilling ? (
                  <p className="text-sm font-semibold mt-0.5">
                    {formatDate(predictedFirstBilling.toISOString())}
                    <span className="block text-[10px] font-normal text-text-muted">
                      {isOverridden ? "ajustada manualmente" : "prazo de entrega + 30 dias de teste"}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm font-semibold mt-0.5 text-text-muted">Nenhuma previsão definida</p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={() => { setPredictionOverride(project.predicted_first_billing_override ?? ""); setPredictionOpen(true); }}
                title="Definir/ajustar previsão"
              >
                <Pencil size={12} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top status row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: `${meta.color}20`, color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="text-xs text-text-muted">
              {RENEWAL_LABEL[project.renewal_type ?? "manual"]}
            </span>
            {daysToEnd !== null && status === "ativo" && (
              <DaysToEndBadge days={daysToEnd} />
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile
              label="Mensalidade"
              value={project.billing_amount ? formatCurrency(Number(project.billing_amount)) : "—"}
            />
            <Tile
              label="Dia de cobrança"
              value={project.billing_day ? `Dia ${project.billing_day}` : "—"}
            />
            <Tile
              label="Início"
              value={
                project.contract_start
                  ? formatDate(project.contract_start)
                  : predictedFirstBilling
                  ? `Previsto: ${formatDate(predictedFirstBilling.toISOString())}`
                  : "—"
              }
            />
            <Tile
              label="Término"
              value={project.contract_end ? formatDate(project.contract_end) : "—"}
              accent={daysToEnd !== null && daysToEnd <= 30 && daysToEnd >= 0 ? "#F59E0B" : daysToEnd !== null && daysToEnd < 0 ? "#EF4444" : undefined}
            />
            <Tile
              label="Tempo de Contrato"
              value={projectDurationMonths != null ? `${projectDurationMonths} meses` : "—"}
            />
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Contrato</DialogTitle>
            <DialogDescription>
              Defina os termos do contrato de mensalidade (recorrência).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Status</Label>
              <Select
                value={form.billing_status}
                onValueChange={(v) => setForm((f) => ({ ...f, billing_status: v as typeof f.billing_status }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor mensal {form.billing_status === "sem_mensalidade" && "(previsto)"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.billing_amount}
                  onChange={(e) => setForm((f) => ({ ...f, billing_amount: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Dia do mês (1-31)</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.billing_day}
                  onChange={(e) => setForm((f) => ({ ...f, billing_day: e.target.value }))}
                  placeholder="10"
                />
              </div>
            </div>
            {form.billing_status === "sem_mensalidade" && (
              <p className="text-xs text-text-muted -mt-1.5">
                Como o status ainda é &quot;Sem mensalidade&quot;, esse valor não gera cobrança — só fica registrado como previsão até você ativar.
              </p>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Início do contrato</Label>
                <Input
                  type="date"
                  value={form.contract_start}
                  onChange={(e) => setForm((f) => ({ ...f, contract_start: e.target.value }))}
                />
              </div>
              <div>
                <Label>Duração (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="12"
                  value={form.contract_duration}
                  onChange={(e) => applyDuration(e.target.value)}
                />
              </div>
              <div>
                <Label>Término do contrato</Label>
                <Input
                  type="date"
                  value={form.contract_end}
                  onChange={(e) => setForm((f) => ({ ...f, contract_end: e.target.value, contract_duration: computeDurationLabel(f.contract_start, e.target.value) }))}
                />
              </div>
            </div>
            <p className="text-xs text-text-muted -mt-1.5">
              A mensalidade é considerada ativa/prevista até essa data de término. Preencha a duração (ou o término direto) mesmo antes de ativar — vale pra previsão também.
            </p>

            {form.billing_status !== "sem_mensalidade" && (
              <div>
                <Label>Tipo de renovação</Label>
                <Select
                  value={form.renewal_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, renewal_type: v as typeof f.renewal_type }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RENEWAL_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} style={{ background: "var(--primary)" }} disabled={update.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={predictionOpen} onOpenChange={setPredictionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar previsão da 1ª mensalidade</DialogTitle>
            <DialogDescription>
              Por padrão é calculada como prazo de entrega + 30 dias de teste. Defina uma data aqui se o contrato combinar um prazo diferente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Data prevista</Label>
            <Input type="date" value={predictionOverride} onChange={(e) => setPredictionOverride(e.target.value)} />
            {computedPrediction && (
              <p className="text-[11px] text-text-muted">
                Cálculo automático: {formatDate(computedPrediction.toISOString())}
              </p>
            )}
          </div>
          <DialogFooter>
            {isOverridden && (
              <Button
                variant="outline"
                className="mr-auto text-text-muted"
                onClick={() => { setPredictionOverride(""); }}
              >
                Voltar ao automático
              </Button>
            )}
            <Button variant="outline" onClick={() => setPredictionOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePrediction} style={{ background: "var(--primary)" }} disabled={update.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg p-3 bg-white/5 border border-border">
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: accent ?? "#0F172A" }}>{value}</p>
    </div>
  );
}

function DaysToEndBadge({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <AlertTriangle size={12} />
        Vencido há {Math.abs(days)} dias
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <AlertTriangle size={12} />
        Vence HOJE
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
        <CalendarClock size={12} />
        Vence em {days} dias
      </span>
    );
  }
  return (
    <span className="text-xs text-text-muted">
      Vence em {days} dias
    </span>
  );
}
