import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, StatCard } from "../components/PageHeader";
import { Pill, StatusBadge } from "../components/StatusBadge";
import { bills as seed, nairaFmt } from "../lib/seed";

export const Route = createFileRoute("/admin/bills")({ component: BillsPage });

function BillsPage() {
  const [rows, setRows] = useState(seed);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const paid = rows.filter((r) => r.status === "Paid");
  const pending = rows.filter((r) => r.status === "Pending");
  const overdue = rows.filter((r) => r.status === "Overdue");

  return (
    <>
      <PageHeader title="Bills & Expenses" subtitle="Track school utility bills, vendor payments, and outgoing expenses." actions={
        <>
          <button className="inline-flex items-center gap-2 rounded-md border border-success/40 bg-success-soft px-3 py-2 text-sm font-semibold text-success">⤓ Export CSV</button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Add Bill</button>
        </>
      } />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Bills" value={nairaFmt(total)} sub={`${rows.length} bills`} />
        <StatCard label="Paid" value={<span className="text-success">{nairaFmt(paid.reduce((s, r) => s + r.amount, 0))}</span>} tone="success" sub={`${paid.length} bills`} />
        <StatCard label="Pending" value={<span className="text-warning-foreground">{nairaFmt(pending.reduce((s, r) => s + r.amount, 0))}</span>} tone="warning" sub={`${pending.length} bills`} />
        <StatCard label="Overdue" value={<span className="text-destructive">{nairaFmt(overdue.reduce((s, r) => s + r.amount, 0))}</span>} tone="danger" sub={`${overdue.length} bills`} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <div>
          <label className="text-xs text-muted-foreground">Search</label>
          <input placeholder="Title or vendor..." className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <select className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"><option>All statuses</option></select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Category</label>
          <select className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"><option>All categories</option></select>
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

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Vendor</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Due Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((b) => (
              <tr key={b.id}>
                <td className="px-5 py-3 font-medium">{b.title}</td>
                <td className="px-5 py-3 text-muted-foreground">{b.vendor}</td>
                <td className="px-5 py-3"><Pill>{b.category}</Pill></td>
                <td className="px-5 py-3 font-semibold">{nairaFmt(b.amount)}</td>
                <td className={`px-5 py-3 ${b.status === "Overdue" ? "text-destructive" : "text-muted-foreground"}`}>{b.dueDate}</td>
                <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    {b.status !== "Paid" ? (
                      <button onClick={() => setRows(rows.map((x) => x.id === b.id ? { ...x, status: "Paid" } : x))} className="rounded-md border border-success/40 px-2 py-1 text-xs font-semibold text-success hover:bg-success-soft">Mark Paid</button>
                    ) : (<span className="text-xs text-success">✓ Paid</span>)}
                    <button onClick={() => setRows(rows.filter((x) => x.id !== b.id))} className="text-xs font-medium text-destructive hover:underline">Delete</button>
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