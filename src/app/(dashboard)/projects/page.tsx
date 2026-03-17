"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProjectForm } from "@/components/forms/project-form";
import { formatDate, formatInitials } from "@/lib/utils/format";
import { PROJECT_STATUSES, PROGRAMS } from "@/lib/utils/constants";
import {
  useProjects,
  type ProjectWithRelations,
  type Project,
} from "@/lib/hooks/use-projects";
import { useOrgUsers } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO, isAfter, startOfMonth, endOfMonth } from "date-fns";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  kickoff:      { bg: "bg-indigo-100", text: "text-indigo-700" },
  em_andamento: { bg: "bg-[#0B87C3]/10", text: "text-[#0B87C3]" },
  pausado:      { bg: "bg-amber-100", text: "text-amber-700" },
  em_revisao:   { bg: "bg-orange-100", text: "text-orange-700" },
  concluido:    { bg: "bg-emerald-100", text: "text-emerald-700" },
  cancelado:    { bg: "bg-red-100", text: "text-red-700" },
};

function StatusBadge({ status }: { status: string }) {
  const styles = STATUS_STYLES[status] ?? { bg: "bg-gray-100", text: "text-gray-600" };
  const label = PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
        styles.bg,
        styles.text
      )}
    >
      {label}
    </span>
  );
}

