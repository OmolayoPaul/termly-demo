import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard } from "../components/PageHeader";
import { bills, fees, payroll, students, transactions } from "../lib/seed";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const feesCollected = fees.reduce((s, f) => s + f.paid, 0);
  const feesPending = fees.reduce((s, f) => s + (f.amount - f.paid), 0);
  const totalPayroll = payroll.reduce((s, p) => s + p.amount, 0);
  const totalBills = bills.reduce((s, b) => s + b.amount, 0);

  const statuses = ["Paid", "Pending", "Partial", "Overdue"] as const;
  const feesByStatus = statuses.map((s) => ({
    name: s,
    value: fees.filter((f) => f.status === s).length,
  }));

  const billsByStatus = (["Paid", "Pending", "Overdue"] as const).map((s) => ({
    name: s,
    value: bills.filter((b) => b.status === s).length,
  }));
  const maxBill = Math.max(1, ...billsByStatus.map((b) => b.value));

  const pieTotal = Math.max(1, feesByStatus.reduce((s, x) => s + x.value, 0));
  const colors = ["var(--success)", "var(--warning)", "var(--info)", "var(--destructive)"];

  // Build pie slices
  let acc = 0;
  const slices = feesByStatus.map((s, i) => {
    const start = acc / pieTotal;
    acc += s.value;
    const end = acc / pieTotal;
    return { start, end, color: colors[i], name: s.name, value: s.value };
  });

  function arc(start: number, end: number) {
    const a0 = start * Math.PI * 2 - Math.PI / 2;
    const a1 = end * Math.PI * 2 - Math.PI / 2;
    const r = 70;
    const cx = 90,
      cy = 90;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = end - start > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
  }

  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="Overview of school finances and administration." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Students" value={students.length} />
        <StatCard label="Fees Collected" value={`$${feesCollected.toLocaleString()}`} />
        <StatCard label="Fees Pending" value={`$${feesPending.toLocaleString()}`} />
        <StatCard label="Total Payroll" value={`$${totalPayroll.toLocaleString()}`} />
        <StatCard label="Total Bills" value={`$${totalBills.toLocaleString()}`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-base font-semibold">Fees by Status</div>
          <div className="text-xs text-muted-foreground">Distribution of fee statuses</div>
          <div className="mt-4 flex items-center gap-6">
            <svg viewBox="0 0 180 180" className="h-44 w-44">
              {slices.map(
                (s) =>
                  s.value > 0 && (
                    <path key={s.name} d={arc(s.start, s.end)} fill={s.color} />
                  ),
              )}
              <circle cx="90" cy="90" r="40" fill="var(--card)" />
            </svg>
            <ul className="space-y-1.5 text-sm">
              {slices.map((s, i) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ background: colors[i] }} />
                  <span className="text-foreground">{s.name}</span>
                  <span className="text-muted-foreground">· {s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-base font-semibold">Bills by Status</div>
          <div className="text-xs text-muted-foreground">Overview of outstanding bills</div>
          <div className="mt-6 flex h-44 items-end gap-6 px-4">
            {billsByStatus.map((b) => (
              <div key={b.name} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${(b.value / maxBill) * 100}%`, minHeight: 4 }}
                />
                <div className="text-xs text-muted-foreground">{b.name}</div>
                <div className="text-xs font-semibold">{b.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="text-base font-semibold">Recent Transactions</div>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">Student</th>
              <th className="py-2 font-medium">Amount</th>
              <th className="py-2 font-medium">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="py-2.5 text-muted-foreground">{t.date}</td>
                <td className="py-2.5 font-medium">{t.student}</td>
                <td className="py-2.5">${t.amount.toLocaleString()}</td>
                <td className="py-2.5">{t.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}