"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, Circle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatInitials } from "@/lib/utils/format";
import { useUser } from "@/lib/hooks/use-user";
import {
  useAuditLogs, useOrgUsersActivity, ENTITY_LABEL, ACTION_META, type AuditLog,
} from "@/lib/hooks/use-audit";

function timeSince(dateStr: string | null) {
  if (!dateStr) return "Nunca";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Agora mesmo";
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  return formatDate(dateStr);
}

function isOnline(dateStr: string | null) {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 15 * 60 * 1000;
}

function changeSummary(log: AuditLog): string | null {
  if (log.action !== "updated" || !log.changes) return null;
  const changes = log.changes as { before?: Record<string, unknown>; after?: Record<string, unknown> };
  if (!changes.before || !changes.after) return null;
  const skip = new Set(["updated_at", "created_at"]);
  const diffs: string[] = [];
  for (const key of Object.keys(changes.after)) {
    if (skip.has(key)) continue;
    const before = changes.before[key];
    const after = changes.after[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diffs.push(key);
    }
  }
  if (diffs.length === 0) return null;
  return `Campos alterados: ${diffs.slice(0, 5).join(", ")}${diffs.length > 5 ? "..." : ""}`;
}

export default function AuditPage() {
  const { user } = useUser();
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: users = [], isLoading: usersLoading } = useOrgUsersActivity();
  const { data: logs = [], isLoading: logsLoading } = useAuditLogs({
    entityType: entityFilter !== "all" ? entityFilter : undefined,
    action: actionFilter !== "all" ? (actionFilter as AuditLog["action"]) : undefined,
  });

  const onlineCount = users.filter((u) => isOnline(u.last_sign_in_at)).length;

  if (user && user.role !== "admin") {
    return (
      <div className="space-y-6">
        <PageHeader title="Auditoria" description="Acesso restrito" />
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          <ShieldAlert size={32} className="mx-auto mb-3" style={{ color: "#EF4444" }} />
          <p className="text-sm" style={{ color: "#7BA3C6" }}>
            Esta área é exclusiva para administradores do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" description="Usuários ativos e ações realizadas no sistema" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Administradores" value={users.length} icon={ShieldCheck} />
        <StatCard label="Online agora (últimos 15min)" value={onlineCount} icon={Circle} />
        <StatCard label="Ações registradas" value={logs.length} icon={ShieldAlert} />
      </div>

      {/* Usuários */}
      <div>
        <h2 className="font-display font-bold text-lg mb-3" style={{ color: "#E2EBF8" }}>Usuários do Sistema</h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
        >
          {usersLoading ? (
            <div className="p-8 text-center text-sm" style={{ color: "#7BA3C6" }}>Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                  <TableHead style={{ color: "#7BA3C6" }}>Usuário</TableHead>
                  <TableHead style={{ color: "#7BA3C6" }}>Email</TableHead>
                  <TableHead style={{ color: "#7BA3C6" }}>Papel</TableHead>
                  <TableHead style={{ color: "#7BA3C6" }}>Status</TableHead>
                  <TableHead style={{ color: "#7BA3C6" }}>Último acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const online = isOnline(u.last_sign_in_at);
                  return (
                    <TableRow key={u.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ background: "rgba(11,135,195,0.15)", color: "#0CA8F5" }}
                          >
                            {formatInitials(u.full_name)}
                          </div>
                          <span className="text-sm" style={{ color: "#E2EBF8" }}>{u.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>{u.email}</TableCell>
                      <TableCell>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase"
                          style={{ background: "rgba(11,135,195,0.15)", color: "#0CA8F5" }}
                        >
                          {u.role === "admin" ? "Admin" : "Membro"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: online ? "#10B981" : "#3D5A78" }}>
                          <Circle size={7} fill={online ? "#10B981" : "#3D5A78"} stroke="none" />
                          {online ? "Online" : "Offline"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>
                        {timeSince(u.last_sign_in_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Log de ações */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="font-display font-bold text-lg" style={{ color: "#E2EBF8" }}>Ações Recentes</h2>
          <div className="flex items-center gap-2">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {Object.entries(ENTITY_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="created">Criações</SelectItem>
                <SelectItem value="updated">Edições</SelectItem>
                <SelectItem value="deleted">Exclusões</SelectItem>
                <SelectItem value="login">Logins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.12)" }}
        >
          {logsLoading ? (
            <div className="p-8 text-center text-sm" style={{ color: "#7BA3C6" }}>Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "#3D5A78" }}>Nenhuma ação registrada ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                  <TableHead style={{ color: "#7BA3C6" }}>Quando</TableHead>
                  <TableHead style={{ color: "#7BA3C6" }}>Quem</TableHead>
                  <TableHead style={{ color: "#7BA3C6" }}>Ação</TableHead>
                  <TableHead style={{ color: "#7BA3C6" }}>Área</TableHead>
                  <TableHead style={{ color: "#7BA3C6" }}>Item</TableHead>
                  <TableHead style={{ color: "#7BA3C6" }}>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const meta = ACTION_META[log.action];
                  return (
                    <TableRow key={log.id} style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                      <TableCell className="text-xs whitespace-nowrap" style={{ color: "#7BA3C6" }}>
                        {timeSince(log.created_at)}
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "#E2EBF8" }}>
                        {log.actor_name ?? log.actor_email ?? "Sistema"}
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: `${meta.color}20`, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "#7BA3C6" }}>
                        {ENTITY_LABEL[log.entity_type] ?? log.entity_type}
                      </TableCell>
                      <TableCell className="text-sm max-w-[220px] truncate" style={{ color: "#E2EBF8" }}>
                        {log.entity_label ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[280px] truncate" style={{ color: "#3D5A78" }}>
                        {changeSummary(log) ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
