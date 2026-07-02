import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatCard } from "../components/PageHeader";
import { getSession } from "../lib/auth";
import { KEYS, read, type FeeRow, type TxRow } from "../lib/storage";
import { fmtNaira } from "../lib/format";
import { SecuredByNomba } from "../components/TestModeBanner";
import { readWallets, DEFAULT_WALLETS, type DemoWallets } from "../lib/demoWallet";

export const Route = createFileRoute("/student/dashboard")({ component: StudentDash });

function StudentDash() {
  const session = getSession();
  const [wallets, setWallets] = useState<DemoWallets>(DEFAULT_WALLETS);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => setWallets(readWallets()), []);

  useEffect(() => {
    setMounted(true);
    setWallets(readWallets());
    window.addEventListener("termly:wallet:updated", refresh);
    return () => window.removeEventListener("termly:wallet:updated", refresh);
  }, [refresh]);

  if (!mounted) return null;

  const { student } = wallets;
  const fees = read<FeeRow[]>(KEYS.fees, []).filter((f) => f.studentName === student.name);
  const owed = fees.reduce((s, f) => s + (f.amount - f.paid), 0);
  const txs = read<TxRow[]>(KEYS.transactions, []).filter((t) => t.studentName === student.name);
  const pct = student.feeOwed > 0 ? Math.min(100, Math.round((student.savingsBalance / student.feeOwed) * 100)) : 0;

  return (
    <>
      <PageHeader
        title={`Hi ${(session?.name ?? student.name).split(" ")[0]} 👋`}
        subtitle={`${student.admissionNumber} · Welcome to your Termly dashboard`}
        actions={<SecuredByNomba />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Outstanding Fees" value={fmtNaira(owed)} tone={owed > 0 ? "warning" : "success"} />
        <StatCard label="My Savings" value={fmtNaira(student.savingsBalance)} sub={`${pct}% of fee goal`} tone="success" />
        <StatCard label="Recent Transactions" value={txs.length} />
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
