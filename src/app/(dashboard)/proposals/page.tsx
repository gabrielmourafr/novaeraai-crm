"use client";

import { useState, useMemo } from "react";
import { Plus, Search, FileText, Building2, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useProposals, useDeleteProposal, type ProposalWithRelations } from "@/lib/hooks/use-proposals";
import { BUSINESS_UNITS } from "@/lib/utils/constants";

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-white/5 text-gray-400" },
  enviada: { label: "Enviada", className: "bg-blue-950/60 text-blue-300" },
  visualizada: { label: "Visualizada", className: "bg-purple-950/60 text-purple-300" },
  aceita: { label: "Aceita", className: "bg-emerald-100 text-emerald-700" },
  recusada: { label: "Recusada", className: "bg-red-950/60 text-red-300" },
  expirada: { label: "Expirada", className: "bg-amber-100 text-amber-700" },
};

const unitConfig: Record<string, { label: string; className: string }> = {
  labs: { label: "Labs", className: "bg-blue-950/60 text-blue-300" },
  advisory: { label: "Advisory", className: "bg-indigo-100 text-indigo-700" },
  enterprise: { label: "Enterprise", className: "bg-emerald-100 text-emerald-700" },
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function ProposalsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFrente, setFilterFrente] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [deletingProposal, setDeletingProposal] = useState<ProposalWithRelations | undefined>();

  const { data: proposals = [], isLoading } = useProposals();
  const deleteProposal = useDeleteProposal();

  const handleDelete = async () => {
    if (!deletingProposal) return;
    await deleteProposal.mutateAsync(deletingProposal.id);
    setDeletingProposal(undefined);
  };

  // Stats computation
  const stats = useMemo(() => {
    const total = proposals.length;
    const sent = proposals.filter(
      (p) => p.status === "enviada" || p.status === "visualizada"
    ).length;
    const inNegotiation = proposals
      .filter((p) => ["enviada", "visualizada", "aceita"].includes(p.status))
      .reduce((acc, p) => acc + (p.total ?? 0), 0);
    const sentOrViewed = proposals.filter(
      (p) => p.status === "enviada" || p.status === "visualizada" || p.status === "aceita" || p.status === "recusada"
    ).length;
    const accepted = proposals.filter((p) => p.status === "aceita").length;
    const conversionRate = sentOrViewed > 0 ? Math.round((accepted / sentOrViewed) * 100) : 0;
    return { total, sent, inNegotiation, conversionRate };
  }, [proposals]);

  // Available years from proposals
  const years = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach((p) => {
      set.add(new Date(p.created_at).getFullYear().toString());
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [proposals]);

  // Filtered proposals
  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesNumber = p.number.toLowerCase().includes(q);
        const matchesCompany = p.company?.name.toLowerCase().includes(q) ?? false;
        if (!matchesNumber && !matchesCompany) return false;
      }
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterFrente !== "all" && p.business_unit !== filterFrente) return false;
      if (filterMonth !== "all") {
        const month = new Date(p.created_at).getMonth().toString();
        if (month !== filterMonth) return false;
      }
      if (filterYear !== "all") {
        const year = new Date(p.created_at).getFullYear().toString();
        if (year !== filterYear) return false;
      }
      return true;
    });
  }, [proposals, search, filterStatus, filterFrente, filterMonth, filterYear]);

  const isExpiredValidity = (valid_until: string | null) => {
    if (!valid_until) return false;
    return new Date(valid_until) < new Date();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Propostas"
        description="Propostas comerciais enviadas e em andamento"
        action={
          <Button style={{ background: "var(--primary)" }} onClick={() => router.push("/proposals/new")}>
            <Plus size={16} className="mr-2" />
            Nova Proposta
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-5" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Total Propostas</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{stats.total}</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Enviadas</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{stats.sent}</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Em Negociação</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(stats.inNegotiation)}</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Taxa de Conversão</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.conversionRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Número ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
            <SelectItem value="visualizada">Visualizada</SelectItem>
            <SelectItem value="aceita">Aceita</SelectItem>
            <SelectItem value="recusada">Recusada</SelectItem>
            <SelectItem value="expirada">Expirada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterFrente} onValueChange={setFilterFrente}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Frente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as frentes</SelectItem>
            {BUSINESS_UNITS.map((u) => (
              <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-text-muted text-sm">Carregando...</p>
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma proposta encontrada"
          description="Crie sua primeira proposta comercial."
          action={{ label: "Nova Proposta", onClick: () => router.push("/proposals/new") }}
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
          <p className="text-text-muted text-sm">Nenhuma proposta corresponde aos filtros aplicados.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Frente</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((proposal) => {
                const statusCfg = statusConfig[proposal.status] ?? statusConfig.rascunho;
                const unitCfg = unitConfig[proposal.business_unit] ?? { label: proposal.business_unit, className: "bg-white/5 text-gray-400" };
                const expired = isExpiredValidity(proposal.valid_until);
                return (
                  <TableRow
                    key={proposal.id}
                    className="hover:bg-white/5/50 cursor-pointer"
                    onClick={() => router.push(`/proposals/${proposal.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/proposals/${proposal.id}`}
                        className="font-mono text-sm font-medium text-primary hover:underline"
                      >
                        {proposal.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {proposal.company && (
                          <div className="flex items-center gap-1 text-sm text-text-primary">
                            <Building2 size={12} className="text-text-muted" />
                            <span>{proposal.company.name}</span>
                          </div>
                        )}
                        {proposal.lead && (
                          <div className="text-xs text-text-muted">{proposal.lead.title}</div>
                        )}
                        {!proposal.company && !proposal.lead && (
                          <span className="text-sm text-text-muted">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${unitCfg.className}`}>
                        {unitCfg.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(proposal.total)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {proposal.valid_until ? (
                        <span className={`text-sm ${expired && proposal.status !== "aceita" ? "text-danger font-medium" : "text-text-secondary"}`}>
                          {formatDate(proposal.valid_until)}
                          {expired && proposal.status !== "aceita" && (
                            <span className="block text-[10px] text-danger">Expirada</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-text-secondary">
                        {formatDate(proposal.created_at)}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/proposals/${proposal.id}`}>
                            <Eye size={14} />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/proposals/${proposal.id}?edit=true`}>
                            <Pencil size={14} />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-danger hover:text-danger"
                          onClick={() => setDeletingProposal(proposal)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deletingProposal} onOpenChange={(v) => !v && setDeletingProposal(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A proposta{" "}
              <strong>{deletingProposal?.number}</strong> será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-danger hover:bg-danger/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
