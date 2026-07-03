import { KEYS, read, type Student, type FeeRow, type TxRow } from "./storage";
import { getSavingsFor, type SavingsHistoryEntry } from "./studentSavings";

export interface StudentPortalData {
  student: Student;
  fees: FeeRow[];
  transactions: TxRow[];
  savingsBalance: number;
  savingsGoal: number;
  savingsHistory: SavingsHistoryEntry[];
  outstandingFees: number;
  totalPaid: number;
}

export function findStudentById(studentId?: string, fallbackName?: string): Student | null {
  const students = read<Student[]>(KEYS.students, []);
  if (studentId) {
    const byId = students.find((s) => s.id === studentId);
    if (byId) return byId;
  }
  if (fallbackName) {
    return students.find((s) => s.name === fallbackName) ?? null;
  }
  return null;
}

export function getStudentPortalData(studentId?: string, fallbackName?: string): StudentPortalData | null {
  const student = findStudentById(studentId, fallbackName);
  if (!student) return null;

  const allFees = read<FeeRow[]>(KEYS.fees, []);
  const feesById = allFees.filter((f) => f.studentId === student.id);
  const fees = feesById.length > 0 ? feesById : allFees.filter((f) => f.studentName === student.name);

  const transactions = read<TxRow[]>(KEYS.transactions, []).filter((t) => t.studentName === student.name);

  const sav = getSavingsFor(student.id);
  const outstandingFees = fees.reduce((s, f) => s + (f.amount - f.paid), 0);
  const totalPaid = fees.reduce((s, f) => s + f.paid, 0);

  return {
    student,
    fees,
    transactions,
    savingsBalance: sav.savingsBalance,
    savingsGoal: sav.goal,
    savingsHistory: sav.history,
    outstandingFees,
    totalPaid,
  };
}
