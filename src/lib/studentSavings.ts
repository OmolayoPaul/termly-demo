const KEY = "termly_student_savings";

export interface SavingsHistoryEntry {
  date: string;
  type: "Deposit" | "Fee Deduction";
  amount: number;
  balanceAfter: number;
  reference: string;
  description?: string;
}

export interface StudentSavingsRecord {
  studentId: string;
  savingsBalance: number;
  goal: number;
  history: SavingsHistoryEntry[];
}

export type SavingsStore = Record<string, StudentSavingsRecord>;

const DEFAULT_STORE: SavingsStore = {
  "TML/2024/001": {
    studentId: "TML/2024/001",
    savingsBalance: 25000,
    goal: 45000,
    history: [
      { date: "2026-06-28", type: "Deposit", amount: 15000, balanceAfter: 25000, reference: "NMB/SAV/2026/10000001" },
      { date: "2026-06-15", type: "Deposit", amount: 10000, balanceAfter: 10000, reference: "NMB/SAV/2026/10000002" },
    ],
  },
  "TML/2024/002": {
    studentId: "TML/2024/002",
    savingsBalance: 3000,
    goal: 35000,
    history: [
      { date: "2026-06-10", type: "Deposit", amount: 3000, balanceAfter: 3000, reference: "NMB/SAV/2026/10000003" },
    ],
  },
  "TML/2024/003": {
    studentId: "TML/2024/003",
    savingsBalance: 0,
    goal: 55000,
    history: [],
  },
};

export function readSavingsStore(): SavingsStore {
  if (typeof window === "undefined") return { ...DEFAULT_STORE };
  try {
    const v = window.localStorage.getItem(KEY);
    if (!v) return { ...DEFAULT_STORE };
    return JSON.parse(v) as SavingsStore;
  } catch {
    return { ...DEFAULT_STORE };
  }
}

export function writeSavingsStore(store: SavingsStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("termly:savings:updated"));
}

export function resetSavingsStore() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(DEFAULT_STORE));
  window.dispatchEvent(new Event("termly:savings:updated"));
}

export function getSavingsFor(studentId: string, defaultGoal = 45000): StudentSavingsRecord {
  const store = readSavingsStore();
  return store[studentId] ?? { studentId, savingsBalance: 0, goal: defaultGoal, history: [] };
}

function genSavingsRef(kind: "savings" | "deduction"): string {
  const digits = String(Math.floor(10000000 + Math.random() * 90000000));
  return kind === "savings" ? `NMB/SAV/2026/${digits}` : `NMB/DED/2026/${digits}`;
}

export function topUpStudentSavings(studentId: string, amount: number, goal?: number): string {
  const store = readSavingsStore();
  const rec = store[studentId] ?? { studentId, savingsBalance: 0, goal: goal ?? 45000, history: [] };
  rec.savingsBalance += amount;
  if (goal !== undefined) rec.goal = goal;
  const reference = genSavingsRef("savings");
  rec.history = [
    { date: new Date().toISOString().slice(0, 10), type: "Deposit", amount, balanceAfter: rec.savingsBalance, reference },
    ...rec.history,
  ];
  store[studentId] = rec;
  writeSavingsStore(store);
  return reference;
}

export function deductStudentSavingsForFee(
  studentId: string,
  feeAmount: number,
  description: string,
): { reference: string; deducted: number; outstanding: number } {
  const store = readSavingsStore();
  const rec = store[studentId] ?? { studentId, savingsBalance: 0, goal: feeAmount, history: [] };
  const deducted = Math.min(feeAmount, rec.savingsBalance);
  rec.savingsBalance -= deducted;
  const reference = genSavingsRef("deduction");
  rec.history = [
    {
      date: new Date().toISOString().slice(0, 10),
      type: "Fee Deduction",
      amount: -deducted,
      balanceAfter: rec.savingsBalance,
      reference,
      description,
    },
    ...rec.history,
  ];
  store[studentId] = rec;
  writeSavingsStore(store);
  return { reference, deducted, outstanding: feeAmount - deducted };
}
