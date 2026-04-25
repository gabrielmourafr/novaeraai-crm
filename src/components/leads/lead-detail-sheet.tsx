"use client";

import Link from "next/link";
import { Building2, User, Eye, Pencil, CalendarPlus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useLead } from "@/lib/hooks/use-leads";
import type { LeadWithRelations } from "@/lib/hooks/use-leads";
import { TEMPERATURES } from "@/lib/utils/constants";

interface LeadDetailSheetProps {
  lead: LeadWithRelations | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (lead: LeadWithRelations) => void;
  onQuickTask?: (lead: LeadWithRelations) => void;
}

export const LeadDetailSheet = ({
  lead,
  open,
  onClose,
  onEdit,
  onQuickTask,
}: LeadDetailSheetProps) => {
  const { data: fullLead } = useLead(lead?.id ?? "");
  const displayLead = fullLead || lead;

  if (!displayLead) return null;

  const tempLabel = TEMPERATURES.find((t) => t.value === displayLead.temperature)?.label;
  const tempColor: Record<string, string> = {
    frio: "text-blue-400",
    morno: "text-orange-400",
    quente: "text-red-400",
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[450px] overflow-y-auto">
        <SheetHeader className="border-b pb-4 mb-6">
          <div className="space-y-2">
            <SheetTitle className="text-xl">{displayLead.title}</SheetTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {displayLead.temperature && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${tempColor[displayLead.temperature] ?? "text-text-muted"}`} style={{ background: "rgba(34,197,94,0.1)" }}>
                  {tempLabel}
                </span>
              )}
              {displayLead.stage && (
                <span className="text-xs font-medium px-2 py-1 rounded-full text-text-muted" style={{ background: "rgba(11,135,195,0.1)" }}>
                  {displayLead.stage.name}
                </span>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Value */}
          {displayLead.value && (
            <div className="p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.1)" }}>
              <p className="text-xs text-text-muted mb-1">Valor</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(displayLead.value)}</p>
            </div>
          )}

          {/* Primary Contact */}
          {displayLead.contact && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-text-muted">Contato Principal</p>
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-text-muted shrink-0" />
                <span className="font-medium text-text-primary">{displayLead.contact.full_name}</span>
              </div>
            </div>
          )}

          {/* Company */}
          {displayLead.company && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-text-muted">Empresa</p>
              <div className="flex items-center gap-2 text-sm">
                <Building2 size={14} className="text-text-muted shrink-0" />
                <p className="font-medium text-text-primary">{displayLead.company.name}</p>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="space-y-3 p-3 rounded-lg" style={{ background: "rgba(12,21,38,0.5)" }}>
            <p className="text-xs font-semibold uppercase text-text-muted">Detalhes</p>
            {displayLead.business_unit && (
              <div className="text-sm">
                <p className="text-xs text-text-muted">Unidade</p>
                <p className="text-text-primary capitalize">{displayLead.business_unit}</p>
              </div>
            )}
            {displayLead.probability !== undefined && (
              <div className="text-sm">
                <p className="text-xs text-text-muted">Probabilidade</p>
                <p className="text-text-primary">{displayLead.probability}%</p>
              </div>
            )}
            {displayLead.created_at && (
              <div className="text-sm">
                <p className="text-xs text-text-muted">Criado em</p>
                <p className="text-text-primary">{formatDate(displayLead.created_at)}</p>
              </div>
            )}
            {displayLead.next_followup && (
              <div className="text-sm">
                <p className="text-xs text-text-muted">Próximo follow-up</p>
                <p className="text-text-primary">{formatDate(displayLead.next_followup)}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/leads/${displayLead.id}`}>
                <Eye size={14} className="mr-1.5" />
                Ver Completo
              </Link>
            </Button>
            {onEdit && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(displayLead)}>
                <Pencil size={14} className="mr-1.5" />
                Editar
              </Button>
            )}
            {onQuickTask && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onQuickTask(displayLead)}>
                <CalendarPlus size={14} className="mr-1.5" />
                Follow-up
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
