"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatInitials } from "@/lib/utils/format";
import type { EventWithRelations } from "@/lib/hooks/use-events";

// Painel de disponibilidade da agenda comercial: uma linha por pessoa,
// cinco colunas (seg–sex), mostrando o que já está marcado e — o que o
// closer realmente precisa — os horários que sobraram livres.
//
// Clicar num horário livre abre o formulário de evento já preenchido com
// aquela pessoa, data e hora.

const WORK_START_HOUR = 9;   // 09:00
const WORK_END_HOUR = 18;    // 18:00
const LUNCH_START_HOUR = 12; // bloqueia 12:00–13:00
const LUNCH_END_HOUR = 13;
const SLOT_STEP_MIN = 30;    // grade de 30 em 30

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex"];

export interface AvailabilityUser {
  id: string;
  full_name: string;
  role?: string;
}

interface Busy {
  start: number; // ms
  end: number;   // ms
  title: string;
}

function startOfWeek(base: Date) {
  const d = new Date(base);
  const day = d.getDay();               // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day; // volta pra segunda
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isoLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Slots livres de um dia, dado o que já está ocupado e a duração desejada.
function freeSlots(day: Date, busy: Busy[], durationMin: number) {
  const slots: Date[] = [];
  const now = Date.now();

  const cursor = new Date(day);
  cursor.setHours(WORK_START_HOUR, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(WORK_END_HOUR, 0, 0, 0);

  while (cursor.getTime() + durationMin * 60000 <= dayEnd.getTime()) {
    const slotStart = cursor.getTime();
    const slotEnd = slotStart + durationMin * 60000;

    const startHour = cursor.getHours() + cursor.getMinutes() / 60;
    const endHour = startHour + durationMin / 60;
    const hitsLunch = startHour < LUNCH_END_HOUR && endHour > LUNCH_START_HOUR;
    const isPast = slotEnd <= now;
    const overlaps = busy.some((b) => slotStart < b.end && slotEnd > b.start);

    if (!hitsLunch && !isPast && !overlaps) slots.push(new Date(slotStart));
    cursor.setMinutes(cursor.getMinutes() + SLOT_STEP_MIN);
  }
  return slots;
}

export function AvailabilityBoard({
  users, events, onPickSlot,
}: {
  users: AvailabilityUser[];
  events: EventWithRelations[];
  onPickSlot: (userId: string, date: string, time: string) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [duration, setDuration] = useState("60");
  const [personFilter, setPersonFilter] = useState("all");

  const weekStart = useMemo(() => {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart]
  );

  const visibleUsers = personFilter === "all" ? users : users.filter((u) => u.id === personFilter);

  // Ocupação por pessoa: um evento conta pra quem está em participant_ids
  // e também pra quem criou, senão reunião sem participante marcado some.
  const busyByUser = useMemo(() => {
    const map = new Map<string, Busy[]>();
    for (const u of users) map.set(u.id, []);
    for (const ev of events) {
      const start = new Date(ev.start_at).getTime();
      const end = start + (ev.duration_min ?? 60) * 60000;
      const people = Array.from(new Set<string>([
        ...(ev.participant_ids ?? []),
        ...(ev.created_by ? [ev.created_by] : []),
      ]));
      for (const pid of people) {
        const list = map.get(pid);
        if (list) list.push({ start, end, title: ev.title });
      }
    }
    return map;
  }, [users, events]);

  const durationMin = Number(duration);
  const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1} – ${weekDays[4].getDate()}/${weekDays[4].getMonth() + 1}`;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 rounded-lg hover:bg-white/5">
            <ChevronLeft size={16} style={{ color: "#7BA3C6" }} />
          </button>
          <span className="text-sm font-semibold min-w-[110px] text-center" style={{ color: "#E2EBF8" }}>
            {weekLabel}
          </span>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 rounded-lg hover:bg-white/5">
            <ChevronRight size={16} style={{ color: "#7BA3C6" }} />
          </button>
        </div>

        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ background: "rgba(11,135,195,0.1)", color: "#0B87C3" }}
          >
            Esta semana
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Select value={personFilter} onValueChange={setPersonFilter}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as pessoas</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="60">1 hora</SelectItem>
              <SelectItem value="90">1h30</SelectItem>
              <SelectItem value="120">2 horas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cabeçalho dos dias */}
      <div className="grid border-b" style={{ gridTemplateColumns: "160px repeat(5, 1fr)", borderColor: "rgba(11,135,195,0.08)" }}>
        <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#3D5A78" }}>
          Pessoa
        </div>
        {weekDays.map((d, i) => {
          const isToday = isoLocal(d) === isoLocal(new Date());
          return (
            <div key={i} className="px-2 py-2 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: isToday ? "#0B87C3" : "#3D5A78" }}>
                {WEEKDAY_LABELS[i]} {d.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Uma linha por pessoa */}
      {visibleUsers.length === 0 ? (
        <div className="p-10 text-center text-sm" style={{ color: "#3D5A78" }}>
          Nenhuma pessoa pra mostrar
        </div>
      ) : (
        visibleUsers.map((u) => {
          const busy = busyByUser.get(u.id) ?? [];
          return (
            <div
              key={u.id}
              className="grid border-b last:border-0"
              style={{ gridTemplateColumns: "160px repeat(5, 1fr)", borderColor: "rgba(11,135,195,0.08)" }}
            >
              <div className="px-4 py-3 flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: "rgba(11,135,195,0.15)", color: "#0B87C3" }}
                >
                  {formatInitials(u.full_name)}
                </div>
                <span className="text-sm truncate" style={{ color: "#E2EBF8" }}>{u.full_name}</span>
              </div>

              {weekDays.map((day, i) => {
                const dayBusy = busy
                  .filter((b) => isoLocal(new Date(b.start)) === isoLocal(day))
                  .sort((a, b) => a.start - b.start);
                const slots = freeSlots(day, dayBusy, durationMin);

                return (
                  <div key={i} className="px-1.5 py-2 space-y-1 border-l" style={{ borderColor: "rgba(11,135,195,0.06)" }}>
                    {/* Compromissos já marcados */}
                    {dayBusy.map((b, bi) => (
                      <div
                        key={bi}
                        className="px-1.5 py-1 rounded text-[10px] truncate"
                        style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}
                        title={`${hhmm(new Date(b.start))} — ${b.title}`}
                      >
                        {hhmm(new Date(b.start))} {b.title}
                      </div>
                    ))}

                    {/* Horários livres, clicáveis */}
                    {slots.length === 0 ? (
                      <p className="text-[10px] text-center py-1" style={{ color: "#3D5A78" }}>
                        {dayBusy.length > 0 ? "sem espaço" : "—"}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {slots.slice(0, 6).map((s, si) => (
                          <button
                            key={si}
                            onClick={() => onPickSlot(u.id, isoLocal(s), hhmm(s))}
                            className="px-1.5 py-0.5 rounded text-[10px] transition-colors hover:brightness-125"
                            style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}
                          >
                            {hhmm(s)}
                          </button>
                        ))}
                        {slots.length > 6 && (
                          <span className="text-[10px] px-1 py-0.5" style={{ color: "#3D5A78" }}>
                            +{slots.length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#7BA3C6" }}>
          <span className="w-2.5 h-2.5 rounded" style={{ background: "rgba(34,197,94,0.4)" }} /> Livre — clique pra agendar
        </span>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#7BA3C6" }}>
          <span className="w-2.5 h-2.5 rounded" style={{ background: "rgba(239,68,68,0.4)" }} /> Ocupado
        </span>
        <span className="flex items-center gap-1.5 text-[11px] ml-auto" style={{ color: "#3D5A78" }}>
          <Clock size={11} /> Expediente {WORK_START_HOUR}h–{WORK_END_HOUR}h, almoço {LUNCH_START_HOUR}h–{LUNCH_END_HOUR}h
        </span>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#3D5A78" }}>
          <CalendarDays size={11} /> Seg a sex
        </span>
      </div>
    </div>
  );
}
