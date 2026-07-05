export const DEMO_PARENT_EMAIL = "parent@termly.com";

export const students = [
  {
    id: "TML/2024/006", name: "Jack Omolayo", class: "SS 1A",
    parent: "Demo Parent", parentEmail: "parent@termly.com",
    virtualAccount: { accountNumber: "9906677889", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/006" },
  },
  {
    id: "TML/2024/001", name: "Emeka Okonkwo", class: "JSS 3A",
    parent: "Mr. Chidi Okonkwo", parentEmail: "chidi@example.com",
    virtualAccount: { accountNumber: "9901234567", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/001" },
  },
  {
    id: "TML/2024/002", name: "Amaka Eze", class: "JSS 2B",
    parent: "Mrs. Grace Eze", parentEmail: "grace@example.com",
    virtualAccount: { accountNumber: "9907654321", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/002" },
  },
  {
    id: "TML/2024/003", name: "Tunde Adeyemi", class: "SS 1C",
    parent: "Mr. Sola Adeyemi", parentEmail: "sola@example.com",
    virtualAccount: { accountNumber: "9909988776", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/003" },
  },
  {
    id: "TML/2024/004", name: "Chisom Nwosu", class: "SS 2A",
    parent: "Dr. Ngozi Nwosu", parentEmail: "ngozi@example.com",
    virtualAccount: { accountNumber: "9905544332", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/004" },
  },
  {
    id: "TML/2024/005", name: "Ibrahim Musa", class: "JSS 1A",
    parent: "Alhaji Musa Ibrahim", parentEmail: "musa@example.com",
    virtualAccount: { accountNumber: "9903322110", bankName: "Nomba MFB", accountReference: "STUDENT-TML/2024/005" },
  },
];

export type FeeStatus = "Paid" | "Partial" | "Pending" | "Overdue";

export const fees: {
  id: string; student: string; title: string; amount: number; paid: number;
  dueDate: string; status: FeeStatus;
}[] = [
  { id: "F26", student: "Jack Omolayo", title: "School Fees",       amount: 190000, paid: 0, dueDate: "31 Jan 2027", status: "Pending" },
  { id: "F27", student: "Jack Omolayo", title: "Development Levy",  amount:  25000, paid: 0, dueDate: "28 Feb 2027", status: "Pending" },
  { id: "F28", student: "Jack Omolayo", title: "Library Fee",       amount:   7000, paid: 0, dueDate: "28 Feb 2027", status: "Pending" },
  { id: "F29", student: "Jack Omolayo", title: "Exam Fee",          amount:  18000, paid: 0, dueDate: "15 Mar 2027", status: "Pending" },
  { id: "F30", student: "Jack Omolayo", title: "PTA Levy",          amount:  10000, paid: 0, dueDate: "15 Mar 2027", status: "Pending" },

  { id: "F1", student: "Emeka Okonkwo", title: "School Fees", amount: 150000, paid: 150000, dueDate: "31 Jan 2026", status: "Paid" },
  { id: "F2", student: "Emeka Okonkwo", title: "Development Levy", amount: 20000, paid: 10000, dueDate: "28 Feb 2026", status: "Partial" },
  { id: "F3", student: "Emeka Okonkwo", title: "Library Fee", amount: 5000, paid: 0, dueDate: "28 Feb 2026", status: "Pending" },
  { id: "F4", student: "Emeka Okonkwo", title: "Exam Fee", amount: 15000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },
  { id: "F5", student: "Emeka Okonkwo", title: "PTA Levy", amount: 10000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },

  { id: "F6", student: "Amaka Eze", title: "School Fees", amount: 110000, paid: 0, dueDate: "31 Jan 2026", status: "Overdue" },
  { id: "F7", student: "Amaka Eze", title: "Development Levy", amount: 15000, paid: 0, dueDate: "28 Feb 2026", status: "Pending" },
  { id: "F8", student: "Amaka Eze", title: "Library Fee", amount: 5000, paid: 5000, dueDate: "15 Feb 2026", status: "Paid" },
  { id: "F9", student: "Amaka Eze", title: "Exam Fee", amount: 12000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },
  { id: "F10", student: "Amaka Eze", title: "PTA Levy", amount: 8000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },

  { id: "F11", student: "Tunde Adeyemi", title: "School Fees", amount: 190000, paid: 190000, dueDate: "31 Jan 2026", status: "Paid" },
  { id: "F12", student: "Tunde Adeyemi", title: "Development Levy", amount: 25000, paid: 0, dueDate: "28 Feb 2026", status: "Pending" },
  { id: "F13", student: "Tunde Adeyemi", title: "Library Fee", amount: 7000, paid: 7000, dueDate: "15 Feb 2026", status: "Paid" },
  { id: "F14", student: "Tunde Adeyemi", title: "Exam Fee", amount: 18000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },
  { id: "F15", student: "Tunde Adeyemi", title: "PTA Levy", amount: 10000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },

  { id: "F16", student: "Chisom Nwosu", title: "School Fees", amount: 230000, paid: 80000, dueDate: "31 Jan 2026", status: "Partial" },
  { id: "F17", student: "Chisom Nwosu", title: "Development Levy", amount: 30000, paid: 0, dueDate: "28 Feb 2026", status: "Pending" },
  { id: "F18", student: "Chisom Nwosu", title: "Library Fee", amount: 7000, paid: 0, dueDate: "15 Feb 2026", status: "Pending" },
  { id: "F19", student: "Chisom Nwosu", title: "Exam Fee", amount: 23000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },
  { id: "F20", student: "Chisom Nwosu", title: "PTA Levy", amount: 10000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },

  { id: "F21", student: "Ibrahim Musa", title: "School Fees", amount: 70000, paid: 0, dueDate: "28 Feb 2026", status: "Pending" },
  { id: "F22", student: "Ibrahim Musa", title: "Development Levy", amount: 10000, paid: 0, dueDate: "28 Feb 2026", status: "Pending" },
  { id: "F23", student: "Ibrahim Musa", title: "Library Fee", amount: 5000, paid: 0, dueDate: "28 Feb 2026", status: "Pending" },
  { id: "F24", student: "Ibrahim Musa", title: "Exam Fee", amount: 8000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },
  { id: "F25", student: "Ibrahim Musa", title: "PTA Levy", amount: 7000, paid: 0, dueDate: "15 Mar 2026", status: "Pending" },
];

export const installments: {
  id: string; student: string; ref: string; amount: number; paid: number;
  dueDate: string; status: "Paid" | "Pending";
}[] = [
  { id: "I1", student: "Emeka Okonkwo", ref: "Fee #2", amount: 10000, paid: 10000, dueDate: "28 Feb 2026", status: "Paid" },
  { id: "I2", student: "Emeka Okonkwo", ref: "Fee #2", amount: 10000, paid: 0, dueDate: "31 Mar 2026", status: "Pending" },
  { id: "I3", student: "Chisom Nwosu", ref: "Fee #16", amount: 80000, paid: 80000, dueDate: "28 Feb 2026", status: "Paid" },
  { id: "I4", student: "Chisom Nwosu", ref: "Fee #16", amount: 75000, paid: 0, dueDate: "31 Mar 2026", status: "Pending" },
  { id: "I5", student: "Chisom Nwosu", ref: "Fee #16", amount: 75000, paid: 0, dueDate: "30 Apr 2026", status: "Pending" },
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
  { id: "T1", date: "28 Jun 2026", student: "Emeka Okonkwo", fee: "School Fees", amount: 150000, method: "Bank Transfer", reference: "TXN/2026/001" },
  { id: "T2", date: "28 Jun 2026", student: "Emeka Okonkwo", fee: "Development Levy", amount: 10000, method: "Cash", reference: "TXN/2026/002" },
  { id: "T3", date: "28 Jun 2026", student: "Amaka Eze", fee: "Library Fee", amount: 5000, method: "Card", reference: "TXN/2026/003" },
  { id: "T4", date: "28 Jun 2026", student: "Tunde Adeyemi", fee: "School Fees", amount: 190000, method: "Online", reference: "TXN/2026/004" },
  { id: "T5", date: "28 Jun 2026", student: "Tunde Adeyemi", fee: "Library Fee", amount: 7000, method: "Bank Transfer", reference: "TXN/2026/005" },
  { id: "T6", date: "28 Jun 2026", student: "Chisom Nwosu", fee: "School Fees", amount: 80000, method: "Bank Transfer", reference: "TXN/2026/006" },
];

export function nairaFmt(n: number) {
  return "₦" + n.toLocaleString();
}
export function ngnFmt(n: number) {
  return "NGN " + n.toLocaleString();
}
