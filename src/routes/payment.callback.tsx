import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { friendlyError, verifyTransaction } from "../services/nomba";
import { KEYS, read, write, type FeeRow, type TxRow } from "../lib/storage";
import { fmtNaira, fmtDate } from "../lib/format";
import { burstConfetti } from "../lib/confetti";
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
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!orderReference) throw new Error("Missing order reference");
        const r = await verifyTransaction(orderReference);
        if (cancelled) return;
        if (String(r.status).toUpperCase().includes("SUCCESS") || String(r.status).toUpperCase() === "PAID") {
          setAmount(Number(r.amount) || 0);
          setTransactionRef(r.transactionRef);
          setState("success");
          burstConfetti();
          const pending = read<{ orderReference: string; feeId: string; amount: number } | null>(KEYS.pendingPayment, null);
          if (pending && pending.orderReference === orderReference) {
            const fees = read<FeeRow[]>(KEYS.fees, []);
            write(
              KEYS.fees,
              fees.map((f) => (f.id === pending.feeId ? { ...f, paid: f.amount, status: "Paid" as const } : f)),
            );
            const txs = read<TxRow[]>(KEYS.transactions, []);
            const fee = fees.find((f) => f.id === pending.feeId);
            txs.unshift({
              id: `tx_${Date.now()}`,
              date: new Date().toISOString(),
              studentName: fee?.studentName ?? "Student",
              fee: fee?.term ?? "School Fee",
              amount: pending.amount,
              method: "Nomba Checkout",
              reference: r.transactionRef || orderReference,
              status: "Paid",
            });
            write(KEYS.transactions, txs);
            write(KEYS.pendingPayment, null);
          }
          setTimeout(() => nav({ to: "/parent/dashboard" }), 5000);
        } else {
          setState("failed");
        }
      } catch (e) {
        if (cancelled) return;
        setErrMsg(friendlyError(e));
        setState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderReference, nav]);

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-16">
      {state === "loading" && (
        <div className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow">
          <Spinner size={36} className="mx-auto text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Verifying your payment…</h1>
          <p className="mt-1 text-sm text-muted-foreground">This will only take a moment.</p>
          <div className="mt-5 flex justify-center"><SecuredByNomba /></div>
        </div>
      )}
      {state === "success" && (
        <div className="w-full rounded-2xl border border-success/30 bg-success-soft p-8 text-center shadow">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-2xl text-white">✓</div>
          <h1 className="mt-3 text-2xl font-bold text-success">Payment Confirmed!</h1>
          <p className="mt-1 text-sm text-foreground">Amount: <strong>{fmtNaira(amount)}</strong></p>
          <p className="text-sm text-foreground">Reference: <code className="text-xs">{transactionRef}</code></p>
          <p className="text-sm text-muted-foreground">Date: {fmtDate(new Date())}</p>
          <Link to="/parent/dashboard" className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Back to Dashboard</Link>
          <p className="mt-3 text-xs text-muted-foreground">Redirecting in 5 seconds…</p>
        </div>
      )}
      {state === "failed" && (
        <div className="w-full rounded-2xl border border-destructive/30 bg-danger-soft p-8 text-center shadow">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-2xl text-white">✕</div>
          <h1 className="mt-3 text-2xl font-bold text-destructive">Payment Could Not Be Verified</h1>
          <p className="mt-1 text-sm text-foreground">{errMsg || "Please contact the school if money was deducted."}</p>
          <Link to="/parent/dashboard" className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Back to Dashboard</Link>
        </div>
      )}
    </main>
  );
}