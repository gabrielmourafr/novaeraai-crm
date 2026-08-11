"use client";

import Link from "next/link";
import { Trophy, X } from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { useLeadWonNotices, useUpdateProject } from "@/lib/hooks/use-projects";
import { formatDate } from "@/lib/utils/format";

const GABRIEL_EMAIL = "gabriel@novaeraai.com.br";

export function LeadWonNotice() {
  const { user } = useUser();
  const { data: notices = [] } = useLeadWonNotices();
  const dismiss = useUpdateProject();

  if (user?.email !== GABRIEL_EMAIL || notices.length === 0) return null;

  return (
    <div className="rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
      <div className="flex items-center gap-2">
        <Trophy size={15} className="text-emerald-500" />
        <p className="text-sm font-semibold text-text-primary">
          {notices.length} lead{notices.length > 1 ? "s" : ""} fechado{notices.length > 1 ? "s" : ""} — projeto{notices.length > 1 ? "s" : ""} criado{notices.length > 1 ? "s" : ""} automaticamente
        </p>
      </div>
      <div className="space-y-1.5">
        {notices.map((n) => (
          <div key={n.id} className="flex items-center justify-between gap-3 text-xs bg-card/60 rounded-lg px-3 py-2">
            <span className="text-text-muted">
              Lead <b className="text-text-primary">{n.lead?.title ?? "—"}</b> fechado em {formatDate(n.created_at)} →{" "}
              <Link href={`/projects/${n.id}`} className="text-primary hover:underline">
                {n.name}
              </Link>
              {n.company?.name && <span> ({n.company.name})</span>}
            </span>
            <button
              onClick={() => dismiss.mutate({ id: n.id, lead_win_notice_dismissed: true })}
              className="text-text-muted hover:text-red-500 flex-shrink-0"
              title="Dispensar aviso"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
