import { topUpStudentSavings, deductStudentSavingsForFee } from "./studentSavings";

const WALLET_KEY = "termly_demo_wallets";
const EMEKA_ID = "TML/2024/001";

export interface SavingsEntry {
  date: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reference: string;
  description?: string;
}

export interface DemoWallets {
  school: { name: string; accountNumber: string; bank: string; balance: number };
  parent: { name: string; accountNumber: string; bank: string; balance: number };
  student: {
    name: string;
    admissionNumber: string;
    savingsBalance: number;
    feeOwed: number;
    savingsHistory: SavingsEntry[];
  };
  teacher: { name: string; accountNumber: string; bank: string; salary: number; walletBalance: number };
}

export const DEFAULT_WALLETS: DemoWallets = {
  school: { name: "Bimron Comprehensive School", accountNumber: "0123456789", bank: "Nomba Bank", balance: 1045000 },
  parent: { name: "Mr. James Okonkwo", accountNumber: "9876543210", bank: "Access Bank", balance: 150000 },
  student: {
    name: "Emeka Okonkwo",
    admissionNumber: "TMLY/2026/001",
    savingsBalance: 25000,
    feeOwed: 45000,
    savingsHistory: [
      { date: "2026-06-28", type: "Deposit", amount: 15000, balanceAfter: 25000, reference: "NMB/SAV/2026/10000001" },
      { date: "2026-06-15", type: "Deposit", amount: 10000, balanceAfter: 10000, reference: "NMB/SAV/2026/10000002" },
    ],
  },
  teacher: { name: "Mr. Adewale Okafor", accountNumber: "1122334455", bank: "GTBank", salary: 85000, walletBalance: 0 },
};

export function readWallets(): DemoWallets {
  if (typeof window === "undefined") return { ...DEFAULT_WALLETS };
  try {
    const v = window.localStorage.getItem(WALLET_KEY);
    if (!v) return { ...DEFAULT_WALLETS };
    return JSON.parse(v) as DemoWallets;
  } catch {
    return { ...DEFAULT_WALLETS };
  }
}

export function writeWallets(wallets: DemoWallets) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WALLET_KEY, JSON.stringify(wallets));
  window.dispatchEvent(new Event("termly:wallet:updated"));
}

export function resetWallets() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WALLET_KEY, JSON.stringify(DEFAULT_WALLETS));
  window.dispatchEvent(new Event("termly:wallet:updated"));
}

type RefType = "fee" | "salary" | "savings" | "bill" | "deduction";
const PREFIX: Record<RefType, string> = {
  fee: "NMB/TXN",
  salary: "NMB/TRF",
  savings: "NMB/SAV",
  bill: "NMB/BIL",
  deduction: "NMB/DED",
};

export function genRef(type: RefType): string {
  const digits = String(Math.floor(10000000 + Math.random() * 90000000));
  return `${PREFIX[type]}/2026/${digits}`;
}

export function demoPayFee(amount: number): string {
  const w = readWallets();
  w.parent.balance = Math.max(0, w.parent.balance - amount);
  w.school.balance += amount;
  writeWallets(w);
  return genRef("fee");
}

export function demoDisburseSalary(amount: number, teacherName: string): string {
  const w = readWallets();
  w.school.balance = Math.max(0, w.school.balance - amount);
  if (teacherName.includes("Adewale") || teacherName.includes("Okafor")) {
    w.teacher.walletBalance += amount;
  }
  writeWallets(w);
  return genRef("salary");
}

export function demoTopUpSavings(amount: number): string {
  const w = readWallets();
  w.parent.balance = Math.max(0, w.parent.balance - amount);
  w.student.savingsBalance += amount;
  const ref = genRef("savings");
  w.student.savingsHistory.unshift({
    date: new Date().toISOString().slice(0, 10),
    type: "Deposit",
    amount,
    balanceAfter: w.student.savingsBalance,
    reference: ref,
  });
  writeWallets(w);
  topUpStudentSavings(EMEKA_ID, amount, w.student.feeOwed);
  return ref;
}

export function demoDeductSavings(amount: number): { ref: string; deducted: number; outstanding: number } {
  const w = readWallets();
  const deducted = Math.min(amount, w.student.savingsBalance);
  w.student.savingsBalance = Math.max(0, w.student.savingsBalance - deducted);
  w.school.balance += deducted;
  const ref = genRef("deduction");
  w.student.savingsHistory.unshift({
    date: new Date().toISOString().slice(0, 10),
    type: "Fee Deduction",
    amount: -deducted,
    balanceAfter: w.student.savingsBalance,
    reference: ref,
    description: "First Term 2026/2027 fee payment",
  });
  writeWallets(w);
  deductStudentSavingsForFee(EMEKA_ID, deducted, "First Term 2026/2027 fee payment");
  return { ref, deducted, outstanding: amount - deducted };
}

export function demoPayBill(amount: number): string {
  const w = readWallets();
  w.school.balance = Math.max(0, w.school.balance - amount);
  writeWallets(w);
  return genRef("bill");
}

export function demoCreateMandate(): { mandateId: string; status: string; nextDebitDate: string } {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  return {
    mandateId: `DEMO-MANDATE-${Math.floor(10000000 + Math.random() * 90000000)}`,
    status: "active",
    nextDebitDate: start.toISOString().slice(0, 10),
  };
}
