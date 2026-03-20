"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  DollarSign,
  TrendingUp,
  FolderOpen,
  Clock,
  Users,
} from "lucide-react";
import { useCompany } from "@/lib/hooks/use-companies";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useLeads } from "@/lib/hooks/use-leads";
import { useProjects } from "@/lib/hooks/use-projects";
import { useActivities } from "@/lib/hooks/use-activities";
import { useCompanyRevenues } from "@/lib/hooks/use-finance";
import { CompanyForm } from "@/components/forms/company-form";
import { ContactForm } from "@/components/forms/contact-form";
import { LeadForm } from "@/components/forms/lead-form";
import { Timeline } from "@/components/shared/timeline";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCurrency,
  formatDate,
  formatRelative,
  formatInitials,
} from "@/lib/utils/format";
import {
  COMPANY_SEGMENTS,
  COMPANY_SIZES,
  PROJECT_STATUSES,
  TEMPERATURES,
} from "@/lib/utils/constants";
import type { Company } from "@/lib/hooks/use-companies";

const getSegmentLabel = (v: string | null) =>
  COMPANY_SEGMENTS.find((s) => s.value === v)?.label ?? v ?? "—";

const getSizeLabel = (v: string | null) =>
  COMPANY_SIZES.find((s) => s.value === v)?.label ?? v ?? "—";

const getMaturityLabel = (v: string | null) => {
  if (v === "basica") return "Básica";
  if (v === "intermediaria") return "Intermediária";
  if (v === "avancada") return "Avançada";
  return v ?? "—";
};

const getProjectStatusMeta = (v: string) =>
  PROJECT_STATUSES.find((s) => s.value === v) ?? { label: v, color: "#94A3B8" };

const getTemperatureMeta = (v: string | null) =>
  TEMPERATURES.find((t) => t.value === v);

