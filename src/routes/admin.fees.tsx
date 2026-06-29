import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Pill, StatusBadge } from "../components/StatusBadge";
import { fees as seed, ngnFmt } from "../lib/seed";

export const Route = createFileRoute("/admin/fees")({ component: FeesPage });

function FeesPage() {
  const [rows, setRows] = useState(seed);
  const [status, setStatus] = useState<string>("all");
  const filtered = rows.filter((r) => status === "all" || r.status === status);

  return (
    <>
      <PageHeader
        title="Fees"
        subtitle="Manage school fees and track payments."
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-md border border-success/40 bg-success-soft px-3 py-2 text-sm font-semibold text-success hover:opacity-90">
              ⤓ Export CSV
            </button>
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Add Fee Record
            </button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option>Paid</option>
            <option>Pending</option>
            <option>Partial</option>
            <option>Overdue</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Due from</label>
          <input type="date" className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Due to</label>
          <input type="date" className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Currency</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Paid</th>
              <th className="px-5 py-3 font-medium">Due Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((f) => (
              <tr key={f.id}>
                <td className="px-5 py-3 font-medium">{f.student}</td>
                <td className="px-5 py-3">{f.title}</td>
                <td className="px-5 py-3"><Pill>NGN</Pill></td>
                <td className="px-5 py-3 font-semibold">{ngnFmt(f.amount)}</td>
                <td className={`px-5 py-3 font-semibold ${f.paid > 0 ? "text-success" : "text-warning-foreground"}`}>{ngnFmt(f.paid)}</td>
                <td className="px-5 py-3 text-muted-foreground">{f.dueDate}</td>
                <td className="px-5 py-3"><StatusBadge status={f.status} /></td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    {f.status !== "Paid" && (
                      <button className="rounded-md border border-warning/50 px-2 py-1 text-xs font-medium text-warning-foreground hover:bg-warning-soft">
                        Send Reminder
                      </button>
                    )}
                    <button className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-secondary">Status</button>
                    <button onClick={() => setRows(rows.filter((r) => r.id !== f.id))} className="text-xs font-medium text-destructive hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}