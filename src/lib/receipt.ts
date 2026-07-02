import jsPDF from "jspdf";
import { fmtNaira, fmtDate } from "./format";

export type ReceiptData = {
  reference: string;
  date: string | Date;
  studentName: string;
  feeType: string;
  amount: number;
  method: string;
};

export function downloadReceipt(r: ReceiptData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 60;

  doc.setFillColor(15, 52, 96);
  doc.rect(0, 0, w, 120, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("Termly", w / 2, 50, { align: "center" });
  doc.setFontSize(14);
  doc.text("OFFICIAL PAYMENT RECEIPT", w / 2, 75, { align: "center" });
  doc.setFontSize(10);
  doc.text("Every Term, On Time", w / 2, 95, { align: "center" });

  doc.setTextColor(40, 40, 40);
  y = 160;
  doc.setFontSize(11);
  doc.text(`Receipt No: ${r.reference}`, 60, y);
  doc.text(`Date: ${fmtDate(r.date)}`, w - 60, y, { align: "right" });

  function section(title: string) {
    y += 30;
    doc.setDrawColor(220);
    doc.line(60, y, w - 60, y);
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 60, y);
    doc.setFont("helvetica", "normal");
  }

  function row(k: string, v: string) {
    y += 20;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(k, 60, y);
    doc.setTextColor(20);
    doc.text(v, 200, y);
  }

  section("STUDENT DETAILS");
  row("Name:", r.studentName);
  row("Fee Type:", r.feeType);

  section("PAYMENT DETAILS");
  row("Amount:", fmtNaira(r.amount));
  row("Method:", r.method);
  row("Currency:", "NGN");
  row("Status:", "PAID ✓");

  y += 40;
  doc.setDrawColor(220);
  doc.line(60, y, w - 60, y);
  y += 25;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Powered by Nomba", w / 2, y, { align: "center" });
  y += 14;
  doc.text("Computer generated receipt — no signature required", w / 2, y, { align: "center" });

  doc.save(`Termly-Receipt-${r.reference}.pdf`);
}

export type SavingsReceiptData = {
  reference: string;
  date: string | Date;
  studentName: string;
  admissionNumber: string;
  studentClass: string;
  feeType: string;
  totalFee: number;
  paidFromSavings: number;
  outstanding: number;
  status: "PAID" | "PARTIAL";
  accountNumber?: string;
  bankName?: string;
};

export function downloadSavingsReceipt(r: SavingsReceiptData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 60;

  doc.setFillColor(15, 52, 96);
  doc.rect(0, 0, w, 120, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("Termly", w / 2, 50, { align: "center" });
  doc.setFontSize(14);
  doc.text("SAVINGS PAYMENT RECEIPT", w / 2, 75, { align: "center" });
  doc.setFontSize(10);
  doc.text("Every Term, On Time", w / 2, 95, { align: "center" });

  doc.setTextColor(40, 40, 40);
  y = 160;
  doc.setFontSize(11);
  doc.text(`Receipt No: ${r.reference}`, 60, y);
  doc.text(`Date: ${fmtDate(r.date)}`, w - 60, y, { align: "right" });

  function section(title: string) {
    y += 30;
    doc.setDrawColor(220);
    doc.line(60, y, w - 60, y);
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 60, y);
    doc.setFont("helvetica", "normal");
  }

  function row(k: string, v: string) {
    y += 20;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(k, 60, y);
    doc.setTextColor(20);
    doc.text(v, 220, y);
  }

  section("STUDENT DETAILS");
  row("Name:", r.studentName);
  row("Admission:", r.admissionNumber);
  row("Class:", r.studentClass);

  section("PAYMENT DETAILS");
  row("Fee Type:", r.feeType);
  row("Total Fee:", fmtNaira(r.totalFee));
  row("Paid from Savings:", fmtNaira(r.paidFromSavings));
  row("Outstanding:", fmtNaira(r.outstanding));
  row("Status:", r.status === "PAID" ? "PAID ✓" : "PARTIAL ⚠");

  if (r.accountNumber) {
    section("SAVINGS ACCOUNT");
    row("Account:", r.accountNumber);
    if (r.bankName) row("Bank:", r.bankName);
  }

  y += 40;
  doc.setDrawColor(220);
  doc.line(60, y, w - 60, y);
  y += 25;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Powered by Nomba", w / 2, y, { align: "center" });
  y += 14;
  doc.text("Computer generated receipt — no signature required", w / 2, y, { align: "center" });

  doc.save(`Termly-Savings-Receipt-${r.reference}.pdf`);
}