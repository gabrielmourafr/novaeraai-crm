"use client";

import { Building2, User, Calendar, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { LeadWithRelations } from "@/lib/hooks/use-leads";
import { TEMPERATURES } from "@/lib/utils/constants";

const temperatureColors: Record<string, string> = {
  frio: "bg-blue-950/60 text-blue-300",
  morno: "bg-orange-950/60 text-orange-300",
  quente: "bg-red-950/60 text-red-300",
};

interface LeadCardProps {
  lead: LeadWithRelations;
  onEdit: (lead: LeadWithRelations) => void;
  onDelete: (lead: LeadWithRelations) => void;
}

export const LeadCard = ({ lead, onEdit, onDelete }: LeadCardProps) => {
  const tempLabel = TEMPERATURES.find((t) => t.value === lead.temperature)?.label;

  return (
    <div className="bg-card rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-primary line-clamp-2 flex-1">{lead.title}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(lead)}
            className="p-1 rounded hover:bg-white/5 text-text-muted hover:text-primary"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(lead)}
            className="p-1 rounded hover:bg-red-950/40 text-text-muted hover:text-danger"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {lead.value && (
        <p className="text-sm font-semibold text-primary mt-1">
          {formatCurrency(lead.value)}
        </p>
      )}

      <div className="mt-2 space-y-1">
        {lead.company && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Building2 size={11} />
            <span className="truncate">{lead.company.name}</span>
          </div>
        )}
        {lead.contact && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <User size={11} />
            <span className="truncate">{lead.contact.full_name}</span>
          </div>
        )}
        {lead.expected_close_date && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Calendar size={11} />
            <span>{formatDate(lead.expected_close_date)}</span>
          </div>
        )}
      </div>

      {lead.temperature && (
        <div className="mt-2">
          <span
            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
              temperatureColors[lead.temperature] ?? "bg-white/5 text-gray-400"
            }`}
          >
            {tempLabel}
          </span>
        </div>
      )}
    </div>
  );
};
