import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PageHeader, StatCard } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, type FeeRow, type PayrollRow, type Student, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { SecuredByNomba } from "../components/TestModeBanner";
import { readSavingsStore } from "../lib/studentSavings";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminDashboard });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function AdminDashboard() {
  const students = read<Student[]>(KEYS.students, []);
  const fees = read<FeeRow[]>(KEYS.fees, []);
  const txs = read<TxRow[]>(KEYS.transactions, []);
  const payroll = read<PayrollRow[]>(KEYS.payroll, []);

  const [savingsStore, setSavingsStore] = useState(() => readSavingsStore());
  const refreshSavings = useCallback(() => setSavingsStore(readSavingsStore()), []);
  useEffect(() => {
    window.addEventListener("termly:savings:updated", refreshSavings);
    return () => window.removeEventListener("termly:savings:updated", refreshSavings);
  }, [refreshSavings]);

  const collected = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
  const outstanding = students.filter((s) => fees.some((f) => f.studentId === s.id && f.amount > f.paid)).length;
  const month = new Date().toISOString().slice(0, 7);
  const monthPayroll = payroll
    .filter((p) => p.status === "Paid" && p.paidDate && p.paidDate.startsWith(month))
    .reduce((s, p) => s + p.amount, 0);

  const savingsRecords = Object.values(savingsStore);
  const totalSaved = savingsRecords.reduce((s, r) => s + r.savingsBalance, 0);
  const goalReached = savingsRecords.filter((r) => r.goal > 0 && r.savingsBalance >= r.goal).length;
  const needsAttention = savingsRecords.filter((r) => r.goal > 0 && r.savingsBalance / r.goal < 0.25);
  const leaderboard = [...savingsRecords]
    .filter((r) => r.goal > 0)
    .sort((a, b) => b.savingsBalance / b.goal - a.savingsBalance / a.goal)
    .slice(0, 5);

  function studentName(id: string) {
    return students.find((s) => s.id === id)?.name ?? id;
  }

  // Payment Analytics
  const year = new Date().getFullYear();
  const monthlyRevenue = MONTHS.map((name, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const amount = txs.filter((t) => t.date && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0);
    return { name, amount };
  });

  const totalAttempts = txs.length + Math.floor(txs.length * 0.12); // simulate 12% failure rate for demo
  const successRate = totalAttempts > 0 ? Math.round((txs.length / totalAttempts) * 100) : 100;
  const methodCounts = txs.reduce<Record<string, number>>((acc, t) => {
    acc[t.method] = (acc[t.method] || 0) + 1;
    return acc;
  }, {});
  const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const peakHour = "10:00 – 14:00"; // demo static value

  // Payment funnel (demo proportions)
  const funnelCreated = totalAttempts;
  const funnelOpened = Math.round(funnelCreated * 0.88);
  const funnelCompleted = txs.length;

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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Student Savings" value={fmtNaira(totalSaved)} tone="success" />
        <StatCard label="Goals Reached" value={`${goalReached} / ${savingsRecords.length}`} />
        <StatCard label="Needs Attention" value={needsAttention.length} tone="warning" />
        <StatCard label="Avg. Savings Balance" value={fmtNaira(savingsRecords.length ? Math.round(totalSaved / savingsRecords.length) : 0)} />
      </div>

      {/* Payment Analytics */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">📊 Payment Analytics</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Checkout Success Rate</div>
            <div className="mt-1 text-2xl font-bold text-success">{successRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">{txs.length} of {totalAttempts} attempts</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Avg. Payment Time</div>
            <div className="mt-1 text-2xl font-bold">3.2 min</div>
            <div className="text-xs text-muted-foreground mt-1">From checkout to completion</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Most Used Method</div>
            <div className="mt-1 text-2xl font-bold truncate">{topMethod}</div>
            <div className="text-xs text-muted-foreground mt-1">{methodCounts[topMethod] ?? 0} transactions</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Peak Payment Hours</div>
            <div className="mt-1 text-2xl font-bold">{peakHour}</div>
            <div className="text-xs text-muted-foreground mt-1">Highest activity window</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-3 text-sm font-semibold">Monthly Revenue — {year}</div>
            <div className="px-4 py-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmtNaira(v)} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-3 text-sm font-semibold">Payment Funnel</div>
            <div className="divide-y divide-border text-sm">
              {[
                { label: "Checkout Created", value: funnelCreated, pct: 100 },
                { label: "Payment Page Opened", value: funnelOpened, pct: funnelCreated > 0 ? Math.round((funnelOpened / funnelCreated) * 100) : 0 },
                { label: "Payment Completed", value: funnelCompleted, pct: funnelCreated > 0 ? Math.round((funnelCompleted / funnelCreated) * 100) : 0 },
              ].map((s) => (
                <div key={s.label} className="px-5 py-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-semibold">{s.value} <span className="text-muted-foreground">({s.pct}%)</span></span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3 text-sm font-semibold">🏆 Savings Leaderboard</div>
          <div className="divide-y divide-border">
            {leaderboard.map((r, i) => {
              const pct = Math.min(100, Math.round((r.savingsBalance / r.goal) * 100));
              return (
                <div key={r.studentId} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 text-sm font-bold text-muted-foreground">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{studentName(r.studentId)}</span>
                      <span className="font-semibold">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? "bg-yellow-400" : pct >= 75 ? "bg-success" : pct >= 25 ? "bg-warning" : "bg-red-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {leaderboard.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No savings data yet.</div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3 text-sm font-semibold">⚠️ Needs Attention</div>
          <div className="divide-y divide-border">
            {needsAttention.map((r) => (
              <div key={r.studentId} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <div className="font-medium">{studentName(r.studentId)}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtNaira(r.savingsBalance)} of {fmtNaira(r.goal)} saved
                  </div>
                </div>
                <Link
                  to="/admin/students"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                >
                  View
                </Link>
              </div>
            ))}
            {needsAttention.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                🎉 All students are on track with savings.
              </div>
            )}
          </div>
        </div>
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
