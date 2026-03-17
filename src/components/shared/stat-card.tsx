"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
}

export const StatCard = ({ label, value, icon: Icon, trend, className }: StatCardProps) => (
  <div
    className={cn(
      "rounded-xl border p-6 transition-all duration-200 hover:scale-[1.01]",
      className
    )}
    style={{
      background: "rgba(12,21,38,0.8)",
      border: "1px solid rgba(11,135,195,0.15)",
      backdropFilter: "blur(8px)",
    }}
  >
    <div className="flex items-start justify-between mb-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</span>
      <div className="p-2 rounded-lg" style={{ background: "var(--primary-light)" }}>
        <Icon size={18} style={{ color: "var(--primary)" }} />
      </div>
    </div>
    <p className="font-display font-bold text-3xl text-text-primary">{value}</p>
    {trend && (
      <p className={cn("text-xs mt-2", trend.value >= 0 ? "text-success" : "text-danger")}>
        {trend.value >= 0 ? "+" : ""}
        {trend.value}% {trend.label}
      </p>
    )}
  </div>
);
