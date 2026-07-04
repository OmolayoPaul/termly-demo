import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { Spinner } from "../components/Spinner";
import { KEYS, read, write, type PayrollRow } from "../lib/storage";
import { fmtNaira } from "../lib/format";
import { burstConfetti } from "../lib/confetti";
import { demoDisburseSalary } from "../lib/demoWallet";

const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function currentMonthLabel() {
  const now = new Date();
  return `${MONTH_OPTIONS[now.getMonth()]} ${now.getFullYear()}`;
}

export const Route = createFileRoute("/admin/payroll")({ component: Page });

const DEMO_BANKS = [
  { name: "GTBank", code: "058" },
  { name: "Access Bank", code: "044" },
  { name: "Zenith Bank", code: "057" },
  { name: "First Bank", code: "011" },
  { name: "UBA", code: "033" },
];

const DEMO_ACCOUNT_NAMES = ["Mr. Adewale Okafor", "Mrs. Fatima Aliyu", "Mr. Emeka Chukwu"];

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
  const [addOpen, setAddOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ teacher: "", email: "", subject: "", month: currentMonthLabel(), amount: "" });

  useEffect(() => {
    setRows(read<PayrollRow[]>(KEYS.payroll, []));
  }, []);

  function addTeacher() {
    if (!newTeacher.teacher || !newTeacher.subject || !newTeacher.amount) {
      return toast.error("Name, subject and amount are required.");
    }
    const amount = Number(newTeacher.amount);
    if (!amount || amount <= 0) return toast.error("Enter a valid salary amount.");
    const row: PayrollRow = {
      id: `PR-${Date.now()}`,
      teacher: newTeacher.teacher,
      email: newTeacher.email || undefined,
      subject: newTeacher.subject,
      month: newTeacher.month || currentMonthLabel(),
      amount,
      status: "Pending",
    };
    const next = [...rows, row];
    setRows(next);
    write(KEYS.payroll, next);
    toast.success("Teacher added to payroll");
    setAddOpen(false);
    setNewTeacher({ teacher: "", email: "", subject: "", month: currentMonthLabel(), amount: "" });
  }

  function removeTeacher(id: string) {
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    write(KEYS.payroll, next);
    toast.success("Removed from payroll");
  }

  function openDisburse(r: PayrollRow) {
    setTarget(r);
    setBankCode(r.bankCode ?? "");
    setAcct(r.accountNumber ?? "");
    setAcctName(r.accountName ?? "");
    if (banks.length === 0) setBanks(DEMO_BANKS);
  }

  async function verify() {
    if (!bankCode || acct.length < 10) return toast.error("Pick bank and enter 10-digit account.");
    setVerifying(true);
    await new Promise((res) => setTimeout(res, 700));
    const name = target?.teacher ?? DEMO_ACCOUNT_NAMES[Math.floor(Math.random() * DEMO_ACCOUNT_NAMES.length)];
    setAcctName(name);
    toast.success("Verified ✓");
    setVerifying(false);
  }

  async function send() {
    if (!target || !acctName) return;
    setSending(true);
    await new Promise((res) => setTimeout(res, 900));
    const reference = demoDisburseSalary(target.amount, target.teacher);
    const next = rows.map((x) => x.id === target.id ? { ...x, status: "Paid" as const, bankCode, accountNumber: acct, accountName: acctName, transactionId: reference, paidDate: new Date().toISOString() } : x);
    setRows(next); write(KEYS.payroll, next);
    const bank = banks.find((b) => b.code === bankCode);
    setSuccess({ txId: reference, amount: target.amount, bank: bank?.name ?? "", acct });
    burstConfetti();
    setTarget(null);
    setSending(false);
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
        <div className="flex gap-2">
          <button onClick={() => setAddOpen(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">+ Add Teacher</button>
          <button onClick={exportCsv} className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary">⤓ Export CSV</button>
        </div>
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
                    <>
                      <button onClick={() => openDisburse(r)} className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Disburse via Nomba</button>
                      <button onClick={() => removeTeacher(r.id)} className="ml-2 text-xs font-medium text-destructive hover:underline">Remove</button>
                    </>
                  ) : (<span className="text-xs text-success">✓ Paid</span>)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">🧑‍🏫 No teachers on payroll yet. Add one above.</td></tr>}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <Modal onClose={() => setAddOpen(false)}>
          <h2 className="text-lg font-semibold">Add Teacher to Payroll</h2>
          <label className="mt-3 block text-sm font-medium">Full name</label>
          <input value={newTeacher.teacher} onChange={(e) => setNewTeacher({ ...newTeacher, teacher: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Mrs. Amaka Nwosu" />
          <label className="mt-3 block text-sm font-medium">Email (optional)</label>
          <input value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="teacher@school.com" />
          <label className="mt-3 block text-sm font-medium">Subject</label>
          <input value={newTeacher.subject} onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Mathematics" />
          <label className="mt-3 block text-sm font-medium">Month</label>
          <select value={newTeacher.month} onChange={(e) => setNewTeacher({ ...newTeacher, month: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {MONTH_OPTIONS.map((m) => {
              const label = `${m} ${new Date().getFullYear()}`;
              return <option key={label} value={label}>{label}</option>;
            })}
          </select>
          <label className="mt-3 block text-sm font-medium">Monthly Salary (₦)</label>
          <input value={newTeacher.amount} onChange={(e) => setNewTeacher({ ...newTeacher, amount: e.target.value.replace(/[^\d]/g, "") })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. 150000" inputMode="numeric" />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setAddOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
            <button onClick={addTeacher} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Add Teacher</button>
          </div>
        </Modal>
      )}

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