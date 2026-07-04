import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import {
  KEYS, read, write, logPortalAudit,
  type Student, type User, type FeeRow, type PortalAuditEvent,
  getTemplateForClass, generateFeesForStudent, getFeeTemplates,
  demoVirtualAccountFor,
} from "../lib/storage";
import { createVirtualAccount, friendlyError } from "../services/nomba";
import { fmtNaira, fmtDate } from "../lib/format";
import { burstConfetti } from "../lib/confetti";
import { getSavingsFor, deductStudentSavingsForFee, topUpStudentSavings } from "../lib/studentSavings";
import { downloadSavingsReceipt } from "../lib/receipt";
import { getSession } from "../lib/auth";

const CLASS_OPTIONS = [
  "JSS 1A","JSS 1B","JSS 1C",
  "JSS 2A","JSS 2B","JSS 2C",
  "JSS 3A","JSS 3B","JSS 3C",
  "SS 1A","SS 1B","SS 1C",
  "SS 2A","SS 2B","SS 2C",
  "SS 3A","SS 3B","SS 3C",
];

const TERM_LABEL = "First Term 2026/2027";
const DUE_DATE = "31 Jan 2027";

function genPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function suggestEmail(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).join(".");
  return `${slug}@termly.com`;
}

export const Route = createFileRoute("/admin/students")({ component: StudentsPage });

type BulkProgress = {
  open: boolean;
  students: Student[];
  current: number;
  results: { id: string; name: string; success: boolean; account?: string }[];
  done: boolean;
};

