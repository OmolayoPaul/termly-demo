import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { Pill, StatusBadge } from "../components/StatusBadge";
import { ngnFmt } from "../lib/seed";

export const Route = createFileRoute("/parent/history")({ component: Page });

const rows = [
  { id: "1", date: "28 Jun 2026", fee: "School Fees", amount: 45000, method: "Bank Transfer", reference: "TXN/2026/001" },
  { id: "2", date: "28 Jun 2026", fee: "Development Levy", amount: 5000, method: "Cash", reference: "TXN/2026/002" },
];

function Page() {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <>
      <PageHeader title="Transaction History" subtitle="Your past payments and receipts." actions={
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Paid</div>
          <div className="text-lg font-bold text-success">{ngnFmt(total)}</div>
        </div>
      } />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Fee</th>
              <th className="px-5 py-3 font-medium">Currency</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Method</th>
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
                <td className="px-5 py-3 font-medium">{r.fee}</td>
                <td className="px-5 py-3"><Pill>NGN</Pill></td>
                <td className="px-5 py-3 font-semibold text-success">{ngnFmt(r.amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={r.method} /></td>
                <td className="px-5 py-3 text-muted-foreground">{r.reference}</td>
                <td className="px-5 py-3 text-right">
                  <button className="rounded-md border border-primary/40 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">View Receipt</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}