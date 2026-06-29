import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";

export const Route = createFileRoute("/parent/installments")({ component: Page });

const rows = [
  { id: "1", amount: 5000, paid: 5000, due: "2/28/2026", status: "paid" },
  { id: "2", amount: 5000, paid: 0, due: "3/31/2026", status: "pending" },
];

function Page() {
  return (
    <>
      <PageHeader title="Installment Plans" subtitle="Manage your payment installments." actions={
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Request Installment</button>
      } />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Amount Paid</th>
              <th className="px-5 py-3 font-medium">Due Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-medium">${r.amount.toLocaleString()}</td>
                <td className="px-5 py-3">${r.paid.toLocaleString()}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.due}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}