import { useEffect, useRef, useState, useCallback } from "react";
import { verifyTransaction } from "../services/nomba";
import { KEYS, read, write, type FeeRow, type TxRow } from "../lib/storage";
import { burstConfetti } from "../lib/confetti";

export type PollState = "idle" | "polling" | "success" | "failed" | "timeout";

export interface PollResult {
  state: PollState;
  amount: number;
  transactionRef: string;
  secondsLeft: number;
  cancel: () => void;
  startPolling: (orderReference: string, feeId: string, feeAmount: number) => void;
}

const POLL_INTERVAL_MS = 4000;
const TIMEOUT_MS = 180000;

export function usePaymentPolling(onSuccess?: () => void): PollResult {
  const [state, setState] = useState<PollState>("idle");
  const [amount, setAmount] = useState(0);
  const [transactionRef, setTransactionRef] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    cleanup();
    setState("idle");
  }, [cleanup]);

  const startPolling = useCallback(
    (orderReference: string, feeId: string, feeAmount: number) => {
      cleanup();
      cancelledRef.current = false;
      setState("polling");
      const deadline = Date.now() + TIMEOUT_MS;

      timerRef.current = setInterval(() => {
        const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        setSecondsLeft(left);
        if (left === 0) {
          cleanup();
          setState("timeout");
        }
      }, 1000);
      setSecondsLeft(Math.round(TIMEOUT_MS / 1000));

      (async () => {
        const start = Date.now();
        while (Date.now() - start < TIMEOUT_MS) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          if (cancelledRef.current) return;
          try {
            const r = await verifyTransaction(orderReference);
            if (cancelledRef.current) return;
            const ok =
              String(r.status).toUpperCase().includes("SUCCESS") ||
              String(r.status).toUpperCase() === "PAID";
            if (ok) {
              cleanup();
              setAmount(Number(r.amount) || feeAmount);
              setTransactionRef(r.transactionRef || orderReference);
              setState("success");
              burstConfetti();

              const fees = read<FeeRow[]>(KEYS.fees, []).map((f) =>
                f.id === feeId ? { ...f, paid: f.amount, status: "Paid" as const } : f,
              );
              write(KEYS.fees, fees);

              const fee = read<FeeRow[]>(KEYS.fees, []).find((f) => f.id === feeId);
              const txs = read<TxRow[]>(KEYS.transactions, []);
              txs.unshift({
                id: `tx_${Date.now()}`,
                date: new Date().toISOString(),
                studentName: fee?.studentName ?? "Student",
                fee: fee?.term ?? "School Fee",
                amount: Number(r.amount) || feeAmount,
                method: "Nomba Checkout",
                reference: r.transactionRef || orderReference,
                status: "Paid",
              });
              write(KEYS.transactions, txs);
              write(KEYS.pendingPayment, null);

              onSuccess?.();
              return;
            }
          } catch {
            /* keep polling */
          }
        }
        if (!cancelledRef.current) {
          cleanup();
          setState("timeout");
        }
      })();
    },
    [cleanup, onSuccess],
  );

  useEffect(() => () => cleanup(), [cleanup]);

  return { state, amount, transactionRef, secondsLeft, cancel, startPolling };
}

export function useResumePendingPayment(onSuccess?: () => void): PollResult {
  const poll = usePaymentPolling(onSuccess);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const pending = read<{ orderReference: string; feeId: string; amount: number; timestamp: number } | null>(
      KEYS.pendingPayment,
      null,
    );
    if (!pending) return;
    const age = Date.now() - (pending.timestamp ?? 0);
    if (age > 180000) {
      write(KEYS.pendingPayment, null);
      return;
    }
    started.current = true;
    poll.startPolling(pending.orderReference, pending.feeId, pending.amount);
  }, [poll]);

  return poll;
}
