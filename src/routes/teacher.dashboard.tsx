import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { getSession } from "../lib/auth";
import { KEYS, read, type PayrollRow, type TeacherProfile } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";

export const Route = createFileRoute("/teacher/dashboard")({ component: TeacherDash });

function TeacherDash() {
  const session = getSession();
  const name = session?.name ?? "Teacher";
  const payroll = read<PayrollRow[]>(KEYS.payroll, []);
  const mine = payroll.filter((p) =>
    session?.email ? p.email?.toLowerCase() === session.email.toLowerCase() : p.teacher === name,
  );
  const recent = mine[0] ?? payroll[0];
  const profile = read<TeacherProfile | null>(KEYS.teacherProfile, null);

  return (
    <>
      <PageHeader title={`Hello ${name}`} subtitle="Your salary and account at a glance." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Most recent salary</div>
          {recent ? (
            <>
              <div className="mt-1 text-3xl font-bold">{fmtNaira(recent.amount)}</div>
              <div className="mt-2 text-sm text-muted-foreground">{recent.month} · Ref: {recent.transactionId || "—"}</div>
              <div className="mt-1 text-sm">Paid: {recent.paidDate ? fmtDate(recent.paidDate) : "Pending"}</div>
              <div className="mt-2"><StatusBadge status={recent.status} /></div>
            </>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">No salary records yet.</div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Bank account details</div>
          {profile?.accountNumber ? (
            <>
              <div className="mt-1 text-base font-semibold">{profile.bankName}</div>
              <div className="text-sm">Account: <strong>{profile.accountNumber}</strong></div>
              <div className="text-sm text-muted-foreground">{profile.accountName}</div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No bank details on file. Add them in Profile.</p>
          )}
        </div>
      </div>
    </>
  );
}