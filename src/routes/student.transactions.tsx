import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { getSession } from "../lib/auth";
import { fmtNaira, fmtDate } from "../lib/format";
import { downloadReceipt } from "../lib/receipt";
import { getStudentPortalData, type StudentPortalData } from "../lib/studentPortal";

export const Route = createFileRoute("/student/transactions")({ component: Page });

function Page() {
  const session = getSession();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => setData(getStudentPortalData(session?.studentId, session?.name)), [session?.studentId, session?.name]);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  if (!mounted) return null;

  if (!data) {
    return (
      <>
        <PageHeader title="Transactions" subtitle="Payment history for your fees." />
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No student record found for your account yet. Please contact your school administrator.
        </div>
      </>
    );
  }

  const { transactions } = data;
  const total = transactions.reduce((s, r) => s + r.amount, 0);

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
            {transactions.map((t) => (
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
            {transactions.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No transactions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
