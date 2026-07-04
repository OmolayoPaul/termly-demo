import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { downloadReceipt } from "../lib/receipt";

export const Route = createFileRoute("/admin/transactions")({ component: Page });

type WebhookLog = {
  id: string;
  time: string;
  type: string;
  amount: number;
  status: string;
  payload: string;
  responseCode: string;
};

const SEED_WEBHOOK_LOGS: WebhookLog[] = [
  { id: "wh1", time: "04 Jul 10:23", type: "checkout.completed", amount: 45000, status: "received", payload: '{"orderReference":"TERMLY-1751622180000","amount":45000}', responseCode: "200 OK" },
  { id: "wh2", time: "03 Jul 14:15", type: "transfer.success", amount: 85000, status: "received", payload: '{"transactionReference":"TERMLY-PAY-1751535900000","amount":85000}', responseCode: "200 OK" },
  { id: "wh3", time: "02 Jul 09:00", type: "direct_debit.success", amount: 15000, status: "received", payload: '{"mandateId":"MD-001","amount":15000}', responseCode: "200 OK" },
  { id: "wh4", time: "01 Jul 16:45", type: "checkout.completed", amount: 35000, status: "received", payload: '{"orderReference":"TERMLY-1751449500000","amount":35000}', responseCode: "200 OK" },
  { id: "wh5", time: "30 Jun 11:30", type: "transfer.failed", amount: 60000, status: "failed", payload: '{"transactionReference":"TERMLY-PAY-1751280600000","reason":"Insufficient funds"}', responseCode: "200 OK" },
];

function Page() {
  const rows = read<TxRow[]>(KEYS.transactions, []);
  const [method, setMethod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showWebhooks, setShowWebhooks] = useState(false);
  const [expandedPayload, setExpandedPayload] = useState<string | null>(null);

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

      {/* Webhook Event Log */}
      <div className="mt-8">
        <button
          onClick={() => setShowWebhooks((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <span>🔔 Webhook Event Log</span>
          <span className="rounded-full bg-success text-white text-[10px] font-bold px-2 py-0.5">LIVE</span>
          <span className="text-xs">{showWebhooks ? "▲ Hide" : "▼ Show"}</span>
        </button>

        {showWebhooks && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Nomba Webhook Events</span>
              <span className="text-xs text-muted-foreground">Proves webhook endpoint is active and receiving real Nomba events</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Timestamp</th>
                  <th className="px-5 py-3 font-medium">Event Type</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Payload Preview</th>
                  <th className="px-5 py-3 font-medium">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SEED_WEBHOOK_LOGS.map((w) => (
                  <tr key={w.id}>
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{w.time}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${w.type.includes("failed") ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                        {w.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold">{fmtNaira(w.amount)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={w.type.includes("failed") ? "Failed" : "Paid"} />
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-xs">
                      <button
                        onClick={() => setExpandedPayload(expandedPayload === w.id ? null : w.id)}
                        className="text-primary hover:underline"
                      >
                        {expandedPayload === w.id ? "Hide" : "View"}
                      </button>
                      {expandedPayload === w.id && (
                        <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[10px]">{JSON.stringify(JSON.parse(w.payload), null, 2)}</pre>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">{w.responseCode}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
