"use client";

import { useState, useMemo } from "react";
import { addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Wallet, Pencil, Flame, Building2, Users, Download, Receipt, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate, parseCurrencyInput } from "@/lib/utils/format";
import { exportToCsv } from "@/lib/utils/csv";
import { useRevenues, useExpenses, useRevenuesLastMonths, useExpensesLastMonths, useDeleteRevenue, useDeleteExpense, useUpdateRevenue, useUpdateExpense, useCreateRevenue, useCreateExpense, useTotalRevenues, type Revenue, type Expense } from "@/lib/hooks/use-finance";
import { useAllInstallments, useMarkInstallmentPaid, useUpdateInstallment, useClientInstallmentsSummary, INSTALLMENT_STATUS_META, type InstallmentWithRelations } from "@/lib/hooks/use-installments";
import { useActiveSubscriptions, useEnsureMonthlyBilling, useClientMensalidadeSummary, nextBillingDate, RENEWAL_LABEL, type ActiveSubscription } from "@/lib/hooks/use-subscriptions";
import { useClientsFinancialSummary } from "@/lib/hooks/use-client-summary";
import { useLeads } from "@/lib/hooks/use-leads";
import { useCompanies } from "@/lib/hooks/use-companies";
import { useUpdateProject, useProjects } from "@/lib/hooks/use-projects";
import { useUser } from "@/lib/hooks/use-user";
import {
  usePartnerPayments,
  useCreatePartnerPayment,
  useMarkPartnerPaymentPaid,
  useDeletePartnerPayment,
  RECIPIENT_TYPE_LABEL,
  PAYMENT_STATUS_META,
  type PartnerPaymentWithRelations,
} from "@/lib/hooks/use-partner-payments";
import Link from "next/link";

const revenueStatusStyles: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  pago: "bg-success/10 text-success",
  atrasado: "bg-danger/10 text-danger",
  cancelado: "bg-white/5 text-gray-400",
};
const expenseStatusStyles: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  pago: "bg-success/10 text-success",
  atrasado: "bg-danger/10 text-danger",
};
const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const monthsShort = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const tooltipStyle = {
  backgroundColor: "#0C1526",
  border: "1px solid rgba(11,135,195,0.25)",
  borderRadius: "8px",
  color: "#E2EBF8",
  fontSize: "12px",
};

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  pessoal: "#0B87C3",
  marketing: "#f59e0b",
  infraestrutura: "#a855f7",
  operacional: "#22c55e",
  impostos: "#ef4444",
  outro: "#3D5A78",
};

