"use client";

import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  created: "bg-info",
  stage_changed: "bg-warning",
  proposal_sent: "bg-primary",
  proposal_accepted: "bg-success",
  task_completed: "bg-success",
  file_uploaded: "bg-info",
  note_added: "bg-text-muted",
};

interface TimelineItem {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user?: { full_name: string } | null;
}

export const Timeline = ({ items }: { items: TimelineItem[] }) => {
  if (!items.length)
    return <p className="text-sm text-text-muted py-4">Nenhuma atividade registrada.</p>;

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-3 h-3 rounded-full flex-shrink-0 mt-1",
                typeColors[item.type] ?? "bg-text-muted"
              )}
            />
            {i < items.length - 1 && <div className="w-0.5 bg-border flex-1 mt-1" />}
          </div>
          <div className="pb-4 flex-1">
            <p className="text-sm text-text-primary">{item.description}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {formatRelative(item.created_at)}
              {item.user ? ` · ${item.user.full_name}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
