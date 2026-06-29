import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { students as seed } from "../lib/seed";

export const Route = createFileRoute("/admin/students")({ component: StudentsPage });

function StudentsPage() {
  const [rows, setRows] = useState(seed);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", class: "", id: "", parent: "", parentEmail: "" });

  function save() {
    if (!form.name) return;
    setRows([...rows, { ...form }]);
    setOpen(false);
    setForm({ name: "", class: "", id: "", parent: "", parentEmail: "" });
  }

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Manage student directory and parent contacts."
        actions={
          <button
            onClick={() => setOpen(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
          >
            Add Student
          </button>
        }
      />
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Admission No.</th>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Class</th>
              <th className="px-5 py-3 font-medium">Parent Name</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 text-muted-foreground">{s.id}</td>
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-5 py-3">{s.class}</td>
                <td className="px-5 py-3">{s.parent}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => setRows(rows.filter((r) => r.id !== s.id))}
                    className="text-sm font-medium text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add New Student</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            {[
              ["Full Name", "name"],
              ["Class", "class"],
              ["Admission Number", "id"],
              ["Parent Name", "parent"],
              ["Parent Email", "parentEmail"],
            ].map(([label, key]) => (
              <div key={key} className="mt-3">
                <label className="text-sm font-medium">{label}</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="mt-5 flex justify-end">
              <button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Save Student
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}