"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Briefcase, ArrowRight, Layers, Code2, CalendarClock, AlertCircle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { StatCard } from "@/components/shared/stat-card";
import { useProjects } from "@/lib/hooks/use-projects";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PROJECT_STATUSES, PROJECT_PIPELINE_V2 } from "@/lib/utils/constants";

export function ProjetosTab() {
  const now = new Date();
  const { data: projects = [] } = useProjects();

  const inactiveProjectStatuses = new Set(["cancelado", "concluido", "churned", "pausado"]);
  const activeProjects = projects.filter((p) => !inactiveProjectStatuses.has(p.status));

  const projectsWithContract = projects.filter((p) => p.contract_end && p.billing_status === "ativo");
  const contractsExpired = projectsWithContract
    .filter((p) => differenceInDays(parseISO(p.contract_end!), new Date()) < 0)
    .sort((a, b) => parseISO(a.contract_end!).getTime() - parseISO(b.contract_end!).getTime());
  const contractsExpiringSoon = projectsWithContract
    .filter((p) => {
      const d = differenceInDays(parseISO(p.contract_end!), new Date());
      return d >= 0 && d <= 30;
    })
    .sort((a, b) => parseISO(a.contract_end!).getTime() - parseISO(b.contract_end!).getTime());

  const projectStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    return PROJECT_STATUSES
      .filter((s) => counts[s.value] > 0)
      .map((s) => ({ label: s.label, color: s.color, count: counts[s.value] }));
  }, [projects]);

  const deliveryFunnel = useMemo(() => {
    return PROJECT_PIPELINE_V2.map((value) => {
      const meta = PROJECT_STATUSES.find((s) => s.value === value)!;
      return { value, label: meta.label, color: meta.color, count: projects.filter((p) => p.status === value).length };
    });
  }, [projects]);

  const inDeliveryProjects = useMemo(() => {
    const activeStatuses = new Set([
      "contrato_assinado", "em_desenvolvimento", "em_validacao_interna", "pronto_para_entrega", "entregue_tet",
      "kickoff", "em_andamento",
    ]);
    return projects
      .filter((p) => activeStatuses.has(p.status))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Projetos Ativos" value={activeProjects.length} icon={Briefcase} />
        <StatCard label="Total de Projetos" value={projects.length} icon={Briefcase} />
        <StatCard label="Em Desenvolvimento" value={inDeliveryProjects.length} icon={Code2} />
        <StatCard
          label="Contratos a vencer"
          value={contractsExpiringSoon.length}
          icon={CalendarClock}
        />
      </div>

      {/* Processo de Entrega do Cliente (pipeline V2) */}
      <div
        className="rounded-xl p-5"
        style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers size={16} style={{ color: "#0B87C3" }} />
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Processo de Entrega do Cliente</h3>
              <p className="text-xs" style={{ color: "#7BA3C6" }}>Onde cada projeto está no funil, do contrato à mensalidade ativa</p>
            </div>
          </div>
          <Link href="/projects" className="text-xs flex items-center gap-1 hover:underline flex-shrink-0" style={{ color: "#0B87C3" }}>
            Ver Kanban <ArrowRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {deliveryFunnel.map((stage) => (
            <div
              key={stage.value}
              className="rounded-lg p-3"
              style={{ background: `${stage.color}0E`, border: `1px solid ${stage.color}30` }}
            >
              <p className="font-display font-bold text-xl" style={{ color: stage.color }}>{stage.count}</p>
              <p className="text-[10px] leading-tight mt-1" style={{ color: "#7BA3C6" }}>{stage.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Projetos Ativos / Em Desenvolvimento */}
      <div
        className="rounded-xl p-5"
        style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code2 size={16} style={{ color: "#22c55e" }} />
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Projetos em Andamento</h3>
              <p className="text-xs" style={{ color: "#7BA3C6" }}>{inDeliveryProjects.length} em desenvolvimento ou entrega ativa</p>
            </div>
          </div>
          <Link href="/projects" className="text-xs flex items-center gap-1 hover:underline flex-shrink-0" style={{ color: "#0B87C3" }}>
            Ver todos <ArrowRight size={11} />
          </Link>
        </div>
        {inDeliveryProjects.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs" style={{ color: "#3D5A78" }}>
            Nenhum projeto em desenvolvimento no momento
          </div>
        ) : (
          <div className="space-y-2">
            {inDeliveryProjects.slice(0, 8).map((proj) => {
              const meta = PROJECT_STATUSES.find((s) => s.value === proj.status);
              const daysSinceStart = proj.start_date ? differenceInDays(new Date(), parseISO(proj.start_date)) : null;
              const deadlineDate = proj.promised_delivery_date ?? proj.expected_end_date;
              const deadlineDays = deadlineDate ? differenceInDays(parseISO(deadlineDate), now) : null;
              return (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-white/5"
                  style={{ background: "rgba(11,135,195,0.04)", border: "1px solid rgba(11,135,195,0.08)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate" style={{ color: "#E2EBF8" }}>{proj.name}</p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{ background: `${meta?.color ?? "#7BA3C6"}20`, color: meta?.color ?? "#7BA3C6" }}
                      >
                        {meta?.label ?? proj.status}
                      </span>
                      {deadlineDays !== null && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0"
                          style={{
                            background: deadlineDays < 0 ? "rgba(239,68,68,0.15)" : deadlineDays <= 7 ? "rgba(245,158,11,0.15)" : "rgba(123,163,198,0.1)",
                            color: deadlineDays < 0 ? "#ef4444" : deadlineDays <= 7 ? "#f59e0b" : "#7BA3C6",
                          }}
                        >
                          {deadlineDays < 0 && <AlertCircle size={9} />}
                          {deadlineDays < 0
                            ? `Atrasado ${Math.abs(deadlineDays)}d`
                            : deadlineDays === 0
                            ? "Entrega hoje"
                            : `Faltam ${deadlineDays}d p/ entrega`}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "#7BA3C6" }}>
                      {proj.company?.name ?? "—"}
                      {daysSinceStart !== null && ` · início há ${daysSinceStart} dia${daysSinceStart !== 1 ? "s" : ""}`}
                    </p>
                    <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: "rgba(11,135,195,0.1)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${proj.progress ?? 0}%`, background: meta?.color ?? "#0B87C3" }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#7BA3C6" }}>
                    {proj.progress ?? 0}%
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Contracts alert section */}
      {(contractsExpiringSoon.length > 0 || contractsExpired.length > 0) && (
        <div className="rounded-xl border border-amber-200/30 bg-amber-50/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-300">Contratos com prazo apertado</h3>
          </div>
          <div className="space-y-1.5">
            {[...contractsExpired, ...contractsExpiringSoon].slice(0, 5).map((proj) => {
              const days = differenceInDays(parseISO(proj.contract_end!), new Date());
              return (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}?tab=financeiro`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{proj.name}</p>
                    <p className="text-xs text-text-muted">
                      {proj.billing_amount ? formatCurrency(Number(proj.billing_amount)) + "/mês • " : ""}
                      Vence em {formatDate(proj.contract_end!)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${days < 0 ? "text-red-400" : days <= 7 ? "text-red-400" : "text-amber-400"}`}>
                    {days < 0 ? `Há ${Math.abs(days)} dias` : days === 0 ? "HOJE" : `Em ${days} dias`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Project Status */}
      <div
        className="rounded-xl p-5"
        style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>Projetos por Status</h3>
            <p className="text-xs" style={{ color: "#7BA3C6" }}>{projects.length} no total</p>
          </div>
          <Link href="/projects" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#0B87C3" }}>
            Ver todos <ArrowRight size={11} />
          </Link>
        </div>
        {projectStatusData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs" style={{ color: "#3D5A78" }}>
            Nenhum projeto ainda
          </div>
        ) : (
          <div className="space-y-3">
            {projectStatusData.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: "#7BA3C6" }}>{item.label}</span>
                  <span className="font-semibold" style={{ color: "#E2EBF8" }}>{item.count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(11,135,195,0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(item.count / projects.length) * 100}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
