import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { Pill, StatusBadge } from "../components/StatusBadge";
import { ngnFmt } from "../lib/seed";

export const Route = createFileRoute("/parent/fees")({ component: PayFees });

const rows = [
  { id: "1", title: "School Fees", term: "2025/2026 First Term", amount: 45000, paid: 45000, dueDate: "31 Jan 2026", status: "Paid" as const },
  { id: "2", title: "Development Levy", term: "2025/2026 First Term", amount: 10000, paid: 5000, dueDate: "28 Feb 2026", status: "Partial" as const },
];

function PayFees() {
  return (
    <>
      <PageHeader title="Pay Fees" subtitle="View and pay your pending school fees." />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Term</th>
              <th className="px-5 py-3 font-medium">Currency</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Paid</th>
              <th className="px-5 py-3 font-medium">Balance</th>
              <th className="px-5 py-3 font-medium">Due Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-medium">{r.title}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.term}</td>
                <td className="px-5 py-3"><Pill>NGN</Pill></td>
                <td className="px-5 py-3 font-semibold">{ngnFmt(r.amount)}</td>
                <td className="px-5 py-3 text-success">{ngnFmt(r.paid)}</td>
                <td className={`px-5 py-3 font-semibold ${r.amount - r.paid === 0 ? "text-warning-foreground" : "text-warning-foreground"}`}>{ngnFmt(r.amount - r.paid)}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.dueDate}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-right">
                  {r.status === "Paid" ? (
                    <span className="text-sm font-medium text-success">Fully Paid ✓</span>
                  ) : (
                    <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">Pay Now</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}