function StudentsPage() {
  const [rows, setRows] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Student | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", class: "", parentId: "" });
  const [auditRefresh, setAuditRefresh] = useState(0);
  const [confirmation, setConfirmation] = useState<{ student: Student; feeRows: FeeRow[] } | null>(null);
  const [creatingAccountFor, setCreatingAccountFor] = useState<Record<string, boolean>>({});
  const [bulk, setBulk] = useState<BulkProgress>({ open: false, students: [], current: 0, results: [], done: false });

  const refreshRows = useCallback(() => {
    setRows(read<Student[]>(KEYS.students, []));
  }, []);

  const refreshUsers = useCallback(() => {
    const u = read<User[]>(KEYS.users, []);
    setAllUsers(u);
    setUsers(u.filter((x) => x.role === "parent"));
    setAuditRefresh((n) => n + 1);
  }, []);

  useEffect(() => {
    refreshRows();
    refreshUsers();
  }, [refreshRows, refreshUsers]);

  async function createAccountForStudent(student: Student) {
    setCreatingAccountFor((prev) => ({ ...prev, [student.id]: true }));
    try {
      let va: Student["virtualAccount"];
      try {
        va = await createVirtualAccount(student.name, student.id);
      } catch {
        va = demoVirtualAccountFor(student);
      }
      const all = read<Student[]>(KEYS.students, []);
      const next = all.map((s) => s.id === student.id ? { ...s, virtualAccount: va } : s);
      write(KEYS.students, next);
      setRows(next);
      toast.success(`✓ Virtual account created for ${student.name}!`);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setCreatingAccountFor((prev) => ({ ...prev, [student.id]: false }));
    }
  }

  async function createAllMissing() {
    const missing = rows.filter((s) => !s.virtualAccount?.accountNumber);
    if (missing.length === 0) { toast.info("All students already have virtual accounts."); return; }
    setBulk({ open: true, students: missing, current: 0, results: [], done: false });
    const results: BulkProgress["results"] = [];
    for (let i = 0; i < missing.length; i++) {
      const student = missing[i];
      setBulk((prev) => ({ ...prev, current: i }));
      try {
        let va: Student["virtualAccount"];
        try {
          va = await createVirtualAccount(student.name, student.id);
        } catch {
          va = demoVirtualAccountFor(student);
        }
        const all = read<Student[]>(KEYS.students, []);
        const next = all.map((s) => s.id === student.id ? { ...s, virtualAccount: va } : s);
        write(KEYS.students, next);
        results.push({ id: student.id, name: student.name, success: true, account: va?.accountNumber });
      } catch {
        results.push({ id: student.id, name: student.name, success: false });
      }
      if (i < missing.length - 1) await new Promise((r) => setTimeout(r, 1000));
    }
    setRows(read<Student[]>(KEYS.students, []));
    setBulk((prev) => ({ ...prev, results, done: true, current: missing.length - 1 }));
    burstConfetti();
  }

  async function save() {
    if (!form.name || !form.class) return toast.error("Name and class are required.");
    const parent = users.find((u) => u.id === form.parentId);
    const id = `STU-${Date.now()}`;
    setCreating(true);
    try {
      let virtualAccount: Student["virtualAccount"];
      try {
        virtualAccount = await createVirtualAccount(form.name, id);
      } catch {
        virtualAccount = demoVirtualAccountFor({ id, name: form.name } as Student);
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

      const newFeeRows = generateFeesForStudent(newStudent, TERM_LABEL, DUE_DATE);
      if (newFeeRows.length > 0) {
        const existingFees = read<FeeRow[]>(KEYS.fees, []);
        write(KEYS.fees, [...existingFees, ...newFeeRows]);
      }

      setOpen(false);
      setForm({ name: "", class: "", parentId: "" });
      setConfirmation({ student: newStudent, feeRows: newFeeRows });
      burstConfetti();
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

  const missingCount = rows.filter((s) => !s.virtualAccount?.accountNumber).length;
  const selectedTemplate = form.class ? getTemplateForClass(form.class) : undefined;

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Manage students and dedicated payment accounts."
        actions={
          <div className="flex gap-2">
            {missingCount > 0 && (
              <button
                onClick={createAllMissing}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary"
              >
                Create Missing Accounts ({missingCount})
              </button>
            )}
            <button
              onClick={() => setOpen(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              + Add Student
            </button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Class</th>
              <th className="px-5 py-3 font-medium">Term Total</th>
              <th className="px-5 py-3 font-medium">Parent</th>
              <th className="px-5 py-3 font-medium">Virtual Account</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => {
              const tmpl = getTemplateForClass(s.class);
              const isCreating = !!creatingAccountFor[s.id];
              return (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-medium">{s.name}</td>
                  <td className="px-5 py-3">{s.class}</td>
                  <td className="px-5 py-3 font-semibold text-primary">
                    {tmpl ? fmtNaira(tmpl.total) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3">{s.parentName}</td>
                  <td className="px-5 py-3">
                    {s.virtualAccount?.accountNumber ? (
                      <div className="text-xs text-success">
                        <div className="font-mono font-semibold">{s.virtualAccount.accountNumber}</div>
                        <div className="text-muted-foreground">{s.virtualAccount.bankName}</div>
                      </div>
                    ) : isCreating ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Spinner size={12} />
                        Creating Nomba virtual account…
                      </div>
                    ) : (
                      <button
                        onClick={() => createAccountForStudent(s)}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      >
                        Create Account
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setView(s)} className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-secondary">View</button>
                    <button onClick={() => remove(s.id)} className="ml-2 text-xs font-medium text-destructive hover:underline">Delete</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">👨‍🎓 No students yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk creation progress modal */}
      {bulk.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-card shadow-2xl">
            <div className="rounded-t-xl bg-primary px-5 py-4 text-primary-foreground">
              <div className="font-bold">Creating Virtual Accounts…</div>
              <div className="text-xs text-primary-foreground/70">Please wait while we set up Nomba accounts</div>
            </div>
            <div className="px-5 py-4">
              {!bulk.done ? (
                <div className="space-y-2">
                  {bulk.students.map((s, i) => {
                    const result = bulk.results.find((r) => r.id === s.id);
                    const isCurrent = i === bulk.current && !result;
                    return (
                      <div key={s.id} className="flex items-center gap-3 text-sm">
                        <div className="w-5 shrink-0 text-center">
                          {result ? (
                            <span className={result.success ? "text-success" : "text-destructive"}>
                              {result.success ? "✓" : "✗"}
                            </span>
                          ) : isCurrent ? (
                            <Spinner size={14} />
                          ) : (
                            <span className="text-muted-foreground">·</span>
                          )}
                        </div>
                        <span className={isCurrent ? "font-semibold" : "text-muted-foreground"}>
                          Processing {i + 1} of {bulk.students.length}: {s.name}
                        </span>
                        {result?.account && (
                          <span className="ml-auto font-mono text-xs text-success">{result.account}</span>
                        )}
                      </div>
                    );
                  })}
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round((bulk.results.length / bulk.students.length) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success text-2xl text-white">✓</div>
                  <div className="text-lg font-bold text-success">
                    {bulk.results.filter((r) => r.success).length} virtual accounts created successfully!
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">All students now have dedicated payment accounts.</p>
                  <div className="mt-4 max-h-40 space-y-1 overflow-y-auto text-xs text-left">
                    {bulk.results.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded bg-secondary/30 px-2 py-1">
                        <span className={r.success ? "text-success" : "text-destructive"}>
                          {r.success ? "✓" : "✗"} {r.name}
                        </span>
                        {r.account && <span className="font-mono text-muted-foreground">{r.account}</span>}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setBulk({ open: false, students: [], current: 0, results: [], done: false })}
                    className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add student modal */}
      {open && (
        <Modal onClose={() => !creating && setOpen(false)}>
          <h2 className="text-lg font-semibold">Add New Student</h2>
          <label className="mt-3 block text-sm font-medium">Full name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="e.g. Chukwuemeka Obi"
          />
          <label className="mt-3 block text-sm font-medium">Class</label>
          <select
            value={form.class}
            onChange={(e) => setForm({ ...form, class: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Select class —</option>
            {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {selectedTemplate && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-primary">Fee Preview — {selectedTemplate.className}</span>
                <span className="text-sm font-bold text-primary">{fmtNaira(selectedTemplate.total)} / term</span>
              </div>
              <ul className="mt-2 space-y-1">
                {selectedTemplate.items.map((item) => (
                  <li key={item.name} className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.name}</span>
                    <span className="font-medium">{fmtNaira(item.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <label className="mt-3 block text-sm font-medium">Parent</label>
          <select
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Select parent —</option>
            {users.map((u) => (<option key={u.id} value={u.id}>{u.name} ({u.email})</option>))}
          </select>
          {creating && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size={14} /> Creating dedicated payment account…
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} disabled={creating} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
            <button onClick={save} disabled={creating} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {creating ? "Saving…" : "Save Student"}
            </button>
          </div>
        </Modal>
      )}

      {confirmation && (
        <ConfirmationModal
          student={confirmation.student}
          feeRows={confirmation.feeRows}
          onClose={() => setConfirmation(null)}
        />
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
                <div className="text-xs text-muted-foreground">Ref: {view.virtualAccount.accountReference}</div>
              </div>
            )}
          </div>
          <FeeBreakdownPanel student={view} />
          <StudentSavingsPanel student={view} />
          <StudentPortalAccessPanel student={view} allUsers={allUsers} onChanged={refreshUsers} />
          <StudentPortalAuditPanel studentId={view.id} refreshKey={auditRefresh} />
        </Modal>
      )}
    </>
  );
}

function ConfirmationModal({ student, feeRows, onClose }: { student: Student; feeRows: FeeRow[]; onClose: () => void }) {
  const total = feeRows.reduce((s, f) => s + f.amount, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-t-xl bg-success px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg">✓</div>
            <div>
              <div className="font-bold">Student Registered!</div>
              <div className="text-xs text-white/80">Fees auto-generated from class template</div>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-base font-semibold">{student.name}</div>
              <div className="text-sm text-muted-foreground">{student.class}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total Fees This Term</div>
              <div className="text-xl font-bold text-primary">{fmtNaira(total)}</div>
            </div>
          </div>

          {feeRows.length > 0 ? (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Fee Breakdown</div>
              <div className="rounded-lg border border-border overflow-hidden">
                {feeRows.map((f, i) => (
                  <div key={f.id} className={`flex justify-between px-3 py-2 text-sm ${i % 2 === 0 ? "bg-secondary/30" : ""}`}>
                    <span>{f.term}</span>
                    <span className="font-semibold">{fmtNaira(f.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border bg-primary/5 px-3 py-2 text-sm font-bold">
                  <span>Total</span>
                  <span className="text-primary">{fmtNaira(total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-foreground">
              No fee template found for "{student.class}". Add fees manually from the Fees page.
            </div>
          )}

          {student.virtualAccount && (
            <div className="mt-3 rounded-md border border-info/30 bg-info-soft px-3 py-2 text-xs">
              <div className="font-semibold text-info">✓ Nomba Virtual Account Created</div>
              <div className="mt-0.5 font-mono font-bold">{student.virtualAccount.accountNumber}</div>
              <div className="text-muted-foreground">{student.virtualAccount.bankName}</div>
            </div>
          )}

          <button onClick={onClose} className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function FeeBreakdownPanel({ student }: { student: Student }) {
  const allFees = read<FeeRow[]>(KEYS.fees, []);
  const studentFees = allFees.filter((f) => f.studentId === student.id || f.studentName === student.name);
  if (studentFees.length === 0) return null;
  const total = studentFees.reduce((s, f) => s + f.amount, 0);
  const paid = studentFees.reduce((s, f) => s + f.paid, 0);
  const balance = total - paid;
  return (
    <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Fee Breakdown This Term</div>
        <div className="text-xs font-bold text-primary">{fmtNaira(total)} total</div>
      </div>
      <div className="mt-2 space-y-1">
        {studentFees.map((f) => (
          <div key={f.id} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{f.term}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{fmtNaira(f.amount)}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${f.status === "Paid" ? "bg-success/20 text-success" : "bg-warning/20 text-warning-foreground"}`}>{f.status}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-2 flex justify-between text-xs font-semibold">
        <span>Outstanding</span>
        <span className={balance > 0 ? "text-warning-foreground" : "text-success"}>{fmtNaira(balance)}</span>
      </div>
    </div>
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
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            topUpStudentSavings(student.id, 5000, sav.goal || feeAmount || undefined);
            refresh();
            toast.success("₦5,000 added to savings (demo top-up)");
          }}
          className="flex-1 rounded-md border border-border py-2 text-xs font-semibold hover:bg-secondary"
        >
          + Add ₦5,000 (Demo)
        </button>
        {feeAmount > 0 && (
          <button
            onClick={() => setDeductOpen(true)}
            disabled={sav.savingsBalance <= 0}
            className="flex-1 rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            Deduct for Fees
          </button>
        )}
      </div>
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
  student, feeRow, feeAmount, savingsBalance, onClose, onDone,
}: {
  student: Student; feeRow?: FeeRow; feeAmount: number;
  savingsBalance: number; onClose: () => void; onDone: () => void;
}) {
  const [stage, setStage] = useState<"preview" | "processing" | "done">("preview");
  const [result, setResult] = useState<{ reference: string; deducted: number; outstanding: number } | null>(null);
  const coverPct = feeAmount > 0 ? Math.min(100, Math.round((savingsBalance / feeAmount) * 100)) : 0;

  async function confirmDeduct() {
    setStage("processing");
    await new Promise((r) => setTimeout(r, 1600));
    const term = feeRow?.term ?? "First Term 2026/2027";
    const r = deductStudentSavingsForFee(student.id, feeAmount, `${term} fee payment`);
    if (feeRow) {
      const fees = read<FeeRow[]>(KEYS.fees, []);
      const next = fees.map((f) =>
        f.id === feeRow.id ? { ...f, paid: f.paid + r.deducted, status: (r.outstanding <= 0 ? "Paid" : "Partial") as FeeRow["status"] } : f,
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
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={confirmDeduct} className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Deduct {fmtNaira(Math.min(feeAmount, savingsBalance))}
              </button>
            </div>
          </div>
        )}
        {stage === "processing" && (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-14">
            <Spinner size={40} /><div className="text-sm font-semibold">Processing deduction...</div>
          </div>
        )}
        {stage === "done" && result && (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success text-2xl text-white">✓</div>
            <div className="text-lg font-bold text-success">{fmtNaira(result.deducted)} deducted!</div>
            {result.outstanding > 0 ? (
              <p className="mt-1 text-sm text-warning-foreground">Outstanding: {fmtNaira(result.outstanding)}</p>
            ) : (
              <p className="mt-1 text-sm text-success">✓ Fee fully paid from savings!</p>
            )}
            <button
              onClick={() => downloadSavingsReceipt({
                reference: result.reference, date: new Date(), studentName: student.name,
                admissionNumber: student.id, studentClass: student.class,
                feeType: feeRow?.term ?? "First Term 2026/2027",
                totalFee: feeAmount, paidFromSavings: result.deducted,
                outstanding: result.outstanding, status: result.outstanding <= 0 ? "PAID" : "PARTIAL",
              })}
              className="mt-4 w-full rounded-md border border-border py-2.5 text-sm font-semibold hover:bg-secondary"
            >
              Download Receipt
            </button>
            <button onClick={onClose} className="mt-2 w-full rounded-md bg-success py-2.5 text-sm font-semibold text-white hover:opacity-90">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentPortalAccessPanel({ student, allUsers, onChanged }: { student: Student; allUsers: User[]; onChanged: () => void }) {
  const account = allUsers.find((u) => u.role === "student" && u.studentId === student.id);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [email, setEmail] = useState(suggestEmail(student.name));
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);

  function createAccount() {
    if (!email || !email.includes("@")) return toast.error("Enter a valid email address.");
    const users = read<User[]>(KEYS.users, []);
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return toast.error("An account with this email already exists.");
    const password = genPassword();
    const newUser: User = { id: `USR-${Date.now()}`, name: student.name, email, role: "student", password, createdAt: new Date().toISOString(), studentId: student.id };
    write(KEYS.users, [...users, newUser]);
    logPortalAudit({ studentId: student.id, studentName: student.name, action: "created", actorName: getSession()?.name ?? "Admin", email });
    setRevealedPassword(password);
    setCreatingOpen(false);
    onChanged();
    toast.success("Student portal account created");
  }

  function resetPassword() {
    if (!account) return;
    const password = genPassword();
    const users = read<User[]>(KEYS.users, []);
    write(KEYS.users, users.map((u) => (u.id === account.id ? { ...u, password } : u)));
    logPortalAudit({ studentId: student.id, studentName: student.name, action: "password_reset", actorName: getSession()?.name ?? "Admin", email: account.email });
    setRevealedPassword(password);
    onChanged();
    toast.success("Password reset");
  }

  function revokeAccess() {
    if (!account) return;
    const users = read<User[]>(KEYS.users, []);
    write(KEYS.users, users.filter((u) => u.id !== account.id));
    logPortalAudit({ studentId: student.id, studentName: student.name, action: "revoked", actorName: getSession()?.name ?? "Admin", email: account.email });
    setRevealedPassword(null);
    onChanged();
    toast.success("Portal access revoked");
  }

  return (
    <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">Student Portal Access</div>
      {account ? (
        <div className="mt-2 text-sm">
          <div><span className="text-muted-foreground">Login email:</span> {account.email}</div>
          {revealedPassword && (
            <div className="mt-2 rounded-md bg-success-soft px-3 py-2 text-xs text-success">
              New password: <span className="font-mono font-semibold">{revealedPassword}</span>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button onClick={resetPassword} className="flex-1 rounded-md border border-border py-2 text-xs font-semibold hover:bg-secondary">Reset Password</button>
            <button onClick={revokeAccess} className="flex-1 rounded-md border border-destructive/40 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10">Revoke Access</button>
          </div>
        </div>
      ) : creatingOpen ? (
        <div className="mt-2">
          <label className="block text-xs font-medium">Login email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <div className="mt-3 flex gap-2">
            <button onClick={() => setCreatingOpen(false)} className="flex-1 rounded-md border border-border py-2 text-xs font-medium hover:bg-secondary">Cancel</button>
            <button onClick={createAccount} className="flex-1 rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">Create Account</button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">No portal login exists for this student yet.</p>
          <button onClick={() => setCreatingOpen(true)} className="mt-2 w-full rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">Create Student Login</button>
        </div>
      )}
    </div>
  );
}

const AUDIT_LABEL: Record<PortalAuditEvent["action"], string> = { created: "Login created", password_reset: "Password reset", revoked: "Access revoked" };
const AUDIT_COLOR: Record<PortalAuditEvent["action"], string> = { created: "text-success", password_reset: "text-warning", revoked: "text-destructive" };

function StudentPortalAuditPanel({ studentId, refreshKey }: { studentId: string; refreshKey: number }) {
  const [events, setEvents] = useState<PortalAuditEvent[]>([]);
  useEffect(() => {
    const all = read<PortalAuditEvent[]>(KEYS.portalAuditLog, []);
    setEvents(all.filter((e) => e.studentId === studentId));
  }, [studentId, refreshKey]);
  if (events.length === 0) return null;
  return (
    <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">Portal Access History</div>
      <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto text-xs">
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2">
            <span className={`font-medium ${AUDIT_COLOR[e.action]}`}>{AUDIT_LABEL[e.action]}</span>
            <span className="truncate text-muted-foreground">{e.email ?? ""}</span>
            <span className="shrink-0 text-muted-foreground">{fmtDate(e.timestamp)} · {e.actorName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="float-right text-muted-foreground hover:text-foreground" aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  );
}
