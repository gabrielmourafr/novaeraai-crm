"use client";

import { Bell, Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { useUser } from "@/lib/hooks/use-user";
import { formatInitials } from "@/lib/utils/format";

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

export const TopBar = () => {
  const pathname = usePathname();
  const { user } = useUser();
  const breadcrumbs = getBreadcrumb(pathname);

  return (
    <header
      className="h-14 sticky top-0 z-30 flex items-center px-6 gap-4"
      style={{
        background: "rgba(4, 9, 18, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(11, 135, 195, 0.12)",
      }}
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
        <Link href="/dashboard" className="transition-colors" style={{ color: "var(--text-muted)" }}>
          Home
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1.5">
            <span style={{ color: "var(--text-muted)" }}>/</span>
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{crumb.label}</span>
            ) : (
              <Link href={crumb.path} className="transition-colors" style={{ color: "var(--text-muted)" }}>
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Search hint */}
      <button
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
        style={{
          background: "rgba(11,135,195,0.05)",
          border: "1px solid rgba(11,135,195,0.15)",
          color: "var(--text-muted)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(11,135,195,0.35)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(11,135,195,0.15)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
        }}
      >
        <Search size={13} />
        <span>Buscar...</span>
        <kbd
          className="ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded"
          style={{ background: "rgba(11,135,195,0.1)", color: "var(--primary)" }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"}
        >
          <Bell size={17} />
        </button>

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
