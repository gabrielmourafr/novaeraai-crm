import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// Converte um valor digitado em formato brasileiro (ex: "3.000,00" ou
// "26,68" ou "3000") pro number que o banco espera. Sem isso, valores com
// separador de milhar quebravam silenciosamente (ex: "3.000,00" virava
// 3.00 ou pior).
export const parseCurrencyInput = (raw: string): number => {
  const trimmed = raw.trim();
  if (!trimmed) return NaN;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  return parseFloat(normalized);
};

// Formata só o dia (sem hora). Para strings, usa o ano/mês/dia literal
// gravado no banco em vez de converter o instante pro fuso do navegador —
// evita que uma data salva sem hora (ex: due_date em colunas timestamptz)
// "volte um dia" pra quem está num fuso atrás de UTC (ex: Brasil).
export const formatDate = (date: string | Date) => {
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return format(d, "dd/MM/yyyy", { locale: ptBR });
    }
  }
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy", { locale: ptBR });
};

export const formatDateTime = (date: string | Date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

// Compara por dia de calendário (não pelo instante exato) se uma data já
// passou — evita que uma tarefa com vencimento "hoje" apareça como atrasada
// horas antes da meia-noite local, por causa do mesmo deslocamento de fuso
// que afeta formatDate em colunas timestamptz.
export const isPastDate = (date: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day)) < today;
  }
  return parseISO(date) < today;
};

// Extrai o "YYYY-MM-DD" literal de uma data (string ou Date local), pra
// comparar dias de calendário sem depender de fuso horário.
export const dateStringOf = (date: string | Date) => {
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[0];
  }
  const d = typeof date === "string" ? parseISO(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const formatRelative = (date: string | Date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
};

export const formatPercent = (value: number) =>
  `${value.toFixed(0)}%`;

// Formata a diferença entre duas datas em horas/minutos ou dias, pro
// "tempo gasto" de uma tarefa (started_at -> completed_at).
export const formatDurationBetween = (startISO: string, endISO: string) => {
  const ms = Math.max(0, new Date(endISO).getTime() - new Date(startISO).getTime());
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const totalHours = totalMinutes / 60;
  if (totalHours < 24) {
    const h = Math.floor(totalHours);
    const m = totalMinutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  const days = Math.floor(totalHours / 24);
  const remHours = Math.round(totalHours % 24);
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
};

// Formata horas decimais (ex: 2.5) como "2h 30min" pro tempo estimado.
export const formatHoursDecimal = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

export const formatInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
