"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Menu, Search, CheckCircle2, Clock, RefreshCw, Phone, Mail, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { useUser } from "@/lib/hooks/use-user";
import { useAllTasks, useUpdateTask, type TaskWithRelations } from "@/lib/hooks/use-tasks";
import { formatInitials, formatDate } from "@/lib/utils/format";

const BREADCRUMBS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/companies": "Empresas",
  "/contacts": "Contatos",
  "/proposals": "Propostas",
  "/catalog": "Catálogo",
  "/projects": "Projetos",
  "/documents": "Documentos",
  "/finance": "Financeiro",
  "/tasks": "Tarefas",
  "/calendar": "Agenda",
  "/settings": "Configurações",
};

const getBreadcrumb = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const label = BREADCRUMBS[path] ?? (seg.length === 36 ? "Detalhes" : seg.charAt(0).toUpperCase() + seg.slice(1));
    return { path, label };
  });
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  followup: <RefreshCw size={11} />,
  ligacao: <Phone size={11} />,
  email: <Mail size={11} />,
};

const PRIORITY_COLOR: Record<string, string> = {
  urgente: "#ef4444",
  alta: "#f59e0b",
  media: "#0B87C3",
  baixa: "#22c55e",
};

export const TopBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const breadcrumbs = getBreadcrumb(pathname);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Follow-ups pendentes (hoje + vencidos + próximos 7 dias)
  const { data: followUps = [] } = useAllTasks({ type: "followup" as const });
  const updateTask = useUpdateTask();

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);

  const pending = followUps.filter((t) => {
    if (t.status === "concluida" || t.status === "cancelada") return false;
    if (!t.due_date) return true; // sem data = sempre visível
    const due = new Date(t.due_date);
    return due <= in7Days;
  });

  const overdue = pending.filter((t) => t.due_date && new Date(t.due_date) < new Date());
  const todayTasks = pending.filter((t) => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString());
  const upcoming = pending.filter((t) => {
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    return due > today && due <= in7Days;
  });

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleComplete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateTask.mutateAsync({ id, status: "concluida" });
  };

  return (
    <header
      className="h-14 sticky top-0 z-30 flex items-center px-6 gap-4"
      style={{ background: "rgba(4, 9, 18, 0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(11, 135, 195, 0.12)" }}
    >
      {/* Mobile hamburger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden text-text-secondary hover:text-text-primary">
            <Menu size={20} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px] border-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm flex-1">
        <Link href="/dashboard" className="transition-colors" style={{ color: "var(--text-muted)" }}>Home</Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1.5">
            <span style={{ color: "var(--text-muted)" }}>/</span>
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{crumb.label}</span>
            ) : (
              <Link href={crumb.path} className="transition-colors" style={{ color: "var(--text-muted)" }}>{crumb.label}</Link>
            )}
          </span>
        ))}
      </nav>

      {/* Search hint */}
      <button
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
        style={{ background: "rgba(11,135,195,0.05)", border: "1px solid rgba(11,135,195,0.15)", color: "var(--text-muted)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(11,135,195,0.35)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(11,135,195,0.15)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
      >
        <Search size={13} />
        <span>Buscar...</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded" style={{ background: "rgba(11,135,195,0.1)", color: "var(--primary)" }}>⌘K</kbd>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: bellOpen ? "var(--text-primary)" : "var(--text-secondary)", background: bellOpen ? "rgba(11,135,195,0.1)" : "transparent" }}
          >
            <Bell size={17} />
            {pending.length > 0 && (
              <span
                className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: overdue.length > 0 ? "#ef4444" : "#f59e0b" }}
              >
                {pending.length > 9 ? "9+" : pending.length}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {bellOpen && (
            <div
              className="absolute right-0 top-11 w-80 rounded-xl shadow-2xl overflow-hidden z-50"
              style={{ background: "rgba(12,21,38,0.98)", border: "1px solid rgba(11,135,195,0.2)", backdropFilter: "blur(20px)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#E2EBF8" }}>Follow-ups</p>
                  <p className="text-[10px]" style={{ color: "#7BA3C6" }}>
                    {pending.length === 0 ? "Tudo em dia ✓" : `${pending.length} pendente${pending.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { router.push("/calendar"); setBellOpen(false); }} className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(11,135,195,0.1)", color: "#0B87C3" }}>
                    Ver Agenda
                  </button>
                  <button onClick={() => setBellOpen(false)} className="p-1 rounded hover:bg-white/5" style={{ color: "#7BA3C6" }}><X size={13} /></button>
                </div>
              </div>

              {pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <CheckCircle2 size={28} className="opacity-30" style={{ color: "#22c55e" }} />
                  <p className="text-xs" style={{ color: "#3D5A78" }}>Nenhum follow-up pendente</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {/* Vencidos */}
                  {overdue.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#ef4444", background: "rgba(239,68,68,0.05)" }}>
                        Vencidos ({overdue.length})
                      </div>
                      {overdue.map((t) => (
                        <NotifItem key={t.id} task={t} onComplete={handleComplete} onNavigate={() => { router.push("/calendar"); setBellOpen(false); }} />
                      ))}
                    </div>
                  )}

                  {/* Hoje */}
                  {todayTasks.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#f59e0b", background: "rgba(245,158,11,0.05)" }}>
                        Hoje ({todayTasks.length})
                      </div>
                      {todayTasks.map((t) => (
                        <NotifItem key={t.id} task={t} onComplete={handleComplete} onNavigate={() => { router.push("/calendar"); setBellOpen(false); }} />
                      ))}
                    </div>
                  )}

                  {/* Próximos 7 dias */}
                  {upcoming.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#7BA3C6", background: "rgba(11,135,195,0.05)" }}>
                        Próximos 7 dias ({upcoming.length})
                      </div>
                      {upcoming.map((t) => (
                        <NotifItem key={t.id} task={t} onComplete={handleComplete} onNavigate={() => { router.push("/calendar"); setBellOpen(false); }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer glow-sm"
          style={{ background: "linear-gradient(135deg, #0B87C3, #0CA8F5)", color: "#fff" }}
        >
          {user?.full_name ? formatInitials(user.full_name) : "?"}
        </div>
      </div>
    </header>
  );
};

// ─── Componente de item de notificação ───────────────────────────────────────
function NotifItem({
  task,
  onComplete,
  onNavigate,
}: {
  task: TaskWithRelations;
  onComplete: (id: string, e: React.MouseEvent) => void;
  onNavigate: () => void;
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-white/5"
      style={{ borderColor: "rgba(11,135,195,0.06)" }}
      onClick={onNavigate}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${PRIORITY_COLOR[task.priority] ?? "#0B87C3"}20`, color: PRIORITY_COLOR[task.priority] ?? "#0B87C3" }}
      >
        {TYPE_ICONS[task.type] ?? <Bell size={11} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: "#E2EBF8" }}>{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.due_date && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: "#7BA3C6" }}>
              <Clock size={9} />{formatDate(task.due_date)}
            </span>
          )}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: `${PRIORITY_COLOR[task.priority] ?? "#0B87C3"}15`, color: PRIORITY_COLOR[task.priority] ?? "#0B87C3" }}
          >
            {task.priority}
          </span>
        </div>
      </div>
      <button
        onClick={(e) => onComplete(task.id, e)}
        className="p-1.5 rounded-full flex-shrink-0 mt-0.5 transition-colors hover:bg-green-950/40"
        title="Marcar como concluído"
        style={{ color: "#22c55e" }}
      >
        <CheckCircle2 size={14} />
      </button>
    </div>
  );
}
