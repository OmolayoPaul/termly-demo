import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { getSession } from "../lib/auth";
import { KEYS, read, write, type FeeRow, type Mandate, type Student, getTemplateForClass } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { friendlyError } from "../services/nomba";
import { SecuredByNomba } from "../components/TestModeBanner";
import { readWallets, demoPayFee, demoCreateMandate } from "../lib/demoWallet";
import { DemoPaymentModal, type DemoPaymentConfig } from "../components/DemoPaymentModal";
import { burstConfetti } from "../lib/confetti";

export const Route = createFileRoute("/parent/fees")({ component: Page });

type PendingPayment = {
  id: string;
  feeId: string;
  studentName: string;
  term: string;
  amount: number;
  savedAt: string;
};

function Page() {
  const session = getSession();
  const [rows, setRows] = useState<FeeRow[]>(() => read<FeeRow[]>(KEYS.fees, []));
  const [planFor, setPlanFor] = useState<FeeRow | null>(null);
  const [payFor, setPayFor] = useState<FeeRow | null>(null);
  const [failedFee, setFailedFee] = useState<FeeRow | null>(null);
  const [payAllFor, setPayAllFor] = useState<{ studentName: string; amount: number; feeIds: string[] } | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>(() =>
    read<PendingPayment[]>(KEYS.pendingPayments, [])
  );

  const refreshRows = useCallback(() => {
    setRows(read<FeeRow[]>(KEYS.fees, []));
    setPendingPayments(read<PendingPayment[]>(KEYS.pendingPayments, []));
  }, []);

  function markFeesPaid(feeIds: string[], amount: number, ref: string, studentName: string, feeLabel: string) {
    const fees = read<FeeRow[]>(KEYS.fees, []);
    const next = fees.map((row) =>
      feeIds.includes(row.id)
        ? { ...row, paid: row.amount, status: "Paid" as FeeRow["status"] }
        : row,
    );
    write(KEYS.fees, next);
    const txs = read(KEYS.transactions, [] as any[]);
    txs.unshift({
      id: `tx_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      studentName,
      fee: feeLabel,
      amount,
      method: "Bank Transfer",
      status: "Paid",
      reference: ref,
    });
    write(KEYS.transactions, txs);
    const pending = read<PendingPayment[]>(KEYS.pendingPayments, []);
    write(KEYS.pendingPayments, pending.filter((p) => !feeIds.includes(p.feeId)));
    refreshRows();
  }

  function handleDemoPaySuccess(f: FeeRow, amount: number, ref: string) {
    markFeesPaid([f.id], amount, ref, f.studentName, f.term);
    toast.success(`${fmtNaira(amount)} paid successfully!`);
  }

  function handlePayAllSuccess(studentName: string, feeIds: string[], amount: number, ref: string) {
    markFeesPaid(feeIds, amount, ref, studentName, "Full Term Payment");
    setPayAllFor(null);
    burstConfetti();
    toast.success(`${fmtNaira(amount)} paid — all fees cleared!`);
  }

  function handlePayLater(f: FeeRow) {
    const pending = read<PendingPayment[]>(KEYS.pendingPayments, []);
    const already = pending.find((p) => p.feeId === f.id);
    if (!already) {
      const newPending: PendingPayment = {
        id: `pp_${Date.now()}`,
        feeId: f.id,
        studentName: f.studentName,
        term: f.term,
        amount: f.amount - f.paid,
        savedAt: new Date().toISOString(),
      };
      write(KEYS.pendingPayments, [newPending, ...pending]);
      setPendingPayments([newPending, ...pending]);
    }
    setFailedFee(null);
    toast.info("Payment saved. You'll see a reminder on your dashboard.");
  }

  function dismissPending(id: string) {
    const next = pendingPayments.filter((p) => p.id !== id);
    write(KEYS.pendingPayments, next);
    setPendingPayments(next);
  }

  const students = read<Student[]>(KEYS.students, []);
  const studentNames = Array.from(new Set(rows.map((r) => r.studentName)));

  return (
    <>
      <PageHeader
        title="Pay Fees"
        subtitle="View and pay your child's school fees."
        actions={<SecuredByNomba />}
      />

      {pendingPayments.map((p) => {
        const fee = rows.find((r) => r.id === p.feeId);
        return (
          <div key={p.id} className="mb-3 flex items-start justify-between gap-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
            <div className="text-sm">
              <span className="font-semibold text-warning-foreground">⚠ Pending Payment:</span>{" "}
              You have a pending payment of {fmtNaira(p.amount)} for {p.term}.
              Complete it now to avoid late fees.
            </div>
            <div className="flex shrink-0 gap-2">
              {fee && fee.status !== "Paid" && (
                <button
                  onClick={() => setPayFor(fee)}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  Pay Now
                </button>
              )}
              <button
                onClick={() => dismissPending(p.id)}
                className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}

      {studentNames.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          No outstanding fees.
        </div>
      )}

      {studentNames.map((studentName) => {
        const studentFees = rows.filter((f) => f.studentName === studentName);
        const student = students.find((s) => s.id === studentFees[0]?.studentId || s.name === studentName);
        const template = student ? getTemplateForClass(student.class) : undefined;
        const termTotal = template?.total ?? studentFees.reduce((s, f) => s + f.amount, 0);
        const totalPaid = studentFees.reduce((s, f) => s + f.paid, 0);
        const balance = studentFees.reduce((s, f) => s + (f.amount - f.paid), 0);
        const unpaidFees = studentFees.filter((f) => f.status !== "Paid");
        const unpaidIds = unpaidFees.map((f) => f.id);

        return (
          <div key={studentName} className="mb-6 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-3">
              <div>
                <div className="font-semibold">{studentName}</div>
                {student && <div className="text-xs text-muted-foreground">{student.class}</div>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Total Fees This Term</div>
                  <div className="text-lg font-bold text-primary">{fmtNaira(termTotal)}</div>
                </div>
                {balance > 0 && (
                  <button
                    onClick={() => setPayAllFor({ studentName, amount: balance, feeIds: unpaidIds })}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 whitespace-nowrap"
                  >
                    Pay All at Once
                  </button>
                )}
              </div>
            </div>

            {termTotal > 0 && (
              <div className="px-5 py-2 border-b border-border">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Paid: <span className="text-success font-medium">{fmtNaira(totalPaid)}</span></span>
                  <span>Balance: <span className={`font-medium ${balance > 0 ? "text-warning-foreground" : "text-success"}`}>{fmtNaira(balance)}</span></span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-success transition-all"
                    style={{ width: `${Math.min(100, Math.round((totalPaid / termTotal) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Fee</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Paid</th>
                  <th className="px-5 py-3 font-medium">Balance</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {studentFees.map((f) => (
                  <tr key={f.id}>
                    <td className="px-5 py-3 font-medium">{f.term}</td>
                    <td className="px-5 py-3 font-semibold">{fmtNaira(f.amount)}</td>
                    <td className="px-5 py-3 text-success">{fmtNaira(f.paid)}</td>
                    <td className="px-5 py-3 text-warning-foreground">{fmtNaira(f.amount - f.paid)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(f.dueDate)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      {f.status !== "Paid" ? (
                        <>
                          <button
                            onClick={() => setPayFor(f)}
                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                          >
                            Pay
                          </button>
                          <button
                            onClick={() => setPlanFor(f)}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium"
                          >
                            Installments
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-success">Paid ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {planFor && (
        <PlanModal
          fee={planFor}
          onClose={() => setPlanFor(null)}
          email={session?.email ?? ""}
          phoneDefault={session?.phone ?? ""}
        />
      )}

      {payFor && (
        <PayFullModal
          fee={payFor}
          onClose={() => {
            setPayFor(null);
            setFailedFee(payFor);
          }}
          onSuccess={(amount, ref) => {
            handleDemoPaySuccess(payFor, amount, ref);
            setPayFor(null);
            setFailedFee(null);
          }}
        />
      )}

      {payAllFor && (
        <PayAllModal
          studentName={payAllFor.studentName}
          amount={payAllFor.amount}
          feeIds={payAllFor.feeIds}
          onClose={() => setPayAllFor(null)}
          onSuccess={(ref) => handlePayAllSuccess(payAllFor.studentName, payAllFor.feeIds, payAllFor.amount, ref)}
        />
      )}

      {failedFee && failedFee.status !== "Paid" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setFailedFee(null)}>
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-2 text-warning-foreground">
              <span className="text-2xl">⚠</span>
              <h2 className="text-lg font-bold">Payment Incomplete</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Your payment of {fmtNaira(failedFee.amount - failedFee.paid)} for{" "}
              <span className="font-semibold">{failedFee.term}</span> was not completed.
            </p>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => { setPayFor(failedFee); setFailedFee(null); }}
                className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Try Again
              </button>
              <button
                onClick={() => handlePayLater(failedFee)}
                className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Pay Later
              </button>
            </div>
            <div className="border-t border-border pt-3 text-center">
              <p className="mb-2 text-xs text-muted-foreground">Or use installments instead:</p>
              <button
                onClick={() => { setPlanFor(failedFee); setFailedFee(null); }}
                className="rounded-md border border-primary/40 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
              >
                Set Up Monthly Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PayAllModal({
  studentName,
  amount,
  feeIds,
  onClose,
  onSuccess,
}: {
  studentName: string;
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
    description: `Full Term Payment — ${studentName} (${feeIds.length} fee items)`,
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

function PayFullModal({
  fee,
  onClose,
  onSuccess,
}: {
  fee: FeeRow;
  onClose: () => void;
  onSuccess: (amount: number, ref: string) => void;
}) {
  const wallets = readWallets();
  const amount = fee.amount - fee.paid;

  const config: DemoPaymentConfig = {
    headerEmoji: "🎓",
    headerLabel: "PAY SCHOOL FEES (DEMO)",
    fromName: wallets.parent.name,
    fromBalance: wallets.parent.balance,
    fromAccount: wallets.parent.accountNumber,
    fromBank: wallets.parent.bank,
    toLabel: "TO",
    toName: wallets.school.name,
    toAccount: wallets.school.accountNumber,
    toBank: wallets.school.bank,
    amount,
    description: `${fee.term} - ${fee.studentName}`,
    confirmLabel: "Pay Now",
  };

  return (
    <DemoPaymentModal
      config={config}
      onConfirm={() => demoPayFee(amount)}
      onSuccess={(ref) => onSuccess(amount, ref)}
      onClose={onClose}
    />
  );
}

function PlanModal({
  fee,
  onClose,
  email,
  phoneDefault,
}: {
  fee: FeeRow;
  onClose: () => void;
  email: string;
  phoneDefault: string;
}) {
  const [months, setMonths] = useState(2);
  const [phone, setPhone] = useState(phoneDefault);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ next: string } | null>(null);
  const monthly = Math.ceil((fee.amount - fee.paid) / months);

  async function setup() {
    if (!phone) return toast.error("Phone is required");
    setBusy(true);
    try {
      await new Promise((res) => setTimeout(res, 1200));
      const r = demoCreateMandate();
      const mandates = read<Mandate[]>(KEYS.mandates, []);
      mandates.unshift({
        id: `m_${Date.now()}`,
        studentName: fee.studentName,
        parentName: "",
        parentEmail: email,
        amount: monthly,
        months,
        monthsPaid: 0,
        nextDebitDate: r.nextDebitDate,
        status: r.status,
        mandateId: r.mandateId,
      });
      write(KEYS.mandates, mandates);
      setDone({ next: r.nextDebitDate });
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      {done ? (
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-2xl text-white">✓</div>
          <h3 className="mt-2 text-lg font-bold text-success">Installment Plan Created!</h3>
          <p className="mt-1 text-sm">{fmtNaira(monthly)} debited monthly</p>
          <p className="text-sm text-muted-foreground">First debit: {fmtDate(done.next)}</p>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold">Pay in Installments</h2>
          <p className="text-sm text-muted-foreground">{fee.term} · {fmtNaira(fee.amount - fee.paid)} balance</p>
          <label className="mt-3 block text-sm">Number of months</label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value={2}>2 months</option>
            <option value={3}>3 months</option>
          </select>
          <div className="mt-2 rounded-md bg-info-soft px-3 py-2 text-sm">
            {fmtNaira(monthly)} per month for {months} months
          </div>
          <label className="mt-3 block text-sm">Phone number for debit notifications</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={setup}
            disabled={busy}
            className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Setting up…" : "Set Up Plan"}
          </button>
        </>
      )}
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="float-right text-muted-foreground hover:text-foreground">✕</button>
        {children}
      </div>
    </div>
  );
}
