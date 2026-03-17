"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  MessageCircle,
  ExternalLink,
  Pencil,
  TrendingUp,
  Building2,
} from "lucide-react";
import { useContact } from "@/lib/hooks/use-contacts";
import { useCompany } from "@/lib/hooks/use-companies";
import { useLeads } from "@/lib/hooks/use-leads";
import { useActivities } from "@/lib/hooks/use-activities";
import { Timeline } from "@/components/shared/timeline";
import { EmptyState } from "@/components/shared/empty-state";
import { ContactForm } from "@/components/forms/contact-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatInitials } from "@/lib/utils/format";
import { DECISION_ROLES, LEAD_ORIGINS, TEMPERATURES } from "@/lib/utils/constants";
import type { Contact } from "@/lib/hooks/use-contacts";

const getDecisionRoleLabel = (v: string | null) =>
  DECISION_ROLES.find((r) => r.value === v)?.label ?? v ?? "—";

const getOriginLabel = (v: string | null) =>
  LEAD_ORIGINS.find((o) => o.value === v)?.label ?? v ?? "—";

const getTemperatureMeta = (v: string | null) =>
  TEMPERATURES.find((t) => t.value === v);

const temperatureColors: Record<string, string> = {
  frio: "bg-indigo-100 text-indigo-700",
  morno: "bg-amber-100 text-amber-700",
  quente: "bg-red-950/60 text-red-300",
};

function CompanyLink({ companyId }: { companyId: string | null }) {
  const { data: company } = useCompany(companyId ?? "");
  if (!companyId || !company) return <span className="text-[#94A3B8]">—</span>;
  return (
    <a
      href={`/companies/${company.id}`}
      className="text-[#0B87C3] hover:underline text-sm flex items-center gap-1"
    >
      <Building2 size={13} />
      {company.name}
    </a>
  );
}

function InfoDetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] w-28 flex-shrink-0 mt-0.5">
        {label}
      </p>
      <div className="text-sm text-[#0F172A] flex-1">{value}</div>
    </div>
  );
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [editOpen, setEditOpen] = useState(false);

  const { data: contact, isLoading, error } = useContact(id);
  const { data: leads, isLoading: leadsLoading } = useLeads({ contactId: id });
  const { data: activities, isLoading: activitiesLoading } = useActivities("contact", id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Users size={48} className="text-[#94A3B8] mb-4" />
        <h2 className="text-lg font-semibold text-[#0F172A] mb-2">Contato não encontrado</h2>
        <p className="text-sm text-[#94A3B8] mb-6">
          O contato que você está procurando não existe ou foi removido.
        </p>
        <Button onClick={() => router.push("/contacts")} variant="outline">
          <ArrowLeft size={16} className="mr-2" />
          Voltar para Contatos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/contacts")}
        className="flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#0B87C3] transition-colors"
      >
        <ArrowLeft size={15} />
        Contatos
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar 64px */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
            style={{ background: "#0B87C3" }}
          >
            {formatInitials(contact.full_name)}
          </div>

          <div>
            <h1 className="font-bold text-2xl text-[#0F172A] leading-tight">
              {contact.full_name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {contact.job_title && (
                <span className="text-sm text-[#94A3B8]">{contact.job_title}</span>
              )}
              {contact.job_title && contact.company_id && (
                <span className="text-[#94A3B8] text-sm">·</span>
              )}
              {contact.company_id && (
                <CompanyLink companyId={contact.company_id} />
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {contact.origin && (
                <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-blue-950/60 text-blue-300">
                  {getOriginLabel(contact.origin)}
                </span>
              )}
              {contact.decision_role && (
                <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-purple-950/60 text-purple-300">
                  {getDecisionRoleLabel(contact.decision_role)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {contact.phone && (
            <a
              href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <MessageCircle size={14} className="mr-1.5 text-emerald-500" />
                WhatsApp
              </Button>
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`}>
              <Button variant="outline" size="sm">
                <Mail size={14} className="mr-1.5 text-blue-500" />
                E-mail
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil size={14} className="mr-1.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Left: Tabs */}
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <Tabs defaultValue="atividades" className="w-full">
            <div className="border-b border-border px-6 overflow-x-auto">
              <TabsList className="h-12 bg-transparent p-0 gap-0 w-max">
                {(
                  [
                    { value: "atividades", label: "Atividades" },
                    { value: "leads", label: "Leads" },
                    { value: "dados", label: "Dados" },
                  ] as const
                ).map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0B87C3] data-[state=active]:text-[#0B87C3] data-[state=active]:shadow-none text-[#94A3B8] px-4 h-12 text-sm font-medium bg-transparent"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Atividades */}
            <TabsContent value="atividades" className="p-6">
              {activitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="w-3 h-3 rounded-full mt-1 flex-shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Timeline items={activities ?? []} />
              )}
            </TabsContent>

            {/* Leads */}
            <TabsContent value="leads" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  Leads ({leads?.length ?? 0})
                </h3>
              </div>

              {leadsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : !leads?.length ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Nenhum lead"
                  description="Nenhum lead vinculado a este contato."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider pb-2 pr-4">
                          Lead
                        </th>
                        <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider pb-2 pr-4">
                          Empresa
                        </th>
                        <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider pb-2 pr-4">
                          Estágio
                        </th>
                        <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider pb-2 pr-4">
                          Valor
                        </th>
                        <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider pb-2">
                          Temp.
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="border-b border-border last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => router.push(`/leads/${lead.id}`)}
                        >
                          <td className="py-3 pr-4">
                            <p className="font-medium text-[#0F172A]">{lead.title}</p>
                            <p className="text-xs text-[#94A3B8]">
                              {formatDate(lead.created_at)}
                            </p>
                          </td>
                          <td className="py-3 pr-4">
                            {lead.company ? (
                              <span
                                className="text-[#0B87C3] hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/companies/${lead.company!.id}`);
                                }}
                              >
                                {lead.company.name}
                              </span>
                            ) : (
                              <span className="text-[#94A3B8]">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {lead.stage ? (
                              <span
                                className="rounded-md px-2 py-0.5 text-xs font-medium"
                                style={{
                                  background: lead.stage.color
                                    ? `${lead.stage.color}20`
                                    : "#F1F5F9",
                                  color: lead.stage.color ?? "#64748B",
                                }}
                              >
                                {lead.stage.name}
                              </span>
                            ) : (
                              <span className="text-[#94A3B8]">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-[#0F172A]">
                            {lead.value ? formatCurrency(lead.value) : "—"}
                          </td>
                          <td className="py-3">
                            {lead.temperature ? (
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                  temperatureColors[lead.temperature] ??
                                  "bg-white/5 text-slate-600"
                                }`}
                              >
                                {getTemperatureMeta(lead.temperature)?.label ?? lead.temperature}
                              </span>
                            ) : (
                              <span className="text-[#94A3B8]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Dados */}
            <TabsContent value="dados" className="p-6">
              <div className="space-y-1">
                <InfoDetailRow
                  label="E-mail"
                  value={
                    contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-[#0B87C3] hover:underline flex items-center gap-1"
                      >
                        <Mail size={13} />
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-[#94A3B8]">—</span>
                    )
                  }
                />
                <InfoDetailRow
                  label="Telefone"
                  value={
                    contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-[#0F172A] hover:text-[#0B87C3] flex items-center gap-1"
                      >
                        <Phone size={13} />
                        {contact.phone}
                      </a>
                    ) : (
                      <span className="text-[#94A3B8]">—</span>
                    )
                  }
                />
                <InfoDetailRow
                  label="LinkedIn"
                  value={
                    contact.linkedin ? (
                      <a
                        href={contact.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0B87C3] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={13} />
                        Ver perfil
                      </a>
                    ) : (
                      <span className="text-[#94A3B8]">—</span>
                    )
                  }
                />
                <InfoDetailRow
                  label="Cargo"
                  value={contact.job_title ?? <span className="text-[#94A3B8]">—</span>}
                />
                <InfoDetailRow
                  label="Empresa"
                  value={<CompanyLink companyId={contact.company_id} />}
                />
                <InfoDetailRow
                  label="Origem"
                  value={
                    contact.origin ? (
                      <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-blue-950/60 text-blue-300">
                        {getOriginLabel(contact.origin)}
                      </span>
                    ) : (
                      <span className="text-[#94A3B8]">—</span>
                    )
                  }
                />
                <InfoDetailRow
                  label="Papel"
                  value={
                    contact.decision_role ? (
                      <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-purple-950/60 text-purple-300">
                        {getDecisionRoleLabel(contact.decision_role)}
                      </span>
                    ) : (
                      <span className="text-[#94A3B8]">—</span>
                    )
                  }
                />
                <InfoDetailRow
                  label="Cadastrado"
                  value={formatDate(contact.created_at)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Ações Rápidas</h3>
            <div className="space-y-2">
              {contact.phone && (
                <a
                  href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border hover:bg-white/5 text-sm text-[#0F172A] transition-colors"
                >
                  <MessageCircle size={15} className="text-emerald-500" />
                  WhatsApp
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border hover:bg-white/5 text-sm text-[#0F172A] transition-colors"
                >
                  <Mail size={15} className="text-blue-500" />
                  Enviar E-mail
                </a>
              )}
              {contact.linkedin && (
                <a
                  href={contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border hover:bg-white/5 text-sm text-[#0F172A] transition-colors"
                >
                  <ExternalLink size={15} className="text-blue-700" />
                  LinkedIn
                </a>
              )}
              {!contact.phone && !contact.email && !contact.linkedin && (
                <p className="text-xs text-[#94A3B8]">
                  Nenhuma ação disponível sem telefone ou e-mail.
                </p>
              )}
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-xl border border-border bg-white p-6 space-y-3">
            <h3 className="text-sm font-semibold text-[#0F172A]">Informações</h3>
            <div className="text-sm space-y-2">
              <div>
                <p className="text-xs text-[#94A3B8] mb-0.5">Cadastrado em</p>
                <p className="text-[#0F172A]">{formatDate(contact.created_at)}</p>
              </div>
              {contact.company_id && (
                <div>
                  <p className="text-xs text-[#94A3B8] mb-0.5">Empresa</p>
                  <CompanyLink companyId={contact.company_id} />
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-6">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <ContactForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        contact={contact as Contact}
      />
    </div>
  );
}
