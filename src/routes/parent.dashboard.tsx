import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { Spinner } from "../components/Spinner";
import { getSession } from "../lib/auth";
import { KEYS, read, write, type FeeRow, type Student, type TxRow, getTemplateForClass, getMyChildren } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { SecuredByNomba } from "../components/TestModeBanner";
import { useResumePendingPayment } from "../hooks/usePaymentPolling";
import { downloadReceipt } from "../lib/receipt";
import { readWallets, demoPayFee } from "../lib/demoWallet";
import { DemoPaymentModal, type DemoPaymentConfig } from "../components/DemoPaymentModal";
import { toast } from "sonner";
import { burstConfetti } from "../lib/confetti";

export const Route = createFileRoute("/parent/dashboard")({ component: ParentDash });

function ParentDash() {
  const session = getSession();
  const name = session?.name ?? "Parent";

  const [fees, setFees] = useState<FeeRow[]>(() => read<FeeRow[]>(KEYS.fees, []));
  const [txs, setTxs] = useState<TxRow[]>(() => read<TxRow[]>(KEYS.transactions, []));
  const [payAllFor, setPayAllFor] = useState<{ student: Student; amount: number; feeIds: string[] } | null>(null);

  const kids = getMyChildren();
  const myChildNames = new Set(kids.map((k) => k.name));

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

  function handlePayAllSuccess(student: Student, feeIds: string[], amount: number, ref: string) {
    const allFees = read<FeeRow[]>(KEYS.fees, []);
    const next = allFees.map((f) =>
      feeIds.includes(f.id) ? { ...f, paid: f.amount, status: "Paid" as FeeRow["status"] } : f,
    );
    write(KEYS.fees, next);
    const allTxs = read(KEYS.transactions, [] as TxRow[]);
    allTxs.unshift({
      id: `tx_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      studentName: student.name,
      fee: "Full Term Payment",
      amount,
      method: "Bank Transfer",
      status: "Paid",
      reference: ref,
    });
    write(KEYS.transactions, allTxs);
    setFees(next);
    setTxs(allTxs);
    setPayAllFor(null);
    burstConfetti();
    toast.success(`${fmtNaira(amount)} paid successfully — all fees cleared!`);
  }

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
          <button onClick={poll.cancel} className="text-xs text-muted-foreground underline hover:text-foreground">Dismiss</button>
        </div>
      )}

      {poll.state === "success" && (
        <div className="mb-4 rounded-xl border border-success/40 bg-success-soft px-4 py-3 text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-white text-base">✓</div>
            <div className="flex-1">
              <span className="font-semibold text-success">Payment confirmed!</span>
              <span className="ml-2 text-muted-foreground">{fmtNaira(poll.amount)} · Ref: {poll.transactionRef}</span>
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
            <button onClick={poll.cancel} className="text-xs text-muted-foreground underline hover:text-foreground">Dismiss</button>
          </div>
        </div>
      )}

      {poll.state === "timeout" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm shadow-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning text-white text-base">⏱</div>
          <div className="flex-1">
            <span className="font-semibold text-warning-foreground">Payment pending verification.</span>
            <span className="ml-2 text-muted-foreground">If money was deducted, contact the school. Your balance will update once confirmed.</span>
          </div>
          <button onClick={poll.cancel} className="text-xs text-muted-foreground underline hover:text-foreground">Dismiss</button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {kids.map((kid) => {
          const kidFees = fees.filter((f) => f.studentId === kid.id || f.studentName === kid.name);
          const template = getTemplateForClass(kid.class);
          const termTotal = template?.total ?? kidFees.reduce((s, f) => s + f.amount, 0);
          const totalPaid = kidFees.reduce((s, f) => s + f.paid, 0);
          const balance = kidFees.reduce((s, f) => s + (f.amount - f.paid), 0);
          const status = balance === 0 ? "Paid" : kidFees.some((f) => f.paid > 0) ? "Partial" : "Unpaid";
          const unpaidFees = kidFees.filter((f) => f.status !== "Paid");
          const unpaidIds = unpaidFees.map((f) => f.id);

          return (
            <div key={kid.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">{kid.name}</div>
                  <div className="text-xs text-muted-foreground">{kid.class}</div>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-3">
                <div className="text-xs text-muted-foreground">Total Fees This Term</div>
                <div className="text-2xl font-bold text-foreground">{fmtNaira(termTotal)}</div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Paid: <span className="font-medium text-success">{fmtNaira(totalPaid)}</span></span>
                  <span>Outstanding: <span className={`font-medium ${balance > 0 ? "text-warning-foreground" : "text-success"}`}>{fmtNaira(balance)}</span></span>
                </div>
                {termTotal > 0 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${Math.min(100, Math.round((totalPaid / termTotal) * 100))}%` }}
                    />
                  </div>
                )}
              </div>

              {kidFees.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Fee Breakdown</div>
                  <div className="space-y-1">
                    {kidFees.map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{f.term}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{fmtNaira(f.amount)}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${f.status === "Paid" ? "bg-success/15 text-success" : f.status === "Partial" ? "bg-warning/15 text-warning-foreground" : "bg-destructive/10 text-destructive"}`}>
                            {f.status === "Paid" ? "✓" : f.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {balance > 0 && (
                  <button
                    onClick={() => setPayAllFor({ student: kid, amount: balance, feeIds: unpaidIds })}
                    className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Pay All at Once
                  </button>
                )}
                <Link
                  to="/parent/fees"
                  className={`rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary ${balance === 0 ? "flex-1 text-center" : ""}`}
                >
                  {balance === 0 ? "View Fees" : "Manage"}
                </Link>
              </div>

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
            <p className="mt-2 text-sm text-muted-foreground">No student linked to your account yet. Contact the school admin.</p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="text-base font-semibold">Recent Payments</div>
        <ul className="mt-3 divide-y divide-border text-sm">
          {txs.filter((t) => myChildNames.has(t.studentName)).slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{t.fee}</div>
                <div className="text-xs text-muted-foreground">{fmtDate(t.date)} · {t.method}</div>
              </div>
              <div className="font-semibold text-success">{fmtNaira(t.amount)}</div>
            </li>
          ))}
          {txs.filter((t) => myChildNames.has(t.studentName)).length === 0 && <li className="py-4 text-center text-muted-foreground">No payments yet.</li>}
        </ul>
      </div>

      {payAllFor && (
        <PayAllModal
          student={payAllFor.student}
          amount={payAllFor.amount}
          feeIds={payAllFor.feeIds}
          onClose={() => setPayAllFor(null)}
          onSuccess={(ref) => handlePayAllSuccess(payAllFor.student, payAllFor.feeIds, payAllFor.amount, ref)}
        />
      )}
    </>
  );
}

function PayAllModal({
  student,
  amount,
  feeIds,
  onClose,
  onSuccess,
}: {
  student: Student;
  amount: number;
  feeIds: string[];
  onClose: () => void;
  onSuccess: (ref: string) => void;
}) {
  const wallets = readWallets();

  const config: DemoPaymentConfig = {
    headerEmoji: "🎓",
    headerLabel: "PAY ALL FEES (DEMO)",
    fromName: wallets.parent.name,
    fromBalance: wallets.parent.balance,
    fromAccount: wallets.parent.accountNumber,
    fromBank: wallets.parent.bank,
    toLabel: "TO",
    toName: wallets.school.name,
    toAccount: wallets.school.accountNumber,
    toBank: wallets.school.bank,
    amount,
    description: `Full Term Payment — ${student.name} (${student.class})`,
    confirmLabel: "Pay All at Once",
  };

  return (
    <DemoPaymentModal
      config={config}
      onConfirm={() => demoPayFee(amount)}
      onSuccess={(ref) => onSuccess(ref)}
      onClose={onClose}
    />
  );
}
