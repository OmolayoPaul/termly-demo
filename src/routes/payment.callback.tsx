import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { friendlyError, verifyTransaction } from "../services/nomba";
import { KEYS, read, write, type FeeRow, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { burstConfetti } from "../lib/confetti";
import { downloadReceipt } from "../lib/receipt";
import { Spinner } from "../components/Spinner";
import { SecuredByNomba } from "../components/TestModeBanner";

export const Route = createFileRoute("/payment/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    orderReference: typeof s.orderReference === "string" ? s.orderReference : "",
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const { orderReference } = Route.useSearch();
  const nav = useNavigate();
  const [state, setState] = useState<"loading" | "success" | "failed">("loading");
  const [amount, setAmount] = useState(0);
  const [transactionRef, setTransactionRef] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [feeType, setFeeType] = useState("School Fee");
  const [errMsg, setErrMsg] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!orderReference) throw new Error("Missing order reference");
        const r = await verifyTransaction(orderReference);
        if (cancelled) return;
        if (String(r.status).toUpperCase().includes("SUCCESS") || String(r.status).toUpperCase() === "PAID") {
          const resolvedAmount = Number(r.amount) || 0;
          const resolvedRef = r.transactionRef || orderReference;
          setAmount(resolvedAmount);
          setTransactionRef(resolvedRef);
          setState("success");
          burstConfetti();

          const pending = read<{ orderReference: string; feeId: string; amount: number } | null>(
            KEYS.pendingPayment,
            null,
          );
          if (pending && pending.orderReference === orderReference) {
            const fees = read<FeeRow[]>(KEYS.fees, []);
            const fee = fees.find((f) => f.id === pending.feeId);
            if (fee) {
              setStudentName(fee.studentName);
              setFeeType(fee.term);
            }
            write(
              KEYS.fees,
              fees.map((f) => (f.id === pending.feeId ? { ...f, paid: f.amount, status: "Paid" as const } : f)),
            );
            const txs = read<TxRow[]>(KEYS.transactions, []);
            txs.unshift({
              id: `tx_${Date.now()}`,
              date: new Date().toISOString(),
              studentName: fee?.studentName ?? "Student",
              fee: fee?.term ?? "School Fee",
              amount: pending.amount,
              method: "Nomba Checkout",
              reference: resolvedRef,
              status: "Paid",
            });
            write(KEYS.transactions, txs);
            write(KEYS.pendingPayment, null);
          }
          setTimeout(() => nav({ to: "/parent/dashboard" }), 8000);
        } else {
          setState("failed");
        }
      } catch (e) {
        if (cancelled) return;
        setErrMsg(friendlyError(e));
        setState("failed");
      }
    })();
    return () => { cancelled = true; };
  }, [orderReference, nav]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadReceipt({
        reference: transactionRef || orderReference,
        date: new Date(),
        studentName,
        feeType,
        amount,
        method: "Nomba Checkout",
      });
    } finally {
      setDownloading(false);
    }
  }, [transactionRef, orderReference, studentName, feeType, amount]);

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-16">
      {state === "loading" && (
        <div className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow">
          <Spinner size={36} className="mx-auto text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Verifying your payment…</h1>
          <p className="mt-1 text-sm text-muted-foreground">This will only take a moment.</p>
          <div className="mt-5 flex justify-center">
            <SecuredByNomba />
          </div>
        </div>
      )}

      {state === "success" && (
        <div className="w-full rounded-2xl border border-success/30 bg-success-soft p-8 text-center shadow">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-2xl text-white">
            ✓
          </div>
          <h1 className="mt-3 text-2xl font-bold text-success">Payment Confirmed!</h1>

          <div className="mt-3 rounded-lg border border-success/20 bg-white/60 px-4 py-3 text-left text-sm">
            <div className="flex justify-between py-1 border-b border-success/10">
              <span className="text-muted-foreground">Student</span>
              <span className="font-medium">{studentName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-success/10">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-medium">{feeType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-success/10">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-success">{fmtNaira(amount)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-success/10">
              <span className="text-muted-foreground">Reference</span>
              <code className="text-xs">{transactionRef}</code>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Date</span>
              <span>{fmtDate(new Date())}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-success px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-success/90 disabled:opacity-60 transition-opacity"
            >
              {downloading ? (
                <>
                  <Spinner size={14} className="text-white" /> Generating PDF…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                  Download Receipt (PDF)
                </>
              )}
            </button>
            <Link
              to="/parent/dashboard"
              className="inline-block rounded-md border border-success/40 px-4 py-2 text-sm font-medium text-success hover:bg-success/5"
            >
              Back to Dashboard
            </Link>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">Redirecting in 8 seconds…</p>
        </div>
      )}

      {state === "failed" && (
        <div className="w-full rounded-2xl border border-destructive/30 bg-danger-soft p-8 text-center shadow">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-2xl text-white">
            ✕
          </div>
          <h1 className="mt-3 text-2xl font-bold text-destructive">Payment Could Not Be Verified</h1>
          <p className="mt-1 text-sm text-foreground">
            {errMsg || "Please contact the school if money was deducted."}
          </p>
          <Link
            to="/parent/dashboard"
            className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Back to Dashboard
          </Link>
        </div>
      )}
    </main>
  );
}
