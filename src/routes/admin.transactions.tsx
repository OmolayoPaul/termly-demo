import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { downloadReceipt } from "../lib/receipt";

export const Route = createFileRoute("/admin/transactions")({ component: Page });

function Page() {
  const rows = read<TxRow[]>(KEYS.transactions, []);
  const [method, setMethod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => rows.filter((r) => {
    if (method !== "all" && r.method !== method) return false;
    const d = new Date(r.date).getTime();
    if (from && d < new Date(from).getTime()) return false;
    if (to && d > new Date(to).getTime() + 86400000) return false;
    return true;
  }), [rows, method, from, to]);

  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const methods = Array.from(new Set(rows.map((r) => r.method)));

  function exportCsv() {
    const csv = ["Date,Student,Fee,Amount,Method,Reference,Status"].concat(
      filtered.map((r) => [fmtDate(r.date), r.studentName, r.fee, r.amount, r.method, r.reference, r.status ?? ""].join(",")),
    ).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "termly-transactions.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader title="Transactions" subtitle="All payments across the school." actions={
        <div className="flex items-center gap-3">
          <div className="text-right"><div className="text-xs uppercase text-muted-foreground">Total Collected</div><div className="text-lg font-bold text-success">{fmtNaira(total)}</div></div>
          <button onClick={exportCsv} className="rounded-md border border-success/40 bg-success-soft px-3 py-2 text-sm font-semibold text-success">⤓ Export CSV</button>
        </div>
      } />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div><label className="text-xs text-muted-foreground">Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
            <option value="all">All methods</option>
            {methods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select></div>
        <div><label className="text-xs text-muted-foreground">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" /></div>
        <div><label className="text-xs text-muted-foreground">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" /></div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Fee</th><th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Method</th><th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-3 text-muted-foreground">{fmtDate(t.date)}</td>
                <td className="px-5 py-3 font-medium">{t.studentName}</td>
                <td className="px-5 py-3 text-muted-foreground">{t.fee}</td>
                <td className="px-5 py-3 font-semibold text-success">{fmtNaira(t.amount)}</td>
                <td className="px-5 py-3">{t.method}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{t.reference}</td>
                <td className="px-5 py-3"><StatusBadge status={t.status || "Paid"} /></td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => downloadReceipt({ reference: t.reference, date: t.date, studentName: t.studentName, feeType: t.fee, amount: t.amount, method: t.method })} className="rounded-md border border-primary/40 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">Receipt</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">No transactions match the filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}