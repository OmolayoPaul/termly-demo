import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, StatCard } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, type FeeRow, type PayrollRow, type Student, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { SecuredByNomba } from "../components/TestModeBanner";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminDashboard });

function AdminDashboard() {
  const students = read<Student[]>(KEYS.students, []);
  const fees = read<FeeRow[]>(KEYS.fees, []);
  const txs = read<TxRow[]>(KEYS.transactions, []);
  const payroll = read<PayrollRow[]>(KEYS.payroll, []);

  const collected = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
  const outstanding = students.filter((s) => fees.some((f) => f.studentId === s.id && f.amount > f.paid)).length;
  const month = new Date().toISOString().slice(0, 7);
  const monthPayroll = payroll
    .filter((p) => p.status === "Paid" && p.paidDate && p.paidDate.startsWith(month))
    .reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Overview of school finances and administration."
        actions={<SecuredByNomba />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Fees Collected" value={fmtNaira(collected)} tone="success" />
        <StatCard label="Students with Outstanding" value={outstanding} tone="warning" />
        <StatCard label="Payroll Disbursed (Month)" value={fmtNaira(monthPayroll)} />
        <StatCard label="Recent Activity" value={txs.length} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/admin/students" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">+ Add Student</Link>
        <Link to="/admin/payroll" className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary">Run Payroll</Link>
        <Link to="/admin/bills" className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary">Pay Bill</Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Recent Transactions</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-2 font-medium">Date</th>
              <th className="px-5 py-2 font-medium">Student</th>
              <th className="px-5 py-2 font-medium">Fee</th>
              <th className="px-5 py-2 font-medium">Amount</th>
              <th className="px-5 py-2 font-medium">Method</th>
              <th className="px-5 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {txs.slice(0, 10).map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-2 text-muted-foreground">{fmtDate(t.date)}</td>
                <td className="px-5 py-2 font-medium">{t.studentName}</td>
                <td className="px-5 py-2 text-muted-foreground">{t.fee}</td>
                <td className="px-5 py-2 font-semibold">{fmtNaira(t.amount)}</td>
                <td className="px-5 py-2">{t.method}</td>
                <td className="px-5 py-2"><StatusBadge status={t.status || "Paid"} /></td>
              </tr>
            ))}
            {txs.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">📋 No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}