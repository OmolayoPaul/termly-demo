import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { getSession } from "../lib/auth";
import { KEYS, read, write, type Mandate } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { SecuredByNomba } from "../components/TestModeBanner";
import { readWallets, demoTopUpSavings, type DemoWallets, DEFAULT_WALLETS } from "../lib/demoWallet";
import { DemoPaymentModal, type DemoPaymentConfig } from "../components/DemoPaymentModal";
import { createDirectDebitMandate, friendlyError } from "../services/nomba";
import { burstConfetti } from "../lib/confetti";
import {
  checkAndNotifySavingsThreshold,
  getNotificationPermission,
  requestNotificationPermission,
} from "../lib/notifications";

export const Route = createFileRoute("/parent/savings")({ component: SavingsPage });

const QUICK_AMOUNTS = [5000, 10000, 20000];

function SavingsPage() {
  const session = getSession();
  const [mounted, setMounted] = useState(false);
  const [wallets, setWallets] = useState<DemoWallets>(DEFAULT_WALLETS);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [prevPct, setPrevPct] = useState(0);

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  const refresh = useCallback(() => {
    const w = readWallets();
    setWallets(w);
    checkAndNotifySavingsThreshold({
      studentId: "TML/2024/001",
      studentName: w.student.name,
      balance: w.student.savingsBalance,
      goal: w.student.feeOwed,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    const w = readWallets();
    setWallets(w);
    setPrevPct(w.student.feeOwed > 0 ? Math.round((w.student.savingsBalance / w.student.feeOwed) * 100) : 0);
    setNotifPermission(getNotificationPermission());
    checkAndNotifySavingsThreshold({
      studentId: "TML/2024/001",
      studentName: w.student.name,
      balance: w.student.savingsBalance,
      goal: w.student.feeOwed,
    });
    window.addEventListener("termly:wallet:updated", refresh);
    return () => window.removeEventListener("termly:wallet:updated", refresh);
  }, [refresh]);

  async function enableNotifications() {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") {
      toast.success("Notifications enabled! You'll be alerted on savings milestones.");
    } else if (result === "denied") {
      toast.error("Notifications blocked. You can enable them in your browser settings.");
    }
  }

  if (!mounted) return null;

  const { student, parent } = wallets;
  const pct = student.feeOwed > 0 ? Math.min(100, Math.round((student.savingsBalance / student.feeOwed) * 100)) : 0;
  const stillNeeded = Math.max(0, student.feeOwed - student.savingsBalance);

  function handleTopUpSuccess() {
    const w = readWallets();
    const newPct = w.student.feeOwed > 0 ? Math.round((w.student.savingsBalance / w.student.feeOwed) * 100) : 0;
    if (newPct >= 100 && prevPct < 100) {
      setTimeout(() => burstConfetti(), 400);
    }
    setPrevPct(newPct);
    setWallets(w);
  }

  return (
    <>
      <PageHeader
        title="Savings"
        subtitle="Save towards your child's school fees, a little at a time."
        actions={<SecuredByNomba />}
      />

      {notifPermission === "default" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-info/40 bg-info-soft px-5 py-3 shadow-sm">
          <div className="text-sm text-info">
            🔔 Turn on notifications to get alerted when {student.name.split(" ")[0]}'s savings goal is reached or
            running low.
          </div>
          <button
            onClick={enableNotifications}
            className="shrink-0 rounded-md bg-info px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {pct >= 100 && (
        <div className="mb-4 rounded-xl border border-success/40 bg-success-soft px-5 py-4 text-center shadow-sm">
          <div className="text-lg font-bold text-success">🎉 Savings Goal Reached!</div>
          <p className="mt-1 text-sm text-success">
            {student.name.split(" ")[0]}'s First Term fee is fully covered! Admin can now deduct fees from savings.
          </p>
        </div>
      )}
      {pct < 100 && pct < 25 && (
        <div className="mb-4 animate-pulse rounded-xl border border-destructive/40 bg-danger-soft px-5 py-4 shadow-sm">
          <div className="text-sm font-bold text-destructive">⚠️ Low Savings Alert</div>
          <p className="mt-1 text-sm text-destructive">
            {student.name.split(" ")[0]}'s savings ({fmtNaira(student.savingsBalance)}) won't cover the upcoming fee
            of {fmtNaira(student.feeOwed)}. You need {fmtNaira(stillNeeded)} more.
          </p>
          <button
            onClick={() => setTopUpOpen(true)}
            className="mt-3 rounded-md bg-destructive px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Top Up Now
          </button>
        </div>
      )}
      {pct >= 25 && pct < 100 && (
        <div className="mb-4 rounded-xl border border-warning/40 bg-warning-soft px-5 py-4 shadow-sm">
          <div className="text-sm font-bold text-warning-foreground">📊 Keep Saving!</div>
          <p className="mt-1 text-sm text-warning-foreground">
            {fmtNaira(student.savingsBalance)} saved. {fmtNaira(stillNeeded)} more to cover the full fee.
          </p>
          <button
            onClick={() => setTopUpOpen(true)}
            className="mt-3 rounded-md bg-warning px-4 py-2 text-xs font-semibold text-warning-foreground hover:opacity-90"
          >
            Top Up Savings
          </button>
        </div>
      )}
      {pct >= 100 && (
        <div className="mb-4 rounded-xl border border-success/40 bg-success-soft px-5 py-4 shadow-sm">
          <div className="text-sm font-bold text-success">✅ You're all set!</div>
          <p className="mt-1 text-sm text-success">
            {student.name.split(" ")[0]}'s fee is fully covered by savings. Admin will process the deduction before
            term starts.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold">{student.name}</div>
              <div className="text-xs text-muted-foreground">{student.admissionNumber}</div>
            </div>
            <span className="text-2xl">👦</span>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">Savings Progress</div>
          <div className="mt-1 text-2xl font-bold">
            {fmtNaira(student.savingsBalance)}{" "}
            <span className="text-sm font-normal text-muted-foreground">of {fmtNaira(student.feeOwed)}</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct >= 100 ? "bg-yellow-400 animate-pulse" : pct >= 75 ? "bg-success" : pct >= 25 ? "bg-warning" : "bg-red-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-xs font-medium text-muted-foreground">{pct}% saved</div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setTopUpOpen(true)}
              className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Top Up Savings
            </button>
            <button
              onClick={() => setPlanOpen(true)}
              className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium hover:bg-secondary"
            >
              Save in Installments
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-sm font-semibold">Your Wallet</div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Balance</span>
            <span className="font-semibold">{fmtNaira(parent.balance)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Account</span>
            <span>{parent.accountNumber} ({parent.bank})</span>
          </div>
          <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            Top-ups move money instantly from your wallet into {student.name.split(" ")[0]}'s savings account via a
            simulated Nomba transfer.
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Savings History</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-2 font-medium">Date</th>
              <th className="px-5 py-2 font-medium">Type</th>
              <th className="px-5 py-2 font-medium">Amount</th>
              <th className="px-5 py-2 font-medium">Balance</th>
              <th className="px-5 py-2 font-medium">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {student.savingsHistory.map((h, i) => (
              <tr key={i}>
                <td className="px-5 py-2 text-muted-foreground">{fmtDate(h.date)}</td>
                <td className="px-5 py-2">{h.type}</td>
                <td className={`px-5 py-2 font-semibold ${h.amount >= 0 ? "text-success" : "text-destructive"}`}>
                  {h.amount >= 0 ? "+" : ""}
                  {fmtNaira(h.amount)}
                </td>
                <td className="px-5 py-2">{fmtNaira(h.balanceAfter)}</td>
                <td className="px-5 py-2 text-xs text-muted-foreground">{h.reference}</td>
              </tr>
            ))}
            {student.savingsHistory.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  No savings activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {topUpOpen && (
        <TopUpModal
          wallets={wallets}
          onClose={() => setTopUpOpen(false)}
          onSuccess={handleTopUpSuccess}
        />
      )}

      {planOpen && (
        <InstallmentPlanModal
          feeOwed={student.feeOwed}
          savingsBalance={student.savingsBalance}
          email={session?.email ?? ""}
          phoneDefault={session?.phone ?? ""}
          onClose={() => setPlanOpen(false)}
        />
      )}
    </>
  );
}

function TopUpModal({
  wallets,
  onClose,
  onSuccess,
}: {
  wallets: DemoWallets;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const stillNeeded = Math.max(0, wallets.student.feeOwed - wallets.student.savingsBalance);
  const [amount, setAmount] = useState<number>(stillNeeded > 0 ? Math.min(10000, stillNeeded) : 5000);
  const [custom, setCustom] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const finalAmount = custom ? Number(custom) : amount;

  if (!confirmed) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm overflow-hidden rounded-2xl bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-primary px-5 py-4 text-primary-foreground">
            <div className="text-sm font-bold tracking-wide">💰 TOP UP SAVINGS (DEMO)</div>
          </div>
          <div className="px-5 py-4 text-sm">
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <div className="font-semibold">{wallets.student.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Current Savings: {fmtNaira(wallets.student.savingsBalance)}
              </div>
              <div className="text-xs text-muted-foreground">Fee Owed: {fmtNaira(wallets.student.feeOwed)}</div>
              <div className="text-xs text-muted-foreground">Still Needed: {fmtNaira(stillNeeded)}</div>
            </div>

            <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quick amounts
            </div>
            <div className="mt-2 flex gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setAmount(a);
                    setCustom("");
                  }}
                  className={`flex-1 rounded-md border py-2 text-xs font-semibold ${
                    !custom && amount === a
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  {fmtNaira(a)}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="number"
                placeholder="Custom amount"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3 text-xs">
              <div className="font-semibold uppercase text-muted-foreground">From</div>
              <div className="mt-1">{wallets.parent.name}</div>
              <div className="text-muted-foreground">Balance: {fmtNaira(wallets.parent.balance)}</div>
            </div>
          </div>
          <div className="flex gap-3 px-4 pb-5">
            <button
              onClick={onClose}
              className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              disabled={!finalAmount || finalAmount <= 0}
              onClick={() => setConfirmed(true)}
              className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Save Money
            </button>
          </div>
        </div>
      </div>
    );
  }

  const config: DemoPaymentConfig = {
    headerEmoji: "💰",
    headerLabel: "TOP UP SAVINGS (DEMO)",
    fromName: wallets.parent.name,
    fromBalance: wallets.parent.balance,
    fromAccount: wallets.parent.accountNumber,
    fromBank: wallets.parent.bank,
    toLabel: "TO",
    toName: `${wallets.student.name} Savings`,
    amount: finalAmount,
    confirmLabel: "Save Money",
  };

  return (
    <DemoPaymentModal
      config={config}
      onConfirm={() => demoTopUpSavings(finalAmount)}
      onSuccess={() => {
        toast.success(`₦${finalAmount.toLocaleString()} saved successfully!`);
        onSuccess();
      }}
      onClose={onClose}
    />
  );
}

function InstallmentPlanModal({
  feeOwed,
  savingsBalance,
  email,
  phoneDefault,
  onClose,
}: {
  feeOwed: number;
  savingsBalance: number;
  email: string;
  phoneDefault: string;
  onClose: () => void;
}) {
  const [monthly, setMonthly] = useState(5000);
  const [phone, setPhone] = useState(phoneDefault);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ next: string; monthly: number } | null>(null);

  const remaining = Math.max(0, feeOwed - savingsBalance);
  const months = Math.max(1, Math.ceil(remaining / monthly));

  async function setup() {
    if (!phone) return toast.error("Phone is required");
    setBusy(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() + 1);
      const r = await createDirectDebitMandate(monthly, start.toISOString().slice(0, 10), phone, email);
      const mandates = read<Mandate[]>(KEYS.mandates, []);
      mandates.unshift({
        id: `sav_${Date.now()}`,
        studentName: "Savings Plan",
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
      setDone({ next: r.nextDebitDate, monthly });
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="float-right text-muted-foreground hover:text-foreground">
          ✕
        </button>
        {done ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-2xl text-white">
              ✓
            </div>
            <h3 className="mt-2 text-lg font-bold text-success">Auto-savings set up!</h3>
            <p className="mt-1 text-sm">{fmtNaira(done.monthly)} saved monthly</p>
            <p className="text-sm text-muted-foreground">First deduction: {fmtDate(done.next)}</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Save in Installments</h2>
            <p className="text-sm text-muted-foreground">Set up automatic monthly savings towards the fee goal.</p>
            <label className="mt-3 block text-sm">Amount to save per month</label>
            <div className="mt-1 flex gap-2">
              {[5000, 10000].map((a) => (
                <button
                  key={a}
                  onClick={() => setMonthly(a)}
                  className={`flex-1 rounded-md border py-2 text-xs font-semibold ${
                    monthly === a ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                  }`}
                >
                  {fmtNaira(a)}
                </button>
              ))}
              <input
                type="number"
                placeholder="Custom"
                onChange={(e) => setMonthly(Number(e.target.value) || 0)}
                className="flex-1 rounded-md border border-input bg-background px-2 py-2 text-xs"
              />
            </div>
            <div className="mt-2 rounded-md bg-info-soft px-3 py-2 text-sm">
              You'll reach your {fmtNaira(feeOwed)} goal in {months} month{months > 1 ? "s" : ""}
            </div>
            <label className="mt-3 block text-sm">Phone number for debit notifications</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={setup}
              disabled={busy || monthly <= 0}
              className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Setting up…" : "Set Up Auto-Savings"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
