import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { KEYS, read, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { downloadReceipt } from "../lib/receipt";
import { getSession } from "../lib/auth";
import jsPDF from "jspdf";

export const Route = createFileRoute("/parent/transactions")({ component: Page });

function downloadStatement(rows: TxRow[], session: ReturnType<typeof getSession>) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const total = rows.reduce((s, r) => s + r.amount, 0);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TERMLY PAYMENT STATEMENT", 20, 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Bimron Comprehensive College", 20, 30);
  doc.text("Period: Current Term 2026/2027", 20, 37);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 42, 190, 42);

  doc.setFontSize(10);
  doc.text(`Account Holder: ${session?.name ?? "Parent"}`, 20, 50);
  doc.text(`Generated: ${today}`, 20, 57);

  doc.line(20, 62, 190, 62);

  doc.setFont("helvetica", "bold");
  doc.text("DATE", 20, 70);
  doc.text("DESCRIPTION", 55, 70);
  doc.text("AMOUNT", 140, 70);
  doc.text("STATUS", 170, 70);
  doc.setFont("helvetica", "normal");

  let y = 78;
  for (const t of rows) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.text(fmtDate(t.date), 20, y);
    doc.text(t.fee.slice(0, 30), 55, y);
    doc.text(fmtNaira(t.amount), 140, y);
    doc.text(t.status ?? "Paid", 170, y);
    y += 8;
  }

  doc.line(20, y + 2, 190, y + 2);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text(`Total Paid: ${fmtNaira(total)}`, 20, y);
  y += 8;
  doc.setFont("helvetica", "normal");

  const outstanding = rows.some((r) => r.status !== "Paid");
  doc.text(`Status: ${outstanding ? "PARTIALLY PAID" : "FULLY PAID ✓"}`, 20, y);

  doc.save("termly-statement.pdf");
}

function Page() {
  const session = getSession();
  const rows = read<TxRow[]>(KEYS.transactions, []);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <>
      <PageHeader title="Transactions" subtitle="Your payment history." actions={
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs uppercase text-muted-foreground">Total Paid</div>
            <div className="text-lg font-bold text-success">{fmtNaira(total)}</div>
          </div>
          {rows.length > 0 && (
            <button
              onClick={() => downloadStatement(rows, session)}
              className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              ⤓ Download Statement
            </button>
          )}
        </div>
      } />
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Fee</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Method</th>
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-3 text-muted-foreground">{fmtDate(t.date)}</td>
                <td className="px-5 py-3 font-medium">{t.fee}</td>
                <td className="px-5 py-3 font-semibold text-success">{fmtNaira(t.amount)}</td>
                <td className="px-5 py-3">{t.method}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{t.reference}</td>
                <td className="px-5 py-3"><StatusBadge status={t.status || "Paid"} /></td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => downloadReceipt({
                      reference: t.reference,
                      date: t.date,
                      studentName: t.studentName,
                      feeType: t.fee,
                      amount: t.amount,
                      method: t.method,
                    })}
                    className="rounded-md border border-primary/40 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                  >Receipt</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No transactions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
