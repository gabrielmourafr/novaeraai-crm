"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Target, Building2, FileText, Package,
  Rocket, FolderOpen, DollarSign, CheckSquare, Calendar, Settings,
  ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useSidebarStore } from "@/store/sidebar-store";
import { NovaeraLogo } from "@/components/layout/novaera-logo";
import { createClient } from "@/lib/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatInitials } from "@/lib/utils/format";
import { useUser } from "@/lib/hooks/use-user";

const NAV_GROUPS = [
  {
    label: "PRINCIPAL",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    label: "COMERCIAL",
    items: [
      { icon: Target, label: "Leads & Contatos", href: "/leads" },
      { icon: Building2, label: "Empresas", href: "/companies" },
      { icon: FileText, label: "Propostas", href: "/proposals" },
      { icon: Package, label: "Catálogo", href: "/catalog" },
    ],
  },
  {
    label: "ENTREGA",
    items: [
      { icon: Rocket, label: "Projetos", href: "/projects" },
      { icon: FolderOpen, label: "Documentos", href: "/documents" },
    ],
  },
  {
    label: "GESTÃO",
    items: [
      { icon: DollarSign, label: "Financeiro", href: "/finance" },
      { icon: CheckSquare, label: "Tarefas", href: "/tasks" },
      { icon: Calendar, label: "Agenda", href: "/calendar" },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { icon: Settings, label: "Configurações", href: "/settings" },
    ],
  },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle } = useSidebarStore();
  const { user } = useUser();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/leads") return pathname.startsWith("/leads") || pathname.startsWith("/contacts");
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col h-screen bg-sidebar-bg border-r border-sidebar-hover transition-all duration-300 ease-in-out flex-shrink-0",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 border-b border-sidebar-hover px-4 flex-shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <Link href="/dashboard" className="flex items-center">
            <NovaeraLogo collapsed={collapsed} />
          </Link>
          {!collapsed && (
            <button
              onClick={toggle}
              className="p-1.5 rounded-md text-sidebar-text hover:text-white hover:bg-sidebar-hover transition-colors flex-shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-4 mb-2 text-[11px] font-semibold tracking-[0.1em] text-sidebar-text/40 uppercase">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="my-2 border-t border-sidebar-hover mx-3" />}
              <ul className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  const content = (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group",
                          active
                            ? "bg-sidebar-active/10 text-white sidebar-item-active"
                            : "text-sidebar-text hover:bg-sidebar-hover hover:text-white"
                        )}
                      >
                        <Icon
                          size={18}
                          className={cn(
                            "flex-shrink-0 transition-transform duration-200",
                            "group-hover:scale-105",
                            active && "text-primary"
                          )}
                        />
                        {!collapsed && (
                          <span className="text-sm font-medium truncate">{item.label}</span>
                        )}
                      </Link>
                    </li>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{content}</TooltipTrigger>
                        <TooltipContent side="right" className="bg-sidebar-bg text-white border-sidebar-hover">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return content;
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="px-2 pb-2 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggle}
                  className="w-full flex items-center justify-center p-2 text-sidebar-text hover:text-white hover:bg-sidebar-hover rounded-md transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-sidebar-bg text-white border-sidebar-hover">
                Expandir menu
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* User Area */}
        <div className="border-t border-sidebar-hover p-3 flex-shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "var(--primary)", color: "#fff" }}>
                {user?.full_name ? formatInitials(user.full_name) : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.full_name ?? "Carregando..."}</p>
                <p className="text-sidebar-text/60 text-xs truncate">{user?.email ?? ""}</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 text-sidebar-text hover:text-white transition-colors">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center p-2 text-sidebar-text hover:text-white transition-colors rounded-md hover:bg-sidebar-hover"
                >
                  <LogOut size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-sidebar-bg text-white border-sidebar-hover">
                Sair
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};