function ProgramBadge({ program }: { program: string | null }) {
  if (!program) return null;
  const label = PROGRAMS.find((p) => p.value === program)?.label ?? program;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary max-w-[160px] truncate">
      {label}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden w-full">
      <div
        className="h-full bg-[#0B87C3] rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

type OrgUser = { id: string; full_name: string; avatar_url: string | null; org_id: string; email: string; role: "admin" | "member"; created_at: string };

function UserAvatar({ userId, users }: { userId: string | null; users: OrgUser[] }) {
  if (!userId) return <span className="text-xs text-[#94A3B8]">—</span>;
  const user = users.find((u) => u.id === userId);
  if (!user) return <span className="text-xs text-[#94A3B8]">—</span>;
  return (
    <div
      className="w-6 h-6 rounded-full bg-[#0B87C3]/20 text-[#0B87C3] text-[10px] font-semibold flex items-center justify-center flex-shrink-0"
      title={user.full_name}
    >
      {formatInitials(user.full_name)}
    </div>
  );
}

function groupByCompany(projects: ProjectWithRelations[]) {
  const map = new Map<string, { company: { id: string; name: string }; projects: ProjectWithRelations[] }>();
  for (const p of projects) {
    const cid = p.company?.id ?? "unknown";
    const cname = p.company?.name ?? "Sem empresa";
    if (!map.has(cid)) map.set(cid, { company: { id: cid, name: cname }, projects: [] });
    map.get(cid)!.projects.push(p);
  }
  return map;
}

const FRENTES = [
  { value: "labs", label: "Nova Era Labs" },
  { value: "advisory", label: "Nova Era Advisory" },
  { value: "enterprise", label: "Nova Era Enterprise" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [view, setView] = useState<"por_cliente" | "todos">("por_cliente");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFrente, setFilterFrente] = useState("all");
  const [filterProgram, setFilterProgram] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");

  const { data: projects = [], isLoading } = useProjects();
  const { data: orgUsers = [] } = useOrgUsers();

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const active = projects.filter((p) =>
      ["kickoff", "em_andamento", "pausado", "em_revisao"].includes(p.status)
    ).length;
    const emAndamento = projects.filter((p) => p.status === "em_andamento").length;
    const concluidosMes = projects.filter((p) => {
      if (p.status !== "concluido" || !p.end_date) return false;
      const d = parseISO(p.end_date);
      return !isAfter(monthStart, d) && !isAfter(d, monthEnd);
    }).length;
    const aVencer = projects.filter((p) => {
      if (!p.expected_end_date || ["concluido", "cancelado"].includes(p.status)) return false;
      const diff = differenceInDays(parseISO(p.expected_end_date), now);
      return diff >= 0 && diff <= 7;
    }).length;
    return { active, emAndamento, concluidosMes, aVencer };
  }, [projects]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterFrente !== "all" && p.business_unit !== filterFrente) return false;
      if (filterProgram !== "all" && p.program !== filterProgram) return false;
      if (filterAssignee !== "all" && p.assignee_id !== filterAssignee) return false;
      return true;
    });
  }, [projects, filterStatus, filterFrente, filterProgram, filterAssignee]);

  const grouped = useMemo(() => groupByCompany(filtered), [filtered]);

  const toggleCompany = (cid: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetos"
        description="Gerencie e acompanhe todos os projetos por cliente"
        action={
          <Button
            style={{ background: "var(--primary)" }}
            onClick={() => { setEditingProject(undefined); setFormOpen(true); }}
          >
            <Plus size={16} className="mr-2" />
            Novo Projeto
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Projetos Ativos" value={stats.active} icon={FolderKanban} />
        <StatCard label="Em Andamento" value={stats.emAndamento} icon={TrendingUp} />
        <StatCard label="Concluídos (mês)" value={stats.concluidosMes} icon={CheckCircle2} />
        <StatCard label="A Vencer (7 dias)" value={stats.aVencer} icon={AlertTriangle} />
      </div>

      {/* View toggle + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg overflow-hidden" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
          <button
            onClick={() => setView("por_cliente")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              view === "por_cliente" ? "bg-[#0B87C3] text-white" : "text-[#64748B] hover:bg-white/5"
            )}
          >
            Por Cliente
          </button>
          <button
            onClick={() => setView("todos")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              view === "todos" ? "bg-[#0B87C3] text-white" : "text-[#64748B] hover:bg-white/5"
            )}
          >
            Todos
          </button>
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 ">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterFrente} onValueChange={setFilterFrente}>
          <SelectTrigger className="w-44 ">
            <SelectValue placeholder="Frente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as frentes</SelectItem>
            {FRENTES.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger className="w-48 ">
            <SelectValue placeholder="Programa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os programas</SelectItem>
            {PROGRAMS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-44 ">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {orgUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-[#94A3B8] text-sm">Carregando projetos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto encontrado"
          description="Ajuste os filtros ou crie um novo projeto."
          action={{ label: "Novo Projeto", onClick: () => setFormOpen(true) }}
        />
      ) : view === "por_cliente" ? (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([cid, { company, projects: cProjects }]) => {
            const avgProgress = Math.round(
              cProjects.reduce((acc, p) => acc + p.progress, 0) / cProjects.length
            );
            const isExpanded = expandedCompanies.has(cid);

            return (
              <div key={cid} className="rounded-xl overflow-hidden" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
                <button
                  onClick={() => toggleCompany(cid)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0B87C3]/10 text-[#0B87C3] text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {formatInitials(company.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[#0F172A]">{company.name}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#64748B]">
                        {cProjects.length} {cProjects.length === 1 ? "projeto" : "projetos"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 max-w-xs">
                      <ProgressBar value={avgProgress} />
                      <span className="text-xs text-[#64748B] flex-shrink-0">{avgProgress}%</span>
                    </div>
                  </div>
                  <div className="text-[#94A3B8] flex-shrink-0">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {cProjects.map((project, idx) => (
                      <div
                        key={project.id}
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors",
                          idx < cProjects.length - 1 && "border-b border-[#F1F5F9]"
                        )}
                      >
                        <div className="w-10 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0F172A] truncate">{project.name}</p>
                          <p className="text-[10px] text-[#94A3B8] font-mono">{project.code}</p>
                        </div>
                        <ProgramBadge program={project.program} />
                        <StatusBadge status={project.status} />
                        <div className="hidden md:flex items-center gap-2 w-28 flex-shrink-0">
                          <ProgressBar value={project.progress} />
                          <span className="text-xs text-[#64748B] w-8 text-right flex-shrink-0">{project.progress}%</span>
                        </div>
                        <UserAvatar userId={project.assignee_id} users={orgUsers} />
                        <div className="text-xs text-[#94A3B8] w-24 text-right flex-shrink-0">
                          {project.expected_end_date ? formatDate(project.expected_end_date) : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC]">
                <TableHead className="text-xs font-semibold uppercase text-[#64748B]">Nome</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-[#64748B]">Empresa</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-[#64748B]">Programa</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-[#64748B]">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-[#64748B] w-36">Progresso</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-[#64748B]">Responsável</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-[#64748B]">Início</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-[#64748B]">Fim Previsto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((project) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{project.name}</p>
                      <p className="text-[10px] text-[#94A3B8] font-mono">{project.code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {project.company ? (
                      <Link
                        href={`/companies/${project.company.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-[#0B87C3] hover:underline"
                      >
                        {project.company.name}
                      </Link>
                    ) : (
                      <span className="text-[#94A3B8] text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell><ProgramBadge program={project.program} /></TableCell>
                  <TableCell><StatusBadge status={project.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={project.progress} />
                      <span className="text-xs text-[#64748B] w-8 text-right flex-shrink-0">{project.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <UserAvatar userId={project.assignee_id} users={orgUsers} />
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {project.start_date ? formatDate(project.start_date) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {project.expected_end_date ? formatDate(project.expected_end_date) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProjectForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingProject(undefined); }}
        project={editingProject}
      />
    </div>
  );
}
