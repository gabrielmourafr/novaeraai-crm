import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Icon size={48} className="text-text-muted/30 mb-4 animate-float" />
    <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
    <p className="text-sm text-text-muted max-w-md mb-6">{description}</p>
    {action && (
      <Button onClick={action.onClick} style={{ background: "var(--primary)" }}>
        {action.label}
      </Button>
    )}
  </div>
);
