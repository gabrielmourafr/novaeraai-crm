"use client";

import { useMemo, useState } from "react";
import { Users, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@/lib/hooks/use-user";
import { useUserGoals, useUpsertUserGoal, useGoalProgress, currentWeekRange } from "@/lib/hooks/use-user-goals";
import { formatCurrency, parseCurrencyInput, formatInitials } from "@/lib/utils/format";

// Metas individuais do mês: reuniões (mês e semana) e VGV. O realizado sai
// sempre do dado real — eventos da agenda e projetos com "Fechado por" —,
// nunca de número gravado, pra meta e execução não divergirem.

const monthNames = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function Bar({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: pct >= 100 ? "#10B981" : "#0B87C3" }}
      />
    </div>
  );
}

function Metric({
  label, value, target, format,
}: {
  label: string;
  value: number;
  target: number;
  format?: (n: number) => string;
}) {
  const fmt = format ?? ((n: number) => String(n));
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px]" style={{ color: "#7BA3C6" }}>{label}</span>
        <span className="text-[11px] font-medium" style={{ color: "#E2EBF8" }}>
          {fmt(value)} / {target > 0 ? fmt(target) : "—"}
        </span>
      </div>
      <Bar value={value} target={target} />
      <p className="text-[10px] mt-0.5" style={{ color: "#3D5A78" }}>
        {target > 0 ? `${pct.toFixed(0)}% da meta` : "sem meta definida"}
      </p>
    </div>
  );
}

export function TeamGoalsCard({ year, month }: { year: number; month: number }) {
  const { user } = useUser();
  const { data: goals = [] } = useUserGoals(year, month);
  const { data: progress } = useGoalProgress(year, month);
  const upsert = useUpsertUserGoal();

  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [meetMonth, setMeetMonth] = useState("");
  const [meetWeek, setMeetWeek] = useState("");
  const [vgv, setVgv] = useState("");

  const goalByUser = useMemo(() => new Map(goals.map((g) => [g.user_id, g])), [goals]);

  // Quem entra no acompanhamento: quem faz agenda comercial. Developer fica
  // de fora — não atende cliente nem fecha contrato.
  const people = useMemo(
    () => (progress?.users ?? []).filter((u) => u.role !== "developer"),
    [progress]
  );

  const week = currentWeekRange();
  const weekLabel = `${week.start.getDate()}/${week.start.getMonth() + 1} a ${week.end.getDate()}/${week.end.getMonth() + 1}`;

  const openEdit = (id: string, name: string) => {
    const g = goalByUser.get(id);
    setMeetMonth(g?.meetings_target_month ? String(g.meetings_target_month) : "");
    setMeetWeek(g?.meetings_target_week ? String(g.meetings_target_week) : "");
    setVgv(g?.vgv_target ? String(g.vgv_target) : "");
    setEditing({ id, name });
  };

  const handleSave = async () => {
    if (!user || !editing) return;
    await upsert.mutateAsync({
      org_id: user.org_id,
      user_id: editing.id,
      reference_month: `${year}-${String(month).padStart(2, "0")}-01`,
      meetings_target_month: meetMonth ? parseInt(meetMonth, 10) || 0 : 0,
      meetings_target_week: meetWeek ? parseInt(meetWeek, 10) || 0 : 0,
      vgv_target: vgv ? parseCurrencyInput(vgv) : 0,
      notes: null,
    });
    setEditing(null);
  };

  return (
    <div className="rounded-xl p-5" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "#E2EBF8" }}>
            <Users size={14} />
            Metas por pessoa — {monthNames[month - 1]}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "#7BA3C6" }}>
            Reuniões e VGV individuais · semana de {weekLabel}
          </p>
        </div>
      </div>

      {people.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "#3D5A78" }}>Nenhuma pessoa pra acompanhar</p>
      ) : (
        <div className="space-y-4">
          {people.map((p) => {
            const g = goalByUser.get(p.id);
            const mMonth = progress?.meetingsMonth.get(p.id) ?? 0;
            const mWeek = progress?.meetingsWeek.get(p.id) ?? 0;
            const pVgv = progress?.vgv.get(p.id) ?? 0;

            return (
              <div
                key={p.id}
                className="rounded-lg p-3.5"
                style={{ background: "rgba(11,135,195,0.04)", border: "1px solid rgba(11,135,195,0.1)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: "rgba(11,135,195,0.15)", color: "#0B87C3" }}
                    >
                      {formatInitials(p.full_name)}
                    </div>
                    <span className="text-sm font-medium" style={{ color: "#E2EBF8" }}>{p.full_name}</span>
                    {!g && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                        sem meta
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p.id, p.full_name)}>
                    <Pencil size={12} className="mr-1.5" />
                    {g ? "Editar" : "Definir"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Metric label="Reuniões no mês" value={mMonth} target={g?.meetings_target_month ?? 0} />
                  <Metric label="Reuniões na semana" value={mWeek} target={g?.meetings_target_week ?? 0} />
                  <Metric label="VGV (vendas)" value={pVgv} target={Number(g?.vgv_target ?? 0)} format={formatCurrency} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Meta de {editing?.name}</DialogTitle>
            <DialogDescription>
              {monthNames[month - 1]} de {year}. Deixe zerado o que não quiser acompanhar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label>Reuniões no mês</Label>
              <Input type="number" min={0} value={meetMonth} onChange={(e) => setMeetMonth(e.target.value)} placeholder="20" />
            </div>
            <div className="space-y-1.5">
              <Label>Reuniões na semana</Label>
              <Input type="number" min={0} value={meetWeek} onChange={(e) => setMeetWeek(e.target.value)} placeholder="5" />
            </div>
            <div className="space-y-1.5">
              <Label>VGV — valor gerado em vendas (R$)</Label>
              <Input value={vgv} onChange={(e) => setVgv(e.target.value)} placeholder="50.000,00" />
              <p className="text-[11px]" style={{ color: "#3D5A78" }}>
                Contado pelos contratos em que a pessoa consta como &quot;Fechado por&quot;.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
