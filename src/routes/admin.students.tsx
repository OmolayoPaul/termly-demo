import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { KEYS, read, write, type Student, type User } from "../lib/storage";
import { createVirtualAccount, friendlyError } from "../services/nomba";

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
        </Modal>
      )}
    </>
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