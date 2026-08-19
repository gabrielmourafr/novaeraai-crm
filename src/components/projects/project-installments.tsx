"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, CheckCircle2, Settings, AlertCircle, Wand2, Pencil } from "lucide-react";
import { addMonths, format as formatDateFns } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  type InstallmentWithRelations,
  type PaymentMethod,
} from "@/lib/hooks/use-installments";

interface SplitRow {
  id?: string;
  description: string;
  percentage: number;
  // Valor em R$ dessa parcela — é sempre o que efetivamente vai ser salvo.
  // Continua junto do percentage (usado só pra exibir/validar a soma de
  // 100%), mas nunca é recalculado a partir dele na hora de salvar — foi
  // exatamente essa recomputação que causava a parcela salvar um valor
  // diferente do que a pessoa digitou (perda de precisão do % arredondado).
  amount: number;
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
  const [quickEntradaPct, setQuickEntradaPct] = useState("");
  const [quickEntradaPaymentMethod, setQuickEntradaPaymentMethod] = useState<PaymentMethod | "__none__">("__none__");
  const [quickEntradaCardFeePct, setQuickEntradaCardFeePct] = useState("");
  const [quickEntradaPixDiscountPct, setQuickEntradaPixDiscountPct] = useState("");
  const [quickQty, setQuickQty] = useState("");
  const [quickValue, setQuickValue] = useState("");
  const [quickFirstDueDate, setQuickFirstDueDate] = useState("");

