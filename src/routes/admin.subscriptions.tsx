import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, write, type Student, type Mandate } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { friendlyError } from "../services/nomba";
import { demoCreateMandate } from "../lib/demoWallet";

export const Route = createFileRoute("/admin/subscriptions")({ component: Page });

export type Subscription = {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  planName: string;
  amount: number;
  frequency: "Monthly" | "Termly";
  startDate: string;
  cycles: number;
  cyclesDone: number;
  nextDebitDate: string;
  status: "Active" | "Paused" | "Failed" | "Completed" | "Cancelled";
  mandateId: string;
  createdAt: string;
};

function loadSubs(): Subscription[] {
  return read<Subscription[]>(KEYS.subscriptions, []);
}
function saveSubs(subs: Subscription[]) {
  write(KEYS.subscriptions, subs);
}

function addMonths(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function Page() {
  const students = read<Student[]>(KEYS.students, []);
  const [subs, setSubs] = useState<Subscription[]>(loadSubs);
  const [showModal, setShowModal] = useState(false);

  const refresh = useCallback(() => setSubs(loadSubs()), []);

  function updateSub(id: string, patch: Partial<Subscription>) {
    const next = subs.map((s) => (s.id === id ? { ...s, ...patch } : s));
    saveSubs(next);
    setSubs(next);
  }

  function handlePause(id: string) {
    updateSub(id, { status: "Paused" });
    toast.success("Subscription paused.");
  }

  function handleResume(id: string) {
    updateSub(id, { status: "Active" });
    toast.success("Subscription resumed.");
  }

  function handleCancel(id: string) {
    updateSub(id, { status: "Cancelled" });
    toast.success("Subscription cancelled.");
  }

  async function handleRetry(sub: Subscription) {
    toast.info(`Retrying debit of ${fmtNaira(sub.amount)}…`);
    await new Promise((r) => setTimeout(r, 1500));
    updateSub(sub.id, { status: "Active" });
    toast.success(`${fmtNaira(sub.amount)} successfully debited for ${sub.studentName}`);
  }

  const active = subs.filter((s) => s.status === "Active");
  const totalMRR = active.reduce((s, x) => s + x.amount, 0);
  const dueThisWeek = active.filter((s) => {
    const diff = (new Date(s.nextDebitDate).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;
  const failedCount = subs.filter((s) => s.status === "Failed").length;

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle="Managed recurring payment engine for school fees."
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            + Create Subscription Plan
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Subscriptions" value={active.length} tone="success" />
        <StatCard label="Total Monthly Recurring" value={fmtNaira(totalMRR)} tone="success" />
        <StatCard label="Due This Week" value={dueThisWeek} tone="warning" />
        <StatCard label="Failed Debits This Month" value={failedCount} tone="warning" />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Parent</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Frequency</th>
              <th className="px-5 py-3 font-medium">Next Debit</th>
              <th className="px-5 py-3 font-medium">Progress</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium">{s.studentName}</td>
                <td className="px-5 py-3 text-muted-foreground">{s.parentName}</td>
                <td className="px-5 py-3">{s.planName}</td>
                <td className="px-5 py-3 font-semibold">{fmtNaira(s.amount)}</td>
                <td className="px-5 py-3">{s.frequency}</td>
                <td className="px-5 py-3 text-muted-foreground">{fmtDate(s.nextDebitDate)}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {s.cyclesDone}/{s.cycles} cycles
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-1.5 flex-wrap">
                    {s.status === "Active" && (
                      <button
                        onClick={() => handlePause(s.id)}
                        className="rounded-md border border-warning/40 px-2 py-1 text-xs font-semibold text-warning-foreground hover:bg-warning/10"
                      >
                        Pause
                      </button>
                    )}
                    {s.status === "Paused" && (
                      <button
                        onClick={() => handleResume(s.id)}
                        className="rounded-md border border-success/40 px-2 py-1 text-xs font-semibold text-success hover:bg-success/10"
                      >
                        Resume
                      </button>
                    )}
                    {s.status === "Failed" && (
                      <button
                        onClick={() => handleRetry(s)}
                        className="rounded-md border border-info/40 px-2 py-1 text-xs font-semibold text-info-foreground hover:bg-info/10"
                      >
                        Retry
                      </button>
                    )}
                    {(s.status === "Active" || s.status === "Paused") && (
                      <button
                        onClick={() => handleCancel(s.id)}
                        className="rounded-md border border-destructive/40 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                  No subscription plans yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateSubscriptionModal
          students={students}
          onClose={() => setShowModal(false)}
          onCreate={(sub) => {
            const next = [sub, ...subs];
            saveSubs(next);
            setSubs(next);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

function CreateSubscriptionModal({
  students,
  onClose,
  onCreate,
}: {
  students: Student[];
  onClose: () => void;
  onCreate: (s: Subscription) => void;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [planName, setPlanName] = useState("Monthly Fee Plan");
  const [amount, setAmount] = useState(15000);
  const [frequency, setFrequency] = useState<"Monthly" | "Termly">("Monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [cycles, setCycles] = useState(3);
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ mandateId: string; next: string } | null>(null);

  const student = students.find((s) => s.id === studentId);

  async function activate() {
    if (!studentId || !planName || amount <= 0) return toast.error("Fill in all required fields.");
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const r = demoCreateMandate();
      const sub: Subscription = {
        id: `sub_${Date.now()}`,
        studentId,
        studentName: student?.name ?? studentId,
        parentName: student?.parentName ?? "",
        parentPhone,
        parentEmail,
        planName,
        amount,
        frequency,
        startDate,
        cycles,
        cyclesDone: 0,
        nextDebitDate: r.nextDebitDate,
        status: "Active",
        mandateId: r.mandateId,
        createdAt: new Date().toISOString(),
      };
      const mandate: Mandate = {
        id: `m_${Date.now()}`,
        studentName: sub.studentName,
        parentName: sub.parentName,
        parentEmail,
        amount,
        months: cycles,
        monthsPaid: 0,
        nextDebitDate: r.nextDebitDate,
        status: r.status,
        mandateId: r.mandateId,
      };
      const mandates = read<Mandate[]>(KEYS.mandates, []);
      write(KEYS.mandates, [mandate, ...mandates]);
      setDone({ mandateId: r.mandateId, next: r.nextDebitDate });
      onCreate(sub);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Subscription Plan</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-2xl text-white">✓</div>
            <h3 className="mt-3 text-lg font-bold text-success">Subscription Activated!</h3>
            <p className="mt-1 text-sm">First debit: {fmtDate(done.next)}</p>
            <p className="text-xs text-muted-foreground mt-1">Mandate ID: {done.mandateId}</p>
            <button onClick={onClose} className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Done</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student</label>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan Name</label>
              <input value={planName} onChange={(e) => setPlanName(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount per Cycle (₦)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as "Monthly" | "Termly")} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="Monthly">Monthly</option>
                  <option value="Termly">Per Term</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Number of Cycles</label>
                <input type="number" min={1} max={12} value={cycles} onChange={(e) => setCycles(Number(e.target.value))} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parent Phone</label>
              <input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="+234 800 000 0000" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parent Email</label>
              <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="rounded-md bg-info-soft px-3 py-2 text-xs text-muted-foreground">
              KYC flow uses BVN verification. Production version integrates Dojah or Smile ID for real NIN/BVN lookup against NIBSS database.
            </div>
            <button onClick={activate} disabled={busy} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busy ? "Activating…" : "Activate Plan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
