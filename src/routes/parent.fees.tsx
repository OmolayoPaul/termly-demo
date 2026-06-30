import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { StatusBadge } from "../components/StatusBadge";
import { getSession } from "../lib/auth";
import { KEYS, read, write, type FeeRow, type Mandate } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { createCheckoutOrder, verifyTransaction, createDirectDebitMandate, friendlyError } from "../services/nomba";
import { SecuredByNomba } from "../components/TestModeBanner";

export const Route = createFileRoute("/parent/fees")({ component: Page });

function Page() {
  const session = getSession();
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [paying, setPaying] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<{ orderReference: string; feeId: string } | null>(null);
  const [success, setSuccess] = useState<{ amount: number; ref: string } | null>(null);
  const [planFor, setPlanFor] = useState<FeeRow | null>(null);

  useEffect(() => { setRows(read<FeeRow[]>(KEYS.fees, [])); }, []);

  async function payFull(f: FeeRow) {
    const amount = f.amount - f.paid;
    if (amount <= 0) return;
    setPaying(f.id);
    try {
      const r = await createCheckoutOrder(amount, session?.email ?? "parent@termly.com", session?.name ?? "Parent");
      write(KEYS.pendingPayment, { orderReference: r.orderReference, feeId: f.id, amount, timestamp: Date.now() });
      window.open(r.checkoutLink, "_blank");
      setWaiting({ orderReference: r.orderReference, feeId: f.id });
      pollVerify(r.orderReference, f);
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setPaying(null); }
  }

  async function pollVerify(ref: string, fee: FeeRow) {
    const start = Date.now();
    while (Date.now() - start < 180000) {
      await new Promise((res) => setTimeout(res, 5000));
      try {
        const r = await verifyTransaction(ref);
        const ok = String(r.status).toUpperCase().includes("SUCCESS") || String(r.status).toUpperCase() === "PAID";
        if (ok) {
          const fees = read<FeeRow[]>(KEYS.fees, []).map((x) => x.id === fee.id ? { ...x, paid: x.amount, status: "Paid" as const } : x);
          write(KEYS.fees, fees); setRows(fees);
          setSuccess({ amount: Number(r.amount) || fee.amount - fee.paid, ref: r.transactionRef });
          setWaiting(null);
          return;
        }
      } catch { /* continue */ }
    }
    setWaiting(null);
    toast.message("Payment pending. Check back shortly.");
  }

  return (
    <>
      <PageHeader title="Pay Fees" subtitle="View and pay your child's school fees." actions={<SecuredByNomba />} />
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Term</th><th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Paid</th><th className="px-5 py-3 font-medium">Balance</th>
              <th className="px-5 py-3 font-medium">Due</th><th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((f) => (
              <tr key={f.id}>
                <td className="px-5 py-3 font-medium">{f.term}<div className="text-xs text-muted-foreground">{f.studentName}</div></td>
                <td className="px-5 py-3 font-semibold">{fmtNaira(f.amount)}</td>
                <td className="px-5 py-3 text-success">{fmtNaira(f.paid)}</td>
                <td className="px-5 py-3 text-warning-foreground">{fmtNaira(f.amount - f.paid)}</td>
                <td className="px-5 py-3 text-muted-foreground">{fmtDate(f.dueDate)}</td>
                <td className="px-5 py-3"><StatusBadge status={f.status} /></td>
                <td className="px-5 py-3 text-right space-x-2">
                  {f.status !== "Paid" ? (
                    <>
                      <button onClick={() => payFull(f)} disabled={paying === f.id} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">{paying === f.id ? "Connecting…" : "Pay Full"}</button>
                      <button onClick={() => setPlanFor(f)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium">Installments</button>
                    </>
                  ) : <span className="text-xs text-success">Fully Paid ✓</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No outstanding fees.</td></tr>}
          </tbody>
        </table>
      </div>

      {waiting && (
        <Modal onClose={() => setWaiting(null)}>
          <div className="text-center">
            <Spinner size={36} className="mx-auto text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Complete payment in the new tab</h3>
            <p className="text-sm text-muted-foreground">Waiting for confirmation…</p>
          </div>
        </Modal>
      )}
      {success && (
        <Modal onClose={() => setSuccess(null)}>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-2xl text-white">✓</div>
            <h3 className="mt-2 text-lg font-bold text-success">Payment Successful!</h3>
            <p className="mt-1 text-sm">Amount: <strong>{fmtNaira(success.amount)}</strong></p>
            <p className="text-sm">Reference: <code className="text-xs">{success.ref}</code></p>
            <p className="text-sm text-muted-foreground">Your fee has been marked as paid.</p>
          </div>
        </Modal>
      )}
      {planFor && <PlanModal fee={planFor} onClose={() => setPlanFor(null)} email={session?.email ?? ""} phoneDefault={session?.phone ?? ""} />}
    </>
  );
}

function PlanModal({ fee, onClose, email, phoneDefault }: { fee: FeeRow; onClose: () => void; email: string; phoneDefault: string }) {
  const [months, setMonths] = useState(2);
  const [phone, setPhone] = useState(phoneDefault);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ next: string } | null>(null);
  const monthly = Math.ceil((fee.amount - fee.paid) / months);

  async function setup() {
    if (!phone) return toast.error("Phone is required");
    setBusy(true);
    try {
      const start = new Date(); start.setDate(start.getDate() + 1);
      const r = await createDirectDebitMandate(monthly, start.toISOString().slice(0, 10), phone, email);
      const mandates = read<Mandate[]>(KEYS.mandates, []);
      mandates.unshift({
        id: `m_${Date.now()}`, studentName: fee.studentName, parentName: "", parentEmail: email,
        amount: monthly, months, monthsPaid: 0, nextDebitDate: r.nextDebitDate, status: r.status, mandateId: r.mandateId,
      });
      write(KEYS.mandates, mandates);
      setDone({ next: r.nextDebitDate });
    } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
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
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value={2}>2 months</option><option value={3}>3 months</option>
          </select>
          <div className="mt-2 rounded-md bg-info-soft px-3 py-2 text-sm">{fmtNaira(monthly)} per month for {months} months</div>
          <label className="mt-3 block text-sm">Phone number for debit notifications</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={setup} disabled={busy} className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Setting up…" : "Set Up Plan"}</button>
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