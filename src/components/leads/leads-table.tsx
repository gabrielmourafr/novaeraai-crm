"use client";

import Link from "next/link";
import { Building2, User, Pencil, Trash2, ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { TEMPERATURES } from "@/lib/utils/constants";
import type { LeadWithRelations } from "@/lib/hooks/use-leads";

const temperatureColors: Record<string, string> = {
  frio: "bg-blue-950/60 text-blue-300",
  morno: "bg-orange-950/60 text-orange-300",
  quente: "bg-red-950/60 text-red-300",
};

interface LeadsTableProps {
  leads: LeadWithRelations[];
  onEdit: (lead: LeadWithRelations) => void;
  onDelete: (lead: LeadWithRelations) => void;
}

export const LeadsTable = ({ leads, onEdit, onDelete }: LeadsTableProps) => {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Empresa / Contato</TableHead>
            <TableHead>Pipeline</TableHead>
            <TableHead>Estágio</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Temp.</TableHead>
            <TableHead>Fechamento</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const tempLabel = TEMPERATURES.find((t) => t.value === lead.temperature)?.label;
            return (
              <TableRow key={lead.id} className="hover:bg-white/5/50">
                <TableCell>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-text-primary hover:text-primary hover:underline"
                  >
                    {lead.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {lead.company && (
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Building2 size={11} />
                        <span>{lead.company.name}</span>
                      </div>
                    )}
                    {lead.contact && (
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <User size={11} />
                        <span>{lead.contact.full_name}</span>
                      </div>
                    )}
                    {!lead.company && !lead.contact && (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-secondary">{lead.pipeline?.name ?? "—"}</span>
                </TableCell>
                <TableCell>
                  {lead.stage ? (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: lead.stage.color ?? "#94a3b8" }}
                      />
                      <span className="text-sm">{lead.stage.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-text-muted">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-primary">
                    {lead.value ? formatCurrency(lead.value) : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  {lead.temperature ? (
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        temperatureColors[lead.temperature] ?? "bg-white/5 text-gray-400"
                      }`}
                    >
                      {tempLabel}
                    </span>
                  ) : (
                    <span className="text-sm text-text-muted">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-secondary">
                    {lead.expected_close_date ? formatDate(lead.expected_close_date) : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(lead)}>
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-danger hover:text-danger"
                      onClick={() => onDelete(lead)}
                    >
                      <Trash2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <Link href={`/leads/${lead.id}`}>
                        <ArrowRight size={14} />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
