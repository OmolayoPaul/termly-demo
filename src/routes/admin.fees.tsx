import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, write, type FeeRow, type Student } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";

export const Route = createFileRoute("/admin/fees")({ component: FeesPage });

function FeesPage() {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ studentId: "", term: "", amount: "", dueDate: "" });

  useEffect(() => {
    setRows(read<FeeRow[]>(KEYS.fees, []));
    setStudents(read<Student[]>(KEYS.students, []));
  }, []);

  function add() {
    const student = students.find((s) => s.id === form.studentId);
    const amt = Number(form.amount);
    if (!student || !form.term || !amt || !form.dueDate) return toast.error("Fill all fields.");
    const fee: FeeRow = {
      id: `F-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      term: form.term,
      amount: amt,
      paid: 0,
      dueDate: form.dueDate,
      status: "Unpaid",
    };
    const next = [fee, ...rows];
    setRows(next);
    write(KEYS.fees, next);
    setOpen(false);
    setForm({ studentId: "", term: "", amount: "", dueDate: "" });
    toast.success("Fee added");
  }

  return (
    <>
      <PageHeader title="Fees" subtitle="Manage school fees and track payments." actions={
        <button onClick={() => setOpen(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">+ Add Fee</button>
      } />
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Term</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Paid</th>
              <th className="px-5 py-3 font-medium">Balance</th>
              <th className="px-5 py-3 font-medium">Due Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((f) => (
              <tr key={f.id}>
                <td className="px-5 py-3 font-medium">{f.studentName}</td>
                <td className="px-5 py-3 text-muted-foreground">{f.term}</td>
                <td className="px-5 py-3 font-semibold">{fmtNaira(f.amount)}</td>
                <td className="px-5 py-3 text-success">{fmtNaira(f.paid)}</td>
                <td className="px-5 py-3 text-warning-foreground">{fmtNaira(f.amount - f.paid)}</td>
                <td className="px-5 py-3 text-muted-foreground">{fmtDate(f.dueDate)}</td>
                <td className="px-5 py-3"><StatusBadge status={f.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No fee records.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Add Fee</h2><button onClick={() => setOpen(false)}>✕</button></div>
            <label className="mt-3 block text-sm">Student</label>
            <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">— Select —</option>
              {students.map((s) => (<option key={s.id} value={s.id}>{s.name} · {s.class}</option>))}
            </select>
            <label className="mt-3 block text-sm">Term / Description</label>
            <input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <label className="mt-3 block text-sm">Amount (₦)</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <label className="mt-3 block text-sm">Due Date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <div className="mt-5 flex justify-end"><button onClick={add} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button></div>
          </div>
        </div>
      )}
    </>
  );
}


