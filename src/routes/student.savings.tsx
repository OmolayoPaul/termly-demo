import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { getSession } from "../lib/auth";
import { fmtNaira, fmtDate } from "../lib/format";
import { getStudentPortalData, type StudentPortalData } from "../lib/studentPortal";

export const Route = createFileRoute("/student/savings")({ component: Page });

function Page() {
  const session = getSession();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => setData(getStudentPortalData(session?.studentId, session?.name)), [session?.studentId, session?.name]);

  useEffect(() => {
    setMounted(true);
    refresh();
    window.addEventListener("termly:wallet:updated", refresh);
    window.addEventListener("termly:savings:updated", refresh);
    return () => {
      window.removeEventListener("termly:wallet:updated", refresh);
      window.removeEventListener("termly:savings:updated", refresh);
    };
  }, [refresh]);

  if (!mounted) return null;

  if (!data) {
    return (
      <>
        <PageHeader title="My Savings" subtitle="Track your savings towards your school fee goal." />
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No student record found for your account yet. Please contact your school administrator.
        </div>
      </>
    );
  }

  const { student, savingsBalance, savingsGoal, savingsHistory } = data;
  const pct = savingsGoal > 0 ? Math.min(100, Math.round((savingsBalance / savingsGoal) * 100)) : 0;
  const stillNeeded = Math.max(0, savingsGoal - savingsBalance);

  return (
    <>
      <PageHeader title="My Savings" subtitle="Track your savings towards your school fee goal." />

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">{student.name}</div>
            <div className="text-xs text-muted-foreground">{student.id}</div>
          </div>
          <span className="text-2xl">👦</span>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">Savings Progress</div>
        <div className="mt-1 text-2xl font-bold">
          {fmtNaira(savingsBalance)}{" "}
          <span className="text-sm font-normal text-muted-foreground">of {fmtNaira(savingsGoal)}</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct >= 100 ? "bg-yellow-400 animate-pulse" : pct >= 75 ? "bg-success" : pct >= 25 ? "bg-warning" : "bg-red-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 text-xs font-medium text-muted-foreground">{pct}% saved</div>
        {stillNeeded > 0 ? (
          <div className="mt-3 rounded-md bg-info-soft px-3 py-2 text-xs text-info">
            {fmtNaira(stillNeeded)} more needed — ask your parent to top up your savings from their Termly portal.
          </div>
        ) : (
          <div className="mt-3 rounded-md bg-success-soft px-3 py-2 text-xs text-success">
            🎉 Your savings goal is fully covered!
          </div>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Savings History</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-2 font-medium">Date</th>
              <th className="px-5 py-2 font-medium">Type</th>
              <th className="px-5 py-2 font-medium">Amount</th>
              <th className="px-5 py-2 font-medium">Balance</th>
              <th className="px-5 py-2 font-medium">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {savingsHistory.map((h, i) => (
              <tr key={i}>
                <td className="px-5 py-2 text-muted-foreground">{fmtDate(h.date)}</td>
                <td className="px-5 py-2">{h.type}</td>
                <td className={`px-5 py-2 font-semibold ${h.amount >= 0 ? "text-success" : "text-destructive"}`}>
                  {h.amount >= 0 ? "+" : ""}
                  {fmtNaira(h.amount)}
                </td>
                <td className="px-5 py-2">{fmtNaira(h.balanceAfter)}</td>
                <td className="px-5 py-2 text-xs text-muted-foreground">{h.reference}</td>
              </tr>
            ))}
            {savingsHistory.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No savings activity yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
