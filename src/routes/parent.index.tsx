import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";

export const Route = createFileRoute("/parent/")({ component: ParentDash });

function ParentDash() {
  const total = 55000, paid = 50000, pending = 5000;
  const pct = Math.round((paid / total) * 100);
  return (
    <>
      <PageHeader title="Welcome back, Mr. Chidi Okonkwo" subtitle="Overview for Emeka Okonkwo • Class JSS 3A" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs text-muted-foreground">Total Fees</div>
          <div className="mt-1 text-2xl font-bold">${total.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs text-success">Total Paid</div>
          <div className="mt-1 text-2xl font-bold">${paid.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs text-warning-foreground">Pending Amount</div>
          <div className="mt-1 text-2xl font-bold">${pending.toLocaleString()}</div>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="text-base font-semibold">Payment Progress</div>
        <div className="mt-3 flex justify-between text-xs">
          <span><span className="font-semibold">{pct}%</span> <span className="text-muted-foreground">Paid</span></span>
          <span className="text-muted-foreground">${paid.toLocaleString()} / ${total.toLocaleString()}</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </>
  );
}