import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { Spinner } from "../components/Spinner";
import { getSession } from "../lib/auth";
import { KEYS, read, type FeeRow, type Student, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { SecuredByNomba } from "../components/TestModeBanner";
import { useResumePendingPayment } from "../hooks/usePaymentPolling";
import { downloadReceipt } from "../lib/receipt";

export const Route = createFileRoute("/parent/dashboard")({ component: ParentDash });

function ParentDash() {
  const session = getSession();
  const name = session?.name ?? "Parent";

  const [fees, setFees] = useState<FeeRow[]>(() => read<FeeRow[]>(KEYS.fees, []));
  const [txs, setTxs] = useState<TxRow[]>(() => read<TxRow[]>(KEYS.transactions, []));
  const students = read<Student[]>(KEYS.students, []);

  const myKids = session?.email
    ? students.filter((s) => s.parentEmail?.toLowerCase() === session.email.toLowerCase())
    : [];
  const kids = myKids.length > 0 ? myKids : students.slice(0, 1);

  const poll = useResumePendingPayment(() => {
    setFees(read<FeeRow[]>(KEYS.fees, []));
    setTxs(read<TxRow[]>(KEYS.transactions, []));
  });

  useEffect(() => {
    if (poll.state === "success") {
      setFees(read<FeeRow[]>(KEYS.fees, []));
      setTxs(read<TxRow[]>(KEYS.transactions, []));
    }
  }, [poll.state]);

  const mins = Math.floor(poll.secondsLeft / 60);
  const secs = String(poll.secondsLeft % 60).padStart(2, "0");

  return (
    <>
      <PageHeader
        title={`Hello ${name}`}
        subtitle="Manage your child's school fees and payments."
        actions={<SecuredByNomba />}
      />

      {poll.state === "polling" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-info/40 bg-info-soft px-4 py-3 text-sm shadow-sm">
          <Spinner size={18} className="shrink-0 text-info" />
          <div className="flex-1">
            <span className="font-semibold text-info">Verifying your payment…</span>
            <span className="ml-2 text-muted-foreground">
              Checking every few seconds · {mins}:{secs} remaining
            </span>
          </div>
          <button
            onClick={poll.cancel}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {poll.state === "success" && (
        <div className="mb-4 rounded-xl border border-success/40 bg-success-soft px-4 py-3 text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-white text-base">
              ✓
            </div>
            <div className="flex-1">
              <span className="font-semibold text-success">Payment confirmed!</span>
              <span className="ml-2 text-muted-foreground">
                {fmtNaira(poll.amount)} · Ref: {poll.transactionRef}
              </span>
            </div>
            <button
              onClick={() =>
                downloadReceipt({
                  reference: poll.transactionRef,
                  date: new Date(),
                  studentName: poll.studentName,
                  feeType: poll.feeType,
                  amount: poll.amount,
                  method: "Nomba Checkout",
                })
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white hover:bg-success/90 shrink-0"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
              Receipt
            </button>
            <button
              onClick={poll.cancel}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {poll.state === "timeout" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm shadow-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning text-white text-base">
            ⏱
          </div>
          <div className="flex-1">
            <span className="font-semibold text-warning-foreground">Payment pending verification.</span>
            <span className="ml-2 text-muted-foreground">
              If money was deducted, contact the school. Your balance will update once confirmed.
            </span>
          </div>
          <button
            onClick={poll.cancel}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {kids.map((kid) => {
          const kidFees = fees.filter((f) => f.studentId === kid.id || f.studentName === kid.name);
          const balance = kidFees.reduce((s, f) => s + (f.amount - f.paid), 0);
          const status = balance === 0 ? "Paid" : kidFees.some((f) => f.paid > 0) ? "Partial" : "Unpaid";
          return (
            <div key={kid.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">{kid.name}</div>
                  <div className="text-xs text-muted-foreground">{kid.class}</div>
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Outstanding</div>
              <div className={`text-3xl font-bold ${balance === 0 ? "text-success" : "text-warning-foreground"}`}>
                {fmtNaira(balance)}
              </div>
              <Link
                to="/parent/fees"
                className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Pay Now
              </Link>

              {kid.virtualAccount && (
                <div className="mt-4 rounded-lg border border-info/30 bg-info-soft p-3 text-sm">
                  <div className="text-xs font-semibold uppercase text-info">Dedicated payment account</div>
                  <div className="mt-1">
                    <span className="text-muted-foreground">Account:</span>{" "}
                    <strong>{kid.virtualAccount.accountNumber}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bank:</span> {kid.virtualAccount.bankName}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Transfer fees directly to this account.</div>
                </div>
              )}
            </div>
          );
        })}
        {kids.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <div className="text-3xl">👨‍👩‍👧</div>
            <p className="mt-2 text-sm text-muted-foreground">
              No student linked to your account yet. Contact the school admin.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="text-base font-semibold">Recent Payments</div>
        <ul className="mt-3 divide-y divide-border text-sm">
          {txs.slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{t.fee}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtDate(t.date)} · {t.method}
                </div>
              </div>
              <div className="font-semibold text-success">{fmtNaira(t.amount)}</div>
            </li>
          ))}
          {txs.length === 0 && (
            <li className="py-4 text-center text-muted-foreground">No payments yet.</li>
          )}
        </ul>
      </div>
    </>
  );
}
