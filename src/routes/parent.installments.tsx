import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, type Mandate } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";

export const Route = createFileRoute("/parent/installments")({ component: Page });

function Page() {
  const rows = read<Mandate[]>(KEYS.mandates, []);
  return (
    <>
      <PageHeader title="Installments" subtitle="Your active direct debit plans." />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((m) => {
          const pct = m.months > 0 ? (m.monthsPaid / m.months) * 100 : 0;
          return (
            <div key={m.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div><div className="font-semibold">{m.studentName}</div><div className="text-xs text-muted-foreground">{m.monthsPaid} / {m.months} months</div></div>
                <StatusBadge status={m.status} />
              </div>
              <div className="mt-2 text-2xl font-bold">{fmtNaira(m.amount)}<span className="text-sm font-normal text-muted-foreground"> /month</span></div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
              <div className="mt-2 text-xs text-muted-foreground">Next debit: {fmtDate(m.nextDebitDate)}</div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <div className="text-3xl">💳</div><p className="mt-2 text-sm text-muted-foreground">No active installment plans.</p>
          </div>
        )}
      </div>
    </>
  );
}