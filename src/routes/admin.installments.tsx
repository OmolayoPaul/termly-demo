import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, StatCard } from "../components/PageHeader";
import { Pill, StatusBadge } from "../components/StatusBadge";
import { installments as seed, ngnFmt } from "../lib/seed";

export const Route = createFileRoute("/admin/installments")({ component: InstallmentsPage });

function InstallmentsPage() {
  const rows = seed;
  const total = rows.length;
  const totalValue = rows.reduce((s, r) => s + r.amount, 0);
  const collected = rows.reduce((s, r) => s + r.paid, 0);
  const overdue = 0;

  const refs = Array.from(new Set(rows.map((r) => `${r.student} – ${r.ref}`)));
  const [filter, setFilter] = useState<string>("all");
  const filtered = rows.filter((r) => filter === "all" || `${r.student} – ${r.ref}` === filter);

  return (
    <>
      <PageHeader title="Installment Plans" subtitle="Manage scheduled fee payment installments" actions={
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Add Installment</button>
      } />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Plans" value={total} />
        <StatCard label="Total Value" value={ngnFmt(totalValue)} />
        <StatCard label="Collected" value={<span className="text-success">{ngnFmt(collected)}</span>} tone="success" />
        <StatCard label="Overdue" value={<span className="text-destructive">{overdue}</span>} tone="danger" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filter by fee:</span>
        <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 text-xs ${filter === "all" ? "bg-primary text-primary-foreground" : "border border-border"}`}>All</button>
        {refs.map((r) => (
          <button key={r} onClick={() => setFilter(r)} className={`rounded-full px-3 py-1 text-xs ${filter === r ? "bg-primary text-primary-foreground" : "border border-border"}`}>{r}</button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Fee Ref</th>
              <th className="px-5 py-3 font-medium">Currency</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Paid</th>
              <th className="px-5 py-3 font-medium">Due Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-medium">{r.student}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.ref}</td>
                <td className="px-5 py-3"><Pill>NGN</Pill></td>
                <td className="px-5 py-3 font-semibold">{ngnFmt(r.amount)}</td>
                <td className={`px-5 py-3 font-semibold ${r.paid > 0 ? "text-success" : ""}`}>{ngnFmt(r.paid)}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.dueDate}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-right">
                  {r.status !== "Paid" && (
                    <button className="rounded-md border border-primary/40 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">Send Reminder</button>
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