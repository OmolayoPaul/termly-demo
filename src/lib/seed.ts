export const students = [
  { id: "TML/2024/001", name: "Emeka Okonkwo", class: "JSS 3A", parent: "Mr. Chidi Okonkwo", parentEmail: "chidi@example.com" },
  { id: "TML/2024/002", name: "Amaka Eze", class: "JSS 2B", parent: "Mrs. Grace Eze", parentEmail: "grace@example.com" },
  { id: "TML/2024/003", name: "Tunde Adeyemi", class: "SSS 1C", parent: "Mr. Sola Adeyemi", parentEmail: "sola@example.com" },
  { id: "TML/2024/004", name: "Chisom Nwosu", class: "SSS 2A", parent: "Dr. Ngozi Nwosu", parentEmail: "ngozi@example.com" },
  { id: "TML/2024/005", name: "Ibrahim Musa", class: "JSS 1A", parent: "Alhaji Musa Ibrahim", parentEmail: "musa@example.com" },
];

export type FeeStatus = "Paid" | "Partial" | "Pending" | "Overdue";

export const fees: {
  id: string; student: string; title: string; amount: number; paid: number;
  dueDate: string; status: FeeStatus;
}[] = [
  { id: "F1", student: "Emeka Okonkwo", title: "School Fees", amount: 45000, paid: 45000, dueDate: "31 Jan 2026", status: "Paid" },
  { id: "F2", student: "Emeka Okonkwo", title: "Development Levy", amount: 10000, paid: 5000, dueDate: "28 Feb 2026", status: "Partial" },
  { id: "F3", student: "Amaka Eze", title: "School Fees", amount: 45000, paid: 0, dueDate: "31 Jan 2026", status: "Overdue" },
  { id: "F4", student: "Amaka Eze", title: "Library Fee", amount: 3000, paid: 3000, dueDate: "15 Feb 2026", status: "Paid" },
  { id: "F5", student: "Tunde Adeyemi", title: "School Fees", amount: 55000, paid: 55000, dueDate: "31 Jan 2026", status: "Paid" },
  { id: "F6", student: "Tunde Adeyemi", title: "Exam Fee", amount: 8000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },
  { id: "F7", student: "Chisom Nwosu", title: "School Fees", amount: 55000, paid: 20000, dueDate: "31 Jan 2026", status: "Partial" },
  { id: "F8", student: "Ibrahim Musa", title: "School Fees", amount: 40000, paid: 0, dueDate: "28 Feb 2026", status: "Pending" },
];

export const installments: {
  id: string; student: string; ref: string; amount: number; paid: number;
  dueDate: string; status: "Paid" | "Pending";
}[] = [
  { id: "I1", student: "Emeka Okonkwo", ref: "Fee #2", amount: 5000, paid: 5000, dueDate: "28 Feb 2026", status: "Paid" },
  { id: "I2", student: "Emeka Okonkwo", ref: "Fee #2", amount: 5000, paid: 0, dueDate: "31 Mar 2026", status: "Pending" },
  { id: "I3", student: "Chisom Nwosu", ref: "Fee #7", amount: 20000, paid: 20000, dueDate: "28 Feb 2026", status: "Paid" },
  { id: "I4", student: "Chisom Nwosu", ref: "Fee #7", amount: 15000, paid: 0, dueDate: "31 Mar 2026", status: "Pending" },
  { id: "I5", student: "Chisom Nwosu", ref: "Fee #7", amount: 20000, paid: 0, dueDate: "30 Apr 2026", status: "Pending" },
];

export const payroll: {
  id: string; teacher: string; subject: string; month: string;
  amount: number; status: "Paid" | "Pending";
}[] = [
  { id: "P1", teacher: "Mr. Adewale Okafor", subject: "Mathematics", month: "January 2026", amount: 85000, status: "Paid" },
  { id: "P2", teacher: "Mr. Adewale Okafor", subject: "Mathematics", month: "February 2026", amount: 85000, status: "Paid" },
  { id: "P3", teacher: "Mrs. Fatima Aliyu", subject: "English Language", month: "January 2026", amount: 75000, status: "Paid" },
  { id: "P4", teacher: "Mrs. Fatima Aliyu", subject: "English Language", month: "February 2026", amount: 75000, status: "Paid" },
  { id: "P5", teacher: "Mr. Emeka Chukwu", subject: "Physics", month: "January 2026", amount: 80000, status: "Paid" },
  { id: "P6", teacher: "Mr. Emeka Chukwu", subject: "Physics", month: "February 2026", amount: 80000, status: "Pending" },
  { id: "P7", teacher: "Mr. Adewale Okafor", subject: "Mathematics", month: "March 2026", amount: 85000, status: "Paid" },
];

export const bills: {
  id: string; title: string; vendor: string; category: string; amount: number;
  dueDate: string; status: "Paid" | "Overdue" | "Pending";
}[] = [
  { id: "B1", title: "Electricity Bill", vendor: "AEDC", category: "Utilities", amount: 45000, dueDate: "15 Jan 2026", status: "Paid" },
  { id: "B2", title: "Water Supply", vendor: "FCT Water Board", category: "Utilities", amount: 12000, dueDate: "31 Mar 2026", status: "Overdue" },
  { id: "B3", title: "Maintenance - Generator", vendor: "PowerFix Ltd", category: "Maintenance", amount: 35000, dueDate: "10 Feb 2026", status: "Paid" },
  { id: "B4", title: "Stationery & Supplies", vendor: "OfficeMart Nigeria", category: "Supplies", amount: 28000, dueDate: "15 Mar 2026", status: "Overdue" },
  { id: "B5", title: "Security Services", vendor: "SafeGuard Security", category: "Services", amount: 60000, dueDate: "31 Jan 2026", status: "Overdue" },
  { id: "B6", title: "Internet & Phone", vendor: "Spectranet", category: "Utilities", amount: 15000, dueDate: "31 Mar 2026", status: "Overdue" },
];

export const transactions: {
  id: string; date: string; student: string; fee: string;
  amount: number; method: "Bank Transfer" | "Cash" | "Card" | "Online";
  reference: string;
}[] = [
  { id: "T1", date: "28 Jun 2026", student: "Emeka Okonkwo", fee: "School Fees", amount: 45000, method: "Bank Transfer", reference: "TXN/2026/001" },
  { id: "T2", date: "28 Jun 2026", student: "Emeka Okonkwo", fee: "Development Levy", amount: 5000, method: "Cash", reference: "TXN/2026/002" },
  { id: "T3", date: "28 Jun 2026", student: "Amaka Eze", fee: "Library Fee", amount: 3000, method: "Card", reference: "TXN/2026/003" },
  { id: "T4", date: "28 Jun 2026", student: "Tunde Adeyemi", fee: "School Fees", amount: 55000, method: "Online", reference: "TXN/2026/004" },
  { id: "T5", date: "28 Jun 2026", student: "Chisom Nwosu", fee: "School Fees", amount: 20000, method: "Bank Transfer", reference: "TXN/2026/005" },
];

export function nairaFmt(n: number) {
  return "₦" + n.toLocaleString();
}
export function ngnFmt(n: number) {
  return "NGN " + n.toLocaleString();
}