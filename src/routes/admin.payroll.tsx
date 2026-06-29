import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, StatCard } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { nairaFmt, payroll as seed } from "../lib/seed";

export const Route = createFileRoute("/admin/payroll")({ component: PayrollPage });

function PayrollPage() {
  const [rows, setRows] = useState(seed);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = rows.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      r.teacher.toLowerCase().includes(search.toLowerCase()),
  );

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const paid = rows.filter((r) => r.status === "Paid");
  const pending = rows.filter((r) => r.status === "Pending");

  return (
    <>
      <PageHeader title="Payroll" subtitle="Manage teacher salaries and track payments by month." actions={
        <>
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary">⤓ Export CSV</button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Add Payroll</button>
        </>
      } />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Payroll" value={nairaFmt(total)} />
        <StatCard label="Paid" value={<span className="text-success">{nairaFmt(paid.reduce((s, r) => s + r.amount, 0))}</span>} tone="success" sub={`${paid.length} records`} />
        <StatCard label="Pending" value={<span className="text-destructive">{nairaFmt(pending.reduce((s, r) => s + r.amount, 0))}</span>} tone="warning" sub={`${pending.length} record${pending.length === 1 ? "" : "s"}`} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground">Search teacher</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Teacher name..." className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            <option>Paid</option>
            <option>Pending</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Month</label>
          <input type="month" className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Subject / Dept</label>
          <select className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
            <option>All subjects</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Teacher</th>
              <th className="px-5 py-3 font-medium">Subject / Dept</th>
              <th className="px-5 py-3 font-medium">Month</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-medium">{r.teacher}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.subject}</td>
                <td className="px-5 py-3">{r.month}</td>
                <td className="px-5 py-3 font-semibold">{nairaFmt(r.amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-right">
                  {r.status === "Pending" ? (
                    <button onClick={() => setRows(rows.map((x) => x.id === r.id ? { ...x, status: "Paid" } : x))} className="rounded-md border border-success/40 px-2 py-1 text-xs font-semibold text-success hover:bg-success-soft">Mark Paid</button>
                  ) : (
                    <span className="text-xs text-success">✓ Paid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}