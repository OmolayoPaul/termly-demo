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
  feeTemplates: "termly_fee_templates",
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

export type FeeTemplateItem = {
  name: string;
  amount: number;
};

export type FeeTemplate = {
  className: string;
  total: number;
  items: FeeTemplateItem[];
};

export const DEFAULT_FEE_TEMPLATES: FeeTemplate[] = [
  {
    className: "JSS 1",
    total: 100000,
    items: [
      { name: "School Fees", amount: 70000 },
      { name: "Development Levy", amount: 10000 },
      { name: "Library Fee", amount: 5000 },
      { name: "Exam Fee", amount: 8000 },
      { name: "PTA Levy", amount: 7000 },
    ],
  },
  {
    className: "JSS 2",
    total: 150000,
    items: [
      { name: "School Fees", amount: 110000 },
      { name: "Development Levy", amount: 15000 },
      { name: "Library Fee", amount: 5000 },
      { name: "Exam Fee", amount: 12000 },
      { name: "PTA Levy", amount: 8000 },
    ],
  },
  {
    className: "JSS 3",
    total: 200000,
    items: [
      { name: "School Fees", amount: 150000 },
      { name: "Development Levy", amount: 20000 },
      { name: "Library Fee", amount: 5000 },
      { name: "Exam Fee", amount: 15000 },
      { name: "PTA Levy", amount: 10000 },
    ],
  },
  {
    className: "SS 1",
    total: 250000,
    items: [
      { name: "School Fees", amount: 190000 },
      { name: "Development Levy", amount: 25000 },
      { name: "Library Fee", amount: 7000 },
      { name: "Exam Fee", amount: 18000 },
      { name: "PTA Levy", amount: 10000 },
    ],
  },
  {
    className: "SS 2",
    total: 300000,
    items: [
      { name: "School Fees", amount: 230000 },
      { name: "Development Levy", amount: 30000 },
      { name: "Library Fee", amount: 7000 },
      { name: "Exam Fee", amount: 23000 },
      { name: "PTA Levy", amount: 10000 },
    ],
  },
  {
    className: "SS 3",
    total: 350000,
    items: [
      { name: "School Fees", amount: 265000 },
      { name: "Development Levy", amount: 35000 },
      { name: "Library Fee", amount: 7000 },
      { name: "Exam Fee", amount: 25000 },
      { name: "PTA Levy", amount: 10000 },
      { name: "WAEC/NECO Levy", amount: 8000 },
    ],
  },
];

export function getTemplateKeyForClass(studentClass: string): string {
  const u = studentClass.toUpperCase();
  if (/JSS[\s\-]?1/.test(u) || /J\.S\.S[\s\-]?1/.test(u)) return "JSS 1";
  if (/JSS[\s\-]?2/.test(u) || /J\.S\.S[\s\-]?2/.test(u)) return "JSS 2";
  if (/JSS[\s\-]?3/.test(u) || /J\.S\.S[\s\-]?3/.test(u)) return "JSS 3";
  if (/SSS[\s\-]?1/.test(u) || /SS[\s\-]?1/.test(u) || /S\.S\.S[\s\-]?1/.test(u)) return "SS 1";
  if (/SSS[\s\-]?2/.test(u) || /SS[\s\-]?2/.test(u) || /S\.S\.S[\s\-]?2/.test(u)) return "SS 2";
  if (/SSS[\s\-]?3/.test(u) || /SS[\s\-]?3/.test(u) || /S\.S\.S[\s\-]?3/.test(u)) return "SS 3";
  return "";
}

export function getFeeTemplates(): FeeTemplate[] {
  return read<FeeTemplate[]>(KEYS.feeTemplates, DEFAULT_FEE_TEMPLATES);
}

export function getTemplateForClass(studentClass: string): FeeTemplate | undefined {
  const key = getTemplateKeyForClass(studentClass);
  if (!key) return undefined;
  const templates = getFeeTemplates();
  return templates.find((t) => t.className === key);
}

export function generateFeesForStudent(
  student: Student,
  termLabel: string,
  dueDate: string,
): FeeRow[] {
  const template = getTemplateForClass(student.class);
  if (!template) return [];
  return template.items.map((item, i) => ({
    id: `F-${student.id}-${i}-${Date.now()}`,
    studentId: student.id,
    studentName: student.name,
    term: item.name,
    amount: item.amount,
    paid: 0,
    dueDate,
    status: "Unpaid" as FeeRow["status"],
  }));
}

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

function isFeeTemplatesSeeded() {
  return typeof window !== "undefined" && !!window.localStorage.getItem("termly_fee_templates_seeded_v1");
}

const DEMO_VIRTUAL_ACCOUNTS: Record<string, { accountNumber: string; bankName: string; accountReference: string }> = {
  "Emeka Okonkwo":  { accountNumber: "9901234567", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/001" },
  "Amaka Eze":      { accountNumber: "9907654321", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/002" },
  "Tunde Adeyemi":  { accountNumber: "9909988776", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/003" },
  "Chisom Nwosu":   { accountNumber: "9905544332", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/004" },
  "Ibrahim Musa":   { accountNumber: "9903322110", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/005" },
};

export function demoVirtualAccountFor(student: Student): Student["virtualAccount"] {
  if (DEMO_VIRTUAL_ACCOUNTS[student.name]) return DEMO_VIRTUAL_ACCOUNTS[student.name];
  const digits = student.id.replace(/\D/g, "").slice(-7).padStart(7, "0");
  return {
    accountNumber: `990${digits}`,
    bankName: "Nomba MFB",
    accountReference: `STUDENT-${student.id}`,
  };
}

export function patchStudentsWithDemoAccounts() {
  if (typeof window === "undefined") return;
  const students = read<Student[]>(KEYS.students, []);
  if (students.length === 0) return;
  let changed = false;
  const patched = students.map((s) => {
    if (!s.virtualAccount?.accountNumber) {
      changed = true;
      return { ...s, virtualAccount: demoVirtualAccountFor(s) };
    }
    return s;
  });
  if (changed) write(KEYS.students, patched);
}

export function seedFeeTemplatesIfNeeded() {
  if (isFeeTemplatesSeeded()) return;
  if (typeof window === "undefined") return;
  write(KEYS.feeTemplates, DEFAULT_FEE_TEMPLATES);
  window.localStorage.setItem("termly_fee_templates_seeded_v1", "1");
}

export function seedIfNeeded() {
  seedFeeTemplatesIfNeeded();
  patchStudentsWithDemoAccounts();
  if (!isFirstRun()) return;
  const students: Student[] = seedStudents.map((s) => ({
    id: s.id,
    name: s.name,
    class: s.class,
    parentName: s.parent,
    parentEmail: s.parentEmail,
    virtualAccount: (s as any).virtualAccount ?? demoVirtualAccountFor({ id: s.id, name: s.name } as Student),
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
