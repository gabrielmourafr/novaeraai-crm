import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export const PageHeader = ({ title, description, action, children }: PageHeaderProps) => (
  <div className="flex items-start justify-between gap-4 mb-6">
    <div>
      <h1 className="font-display font-bold text-3xl text-text-primary tracking-tight">{title}</h1>
      {description && <p className="text-text-muted text-sm mt-1">{description}</p>}
    </div>
    {(action || children) && (
      <div className="flex items-center gap-2 flex-shrink-0">
        {action}
        {children}
      </div>
    )}
  </div>
);
