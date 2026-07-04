import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, write, type Student, type FeeRow, type TxRow, demoVirtualAccountFor } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { createVirtualAccount, friendlyError } from "../services/nomba";

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
  const [txs, setTxs] = useState<TxRow[]>(() => read<TxRow[]>(KEYS.transactions, []));
  const [viewTxsFor, setViewTxsFor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setStudents(read<Student[]>(KEYS.students, []));
    setTxs(read<TxRow[]>(KEYS.transactions, []));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const fees = read<FeeRow[]>(KEYS.fees, []);

  const rows: VirtualAccountRow[] = students
    .filter((s) => s.virtualAccount?.accountNumber)
    .map((s) => {
      const studentFees = fees.filter((f) => f.studentId === s.id || f.studentName === s.name);
      const totalPaid = studentFees.reduce((sum, f) => sum + f.paid, 0);
      const allDeposits = txs.filter((t) => t.studentName === s.name);
      const lastDeposit = allDeposits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date ?? null;
      return {
        ...s,
        accountNumber: s.virtualAccount!.accountNumber,
        bankName: s.virtualAccount!.bankName,
        accountReference: s.virtualAccount!.accountReference,
        totalReceived: totalPaid,
        lastDepositDate: lastDeposit,
        status: "Active" as const,
      };
    });

  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const recentActivity = rows.filter((r) => r.lastDepositDate && new Date(r.lastDepositDate).getTime() > sevenDaysAgo).length;
  const totalReceived = rows.reduce((s, r) => s + r.totalReceived, 0);

  async function refreshAll() {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    refresh();
    setRefreshing(false);
    toast.success("Virtual account statuses refreshed.");
  }

  async function createMissingAccount(student: Student) {
    try {
      let va: Student["virtualAccount"];
      try {
        va = await createVirtualAccount(student.name, student.id);
      } catch {
        va = demoVirtualAccountFor(student);
      }
      const all = read<Student[]>(KEYS.students, []);
      write(KEYS.students, all.map((s) => s.id === student.id ? { ...s, virtualAccount: va } : s));
      refresh();
      toast.success(`✓ Account created for ${student.name}`);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  const missingAccounts = students.filter((s) => !s.virtualAccount?.accountNumber);

  const viewingTxs = viewTxsFor
    ? txs.filter((t) => {
        const s = students.find((x) => x.id === viewTxsFor);
        return s && t.studentName === s.name;
      })
    : [];

  return (
    <>
      <PageHeader
        title="Virtual Accounts"
        subtitle="All student Nomba virtual accounts and deposit history."
        actions={
          <button
            onClick={refreshAll}
            disabled={refreshing}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "⟳ Refresh All"}
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Virtual Accounts" value={rows.length} />
        <StatCard label="Total Received (All Accounts)" value={fmtNaira(totalReceived)} tone="success" />
        <StatCard label="Recent Activity (7 days)" value={recentActivity} tone="success" />
      </div>

      {missingAccounts.length > 0 && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-5 py-3">
          <div className="text-sm font-semibold text-warning-foreground mb-2">
            {missingAccounts.length} student{missingAccounts.length > 1 ? "s" : ""} without virtual accounts
          </div>
          <div className="flex flex-wrap gap-2">
            {missingAccounts.map((s) => (
              <button
                key={s.id}
                onClick={() => createMissingAccount(s)}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Create for {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {r.name.charAt(0)}
                    </div>
                    <span className="font-medium">{r.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium">{r.class}</span>
                </td>
                <td className="px-5 py-3 font-mono text-sm font-semibold">{r.accountNumber}</td>
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
                  No virtual accounts yet. Go to the Students page to create them.
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
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {viewingTxs.map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3 text-muted-foreground">{fmtDate(t.date)}</td>
                  <td className="px-5 py-3">{t.fee}</td>
                  <td className="px-5 py-3 text-muted-foreground">{t.method}</td>
                  <td className="px-5 py-3 font-semibold text-success">{fmtNaira(t.amount)}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{t.reference}</td>
                </tr>
              ))}
              {viewingTxs.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">No transactions recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
