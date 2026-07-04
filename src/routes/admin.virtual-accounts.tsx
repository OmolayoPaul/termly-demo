import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, write, type Student, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";

export const Route = createFileRoute("/admin/virtual-accounts")({ component: Page });

type VirtualAccountRow = Student & {
  accountNumber: string;
  bankName: string;
  accountReference: string;
  totalReceived: number;
  lastDepositDate: string | null;
  status: "Active" | "Inactive";
};

function Page() {
  const [students, setStudents] = useState<Student[]>(() => read<Student[]>(KEYS.students, []));
  const txs = read<TxRow[]>(KEYS.transactions, []);
  const [viewTxsFor, setViewTxsFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rows: VirtualAccountRow[] = students
    .filter((s) => s.virtualAccount)
    .map((s) => {
      const deposits = txs.filter((t) => t.studentName === s.name && t.method === "Virtual Account");
      const total = deposits.reduce((sum, t) => sum + t.amount, 0);
      const last = deposits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date ?? null;
      return {
        ...s,
        accountNumber: s.virtualAccount!.accountNumber,
        bankName: s.virtualAccount!.bankName,
        accountReference: s.virtualAccount!.accountReference,
        totalReceived: total,
        lastDepositDate: last,
        status: "Active" as const,
      };
    });

  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const recentActivity = rows.filter((r) => r.lastDepositDate && new Date(r.lastDepositDate).getTime() > sevenDaysAgo).length;
  const totalReceived = rows.reduce((s, r) => s + r.totalReceived, 0);

  async function refreshAll() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setStudents(read<Student[]>(KEYS.students, []));
    setLoading(false);
    toast.success("Virtual account statuses refreshed.");
  }

  const viewingTxs = viewTxsFor
    ? txs.filter((t) => {
        const s = students.find((x) => x.id === viewTxsFor);
        return s && t.studentName === s.name && t.method === "Virtual Account";
      })
    : [];

  return (
    <>
      <PageHeader
        title="Virtual Accounts"
        subtitle="All student virtual accounts and deposit history."
        actions={
          <button
            onClick={refreshAll}
            disabled={loading}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "⟳ Refresh All"}
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Virtual Accounts" value={rows.length} />
        <StatCard label="Total Received (All Accounts)" value={fmtNaira(totalReceived)} tone="success" />
        <StatCard label="Recent Activity (7 days)" value={recentActivity} tone="success" />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Class</th>
              <th className="px-5 py-3 font-medium">Account Number</th>
              <th className="px-5 py-3 font-medium">Bank</th>
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Total Received</th>
              <th className="px-5 py-3 font-medium">Last Deposit</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-medium">{r.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.class}</td>
                <td className="px-5 py-3 font-mono text-sm">{r.accountNumber}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.bankName}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{r.accountReference}</td>
                <td className="px-5 py-3 font-semibold text-success">{fmtNaira(r.totalReceived)}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.lastDepositDate ? fmtDate(r.lastDepositDate) : "—"}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => setViewTxsFor(viewTxsFor === r.id ? null : r.id)}
                    className="rounded-md border border-primary/40 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    {viewTxsFor === r.id ? "Hide" : "View Transactions"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                  No virtual accounts created yet. Create them from the Students page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewTxsFor && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3 text-sm font-semibold">
            Transactions — {students.find((s) => s.id === viewTxsFor)?.name}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {viewingTxs.map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3 text-muted-foreground">{fmtDate(t.date)}</td>
                  <td className="px-5 py-3">{t.fee}</td>
                  <td className="px-5 py-3 font-semibold text-success">{fmtNaira(t.amount)}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{t.reference}</td>
                </tr>
              ))}
              {viewingTxs.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">No virtual account deposits recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
