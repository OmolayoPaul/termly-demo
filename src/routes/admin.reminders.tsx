import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard } from "../components/PageHeader";

export const Route = createFileRoute("/admin/reminders")({ component: RemindersPage });

function RemindersPage() {
  return (
    <>
      <PageHeader title="Reminders Log" subtitle="All payment reminders sent to parents" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Sent" value={0} />
        <StatCard label="Today" value={<span className="text-info">0</span>} />
        <StatCard label="By Type" value={
          <span className="text-base font-semibold">
            <span className="text-warning-foreground">0 fees</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-info">0 installments</span>
          </span>
        } />
      </div>
      <div className="mt-5 rounded-xl border border-border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl">📬</div>
        <div className="mt-4 text-lg font-semibold">No reminders sent yet</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the "Send Reminder" button on the Fees or Installments page to notify parents
        </p>
      </div>
    </>
  );
}