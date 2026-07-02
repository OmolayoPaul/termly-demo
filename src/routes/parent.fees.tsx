import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { getSession } from "../lib/auth";
import { KEYS, read, write, type FeeRow, type Mandate } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { friendlyError } from "../services/nomba";
import { SecuredByNomba } from "../components/TestModeBanner";
import { readWallets, demoPayFee, demoCreateMandate, type DemoWallets } from "../lib/demoWallet";
import { DemoPaymentModal, type DemoPaymentConfig } from "../components/DemoPaymentModal";

export const Route = createFileRoute("/parent/fees")({ component: Page });

function Page() {
  const session = getSession();
  const [rows, setRows] = useState<FeeRow[]>(() => read<FeeRow[]>(KEYS.fees, []));
  const [planFor, setPlanFor] = useState<FeeRow | null>(null);
  const [payFor, setPayFor] = useState<FeeRow | null>(null);

  const refreshRows = useCallback(() => {
    setRows(read<FeeRow[]>(KEYS.fees, []));
  }, []);

  function handleDemoPaySuccess(f: FeeRow, amount: number, ref: string) {
    const fees = read<FeeRow[]>(KEYS.fees, []);
    const next = fees.map((row) =>
      row.id === f.id
        ? { ...row, paid: row.paid + amount, status: "Paid" as FeeRow["status"] }
        : row,
    );
    write(KEYS.fees, next);
    const txs = read(KEYS.transactions, [] as any[]);
    txs.unshift({
      id: `tx_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      studentName: f.studentName,
      fee: f.term,
      amount,
      method: "Bank Transfer",
      status: "Paid",
      reference: ref,
    });
    write(KEYS.transactions, txs);
    refreshRows();
    toast.success(`${fmtNaira(amount)} paid successfully!`);
  }

  return (
    <>
      <PageHeader
        title="Pay Fees"
        subtitle="View and pay your child's school fees."
        actions={<SecuredByNomba />}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Term</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Paid</th>
              <th className="px-5 py-3 font-medium">Balance</th>
              <th className="px-5 py-3 font-medium">Due</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((f) => (
              <tr key={f.id}>
                <td className="px-5 py-3 font-medium">
                  {f.term}
                  <div className="text-xs text-muted-foreground">{f.studentName}</div>
                </td>
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
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Pay Full
                      </button>
                      <button
                        onClick={() => setPlanFor(f)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        Installments
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-success">Fully Paid ✓</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  No outstanding fees.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
          onClose={() => setPayFor(null)}
          onSuccess={(amount, ref) => handleDemoPaySuccess(payFor, amount, ref)}
        />
      )}
    </>
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-2xl text-white">
            ✓
          </div>
          <h3 className="mt-2 text-lg font-bold text-success">Installment Plan Created!</h3>
          <p className="mt-1 text-sm">{fmtNaira(monthly)} debited monthly</p>
          <p className="text-sm text-muted-foreground">First debit: {fmtDate(done.next)}</p>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold">Pay in Installments</h2>
          <p className="text-sm text-muted-foreground">
            {fee.term} · {fmtNaira(fee.amount - fee.paid)} balance
          </p>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="float-right text-muted-foreground hover:text-foreground">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
