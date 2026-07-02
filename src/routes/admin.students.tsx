import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { KEYS, read, write, type Student, type User, type FeeRow } from "../lib/storage";
import { createVirtualAccount, friendlyError } from "../services/nomba";
import { fmtNaira, fmtDate } from "../lib/format";
import { burstConfetti } from "../lib/confetti";
import { getSavingsFor, deductStudentSavingsForFee } from "../lib/studentSavings";
import { downloadSavingsReceipt } from "../lib/receipt";

export const Route = createFileRoute("/admin/students")({ component: StudentsPage });

function StudentsPage() {
  const [rows, setRows] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Student | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", class: "", parentId: "" });

  useEffect(() => {
    setRows(read<Student[]>(KEYS.students, []));
    setUsers(read<User[]>(KEYS.users, []).filter((u) => u.role === "parent"));
  }, []);

  async function save() {
    if (!form.name || !form.class) return toast.error("Name and class are required.");
    const parent = users.find((u) => u.id === form.parentId);
    const id = `STU-${Date.now()}`;
    setCreating(true);
    try {
      let virtualAccount: Student["virtualAccount"];
      try {
        virtualAccount = await createVirtualAccount(form.name, id);
      } catch (e) {
        console.warn("Virtual account creation skipped:", e);
      }
      const newStudent: Student = {
        id,
        name: form.name,
        class: form.class,
        parentId: parent?.id,
        parentName: parent?.name ?? "—",
        parentEmail: parent?.email,
        virtualAccount,
      };
      const next = [...rows, newStudent];
      setRows(next);
      write(KEYS.students, next);
      toast.success("Student added");
      setOpen(false);
      setForm({ name: "", class: "", parentId: "" });
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setCreating(false);
    }
  }

  function remove(id: string) {
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    write(KEYS.students, next);
  }

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Manage students and dedicated payment accounts."
        actions={<button onClick={() => setOpen(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">+ Add Student</button>}
      />
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Class</th>
              <th className="px-5 py-3 font-medium">Parent</th>
              <th className="px-5 py-3 font-medium">Virtual Account</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-5 py-3">{s.class}</td>
                <td className="px-5 py-3">{s.parentName}</td>
                <td className="px-5 py-3 text-xs">
                  {s.virtualAccount ? (
                    <div><div>{s.virtualAccount.accountNumber}</div><div className="text-muted-foreground">{s.virtualAccount.bankName}</div></div>
                  ) : (
                    <span className="text-muted-foreground">— Not created —</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => setView(s)} className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-secondary">View</button>
                  <button onClick={() => remove(s.id)} className="ml-2 text-xs font-medium text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">👨‍🎓 No students yet. Add one above.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal onClose={() => !creating && setOpen(false)}>
          <h2 className="text-lg font-semibold">Add New Student</h2>
          <label className="mt-3 block text-sm font-medium">Full name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <label className="mt-3 block text-sm font-medium">Class</label>
          <input value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <label className="mt-3 block text-sm font-medium">Parent</label>
          <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">— Select parent —</option>
            {users.map((u) => (<option key={u.id} value={u.id}>{u.name} ({u.email})</option>))}
          </select>
          {creating && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={14} /> Creating dedicated payment account…</div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} disabled={creating} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
            <button onClick={save} disabled={creating} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{creating ? "Saving…" : "Save Student"}</button>
          </div>
        </Modal>
      )}

      {view && (
        <Modal onClose={() => setView(null)}>
          <h2 className="text-lg font-semibold">{view.name}</h2>
          <p className="text-sm text-muted-foreground">{view.class}</p>
          <div className="mt-3 space-y-1 text-sm">
            <div><span className="text-muted-foreground">Parent:</span> {view.parentName}</div>
            {view.parentEmail && <div><span className="text-muted-foreground">Parent email:</span> {view.parentEmail}</div>}
            {view.virtualAccount && (
              <div className="mt-3 rounded-md bg-info-soft p-3">
                <div className="text-xs font-semibold uppercase text-info">Virtual Account</div>
                <div className="mt-1">Account Number: <strong>{view.virtualAccount.accountNumber}</strong></div>
                <div>Bank: {view.virtualAccount.bankName}</div>
              </div>
            )}
          </div>
          <StudentSavingsPanel student={view} />
        </Modal>
      )}
    </>
  );
}

function StudentSavingsPanel({ student }: { student: Student }) {
  const [sav, setSav] = useState(() => getSavingsFor(student.id));
  const [deductOpen, setDeductOpen] = useState(false);

  const refresh = useCallback(() => setSav(getSavingsFor(student.id)), [student.id]);

  useEffect(() => {
    refresh();
    window.addEventListener("termly:savings:updated", refresh);
    return () => window.removeEventListener("termly:savings:updated", refresh);
  }, [refresh]);

  const fees = read<FeeRow[]>(KEYS.fees, []);
  const primaryFee = fees.find((f) => f.studentId === student.id && f.amount > f.paid) ?? fees.find((f) => f.studentId === student.id);
  const feeAmount = primaryFee ? primaryFee.amount - primaryFee.paid : sav.goal;
  const pct = sav.goal > 0 ? Math.min(100, Math.round((sav.savingsBalance / sav.goal) * 100)) : 0;

  return (
    <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Savings</div>
        <div className="text-xs text-muted-foreground">{pct}% of goal</div>
      </div>
      <div className="mt-1 text-lg font-bold">
        {fmtNaira(sav.savingsBalance)} <span className="text-xs font-normal text-muted-foreground">/ {fmtNaira(sav.goal)}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-yellow-400" : pct >= 75 ? "bg-success" : pct >= 25 ? "bg-warning" : "bg-red-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {feeAmount > 0 && (
        <button
          onClick={() => setDeductOpen(true)}
          disabled={sav.savingsBalance <= 0}
          className="mt-3 w-full rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          Deduct for Fees
        </button>
      )}
      {deductOpen && (
        <DeductModal
          student={student}
          feeRow={primaryFee}
          feeAmount={feeAmount}
          savingsBalance={sav.savingsBalance}
          onClose={() => setDeductOpen(false)}
          onDone={refresh}
        />
      )}
    </div>
  );
}

function DeductModal({
  student,
  feeRow,
  feeAmount,
  savingsBalance,
  onClose,
  onDone,
}: {
  student: Student;
  feeRow?: FeeRow;
  feeAmount: number;
  savingsBalance: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<"preview" | "processing" | "done">("preview");
  const [result, setResult] = useState<{ reference: string; deducted: number; outstanding: number } | null>(null);
  const coverPct = feeAmount > 0 ? Math.min(100, Math.round((savingsBalance / feeAmount) * 100)) : 0;
  const remainingAfter = Math.max(0, feeAmount - savingsBalance);

  async function confirmDeduct() {
    setStage("processing");
    await new Promise((r) => setTimeout(r, 1600));
    const term = feeRow?.term ?? "First Term 2026/2027";
    const r = deductStudentSavingsForFee(student.id, feeAmount, `${term} fee payment`);
    if (feeRow) {
      const fees = read<FeeRow[]>(KEYS.fees, []);
      const next = fees.map((f) =>
        f.id === feeRow.id
          ? {
              ...f,
              paid: f.paid + r.deducted,
              status: (r.outstanding <= 0 ? "Paid" : "Partial") as FeeRow["status"],
            }
          : f,
      );
      write(KEYS.fees, next);
    }
    setResult(r);
    setStage("done");
    if (r.outstanding <= 0) setTimeout(() => burstConfetti(), 100);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/70 p-4" onClick={stage !== "processing" ? onClose : undefined}>
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-primary px-5 py-4 text-primary-foreground">
          <div className="text-sm font-bold tracking-wide">📚 DEDUCT FEE FROM SAVINGS</div>
        </div>

        {stage === "preview" && (
          <div className="px-5 py-4 text-sm">
            <div className="space-y-1">
              <div><span className="text-muted-foreground">Student:</span> {student.name}</div>
              <div><span className="text-muted-foreground">Fee Amount:</span> {fmtNaira(feeAmount)}</div>
              <div><span className="text-muted-foreground">Savings Balance:</span> {fmtNaira(savingsBalance)}</div>
            </div>
            <div className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-foreground">
              ⚠ Savings covers {coverPct}% of fee
              <div className="mt-1">Remaining after deduction: {fmtNaira(Math.max(0, savingsBalance - feeAmount))}</div>
              <div>Outstanding balance: {fmtNaira(remainingAfter)}</div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium hover:bg-secondary">
                Cancel
              </button>
              <button
                onClick={confirmDeduct}
                className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Deduct {fmtNaira(Math.min(feeAmount, savingsBalance))}
              </button>
            </div>
          </div>
        )}

        {stage === "processing" && (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-14">
            <Spinner size={40} />
            <div className="text-sm font-semibold">Processing deduction...</div>
          </div>
        )}

        {stage === "done" && result && (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success text-2xl text-white">
              ✓
            </div>
            <div className="text-lg font-bold text-success">{fmtNaira(result.deducted)} deducted from savings!</div>
            {result.outstanding > 0 ? (
              <p className="mt-1 text-sm text-warning-foreground">
                Fee status: Partial · Outstanding: {fmtNaira(result.outstanding)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-success">✓ Fee fully paid from savings!</p>
            )}
            <div className="mt-3 break-all rounded-md bg-secondary px-3 py-2 font-mono text-xs text-muted-foreground">
              {result.reference}
            </div>
            <button
              onClick={() =>
                downloadSavingsReceipt({
                  reference: result.reference,
                  date: new Date(),
                  studentName: student.name,
                  admissionNumber: student.id,
                  studentClass: student.class,
                  feeType: feeRow?.term ?? "First Term 2026/2027",
                  totalFee: feeAmount,
                  paidFromSavings: result.deducted,
                  outstanding: result.outstanding,
                  status: result.outstanding <= 0 ? "PAID" : "PARTIAL",
                })
              }
              className="mt-4 w-full rounded-md border border-border py-2.5 text-sm font-semibold hover:bg-secondary"
            >
              Download Receipt
            </button>
            <button onClick={onClose} className="mt-2 w-full rounded-md bg-success py-2.5 text-sm font-semibold text-white hover:opacity-90">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="float-right text-muted-foreground hover:text-foreground" aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  );
}