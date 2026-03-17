"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Send,
  CheckCircle,
  XCircle,
  Link2,
  Building2,
  User,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  useUpdateProposal,
  useAcceptProposal,
  type ProposalWithRelations,
  type Proposal,
} from "@/lib/hooks/use-proposals";

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-white/5 text-gray-400" },
  enviada: { label: "Enviada", className: "bg-blue-950/60 text-blue-300" },
  visualizada: { label: "Visualizada", className: "bg-purple-950/60 text-purple-300" },
  aceita: { label: "Aceita", className: "bg-emerald-100 text-emerald-700" },
  recusada: { label: "Recusada", className: "bg-red-950/60 text-red-300" },
  expirada: { label: "Expirada", className: "bg-amber-100 text-amber-700" },
};

const unitConfig: Record<string, { label: string; className: string }> = {
  labs: { label: "Nova Era Labs", className: "bg-blue-950/60 text-blue-300" },
  advisory: { label: "Nova Era Advisory", className: "bg-indigo-100 text-indigo-700" },
  enterprise: { label: "Nova Era Enterprise", className: "bg-emerald-100 text-emerald-700" },
};

interface Props {
  proposal: ProposalWithRelations;
}

export function ProposalDetail({ proposal }: Props) {
  const router = useRouter();
  const updateProposal = useUpdateProposal();
  const acceptProposal = useAcceptProposal();

  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);

  const statusCfg = statusConfig[proposal.status] ?? statusConfig.rascunho;
  const unitCfg = unitConfig[proposal.business_unit] ?? { label: proposal.business_unit, className: "bg-white/5 text-gray-400" };

  const items = proposal.items ?? [];

  const subtotal = items.reduce((acc, item) => {
    return acc + item.quantity * item.unit_price * (1 - (item.discount ?? 0) / 100);
  }, 0);

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/proposals/${proposal.id}/public`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copiado para a área de transferência!");
    });
  };

  const handleSend = async () => {
    await updateProposal.mutateAsync({ id: proposal.id, status: "enviada" as Proposal["status"] });
    setConfirmSend(false);
    toast.success("Proposta enviada!");
  };

  const handleAccept = async () => {
    await acceptProposal.mutateAsync({ id: proposal.id });
    setConfirmAccept(false);
  };

  const handleDecline = async () => {
    await updateProposal.mutateAsync({ id: proposal.id, status: "recusada" as Proposal["status"] });
    setConfirmDecline(false);
    toast.success("Proposta marcada como recusada.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/proposals")}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold text-text-primary">{proposal.number}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}>
                {statusCfg.label}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${unitCfg.className}`}>
                {unitCfg.label}
              </span>
            </div>
            <p className="text-sm text-text-muted mt-0.5">Proposta Comercial</p>
          </div>
        </div>

        {/* Action buttons depending on status */}
        <div className="flex gap-2">
          {proposal.status === "rascunho" && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/proposals/${proposal.id}?edit=true`)}
              >
                <Pencil size={15} className="mr-2" />
                Editar
              </Button>
              <Button style={{ background: "var(--primary)" }} onClick={() => setConfirmSend(true)}>
                <Send size={15} className="mr-2" />
                Enviar
              </Button>
            </>
          )}

          {(proposal.status === "enviada" || proposal.status === "visualizada") && (
            <>
              <Button variant="outline" onClick={handleCopyPublicLink}>
                <Link2 size={15} className="mr-2" />
                Copiar Link Público
              </Button>
              <Button
                variant="outline"
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={() => setConfirmAccept(true)}
              >
                <CheckCircle size={15} className="mr-2" />
                Marcar como Aceita
              </Button>
              <Button
                variant="outline"
                className="text-red-700 border-red-200 hover:bg-red-50"
                onClick={() => setConfirmDecline(true)}
              >
                <XCircle size={15} className="mr-2" />
                Marcar como Recusada
              </Button>
            </>
          )}

          {proposal.status === "aceita" && (
            <Button
              style={{ background: "var(--primary)" }}
              onClick={() => router.push(`/projects/new?proposalId=${proposal.id}`)}
            >
              <ExternalLink size={15} className="mr-2" />
              Criar Projeto
            </Button>
          )}
        </div>
      </div>

      {/* Proposal Info Card */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {proposal.company && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                <Building2 size={12} />
                <span>Empresa</span>
              </div>
              <p className="text-sm font-semibold text-text-primary">{proposal.company.name}</p>
            </div>
          )}
          {proposal.contact && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                <User size={12} />
                <span>Contato</span>
              </div>
              <p className="text-sm font-semibold text-text-primary">{proposal.contact.full_name}</p>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
              <Calendar size={12} />
              <span>Criado em</span>
            </div>
            <p className="text-sm font-semibold text-text-primary">{formatDate(proposal.created_at)}</p>
          </div>
          {proposal.valid_until && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                <Calendar size={12} />
                <span>Válido até</span>
              </div>
              <p className={`text-sm font-semibold ${
                new Date(proposal.valid_until) < new Date() && proposal.status !== "aceita"
                  ? "text-danger"
                  : "text-text-primary"
              }`}>
                {formatDate(proposal.valid_until)}
              </p>
            </div>
          )}
          {proposal.accepted_at && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                <CheckCircle size={12} />
                <span>Aceito em</span>
              </div>
              <p className="text-sm font-semibold text-emerald-700">{formatDate(proposal.accepted_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Itens da Proposta
          </h2>
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-center text-text-muted text-sm">
            Nenhum item cadastrado.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8FAFC] text-xs text-text-muted font-medium">
                <th className="text-left px-6 py-3">Item</th>
                <th className="text-center px-4 py-3 w-16">Qtd</th>
                <th className="text-right px-4 py-3 w-32">Valor Unit.</th>
                <th className="text-center px-4 py-3 w-20">Desc. %</th>
                <th className="text-right px-6 py-3 w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const sub = item.quantity * item.unit_price * (1 - (item.discount ?? 0) / 100);
                return (
                  <tr key={item.id ?? i} className="border-t border-[#F1F5F9]">
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-primary text-sm">{item.name}</p>
                    </td>
                    <td className="text-center px-4 py-4 text-sm text-text-secondary">
                      {item.quantity}
                    </td>
                    <td className="text-right px-4 py-4 text-sm text-text-secondary">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="text-center px-4 py-4 text-sm text-text-secondary">
                      {item.discount ?? 0}%
                    </td>
                    <td className="text-right px-6 py-4 font-semibold text-text-primary text-sm">
                      {formatCurrency(sub)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-border bg-[#F8FAFC]">
              {(proposal.discount ?? 0) > 0 && (
                <>
                  <tr>
                    <td colSpan={4} className="text-right px-6 py-2 text-sm text-text-secondary">
                      Subtotal
                    </td>
                    <td className="text-right px-6 py-2 text-sm text-text-secondary font-medium">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="text-right px-6 py-2 text-sm text-danger">
                      Desconto Global ({proposal.discount}%)
                    </td>
                    <td className="text-right px-6 py-2 text-sm text-danger font-medium">
                      - {formatCurrency((subtotal * (proposal.discount ?? 0)) / 100)}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td colSpan={4} className="text-right px-6 py-3 font-bold text-primary text-base">
                  Total
                </td>
                <td className="text-right px-6 py-3 font-bold text-primary text-base">
                  {formatCurrency(proposal.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Conditions */}
      {proposal.conditions && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Condições Comerciais
          </h2>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{proposal.conditions}</p>
        </div>
      )}

      {/* Confirm Send */}
      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              A proposta <strong>{proposal.number}</strong> será marcada como enviada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} style={{ background: "var(--primary)" }}>
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Accept */}
      <AlertDialog open={confirmAccept} onOpenChange={setConfirmAccept}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como aceita?</AlertDialogTitle>
            <AlertDialogDescription>
              A proposta <strong>{proposal.number}</strong> será marcada como aceita internamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept} className="bg-emerald-600 hover:bg-emerald-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Decline */}
      <AlertDialog open={confirmDecline} onOpenChange={setConfirmDecline}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como recusada?</AlertDialogTitle>
            <AlertDialogDescription>
              A proposta <strong>{proposal.number}</strong> será marcada como recusada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDecline} className="bg-danger hover:bg-danger/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
