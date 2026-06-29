import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";

export const Route = createFileRoute("/teacher/")({ component: TeacherDash });

const history = [
  { month: "2026-01", amount: 85000, status: "Paid" },
  { month: "2026-02", amount: 85000, status: "Paid" },
  { month: "2026-03", amount: 85000, status: "Paid" },
];

function TeacherDash() {
  const total = history.reduce((s, r) => s + r.amount, 0);
  return (
    <>
      <PageHeader title="Welcome, Mr. Adewale Okafor" subtitle="Your employment and salary overview." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs text-muted-foreground">Total Salary Received</div>
          <div className="mt-1 text-2xl font-bold">${total.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs text-muted-foreground">Last Payment</div>
          <div className="mt-1 text-2xl font-bold">${history[history.length - 1].amount.toLocaleString()}</div>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="text-base font-semibold">Recent Payroll History</div>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 font-medium">Month</th>
              <th className="py-2 font-medium">Amount</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {history.map((h) => (
              <tr key={h.month}>
                <td className="py-2.5">{h.month}</td>
                <td className="py-2.5 font-semibold">${h.amount.toLocaleString()}</td>
                <td className="py-2.5"><StatusBadge status={h.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}