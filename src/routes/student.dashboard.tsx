import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatCard } from "../components/PageHeader";
import { getSession } from "../lib/auth";
import { fmtNaira } from "../lib/format";
import { SecuredByNomba } from "../components/TestModeBanner";
import { getStudentPortalData, type StudentPortalData } from "../lib/studentPortal";

export const Route = createFileRoute("/student/dashboard")({ component: StudentDash });

function StudentDash() {
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
        <PageHeader title={`Hi ${(session?.name ?? "there").split(" ")[0]} 👋`} subtitle="Welcome to your Termly dashboard" />
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No student record found for your account yet. Please contact your school administrator.
        </div>
      </>
    );
  }

  const { student, outstandingFees, savingsBalance, savingsGoal, transactions } = data;
  const pct = savingsGoal > 0 ? Math.min(100, Math.round((savingsBalance / savingsGoal) * 100)) : 0;

  return (
    <>
      <PageHeader
        title={`Hi ${(session?.name ?? student.name).split(" ")[0]} 👋`}
        subtitle={`${student.id} · Welcome to your Termly dashboard`}
        actions={<SecuredByNomba />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Outstanding Fees" value={fmtNaira(outstandingFees)} tone={outstandingFees > 0 ? "warning" : "success"} />
        <StatCard label="My Savings" value={fmtNaira(savingsBalance)} sub={`${pct}% of fee goal`} tone="success" />
        <StatCard label="Recent Transactions" value={transactions.length} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-base font-semibold">My Fees</div>
          <p className="mt-1 text-sm text-muted-foreground">View what's owed and what's already been paid for you.</p>
          <Link to="/student/fees" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            View Fees
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-base font-semibold">My Savings</div>
          <p className="mt-1 text-sm text-muted-foreground">Track your savings balance and progress towards your fee goal.</p>
          <Link to="/student/savings" className="mt-3 inline-block rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
            View Savings
          </Link>
        </div>
      </div>
    </>
  );
}
