import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { downloadReceipt } from "../lib/receipt";
import { readWallets, DEFAULT_WALLETS, type DemoWallets } from "../lib/demoWallet";

export const Route = createFileRoute("/student/transactions")({ component: Page });

function Page() {
  const [wallets, setWallets] = useState<DemoWallets>(DEFAULT_WALLETS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWallets(readWallets());
  }, []);

  if (!mounted) return null;

  const { student } = wallets;
  const rows = read<TxRow[]>(KEYS.transactions, []).filter((t) => t.studentName === student.name);
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Payment history for your fees."
        actions={
          <div className="text-right">
            <div className="text-xs uppercase text-muted-foreground">Total Paid</div>
            <div className="text-lg font-bold text-success">{fmtNaira(total)}</div>
          </div>
        }
      />
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Fee</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Method</th>
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-3 text-muted-foreground">{fmtDate(t.date)}</td>
                <td className="px-5 py-3 font-medium">{t.fee}</td>
                <td className="px-5 py-3 font-semibold text-success">{fmtNaira(t.amount)}</td>
                <td className="px-5 py-3">{t.method}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{t.reference}</td>
                <td className="px-5 py-3"><StatusBadge status={t.status || "Paid"} /></td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => downloadReceipt({
                      reference: t.reference,
                      date: t.date,
                      studentName: t.studentName,
                      feeType: t.fee,
                      amount: t.amount,
                      method: t.method,
                    })}
                    className="rounded-md border border-primary/40 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                  >Receipt</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No transactions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
