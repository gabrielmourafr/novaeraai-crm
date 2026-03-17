"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  Clock, X, Tag, Briefcase, User, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useEvents, useCreateEvent, useDeleteEvent,
  type EventWithRelations,
} from "@/lib/hooks/use-events";
import { useAllTasks } from "@/lib/hooks/use-tasks";
import { useUser, useOrgUsers } from "@/lib/hooks/use-user";
import { formatDate } from "@/lib/utils/format";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const EVENT_TYPES = [
  { value: "demo", label: "Demo" },
  { value: "reuniao_exploratoria", label: "Reunião Exploratória" },
  { value: "followup", label: "Follow-up" },
  { value: "kickoff", label: "Kickoff" },
  { value: "review", label: "Review" },
  { value: "interno", label: "Interno" },
  { value: "outro", label: "Outro" },
];

const TYPE_COLOR: Record<string, string> = {
  demo: "#f59e0b",
  reuniao_exploratoria: "#0B87C3",
  followup: "#22c55e",
  kickoff: "#a855f7",
  review: "#06b6d4",
  interno: "#3D5A78",
  outro: "#6366f1",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithRelations | null>(null);

  const { user } = useUser();
  const { data: orgUsers = [] } = useOrgUsers();
  const { data: events = [] } = useEvents({ month: viewMonth, year: viewYear });
  const { data: tasks = [] } = useAllTasks();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("demo");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [newNotes, setNewNotes] = useState("");
  const [newParticipants, setNewParticipants] = useState<string[]>([]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const eventsOnDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.start_at.startsWith(dateStr));
  };

  const tasksOnDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => t.due_date?.startsWith(dateStr));
  };

  const isToday = (day: number) =>
    day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setNewDate(dateStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate) return;
    const startAt = newTime ? `${newDate}T${newTime}:00` : `${newDate}T09:00:00`;
    await createEvent.mutateAsync({
      title: newTitle,
      type: newType as "demo" | "reuniao_exploratoria" | "followup" | "kickoff" | "review" | "interno" | "outro",
      start_at: startAt,
      duration_min: parseInt(newDuration) || 60,
      agenda: newNotes || null,
      org_id: user?.org_id ?? "",
      created_by: user?.id ?? "",
      lead_id: null,
      project_id: null,
      contact_id: null,
      participant_ids: newParticipants,
      meeting_url: null,
      result: null,
    });
    setFormOpen(false);
    setNewTitle("");
    setNewType("demo");
    setNewTime("");
    setNewDuration("60");
    setNewNotes("");
    setNewParticipants([]);
  };

  // Events this month for the selected day
  const dayEvents = selectedDay ? eventsOnDay(selectedDay) : [];
  const dayTasks = selectedDay ? tasksOnDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight" style={{ color: "#E2EBF8" }}>
            Agenda
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7BA3C6" }}>
            {events.length} evento{events.length !== 1 ? "s" : ""} em {MONTHS[viewMonth]}
          </p>
        </div>
        <Button
          onClick={() => { setFormOpen(true); setNewDate(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`); }}
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #0B87C3, #0CA8F5)", color: "#fff", boxShadow: "0 0 16px rgba(11,135,195,0.3)" }}
        >
          <Plus size={15} />
          Novo Evento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
        >
          {/* Month navigation */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "rgba(11,135,195,0.1)" }}
          >
            <button onClick={prevMonth} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
              <ChevronLeft size={18} style={{ color: "#7BA3C6" }} />
            </button>
            <h2 className="font-display font-bold text-lg" style={{ color: "#E2EBF8" }}>
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
              <ChevronRight size={18} style={{ color: "#7BA3C6" }} />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 border-b" style={{ borderColor: "rgba(11,135,195,0.08)" }}>
            {DAYS.map((d) => (
              <div key={d} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#3D5A78" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells for first day offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 border-b border-r" style={{ borderColor: "rgba(11,135,195,0.06)" }} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvts = eventsOnDay(day);
              const dayTsks = tasksOnDay(day);
              const today = isToday(day);
              const selected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className="h-20 p-1.5 border-b border-r cursor-pointer transition-all overflow-hidden"
                  style={{
                    borderColor: "rgba(11,135,195,0.06)",
                    background: selected
                      ? "rgba(11,135,195,0.08)"
                      : today
                      ? "rgba(11,135,195,0.04)"
                      : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "rgba(11,135,195,0.04)"; }}
                  onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = today ? "rgba(11,135,195,0.04)" : "transparent"; }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full`}
                      style={{
                        background: today ? "#0B87C3" : "transparent",
                        color: today ? "#fff" : selected ? "#0B87C3" : "#7BA3C6",
                      }}
                    >
                      {day}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayEvts.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[10px] px-1 py-0.5 rounded truncate leading-tight"
                        style={{
                          background: `${TYPE_COLOR[ev.type] ?? "#3D5A78"}20`,
                          color: TYPE_COLOR[ev.type] ?? "#3D5A78",
                          borderLeft: `2px solid ${TYPE_COLOR[ev.type] ?? "#3D5A78"}`,
                        }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayTsks.slice(0, 1).map((t) => (
                      <div
                        key={t.id}
                        className="text-[10px] px-1 py-0.5 rounded truncate leading-tight"
                        style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", borderLeft: "2px solid #f59e0b" }}
                      >
                        ✓ {t.title}
                      </div>
                    ))}
                    {dayEvts.length + dayTsks.length > 3 && (
                      <div className="text-[9px]" style={{ color: "#3D5A78" }}>
                        +{dayEvts.length + dayTsks.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day details */}
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>
                {selectedDay
                  ? `${selectedDay} de ${MONTHS[viewMonth]}`
                  : "Selecione um dia"}
              </h3>
              {selectedDay && (
                <button
                  onClick={() => { setFormOpen(true); }}
                  className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: "rgba(11,135,195,0.1)", color: "#0B87C3" }}
                >
                  <Plus size={11} /> Evento
                </button>
              )}
            </div>

            {!selectedDay ? (
              <div className="text-center py-8">
                <CalendarIcon size={28} className="mx-auto mb-2 opacity-20" style={{ color: "#0B87C3" }} />
                <p className="text-xs" style={{ color: "#3D5A78" }}>Clique num dia para ver eventos</p>
              </div>
            ) : dayEvents.length === 0 && dayTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs" style={{ color: "#3D5A78" }}>Sem eventos neste dia</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg cursor-pointer"
                    style={{
                      background: `${TYPE_COLOR[ev.type] ?? "#3D5A78"}0A`,
                      border: `1px solid ${TYPE_COLOR[ev.type] ?? "#3D5A78"}25`,
                    }}
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold" style={{ color: "#E2EBF8" }}>{ev.title}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEvent.mutate(ev.id); }}
                        className="opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <X size={11} style={{ color: "#ef4444" }} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={10} style={{ color: "#7BA3C6" }} />
                      <span className="text-[10px]" style={{ color: "#7BA3C6" }}>
                        {ev.start_at.slice(11, 16)}{ev.duration_min ? ` · ${ev.duration_min}min` : ""}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                        style={{
                          background: `${TYPE_COLOR[ev.type] ?? "#3D5A78"}20`,
                          color: TYPE_COLOR[ev.type] ?? "#3D5A78",
                        }}
                      >
                        {EVENT_TYPES.find((t) => t.value === ev.type)?.label ?? ev.type}
                      </span>
                    </div>
                  </div>
                ))}
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg"
                    style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}
                  >
                    <p className="text-xs font-semibold" style={{ color: "#E2EBF8" }}>{t.title}</p>
                    <p className="text-[10px] mt-1" style={{ color: "#f59e0b" }}>Tarefa — {t.priority}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming events (next 5) */}
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}
          >
            <h3 className="font-semibold text-sm mb-3" style={{ color: "#E2EBF8" }}>Próximos Eventos</h3>
            {events.filter((e) => new Date(e.start_at) >= now).slice(0, 5).length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "#3D5A78" }}>Nenhum evento futuro</p>
            ) : (
              <div className="space-y-2">
                {events
                  .filter((e) => new Date(e.start_at) >= now)
                  .slice(0, 5)
                  .map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[ev.type] ?? "#3D5A78" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: "#E2EBF8" }}>{ev.title}</p>
                        <p className="text-[10px]" style={{ color: "#7BA3C6" }}>{formatDate(ev.start_at)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
            <DialogDescription>Adicione um evento à agenda</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Reunião com cliente"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Horário</Label>
                <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Duração (min)</Label>
                <Input type="number" min="15" step="15" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} placeholder="60" />
              </div>
            </div>
            {orgUsers.length > 0 && (
              <div className="space-y-1.5">
                <Label>Participantes</Label>
                <div className="flex flex-wrap gap-2">
                  {orgUsers.map((u) => {
                    const selected = newParticipants.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setNewParticipants((prev) =>
                          selected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                        )}
                        className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                        style={{
                          background: selected ? "rgba(11,135,195,0.2)" : "rgba(11,135,195,0.06)",
                          border: `1px solid ${selected ? "rgba(11,135,195,0.5)" : "rgba(11,135,195,0.15)"}`,
                          color: selected ? "#0CA8F5" : "#7BA3C6",
                        }}
                      >
                        {u.full_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Observações..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                disabled={createEvent.isPending}
                style={{ background: "linear-gradient(135deg, #0B87C3, #0CA8F5)", color: "#fff" }}
              >
                Criar Evento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(v) => !v && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>Detalhes do evento</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: "#7BA3C6" }}>
                <Tag size={14} />
                <span className="capitalize">{EVENT_TYPES.find((t) => t.value === selectedEvent.type)?.label ?? selectedEvent.type}</span>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: "#7BA3C6" }}>
                <Clock size={14} />
                <span>{formatDate(selectedEvent.start_at)} — {selectedEvent.start_at.slice(11, 16)}{selectedEvent.duration_min ? ` · ${selectedEvent.duration_min}min` : ""}</span>
              </div>
              {selectedEvent.lead && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#7BA3C6" }}>
                  <Briefcase size={14} />
                  <span>Lead: {selectedEvent.lead.title}</span>
                </div>
              )}
              {selectedEvent.contact && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#7BA3C6" }}>
                  <User size={14} />
                  <span>Contato: {selectedEvent.contact.full_name}</span>
                </div>
              )}
              {selectedEvent.participant_ids && selectedEvent.participant_ids.length > 0 && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#7BA3C6" }}>
                  <User size={14} />
                  <span>
                    {selectedEvent.participant_ids
                      .map((id) => orgUsers.find((u) => u.id === id)?.full_name ?? id)
                      .join(", ")}
                  </span>
                </div>
              )}
              {selectedEvent.agenda && (
                <p className="text-sm p-3 rounded-lg" style={{ background: "rgba(11,135,195,0.05)", color: "#E2EBF8", border: "1px solid rgba(11,135,195,0.1)" }}>
                  {selectedEvent.agenda}
                </p>
              )}
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 text-xs"
                  onClick={() => { deleteEvent.mutate(selectedEvent.id); setSelectedEvent(null); }}
                >
                  <Trash2 size={13} className="mr-1" /> Remover evento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
