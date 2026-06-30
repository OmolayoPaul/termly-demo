import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { Spinner } from "../components/Spinner";
import { KEYS, read, write, type PayrollRow } from "../lib/storage";
import { fetchNigerianBanks, lookupBankAccount, transferToBank, friendlyError } from "../services/nomba";
import { fmtNaira } from "../lib/format";
import { burstConfetti } from "../lib/confetti";

export const Route = createFileRoute("/admin/payroll")({ component: Page });

function Page() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [target, setTarget] = useState<PayrollRow | null>(null);
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [acct, setAcct] = useState("");
  const [acctName, setAcctName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<{ txId: string; amount: number; bank: string; acct: string } | null>(null);

  useEffect(() => {
    setRows(read<PayrollRow[]>(KEYS.payroll, []));
  }, []);

  function openDisburse(r: PayrollRow) {
    setTarget(r);
    setBankCode(r.bankCode ?? "");
    setAcct(r.accountNumber ?? "");
    setAcctName(r.accountName ?? "");
    if (banks.length === 0) {
      fetchNigerianBanks().then(setBanks).catch((e) => toast.error(friendlyError(e)));
    }
  }

  async function verify() {
    if (!bankCode || acct.length < 10) return toast.error("Pick bank and enter 10-digit account.");
    setVerifying(true);
    try {
      const r = await lookupBankAccount(bankCode, acct);
      setAcctName(r.accountName);
      toast.success("Verified ✓");
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setVerifying(false); }
  }

  async function send() {
    if (!target || !acctName) return;
    setSending(true);
    try {
      const r = await transferToBank(bankCode, acct, acctName, target.amount, `Salary - ${target.month}`);
      const next = rows.map((x) => x.id === target.id ? { ...x, status: "Paid" as const, bankCode, accountNumber: acct, accountName: acctName, transactionId: r.transactionId, paidDate: new Date().toISOString() } : x);
      setRows(next); write(KEYS.payroll, next);
      const bank = banks.find((b) => b.code === bankCode);
      setSuccess({ txId: r.transactionId, amount: target.amount, bank: bank?.name ?? "", acct });
      burstConfetti();
      setTarget(null);
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setSending(false); }
  }

  function exportCsv() {
    const csv = ["Teacher,Subject,Month,Amount,Status,TransactionId"].concat(
      rows.map((r) => [r.teacher, r.subject, r.month, r.amount, r.status, r.transactionId ?? ""].join(",")),
    ).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "termly-payroll.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const paid = rows.filter((r) => r.status === "Paid");
  const pending = rows.filter((r) => r.status === "Pending");

  return (
    <>
      <PageHeader title="Payroll" subtitle="Disburse teacher salaries via Nomba." actions={
        <button onClick={exportCsv} className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary">⤓ Export CSV</button>
      } />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Payroll" value={fmtNaira(total)} />
        <StatCard label="Paid" value={fmtNaira(paid.reduce((s, r) => s + r.amount, 0))} tone="success" sub={`${paid.length} records`} />
        <StatCard label="Pending" value={fmtNaira(pending.reduce((s, r) => s + r.amount, 0))} tone="warning" sub={`${pending.length} records`} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Teacher</th><th className="px-5 py-3 font-medium">Subject</th>
              <th className="px-5 py-3 font-medium">Month</th><th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-medium">{r.teacher}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.subject}</td>
                <td className="px-5 py-3">{r.month}</td>
                <td className="px-5 py-3 font-semibold">{fmtNaira(r.amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-right">
                  {r.status === "Pending" ? (
                    <button onClick={() => openDisburse(r)} className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Disburse via Nomba</button>
                  ) : (<span className="text-xs text-success">✓ Paid</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {target && (
        <Modal onClose={() => !sending && setTarget(null)}>
          <h2 className="text-lg font-semibold">Disburse Salary</h2>
          <p className="text-sm text-muted-foreground">{target.teacher} · {fmtNaira(target.amount)}</p>
          <label className="mt-3 block text-sm">Bank</label>
          <select value={bankCode} onChange={(e) => { setBankCode(e.target.value); setAcctName(""); }} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">{banks.length === 0 ? "Loading banks…" : "Select bank"}</option>
            {banks.map((b) => (<option key={b.code} value={b.code}>{b.name}</option>))}
          </select>
          <label className="mt-3 block text-sm">Account Number</label>
          <div className="mt-1 flex gap-2">
            <input value={acct} onChange={(e) => { setAcct(e.target.value.replace(/\D/g, "").slice(0, 10)); setAcctName(""); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <button onClick={verify} disabled={verifying} className="shrink-0 rounded-md bg-secondary px-3 text-sm">{verifying ? <Spinner size={14} /> : "Verify"}</button>
          </div>
          {acctName && <div className="mt-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success">✓ {acctName}</div>}
          <button onClick={send} disabled={!acctName || sending} className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {sending ? <span className="inline-flex items-center gap-2"><Spinner size={14} /> Sending {fmtNaira(target.amount)}…</span> : `Send ${fmtNaira(target.amount)} to ${acctName || "teacher"}`}
          </button>
        </Modal>
      )}

      {success && (
        <Modal onClose={() => setSuccess(null)}>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-2xl text-white">✓</div>
            <h2 className="mt-2 text-lg font-bold text-success">Salary Sent Successfully!</h2>
            <div className="mt-3 space-y-1 text-sm">
              <div>Amount: <strong>{fmtNaira(success.amount)}</strong></div>
              <div>Transaction: <code className="text-xs">{success.txId}</code></div>
              <div>{success.bank} · {success.acct}</div>
            </div>
          </div>
        </Modal>
      )}
    </>
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