export function FinanceiroTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [deletingRevenue, setDeletingRevenue] = useState<Revenue | undefined>();
  const [deletingExpense, setDeletingExpense] = useState<Expense | undefined>();
  const [createRevenueOpen, setCreateRevenueOpen] = useState(false);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  const [mensalidadesBreakdownOpen, setMensalidadesBreakdownOpen] = useState(false);
  const [implReceberBreakdownOpen, setImplReceberBreakdownOpen] = useState(false);
  const [implRecebidaBreakdownOpen, setImplRecebidaBreakdownOpen] = useState(false);
  const [parcelasBreakdownOpen, setParcelasBreakdownOpen] = useState(false);
  const [createPaymentOpen, setCreatePaymentOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<PartnerPaymentWithRelations | undefined>();

  // Nota fiscal (parcela de implementação)
  const [editingInstallmentNF, setEditingInstallmentNF] = useState<InstallmentWithRelations | undefined>();
  const [nfNumber, setNfNumber] = useState("");
  const [nfIssuedAt, setNfIssuedAt] = useState("");
  const [nfInvoiceUrl, setNfInvoiceUrl] = useState("");

  // Nota fiscal (receita / mensalidade)
  const [editingRevenueNF, setEditingRevenueNF] = useState<Revenue | undefined>();
  const [revNfNumber, setRevNfNumber] = useState("");
  const [revNfIssuedAt, setRevNfIssuedAt] = useState("");
  const [revNfLink, setRevNfLink] = useState("");

  // Partner/dev payment form state
  const [payType, setPayType] = useState<"parceiro" | "desenvolvedor">("desenvolvedor");
  const [payName, setPayName] = useState("");
  const [payProjectId, setPayProjectId] = useState("__none__");
  const [payDesc, setPayDesc] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDueDate, setPayDueDate] = useState("");

  // Revenue form state
  const [revDesc, setRevDesc] = useState("");
  const [revCategory, setRevCategory] = useState<"assinatura" | "consultoria" | "projeto" | "workshop" | "outro">("consultoria");
  const [revValue, setRevValue] = useState("");
  const [revDueDate, setRevDueDate] = useState("");
  const [revStatus, setRevStatus] = useState<"pendente" | "pago" | "atrasado" | "cancelado">("pendente");
  const [revRecurrence, setRevRecurrence] = useState<"pontual" | "mensal" | "trimestral" | "anual">("pontual");
  const [revCompanyId, setRevCompanyId] = useState("__none__");

  // Expense form state
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState<"infraestrutura" | "saas" | "marketing" | "pessoal" | "imposto" | "outro">("outro");
  const [expValue, setExpValue] = useState("");
  const [expDueDate, setExpDueDate] = useState("");
  const [expStatus, setExpStatus] = useState<"pendente" | "pago" | "atrasado">("pendente");
  const [expRecurrence, setExpRecurrence] = useState<"pontual" | "mensal" | "trimestral" | "anual">("pontual");

  const { user } = useUser();
  useEnsureMonthlyBilling();
  const { data: totalRevenuesAllTime = 0 } = useTotalRevenues();
  const { data: activeSubscriptions = [], isLoading: subscriptionsLoading } = useActiveSubscriptions();
  const { data: mensalidadeSummary = [] } = useClientMensalidadeSummary();
  const { data: clientsSummary = [] } = useClientsFinancialSummary();
  const { data: clientInstallmentsSummary = [] } = useClientInstallmentsSummary();
  const updateInstallment = useUpdateInstallment();
  const totalParcelasRestantes = clientInstallmentsSummary.reduce((s, c) => s + c.remainingCount, 0);
  const totalParcelasRestantesValue = clientInstallmentsSummary.reduce((s, c) => s + c.remainingValue, 0);

  const openInstallmentNF = (inst: InstallmentWithRelations) => {
    setEditingInstallmentNF(inst);
    setNfNumber(inst.nf_number ?? "");
    setNfIssuedAt(inst.nf_issued_at ?? "");
    setNfInvoiceUrl(inst.invoice_url ?? "");
  };
  const handleSaveInstallmentNF = async () => {
    if (!editingInstallmentNF) return;
    await updateInstallment.mutateAsync({
      id: editingInstallmentNF.id,
      nf_number: nfNumber.trim() || null,
      nf_issued_at: nfIssuedAt || null,
      invoice_url: nfInvoiceUrl.trim() || null,
    });
    setEditingInstallmentNF(undefined);
  };

  const { data: leads = [] } = useLeads();
  const { data: companiesList = [] } = useCompanies();
  const totalMonthlyRecurring = activeSubscriptions.reduce((s, p) => s + Number(p.billing_amount ?? 0), 0);
  const totalImplementacaoReceber = clientsSummary.reduce((s, c) => s + c.implementacaoReceber, 0);
  const totalImplementacaoRecebida = clientsSummary.reduce((s, c) => s + c.implementacaoRecebida, 0);
  const hotLeadsPipeline = useMemo(
    () => leads.filter((l) => l.temperature === "quente").reduce((s, l) => s + (l.value ?? 0), 0),
    [leads]
  );
  const hotLeadsCount = leads.filter((l) => l.temperature === "quente").length;
  const { data: projects = [] } = useProjects();
  const upcomingMensalidades = useMemo(() => {
    return projects
      .filter((p) => (p.billing_status ?? "sem_mensalidade") === "sem_mensalidade")
      .map((p) => {
        if (p.predicted_first_billing_override) {
          return { project: p, predicted: parseISO(p.predicted_first_billing_override), overridden: true };
        }
        const deliveryDate = p.promised_delivery_date ?? p.expected_end_date;
        if (!deliveryDate) return null;
        return { project: p, predicted: addDays(parseISO(deliveryDate), 30), overridden: false };
      })
      .filter((x): x is { project: (typeof projects)[number]; predicted: Date; overridden: boolean } => x !== null)
      .sort((a, b) => a.predicted.getTime() - b.predicted.getTime());
  }, [projects]);
  const { data: partnerPayments = [], isLoading: paymentsLoading } = usePartnerPayments();
  const createPayment = useCreatePartnerPayment();
  const markPaymentPaid = useMarkPartnerPaymentPaid();
  const deletePayment = useDeletePartnerPayment();
  const pendingPayments = partnerPayments.filter((p) => p.status !== "pago" && p.status !== "cancelado");
  const totalPendingPayments = pendingPayments.reduce((s, p) => s + Number(p.amount), 0);
  const updateProject = useUpdateProject();
  const [editingSubscription, setEditingSubscription] = useState<ActiveSubscription | undefined>();
  const [removingSubscription, setRemovingSubscription] = useState<ActiveSubscription | undefined>();
  const [subAmount, setSubAmount] = useState("");
  const [subDay, setSubDay] = useState("");
  const [subContractStart, setSubContractStart] = useState("");
  const [subContractEnd, setSubContractEnd] = useState("");
  const [subRenewal, setSubRenewal] = useState<"auto" | "manual" | "no_renewal">("manual");

  const openEditSubscription = (sub: ActiveSubscription) => {
    setEditingSubscription(sub);
    setSubAmount(sub.billing_amount?.toString() ?? "");
    setSubDay(sub.billing_day?.toString() ?? "");
    setSubContractStart(sub.contract_start ?? "");
    setSubContractEnd(sub.contract_end ?? "");
    setSubRenewal(sub.renewal_type ?? "manual");
  };

  const handleSaveSubscription = async () => {
    if (!editingSubscription) return;
    await updateProject.mutateAsync({
      id: editingSubscription.id,
      billing_amount: subAmount ? parseFloat(subAmount) : null,
      billing_day: subDay ? parseInt(subDay) : null,
      contract_start: subContractStart || null,
      contract_end: subContractEnd || null,
      renewal_type: subRenewal,
    });
    setEditingSubscription(undefined);
  };

  const handleRemoveSubscription = async () => {
    if (!removingSubscription) return;
    await updateProject.mutateAsync({ id: removingSubscription.id, billing_status: "encerrado" });
    setRemovingSubscription(undefined);
  };
  const { data: revenues = [], isLoading: revLoading } = useRevenues(year, month);
  const { data: expenses = [], isLoading: expLoading } = useExpenses(year, month);
  const { data: revenuesLastMonths = {} } = useRevenuesLastMonths(year, month, 6);
  const { data: expensesLastMonths = {} } = useExpensesLastMonths(year, month, 6);
  const { data: installmentsPending = [], isLoading: installmentsLoading } = useAllInstallments([
    "pendente",
    "faturado",
    "atrasado",
  ]);
  const markPaid = useMarkInstallmentPaid();
  const deleteRevenue = useDeleteRevenue();
  const deleteExpense = useDeleteExpense();
  const updateRevenue = useUpdateRevenue();
  const updateExpense = useUpdateExpense();
  const createRevenue = useCreateRevenue();
  const createExpense = useCreateExpense();

  const openRevenueNF = (rev: Revenue) => {
    setEditingRevenueNF(rev);
    setRevNfNumber(rev.nf_number ?? "");
    setRevNfIssuedAt(rev.nf_issued_at ?? "");
    setRevNfLink(rev.nf_link ?? "");
  };
  const handleSaveRevenueNF = async () => {
    if (!editingRevenueNF) return;
    await updateRevenue.mutateAsync({
      id: editingRevenueNF.id,
      nf_number: revNfNumber.trim() || null,
      nf_issued_at: revNfIssuedAt || null,
      nf_link: revNfLink.trim() || null,
    });
    setEditingRevenueNF(undefined);
  };

  const handleCreateRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sessão não carregada ainda — recarregue a página e tente de novo."); return; }
    if (!revDesc || !revValue) { toast.error("Preencha descrição e valor."); return; }
    const parsedValue = parseCurrencyInput(revValue);
    if (isNaN(parsedValue)) { toast.error("Valor inválido — use um número, ex: 1500,00."); return; }
    await createRevenue.mutateAsync({
      org_id: user.org_id,
      description: revDesc,
      category: revCategory,
      value: parsedValue,
      status: revStatus,
      due_date: revDueDate || null,
      business_unit: "intelligence",
      recurrence: revRecurrence,
      company_id: revCompanyId !== "__none__" ? revCompanyId : null,
      contact_id: null, proposal_id: null, project_id: null,
      payment_method: null, installment: null, paid_at: null,
    });
    setCreateRevenueOpen(false);
    setRevDesc(""); setRevValue(""); setRevDueDate(""); setRevCompanyId("__none__");
    setRevCategory("consultoria"); setRevStatus("pendente"); setRevRecurrence("pontual");
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sessão não carregada ainda — recarregue a página e tente de novo."); return; }
    if (!expDesc || !expValue) { toast.error("Preencha descrição e valor."); return; }
    const parsedValue = parseCurrencyInput(expValue);
    if (isNaN(parsedValue)) { toast.error("Valor inválido — use um número, ex: 1500,00."); return; }
    await createExpense.mutateAsync({
      org_id: user.org_id,
      description: expDesc,
      category: expCategory,
      value: parsedValue,
      status: expStatus,
      due_date: expDueDate || null,
      recurrence: expRecurrence,
      project_id: null,
      paid_at: null,
    });
    setCreateExpenseOpen(false);
    setExpDesc(""); setExpValue(""); setExpDueDate("");
    setExpCategory("outro"); setExpStatus("pendente"); setExpRecurrence("pontual");
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sessão não carregada ainda — recarregue a página e tente de novo."); return; }
    if (!payName || !payDesc || !payAmount) { toast.error("Preencha nome, descrição e valor."); return; }
    const parsedAmount = parseCurrencyInput(payAmount);
    if (isNaN(parsedAmount)) { toast.error("Valor inválido — use um número, ex: 1500,00."); return; }
    await createPayment.mutateAsync({
      org_id: user.org_id,
      recipient_type: payType,
      recipient_name: payName,
      recipient_user_id: null,
      project_id: payProjectId !== "__none__" ? payProjectId : null,
      description: payDesc,
      amount: parsedAmount,
      due_date: payDueDate || null,
      paid_at: null,
      status: "pendente",
      notes: null,
      created_by: user.id,
    });
    setCreatePaymentOpen(false);
    setPayType("desenvolvedor"); setPayName(""); setPayProjectId("__none__");
    setPayDesc(""); setPayAmount(""); setPayDueDate("");
  };

  // Preenche o valor sugerido com base na comissão do projeto selecionado
  const applyCommissionSuggestion = (projectId: string) => {
    setPayProjectId(projectId);
    if (projectId === "__none__") return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    if (payType === "desenvolvedor" && project.contract_value) {
      const pct = project.dev_commission_pct ?? 20;
      setPayAmount(((Number(project.contract_value) * pct) / 100).toFixed(2));
      setPayDesc((d) => d || `Comissão DEV (${pct}%) — ${project.name}`);
    }
  };

  const handleExportRevenues = () => {
    exportToCsv(`receitas-${months[month - 1].toLowerCase()}-${year}`, revenues.map((r) => ({
      Descrição: r.description,
      Categoria: r.category,
      Valor: r.value,
      Vencimento: r.due_date ? formatDate(r.due_date) : "",
      "Pago em": r.paid_at ? formatDate(r.paid_at) : "",
      Status: r.status,
      Recorrência: r.recurrence,
    })));
  };

  const handleExportExpenses = () => {
    exportToCsv(`despesas-${months[month - 1].toLowerCase()}-${year}`, expenses.map((e) => ({
      Descrição: e.description,
      Categoria: e.category,
      Valor: e.value,
      Vencimento: e.due_date ? formatDate(e.due_date) : "",
      "Pago em": e.paid_at ? formatDate(e.paid_at) : "",
      Status: e.status,
      Recorrência: e.recurrence,
    })));
  };

  // Also fetch last 6 months for charts
  const monthsBack = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: monthsShort[d.getMonth()] };
    });
  }, [year, month]);

  const totalRevenues = revenues.reduce((s, r) => s + r.value, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.value, 0);
  const paidRevenues = revenues.filter((r) => r.status === "pago").reduce((s, r) => s + r.value, 0);
  // Saldo é caixa real: só conta receita já recebida, não o que ainda está pendente
  const balance = paidRevenues - totalExpenses;


  // Expense by category for pie
  const expCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + e.value; });
    return Object.entries(map).map(([name, value]) => ({
      name, value, color: EXPENSE_CATEGORY_COLORS[name] ?? "#3D5A78",
    }));
  }, [expenses]);

  // Month-over-month chart data with actual multi-month data
  const cashFlowData = useMemo(() => {
    return monthsBack.map((m) => {
      const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
      const monthRevenues = revenuesLastMonths[key] ?? [];
      const monthExpenses = expensesLastMonths[key] ?? [];
      const monthRevTotal = monthRevenues.reduce((s, r) => s + r.value, 0);
      const monthExpTotal = monthExpenses.reduce((s, e) => s + e.value, 0);
      return {
        name: m.label,
        receitas: monthRevTotal,
        despesas: monthExpTotal,
        saldo: monthRevTotal - monthExpTotal,
      };
    });
  }, [monthsBack, revenuesLastMonths, expensesLastMonths]);

  // Status distribution for current month revenues
  const revStatusData = useMemo(() => {
    const map: Record<string, number> = {};
    revenues.forEach((r) => { map[r.status] = (map[r.status] ?? 0) + r.value; });
    const colors: Record<string, string> = { pago: "#22c55e", pendente: "#f59e0b", atrasado: "#ef4444", cancelado: "#3D5A78" };
    const labels: Record<string, string> = { pago: "Pago", pendente: "Pendente", atrasado: "Atrasado", cancelado: "Cancelado" };
    return Object.entries(map).map(([key, value]) => ({
      name: labels[key] ?? key, value, color: colors[key] ?? "#3D5A78",
    }));
  }, [revenues]);

  return (
    <div className="space-y-6">
      {/* Month/Year Filter */}
      <div className="flex gap-3 items-center">
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map((m, i) => (<SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>))}</SelectContent>
        </Select>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map((y) => (<SelectItem key={y} value={y.toString()}>{y}</SelectItem>))}</SelectContent>
        </Select>
      </div>

      {/* Resumo do mês selecionado */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Resumo de {months[month - 1]} / {year}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Receitas (mês)" value={formatCurrency(totalRevenues)} icon={TrendingUp} />
          <StatCard label="Despesas (mês)" value={formatCurrency(totalExpenses)} icon={TrendingDown} />
          <StatCard label="Saldo" value={formatCurrency(balance)} icon={DollarSign} />
          <StatCard label="Recebido" value={formatCurrency(paidRevenues)} icon={TrendingUp} />
        </div>
      </div>

      {/* Implementação (acumulado, todos os períodos) */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Implementação — Acumulado
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard size="sm" label="Faturamento Total" value={formatCurrency(totalRevenuesAllTime)} icon={Wallet} />
          <StatCard
            size="sm"
            label={`Parcelas Restantes (${totalParcelasRestantes})`}
            value={formatCurrency(totalParcelasRestantesValue)}
            icon={Layers}
            onClick={() => setParcelasBreakdownOpen(true)}
          />
          <StatCard
            size="sm"
            label="A Receber (clientes)"
            value={formatCurrency(totalImplementacaoReceber)}
            icon={Building2}
            onClick={() => setImplReceberBreakdownOpen(true)}
          />
          <StatCard
            size="sm"
            label="Recebida (clientes)"
            value={formatCurrency(totalImplementacaoRecebida)}
            icon={Building2}
            onClick={() => setImplRecebidaBreakdownOpen(true)}
          />
        </div>
      </div>

      {/* Recorrência, pipeline e pagamentos */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Recorrência &amp; Pipeline
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            size="sm"
            label={`Mensalidades Acumuladas (${activeSubscriptions.length})`}
            value={formatCurrency(totalMonthlyRecurring)}
            icon={TrendingUp}
            onClick={() => setMensalidadesBreakdownOpen(true)}
          />
          <StatCard
            size="sm"
            label={`Pipeline Quente — Projeção (${hotLeadsCount})`}
            value={formatCurrency(hotLeadsPipeline)}
            icon={Flame}
          />
          <StatCard
            size="sm"
            label={`A Pagar — Parceiros/Devs (${pendingPayments.length})`}
            value={formatCurrency(totalPendingPayments)}
            icon={Users}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cash Flow Area Chart */}
        <div
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <div className="mb-4">
            <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Fluxo de Caixa</h3>
            <p className="text-xs" style={{ color: "#7BA3C6" }}>Receitas vs Despesas</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cashFlowData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" />
              <XAxis dataKey="name" tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={40} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Status Pie */}
        <div
          className="rounded-xl p-5"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <div className="mb-4">
            <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Status das Receitas</h3>
            <p className="text-xs" style={{ color: "#7BA3C6" }}>Mês atual</p>
          </div>
          {revStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs" style={{ color: "#3D5A78" }}>
              Sem dados neste mês
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={revStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {revStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {revStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span style={{ color: "#7BA3C6" }}>{item.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: "#E2EBF8" }}>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expense breakdown */}
      {expCategoryData.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <div className="mb-4">
            <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Despesas por Categoria</h3>
            <p className="text-xs" style={{ color: "#7BA3C6" }}>Distribuição do mês</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={expCategoryData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#7BA3C6", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#7BA3C6", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="value" name="Valor" radius={[0,4,4,0]} maxBarSize={20}>
                  {expCategoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {expCategoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="capitalize" style={{ color: "#7BA3C6" }}>{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>{formatCurrency(item.value)}</span>
                    <span className="ml-2 text-xs" style={{ color: "#3D5A78" }}>
                      {totalExpenses > 0 ? `${((item.value / totalExpenses) * 100).toFixed(0)}%` : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tables */}
      <Tabs defaultValue="receivables">
        <TabsList>
          <TabsTrigger value="receivables">Recebíveis ({installmentsPending.length})</TabsTrigger>
          <TabsTrigger value="subscriptions">Mensalidades Ativas ({activeSubscriptions.length})</TabsTrigger>
          <TabsTrigger value="revenues">Receitas ({revenues.length})</TabsTrigger>
          <TabsTrigger value="expenses">Despesas ({expenses.length})</TabsTrigger>
          <TabsTrigger value="partner-payments">Parceiros & Devs ({pendingPayments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="partner-payments" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" style={{ background: "var(--primary)" }} onClick={() => setCreatePaymentOpen(true)}>
              <Plus size={14} className="mr-1" />Novo Pagamento
            </Button>
          </div>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            {paymentsLoading ? (
              <div className="p-8 text-center text-sm" style={{ color: "#7BA3C6" }}>Carregando...</div>
            ) : partnerPayments.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: "#3D5A78" }}>
                Nenhum pagamento registrado. Use <b>Novo Pagamento</b> pra lançar comissões de parceiros ou desenvolvedores.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Recebedor</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Tipo</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Descrição</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Projeto</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Valor</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Vencimento</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Status</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerPayments.map((p) => {
                    const meta = PAYMENT_STATUS_META[p.status];
                    const overdue = p.due_date && p.status === "pendente" && new Date(p.due_date) < new Date();
                    return (
                      <TableRow key={p.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                        <TableCell className="text-sm font-medium" style={{ color: "#E2EBF8" }}>{p.recipient_name}</TableCell>
                        <TableCell>
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(11,135,195,0.12)", color: "#0CA8F5" }}>
                            {RECIPIENT_TYPE_LABEL[p.recipient_type]}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>{p.description}</TableCell>
                        <TableCell className="text-sm">
                          {p.project ? (
                            <Link href={`/projects/${p.project.id}`} className="hover:underline text-[#0B87C3]">{p.project.name}</Link>
                          ) : <span style={{ color: "#3D5A78" }}>—</span>}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-green-400">{formatCurrency(Number(p.amount))}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${overdue ? "text-red-400 font-medium" : ""}`} style={{ color: overdue ? undefined : "#7BA3C6" }}>
                            {p.due_date ? formatDate(p.due_date) : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${meta.color}20`, color: meta.color }}>
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {p.status !== "pago" && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-green-400 hover:text-green-300" onClick={() => markPaymentPaid.mutate(p.id)}>
                                ✓ Pago
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeletingPayment(p)}>
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4 space-y-4">
          {upcomingMensalidades.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                <h4 className="text-sm font-semibold" style={{ color: "#E2EBF8" }}>
                  Previsão de Início de Mensalidade ({upcomingMensalidades.length})
                </h4>
                <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>
                  Prazo de entrega + 30 dias de período de teste, para projetos que ainda não têm mensalidade ativa
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Projeto</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Empresa</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Previsão 1ª Mensalidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingMensalidades.map(({ project: p, predicted, overridden }) => (
                    <TableRow key={p.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                      <TableCell className="text-sm">
                        <Link href={`/projects/${p.id}?tab=financeiro`} className="hover:underline text-[#0B87C3]">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>{p.company?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm" style={{ color: "#E2EBF8" }}>
                        {formatDate(predicted.toISOString())}
                        {overridden && <span className="ml-1.5 text-[10px]" style={{ color: "#7BA3C6" }}>(ajustada)</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            {subscriptionsLoading ? (
              <div className="p-8 text-center text-sm" style={{ color: "#7BA3C6" }}>Carregando...</div>
            ) : activeSubscriptions.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: "#3D5A78" }}>
                Nenhuma mensalidade ativa. Mova um projeto para <b>Ativo - Mensalidade</b> no Kanban para começar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Projeto</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Empresa</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Valor Mensal</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Dia de Cobrança</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Próxima Cobrança</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Início do Contrato</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Renovação</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSubscriptions.map((sub) => {
                    const next = nextBillingDate(sub.billing_day);
                    return (
                      <TableRow key={sub.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                        <TableCell className="text-sm" style={{ color: "#E2EBF8" }}>
                          <Link href={`/projects/${sub.id}?tab=financeiro`} className="hover:underline text-[#0B87C3]">
                            {sub.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>
                          {sub.company?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-green-400">
                            {formatCurrency(Number(sub.billing_amount ?? 0))}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>
                          {sub.billing_day ? `Dia ${sub.billing_day}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "#E2EBF8" }}>
                          {next ? formatDate(next.toISOString()) : "—"}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>
                          {sub.contract_start ? formatDate(sub.contract_start) : "—"}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>
                          {RENEWAL_LABEL[sub.renewal_type ?? "manual"]}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-[#7BA3C6] hover:text-[#0B87C3]"
                              onClick={() => openEditSubscription(sub)}
                            >
                              <Pencil size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-[#7BA3C6] hover:text-red-400"
                              onClick={() => setRemovingSubscription(sub)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="receivables" className="mt-4">
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            {installmentsLoading ? (
              <div className="p-8 text-center text-sm" style={{ color: "#7BA3C6" }}>Carregando...</div>
            ) : installmentsPending.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: "#3D5A78" }}>
                Nenhuma parcela pendente. Configure parcelas em cada projeto na aba <b>Financeiro</b>.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Projeto</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Parcela</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Valor</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Vencimento</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Status</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>NF</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installmentsPending.map((inst) => {
                    const meta = INSTALLMENT_STATUS_META[inst.status];
                    const overdue =
                      inst.due_date && inst.status !== "pago" && new Date(inst.due_date) < new Date();
                    return (
                      <TableRow key={inst.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                        <TableCell className="text-sm" style={{ color: "#E2EBF8" }}>
                          {inst.project ? (
                            <Link href={`/projects/${inst.project.id}?tab=financeiro`} className="hover:underline text-[#0B87C3]">
                              {inst.project.name}
                            </Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "#E2EBF8" }}>
                          {inst.description}
                          <span className="ml-1 text-xs" style={{ color: "#7BA3C6" }}>({inst.percentage}%)</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-green-400">{formatCurrency(Number(inst.amount))}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${overdue ? "text-red-400 font-medium" : ""}`} style={{ color: overdue ? undefined : "#7BA3C6" }}>
                            {inst.due_date ? formatDate(inst.due_date) : "—"}
                            {overdue && <span className="block text-[10px]">Atrasada</span>}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: `${meta.color}20`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => openInstallmentNF(inst)}
                            className="text-xs px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                            style={
                              inst.nf_number
                                ? { background: "rgba(16,185,129,0.15)", color: "#10B981" }
                                : { background: "rgba(148,163,184,0.15)", color: "#7BA3C6" }
                            }
                          >
                            {inst.nf_number ? `NF ${inst.nf_number}` : "Sem NF"}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-green-400 hover:text-green-300"
                              onClick={() => markPaid.mutate(inst.id)}
                            >
                              ✓ Pago
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="revenues" className="mt-4">
          <div className="flex justify-end gap-2 mb-3">
            <Button size="sm" variant="outline" onClick={handleExportRevenues} disabled={revenues.length === 0}>
              <Download size={14} className="mr-1" />Exportar planilha
            </Button>
            <Button size="sm" style={{ background: "var(--primary)" }} onClick={() => setCreateRevenueOpen(true)}><Plus size={14} className="mr-1" />Nova Receita</Button>
          </div>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            {revLoading ? <div className="p-8 text-center text-sm" style={{ color: "#7BA3C6" }}>Carregando...</div> : revenues.length === 0 ? <div className="p-8 text-center text-sm" style={{ color: "#3D5A78" }}>Nenhuma receita neste mês.</div> : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Descrição</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Categoria</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Valor</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Vencimento</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Status</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>NF</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenues.map((rev) => (
                    <TableRow key={rev.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                      <TableCell className="font-medium text-sm" style={{ color: "#E2EBF8" }}>{rev.description}</TableCell>
                      <TableCell><span className="text-xs capitalize" style={{ color: "#7BA3C6" }}>{rev.category}</span></TableCell>
                      <TableCell><span className="text-sm font-semibold text-green-400">{formatCurrency(rev.value)}</span></TableCell>
                      <TableCell><span className="text-sm" style={{ color: "#7BA3C6" }}>{rev.due_date ? formatDate(rev.due_date) : "—"}</span></TableCell>
                      <TableCell>
                        <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (revenueStatusStyles[rev.status] ?? "bg-white/5 text-gray-400")}>
                          {rev.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => openRevenueNF(rev)}
                          className="text-xs px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                          style={
                            rev.nf_number
                              ? { background: "rgba(16,185,129,0.15)", color: "#10B981" }
                              : { background: "rgba(148,163,184,0.15)", color: "#7BA3C6" }
                          }
                        >
                          {rev.nf_number ? `NF ${rev.nf_number}` : "Sem NF"}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {rev.status !== "pago" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-400 hover:text-green-300"
                              onClick={() => updateRevenue.mutate({ id: rev.id, status: "pago", paid_at: new Date().toISOString() })}>
                              ✓ Pago
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeletingRevenue(rev)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <div className="flex justify-end gap-2 mb-3">
            <Button size="sm" variant="outline" onClick={handleExportExpenses} disabled={expenses.length === 0}>
              <Download size={14} className="mr-1" />Exportar planilha
            </Button>
            <Button size="sm" style={{ background: "var(--primary)" }} onClick={() => setCreateExpenseOpen(true)}><Plus size={14} className="mr-1" />Nova Despesa</Button>
          </div>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            {expLoading ? <div className="p-8 text-center text-sm" style={{ color: "#7BA3C6" }}>Carregando...</div> : expenses.length === 0 ? <div className="p-8 text-center text-sm" style={{ color: "#3D5A78" }}>Nenhuma despesa neste mês.</div> : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Descrição</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Categoria</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Valor</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Vencimento</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Status</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                      <TableCell className="font-medium text-sm" style={{ color: "#E2EBF8" }}>{exp.description}</TableCell>
                      <TableCell><span className="text-xs capitalize" style={{ color: "#7BA3C6" }}>{exp.category}</span></TableCell>
                      <TableCell><span className="text-sm font-semibold text-red-400">{formatCurrency(exp.value)}</span></TableCell>
                      <TableCell><span className="text-sm" style={{ color: "#7BA3C6" }}>{exp.due_date ? formatDate(exp.due_date) : "—"}</span></TableCell>
                      <TableCell>
                        <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (expenseStatusStyles[exp.status] ?? "bg-white/5 text-gray-400")}>
                          {exp.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {exp.status !== "pago" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-400 hover:text-green-300"
                              onClick={() => updateExpense.mutate({ id: exp.id, status: "pago", paid_at: new Date().toISOString() })}>
                              ✓ Pago
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeletingExpense(exp)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Revenue Dialog */}
      <Dialog open={createRevenueOpen} onOpenChange={(v) => !v && setCreateRevenueOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Receita</DialogTitle>
            <DialogDescription>Registre uma nova entrada financeira</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRevenue} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input value={revDesc} onChange={(e) => setRevDesc(e.target.value)} placeholder="Ex: Contrato mensal cliente X" required />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa (opcional)</Label>
              <Select value={revCompanyId} onValueChange={setRevCompanyId}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {companiesList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px]" style={{ color: "#7BA3C6" }}>
                Vincular a uma empresa faz essa receita entrar no acumulado por cliente
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input value={revValue} onChange={(e) => setRevValue(e.target.value)} placeholder="0,00" required />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={revDueDate} onChange={(e) => setRevDueDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={revCategory} onValueChange={(v) => setRevCategory(v as typeof revCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                    <SelectItem value="projeto">Projeto</SelectItem>
                    <SelectItem value="assinatura">Assinatura</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={revStatus} onValueChange={(v) => setRevStatus(v as typeof revStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Recorrência</Label>
              <Select value={revRecurrence} onValueChange={(v) => setRevRecurrence(v as typeof revRecurrence)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pontual">Pontual</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateRevenueOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createRevenue.isPending} style={{ background: "var(--primary)" }}>
                Salvar Receita
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Expense Dialog */}
      <Dialog open={createExpenseOpen} onOpenChange={(v) => !v && setCreateExpenseOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>Registre uma nova saída financeira</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Ex: Servidor AWS mensal" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input value={expValue} onChange={(e) => setExpValue(e.target.value)} placeholder="0,00" required />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={expDueDate} onChange={(e) => setExpDueDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={expCategory} onValueChange={(v) => setExpCategory(v as typeof expCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="pessoal">Pessoal</SelectItem>
                    <SelectItem value="imposto">Imposto</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={expStatus} onValueChange={(v) => setExpStatus(v as typeof expStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Recorrência</Label>
              <Select value={expRecurrence} onValueChange={(v) => setExpRecurrence(v as typeof expRecurrence)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pontual">Pontual</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateExpenseOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createExpense.isPending} style={{ background: "var(--primary)" }}>
                Salvar Despesa
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Partner/Dev Payment Dialog */}
      <Dialog open={createPaymentOpen} onOpenChange={(v) => !v && setCreatePaymentOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Pagamento</DialogTitle>
            <DialogDescription>Registre uma comissão ou pagamento a parceiro/desenvolvedor</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePayment} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={payType} onValueChange={(v) => setPayType(v as typeof payType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desenvolvedor">Desenvolvedor</SelectItem>
                    <SelectItem value="parceiro">Parceiro Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={payName} onChange={(e) => setPayName(e.target.value)} placeholder="Nome do recebedor" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Projeto vinculado (opcional)</Label>
              <Select value={payProjectId} onValueChange={applyCommissionSuggestion}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>{proj.code} — {proj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {payType === "desenvolvedor" && payProjectId !== "__none__" && (
                <p className="text-[11px]" style={{ color: "#7BA3C6" }}>
                  Valor sugerido com base na comissão DEV cadastrada no projeto — pode ajustar abaixo.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input value={payDesc} onChange={(e) => setPayDesc(e.target.value)} placeholder="Ex: Comissão de desenvolvimento" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0,00" required />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={payDueDate} onChange={(e) => setPayDueDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreatePaymentOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createPayment.isPending} style={{ background: "var(--primary)" }}>
                Salvar Pagamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Partner Payment Dialog */}
      <AlertDialog open={!!deletingPayment} onOpenChange={(v) => !v && setDeletingPayment(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O pagamento de <strong>{formatCurrency(Number(deletingPayment?.amount ?? 0))}</strong> pra{" "}
              <strong>{deletingPayment?.recipient_name}</strong> será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => { if (deletingPayment) { await deletePayment.mutateAsync(deletingPayment.id); setDeletingPayment(undefined); }}}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialogs */}
      <AlertDialog open={!!deletingRevenue} onOpenChange={(v) => !v && setDeletingRevenue(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover receita?</AlertDialogTitle>
            <AlertDialogDescription>A receita <strong>{deletingRevenue?.description}</strong> será removida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => { if (deletingRevenue) { await deleteRevenue.mutateAsync(deletingRevenue.id); setDeletingRevenue(undefined); }}}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingExpense} onOpenChange={(v) => !v && setDeletingExpense(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover despesa?</AlertDialogTitle>
            <AlertDialogDescription>A despesa <strong>{deletingExpense?.description}</strong> será removida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => { if (deletingExpense) { await deleteExpense.mutateAsync(deletingExpense.id); setDeletingExpense(undefined); }}}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── DIALOG: Editar Mensalidade ─── */}
      <Dialog open={!!editingSubscription} onOpenChange={(v) => !v && setEditingSubscription(undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Mensalidade</DialogTitle>
            <DialogDescription>{editingSubscription?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor mensal (R$)</Label>
                <Input type="number" step="0.01" value={subAmount} onChange={(e) => setSubAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label>Dia de cobrança</Label>
                <Input type="number" min={1} max={31} value={subDay} onChange={(e) => setSubDay(e.target.value)} placeholder="10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início do contrato</Label>
                <Input type="date" value={subContractStart} onChange={(e) => setSubContractStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Término do contrato</Label>
                <Input type="date" value={subContractEnd} onChange={(e) => setSubContractEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de renovação</Label>
              <Select value={subRenewal} onValueChange={(v) => setSubRenewal(v as typeof subRenewal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Renovação automática</SelectItem>
                  <SelectItem value="manual">Renovação manual</SelectItem>
                  <SelectItem value="no_renewal">Sem renovação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingSubscription(undefined)}>Cancelar</Button>
              <Button onClick={handleSaveSubscription} disabled={updateProject.isPending} style={{ background: "var(--primary)" }}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── ALERT: Remover Mensalidade ─── */}
      <AlertDialog open={!!removingSubscription} onOpenChange={(v) => !v && setRemovingSubscription(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover mensalidade?</AlertDialogTitle>
            <AlertDialogDescription>
              A mensalidade de <strong>{removingSubscription?.name}</strong> será encerrada e a cobrança pendente do mês
              será removida do Financeiro. Receitas já pagas no histórico não são afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleRemoveSubscription}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── DIALOG: Breakdown de Mensalidades por Cliente ─── */}
      <Dialog open={mensalidadesBreakdownOpen} onOpenChange={setMensalidadesBreakdownOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mensalidade por Cliente</DialogTitle>
            <DialogDescription>
              Total acumulado: <strong>{formatCurrency(totalMonthlyRecurring)}</strong> — pagas/restantes contam só contratos com data de término definida
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {mensalidadeSummary.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Nenhuma mensalidade ativa ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Mensalidade</TableHead>
                    <TableHead className="text-center">Pagas</TableHead>
                    <TableHead className="text-center">Restantes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensalidadeSummary.map((s) => (
                    <TableRow key={s.projectId}>
                      <TableCell className="text-sm font-medium text-text-primary">
                        {s.companyName}
                        <span className="block text-xs text-text-muted font-normal">{s.projectName}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-green-500">
                        {formatCurrency(s.billingAmount)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-text-primary">
                        {s.totalExpectedCycles !== null ? `${s.paidCount}/${s.totalExpectedCycles}` : s.paidCount}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {s.remainingCount !== null ? (
                          <span className={s.remainingCount <= 2 ? "text-amber-500 font-semibold" : "text-text-muted"}>
                            {s.remainingCount}
                          </span>
                        ) : (
                          <span className="text-text-muted">sem prazo</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Breakdown de Implementação a Receber por Cliente ─── */}
      <Dialog open={implReceberBreakdownOpen} onOpenChange={setImplReceberBreakdownOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Implementação a Receber por Cliente</DialogTitle>
            <DialogDescription>
              Total acumulado: <strong>{formatCurrency(totalImplementacaoReceber)}</strong> — ainda pendente, não conta no faturamento
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {clientsSummary.filter((c) => c.implementacaoReceber > 0).length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Nenhuma implementação pendente no momento.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">A Receber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsSummary.filter((c) => c.implementacaoReceber > 0).map((c) => (
                    <TableRow key={c.companyId}>
                      <TableCell className="text-sm font-medium text-text-primary">{c.companyName}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-amber-500">
                        {formatCurrency(c.implementacaoReceber)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Breakdown de Implementação Recebida por Cliente ─── */}
      <Dialog open={implRecebidaBreakdownOpen} onOpenChange={setImplRecebidaBreakdownOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Implementação Recebida por Cliente</DialogTitle>
            <DialogDescription>
              Total acumulado: <strong>{formatCurrency(totalImplementacaoRecebida)}</strong> — já caiu, conta no faturamento
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {clientsSummary.filter((c) => c.implementacaoRecebida > 0).length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Nenhuma implementação recebida ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsSummary.filter((c) => c.implementacaoRecebida > 0).map((c) => (
                    <TableRow key={c.companyId}>
                      <TableCell className="text-sm font-medium text-text-primary">{c.companyName}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-green-500">
                        {formatCurrency(c.implementacaoRecebida)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Parcelas de Implementação por Cliente ─── */}
      <Dialog open={parcelasBreakdownOpen} onOpenChange={setParcelasBreakdownOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Parcelas de Implementação por Cliente</DialogTitle>
            <DialogDescription>
              Quantas parcelas restam, o que já foi pago, e o total a receber até a finalização do contrato
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto">
            {clientInstallmentsSummary.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Nenhuma parcela cadastrada ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Parcelas</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">A Receber</TableHead>
                    <TableHead className="text-right">Finalização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientInstallmentsSummary.map((c) => (
                    <TableRow key={c.companyId}>
                      <TableCell className="text-sm font-medium text-text-primary">{c.companyName}</TableCell>
                      <TableCell className="text-center text-sm">
                        <span className="text-text-primary font-medium">{c.paidCount}</span>
                        <span className="text-text-muted">/{c.totalCount} pagas</span>
                        {c.remainingCount > 0 && (
                          <span className="block text-[11px] text-amber-500">{c.remainingCount} restantes</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-green-500">
                        {formatCurrency(c.paidValue)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-amber-500">
                        {formatCurrency(c.remainingValue)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-text-muted">
                        {c.finalDueDate ? formatDate(c.finalDueDate) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Nota Fiscal da Parcela ─── */}
      <Dialog open={!!editingInstallmentNF} onOpenChange={(v) => !v && setEditingInstallmentNF(undefined)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt size={16} />Nota Fiscal</DialogTitle>
            <DialogDescription>
              {editingInstallmentNF?.description} — {editingInstallmentNF?.project?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Número da NF</Label>
              <Input value={nfNumber} onChange={(e) => setNfNumber(e.target.value)} placeholder="Ex: 1234" />
            </div>
            <div className="space-y-1.5">
              <Label>Data de emissão</Label>
              <Input type="date" value={nfIssuedAt} onChange={(e) => setNfIssuedAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Link da NF (opcional)</Label>
              <Input value={nfInvoiceUrl} onChange={(e) => setNfInvoiceUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInstallmentNF(undefined)}>Cancelar</Button>
            <Button
              onClick={handleSaveInstallmentNF}
              disabled={updateInstallment.isPending}
              style={{ background: "var(--primary)" }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Nota Fiscal da Receita ─── */}
      <Dialog open={!!editingRevenueNF} onOpenChange={(v) => !v && setEditingRevenueNF(undefined)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt size={16} />Nota Fiscal</DialogTitle>
            <DialogDescription>{editingRevenueNF?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Número da NF</Label>
              <Input value={revNfNumber} onChange={(e) => setRevNfNumber(e.target.value)} placeholder="Ex: 1234" />
            </div>
            <div className="space-y-1.5">
              <Label>Data de emissão</Label>
              <Input type="date" value={revNfIssuedAt} onChange={(e) => setRevNfIssuedAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Link da NF (opcional)</Label>
              <Input value={revNfLink} onChange={(e) => setRevNfLink(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRevenueNF(undefined)}>Cancelar</Button>
            <Button onClick={handleSaveRevenueNF} disabled={updateRevenue.isPending} style={{ background: "var(--primary)" }}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