const temperatureColors: Record<string, string> = {
  frio: "bg-indigo-100 text-indigo-700",
  morno: "bg-amber-100 text-amber-700",
  quente: "bg-red-950/60 text-red-300",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
        {label}
      </p>
      <div className="text-sm text-[#0F172A]">{value}</div>
    </div>
  );
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [editOpen, setEditOpen] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [leadFormOpen, setLeadFormOpen] = useState(false);

  const { data: company, isLoading, error } = useCompany(id);
  const { data: contacts, isLoading: contactsLoading } = useContacts(undefined, id);
  const { data: leads, isLoading: leadsLoading } = useLeads({ companyId: id });
  const { data: projects, isLoading: projectsLoading } = useProjects({ companyId: id });
  const { data: activities, isLoading: activitiesLoading } = useActivities("company", id);
  const { data: revenues } = useCompanyRevenues(id);

  const totalRevenue = revenues?.reduce((sum, r) => sum + r.value, 0) ?? 0;
  const activeLeads =
    leads?.filter((l) => !l.archived && l.closed_at === null).length ?? 0;
  const activeProjects =
    projects?.filter(
      (p) => p.status !== "concluido" && p.status !== "cancelado"
    ).length ?? 0;
  const firstActivity = activities && activities.length > 0 ? activities[0] : null;
  const lastActivity = firstActivity ? (firstActivity as { created_at: string }).created_at : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 size={48} className="text-text-muted mb-4" />
        <h2 className="text-lg font-semibold text-[#0F172A] mb-2">Empresa não encontrada</h2>
        <p className="text-sm text-text-muted mb-6">
          A empresa que você está procurando não existe ou foi removida.
        </p>
        <Button onClick={() => router.push("/companies")} variant="outline">
          <ArrowLeft size={16} className="mr-2" />
          Voltar para Empresas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/companies")}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-[#0B87C3] transition-colors"
      >
        <ArrowLeft size={15} />
        Empresas
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{ background: "#0B87C3" }}
          >
            {formatInitials(company.name)}
          </div>
          <div>
            <h1 className="font-bold text-2xl text-[#0F172A] leading-tight">{company.name}</h1>
            {company.trade_name && (
              <p className="text-sm text-text-muted mt-0.5">{company.trade_name}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {company.segment && (
                <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-blue-950/60 text-blue-300">
                  {getSegmentLabel(company.segment)}
                </span>
              )}
              {company.size && (
                <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-white/5 text-slate-600">
                  {getSizeLabel(company.size)}
                </span>
              )}
              {company.digital_maturity && (
                <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                  {getMaturityLabel(company.digital_maturity)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil size={14} className="mr-1.5" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLeadFormOpen(true)}>
            <TrendingUp size={14} className="mr-1.5" />
            Novo Lead
          </Button>
          <Button
            size="sm"
            className="text-white"
            style={{ background: "#0B87C3" }}
            onClick={() => router.push(`/proposals?newFor=${id}`)}
          >
            <Plus size={14} className="mr-1.5" />
            Nova Proposta
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Total de Receita
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50">
              <DollarSign size={16} className="text-emerald-600" />
            </div>
          </div>
          <p className="font-bold text-xl text-[#0F172A]">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Leads Ativos
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50">
              <TrendingUp size={16} className="text-blue-600" />
            </div>
          </div>
          <p className="font-bold text-2xl text-[#0F172A]">{activeLeads}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Projetos Ativos
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50">
              <FolderOpen size={16} className="text-purple-600" />
            </div>
          </div>
          <p className="font-bold text-2xl text-[#0F172A]">{activeProjects}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Última Interação
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50">
              <Clock size={16} className="text-amber-600" />
            </div>
          </div>
          <p className="font-bold text-base text-[#0F172A] leading-snug">
            {lastActivity ? formatRelative(lastActivity) : "—"}
          </p>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Tabs */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Tabs defaultValue="overview" className="w-full">
            <div className="border-b border-border px-6 overflow-x-auto">
              <TabsList className="h-12 bg-transparent p-0 gap-0 w-max">
                {(
                  [
                    { value: "overview", label: "Overview" },
                    { value: "contacts", label: "Contatos" },
                    { value: "leads", label: "Leads" },
                    { value: "projects", label: "Projetos" },
                    { value: "timeline", label: "Timeline" },
                  ] as const
                ).map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0B87C3] data-[state=active]:text-[#0B87C3] data-[state=active]:shadow-none text-text-muted px-4 h-12 text-sm font-medium bg-transparent"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Overview */}
            <TabsContent value="overview" className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <InfoRow label="CNPJ" value={company.cnpj ?? "—"} />
                <InfoRow
                  label="Website"
                  value={
                    company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0B87C3] hover:underline flex items-center gap-1"
                      >
                        <Globe size={13} />
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <InfoRow
                  label="Endereço"
                  value={
                    company.address ? (
                      <span className="flex items-start gap-1">
                        <MapPin size={13} className="mt-0.5 flex-shrink-0 text-text-muted" />
                        {company.address}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <InfoRow label="Segmento" value={getSegmentLabel(company.segment)} />
                <InfoRow label="Porte" value={getSizeLabel(company.size)} />
                <InfoRow
                  label="Faturamento Estimado"
                  value={
                    company.estimated_revenue != null
                      ? formatCurrency(company.estimated_revenue)
                      : "—"
                  }
                />
                <InfoRow label="Maturidade Digital" value={getMaturityLabel(company.digital_maturity)} />
                <InfoRow label="Criado em" value={formatDate(company.created_at)} />
                {company.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                      Observações
                    </p>
                    <p className="text-sm text-[#0F172A] whitespace-pre-line">{company.notes}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Contacts */}
            <TabsContent value="contacts" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  Contatos ({contacts?.length ?? 0})
                </h3>
                <Button size="sm" variant="outline" onClick={() => setContactFormOpen(true)}>
                  <Plus size={13} className="mr-1.5" />
                  Novo Contato
                </Button>
              </div>

              {contactsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : !contacts?.length ? (
                <EmptyState
                  icon={Users}
                  title="Nenhum contato"
                  description="Adicione contatos vinculados a esta empresa."
                  action={{ label: "Novo Contato", onClick: () => setContactFormOpen(true) }}
                />
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-[#0B87C3]/30 hover:bg-white/5 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: "#0B87C3" }}
                        >
                          {formatInitials(contact.full_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">
                            {contact.full_name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {[contact.job_title, contact.email].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                      </div>
                      {contact.decision_role && (
                        <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-white/5 text-slate-600 flex-shrink-0">
                          {contact.decision_role}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Leads */}
            <TabsContent value="leads" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  Leads ({leads?.length ?? 0})
                </h3>
                <Button size="sm" variant="outline" onClick={() => setLeadFormOpen(true)}>
                  <Plus size={13} className="mr-1.5" />
                  Novo Lead
                </Button>
              </div>

              {leadsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : !leads?.length ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Nenhum lead"
                  description="Nenhum lead vinculado a esta empresa."
                  action={{ label: "Novo Lead", onClick: () => setLeadFormOpen(true) }}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider pb-2 pr-4">
                          Lead
                        </th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider pb-2 pr-4">
                          Estágio
                        </th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider pb-2 pr-4">
                          Valor
                        </th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider pb-2">
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
                            <p className="text-xs text-text-muted">
                              {formatDate(lead.created_at)}
                            </p>
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
                              <span className="text-text-muted">—</span>
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
                              <span className="text-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Projects */}
            <TabsContent value="projects" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  Projetos ({projects?.length ?? 0})
                </h3>
                <Button size="sm" variant="outline" disabled title="Em breve">
                  <Plus size={13} className="mr-1.5" />
                  Novo Projeto
                </Button>
              </div>

              {projectsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : !projects?.length ? (
                <EmptyState
                  icon={FolderOpen}
                  title="Nenhum projeto"
                  description="Nenhum projeto vinculado a esta empresa."
                />
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => {
                    const statusMeta = getProjectStatusMeta(project.status);
                    return (
                      <button
                        key={project.id}
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="w-full p-4 rounded-lg border border-border hover:border-[#0B87C3]/30 hover:bg-white/5 transition-all text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-medium text-[#0F172A] truncate">
                                {project.name}
                              </p>
                              <span
                                className="rounded-md px-2 py-0.5 text-xs font-medium flex-shrink-0"
                                style={{
                                  background: `${statusMeta.color}20`,
                                  color: statusMeta.color,
                                }}
                              >
                                {statusMeta.label}
                              </span>
                            </div>
                            {project.program && (
                              <p className="text-xs text-text-muted mb-2">{project.program}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${project.progress}%`,
                                    background: statusMeta.color,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-text-muted flex-shrink-0 w-8 text-right">
                                {project.progress}%
                              </span>
                            </div>
                          </div>
                          {project.expected_end_date && (
                            <p className="text-xs text-text-muted flex-shrink-0 mt-0.5">
                              {formatDate(project.expected_end_date)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Timeline */}
            <TabsContent value="timeline" className="p-6">
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
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#0F172A]">Detalhes</h3>
            <div className="space-y-3 text-sm">
              {company.cnpj && (
                <div>
                  <p className="text-xs text-text-muted mb-0.5">CNPJ</p>
                  <p className="text-[#0F172A]">{company.cnpj}</p>
                </div>
              )}
              {company.website && (
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Website</p>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0B87C3] hover:underline flex items-center gap-1"
                  >
                    <Globe size={13} />
                    {company.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              {company.address && (
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Endereço</p>
                  <p className="text-[#0F172A] flex items-start gap-1">
                    <MapPin size={13} className="mt-0.5 flex-shrink-0 text-text-muted" />
                    {company.address}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-text-muted mb-0.5">Cadastrado em</p>
                <p className="text-[#0F172A]">{formatDate(company.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {company.tags && company.tags.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {company.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Ações Rápidas</h3>
            <div className="space-y-2">
              {contacts?.[0]?.phone && (
                <a
                  href={`https://wa.me/${contacts[0].phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border hover:bg-white/5 text-sm text-[#0F172A] transition-colors"
                >
                  <MessageCircle size={15} className="text-emerald-500" />
                  WhatsApp
                </a>
              )}
              {contacts?.[0]?.email && (
                <a
                  href={`mailto:${contacts[0].email}`}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border hover:bg-white/5 text-sm text-[#0F172A] transition-colors"
                >
                  <Mail size={15} className="text-blue-500" />
                  Enviar E-mail
                </a>
              )}
              {!contacts?.[0]?.phone && !contacts?.[0]?.email && (
                <p className="text-xs text-text-muted">
                  Adicione contatos para ver as ações disponíveis.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Forms */}
      <CompanyForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        company={company as Company}
      />
      <ContactForm
        open={contactFormOpen}
        onClose={() => setContactFormOpen(false)}
        defaultCompanyId={id}
      />
      <LeadForm open={leadFormOpen} onClose={() => setLeadFormOpen(false)} />
    </div>
  );
}
