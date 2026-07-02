import { useState, useEffect, useCallback } from "react";
import { readWallets, resetWallets, DEFAULT_WALLETS, type DemoWallets } from "../lib/demoWallet";
import { fmtNaira } from "../lib/format";
import { KEYS, read, write, type FeeRow, type PayrollRow, type Student } from "../lib/storage";
import { students as seedStudents, fees as seedFees, payroll as seedPayroll } from "../lib/seed";

export function DemoWalletDashboard() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [wallets, setWallets] = useState<DemoWallets>(DEFAULT_WALLETS);

  const refresh = useCallback(() => setWallets(readWallets()), []);

  useEffect(() => {
    setMounted(true);
    setWallets(readWallets());
    window.addEventListener("termly:wallet:updated", refresh);
    return () => window.removeEventListener("termly:wallet:updated", refresh);
  }, [refresh]);

  if (!mounted) return null;

  const { student } = wallets;
  const pct = student.feeOwed > 0
    ? Math.min(100, Math.round((student.savingsBalance / student.feeOwed) * 100))
    : 0;
  const barColor =
    pct >= 100 ? "bg-yellow-400" : pct >= 75 ? "bg-success" : pct >= 25 ? "bg-warning" : "bg-red-500";

  function handleReset() {
    resetWallets();
    const stored = read<Student[]>(KEYS.students, []);
    const fees: FeeRow[] = seedFees.map((f) => ({
      id: f.id,
      studentId: stored.find((s) => s.name === f.student)?.id ?? "",
      studentName: f.student,
      term: f.title,
      amount: f.amount,
      paid: 0,
      dueDate: f.dueDate,
      status: "Unpaid" as const,
    }));
    write(KEYS.fees, fees);
    const payroll: PayrollRow[] = seedPayroll.map((p) => ({
      id: p.id,
      teacher: p.teacher,
      subject: p.subject,
      month: p.month,
      amount: p.amount,
      status: "Pending" as const,
    }));
    write(KEYS.payroll, payroll);
    write(KEYS.transactions, []);
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-sm font-bold">💰 Demo Wallets</div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="divide-y divide-border">
            <WRow emoji="🏫" label="School Account" value={fmtNaira(wallets.school.balance)} />
            <WRow
              emoji="👨"
              label={`Parent (${wallets.parent.name.split(" ").slice(-1)[0]})`}
              value={fmtNaira(wallets.parent.balance)}
            />

            <div className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👦</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">Student Savings</div>
                  <div className="text-xs text-muted-foreground">{student.name}</div>
                </div>
                <div className="text-sm font-semibold">{fmtNaira(student.savingsBalance)}</div>
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {fmtNaira(student.savingsBalance)} / {fmtNaira(student.feeOwed)} ({pct}%)
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor} ${pct >= 100 ? "animate-pulse" : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <WRow
              emoji="👨‍🏫"
              label={`Teacher (${wallets.teacher.name.split(" ")[2] ?? "Okafor"})`}
              value={fmtNaira(wallets.teacher.walletBalance)}
            />
          </div>

          <div className="px-4 py-3">
            <button
              onClick={handleReset}
              className="w-full rounded-md border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              🔄 Reset Demo
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-95"
      >
        <span>💰</span>
        <span>Demo Wallet</span>
      </button>
    </div>
  );
}

function WRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-lg">{emoji}</span>
      <div className="flex-1 text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
