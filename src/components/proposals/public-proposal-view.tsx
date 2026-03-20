"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Building2, User, Calendar, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Database } from "@/types/database";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
type ProposalItem = Database["public"]["Tables"]["proposal_items"]["Row"];

interface ProposalData extends Proposal {
  company: { name: string } | null;
  contact: { full_name: string } | null;
  items: ProposalItem[];
}

interface Props {
  id: string;
}

export function PublicProposalView({ id }: Props) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const loadProposal = useCallback(async () => {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("proposals")
      .select(
        `*, company:companies(name), contact:contacts(full_name), items:proposal_items(*)`
      )
      .eq("id", id)
      .single();

    if (err) {
      setError("Proposta não encontrada ou link inválido.");
    } else {
      setProposal(data as ProposalData);
      if ((data as ProposalData).status === "aceita") {
        setAccepted(true);
      }
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  const handleAccept = async () => {
    if (!proposal) return;
    setAccepting(true);

    const supabase = createClient();
    const { error: err } = await supabase
      .from("proposals")
      .update({
        status: "aceita",
        accepted_at: new Date().toISOString(),
        accepted_ip: null,
      })
      .eq("id", proposal.id);

    if (err) {
      setError("Erro ao aceitar a proposta. Tente novamente.");
    } else {
      setAccepted(true);
      setProposal((prev) => prev ? { ...prev, status: "aceita" } : prev);

      // Also record view acceptance
      await supabase.from("proposal_views").insert({
        proposal_id: proposal.id,
        viewed_at: new Date().toISOString(),
        ip: null,
        duration_seconds: null,
      });
    }
    setAccepting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white/5 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#0B87C3]" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-white/5 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link inválido</h1>
          <p className="text-gray-500 text-sm">
            {error ?? "Esta proposta não foi encontrada."}
          </p>
        </div>
      </div>
    );
  }

  const items = proposal.items ?? [];
  const subtotal = items.reduce(
    (acc, item) => acc + item.quantity * item.unit_price * (1 - (item.discount ?? 0) / 100),
    0
  );

  const isExpired =
    proposal.valid_until &&
    new Date(proposal.valid_until) < new Date() &&
    proposal.status !== "aceita";

  return (
    <div className="min-h-screen bg-white/5">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-[#0B87C3]">Nova Era AI</span>
            </div>
            <h1 className="font-mono text-xl font-bold text-gray-900">{proposal.number}</h1>
            <p className="text-sm text-gray-500">Proposta Comercial</p>
          </div>
          {proposal.valid_until && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Válido até</p>
              <p className={`text-sm font-semibold ${isExpired ? "text-red-600" : "text-gray-700"}`}>
                {formatDate(proposal.valid_until)}
              </p>
              {isExpired && (
                <span className="text-xs text-red-500 font-medium">Proposta expirada</span>
              )}
            </div>
          )}
        </div>

        {/* Client Info */}
        {(proposal.company || proposal.contact) && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Destinatário
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposal.company && (
                <div className="flex items-start gap-2">
                  <Building2 size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Empresa</p>
                    <p className="font-semibold text-gray-900">{proposal.company.name}</p>
                  </div>
                </div>
              )}
              {proposal.contact && (
                <div className="flex items-start gap-2">
                  <User size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Contato</p>
                    <p className="font-semibold text-gray-900">{proposal.contact.full_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Data de emissão</p>
                  <p className="font-semibold text-gray-900">{formatDate(proposal.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Itens
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 text-xs text-gray-400 font-medium">
                <th className="text-left px-6 py-3">Item</th>
                <th className="text-center px-4 py-3 w-16">Qtd</th>
                <th className="text-right px-4 py-3 w-32">Valor Unit.</th>
                <th className="text-center px-4 py-3 w-20">Desc.</th>
                <th className="text-right px-6 py-3 w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const sub = item.quantity * item.unit_price * (1 - (item.discount ?? 0) / 100);
                return (
                  <tr key={item.id ?? i} className="border-t border-border">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                    </td>
                    <td className="text-center px-4 py-4 text-sm text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="text-right px-4 py-4 text-sm text-gray-600">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="text-center px-4 py-4 text-sm text-gray-600">
                      {item.discount ?? 0}%
                    </td>
                    <td className="text-right px-6 py-4 font-semibold text-gray-900 text-sm">
                      {formatCurrency(sub)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-border bg-white/5">
              {(proposal.discount ?? 0) > 0 && (
                <>
                  <tr>
                    <td colSpan={4} className="text-right px-6 py-2 text-sm text-gray-500">
                      Subtotal
                    </td>
                    <td className="text-right px-6 py-2 text-sm text-gray-600 font-medium">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="text-right px-6 py-2 text-sm text-red-600">
                      Desconto Global ({proposal.discount}%)
                    </td>
                    <td className="text-right px-6 py-2 text-sm text-red-600 font-medium">
                      - {formatCurrency((subtotal * (proposal.discount ?? 0)) / 100)}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td colSpan={4} className="text-right px-6 py-4 font-bold text-[#0B87C3] text-lg">
                  Total
                </td>
                <td className="text-right px-6 py-4 font-bold text-[#0B87C3] text-lg">
                  {formatCurrency(proposal.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Conditions */}
        {proposal.conditions && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Condições Comerciais
            </h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {proposal.conditions}
            </p>
          </div>
        )}

        {/* Accept Button */}
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          {accepted ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <CheckCircle size={48} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Proposta Aceita!</h3>
              <p className="text-sm text-gray-500">
                Obrigado por aceitar esta proposta. Entraremos em contato em breve.
              </p>
              {proposal.accepted_at && (
                <p className="text-xs text-gray-400">
                  Aceita em {formatDate(proposal.accepted_at)}
                </p>
              )}
            </div>
          ) : isExpired ? (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-700">Proposta Expirada</h3>
              <p className="text-sm text-gray-400">
                O prazo de validade desta proposta já passou. Entre em contato para solicitar uma nova.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Pronto para avançar?</h3>
              <p className="text-sm text-gray-500">
                Ao clicar no botão abaixo, você confirma a aceitação desta proposta comercial.
              </p>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold text-base transition-all disabled:opacity-60 hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg, #0B87C3, #0A78AE)" }}
              >
                {accepting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Aceitar Proposta
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-4">
          <p>Nova Era AI · Proposta gerada em {formatDate(proposal.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
