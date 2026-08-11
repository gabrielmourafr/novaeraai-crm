"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
  onClick?: () => void;
  size?: "default" | "sm";
}

export const StatCard = ({ label, value, icon: Icon, trend, className, onClick, size = "default" }: StatCardProps) => (
  <div
    onClick={onClick}
    className={cn(
      "rounded-xl border transition-all duration-200 hover:scale-[1.01]",
      size === "sm" ? "p-4" : "p-6",
      onClick && "cursor-pointer hover:border-primary/40",
      className
    )}
    style={{
      background: "rgba(12,21,38,0.8)",
      border: "1px solid rgba(11,135,195,0.15)",
      backdropFilter: "blur(8px)",
    }}
  >
    <div className={cn("flex items-start justify-between", size === "sm" ? "mb-2.5" : "mb-4")}>
      <span
        className={cn(
          "font-semibold uppercase tracking-wider text-text-muted",
          size === "sm" ? "text-[10px] leading-tight" : "text-xs"
        )}
      >
        {label}
      </span>
      <div className={cn("rounded-lg flex-shrink-0", size === "sm" ? "p-1.5 ml-2" : "p-2")} style={{ background: "var(--primary-light)" }}>
        <Icon size={size === "sm" ? 14 : 18} style={{ color: "var(--primary)" }} />
      </div>
    </div>
    <p
      className={cn(
        "font-display font-bold text-text-primary truncate",
        size === "sm" ? "text-xl" : "text-3xl"
      )}
      title={typeof value === "string" ? value : undefined}
    >
      {value}
    </p>
    {trend && (
      <p className={cn("text-xs mt-2", trend.value >= 0 ? "text-success" : "text-danger")}>
        {trend.value >= 0 ? "+" : ""}
        {trend.value}% {trend.label}
      </p>
    )}
  </div>
);
