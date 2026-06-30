import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { getSession } from "../lib/auth";
import { KEYS, read, type PayrollRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { downloadReceipt } from "../lib/receipt";

export const Route = createFileRoute("/teacher/salary")({ component: Page });

function Page() {
  const session = getSession();
  const payroll = read<PayrollRow[]>(KEYS.payroll, []);
  const rows = payroll.filter((p) =>
    session?.email ? p.email?.toLowerCase() === session.email.toLowerCase() : p.teacher === session?.name,
  );
  const list = rows.length > 0 ? rows : payroll;
  const year = new Date().getFullYear().toString();
  const yearTotal = list.filter((r) => r.status === "Paid" && r.paidDate?.startsWith(year)).reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader title="Salary History" subtitle="Your payment history this year." actions={
        <div className="text-right"><div className="text-xs uppercase text-muted-foreground">Total received ({year})</div><div className="text-lg font-bold text-success">{fmtNaira(yearTotal)}</div></div>
      } />
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Month</th>
              <th className="px-5 py-3 font-medium">Amount</th><th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Reference</th><th className="px-5 py-3 text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 text-muted-foreground">{r.paidDate ? fmtDate(r.paidDate) : "—"}</td>
                <td className="px-5 py-3">{r.month}</td>
                <td className="px-5 py-3 font-semibold">{fmtNaira(r.amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{r.transactionId ?? "—"}</td>
                <td className="px-5 py-3 text-right">
                  {r.status === "Paid" && (
                    <button onClick={() => downloadReceipt({ reference: r.transactionId ?? r.id, date: r.paidDate ?? new Date().toISOString(), studentName: r.teacher, feeType: `Salary - ${r.month}`, amount: r.amount, method: "Nomba Transfer" })} className="rounded-md border border-primary/40 px-2 py-1 text-xs font-semibold text-primary">Receipt</button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No salary records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}