  const [editingInstallment, setEditingInstallment] = useState<InstallmentWithRelations | undefined>();
  const [deletingInstallment, setDeletingInstallment] = useState<Installment | undefined>();
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPhaseId, setEditPhaseId] = useState("__none__");
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod | "__none__">("__none__");
  const [editCardFeePct, setEditCardFeePct] = useState("");
  const [editPixDiscountPct, setEditPixDiscountPct] = useState("");

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
          amount: Number(i.amount),
          phase_id: i.phase_id,
          due_date: i.due_date,
          payment_method: i.payment_method,
          card_fee_percent: i.card_fee_percent,
          pix_discount_percent: i.pix_discount_percent,
        }))
      );
    } else {
      const half = contractValue > 0 ? Math.round(contractValue * 0.5 * 100) / 100 : 0;
      setSplits([
        { description: "Sinal 50%", percentage: 50, amount: half, phase_id: null, due_date: null, payment_method: null, card_fee_percent: null, pix_discount_percent: null },
        { description: "Entrega 50%", percentage: 50, amount: contractValue - half, phase_id: null, due_date: null, payment_method: null, card_fee_percent: null, pix_discount_percent: null },
      ]);
    }
    setQuickEntradaPct(""); setQuickEntradaPaymentMethod("__none__");
    setQuickEntradaCardFeePct(""); setQuickEntradaPixDiscountPct("");
    setQuickQty(""); setQuickValue(""); setQuickFirstDueDate("");
    setConfigOpen(true);
  };

  const applyPreset = (preset: number[]) => {
    setSplits(
      preset.map((p, idx) => ({
        description: preset.length === 1 ? "Pagamento único" : `Parcela ${idx + 1} (${p}%)`,
        percentage: p,
        amount: contractValue > 0 ? Math.round(contractValue * (p / 100) * 100) / 100 : 0,
        phase_id: null,
        due_date: null,
        payment_method: null,
        card_fee_percent: null,
        pix_discount_percent: null,
      }))
    );
  };

  // Gera o plano de parcelas de uma vez: entrada opcional (%) + N parcelas
  // iguais (ex: "30% entrada + 12x 850"). Os valores em R$ são calculados
  // primeiro (a última parcela/entrada absorve o resto do arredondamento
  // pra sempre fechar exatamente o valor do contrato) e o percentual é só
  // derivado deles pra exibição/validação — nunca o contrário, porque
  // arredondar o % e depois recalcular o valor a partir dele é o que fazia
  // a parcela salvar um valor diferente do que foi digitado.
  const applyQuickGenerate = () => {
    const qty = parseInt(quickQty, 10);
    if (!qty || qty <= 0) {
      toast.error("Informe a quantidade de parcelas.");
      return;
    }
    if (contractValue <= 0) {
      toast.error("Defina o valor do contrato no projeto antes de gerar parcelas.");
      return;
    }
    const entradaPct = quickEntradaPct ? parseCurrencyInput(quickEntradaPct) : 0;
    if (isNaN(entradaPct) || entradaPct < 0 || entradaPct >= 100) {
      toast.error("Entrada inválida — use um percentual entre 0 e 100.");
      return;
    }
    const entradaAmount = entradaPct > 0 ? Math.round(contractValue * (entradaPct / 100) * 100) / 100 : 0;
    const remainingValue = Math.round((contractValue - entradaAmount) * 100) / 100;

    const enteredValue = quickValue ? parseCurrencyInput(quickValue) : NaN;
    let installmentAmounts: number[];
    if (!isNaN(enteredValue) && enteredValue > 0) {
      installmentAmounts = Array.from({ length: qty }, (_, idx) =>
        idx === qty - 1
          ? Math.round((remainingValue - enteredValue * (qty - 1)) * 100) / 100
          : Math.round(enteredValue * 100) / 100
      );
      if (Math.abs(qty * enteredValue - remainingValue) > 0.5) {
        toast.warning(
          `${qty}x ${formatCurrency(enteredValue)} = ${formatCurrency(qty * enteredValue)}, mas o restante do contrato (após a entrada) é ${formatCurrency(remainingValue)}. Ajuste se necessário.`
        );
      }
    } else {
      const each = Math.round((remainingValue / qty) * 100) / 100;
      installmentAmounts = Array.from({ length: qty }, (_, idx) =>
        idx === qty - 1 ? Math.round((remainingValue - each * (qty - 1)) * 100) / 100 : each
      );
    }

    const rows: SplitRow[] = [];
    if (entradaPct > 0) {
      rows.push({
        description: "Entrada",
        percentage: (entradaAmount / contractValue) * 100,
        amount: entradaAmount,
        phase_id: null,
        due_date: quickFirstDueDate || null,
        payment_method: quickEntradaPaymentMethod === "__none__" ? null : quickEntradaPaymentMethod,
        card_fee_percent: quickEntradaPaymentMethod === "cartao" && quickEntradaCardFeePct ? parseCurrencyInput(quickEntradaCardFeePct) : null,
        pix_discount_percent: quickEntradaPaymentMethod === "pix" && quickEntradaPixDiscountPct ? parseCurrencyInput(quickEntradaPixDiscountPct) : null,
      });
    }
    installmentAmounts.forEach((amt, idx) => {
      const monthOffset = entradaPct > 0 ? idx + 1 : idx;
      const due_date = quickFirstDueDate
        ? formatDateFns(addMonths(new Date(`${quickFirstDueDate}T00:00:00`), monthOffset), "yyyy-MM-dd")
        : null;
      rows.push({
        description: `Parcela ${idx + 1}/${qty}`,
        percentage: (amt / contractValue) * 100,
        amount: amt,
        phase_id: null,
        due_date,
        payment_method: null,
        card_fee_percent: null,
        pix_discount_percent: null,
      });
    });
    setSplits(rows);
  };

  const addSplit = () => {
    setSplits((prev) => [
      ...prev,
      { description: `Parcela ${prev.length + 1}`, percentage: 0, amount: 0, phase_id: null, due_date: null, payment_method: null, card_fee_percent: null, pix_discount_percent: null },
    ]);
  };

  const updateSplit = (idx: number, patch: Partial<SplitRow>) => {
    setSplits((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeSplit = (idx: number) => {
    setSplits((prev) => prev.filter((_, i) => i !== idx));
  };

  // Edição/exclusão direta de uma parcela já cadastrada, sem passar pelo
  // fluxo de "Configurar Parcelas" (que reabre e revalida o plano inteiro)
  const openEditInstallment = (inst: InstallmentWithRelations) => {
    setEditingInstallment(inst);
    setEditDesc(inst.description);
    setEditAmount(String(inst.amount));
    setEditDueDate(inst.due_date ?? "");
    setEditPhaseId(inst.phase_id ?? "__none__");
    setEditPaymentMethod(inst.payment_method ?? "__none__");
    setEditCardFeePct(inst.card_fee_percent != null ? String(inst.card_fee_percent) : "");
    setEditPixDiscountPct(inst.pix_discount_percent != null ? String(inst.pix_discount_percent) : "");
  };

  const handleSaveEditInstallment = async () => {
    if (!editingInstallment) return;
    const amount = parseCurrencyInput(editAmount);
    if (!editDesc || isNaN(amount) || amount <= 0) {
      toast.error("Preencha descrição e valor.");
      return;
    }
    const percentage = contractValue > 0
      ? Math.round((amount / contractValue) * 100 * 100) / 100
      : Number(editingInstallment.percentage);
    await updateIns.mutateAsync({
      id: editingInstallment.id,
      description: editDesc,
      amount,
      percentage,
      due_date: editDueDate || null,
      phase_id: editPhaseId === "__none__" ? null : editPhaseId,
      payment_method: editPaymentMethod === "__none__" ? null : editPaymentMethod,
      card_fee_percent: editPaymentMethod === "cartao" && editCardFeePct ? parseCurrencyInput(editCardFeePct) : null,
      pix_discount_percent: editPaymentMethod === "pix" && editPixDiscountPct ? parseCurrencyInput(editPixDiscountPct) : null,
    });
    setEditingInstallment(undefined);
  };

  const handleSave = async () => {
    if (Math.abs(splitsSum - 100) > 0.01) {
      toast.error(`A soma das parcelas deve ser 100% (atual: ${splitsSum.toFixed(2)}%)`);
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
        const amount = s.amount;
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
              onEdit={() => openEditInstallment(inst)}
              onDelete={() => setDeletingInstallment(inst)}
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

          {/* Gerar entrada + N parcelas iguais (ex: 30% entrada + 12x 850) */}
          <div className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/30">
            <p className="text-xs font-medium text-text-primary flex items-center gap-1.5">
              <Wand2 size={13} />
              Gerar entrada + parcelas (ex: 30% entrada + 12x R$ 850,00)
            </p>
            <div className="grid grid-cols-[90px_1fr] gap-2 items-end">
              <div>
                <label className="text-[10px] text-text-muted">Entrada (%)</label>
                <Input
                  placeholder="30 (opcional)"
                  value={quickEntradaPct}
                  onChange={(e) => setQuickEntradaPct(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted">Forma de pagamento da entrada</label>
                <Select
                  value={quickEntradaPaymentMethod}
                  onValueChange={(v) => setQuickEntradaPaymentMethod(v as PaymentMethod | "__none__")}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Não definida" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Não definida</SelectItem>
                    {(Object.entries(PAYMENT_METHOD_LABEL) as [PaymentMethod, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {quickEntradaPaymentMethod === "cartao" && (
              <Input
                placeholder="Taxa da maquininha na entrada (%)"
                value={quickEntradaCardFeePct}
                onChange={(e) => setQuickEntradaCardFeePct(e.target.value)}
                className="h-9 text-xs"
              />
            )}
            {quickEntradaPaymentMethod === "pix" && (
              <Input
                placeholder="Desconto no pix da entrada (%)"
                value={quickEntradaPixDiscountPct}
                onChange={(e) => setQuickEntradaPixDiscountPct(e.target.value)}
                className="h-9 text-xs"
              />
            )}
            <div className="grid grid-cols-[70px_1fr] gap-2 items-end">
              <div>
                <label className="text-[10px] text-text-muted">Qtd. parcelas</label>
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
                <label className="text-[10px] text-text-muted">Valor de cada parcela (opcional — em branco divide o restante igualmente)</label>
                <Input
                  placeholder="850,00"
                  value={quickValue}
                  onChange={(e) => setQuickValue(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <label className="text-[10px] text-text-muted">Vencimento da entrada / 1ª parcela (opcional)</label>
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
              Preenche a lista abaixo (entrada + parcelas) já somando 100% certinho — você ainda pode editar, adicionar ou remover uma a uma antes de salvar.
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
                    value={row.percentage ? Number(row.percentage.toFixed(2)) : ""}
                    onChange={(e) => {
                      const pct = parseFloat(e.target.value) || 0;
                      updateSplit(idx, {
                        percentage: pct,
                        amount: contractValue > 0 ? Math.round(contractValue * (pct / 100) * 100) / 100 : 0,
                      });
                    }}
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
                <p className="text-[11px] text-text-muted">
                  Valor desta parcela: <span className="font-semibold text-text-primary">{formatCurrency(row.amount)}</span>
                </p>
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
                        -{formatCurrency(row.amount * row.card_fee_percent / 100)}
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
                        -{formatCurrency(row.amount * row.pix_discount_percent / 100)}
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

      {/* Editar uma parcela específica, sem reabrir o plano inteiro */}
      <Dialog open={!!editingInstallment} onOpenChange={(v) => !v && setEditingInstallment(undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Parcela</DialogTitle>
            <DialogDescription>Altere os dados dessa parcela específica.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Etapa vinculada</Label>
              <Select value={editPhaseId} onValueChange={setEditPhaseId}>
                <SelectTrigger><SelectValue placeholder="Sem etapa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem etapa</SelectItem>
                  {phases.map((ph) => (
                    <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select
                value={editPaymentMethod}
                onValueChange={(v) => setEditPaymentMethod(v as PaymentMethod | "__none__")}
              >
                <SelectTrigger><SelectValue placeholder="Não definida" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não definida</SelectItem>
                  {(Object.entries(PAYMENT_METHOD_LABEL) as [PaymentMethod, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editPaymentMethod === "cartao" && (
              <div className="space-y-1.5">
                <Label>Taxa da maquininha (%)</Label>
                <Input value={editCardFeePct} onChange={(e) => setEditCardFeePct(e.target.value)} placeholder="0,00" />
              </div>
            )}
            {editPaymentMethod === "pix" && (
              <div className="space-y-1.5">
                <Label>Desconto no pix (%)</Label>
                <Input value={editPixDiscountPct} onChange={(e) => setEditPixDiscountPct(e.target.value)} placeholder="0,00" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInstallment(undefined)}>Cancelar</Button>
            <Button onClick={handleSaveEditInstallment} disabled={updateIns.isPending} style={{ background: "var(--primary)" }}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir uma parcela específica */}
      <AlertDialog open={!!deletingInstallment} onOpenChange={(v) => !v && setDeletingInstallment(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir parcela?</AlertDialogTitle>
            <AlertDialogDescription>
              A parcela <strong>{deletingInstallment?.description}</strong> ({formatCurrency(Number(deletingInstallment?.amount ?? 0))}) será removida definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (deletingInstallment) {
                  await deleteIns.mutateAsync(deletingInstallment.id);
                  setDeletingInstallment(undefined);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InstallmentRow({
  installment,
  phases,
  onMarkPaid,
  onCancel,
  onReopen,
  onEdit,
  onDelete,
}: {
  installment: Installment & { phase?: { id: string; name: string; status: string } | null };
  phases: { id: string; name: string }[];
  onMarkPaid: () => void;
  onCancel: () => void;
  onReopen: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
      <div className="flex gap-1 items-center">
        {installment.status === "pago" ? (
          <Button variant="outline" size="sm" onClick={onReopen} className="h-7 text-xs">
            Reabrir
          </Button>
        ) : installment.status === "cancelado" ? (
          <Button variant="outline" size="sm" onClick={onReopen} className="h-7 text-xs">
            Restaurar
          </Button>
        ) : (
          <>
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
          </>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-primary" onClick={onEdit}>
          <Pencil size={13} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-red-600" onClick={onDelete}>
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  );
}
