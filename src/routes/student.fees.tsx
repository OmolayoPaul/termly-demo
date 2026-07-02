import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, type FeeRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { readWallets, DEFAULT_WALLETS, type DemoWallets } from "../lib/demoWallet";

export const Route = createFileRoute("/student/fees")({ component: Page });

function Page() {
  const [wallets, setWallets] = useState<DemoWallets>(DEFAULT_WALLETS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWallets(readWallets());
  }, []);

  if (!mounted) return null;

  const { student } = wallets;
  const fees = read<FeeRow[]>(KEYS.fees, []).filter((f) => f.studentName === student.name);
  const totalOwed = fees.reduce((s, f) => s + (f.amount - f.paid), 0);
  const totalPaid = fees.reduce((s, f) => s + f.paid, 0);

  return (
    <>
      <PageHeader title="My Fees" subtitle="Fees charged to your account and payment status." />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Total Paid" value={fmtNaira(totalPaid)} tone="success" />
        <StatCard label="Total Outstanding" value={fmtNaira(totalOwed)} tone={totalOwed > 0 ? "warning" : "success"} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Fee Breakdown</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-2 font-medium">Term</th>
              <th className="px-5 py-2 font-medium">Amount</th>
              <th className="px-5 py-2 font-medium">Paid</th>
              <th className="px-5 py-2 font-medium">Due Date</th>
              <th className="px-5 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fees.map((f) => (
              <tr key={f.id}>
                <td className="px-5 py-2 font-medium">{f.term}</td>
                <td className="px-5 py-2">{fmtNaira(f.amount)}</td>
                <td className="px-5 py-2 text-success">{fmtNaira(f.paid)}</td>
                <td className="px-5 py-2 text-muted-foreground">{fmtDate(f.dueDate)}</td>
                <td className="px-5 py-2"><StatusBadge status={f.status} /></td>
              </tr>
            ))}
            {fees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No fees on record.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
        Fees are paid by your parent from their Termly parent portal or automatically deducted from your savings once your goal is reached.
      </div>
    </>
  );
}
