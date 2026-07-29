"use client";

import { useState } from "react";
import { LayoutDashboard, Target, DollarSign, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/lib/hooks/use-user";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { ComercialTab } from "@/components/dashboard/comercial-tab";
import { FinanceiroTab } from "@/components/dashboard/financeiro-tab";
import { ProjetosTab } from "@/components/dashboard/projetos-tab";

export default function DashboardPage() {
  const { user } = useUser();
  const [tab, setTab] = useState("geral");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight" style={{ color: "#E2EBF8" }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7BA3C6" }}>
            Bom dia, {user?.full_name?.split(" ")[0] ?? "Admin"} — visão geral do CRM
          </p>
        </div>
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: "rgba(11,135,195,0.1)", border: "1px solid rgba(11,135,195,0.2)", color: "#0B87C3" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList
          className="h-10"
          style={{ background: "rgba(11,135,195,0.05)", border: "1px solid rgba(11,135,195,0.12)" }}
        >
          <TabsTrigger value="geral" className="gap-1.5">
            <LayoutDashboard size={14} /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="comercial" className="gap-1.5">
            <Target size={14} /> Comercial
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-1.5">
            <DollarSign size={14} /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="projetos" className="gap-1.5">
            <Briefcase size={14} /> Projetos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-5">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="comercial" className="mt-5">
          <ComercialTab />
        </TabsContent>
        <TabsContent value="financeiro" className="mt-5">
          <FinanceiroTab />
        </TabsContent>
        <TabsContent value="projetos" className="mt-5">
          <ProjetosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
