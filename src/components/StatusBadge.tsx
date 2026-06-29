import type { ReactNode } from "react";

const styles: Record<string, string> = {
  Paid: "bg-success-soft text-success",
  paid: "bg-success-soft text-success",
  Pending: "bg-warning-soft text-warning-foreground",
  pending: "bg-warning-soft text-warning-foreground",
  Partial: "bg-info-soft text-info",
  Overdue: "bg-danger-soft text-destructive",
  "Bank Transfer": "bg-info-soft text-info",
  Cash: "bg-success-soft text-success",
  Card: "bg-[color-mix(in_oklab,var(--primary)_15%,white)] text-primary",
  Online: "bg-warning-soft text-warning-foreground",
};

export function StatusBadge({ status, children }: { status: string; children?: ReactNode }) {
  const cls = styles[status] ?? "bg-secondary text-secondary-foreground";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {children ?? status}
    </span>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground ${className}`}>
      {children}
    </span>
  );
}