"use client";

import { useState, useMemo } from "react";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useRevenues, useExpenses, useDeleteRevenue, useDeleteExpense, useUpdateRevenue, useUpdateExpense, useCreateRevenue, useCreateExpense, type Revenue, type Expense } from "@/lib/hooks/use-finance";
import { useUser } from "@/lib/hooks/use-user";

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

export default function FinancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [deletingRevenue, setDeletingRevenue] = useState<Revenue | undefined>();
  const [deletingExpense, setDeletingExpense] = useState<Expense | undefined>();
  const [createRevenueOpen, setCreateRevenueOpen] = useState(false);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);

  // Revenue form state
  const [revDesc, setRevDesc] = useState("");
  const [revCategory, setRevCategory] = useState<"assinatura" | "consultoria" | "projeto" | "workshop" | "outro">("consultoria");
  const [revValue, setRevValue] = useState("");
  const [revDueDate, setRevDueDate] = useState("");
  const [revStatus, setRevStatus] = useState<"pendente" | "pago" | "atrasado" | "cancelado">("pendente");
  const [revUnit, setRevUnit] = useState<"labs" | "advisory" | "enterprise">("labs");
  const [revRecurrence, setRevRecurrence] = useState<"pontual" | "mensal" | "trimestral" | "anual">("pontual");

  // Expense form state
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState<"infraestrutura" | "saas" | "marketing" | "pessoal" | "imposto" | "outro">("outro");
  const [expValue, setExpValue] = useState("");
  const [expDueDate, setExpDueDate] = useState("");
  const [expStatus, setExpStatus] = useState<"pendente" | "pago" | "atrasado">("pendente");
  const [expRecurrence, setExpRecurrence] = useState<"pontual" | "mensal" | "trimestral" | "anual">("pontual");

  const { user } = useUser();
  const { data: revenues = [], isLoading: revLoading } = useRevenues(year, month);
  const { data: expenses = [], isLoading: expLoading } = useExpenses(year, month);
  const deleteRevenue = useDeleteRevenue();
  const deleteExpense = useDeleteExpense();
  const updateRevenue = useUpdateRevenue();
  const updateExpense = useUpdateExpense();
  const createRevenue = useCreateRevenue();
  const createExpense = useCreateExpense();

  const handleCreateRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revDesc || !revValue || !user) return;
    await createRevenue.mutateAsync({
      org_id: user.org_id,
      description: revDesc,
      category: revCategory,
      value: parseFloat(revValue.replace(",", ".")),
      status: revStatus,
      due_date: revDueDate || null,
      business_unit: revUnit,
      recurrence: revRecurrence,
      company_id: null, contact_id: null, proposal_id: null, project_id: null,
      payment_method: null, installment: null, paid_at: null,
    });
    setCreateRevenueOpen(false);
    setRevDesc(""); setRevValue(""); setRevDueDate("");
    setRevCategory("consultoria"); setRevStatus("pendente"); setRevRecurrence("pontual");
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc || !expValue || !user) return;
    await createExpense.mutateAsync({
      org_id: user.org_id,
      description: expDesc,
      category: expCategory,
      value: parseFloat(expValue.replace(",", ".")),
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

  // Also fetch last 6 months for charts
  const monthsBack = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: monthsShort[d.getMonth()] };
    });
  }, [year, month]);

  const totalRevenues = revenues.reduce((s, r) => s + r.value, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.value, 0);
  const balance = totalRevenues - totalExpenses;
  const paidRevenues = revenues.filter((r) => r.status === "pago").reduce((s, r) => s + r.value, 0);


  // Expense by category for pie
  const expCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + e.value; });
    return Object.entries(map).map(([name, value]) => ({
      name, value, color: EXPENSE_CATEGORY_COLORS[name] ?? "#3D5A78",
    }));
  }, [expenses]);

  // Month-over-month chart data (uses current month data only — real multi-month requires separate fetches)
  const cashFlowData = useMemo(() => {
    return monthsBack.map((m, i) => ({
      name: m.label,
      receitas: i === 5 ? totalRevenues : 0,
      despesas: i === 5 ? totalExpenses : 0,
      saldo: i === 5 ? balance : 0,
    }));
  }, [monthsBack, totalRevenues, totalExpenses, balance]);

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
      <PageHeader title="Financeiro" description="Controle de receitas e despesas" />

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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Receitas (mês)" value={formatCurrency(totalRevenues)} icon={TrendingUp} />
        <StatCard label="Despesas (mês)" value={formatCurrency(totalExpenses)} icon={TrendingDown} />
        <StatCard label="Saldo" value={formatCurrency(balance)} icon={DollarSign} />
        <StatCard label="Recebido" value={formatCurrency(paidRevenues)} icon={TrendingUp} />
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
      <Tabs defaultValue="revenues">
        <TabsList>
          <TabsTrigger value="revenues">Receitas ({revenues.length})</TabsTrigger>
          <TabsTrigger value="expenses">Despesas ({expenses.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="revenues" className="mt-4">
          <div className="flex justify-end mb-3">
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
          <div className="flex justify-end mb-3">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={revUnit} onValueChange={(v) => setRevUnit(v as typeof revUnit)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labs">Nova Era Labs</SelectItem>
                    <SelectItem value="advisory">Nova Era Advisory</SelectItem>
                    <SelectItem value="enterprise">Nova Era Enterprise</SelectItem>
                  </SelectContent>
                </Select>
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
    </div>
  );
}
