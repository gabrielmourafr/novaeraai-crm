"use client";

import { useState, useMemo } from "react";
import { addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Wallet, Pencil, Building2, Users, Download, Receipt, Layers, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate, parseCurrencyInput } from "@/lib/utils/format";
import { exportToCsv } from "@/lib/utils/csv";
import {
  useRevenues, useExpenses, useRevenuesLastMonths, useRevenuesForwardMonths, useExpensesLastMonths, useUpcomingFixedExpenses,
  useRecurringExpenseTemplates, useEnsureMonthlyFixedExpenses,
  useDeleteRevenue, useDeleteExpense, useUpdateRevenue, useUpdateExpense, useCreateRevenue, useCreateExpense, useTotalRevenues,
  type Revenue, type Expense, type ExpenseWithCompany,
} from "@/lib/hooks/use-finance";
import { useAllInstallments, useMarkInstallmentPaid, useUpdateInstallment, useClientInstallmentsSummary, INSTALLMENT_STATUS_META, PAYMENT_METHOD_LABEL, type InstallmentWithRelations } from "@/lib/hooks/use-installments";
import {
  useActiveSubscriptions, useEnsureMonthlyBilling, useClientMensalidadeSummary,
  useMensalidadeReceivedHistory, useMensalidadeReceivedTotal,
  nextBillingDate, formatMonthLabel, RENEWAL_LABEL,
  type ActiveSubscription, type MensalidadeReceivedMonth,
} from "@/lib/hooks/use-subscriptions";
import { useClientsFinancialSummary, useFaturamentoTotalByClient } from "@/lib/hooks/use-client-summary";
import { useCompanies } from "@/lib/hooks/use-companies";
import { useUpdateProject, useProjects } from "@/lib/hooks/use-projects";
import { useUser, useOrgUsers } from "@/lib/hooks/use-user";
import { useGoal } from "@/lib/hooks/use-goals";
import {
  useCompanyPartners, useCreateCompanyPartner, useUpdateCompanyPartner, useDeleteCompanyPartner,
  type CompanyPartner,
} from "@/lib/hooks/use-company-partners";
import {
  usePartnerAdvances, useCreatePartnerAdvance, useDeletePartnerAdvance, type PartnerAdvance,
} from "@/lib/hooks/use-partner-advances";
import { useProjectProfitSummary } from "@/lib/hooks/use-project-profit";
import { useCashFlowForecast } from "@/lib/hooks/use-cash-flow-forecast";
import {
  usePartnerPayments,
  useCreatePartnerPayment,
  useUpdatePartnerPayment,
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
  const [faturamentoTotalBreakdownOpen, setFaturamentoTotalBreakdownOpen] = useState(false);
  const [receitasMesBreakdownOpen, setReceitasMesBreakdownOpen] = useState(false);
  const [aReceberMesBreakdownOpen, setAReceberMesBreakdownOpen] = useState(false);
  const [despesasMesBreakdownOpen, setDespesasMesBreakdownOpen] = useState(false);
  const [saldoBreakdownOpen, setSaldoBreakdownOpen] = useState(false);
  const [createPaymentOpen, setCreatePaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PartnerPaymentWithRelations | undefined>();
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
  const [revProjectId, setRevProjectId] = useState("__none__");
  const [revPaidAt, setRevPaidAt] = useState("");

  // Expense form state
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState<"infraestrutura" | "saas" | "marketing" | "pessoal" | "imposto" | "outro">("outro");
  const [expValue, setExpValue] = useState("");
  const [expDueDate, setExpDueDate] = useState("");
  const [expStatus, setExpStatus] = useState<"pendente" | "pago" | "atrasado">("pendente");
  const [expRecurrence, setExpRecurrence] = useState<"pontual" | "mensal" | "trimestral" | "anual">("pontual");
  const [expType, setExpType] = useState<"" | "fixo" | "variavel">("");
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCompany | undefined>();
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<"all" | "fixo" | "variavel">("all");
  const [expIsRecurringTemplate, setExpIsRecurringTemplate] = useState(false);
  const [expCompanyId, setExpCompanyId] = useState("__none__");
  const [expBillingDay, setExpBillingDay] = useState("");
  const [expContractStart, setExpContractStart] = useState("");
  const [expContractEnd, setExpContractEnd] = useState("");

  const { user } = useUser();
  useEnsureMonthlyBilling();
  useEnsureMonthlyFixedExpenses();
  const { data: totalRevenuesAllTime = 0 } = useTotalRevenues();
  const { data: activeSubscriptions = [], isLoading: subscriptionsLoading } = useActiveSubscriptions();
  const { data: mensalidadeHistory = [] } = useMensalidadeReceivedHistory();
  const { data: mensalidadeReceivedTotal = 0 } = useMensalidadeReceivedTotal();
  const [mensalidadeMonthDetail, setMensalidadeMonthDetail] = useState<MensalidadeReceivedMonth | undefined>();

  // Sócios — distribuição de lucros
  const { data: companyPartners = [] } = useCompanyPartners();
  const { data: orgUsersList = [] } = useOrgUsers();
  const createPartner = useCreateCompanyPartner();
  const updatePartner = useUpdateCompanyPartner();
  const deletePartner = useDeleteCompanyPartner();
  const [managePartnersOpen, setManagePartnersOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<CompanyPartner | undefined>();
  const [deletingPartner, setDeletingPartner] = useState<CompanyPartner | undefined>();
  const [partnerMode, setPartnerMode] = useState<"manual" | "user">("manual");
  const [partnerUserId, setPartnerUserId] = useState("__none__");
  const [partnerName, setPartnerName] = useState("");
  const [partnerDistributionType, setPartnerDistributionType] = useState<"percentage" | "fixed_value">("percentage");
  const [partnerPct, setPartnerPct] = useState("");
  const [partnerFixedValue, setPartnerFixedValue] = useState("");
  const totalPartnerPct = companyPartners
    .filter((p) => p.distribution_type === "percentage")
    .reduce((s, p) => s + Number(p.percentage ?? 0), 0);

  // Adiantamentos por sócio
  const { data: partnerAdvances = [] } = usePartnerAdvances();
  const createAdvance = useCreatePartnerAdvance();
  const deleteAdvance = useDeletePartnerAdvance();
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [deletingAdvance, setDeletingAdvance] = useState<PartnerAdvance | undefined>();
  const [advancePartnerId, setAdvancePartnerId] = useState("__none__");
  const [advanceProjectId, setAdvanceProjectId] = useState("__none__");
  const [advanceValue, setAdvanceValue] = useState("");
  const [advanceDate, setAdvanceDate] = useState("");
  const [advanceDesc, setAdvanceDesc] = useState("");
  const advancesByPartner = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of partnerAdvances) map.set(a.partner_id, (map.get(a.partner_id) ?? 0) + Number(a.value));
    return map;
  }, [partnerAdvances]);

  // Lucro por projeto (recebido - custos, all-time, só o que já foi pago de
  // fato) + quanto já foi distribuído aos sócios daquele projeto especificamente
  const { data: projectProfitMap = new Map<string, { projectId: string; recebido: number; custos: number }>() } = useProjectProfitSummary();
  const distributedByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of partnerAdvances) {
      if (!a.project_id) continue;
      map.set(a.project_id, (map.get(a.project_id) ?? 0) + Number(a.value));
    }
    return map;
  }, [partnerAdvances]);

  // Recebido no mês selecionado — separado do "Valor no Mês" (que é só o
  // cálculo teórico em cima do %). É a soma real do que cada sócio retirou
  // no mês, registrada como adiantamento com a data dentro do período.
  const advancesByPartnerMonth = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const map = new Map<string, number>();
    for (const a of partnerAdvances) {
      if (!a.date || !a.date.startsWith(prefix)) continue;
      map.set(a.partner_id, (map.get(a.partner_id) ?? 0) + Number(a.value));
    }
    return map;
  }, [partnerAdvances, year, month]);

  const openAddPartner = () => {
    setEditingPartner(undefined);
    setPartnerMode("manual");
    setPartnerUserId("__none__");
    setPartnerName("");
    setPartnerDistributionType("percentage");
    setPartnerPct("");
    setPartnerFixedValue("");
  };
  const openEditPartner = (p: CompanyPartner) => {
    setEditingPartner(p);
    setPartnerMode(p.user_id ? "user" : "manual");
    setPartnerUserId(p.user_id ?? "__none__");
    setPartnerName(p.name);
    setPartnerDistributionType(p.distribution_type);
    setPartnerPct(p.percentage?.toString() ?? "");
    setPartnerFixedValue(p.fixed_value?.toString() ?? "");
  };
  const handleSavePartner = async () => {
    if (!user) return;
    const resolvedName = partnerMode === "user"
      ? orgUsersList.find((u) => u.id === partnerUserId)?.full_name ?? ""
      : partnerName.trim();
    if (partnerMode === "user" && partnerUserId === "__none__") { toast.error("Selecione o sócio."); return; }
    if (!resolvedName) { toast.error("Preencha o nome."); return; }
    const resolvedUserId = partnerMode === "user" && partnerUserId !== "__none__" ? partnerUserId : null;

    let pct: number | null = null;
    let fixedValue: number | null = null;
    if (partnerDistributionType === "percentage") {
      pct = parseFloat(partnerPct.replace(",", "."));
      if (isNaN(pct) || pct <= 0 || pct > 100) { toast.error("Percentual inválido — use um número entre 0 e 100."); return; }
    } else {
      fixedValue = parseCurrencyInput(partnerFixedValue);
      if (isNaN(fixedValue) || fixedValue <= 0) { toast.error("Valor fixo inválido."); return; }
    }

    const payload = {
      name: resolvedName,
      user_id: resolvedUserId,
      distribution_type: partnerDistributionType,
      percentage: pct,
      fixed_value: fixedValue,
    };
    if (editingPartner) {
      await updatePartner.mutateAsync({ id: editingPartner.id, ...payload });
    } else {
      await createPartner.mutateAsync({ org_id: user.org_id, ...payload });
    }
    openAddPartner();
  };

  const openCreateAdvance = (projectId?: string) => {
    setAdvancePartnerId("__none__");
    setAdvanceProjectId(projectId ?? "__none__");
    setAdvanceValue("");
    setAdvanceDate(new Date().toISOString().slice(0, 10));
    setAdvanceDesc("");
    setAdvanceDialogOpen(true);
  };
  const handleSaveAdvance = async () => {
    if (!user) return;
    if (advancePartnerId === "__none__" || !advanceValue) { toast.error("Selecione o sócio e o valor."); return; }
    const parsedValue = parseCurrencyInput(advanceValue);
    if (isNaN(parsedValue) || parsedValue <= 0) { toast.error("Valor inválido."); return; }
    await createAdvance.mutateAsync({
      org_id: user.org_id,
      partner_id: advancePartnerId,
      project_id: advanceProjectId !== "__none__" ? advanceProjectId : null,
      description: advanceDesc.trim() || null,
      value: parsedValue,
      date: advanceDate || new Date().toISOString().slice(0, 10),
      notes: null,
    });
    setAdvanceDialogOpen(false);
  };
  const { data: mensalidadeSummary = [] } = useClientMensalidadeSummary();
  const { data: clientsSummary = [] } = useClientsFinancialSummary();
  const { data: faturamentoTotalByClient = [] } = useFaturamentoTotalByClient();
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

  const { data: companiesList = [] } = useCompanies();
  const totalMonthlyRecurring = activeSubscriptions.reduce((s, p) => s + Number(p.billing_amount ?? 0), 0);
  const totalImplementacaoReceber = clientsSummary.reduce((s, c) => s + c.implementacaoReceber, 0);
  const totalImplementacaoRecebida = clientsSummary.reduce((s, c) => s + c.implementacaoRecebida, 0);
  const entradaTotal = totalImplementacaoRecebida + mensalidadeReceivedTotal;
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

  const projectProfitList = useMemo(() => {
    return projects
      .map((p) => {
        const entry = projectProfitMap.get(p.id);
        if (!entry) return null;
        const lucro = entry.recebido - entry.custos;
        const distribuido = distributedByProject.get(p.id) ?? 0;
        return {
          projectId: p.id,
          projectName: p.name,
          companyName: p.company?.name ?? null,
          recebido: entry.recebido,
          custos: entry.custos,
          lucro,
          distribuido,
          saldoDisponivel: lucro - distribuido,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && (x.recebido > 0 || x.custos > 0))
      .sort((a, b) => b.saldoDisponivel - a.saldoDisponivel);
  }, [projects, projectProfitMap, distributedByProject]);

  // Previsão por cliente: junta implementação, mensalidade, parcelas e custo
  // de infra dos projetos — tudo que já existe em hooks separados, num lugar só.
  const clientForecast = useMemo(() => {
    type Row = {
      companyId: string; companyName: string;
      implementacaoReceber: number; implementacaoRecebida: number;
      mensalidadeAtiva: number; parcelasRestantes: number; parcelasRestantesValue: number;
      custoSetup: number; custoMensal: number;
    };
    const map = new Map<string, Row>();
    const getRow = (companyId: string, companyName: string) => {
      if (!map.has(companyId)) {
        map.set(companyId, {
          companyId, companyName,
          implementacaoReceber: 0, implementacaoRecebida: 0,
          mensalidadeAtiva: 0, parcelasRestantes: 0, parcelasRestantesValue: 0,
          custoSetup: 0, custoMensal: 0,
        });
      }
      return map.get(companyId)!;
    };

    for (const c of clientsSummary) {
      const row = getRow(c.companyId, c.companyName);
      row.implementacaoReceber += c.implementacaoReceber;
      row.implementacaoRecebida += c.implementacaoRecebida;
    }
    for (const c of clientInstallmentsSummary) {
      const row = getRow(c.companyId, c.companyName);
      row.parcelasRestantes += c.remainingCount;
      row.parcelasRestantesValue += c.remainingValue;
    }
    for (const s of mensalidadeSummary) {
      const row = getRow(s.companyId, s.companyName);
      row.mensalidadeAtiva += s.billingAmount;
    }
    for (const p of projects) {
      if (!p.company_id) continue;
      const row = map.get(p.company_id);
      if (!row) continue; // custo de projeto sem receita/mensalidade ainda não entra na visão
      row.custoSetup += Number(p.infra_setup_cost ?? 0);
      if (p.billing_status === "ativo") row.custoMensal += Number(p.infra_monthly_cost ?? 0);
    }

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        totalPrevisto: r.implementacaoReceber + r.mensalidadeAtiva,
      }))
      .sort((a, b) => b.totalPrevisto - a.totalPrevisto);
  }, [clientsSummary, clientInstallmentsSummary, mensalidadeSummary, projects]);

  const { data: partnerPayments = [], isLoading: paymentsLoading } = usePartnerPayments();

  // Resumo por recebedor + projeto: quantas parcelas já foram pagas, quantas
  // restam, e a data do próximo pagamento pendente.
  const partnerPaymentsSummary = useMemo(() => {
    type Row = {
      recipientName: string; recipientType: string; projectName: string | null;
      paidCount: number; pendingCount: number; paidValue: number; pendingValue: number;
      nextDueDate: string | null;
    };
    const map = new Map<string, Row>();
    for (const p of partnerPayments) {
      const key = `${p.recipient_name}__${p.project_id ?? "none"}`;
      if (!map.has(key)) {
        map.set(key, {
          recipientName: p.recipient_name, recipientType: p.recipient_type,
          projectName: p.project?.name ?? null,
          paidCount: 0, pendingCount: 0, paidValue: 0, pendingValue: 0, nextDueDate: null,
        });
      }
      const row = map.get(key)!;
      if (p.status === "pago") {
        row.paidCount += 1;
        row.paidValue += Number(p.amount);
      } else if (p.status !== "cancelado") {
        row.pendingCount += 1;
        row.pendingValue += Number(p.amount);
        if (p.due_date && (!row.nextDueDate || p.due_date < row.nextDueDate)) row.nextDueDate = p.due_date;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.pendingValue - a.pendingValue);
  }, [partnerPayments]);
  const createPayment = useCreatePartnerPayment();
  const updatePayment = useUpdatePartnerPayment();
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
  const { data: upcomingFixedExpenses = [] } = useUpcomingFixedExpenses();
  const { data: recurringTemplates = [] } = useRecurringExpenseTemplates();
  const { data: revenuesLastMonths = {} } = useRevenuesLastMonths(year, month, 6);
  const { data: revenuesForwardMonths = {} } = useRevenuesForwardMonths(year, month, 6);
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
    // Receita sem due_date nunca aparece em nenhuma tela (Receitas, gráficos,
    // Faturamento Total etc. filtram tudo por mês/vencimento) — se ficar em
    // branco numa receita já paga, usa a data de recebimento como vencimento
    // também, senão ela é salva no banco mas nunca aparece em lugar nenhum.
    const resolvedPaidAt = revStatus === "pago" ? (revPaidAt || new Date().toISOString().slice(0, 10)) : null;
    const resolvedDueDate = revDueDate || resolvedPaidAt || null;
    await createRevenue.mutateAsync({
      org_id: user.org_id,
      description: revDesc,
      category: revCategory,
      value: parsedValue,
      status: revStatus,
      due_date: resolvedDueDate,
      business_unit: "intelligence",
      recurrence: revRecurrence,
      company_id: revCompanyId !== "__none__" ? revCompanyId : null,
      contact_id: null, proposal_id: null,
      project_id: revProjectId !== "__none__" ? revProjectId : null,
      payment_method: null, installment: null,
      paid_at: resolvedPaidAt,
    });
    setCreateRevenueOpen(false);
    setRevDesc(""); setRevValue(""); setRevDueDate(""); setRevCompanyId("__none__");
    setRevProjectId("__none__"); setRevPaidAt("");
    setRevCategory("consultoria"); setRevStatus("pendente"); setRevRecurrence("pontual");
  };

  const resetExpenseForm = () => {
    setExpDesc(""); setExpValue(""); setExpDueDate("");
    setExpCategory("outro"); setExpStatus("pendente"); setExpRecurrence("pontual"); setExpType("");
    setExpIsRecurringTemplate(false); setExpCompanyId("__none__");
    setExpBillingDay(""); setExpContractStart(""); setExpContractEnd("");
  };

  const openCreateExpense = () => {
    resetExpenseForm();
    setEditingExpense(undefined);
    setCreateExpenseOpen(true);
  };

  const openCreateRecurringExpense = () => {
    resetExpenseForm();
    setExpIsRecurringTemplate(true);
    setExpRecurrence("mensal");
    setEditingExpense(undefined);
    setCreateExpenseOpen(true);
  };

  const openEditExpense = (exp: ExpenseWithCompany) => {
    setExpDesc(exp.description);
    setExpCategory(exp.category);
    setExpValue(exp.value.toString());
    setExpDueDate(exp.due_date ?? "");
    setExpStatus(exp.status);
    setExpRecurrence(exp.recurrence);
    setExpType(exp.expense_type ?? "");
    setExpIsRecurringTemplate(exp.is_recurring_template);
    setExpCompanyId(exp.company_id ?? "__none__");
    setExpBillingDay(exp.billing_day?.toString() ?? "");
    setExpContractStart(exp.contract_start ?? "");
    setExpContractEnd(exp.contract_end ?? "");
    setEditingExpense(exp);
    setCreateExpenseOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sessão não carregada ainda — recarregue a página e tente de novo."); return; }
    if (!expDesc || !expValue) { toast.error("Preencha descrição e valor."); return; }
    const parsedValue = parseCurrencyInput(expValue);
    if (isNaN(parsedValue)) { toast.error("Valor inválido — use um número, ex: 1500,00."); return; }
    if (expIsRecurringTemplate && expCompanyId === "__none__") {
      toast.error("Selecione o cliente pra uma despesa recorrente vinculada a cliente.");
      return;
    }
    const sharedFields = {
      description: expDesc,
      category: expCategory,
      value: parsedValue,
      status: expStatus,
      recurrence: expIsRecurringTemplate ? "mensal" as const : expRecurrence,
      expense_type: expType || null,
      company_id: expCompanyId !== "__none__" ? expCompanyId : null,
      billing_day: expIsRecurringTemplate && expBillingDay ? parseInt(expBillingDay) : null,
      contract_start: expIsRecurringTemplate ? (expContractStart || null) : null,
      contract_end: expIsRecurringTemplate ? (expContractEnd || null) : null,
      is_recurring_template: expIsRecurringTemplate,
      due_date: expIsRecurringTemplate ? null : (expDueDate || null),
    };
    if (editingExpense) {
      await updateExpense.mutateAsync({ id: editingExpense.id, ...sharedFields });
    } else {
      await createExpense.mutateAsync({
        org_id: user.org_id,
        ...sharedFields,
        project_id: null,
        paid_at: null,
        template_id: null,
      });
    }
    setCreateExpenseOpen(false);
    setEditingExpense(undefined);
    resetExpenseForm();
  };

  const openEditPayment = (p: PartnerPaymentWithRelations) => {
    setEditingPayment(p);
    setPayType(p.recipient_type);
    setPayName(p.recipient_name);
    setPayProjectId(p.project_id ?? "__none__");
    setPayDesc(p.description);
    setPayAmount(String(p.amount));
    setPayDueDate(p.due_date ?? "");
    setCreatePaymentOpen(true);
  };

  const resetPaymentForm = () => {
    setEditingPayment(undefined);
    setPayType("desenvolvedor"); setPayName(""); setPayProjectId("__none__");
    setPayDesc(""); setPayAmount(""); setPayDueDate("");
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sessão não carregada ainda — recarregue a página e tente de novo."); return; }
    if (!payName || !payDesc || !payAmount) { toast.error("Preencha nome, descrição e valor."); return; }
    const parsedAmount = parseCurrencyInput(payAmount);
    if (isNaN(parsedAmount)) { toast.error("Valor inválido — use um número, ex: 1500,00."); return; }
    if (editingPayment) {
      await updatePayment.mutateAsync({
        id: editingPayment.id,
        recipient_type: payType,
        recipient_name: payName,
        project_id: payProjectId !== "__none__" ? payProjectId : null,
        description: payDesc,
        amount: parsedAmount,
        due_date: payDueDate || null,
      });
    } else {
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
    }
    setCreatePaymentOpen(false);
    resetPaymentForm();
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

  // 6 meses pra frente a partir do mês selecionado — usado nos gráficos de
  // previsibilidade (Implementação, Mensalidade), que olham pro futuro
  const monthsForward = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: monthsShort[d.getMonth()] };
    });
  }, [year, month]);

  // Projeção de pagamentos a parceiros/devs — parcelas pendentes/atrasadas
  // com vencimento dentro de cada um dos 6 meses a partir do selecionado,
  // separadas por tipo (parceiro comercial x desenvolvedor)
  const partnerPaymentsForecast = useMemo(() => {
    const forecastable = partnerPayments.filter((p) => p.status !== "pago" && p.status !== "cancelado" && p.due_date);
    return monthsForward.map((m) => {
      const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
      const monthPayments = forecastable.filter((p) => p.due_date!.startsWith(key));
      const parceiro = monthPayments.filter((p) => p.recipient_type === "parceiro").reduce((s, p) => s + Number(p.amount), 0);
      const desenvolvedor = monthPayments.filter((p) => p.recipient_type === "desenvolvedor").reduce((s, p) => s + Number(p.amount), 0);
      return { name: m.label, parceiro, desenvolvedor, total: parceiro + desenvolvedor };
    });
  }, [monthsForward, partnerPayments]);

  const totalRevenues = revenues.reduce((s, r) => s + r.value, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.value, 0);
  const paidRevenues = revenues.filter((r) => r.status === "pago").reduce((s, r) => s + r.value, 0);
  const pendingRevenues = revenues.filter((r) => r.status === "pendente" || r.status === "atrasado").reduce((s, r) => s + r.value, 0);
  const paidExpenses = expenses.filter((e) => e.status === "pago").reduce((s, e) => s + e.value, 0);
  // Saldo é caixa real: só conta receita já recebida e despesa já paga, não
  // o que ainda está pendente de nenhum dos dois lados (antes só a receita
  // seguia essa regra — despesa pendente entrava inteira, subtraindo caixa
  // que ainda nem tinha saído de fato).
  const balance = paidRevenues - paidExpenses;

  // Implementação do mês selecionado (sem ser acumulado all-time) — previsibilidade
  const aReceberNoMes = revenues
    .filter((r) => r.category === "projeto" && (r.status === "pendente" || r.status === "atrasado"))
    .reduce((s, r) => s + r.value, 0);
  const implementacaoPorMes = useMemo(() => {
    return monthsForward.map((m) => {
      const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
      const monthRevenues = (revenuesForwardMonths[key] ?? []).filter((r) => r.category === "projeto");
      return {
        name: m.label,
        recebido: monthRevenues.filter((r) => r.status === "pago").reduce((s, r) => s + r.value, 0),
        aReceber: monthRevenues.filter((r) => r.status === "pendente" || r.status === "atrasado").reduce((s, r) => s + r.value, 0),
      };
    });
  }, [monthsForward, revenuesForwardMonths]);

  // Previsão de mensalidade mês a mês, a partir do mês selecionado — soma
  // do que está ativo (contract_end descontado) + o que ainda é previsão
  // (projetos "sem_mensalidade" com data prevista de 1ª cobrança já dentro
  // do mês, usando o valor cadastrado como mensalidade prevista)
  const mensalidadeForecast = useMemo(() => {
    return monthsForward.map((m) => {
      const monthEnd = new Date(m.year, m.month, 0);
      const ativa = activeSubscriptions.reduce((s, sub) => {
        const startOk = !sub.contract_start || new Date(sub.contract_start) <= monthEnd;
        const endOk = !sub.contract_end || new Date(sub.contract_end) >= monthEnd;
        return startOk && endOk ? s + Number(sub.billing_amount ?? 0) : s;
      }, 0);
      const prevista = upcomingMensalidades.reduce((s, { project: p, predicted }) => {
        const startedByThen = predicted <= monthEnd;
        const endOk = !p.contract_end || new Date(p.contract_end) >= monthEnd;
        return startedByThen && endOk ? s + Number(p.billing_amount ?? 0) : s;
      }, 0);
      return { name: m.label, ativa, prevista, total: ativa + prevista };
    });
  }, [monthsForward, activeSubscriptions, upcomingMensalidades]);

  const expensesToPayValue = expenses.filter((e) => e.status !== "pago").reduce((s, e) => s + e.value, 0);
  const expensesToPayCount = expenses.filter((e) => e.status !== "pago").length;
  const filteredExpenses = expenses.filter((e) => expenseTypeFilter === "all" || e.expense_type === expenseTypeFilter);

  // Previsto (tudo que venceu/vence no mês, qualquer status) x Realizado (só o pago)
  const revenuePrevistoPct = totalRevenues > 0 ? Math.min(100, (paidRevenues / totalRevenues) * 100) : 0;

  // Previsão x meta comercial: ritmo atual extrapolado pro resto do mês
  const { data: currentGoal } = useGoal(year, month);
  const daysInSelectedMonth = new Date(year, month, 0).getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInSelectedMonth;
  const projectedMonthEnd = daysElapsed > 0 ? (paidRevenues / daysElapsed) * daysInSelectedMonth : 0;

  const { data: cashFlowForecast = [] } = useCashFlowForecast(3);


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

  const periodBadge = (
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
  );

  return (
    <div className="space-y-6">
      {/* Sub-navegação: telas separadas por área do Financeiro */}
      <Tabs defaultValue="visao-geral">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="implementacao">Implementação</TabsTrigger>
          <TabsTrigger value="mensalidade">Mensalidade</TabsTrigger>
          <TabsTrigger value="receitas-despesas">Receitas &amp; Despesas</TabsTrigger>
          <TabsTrigger value="parceiros">Parceiros & Devs ({pendingPayments.length})</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="lucro-distribuicao">Lucro e Distribuição</TabsTrigger>
        </TabsList>

        {/* ══════════════════ VISÃO GERAL ══════════════════ */}
        <TabsContent value="visao-geral" className="mt-4 space-y-6">
          {periodBadge}

          {/* Resumo do mês selecionado */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Resumo de {months[month - 1]} / {year}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Receitas Recebidas (mês)"
                value={formatCurrency(paidRevenues)}
                icon={TrendingUp}
                onClick={() => setReceitasMesBreakdownOpen(true)}
              />
              <StatCard
                label="A Receber (mês)"
                value={formatCurrency(pendingRevenues)}
                icon={Clock}
                onClick={() => setAReceberMesBreakdownOpen(true)}
              />
              <StatCard
                label="Despesas (mês)"
                value={formatCurrency(totalExpenses)}
                icon={TrendingDown}
                onClick={() => setDespesasMesBreakdownOpen(true)}
              />
              <StatCard label="Saldo" value={formatCurrency(balance)} icon={DollarSign} onClick={() => setSaldoBreakdownOpen(true)} />
            </div>
          </div>

          {/* Entrada total: implementação + mensalidade, todos os períodos */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Entrada Total (todos os períodos)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard size="sm" label="Implementação Recebida" value={formatCurrency(totalImplementacaoRecebida)} icon={Wallet} />
              <StatCard size="sm" label="Mensalidade Recebida" value={formatCurrency(mensalidadeReceivedTotal)} icon={Wallet} />
              <StatCard size="sm" label="Entrada Total (Implementação + Mensalidade)" value={formatCurrency(entradaTotal)} icon={DollarSign} />
            </div>
          </div>

          {/* Fluxo de caixa futuro */}
          {cashFlowForecast.length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
            >
              <div className="mb-4">
                <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Fluxo de Caixa — O Que Vem Pela Frente</h3>
                <p className="text-xs" style={{ color: "#7BA3C6" }}>
                  Mês atual + próximos 2 · barras sólidas são lançamentos reais, as mais claras são projeção (mensalidades e despesas fixas sem lançamento ainda)
                </p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cashFlowForecast} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" />
                  <XAxis dataKey="label" tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="receitasReais" name="Receita Real" stackId="rec" fill="#22c55e" radius={[0,0,0,0]} maxBarSize={40} />
                  <Bar dataKey="receitasProjetadas" name="Receita Projetada" stackId="rec" fill="#22c55e" fillOpacity={0.35} radius={[4,4,0,0]} maxBarSize={40} />
                  <Bar dataKey="despesasReais" name="Despesa Real" stackId="desp" fill="#ef4444" radius={[0,0,0,0]} maxBarSize={40} />
                  <Bar dataKey="despesasProjetadas" name="Despesa Projetada" stackId="desp" fill="#ef4444" fillOpacity={0.35} radius={[4,4,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {cashFlowForecast.map((m) => (
                  <div key={m.month} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: "#E2EBF8" }}>{m.label}</p>
                    <p className="text-[11px]" style={{ color: "#7BA3C6" }}>Saldo previsto</p>
                    <p className="text-sm font-bold" style={{ color: m.saldoPrevisto >= 0 ? "#22c55e" : "#ef4444" }}>
                      {formatCurrency(m.saldoPrevisto)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </TabsContent>

        {/* ══════════════════ IMPLEMENTAÇÃO ══════════════════ */}
        <TabsContent value="implementacao" className="mt-4 space-y-6">
          {periodBadge}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Implementação
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                size="sm"
                label="Faturamento Total"
                value={formatCurrency(totalRevenuesAllTime)}
                icon={Wallet}
                onClick={() => setFaturamentoTotalBreakdownOpen(true)}
              />
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

          {/* Implementação do mês selecionado (previsibilidade, sem ser acumulado) */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Previsibilidade — {months[month - 1]} / {year}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <StatCard size="sm" label="A Receber no Mês" value={formatCurrency(aReceberNoMes)} icon={Building2} />
              <StatCard
                size="sm"
                label="Recebido no Mês (implementação)"
                value={formatCurrency(revenues.filter((r) => r.category === "projeto" && r.status === "pago").reduce((s, r) => s + r.value, 0))}
                icon={Building2}
              />
            </div>
            <div
              className="rounded-xl p-5"
              style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
            >
              <div className="mb-4">
                <h4 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Implementação por Mês</h4>
                <p className="text-xs" style={{ color: "#7BA3C6" }}>
                  {months[month - 1]}/{year} + próximos 5 meses — recebido vs a receber
                </p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={implementacaoPorMes} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" />
                  <XAxis dataKey="name" tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="recebido" name="Recebido" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={40} />
                  <Bar dataKey="aReceber" name="A Receber" fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

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
                          {inst.payment_method && (
                            <span className="block text-[10px]" style={{ color: "#7BA3C6" }}>
                              {PAYMENT_METHOD_LABEL[inst.payment_method]}
                            </span>
                          )}
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

        {/* ══════════════════ MENSALIDADE ══════════════════ */}
        <TabsContent value="mensalidade" className="mt-4 space-y-4">
          {periodBadge}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Mensalidade
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                size="sm"
                label={`Mensalidades Acumuladas (${activeSubscriptions.length})`}
                value={formatCurrency(totalMonthlyRecurring)}
                icon={TrendingUp}
                onClick={() => setMensalidadesBreakdownOpen(true)}
              />
              <StatCard
                size="sm"
                label="Total Recebido em Mensalidades (todos os períodos)"
                value={formatCurrency(mensalidadeReceivedTotal)}
                icon={Wallet}
              />
            </div>
          </div>

          {/* Previsão de mensalidades ativas */}
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
          >
            <div className="mb-4">
              <h4 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Previsão de Mensalidade Ativa</h4>
              <p className="text-xs" style={{ color: "#7BA3C6" }}>
                {months[month - 1]}/{year} + próximos 5 meses — ativa (já cobrando) + prevista (clientes ainda &quot;sem mensalidade&quot; com previsão de 1ª cobrança)
              </p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mensalidadeForecast} margin={{ top: 24, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" />
                <XAxis dataKey="name" tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: "#7BA3C6" }}
                />
                <Bar dataKey="ativa" name="Mensalidade Ativa" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={32}>
                  <LabelList
                    dataKey="ativa"
                    position="top"
                    formatter={(v: React.ReactNode) => (Number(v) > 0 ? formatCurrency(Number(v)) : "")}
                    style={{ fill: "#22c55e", fontSize: 10, fontWeight: 600 }}
                  />
                </Bar>
                <Bar dataKey="prevista" name="Mensalidade Prevista" fill="#0B87C3" radius={[4,4,0,0]} maxBarSize={32}>
                  <LabelList
                    dataKey="prevista"
                    position="top"
                    formatter={(v: React.ReactNode) => (Number(v) > 0 ? formatCurrency(Number(v)) : "")}
                    style={{ fill: "#0B87C3", fontSize: 10, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
              {mensalidadeForecast.map((m) => (
                <div key={m.name} className="rounded-lg p-2 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-[10px]" style={{ color: "#7BA3C6" }}>{m.name}</p>
                  <p className="text-xs font-semibold" style={{ color: "#E2EBF8" }}>{formatCurrency(m.total)}</p>
                  <p className="text-[10px] mt-0.5">
                    <span style={{ color: "#22c55e" }}>{formatCurrency(m.ativa)}</span>
                    {m.prevista > 0 && <span style={{ color: "#0B87C3" }}> +{formatCurrency(m.prevista)}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mensalidades recebidas por mês */}
          {mensalidadeHistory.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                <h4 className="text-sm font-semibold" style={{ color: "#E2EBF8" }}>Mensalidades Recebidas por Mês</h4>
                <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>Clique num mês pra ver quais clientes pagaram</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Mês</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Clientes</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Total Recebido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensalidadeHistory.map((m) => (
                    <TableRow
                      key={m.month}
                      style={{ borderColor: "rgba(11,135,195,0.06)", cursor: "pointer" }}
                      onClick={() => setMensalidadeMonthDetail(m)}
                    >
                      <TableCell className="text-sm capitalize" style={{ color: "#E2EBF8" }}>{formatMonthLabel(m.month)}</TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>{m.items.length}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-green-400">{formatCurrency(m.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

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
                  Prazo de entrega + 30 dias de período de teste, para projetos que ainda não têm mensalidade ativa — total previsto: {" "}
                  <b style={{ color: "#E2EBF8" }}>
                    {formatCurrency(upcomingMensalidades.reduce((s, { project: p }) => s + Number(p.billing_amount ?? 0), 0))}
                  </b>
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Projeto</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Empresa</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Valor da Mensalidade</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Previsão 1ª Mensalidade</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Tempo de Contrato</TableHead>
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
                      <TableCell className="text-right text-sm font-semibold" style={{ color: p.billing_amount ? "#22c55e" : "#3D5A78" }}>
                        {p.billing_amount ? formatCurrency(Number(p.billing_amount)) : "Não definido"}
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "#E2EBF8" }}>
                        {formatDate(predicted.toISOString())}
                        {overridden && <span className="ml-1.5 text-[10px]" style={{ color: "#7BA3C6" }}>(ajustada)</span>}
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>
                        {p.contract_end ? `até ${formatDate(p.contract_end)}` : "Não definido"}
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

        <TabsContent value="receitas-despesas" className="mt-4 space-y-4">
          {periodBadge}
          {/* Fluxo de Caixa (compartilhado entre receitas e despesas) */}
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
          >
            <div className="mb-4">
              <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Fluxo de Caixa</h3>
              <p className="text-xs" style={{ color: "#7BA3C6" }}>Receitas vs Despesas — últimos 6 meses</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cashFlowData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" />
                <XAxis dataKey="name" tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={40} />
                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Tabs defaultValue="receitas">
            <TabsList>
              <TabsTrigger value="receitas">Receitas ({revenues.length})</TabsTrigger>
              <TabsTrigger value="despesas">Despesas ({expenses.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="receitas" className="mt-4 space-y-4">
              {/* Previsto x Realizado + projeção vs meta comercial */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div
                  className="rounded-xl p-5"
                  style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
                >
                  <h3 className="font-semibold text-sm mb-1" style={{ color: "#E2EBF8" }}>Previsto x Realizado</h3>
                  <p className="text-xs mb-3" style={{ color: "#7BA3C6" }}>Receitas do mês: o que venceu vs o que já caiu</p>
                  <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "#7BA3C6" }}>
                    <span>Realizado: <b style={{ color: "#22c55e" }}>{formatCurrency(paidRevenues)}</b></span>
                    <span>Previsto: <b style={{ color: "#E2EBF8" }}>{formatCurrency(totalRevenues)}</b></span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${revenuePrevistoPct}%`, background: revenuePrevistoPct >= 100 ? "#22c55e" : "#0B87C3" }} />
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: "#3D5A78" }}>{revenuePrevistoPct.toFixed(0)}% do previsto já realizado</p>
                </div>

                <div
                  className="rounded-xl p-5"
                  style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
                >
                  <h3 className="font-semibold text-sm mb-1" style={{ color: "#E2EBF8" }}>Previsão vs Meta Comercial</h3>
                  {!currentGoal ? (
                    <p className="text-xs mt-3" style={{ color: "#3D5A78" }}>
                      Nenhuma meta definida pra {months[month - 1]}. Defina em Dashboard → Visão Geral.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs mb-3" style={{ color: "#7BA3C6" }}>
                        No ritmo atual de recebimento, a projeção pro fim do mês é:
                      </p>
                      <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "#7BA3C6" }}>
                        <span>Projeção: <b style={{ color: projectedMonthEnd >= currentGoal.revenue_target ? "#22c55e" : "#F59E0B" }}>{formatCurrency(projectedMonthEnd)}</b></span>
                        <span>Meta: <b style={{ color: "#E2EBF8" }}>{formatCurrency(currentGoal.revenue_target)}</b></span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${currentGoal.revenue_target > 0 ? Math.min(100, (projectedMonthEnd / currentGoal.revenue_target) * 100) : 0}%`,
                            background: projectedMonthEnd >= currentGoal.revenue_target ? "#22c55e" : "#F59E0B",
                          }}
                        />
                      </div>
                      <p className="text-[11px] mt-1.5" style={{ color: "#3D5A78" }}>
                        Baseado em {formatCurrency(paidRevenues)} recebidos em {daysElapsed} de {daysInSelectedMonth} dias do mês
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Status das Receitas */}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={revStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                          {revStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5">
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
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
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

            <TabsContent value="despesas" className="mt-4 space-y-4">
          {/* Despesas do mês: A Pagar / Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              size="sm"
              label={`Despesas do Mês — A Pagar (${expensesToPayCount})`}
              value={formatCurrency(expensesToPayValue)}
              icon={TrendingDown}
              onClick={() => setDespesasMesBreakdownOpen(true)}
            />
            <StatCard
              size="sm"
              label="Despesas do Mês — Pago"
              value={formatCurrency(paidExpenses)}
              icon={TrendingDown}
              onClick={() => setDespesasMesBreakdownOpen(true)}
            />
          </div>

          {/* Despesas por Categoria */}
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

          {/* Previsão de pagamento das despesas fixas */}
          {upcomingFixedExpenses.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                <h4 className="text-sm font-semibold" style={{ color: "#E2EBF8" }}>
                  Previsão de Pagamento — Despesas Fixas ({upcomingFixedExpenses.length})
                </h4>
                <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>
                  Todas as despesas marcadas como fixas, pendentes ou atrasadas, independente do mês selecionado acima
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Descrição</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Valor</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Vencimento</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingFixedExpenses.map((exp) => {
                    const overdue = exp.due_date && exp.status !== "pago" && new Date(exp.due_date) < new Date();
                    return (
                      <TableRow key={exp.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                        <TableCell className="text-sm" style={{ color: "#E2EBF8" }}>{exp.description}</TableCell>
                        <TableCell><span className="text-sm font-semibold text-red-400">{formatCurrency(exp.value)}</span></TableCell>
                        <TableCell>
                          <span className={`text-sm ${overdue ? "text-red-400 font-medium" : ""}`} style={{ color: overdue ? undefined : "#7BA3C6" }}>
                            {exp.due_date ? formatDate(exp.due_date) : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (expenseStatusStyles[exp.status] ?? "bg-white/5 text-gray-400")}>
                            {exp.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Despesas recorrentes vinculadas a cliente */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between gap-2" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
              <div>
                <h4 className="text-sm font-semibold" style={{ color: "#E2EBF8" }}>Despesas Recorrentes de Clientes</h4>
                <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>
                  Ex: VPS de um cliente — o lançamento do mês é gerado sozinho, no dia de cobrança configurado
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={openCreateRecurringExpense}>
                <Plus size={14} className="mr-1" />Nova Recorrente
              </Button>
            </div>
            {recurringTemplates.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: "#3D5A78" }}>Nenhuma despesa recorrente de cliente cadastrada.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Descrição</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Cliente</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Valor</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Dia de Cobrança</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Contrato</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringTemplates.map((tpl) => {
                    const contractEnded = tpl.contract_end && new Date(tpl.contract_end) < new Date();
                    return (
                      <TableRow key={tpl.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                        <TableCell className="text-sm" style={{ color: "#E2EBF8" }}>{tpl.description}</TableCell>
                        <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>{tpl.company?.name ?? "—"}</TableCell>
                        <TableCell><span className="text-sm font-semibold text-red-400">{formatCurrency(tpl.value)}</span></TableCell>
                        <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>{tpl.billing_day ? `Dia ${tpl.billing_day}` : "—"}</TableCell>
                        <TableCell className="text-sm" style={{ color: contractEnded ? "#ef4444" : "#7BA3C6" }}>
                          {tpl.contract_start ? formatDate(tpl.contract_start) : "—"}
                          {tpl.contract_end ? ` até ${formatDate(tpl.contract_end)}` : " (sem prazo)"}
                          {contractEnded && <span className="block text-[10px]">Contrato encerrado</span>}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-primary" onClick={() => openEditExpense(tpl)}>
                            <Pencil size={13} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1 rounded-lg p-1" style={{ background: "rgba(11,135,195,0.05)", border: "1px solid rgba(11,135,195,0.15)" }}>
              {([
                { value: "all", label: "Todas" },
                { value: "fixo", label: "Fixas" },
                { value: "variavel", label: "Variáveis" },
              ] as const).map((f) => (
                <button
                  key={f.value}
                  onClick={() => setExpenseTypeFilter(f.value)}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={expenseTypeFilter === f.value ? { background: "var(--primary)", color: "#fff" } : { color: "#7BA3C6" }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExportExpenses} disabled={expenses.length === 0}>
                <Download size={14} className="mr-1" />Exportar planilha
              </Button>
              <Button size="sm" style={{ background: "var(--primary)" }} onClick={openCreateExpense}><Plus size={14} className="mr-1" />Nova Despesa</Button>
            </div>
          </div>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            {expLoading ? <div className="p-8 text-center text-sm" style={{ color: "#7BA3C6" }}>Carregando...</div> : filteredExpenses.length === 0 ? <div className="p-8 text-center text-sm" style={{ color: "#3D5A78" }}>Nenhuma despesa encontrada.</div> : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Descrição</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Categoria</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Tipo</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Valor</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Vencimento</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Status</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((exp) => (
                    <TableRow key={exp.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                      <TableCell className="font-medium text-sm" style={{ color: "#E2EBF8" }}>{exp.description}</TableCell>
                      <TableCell><span className="text-xs capitalize" style={{ color: "#7BA3C6" }}>{exp.category}</span></TableCell>
                      <TableCell>
                        {exp.expense_type ? (
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(11,135,195,0.12)", color: "#0CA8F5" }}>
                            {exp.expense_type === "fixo" ? "Fixa" : "Variável"}
                          </span>
                        ) : <span className="text-xs" style={{ color: "#3D5A78" }}>—</span>}
                      </TableCell>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-primary" onClick={() => openEditExpense(exp)}>
                            <Pencil size={13} />
                          </Button>
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
        </TabsContent>

        {/* ══════════════════ PARCEIROS & DEVS ══════════════════ */}
        <TabsContent value="parceiros" className="mt-4 space-y-4">
          {periodBadge}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              size="sm"
              label={`A Pagar — Parceiros/Devs (${pendingPayments.length})`}
              value={formatCurrency(totalPendingPayments)}
              icon={Users}
            />
          </div>

          {/* Projeção de pagamentos a Parceiros/Devs */}
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
          >
            <div className="mb-4">
              <h4 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Projeção de Pagamentos — Parceiros/Devs</h4>
              <p className="text-xs" style={{ color: "#7BA3C6" }}>
                {months[month - 1]}/{year} + próximos 5 meses — pendente/atrasado por vencimento, separado por tipo
              </p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={partnerPaymentsForecast} margin={{ top: 24, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,135,195,0.08)" />
                <XAxis dataKey="name" tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#7BA3C6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ fontSize: 12, color: "#7BA3C6" }} />
                <Bar dataKey="desenvolvedor" name="Desenvolvedor" fill="#8B5CF6" radius={[4,4,0,0]} maxBarSize={32}>
                  <LabelList dataKey="desenvolvedor" position="top" formatter={(v: React.ReactNode) => (Number(v) > 0 ? formatCurrency(Number(v)) : "")} style={{ fill: "#8B5CF6", fontSize: 10, fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="parceiro" name="Parceiro Comercial" fill="#0CA8F5" radius={[4,4,0,0]} maxBarSize={32}>
                  <LabelList dataKey="parceiro" position="top" formatter={(v: React.ReactNode) => (Number(v) > 0 ? formatCurrency(Number(v)) : "")} style={{ fill: "#0CA8F5", fontSize: 10, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {pendingPayments.filter((p) => !p.due_date).length > 0 && (
              <p className="text-[11px] mt-2" style={{ color: "#7BA3C6" }}>
                {formatCurrency(pendingPayments.filter((p) => !p.due_date).reduce((s, p) => s + Number(p.amount), 0))}{" "}
                em pagamentos pendentes sem vencimento definido não entram nessa projeção.
              </p>
            )}
          </div>

          {/* Resumo por desenvolvedor/parceiro + projeto */}
          {partnerPaymentsSummary.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                <h4 className="text-sm font-semibold" style={{ color: "#E2EBF8" }}>Resumo por Recebedor e Projeto</h4>
                <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>Quantas parcelas já foram pagas, quantas faltam, e a data do próximo pagamento</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Recebedor</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Projeto</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-center">Pagas</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-center">Restantes</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Próximo Vencimento</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Valor Restante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerPaymentsSummary.map((row) => (
                    <TableRow key={`${row.recipientName}__${row.projectName ?? "none"}`} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                      <TableCell className="text-sm font-medium" style={{ color: "#E2EBF8" }}>
                        {row.recipientName}
                        <span className="block text-[10px] font-normal" style={{ color: "#7BA3C6" }}>
                          {RECIPIENT_TYPE_LABEL[row.recipientType as "parceiro" | "desenvolvedor"]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>{row.projectName ?? "—"}</TableCell>
                      <TableCell className="text-center text-sm text-green-400">{row.paidCount}</TableCell>
                      <TableCell className="text-center text-sm" style={{ color: row.pendingCount > 0 ? "#F59E0B" : "#7BA3C6" }}>{row.pendingCount}</TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>{row.nextDueDate ? formatDate(row.nextDueDate) : "—"}</TableCell>
                      <TableCell className="text-right text-sm font-semibold" style={{ color: "#E2EBF8" }}>{formatCurrency(row.pendingValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end mb-3">
            <Button size="sm" style={{ background: "var(--primary)" }} onClick={() => { resetPaymentForm(); setCreatePaymentOpen(true); }}>
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
                            <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: "#7BA3C6" }} onClick={() => openEditPayment(p)}>
                              <Pencil size={13} />
                            </Button>
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

        {/* ══════════════════ CLIENTES ══════════════════ */}
        <TabsContent value="clientes" className="mt-4 space-y-4">
          {periodBadge}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
              <h4 className="text-sm font-semibold" style={{ color: "#E2EBF8" }}>Previsão por Cliente</h4>
              <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>
                Custos, recebimento e previsão de cada cliente, tudo num lugar
              </p>
            </div>
            {clientForecast.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: "#3D5A78" }}>Nenhum cliente com dado financeiro ainda.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Cliente</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Implementação a Receber</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Implementação Recebida</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Mensalidade Ativa</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-center">Parcelas Restantes</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Custo (setup + mensal)</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Previsão Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientForecast.map((c) => (
                    <TableRow key={c.companyId} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                      <TableCell className="text-sm font-medium" style={{ color: "#E2EBF8" }}>{c.companyName}</TableCell>
                      <TableCell className="text-right text-sm" style={{ color: "#F59E0B" }}>{formatCurrency(c.implementacaoReceber)}</TableCell>
                      <TableCell className="text-right text-sm text-green-400">{formatCurrency(c.implementacaoRecebida)}</TableCell>
                      <TableCell className="text-right text-sm" style={{ color: "#E2EBF8" }}>{formatCurrency(c.mensalidadeAtiva)}</TableCell>
                      <TableCell className="text-center text-sm" style={{ color: "#7BA3C6" }}>
                        {c.parcelasRestantes > 0 ? `${c.parcelasRestantes} (${formatCurrency(c.parcelasRestantesValue)})` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-red-400">
                        {c.custoSetup + c.custoMensal > 0 ? formatCurrency(c.custoSetup + c.custoMensal) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold" style={{ color: "#E2EBF8" }}>{formatCurrency(c.totalPrevisto)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════ LUCRO E DISTRIBUIÇÃO ══════════════════ */}
        <TabsContent value="lucro-distribuicao" className="mt-4 space-y-4">
          {periodBadge}
          {/* Distribuição de Lucros por Sócio */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Distribuição de Lucros por Sócio</h3>
                <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>
                  Sobre o Saldo de {months[month - 1]} / {year}: <b style={{ color: balance >= 0 ? "#22c55e" : "#ef4444" }}>{formatCurrency(balance)}</b>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { openAddPartner(); setManagePartnersOpen(true); }}>
                <Pencil size={13} className="mr-1.5" />Gerenciar Sócios
              </Button>
            </div>
            {companyPartners.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: "#3D5A78" }}>
                Nenhum sócio cadastrado ainda. Clique em <b>Gerenciar Sócios</b> pra definir o % de cada um.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                      <TableHead style={{ color: "#7BA3C6" }}>Sócio</TableHead>
                      <TableHead style={{ color: "#7BA3C6" }} className="text-center">Distribuição</TableHead>
                      <TableHead style={{ color: "#7BA3C6" }} className="text-right">Previsto no Mês</TableHead>
                      <TableHead style={{ color: "#7BA3C6" }} className="text-right">Recebido no Mês</TableHead>
                      <TableHead style={{ color: "#7BA3C6" }} className="text-right">Adiantado (total)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyPartners.map((p) => {
                      const previsto = p.distribution_type === "fixed_value"
                        ? Number(p.fixed_value ?? 0)
                        : balance * (Number(p.percentage ?? 0) / 100);
                      return (
                        <TableRow key={p.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                          <TableCell className="text-sm font-medium" style={{ color: "#E2EBF8" }}>{p.name}</TableCell>
                          <TableCell className="text-center text-sm" style={{ color: "#7BA3C6" }}>
                            {p.distribution_type === "fixed_value" ? (
                              <span>Fixo — {formatCurrency(Number(p.fixed_value ?? 0))}</span>
                            ) : (
                              <span>{Number(p.percentage ?? 0).toFixed(1)}%</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm" style={{ color: previsto >= 0 ? "#22c55e" : "#ef4444" }}>
                            {formatCurrency(previsto)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold" style={{ color: (advancesByPartnerMonth.get(p.id) ?? 0) > 0 ? "#0B87C3" : "#3D5A78" }}>
                            {formatCurrency(advancesByPartnerMonth.get(p.id) ?? 0)}
                          </TableCell>
                          <TableCell className="text-right text-sm" style={{ color: (advancesByPartner.get(p.id) ?? 0) > 0 ? "#F59E0B" : "#3D5A78" }}>
                            {formatCurrency(advancesByPartner.get(p.id) ?? 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {totalPartnerPct > 0 && Math.abs(totalPartnerPct - 100) > 0.01 && (
                  <div className="px-5 py-2.5 text-xs" style={{ color: "#F59E0B", borderTop: "1px solid rgba(11,135,195,0.1)" }}>
                    ⚠ Os sócios por percentual somam {totalPartnerPct.toFixed(1)}%, não 100%. Ajuste em &quot;Gerenciar Sócios&quot;.
                    {companyPartners.some((p) => p.distribution_type === "fixed_value") && " (sócios de valor fixo não entram nessa soma)"}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Lucro por Projeto */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
              <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Lucro por Projeto</h3>
              <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>
                Recebido − custos (despesas e comissões pagas) de cada projeto, all-time. Distribuir aqui abate do saldo daquele projeto — quando zera, não sobra mais lucro pra dividir dele.
              </p>
              {companyPartners.length === 0 && (
                <p className="text-xs mt-2 px-2.5 py-1.5 rounded" style={{ color: "#F59E0B", background: "rgba(245,158,11,0.1)" }}>
                  ⚠ O botão &quot;Distribuir&quot; só libera depois de cadastrar pelo menos um sócio em{" "}
                  <button
                    type="button"
                    className="underline font-medium"
                    onClick={() => { openAddPartner(); setManagePartnersOpen(true); }}
                  >
                    Gerenciar Sócios
                  </button>.
                </p>
              )}
            </div>
            {projectProfitList.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: "#3D5A78" }}>
                Nenhum projeto com receita ou custo lançado ainda.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Projeto</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Recebido</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Custos</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Lucro</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Distribuído</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Saldo Disponível</TableHead>
                    <TableHead className="w-[110px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectProfitList.map((row) => (
                    <TableRow key={row.projectId} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                      <TableCell className="text-sm font-medium" style={{ color: "#E2EBF8" }}>
                        <Link href={`/projects/${row.projectId}?tab=financeiro`} className="hover:underline text-[#0B87C3]">
                          {row.projectName}
                        </Link>
                        {row.companyName && <span className="block text-[10px] font-normal" style={{ color: "#7BA3C6" }}>{row.companyName}</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm text-green-400">{formatCurrency(row.recebido)}</TableCell>
                      <TableCell className="text-right text-sm text-red-400">{formatCurrency(row.custos)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold" style={{ color: row.lucro >= 0 ? "#22c55e" : "#ef4444" }}>
                        {formatCurrency(row.lucro)}
                      </TableCell>
                      <TableCell className="text-right text-sm" style={{ color: row.distribuido > 0 ? "#0B87C3" : "#3D5A78" }}>
                        {formatCurrency(row.distribuido)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold" style={{ color: row.saldoDisponivel > 0 ? "#F59E0B" : "#3D5A78" }}>
                        {row.saldoDisponivel > 0 ? formatCurrency(row.saldoDisponivel) : "Sem saldo"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={row.saldoDisponivel <= 0 || companyPartners.length === 0}
                          onClick={() => openCreateAdvance(row.projectId)}
                          title={
                            companyPartners.length === 0
                              ? "Cadastre um sócio em \"Gerenciar Sócios\" primeiro"
                              : row.saldoDisponivel <= 0
                              ? "Sem saldo disponível pra distribuir desse projeto"
                              : undefined
                          }
                        >
                          Distribuir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Adiantamentos por Sócio */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Adiantamentos por Sócio</h3>
                <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>Valores já retirados por cada sócio, pra abater da distribuição</p>
              </div>
              <Button size="sm" style={{ background: "var(--primary)" }} onClick={() => openCreateAdvance()} disabled={companyPartners.length === 0}>
                <Plus size={14} className="mr-1.5" />Novo Adiantamento
              </Button>
            </div>
            {partnerAdvances.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: "#3D5A78" }}>
                Nenhum adiantamento registrado ainda.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                    <TableHead style={{ color: "#7BA3C6" }}>Sócio</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Descrição</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Projeto</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }}>Data</TableHead>
                    <TableHead style={{ color: "#7BA3C6" }} className="text-right">Valor</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerAdvances.map((a) => (
                    <TableRow key={a.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                      <TableCell className="text-sm" style={{ color: "#E2EBF8" }}>
                        {companyPartners.find((p) => p.id === a.partner_id)?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>{a.description ?? "—"}</TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>
                        {a.project_id ? (projects.find((p) => p.id === a.project_id)?.name ?? "—") : "—"}
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>{formatDate(a.date)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold" style={{ color: "#F59E0B" }}>{formatCurrency(Number(a.value))}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeletingAdvance(a)}>
                          <Trash2 size={13} />
                        </Button>
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
            <div className="space-y-1.5">
              <Label>Projeto (opcional)</Label>
              <Select value={revProjectId} onValueChange={setRevProjectId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {projects
                    .filter((p) => revCompanyId === "__none__" || p.company_id === revCompanyId)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[11px]" style={{ color: "#7BA3C6" }}>
                Vincular a um projeto (categoria Projeto + status Pago) já abate do valor a receber do projeto
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
                {revStatus === "pago" && (
                  <p className="text-[11px]" style={{ color: "#7BA3C6" }}>Em branco, usa a data de recebimento</p>
                )}
              </div>
            </div>
            {revStatus === "pago" && (
              <div className="space-y-1.5">
                <Label>Data de Recebimento</Label>
                <Input type="date" value={revPaidAt} onChange={(e) => setRevPaidAt(e.target.value)} placeholder="Hoje, se em branco" />
              </div>
            )}
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

      {/* Create/Edit Expense Dialog */}
      <Dialog open={createExpenseOpen} onOpenChange={(v) => { if (!v) { setCreateExpenseOpen(false); setEditingExpense(undefined); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            <DialogDescription>
              {editingExpense ? "Atualize os dados dessa saída financeira" : "Registre uma nova saída financeira"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveExpense} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Ex: Servidor AWS mensal" required />
            </div>

            <label className="flex items-start gap-2.5 rounded-lg border border-border p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={expIsRecurringTemplate}
                onChange={(e) => {
                  setExpIsRecurringTemplate(e.target.checked);
                  if (e.target.checked) setExpRecurrence("mensal");
                }}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-text-primary">Despesa recorrente vinculada a cliente</span>
                <span className="block text-xs text-text-muted mt-0.5">
                  Ex: VPS de um cliente, cobrada todo mês num dia fixo, com prazo de contrato — o sistema gera o lançamento do mês sozinho.
                </span>
              </span>
            </label>

            {expIsRecurringTemplate ? (
              <>
                <div className="space-y-1.5">
                  <Label>Cliente *</Label>
                  <Select value={expCompanyId} onValueChange={setExpCompanyId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecionar cliente</SelectItem>
                      {companiesList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Valor (R$) *</Label>
                    <Input value={expValue} onChange={(e) => setExpValue(e.target.value)} placeholder="0,00" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Dia de cobrança</Label>
                    <Input type="number" min={1} max={31} value={expBillingDay} onChange={(e) => setExpBillingDay(e.target.value)} placeholder="10" />
                  </div>
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
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Início do contrato</Label>
                    <Input type="date" value={expContractStart} onChange={(e) => setExpContractStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fim do contrato (opcional)</Label>
                    <Input type="date" value={expContractEnd} onChange={(e) => setExpContractEnd(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={expType || "__none__"} onValueChange={(v) => setExpType(v === "__none__" ? "" : (v as "fixo" | "variavel"))}>
                    <SelectTrigger><SelectValue placeholder="Não classificada" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Não classificada</SelectItem>
                      <SelectItem value="fixo">Fixa</SelectItem>
                      <SelectItem value="variavel">Variável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
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
                <div className="grid grid-cols-2 gap-3">
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
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={expType || "__none__"} onValueChange={(v) => setExpType(v === "__none__" ? "" : (v as "fixo" | "variavel"))}>
                      <SelectTrigger><SelectValue placeholder="Não classificada" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não classificada</SelectItem>
                        <SelectItem value="fixo">Fixa</SelectItem>
                        <SelectItem value="variavel">Variável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setCreateExpenseOpen(false); setEditingExpense(undefined); }}>Cancelar</Button>
              <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending} style={{ background: "var(--primary)" }}>
                {editingExpense ? "Salvar Alterações" : "Salvar Despesa"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Partner/Dev Payment Dialog */}
      <Dialog open={createPaymentOpen} onOpenChange={(v) => { if (!v) { setCreatePaymentOpen(false); resetPaymentForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Editar Pagamento" : "Novo Pagamento"}</DialogTitle>
            <DialogDescription>
              {editingPayment ? "Atualize os dados desse pagamento" : "Registre uma comissão ou pagamento a parceiro/desenvolvedor"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePayment} className="space-y-4 mt-2">
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
              <Button type="button" variant="outline" onClick={() => { setCreatePaymentOpen(false); resetPaymentForm(); }}>Cancelar</Button>
              <Button type="submit" disabled={createPayment.isPending || updatePayment.isPending} style={{ background: "var(--primary)" }}>
                {editingPayment ? "Salvar Alterações" : "Salvar Pagamento"}
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

      {/* ─── DIALOG: Gerenciar Sócios ─── */}
      <Dialog open={managePartnersOpen} onOpenChange={setManagePartnersOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Sócios</DialogTitle>
            <DialogDescription>
              Defina o percentual de lucro de cada sócio. {totalPartnerPct > 0 && `Soma atual: ${totalPartnerPct.toFixed(1)}%.`}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[40vh] overflow-y-auto space-y-2">
            {companyPartners.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">Nenhum sócio cadastrado ainda.</p>
            ) : (
              companyPartners.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {p.distribution_type === "fixed_value"
                        ? `Fixo — ${formatCurrency(Number(p.fixed_value ?? 0))}/mês`
                        : `${Number(p.percentage ?? 0).toFixed(1)}%`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPartner(p)}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeletingPartner(p)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex gap-1 rounded-lg p-1 w-fit" style={{ background: "rgba(11,135,195,0.05)", border: "1px solid rgba(11,135,195,0.15)" }}>
              <button
                type="button"
                onClick={() => setPartnerMode("manual")}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={partnerMode === "manual" ? { background: "var(--primary)", color: "#fff" } : { color: "#7BA3C6" }}
              >
                Cadastrar manual
              </button>
              <button
                type="button"
                onClick={() => setPartnerMode("user")}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={partnerMode === "user" ? { background: "var(--primary)", color: "#fff" } : { color: "#7BA3C6" }}
              >
                Selecionar sócio do sistema
              </button>
            </div>

            {partnerMode === "user" ? (
              <div className="space-y-1.5">
                <Label>Sócio</Label>
                <Select value={partnerUserId} onValueChange={setPartnerUserId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecionar...</SelectItem>
                    {orgUsersList.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Nome do sócio</Label>
                <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Ex: Gabriel" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Forma de distribuição</Label>
              <div className="flex gap-1 rounded-lg p-1 w-fit" style={{ background: "rgba(11,135,195,0.05)", border: "1px solid rgba(11,135,195,0.15)" }}>
                <button
                  type="button"
                  onClick={() => setPartnerDistributionType("percentage")}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={partnerDistributionType === "percentage" ? { background: "var(--primary)", color: "#fff" } : { color: "#7BA3C6" }}
                >
                  % do saldo
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerDistributionType("fixed_value")}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={partnerDistributionType === "fixed_value" ? { background: "var(--primary)", color: "#fff" } : { color: "#7BA3C6" }}
                >
                  Valor fixo (R$)
                </button>
              </div>
            </div>

            {partnerDistributionType === "percentage" ? (
              <div className="space-y-1.5 w-32">
                <Label>%</Label>
                <Input value={partnerPct} onChange={(e) => setPartnerPct(e.target.value)} placeholder="33,3" />
              </div>
            ) : (
              <div className="space-y-1.5 w-40">
                <Label>Valor por mês (R$)</Label>
                <Input value={partnerFixedValue} onChange={(e) => setPartnerFixedValue(e.target.value)} placeholder="3000,00" />
              </div>
            )}
          </div>

          <DialogFooter>
            {editingPartner && (
              <Button variant="outline" className="mr-auto" onClick={openAddPartner}>Cancelar edição</Button>
            )}
            <Button
              onClick={handleSavePartner}
              disabled={createPartner.isPending || updatePartner.isPending}
              style={{ background: "var(--primary)" }}
            >
              {editingPartner ? "Salvar Alterações" : "Adicionar Sócio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Novo Adiantamento ─── */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Adiantamento</DialogTitle>
            <DialogDescription>Registre um valor já retirado por um sócio</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Sócio *</Label>
              <Select value={advancePartnerId} onValueChange={setAdvancePartnerId}>
                <SelectTrigger><SelectValue placeholder="Selecionar sócio" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecionar...</SelectItem>
                  {companyPartners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Projeto (opcional)</Label>
              <Select value={advanceProjectId} onValueChange={setAdvanceProjectId}>
                <SelectTrigger><SelectValue placeholder="Nenhum — adiantamento geral" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum — adiantamento geral</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px]" style={{ color: "#7BA3C6" }}>
                Vincular a um projeto abate do saldo disponível do lucro daquele projeto especificamente
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input value={advanceValue} onChange={(e) => setAdvanceValue(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={advanceDesc} onChange={(e) => setAdvanceDesc(e.target.value)} placeholder="Ex: Retirada mensal" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAdvance} disabled={createAdvance.isPending} style={{ background: "var(--primary)" }}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ALERT: Remover Adiantamento ─── */}
      <AlertDialog open={!!deletingAdvance} onOpenChange={(v) => !v && setDeletingAdvance(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover adiantamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O adiantamento de <strong>{formatCurrency(Number(deletingAdvance?.value ?? 0))}</strong> será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => { if (deletingAdvance) { await deleteAdvance.mutateAsync(deletingAdvance.id); setDeletingAdvance(undefined); } }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── ALERT: Remover Sócio ─── */}
      <AlertDialog open={!!deletingPartner} onOpenChange={(v) => !v && setDeletingPartner(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sócio?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletingPartner?.name}</strong> ({Number(deletingPartner?.percentage ?? 0).toFixed(1)}%) será removido da distribuição de lucros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => { if (deletingPartner) { await deletePartner.mutateAsync(deletingPartner.id); setDeletingPartner(undefined); } }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── DIALOG: Detalhe de Mensalidades Recebidas no Mês ─── */}
      <Dialog open={!!mensalidadeMonthDetail} onOpenChange={(v) => !v && setMensalidadeMonthDetail(undefined)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {mensalidadeMonthDetail ? formatMonthLabel(mensalidadeMonthDetail.month) : ""}
            </DialogTitle>
            <DialogDescription>
              Total recebido: <strong>{formatCurrency(mensalidadeMonthDetail?.total ?? 0)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Recebido em</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mensalidadeMonthDetail?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm font-medium text-text-primary">
                      {item.companyName}
                      {item.projectName && <span className="block text-xs text-text-muted font-normal">{item.projectName}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-text-muted">{formatDate(item.paidAt)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-green-500">{formatCurrency(item.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* ─── DIALOG: Faturamento Total por Cliente ─── */}
      <Dialog open={faturamentoTotalBreakdownOpen} onOpenChange={setFaturamentoTotalBreakdownOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Faturamento Total por Cliente</DialogTitle>
            <DialogDescription>
              Total acumulado: <strong>{formatCurrency(totalRevenuesAllTime)}</strong> — todas as receitas já pagas, de todos os tipos
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {faturamentoTotalByClient.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Nenhum faturamento registrado ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Faturado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faturamentoTotalByClient.map((c) => (
                    <TableRow key={c.companyId}>
                      <TableCell className="text-sm font-medium text-text-primary">{c.companyName}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-green-500">
                        {formatCurrency(c.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Composição do Saldo ─── */}
      <Dialog open={saldoBreakdownOpen} onOpenChange={setSaldoBreakdownOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>De onde vem o Saldo — {months[month - 1]} / {year}</DialogTitle>
            <DialogDescription>
              Saldo = Receitas recebidas − Despesas pagas (só o que já entrou/saiu de fato, nada pendente conta)
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            <div className="rounded-lg p-3" style={{ background: "rgba(34,197,94,0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-green-500">+ Receitas Recebidas</p>
                <p className="text-sm font-bold text-green-500">{formatCurrency(paidRevenues)}</p>
              </div>
              {revenues.filter((r) => r.status === "pago").length === 0 ? (
                <p className="text-xs text-text-muted">Nenhuma receita recebida neste mês.</p>
              ) : (
                <div className="space-y-1">
                  {revenues.filter((r) => r.status === "pago").map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="text-text-muted truncate mr-2">{r.description}</span>
                      <span className="text-text-primary whitespace-nowrap">{formatCurrency(r.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-red-500">− Despesas Pagas</p>
                <p className="text-sm font-bold text-red-500">{formatCurrency(paidExpenses)}</p>
              </div>
              {expenses.filter((e) => e.status === "pago").length === 0 ? (
                <p className="text-xs text-text-muted">Nenhuma despesa paga neste mês.</p>
              ) : (
                <div className="space-y-1">
                  {expenses.filter((e) => e.status === "pago").map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs">
                      <span className="text-text-muted truncate mr-2">{e.description}</span>
                      <span className="text-text-primary whitespace-nowrap">{formatCurrency(e.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-sm font-semibold text-text-primary">= Saldo</p>
              <p className="text-base font-bold" style={{ color: balance >= 0 ? "#22c55e" : "#ef4444" }}>
                {formatCurrency(balance)}
              </p>
            </div>
            {(pendingRevenues > 0 || expensesToPayValue > 0) && (
              <p className="text-[11px] text-text-muted">
                Não entram aqui: {formatCurrency(pendingRevenues)} de receitas ainda a receber e {formatCurrency(expensesToPayValue)} de despesas ainda a pagar neste mês.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Receitas Recebidas do Mês ─── */}
      <Dialog open={receitasMesBreakdownOpen} onOpenChange={setReceitasMesBreakdownOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Receitas Recebidas — {months[month - 1]} / {year}</DialogTitle>
            <DialogDescription>
              Total: <strong>{formatCurrency(paidRevenues)}</strong> — só o que já caiu na conta
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {revenues.filter((r) => r.status === "pago").length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Nenhuma receita recebida neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenues.filter((r) => r.status === "pago").map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium text-text-primary">{r.description}</TableCell>
                      <TableCell className="text-sm text-text-muted">{r.paid_at ? formatDate(r.paid_at) : "—"}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-green-500">{formatCurrency(r.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: A Receber no Mês ─── */}
      <Dialog open={aReceberMesBreakdownOpen} onOpenChange={setAReceberMesBreakdownOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>A Receber — {months[month - 1]} / {year}</DialogTitle>
            <DialogDescription>
              Total: <strong>{formatCurrency(pendingRevenues)}</strong> — pendente ou atrasado, ainda não conta no recebido
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {revenues.filter((r) => r.status === "pendente" || r.status === "atrasado").length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Nada pendente neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenues.filter((r) => r.status === "pendente" || r.status === "atrasado").map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium text-text-primary">{r.description}</TableCell>
                      <TableCell className="text-sm text-text-muted">{r.due_date ? formatDate(r.due_date) : "—"}</TableCell>
                      <TableCell className="text-sm">
                        <span className={r.status === "atrasado" ? "text-red-500" : "text-amber-500"}>
                          {r.status === "atrasado" ? "Atrasado" : "Pendente"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-amber-500">{formatCurrency(r.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Despesas do Mês ─── */}
      <Dialog open={despesasMesBreakdownOpen} onOpenChange={setDespesasMesBreakdownOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Despesas — {months[month - 1]} / {year}</DialogTitle>
            <DialogDescription>
              Total: <strong>{formatCurrency(totalExpenses)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto space-y-4">
            {expenses.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Nenhuma despesa neste mês.</p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                    A Pagar ({expensesToPayCount}) — {formatCurrency(expensesToPayValue)}
                  </p>
                  {expenses.filter((e) => e.status !== "pago").length === 0 ? (
                    <p className="text-sm text-text-muted py-2">Nada pendente neste mês.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.filter((e) => e.status !== "pago").map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="text-sm font-medium text-text-primary">{e.description}</TableCell>
                            <TableCell className="text-sm text-text-muted">{e.due_date ? formatDate(e.due_date) : "—"}</TableCell>
                            <TableCell className="text-sm">
                              <span className={e.status === "atrasado" ? "text-red-500" : "text-amber-500"}>
                                {e.status === "atrasado" ? "Atrasado" : "Pendente"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-amber-500">{formatCurrency(e.value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                    Pago ({expenses.filter((e) => e.status === "pago").length}) — {formatCurrency(paidExpenses)}
                  </p>
                  {expenses.filter((e) => e.status === "pago").length === 0 ? (
                    <p className="text-sm text-text-muted py-2">Nada pago neste mês ainda.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Pago em</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.filter((e) => e.status === "pago").map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="text-sm font-medium text-text-primary">{e.description}</TableCell>
                            <TableCell className="text-sm text-text-muted">{e.paid_at ? formatDate(e.paid_at) : "—"}</TableCell>
                            <TableCell className="text-right text-sm font-semibold text-green-500">{formatCurrency(e.value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
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
