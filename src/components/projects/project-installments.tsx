"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, CheckCircle2, Settings, AlertCircle, Wand2 } from "lucide-react";
import { addMonths, format as formatDateFns } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, parseCurrencyInput } from "@/lib/utils/format";
import {
  useProjectInstallments,
  useCreateInstallment,
  useUpdateInstallment,
  useDeleteInstallment,
  useMarkInstallmentPaid,
  INSTALLMENT_STATUS_META,
  PAYMENT_METHOD_LABEL,
  type Installment,
  type PaymentMethod,
} from "@/lib/hooks/use-installments";

interface SplitRow {
  id?: string;
  description: string;
  percentage: number;
  phase_id: string | null;
  due_date: string | null;
  payment_method: PaymentMethod | null;
  card_fee_percent: number | null;
  pix_discount_percent: number | null;
}

interface Props {
  projectId: string;
  orgId: string;
  contractValue: number;
  phases: { id: string; name: string }[];
}

const PRESETS = [
  { label: "50% / 50%", splits: [50, 50] },
  { label: "30% / 40% / 30%", splits: [30, 40, 30] },
  { label: "100% início", splits: [100] },
  { label: "Personalizado", splits: null as number[] | null },
];

export function ProjectInstallments({ projectId, orgId, contractValue, phases }: Props) {
  const { data: installments = [], isLoading } = useProjectInstallments(projectId);
  const createIns = useCreateInstallment();
  const updateIns = useUpdateInstallment();
  const deleteIns = useDeleteInstallment();
  const markPaid = useMarkInstallmentPaid();

  const [configOpen, setConfigOpen] = useState(false);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [quickQty, setQuickQty] = useState("");
  const [quickValue, setQuickValue] = useState("");
  const [quickFirstDueDate, setQuickFirstDueDate] = useState("");

  const total = installments.reduce((s, i) => s + Number(i.amount), 0);
  const paid = installments.filter((i) => i.status === "pago").reduce((s, i) => s + Number(i.amount), 0);
  const pending = total - paid;
  const totalCardFees = installments.reduce(
    (s, i) => s + (i.card_fee_percent ? (Number(i.amount) * Number(i.card_fee_percent)) / 100 : 0),
    0
  );
  const totalPixDiscounts = installments.reduce(
    (s, i) => s + (i.pix_discount_percent ? (Number(i.amount) * Number(i.pix_discount_percent)) / 100 : 0),
    0
  );

  const splitsSum = useMemo(
    () => splits.reduce((s, r) => s + (Number(r.percentage) || 0), 0),
    [splits]
  );

  const openConfig = () => {
    if (installments.length > 0) {
      setSplits(
        installments.map((i) => ({
          id: i.id,
          description: i.description,
          percentage: Number(i.percentage),
          phase_id: i.phase_id,
          due_date: i.due_date,
          payment_method: i.payment_method,
          card_fee_percent: i.card_fee_percent,
          pix_discount_percent: i.pix_discount_percent,
        }))
      );
    } else {
      setSplits([
        { description: "Sinal 50%", percentage: 50, phase_id: null, due_date: null, payment_method: null, card_fee_percent: null, pix_discount_percent: null },
        { description: "Entrega 50%", percentage: 50, phase_id: null, due_date: null, payment_method: null, card_fee_percent: null, pix_discount_percent: null },
      ]);
    }
    setQuickQty(""); setQuickValue(""); setQuickFirstDueDate("");
    setConfigOpen(true);
  };

  const applyPreset = (preset: number[]) => {
    setSplits(
      preset.map((p, idx) => ({
        description: preset.length === 1 ? "Pagamento único" : `Parcela ${idx + 1} (${p}%)`,
        percentage: p,
        phase_id: null,
        due_date: null,
        payment_method: null,
        card_fee_percent: null,
        pix_discount_percent: null,
      }))
    );
  };

  // Gera N parcelas iguais de um valor fixo (ex: "12x 850") em vez de
  // adicionar uma por uma. O % de cada parcela é calculado a partir do
  // valor do contrato, e a última parcela absorve o arredondamento pra
  // fechar exatamente 100%.
  const applyQuickGenerate = () => {
    const qty = parseInt(quickQty, 10);
    const value = parseCurrencyInput(quickValue);
    if (!qty || qty <= 0) {
      toast.error("Informe a quantidade de parcelas.");
      return;
    }
    if (!value || isNaN(value) || value <= 0) {
      toast.error("Informe o valor de cada parcela.");
      return;
    }
    if (contractValue <= 0) {
      toast.error("Defina o valor do contrato no projeto antes de gerar parcelas.");
      return;
    }
    const rawPct = (value / contractValue) * 100;
    const rounded = Math.round(rawPct * 100) / 100;
    const generated: SplitRow[] = Array.from({ length: qty }, (_, idx) => {
      const isLast = idx === qty - 1;
      const percentage = isLast
        ? Math.max(0, Math.round((100 - rounded * (qty - 1)) * 100) / 100)
        : rounded;
      const due_date = quickFirstDueDate
        ? formatDateFns(addMonths(new Date(`${quickFirstDueDate}T00:00:00`), idx), "yyyy-MM-dd")
        : null;
      return {
        description: `Parcela ${idx + 1}/${qty}`,
        percentage,
        phase_id: null,
        due_date,
        payment_method: null,
        card_fee_percent: null,
        pix_discount_percent: null,
      };
    });
    setSplits(generated);
    const generatedTotal = qty * value;
    if (Math.abs(generatedTotal - contractValue) > 0.5) {
      toast.warning(
        `${qty}x ${formatCurrency(value)} = ${formatCurrency(generatedTotal)}, mas o contrato é ${formatCurrency(contractValue)}. Ajuste se necessário.`
      );
    }
  };

  const addSplit = () => {
    setSplits((prev) => [
      ...prev,
      { description: `Parcela ${prev.length + 1}`, percentage: 0, phase_id: null, due_date: null, payment_method: null, card_fee_percent: null, pix_discount_percent: null },
    ]);
  };

  const updateSplit = (idx: number, patch: Partial<SplitRow>) => {
    setSplits((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeSplit = (idx: number) => {
    setSplits((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (Math.abs(splitsSum - 100) > 0.01) {
      toast.error(`A soma das parcelas deve ser 100% (atual: ${splitsSum}%)`);
      return;
    }
    if (contractValue <= 0) {
      toast.error("Defina o valor do contrato no projeto antes de criar parcelas.");
      return;
    }

    // Atualiza as parcelas existentes (mantém status/pago/NF), cria as novas
    // e só apaga as que o usuário de fato removeu da lista — evita perder
    // parcelas já pagas ao só ajustar uma data ou percentual.
    try {
      const keptIds = new Set(splits.filter((s) => s.id).map((s) => s.id!));
      for (const existing of installments) {
        if (!keptIds.has(existing.id)) {
          await deleteIns.mutateAsync(existing.id);
        }
      }
      for (let i = 0; i < splits.length; i++) {
        const s = splits[i];
        const amount = Math.round((contractValue * s.percentage) / 100 * 100) / 100;
        if (s.id) {
          await updateIns.mutateAsync({
            id: s.id,
            position: i + 1,
            description: s.description,
            percentage: s.percentage,
            amount,
            phase_id: s.phase_id,
            due_date: s.due_date,
            payment_method: s.payment_method,
            card_fee_percent: s.payment_method === "cartao" ? s.card_fee_percent : null,
            pix_discount_percent: s.payment_method === "pix" ? s.pix_discount_percent : null,
          });
        } else {
          await createIns.mutateAsync({
            org_id: orgId,
            project_id: projectId,
            position: i + 1,
            description: s.description,
            percentage: s.percentage,
            amount,
            phase_id: s.phase_id,
            due_date: s.due_date,
            payment_method: s.payment_method,
            card_fee_percent: s.payment_method === "cartao" ? s.card_fee_percent : null,
            pix_discount_percent: s.payment_method === "pix" ? s.pix_discount_percent : null,
            status: "pendente",
          });
        }
      }
      setConfigOpen(false);
      toast.success("Parcelas configuradas!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Parcelas do Contrato</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Recebíveis vinculados a etapas do projeto (50/50 ou customizado)
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={openConfig}>
          <Settings size={14} className="mr-1.5" />
          {installments.length === 0 ? "Configurar" : "Editar"}
        </Button>
      </div>

      {/* Summary */}
      {installments.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-border">
          <div>
            <p className="text-xs text-text-muted">Total Contratado</p>
            <p className="text-lg font-bold text-text-primary">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Recebido</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(paid)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">A Receber</p>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(pending)}</p>
          </div>
        </div>
      )}
      {(totalCardFees > 0 || totalPixDiscounts > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-border">
          {totalCardFees > 0 && (
            <div>
              <p className="text-xs text-text-muted">Taxa de Cartão (total)</p>
              <p className="text-sm font-bold text-red-600">-{formatCurrency(totalCardFees)}</p>
            </div>
          )}
          {totalPixDiscounts > 0 && (
            <div>
              <p className="text-xs text-text-muted">Desconto Pix (total)</p>
              <p className="text-sm font-bold text-red-600">-{formatCurrency(totalPixDiscounts)}</p>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-text-muted">Carregando...</p>
      ) : installments.length === 0 ? (
        <div className="text-center py-8 text-sm text-text-muted">
          Nenhuma parcela configurada. Clique em <b>Configurar</b> para criar.
        </div>
      ) : (
        <div className="space-y-2">
          {installments.map((inst) => (
            <InstallmentRow
              key={inst.id}
              installment={inst}
              phases={phases}
              onMarkPaid={() => markPaid.mutate(inst.id)}
              onCancel={() => updateIns.mutate({ id: inst.id, status: "cancelado" })}
              onReopen={() => updateIns.mutate({ id: inst.id, status: "pendente", paid_at: null })}
            />
          ))}
        </div>
      )}

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Parcelas</DialogTitle>
            <DialogDescription>
              Defina como o valor do contrato ({formatCurrency(contractValue)}) será dividido em parcelas.
              Você pode vincular cada parcela a uma etapa do projeto — quando a etapa for concluída,
              a parcela vira automaticamente <b>faturada</b>.
            </DialogDescription>
          </DialogHeader>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => p.splits && applyPreset(p.splits)}
                disabled={!p.splits}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Gerar N parcelas iguais (ex: 12x 850) */}
          <div className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/30">
            <p className="text-xs font-medium text-text-primary flex items-center gap-1.5">
              <Wand2 size={13} />
              Gerar parcelas iguais (ex: 12x R$ 850,00)
            </p>
            <div className="grid grid-cols-[70px_1fr_1fr_auto] gap-2 items-end">
              <div>
                <label className="text-[10px] text-text-muted">Qtd.</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="12"
                  value={quickQty}
                  onChange={(e) => setQuickQty(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted">Valor de cada parcela</label>
                <Input
                  placeholder="850,00"
                  value={quickValue}
                  onChange={(e) => setQuickValue(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted">1ª parcela (opcional)</label>
                <Input
                  type="date"
                  value={quickFirstDueDate}
                  onChange={(e) => setQuickFirstDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={applyQuickGenerate} className="h-9">
                Gerar
              </Button>
            </div>
            <p className="text-[11px] text-text-muted">
              Preenche a lista abaixo com as parcelas — você ainda pode editar, adicionar ou remover uma a uma antes de salvar.
            </p>
          </div>

          {/* Splits */}
          <div className="space-y-3 mt-3 max-h-[50vh] overflow-y-auto">
            {splits.map((row, idx) => (
              <div key={idx} className="rounded-lg border border-border p-2.5 space-y-2">
                <div className="grid grid-cols-[1fr_80px_30px] gap-2 items-center">
                  <Input
                    placeholder="Descrição (ex: Sinal 50%)"
                    value={row.description}
                    onChange={(e) => updateSplit(idx, { description: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder="%"
                    value={row.percentage || ""}
                    onChange={(e) => updateSplit(idx, { percentage: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeSplit(idx)}
                    className="p-1 rounded hover:bg-red-50 text-text-muted hover:text-red-600 transition-colors justify-self-center"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={row.phase_id ?? "__none__"}
                    onValueChange={(v) => updateSplit(idx, { phase_id: v === "__none__" ? null : v })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Etapa..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem etapa</SelectItem>
                      {phases.map((ph) => (
                        <SelectItem key={ph.id} value={ph.id}>
                          {ph.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={row.due_date ?? ""}
                    onChange={(e) => updateSplit(idx, { due_date: e.target.value || null })}
                    className="h-9 text-xs"
                  />
                  <Select
                    value={row.payment_method ?? "__none__"}
                    onValueChange={(v) =>
                      updateSplit(idx, {
                        payment_method: v === "__none__" ? null : (v as PaymentMethod),
                        card_fee_percent: v === "cartao" ? row.card_fee_percent : null,
                        pix_discount_percent: v === "pix" ? row.pix_discount_percent : null,
                      })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Forma de pagto..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Não definida</SelectItem>
                      {(Object.entries(PAYMENT_METHOD_LABEL) as [PaymentMethod, string][]).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {row.payment_method === "cartao" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      placeholder="Taxa da maquininha (%)"
                      value={row.card_fee_percent ?? ""}
                      onChange={(e) => updateSplit(idx, { card_fee_percent: e.target.value === "" ? null : parseFloat(e.target.value) })}
                      className="h-9 text-xs"
                    />
                    {!!row.card_fee_percent && (
                      <span className="text-[11px] text-red-600 whitespace-nowrap">
                        -{formatCurrency((contractValue * row.percentage / 100) * row.card_fee_percent / 100)}
                      </span>
                    )}
                  </div>
                )}
                {row.payment_method === "pix" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      placeholder="Desconto no pix (%)"
                      value={row.pix_discount_percent ?? ""}
                      onChange={(e) => updateSplit(idx, { pix_discount_percent: e.target.value === "" ? null : parseFloat(e.target.value) })}
                      className="h-9 text-xs"
                    />
                    {!!row.pix_discount_percent && (
                      <span className="text-[11px] text-red-600 whitespace-nowrap">
                        -{formatCurrency((contractValue * row.percentage / 100) * row.pix_discount_percent / 100)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addSplit} className="w-full">
              <Plus size={14} className="mr-1.5" />
              Adicionar parcela
            </Button>
          </div>

          {/* Footer summary */}
          <div className="flex items-center justify-between text-sm pt-3 border-t border-border">
            <div>
              {Math.abs(splitsSum - 100) > 0.01 ? (
                <span className="flex items-center gap-1.5 text-red-600">
                  <AlertCircle size={14} />
                  Soma: {splitsSum.toFixed(2)}% (precisa ser 100%)
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">
                  ✓ Soma: 100% — total {formatCurrency(contractValue)}
                </span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                Math.abs(splitsSum - 100) > 0.01 ||
                createIns.isPending ||
                deleteIns.isPending ||
                contractValue <= 0
              }
              style={{ background: "var(--primary)" }}
            >
              Salvar Parcelas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InstallmentRow({
  installment,
  phases,
  onMarkPaid,
  onCancel,
  onReopen,
}: {
  installment: Installment & { phase?: { id: string; name: string; status: string } | null };
  phases: { id: string; name: string }[];
  onMarkPaid: () => void;
  onCancel: () => void;
  onReopen: () => void;
}) {
  const meta = INSTALLMENT_STATUS_META[installment.status];
  const phase = phases.find((p) => p.id === installment.phase_id);
  const isOverdue =
    installment.due_date &&
    installment.status === "pendente" &&
    new Date(installment.due_date) < new Date();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-text-primary">{installment.description}</p>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: `${meta.color}20`, color: meta.color }}
          >
            {meta.label}
          </span>
          {isOverdue && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700">
              Atrasada
            </span>
          )}
          {phase && (
            <span className="text-[11px] text-text-muted">
              ⟶ etapa <b>{phase.name}</b>
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          {installment.percentage}% • {installment.due_date ? `Vence ${formatDate(installment.due_date)}` : "Sem data"}
          {installment.payment_method && ` • ${PAYMENT_METHOD_LABEL[installment.payment_method]}`}
          {installment.payment_method === "cartao" && installment.card_fee_percent
            ? ` (taxa ${installment.card_fee_percent}% = -${formatCurrency((Number(installment.amount) * Number(installment.card_fee_percent)) / 100)})`
            : ""}
          {installment.payment_method === "pix" && installment.pix_discount_percent
            ? ` (desconto ${installment.pix_discount_percent}% = -${formatCurrency((Number(installment.amount) * Number(installment.pix_discount_percent)) / 100)})`
            : ""}
          {installment.paid_at && ` • Pago em ${formatDate(installment.paid_at)}`}
        </p>
      </div>
      <p className="text-sm font-semibold text-text-primary whitespace-nowrap">
        {formatCurrency(Number(installment.amount))}
      </p>
      {installment.status === "pago" ? (
        <Button variant="outline" size="sm" onClick={onReopen} className="h-7 text-xs">
          Reabrir
        </Button>
      ) : installment.status === "cancelado" ? (
        <Button variant="outline" size="sm" onClick={onReopen} className="h-7 text-xs">
          Restaurar
        </Button>
      ) : (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkPaid}
            className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            <CheckCircle2 size={13} className="mr-1" />
            Pago
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs">
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
