import { students as seedStudents, fees as seedFees, payroll as seedPayroll, transactions as seedTransactions } from "./seed";

export const KEYS = {
  users: "termly_users",
  students: "termly_students",
  fees: "termly_fees",
  transactions: "termly_transactions",
  payroll: "termly_payroll",
  mandates: "termly_mandates",
  teacherProfile: "termly_teacher_profile",
  pendingPayment: "termly_pending_payment",
  pendingPayments: "termly_pending_payments",
  currentUser: "termly_current_user",
  portalAuditLog: "termly_portal_audit_log",
  schoolProfile: "termly_school_profile",
  onboarded: "termly_onboarded",
  subscriptions: "termly_subscriptions",
  webhookLogs: "termly_webhook_logs",
  checkoutAttempts: "termly_checkout_attempts",
} as const;

export function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "parent" | "teacher" | "student";
  password: string;
  createdAt: string;
  studentId?: string;
  kyc_verified?: boolean;
};

export type Student = {
  id: string;
  name: string;
  class: string;
  parentId?: string;
  parentName: string;
  parentEmail?: string;
  virtualAccount?: { accountNumber: string; bankName: string; accountReference: string };
};

export type FeeRow = {
  id: string;
  studentId: string;
  studentName: string;
  term: string;
  amount: number;
  paid: number;
  dueDate: string;
  status: "Paid" | "Partial" | "Unpaid" | "Pending";
};

export type TxRow = {
  id: string;
  date: string;
  studentName: string;
  fee: string;
  amount: number;
  method: string;
  reference: string;
  status?: string;
};

export type PayrollRow = {
  id: string;
  teacher: string;
  email?: string;
  subject: string;
  month: string;
  amount: number;
  status: "Paid" | "Pending";
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  transactionId?: string;
  paidDate?: string;
};

export type Mandate = {
  id: string;
  studentName: string;
  parentName: string;
  parentEmail: string;
  amount: number;
  months: number;
  monthsPaid: number;
  nextDebitDate: string;
  status: string;
  mandateId: string;
};

export type TeacherProfile = {
  teacherEmail: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
};

export type ClassFee = {
  className: string;
  amount: number;
};

export type SchoolProfile = {
  name: string;
  address: string;
  phone: string;
  email: string;
  type: "Primary" | "Secondary" | "Both";
  logoDataUrl?: string;
  termName: string;
  termStart: string;
  termEnd: string;
  classFees: ClassFee[];
};

export type PortalAuditEvent = {
  id: string;
  studentId: string;
  studentName: string;
  action: "created" | "password_reset" | "revoked";
  actorName: string;
  email?: string;
  timestamp: string;
};

export function logPortalAudit(entry: Omit<PortalAuditEvent, "id" | "timestamp">) {
  const log = read<PortalAuditEvent[]>(KEYS.portalAuditLog, []);
  const event: PortalAuditEvent = {
    ...entry,
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  write(KEYS.portalAuditLog, [event, ...log].slice(0, 200));
}

function isFirstRun() {
  return typeof window !== "undefined" && !window.localStorage.getItem("termly_seeded");
}

export function seedIfNeeded() {
  if (!isFirstRun()) return;
  const students: Student[] = seedStudents.map((s) => ({
    id: s.id,
    name: s.name,
    class: s.class,
    parentName: s.parent,
    parentEmail: s.parentEmail,
  }));
  const fees: FeeRow[] = seedFees.map((f) => ({
    id: f.id,
    studentId: students.find((s) => s.name === f.student)?.id ?? "",
    studentName: f.student,
    term: f.title,
    amount: f.amount,
    paid: f.paid,
    dueDate: f.dueDate,
    status: f.status === "Overdue" ? "Unpaid" : (f.status as FeeRow["status"]),
  }));
  const payroll = seedPayroll.map((p) => ({ ...p }));
  const transactions: TxRow[] = seedTransactions.map((t) => ({
    id: t.id,
    date: t.date,
    studentName: t.student,
    fee: t.fee,
    amount: t.amount,
    method: t.method,
    reference: t.reference,
    status: "Paid",
  }));
  write(KEYS.students, students);
  write(KEYS.fees, fees);
  write(KEYS.payroll, payroll);
  write(KEYS.transactions, transactions);
  write(KEYS.mandates, []);
  window.localStorage.setItem("termly_seeded", "1");
}