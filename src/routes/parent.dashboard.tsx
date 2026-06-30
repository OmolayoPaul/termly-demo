import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { getSession } from "../lib/auth";
import { KEYS, read, type FeeRow, type Student, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { SecuredByNomba } from "../components/TestModeBanner";

export const Route = createFileRoute("/parent/dashboard")({ component: ParentDash });

function ParentDash() {
  const session = getSession();
  const name = session?.name ?? "Parent";
  const students = read<Student[]>(KEYS.students, []);
  const fees = read<FeeRow[]>(KEYS.fees, []);
  const txs = read<TxRow[]>(KEYS.transactions, []);

  const myKids = session?.email
    ? students.filter((s) => s.parentEmail?.toLowerCase() === session.email.toLowerCase())
    : [];
  const kids = myKids.length > 0 ? myKids : students.slice(0, 1); // demo fallback

  return (
    <>
      <PageHeader title={`Hello ${name}`} subtitle="Manage your child's school fees and payments." actions={<SecuredByNomba />} />

      <div className="grid gap-4 md:grid-cols-2">
        {kids.map((kid) => {
          const kidFees = fees.filter((f) => f.studentId === kid.id || f.studentName === kid.name);
          const balance = kidFees.reduce((s, f) => s + (f.amount - f.paid), 0);
          const status = balance === 0 ? "Paid" : kidFees.some((f) => f.paid > 0) ? "Partial" : "Unpaid";
          return (
            <div key={kid.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">{kid.name}</div>
                  <div className="text-xs text-muted-foreground">{kid.class}</div>
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Outstanding</div>
              <div className={`text-3xl font-bold ${balance === 0 ? "text-success" : "text-warning-foreground"}`}>{fmtNaira(balance)}</div>
              <Link to="/parent/fees" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Pay Now</Link>

              {kid.virtualAccount && (
                <div className="mt-4 rounded-lg border border-info/30 bg-info-soft p-3 text-sm">
                  <div className="text-xs font-semibold uppercase text-info">Dedicated payment account</div>
                  <div className="mt-1"><span className="text-muted-foreground">Account:</span> <strong>{kid.virtualAccount.accountNumber}</strong></div>
                  <div><span className="text-muted-foreground">Bank:</span> {kid.virtualAccount.bankName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Transfer fees directly to this account.</div>
                </div>
              )}
            </div>
          );
        })}
        {kids.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <div className="text-3xl">👨‍👩‍👧</div>
            <p className="mt-2 text-sm text-muted-foreground">No student linked to your account yet. Contact the school admin.</p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="text-base font-semibold">Recent Payments</div>
        <ul className="mt-3 divide-y divide-border text-sm">
          {txs.slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{t.fee}</div>
                <div className="text-xs text-muted-foreground">{fmtDate(t.date)} · {t.method}</div>
              </div>
              <div className="font-semibold text-success">{fmtNaira(t.amount)}</div>
            </li>
          ))}
          {txs.length === 0 && <li className="py-4 text-center text-muted-foreground">No payments yet.</li>}
        </ul>
      </div>
    </>
  );
}