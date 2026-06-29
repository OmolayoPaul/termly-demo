import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { Pill, StatusBadge } from "../components/StatusBadge";
import { ngnFmt, transactions as rows } from "../lib/seed";

export const Route = createFileRoute("/admin/transactions")({ component: TxPage });

function TxPage() {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <>
      <PageHeader title="Transactions" subtitle="All payment transactions across the school." actions={
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Collected</div>
            <div className="text-lg font-bold text-success">{ngnFmt(total)}</div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-success/40 bg-success-soft px-3 py-2 text-sm font-semibold text-success">⤓ Export CSV</button>
        </div>
      } />

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground">Search</label>
          <input placeholder="Student, fee, reference..." className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Method</label>
          <select className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"><option>All methods</option></select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">From date</label>
          <input type="date" className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To date</label>
          <input type="date" className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Fee</th>
              <th className="px-5 py-3 font-medium">Currency</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Method</th>
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-3 text-muted-foreground">{t.date}</td>
                <td className="px-5 py-3 font-medium">{t.student}</td>
                <td className="px-5 py-3 text-muted-foreground">{t.fee}</td>
                <td className="px-5 py-3"><Pill>NGN</Pill></td>
                <td className="px-5 py-3 font-semibold text-success">{ngnFmt(t.amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={t.method} /></td>
                <td className="px-5 py-3 text-muted-foreground">{t.reference}</td>
                <td className="px-5 py-3 text-right">
                  <button className="rounded-md border border-primary/40 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">Receipt</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}