import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";

export const Route = createFileRoute("/teacher/salary")({ component: SalaryPage });

const rows = [
  { month: "2026-01", subject: "Mathematics", amount: 85000, status: "paid", date: "6/28/2026" },
  { month: "2026-02", subject: "Mathematics", amount: 85000, status: "paid", date: "6/28/2026" },
  { month: "2026-03", subject: "Mathematics", amount: 85000, status: "paid", date: "6/28/2026" },
];

function SalaryPage() {
  return (
    <>
      <PageHeader title="Salary Slips" subtitle="View your salary slips and payment history." />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Month</th>
              <th className="px-5 py-3 font-medium">Subject</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Date Generated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.month}>
                <td className="px-5 py-3">{r.month}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.subject}</td>
                <td className="px-5 py-3 font-semibold">${r.amount.toLocaleString()}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}