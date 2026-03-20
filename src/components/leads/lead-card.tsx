"use client";

import Link from "next/link";
import { Building2, User, Calendar, Pencil, Trash2, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { LeadWithRelations } from "@/lib/hooks/use-leads";
import { TEMPERATURES } from "@/lib/utils/constants";

const temperatureColors: Record<string, string> = {
  frio: "bg-blue-950/60 text-blue-300 border-blue-800/30",
  morno: "bg-orange-950/60 text-orange-300 border-orange-800/30",
  quente: "bg-red-950/60 text-red-300 border-red-800/30",
};

interface LeadCardProps {
  lead: LeadWithRelations;
  onEdit: (lead: LeadWithRelations) => void;
  onDelete: (lead: LeadWithRelations) => void;
}

export const LeadCard = ({ lead, onEdit, onDelete }: LeadCardProps) => {
  const tempLabel = TEMPERATURES.find((t) => t.value === lead.temperature)?.label;

  return (
    <div className="bg-card rounded-lg border border-border p-3 hover:border-primary/30 transition-all duration-200 group cursor-pointer"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>

      {/* Header: title + actions */}
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/leads/${lead.id}`}
          className="text-sm font-semibold text-text-primary line-clamp-2 flex-1 hover:text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {lead.title}
        </Link>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
            className="p-1 rounded hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
            className="p-1 rounded hover:bg-red-950/40 text-text-muted hover:text-danger transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Value */}
      {lead.value && (
        <div className="flex items-center gap-1 mt-2">
          <TrendingUp size={11} className="text-primary" />
          <p className="text-sm font-bold text-primary">
            {formatCurrency(lead.value)}
          </p>
        </div>
      )}

      {/* Meta info */}
      <div className="mt-2 space-y-1">
        {lead.company && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Building2 size={10} className="shrink-0" />
            <span className="truncate">{lead.company.name}</span>
          </div>
        )}
        {lead.contact && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <User size={10} className="shrink-0" />
            <span className="truncate">{lead.contact.full_name}</span>
          </div>
        )}
        {lead.expected_close_date && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Calendar size={10} className="shrink-0" />
            <span>Fecha {formatDate(lead.expected_close_date)}</span>
          </div>
        )}
        {!lead.company && !lead.contact && !lead.expected_close_date && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted/50">
            <Calendar size={10} className="shrink-0" />
            <span>Criado em {formatDate(lead.created_at)}</span>
          </div>
        )}
      </div>

      {/* Temperature badge */}
      {lead.temperature && (
        <div className="mt-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${temperatureColors[lead.temperature] ?? "bg-white/5 text-text-muted border-border"}`}>
            {tempLabel}
          </span>
        </div>
      )}
    </div>
  );
};
