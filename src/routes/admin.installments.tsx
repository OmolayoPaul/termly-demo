import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, type Mandate } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";

export const Route = createFileRoute("/admin/installments")({ component: Page });

function Page() {
  const rows = read<Mandate[]>(KEYS.mandates, []);
  return (
    <>
      <PageHeader title="Installment Plans" subtitle="Active direct debit mandates for school fees." />
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Parent</th>
              <th className="px-5 py-3 font-medium">Amount / Month</th>
              <th className="px-5 py-3 font-medium">Months Remaining</th>
              <th className="px-5 py-3 font-medium">Next Debit</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3 font-medium">{m.studentName}</td>
                <td className="px-5 py-3">{m.parentName}</td>
                <td className="px-5 py-3 font-semibold">{fmtNaira(m.amount)}</td>
                <td className="px-5 py-3">{m.months - m.monthsPaid}</td>
                <td className="px-5 py-3 text-muted-foreground">{fmtDate(m.nextDebitDate)}</td>
                <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No active installment plans.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}