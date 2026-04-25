"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  Clock, X, Tag, Briefcase, User, Trash2, Bell, CheckCircle2,
  Phone, Mail, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useEvents, useCreateEvent, useDeleteEvent, type EventWithRelations,
} from "@/lib/hooks/use-events";
import {
  useAllTasks, useCreateTask, useUpdateTask, type TaskWithRelations,
} from "@/lib/hooks/use-tasks";
import { useUser, useOrgUsers } from "@/lib/hooks/use-user";
import { useLeads } from "@/lib/hooks/use-leads";
import { useContacts } from "@/lib/hooks/use-contacts";
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

const FU_PRIORITY_COLOR: Record<string, string> = {
  urgente: "#ef4444",
  alta: "#f59e0b",
  media: "#0B87C3",
  baixa: "#22c55e",
};

const FU_TYPE_ICONS: Record<string, React.ReactNode> = {
  followup: <RefreshCw size={11} />,
  ligacao: <Phone size={11} />,
  email: <Mail size={11} />,
  outro: <Bell size={11} />,
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Shared calendar grid ────────────────────────────────────────────────────
interface CalendarGridProps {
  viewYear: number;
  viewMonth: number;
  selectedDay: number | null;
  onDayClick: (day: number) => void;
  getDayDots: (day: number) => { color: string; label: string }[];
  isToday: (day: number) => boolean;
}

function CalendarGrid({ viewYear, viewMonth, selectedDay, onDayClick, getDayDots, isToday }: CalendarGridProps) {
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  return (
    <div className="grid grid-cols-7">
      {Array.from({ length: firstDay }).map((_, i) => (
        <div key={`empty-${i}`} className="h-20 border-b border-r" style={{ borderColor: "rgba(11,135,195,0.06)" }} />
      ))}
      {Array.from({ length: daysInMonth }).map((_, i) => {
        const day = i + 1;
        const dots = getDayDots(day);
        const today = isToday(day);
        const selected = selectedDay === day;
        return (
          <div
            key={day}
            onClick={() => onDayClick(day)}
            className="h-20 p-1.5 border-b border-r cursor-pointer transition-all overflow-hidden"
            style={{
              borderColor: "rgba(11,135,195,0.06)",
              background: selected ? "rgba(11,135,195,0.08)" : today ? "rgba(11,135,195,0.04)" : "transparent",
            }}
            onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "rgba(11,135,195,0.04)"; }}
            onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = today ? "rgba(11,135,195,0.04)" : "transparent"; }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                style={{ background: today ? "#0B87C3" : "transparent", color: today ? "#fff" : selected ? "#0B87C3" : "#7BA3C6" }}
              >
                {day}
              </span>
            </div>
            <div className="space-y-0.5">
              {dots.slice(0, 3).map((dot, idx) => (
                <div
                  key={idx}
                  className="text-[10px] px-1 py-0.5 rounded truncate leading-tight"
                  style={{ background: `${dot.color}20`, color: dot.color, borderLeft: `2px solid ${dot.color}` }}
                >
                  {dot.label}
                </div>
              ))}
              {dots.length > 3 && (
                <div className="text-[9px]" style={{ color: "#3D5A78" }}>+{dots.length - 3} mais</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const now = new Date();
  const { user } = useUser();
  const { data: orgUsers = [] } = useOrgUsers();
  const { data: leads = [] } = useLeads();
  const { data: contacts = [] } = useContacts();

  // ── AGENDA COMERCIAL state ──
  const [comYear, setComYear] = useState(now.getFullYear());
  const [comMonth, setComMonth] = useState(now.getMonth());
  const [comSelectedDay, setComSelectedDay] = useState<number | null>(null);
  const [comFormOpen, setComFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithRelations | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("demo");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [newNotes, setNewNotes] = useState("");
  const [newParticipants, setNewParticipants] = useState<string[]>([]);

  const { data: events = [] } = useEvents({ month: comMonth, year: comYear });
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();

  // ── AGENDA FOLLOW-UP state ──
  const [fuYear, setFuYear] = useState(now.getFullYear());
  const [fuMonth, setFuMonth] = useState(now.getMonth());
  const [fuSelectedDay, setFuSelectedDay] = useState<number | null>(null);
  const [fuFormOpen, setFuFormOpen] = useState(false);
  const [fuTitle, setFuTitle] = useState("");
  const [fuType, setFuType] = useState<"followup" | "ligacao" | "email" | "outro">("followup");
  const [fuPriority, setFuPriority] = useState<"baixa" | "media" | "alta" | "urgente">("media");
  const [fuSelectedDates, setFuSelectedDates] = useState<string[]>([]);
  const [fuTime, setFuTime] = useState("");
  const [fuLeadId, setFuLeadId] = useState("__none__");
  const [fuContactId, setFuContactId] = useState("__none__");
  const [fuAssigneeId, setFuAssigneeId] = useState("__none__");
  const [fuNotes, setFuNotes] = useState("");
  const [fuReminderDays, setFuReminderDays] = useState("1");
  const [fuDetailTask, setFuDetailTask] = useState<TaskWithRelations | null>(null);

  const { data: allFollowUps = [] } = useAllTasks({ type: "followup" as const });
  const { data: allTasks = [] } = useAllTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // ── Helpers ──
  const isToday = (year: number, month: number, day: number) =>
    day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  // Agenda comercial dots
  const comEventDots = (day: number) => {
    const dateStr = toDateStr(comYear, comMonth, day);
    const evs = events.filter((e) => e.start_at.startsWith(dateStr));
    const tsks = allTasks.filter((t) => t.due_date?.startsWith(dateStr));
    return [
      ...evs.map((e) => ({ color: TYPE_COLOR[e.type] ?? "#3D5A78", label: e.title })),
      ...tsks.map((t) => ({ color: "#f59e0b", label: `✓ ${t.title}` })),
    ];
  };

  // Follow-up dots
  const fuDots = (day: number) => {
    const dateStr = toDateStr(fuYear, fuMonth, day);
    return allFollowUps
      .filter((t) => t.due_date?.startsWith(dateStr))
      .map((t) => ({
        color: FU_PRIORITY_COLOR[t.priority] ?? "#0B87C3",
        label: t.title,
      }));
  };

  // Seleção de datas no follow-up (toggle)
  const toggleFuDate = (day: number) => {
    const dateStr = toDateStr(fuYear, fuMonth, day);
    setFuSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
    setFuSelectedDay(day);
  };

  const resetFuForm = () => {
    setFuTitle(""); setFuType("followup"); setFuPriority("media");
    setFuSelectedDates([]); setFuTime(""); setFuLeadId("__none__");
    setFuContactId("__none__"); setFuAssigneeId("__none__");
    setFuNotes(""); setFuReminderDays("1");
  };

  // Criar follow-up (um por data selecionada)
  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuTitle || fuSelectedDates.length === 0) return;

    const datesOrFallback = fuSelectedDates.length > 0
      ? fuSelectedDates
      : [toDateStr(fuYear, fuMonth, now.getDate())];

    for (const date of datesOrFallback) {
      const dueDate = fuTime ? `${date}T${fuTime}:00` : date;
      await createTask.mutateAsync({
        org_id: user?.org_id ?? "",
        title: fuTitle,
        type: fuType,
        priority: fuPriority,
        status: "pendente",
        due_date: dueDate,
        lead_id: fuLeadId !== "__none__" ? fuLeadId : null,
        contact_id: fuContactId !== "__none__" ? fuContactId : null,
        assignee_id: fuAssigneeId !== "__none__" ? fuAssigneeId : null,
        notes: [
          fuNotes,
          fuReminderDays ? `lembrete:${fuReminderDays}` : "",
        ].filter(Boolean).join("\n") || null,
        created_by: user?.id ?? "",
      });
    }

    setFuFormOpen(false);
    resetFuForm();
  };

  const handleCompleteFollowUp = async (task: TaskWithRelations) => {
    await updateTask.mutateAsync({ id: task.id, status: "concluida" });
    setFuDetailTask(null);
  };

  // Agenda comercial submit
  const handleComSubmit = async (e: React.FormEvent) => {
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
      lead_id: null, project_id: null, contact_id: null,
      participant_ids: newParticipants,
      meeting_url: null, result: null,
    });
    setComFormOpen(false);
    setNewTitle(""); setNewType("demo"); setNewTime(""); setNewDuration("60");
    setNewNotes(""); setNewParticipants([]);
  };

  const comDayEvents = comSelectedDay ? events.filter((e) => e.start_at.startsWith(toDateStr(comYear, comMonth, comSelectedDay))) : [];
  const comDayTasks = comSelectedDay ? allTasks.filter((t) => t.due_date?.startsWith(toDateStr(comYear, comMonth, comSelectedDay))) : [];
  const fuDayTasks = fuSelectedDay ? allFollowUps.filter((t) => t.due_date?.startsWith(toDateStr(fuYear, fuMonth, fuSelectedDay))) : [];
  const pendingFuCount = allFollowUps.filter((t) => t.status === "pendente" || t.status === "em_andamento").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight" style={{ color: "#E2EBF8" }}>Agenda</h1>
          <p className="text-sm mt-1" style={{ color: "#7BA3C6" }}>Gerencie eventos e follow-ups</p>
        </div>
      </div>

      <Tabs defaultValue="comercial">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="comercial" className="data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5">
            <CalendarIcon size={14} />
            Agenda Comercial
          </TabsTrigger>
          <TabsTrigger value="followup" className="data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5">
            <Bell size={14} />
            Follow-up
            {pendingFuCount > 0 && (
              <span className="ml-1 bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingFuCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA: AGENDA COMERCIAL ─── */}
        <TabsContent value="comercial">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: "#7BA3C6" }}>
              {events.length} evento{events.length !== 1 ? "s" : ""} em {MONTHS[comMonth]}
            </p>
            <Button
              onClick={() => { setComFormOpen(true); setNewDate(toDateStr(comYear, comMonth, now.getDate())); }}
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #0B87C3, #0CA8F5)", color: "#fff", boxShadow: "0 0 16px rgba(11,135,195,0.3)" }}
            >
              <Plus size={15} /> Novo Evento
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(11,135,195,0.1)" }}>
                <button onClick={() => { if (comMonth === 0) { setComMonth(11); setComYear((y) => y - 1); } else setComMonth((m) => m - 1); }} className="p-1.5 rounded-lg hover:bg-white/5">
                  <ChevronLeft size={18} style={{ color: "#7BA3C6" }} />
                </button>
                <h2 className="font-display font-bold text-lg" style={{ color: "#E2EBF8" }}>{MONTHS[comMonth]} {comYear}</h2>
                <button onClick={() => { if (comMonth === 11) { setComMonth(0); setComYear((y) => y + 1); } else setComMonth((m) => m + 1); }} className="p-1.5 rounded-lg hover:bg-white/5">
                  <ChevronRight size={18} style={{ color: "#7BA3C6" }} />
                </button>
              </div>
              <div className="grid grid-cols-7 border-b" style={{ borderColor: "rgba(11,135,195,0.08)" }}>
                {DAYS.map((d) => (
                  <div key={d} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#3D5A78" }}>{d}</div>
                ))}
              </div>
              <CalendarGrid
                viewYear={comYear} viewMonth={comMonth} selectedDay={comSelectedDay}
                onDayClick={(day) => { setComSelectedDay(day); setNewDate(toDateStr(comYear, comMonth, day)); }}
                getDayDots={comEventDots}
                isToday={(d) => isToday(comYear, comMonth, d)}
              />
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              <div className="rounded-xl p-5" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>
                    {comSelectedDay ? `${comSelectedDay} de ${MONTHS[comMonth]}` : "Selecione um dia"}
                  </h3>
                  {comSelectedDay && (
                    <button onClick={() => setComFormOpen(true)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(11,135,195,0.1)", color: "#0B87C3" }}>
                      <Plus size={11} /> Evento
                    </button>
                  )}
                </div>
                {!comSelectedDay ? (
                  <div className="text-center py-8">
                    <CalendarIcon size={28} className="mx-auto mb-2 opacity-20" style={{ color: "#0B87C3" }} />
                    <p className="text-xs" style={{ color: "#3D5A78" }}>Clique num dia para ver eventos</p>
                  </div>
                ) : comDayEvents.length === 0 && comDayTasks.length === 0 ? (
                  <p className="text-xs text-center py-8" style={{ color: "#3D5A78" }}>Sem eventos neste dia</p>
                ) : (
                  <div className="space-y-2">
                    {comDayEvents.map((ev) => (
                      <div key={ev.id} className="p-3 rounded-lg cursor-pointer" style={{ background: `${TYPE_COLOR[ev.type] ?? "#3D5A78"}0A`, border: `1px solid ${TYPE_COLOR[ev.type] ?? "#3D5A78"}25` }} onClick={() => setSelectedEvent(ev)}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold" style={{ color: "#E2EBF8" }}>{ev.title}</p>
                          <button onClick={(e) => { e.stopPropagation(); deleteEvent.mutate(ev.id); }} className="opacity-50 hover:opacity-100">
                            <X size={11} style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={10} style={{ color: "#7BA3C6" }} />
                          <span className="text-[10px]" style={{ color: "#7BA3C6" }}>{ev.start_at.slice(11, 16)}{ev.duration_min ? ` · ${ev.duration_min}min` : ""}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: `${TYPE_COLOR[ev.type] ?? "#3D5A78"}20`, color: TYPE_COLOR[ev.type] ?? "#3D5A78" }}>
                            {EVENT_TYPES.find((t) => t.value === ev.type)?.label ?? ev.type}
                          </span>
                        </div>
                      </div>
                    ))}
                    {comDayTasks.map((t) => (
                      <div key={t.id} className="p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                        <p className="text-xs font-semibold" style={{ color: "#E2EBF8" }}>{t.title}</p>
                        <p className="text-[10px] mt-1" style={{ color: "#f59e0b" }}>Tarefa — {t.priority}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Próximos eventos */}
              <div className="rounded-xl p-5" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
                <h3 className="font-semibold text-sm mb-3" style={{ color: "#E2EBF8" }}>Próximos Eventos</h3>
                {events.filter((e) => new Date(e.start_at) >= now).slice(0, 5).length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "#3D5A78" }}>Nenhum evento futuro</p>
                ) : (
                  <div className="space-y-2">
                    {events.filter((e) => new Date(e.start_at) >= now).slice(0, 5).map((ev) => (
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
        </TabsContent>

        {/* ─── ABA: FOLLOW-UP ─── */}
        <TabsContent value="followup">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: "#7BA3C6" }}>
              {allFollowUps.filter((t) => t.status === "pendente").length} follow-up{allFollowUps.filter((t) => t.status === "pendente").length !== 1 ? "s" : ""} pendente{allFollowUps.filter((t) => t.status === "pendente").length !== 1 ? "s" : ""} em {MONTHS[fuMonth]}
            </p>
            <Button
              onClick={() => { setFuFormOpen(true); }}
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", boxShadow: "0 0 16px rgba(34,197,94,0.25)" }}
            >
              <Plus size={15} /> Novo Follow-up
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(34,197,94,0.1)" }}>
                <button onClick={() => { if (fuMonth === 0) { setFuMonth(11); setFuYear((y) => y - 1); } else setFuMonth((m) => m - 1); }} className="p-1.5 rounded-lg hover:bg-white/5">
                  <ChevronLeft size={18} style={{ color: "#7BA3C6" }} />
                </button>
                <h2 className="font-display font-bold text-lg" style={{ color: "#E2EBF8" }}>{MONTHS[fuMonth]} {fuYear}</h2>
                <button onClick={() => { if (fuMonth === 11) { setFuMonth(0); setFuYear((y) => y + 1); } else setFuMonth((m) => m + 1); }} className="p-1.5 rounded-lg hover:bg-white/5">
                  <ChevronRight size={18} style={{ color: "#7BA3C6" }} />
                </button>
              </div>
              <div className="grid grid-cols-7 border-b" style={{ borderColor: "rgba(34,197,94,0.08)" }}>
                {DAYS.map((d) => (
                  <div key={d} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#3D5A78" }}>{d}</div>
                ))}
              </div>
              <CalendarGrid
                viewYear={fuYear} viewMonth={fuMonth} selectedDay={fuSelectedDay}
                onDayClick={setFuSelectedDay}
                getDayDots={fuDots}
                isToday={(d) => isToday(fuYear, fuMonth, d)}
              />
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              {/* Day follow-ups */}
              <div className="rounded-xl p-5" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm" style={{ color: "#E2EBF8" }}>
                    {fuSelectedDay ? `${fuSelectedDay} de ${MONTHS[fuMonth]}` : "Selecione um dia"}
                  </h3>
                  {fuSelectedDay && (
                    <button onClick={() => setFuFormOpen(true)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                      <Plus size={11} /> Follow-up
                    </button>
                  )}
                </div>
                {!fuSelectedDay ? (
                  <div className="text-center py-8">
                    <Bell size={28} className="mx-auto mb-2 opacity-20" style={{ color: "#22c55e" }} />
                    <p className="text-xs" style={{ color: "#3D5A78" }}>Clique num dia para ver follow-ups</p>
                  </div>
                ) : fuDayTasks.length === 0 ? (
                  <p className="text-xs text-center py-8" style={{ color: "#3D5A78" }}>Sem follow-ups neste dia</p>
                ) : (
                  <div className="space-y-2">
                    {fuDayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        style={{
                          background: `${FU_PRIORITY_COLOR[t.priority] ?? "#0B87C3"}0A`,
                          border: `1px solid ${FU_PRIORITY_COLOR[t.priority] ?? "#0B87C3"}25`,
                        }}
                        onClick={() => setFuDetailTask(t)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: FU_PRIORITY_COLOR[t.priority] }}>{FU_TYPE_ICONS[t.type] ?? <Bell size={11} />}</span>
                            <p className="text-xs font-semibold" style={{ color: "#E2EBF8" }}>{t.title}</p>
                          </div>
                          <Badge
                            className="text-[10px] px-1.5 shrink-0"
                            style={{ background: `${FU_PRIORITY_COLOR[t.priority]}20`, color: FU_PRIORITY_COLOR[t.priority], border: "none" }}
                          >
                            {t.priority}
                          </Badge>
                        </div>
                        {t.due_date && (
                          <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: "#7BA3C6" }}>
                            <Clock size={9} />{t.due_date.slice(11, 16) || formatDate(t.due_date)}
                          </p>
                        )}
                        {t.status === "concluida" && (
                          <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: "#22c55e" }}>
                            <CheckCircle2 size={9} /> Concluído
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Próximos follow-ups */}
              <div className="rounded-xl p-5" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <h3 className="font-semibold text-sm mb-3" style={{ color: "#E2EBF8" }}>Próximos Follow-ups</h3>
                {allFollowUps.filter((t) => t.status === "pendente" && t.due_date && new Date(t.due_date) >= now).slice(0, 6).length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "#3D5A78" }}>Nenhum follow-up futuro</p>
                ) : (
                  <div className="space-y-2">
                    {allFollowUps
                      .filter((t) => t.status === "pendente" && t.due_date && new Date(t.due_date) >= now)
                      .slice(0, 6)
                      .map((t) => (
                        <div key={t.id} className="flex items-center gap-2.5 cursor-pointer" onClick={() => setFuDetailTask(t)}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: FU_PRIORITY_COLOR[t.priority] ?? "#0B87C3" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate" style={{ color: "#E2EBF8" }}>{t.title}</p>
                            <p className="text-[10px]" style={{ color: "#7BA3C6" }}>{t.due_date ? formatDate(t.due_date) : "—"}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── DIALOG: Novo Evento Comercial ─── */}
      <Dialog open={comFormOpen} onOpenChange={(v) => !v && setComFormOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
            <DialogDescription>Adicione um evento à agenda comercial</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleComSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Reunião com cliente" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
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
                      <button key={u.id} type="button"
                        onClick={() => setNewParticipants((prev) => selected ? prev.filter((id) => id !== u.id) : [...prev, u.id])}
                        className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                        style={{ background: selected ? "rgba(11,135,195,0.2)" : "rgba(11,135,195,0.06)", border: `1px solid ${selected ? "rgba(11,135,195,0.5)" : "rgba(11,135,195,0.15)"}`, color: selected ? "#0CA8F5" : "#7BA3C6" }}
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
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Observações..." rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setComFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createEvent.isPending} style={{ background: "linear-gradient(135deg, #0B87C3, #0CA8F5)", color: "#fff" }}>Criar Evento</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Novo Follow-up ─── */}
      <Dialog open={fuFormOpen} onOpenChange={(v) => { if (!v) { setFuFormOpen(false); resetFuForm(); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell size={16} className="text-green-400" /> Novo Follow-up
            </DialogTitle>
            <DialogDescription>Selecione os dias no calendário e configure o lembrete</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFollowUp} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={fuTitle} onChange={(e) => setFuTitle(e.target.value)} placeholder="Ex: Ligar para João — proposta pendente" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={fuType} onValueChange={(v) => setFuType(v as typeof fuType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={fuPriority} onValueChange={(v) => setFuPriority(v as typeof fuPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Seletor de datas via mini-calendário */}
            <div className="space-y-2">
              <Label>Dias do Follow-up *</Label>
              <p className="text-xs" style={{ color: "#7BA3C6" }}>Selecione um ou mais dias abaixo</p>
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
                <div className="flex items-center justify-between px-4 py-2" style={{ background: "rgba(34,197,94,0.05)" }}>
                  <button type="button"
                    onClick={() => { if (fuMonth === 0) { setFuMonth(11); setFuYear((y) => y - 1); } else setFuMonth((m) => m - 1); }}
                    className="p-1 rounded hover:bg-white/5"
                  ><ChevronLeft size={14} style={{ color: "#7BA3C6" }} /></button>
                  <span className="text-xs font-semibold" style={{ color: "#E2EBF8" }}>{MONTHS[fuMonth]} {fuYear}</span>
                  <button type="button"
                    onClick={() => { if (fuMonth === 11) { setFuMonth(0); setFuYear((y) => y + 1); } else setFuMonth((m) => m + 1); }}
                    className="p-1 rounded hover:bg-white/5"
                  ><ChevronRight size={14} style={{ color: "#7BA3C6" }} /></button>
                </div>
                <div className="grid grid-cols-7 px-2 pt-1 pb-0.5">
                  {DAYS.map((d) => <div key={d} className="text-center text-[9px] font-bold uppercase py-1" style={{ color: "#3D5A78" }}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
                  {Array.from({ length: getFirstDayOfMonth(fuYear, fuMonth) }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: getDaysInMonth(fuYear, fuMonth) }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = toDateStr(fuYear, fuMonth, day);
                    const selected = fuSelectedDates.includes(dateStr);
                    const today = isToday(fuYear, fuMonth, day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleFuDate(day)}
                        className="w-7 h-7 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all"
                        style={{
                          background: selected ? "#22c55e" : today ? "rgba(34,197,94,0.15)" : "transparent",
                          color: selected ? "#fff" : today ? "#22c55e" : "#7BA3C6",
                          border: selected ? "none" : today ? "1px solid rgba(34,197,94,0.3)" : "none",
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              {fuSelectedDates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {fuSelectedDates.sort().map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                      {d}
                      <button type="button" onClick={() => setFuSelectedDates((prev) => prev.filter((x) => x !== d))}>
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Horário (opcional)</Label>
                <Input type="time" value={fuTime} onChange={(e) => setFuTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Lembrete (dias antes)</Label>
                <Select value={fuReminderDays} onValueChange={setFuReminderDays}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No dia</SelectItem>
                    <SelectItem value="1">1 dia antes</SelectItem>
                    <SelectItem value="2">2 dias antes</SelectItem>
                    <SelectItem value="3">3 dias antes</SelectItem>
                    <SelectItem value="7">1 semana antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lead (opcional)</Label>
                <Select value={fuLeadId} onValueChange={setFuLeadId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {leads.slice(0, 50).map((l) => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contato (opcional)</Label>
                <Select value={fuContactId} onValueChange={setFuContactId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {contacts.slice(0, 50).map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {orgUsers.length > 0 && (
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select value={fuAssigneeId} onValueChange={setFuAssigneeId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {orgUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={fuNotes} onChange={(e) => setFuNotes(e.target.value)} placeholder="Contexto do follow-up..." rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setFuFormOpen(false); resetFuForm(); }}>Cancelar</Button>
              <Button
                type="submit"
                disabled={createTask.isPending || fuSelectedDates.length === 0}
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff" }}
              >
                {fuSelectedDates.length > 1 ? `Criar ${fuSelectedDates.length} Follow-ups` : "Criar Follow-up"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Detalhe Follow-up ─── */}
      <Dialog open={!!fuDetailTask} onOpenChange={(v) => !v && setFuDetailTask(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span style={{ color: FU_PRIORITY_COLOR[fuDetailTask?.priority ?? "media"] }}>{FU_TYPE_ICONS[fuDetailTask?.type ?? "followup"] ?? <Bell size={14} />}</span>
              {fuDetailTask?.title}
            </DialogTitle>
            <DialogDescription>Detalhes do follow-up</DialogDescription>
          </DialogHeader>
          {fuDetailTask && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-3">
                <Badge style={{ background: `${FU_PRIORITY_COLOR[fuDetailTask.priority]}20`, color: FU_PRIORITY_COLOR[fuDetailTask.priority], border: "none" }}>
                  {fuDetailTask.priority}
                </Badge>
                <Badge variant="secondary" className="text-xs">{fuDetailTask.status}</Badge>
              </div>
              {fuDetailTask.due_date && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#7BA3C6" }}>
                  <Clock size={14} />
                  <span>{formatDate(fuDetailTask.due_date)}{fuDetailTask.due_date.includes("T") ? ` — ${fuDetailTask.due_date.slice(11,16)}` : ""}</span>
                </div>
              )}
              {fuDetailTask.lead && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#7BA3C6" }}>
                  <Briefcase size={14} /><span>Lead: {fuDetailTask.lead.title}</span>
                </div>
              )}
              {fuDetailTask.assignee && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#7BA3C6" }}>
                  <User size={14} /><span>Responsável: {fuDetailTask.assignee.full_name}</span>
                </div>
              )}
              {fuDetailTask.notes && (
                <p className="text-sm p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.05)", color: "#E2EBF8", border: "1px solid rgba(34,197,94,0.1)" }}>
                  {fuDetailTask.notes.split("\n").filter((l) => !l.startsWith("lembrete:")).join("\n")}
                </p>
              )}
              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 text-xs"
                  onClick={async () => { await updateTask.mutateAsync({ id: fuDetailTask.id, status: "cancelada" }); setFuDetailTask(null); }}
                >
                  <Trash2 size={13} className="mr-1" /> Cancelar
                </Button>
                {fuDetailTask.status !== "concluida" && (
                  <Button
                    onClick={() => handleCompleteFollowUp(fuDetailTask)}
                    disabled={updateTask.isPending}
                    className="text-xs"
                    style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
                  >
                    <CheckCircle2 size={13} className="mr-1" /> Marcar Concluído
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Detalhe Evento Comercial ─── */}
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
                  <Briefcase size={14} /><span>Lead: {selectedEvent.lead.title}</span>
                </div>
              )}
              {selectedEvent.contact && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#7BA3C6" }}>
                  <User size={14} /><span>Contato: {selectedEvent.contact.full_name}</span>
                </div>
              )}
              {selectedEvent.participant_ids?.length > 0 && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#7BA3C6" }}>
                  <User size={14} />
                  <span>{selectedEvent.participant_ids.map((id) => orgUsers.find((u) => u.id === id)?.full_name ?? id).join(", ")}</span>
                </div>
              )}
              {selectedEvent.agenda && (
                <p className="text-sm p-3 rounded-lg" style={{ background: "rgba(11,135,195,0.05)", color: "#E2EBF8", border: "1px solid rgba(11,135,195,0.1)" }}>
                  {selectedEvent.agenda}
                </p>
              )}
              <div className="flex justify-end pt-2">
                <Button variant="ghost" className="text-red-400 hover:text-red-300 text-xs" onClick={() => { deleteEvent.mutate(selectedEvent.id); setSelectedEvent(null); }}>
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
