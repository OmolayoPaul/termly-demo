import { useState } from "react";
import { fmtNaira } from "../lib/format";
import { burstConfetti } from "../lib/confetti";
import { Spinner } from "./Spinner";

export interface DemoPaymentConfig {
  headerEmoji: string;
  headerLabel: string;
  fromLabel?: string;
  fromName: string;
  fromBalance: number;
  fromAccount: string;
  fromBank: string;
  toLabel?: string;
  toName: string;
  toAccount?: string;
  toBank?: string;
  amount: number;
  description?: string;
  confirmLabel?: string;
}

interface Props {
  config: DemoPaymentConfig;
  onConfirm: () => string;
  onSuccess: (ref: string) => void;
  onClose: () => void;
}

type Stage = "preview" | "connecting" | "processing" | "done";

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

export function DemoPaymentModal({ config, onConfirm, onSuccess, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("preview");
  const [progress, setProgress] = useState(0);
  const [txRef, setTxRef] = useState("");

  async function handleConfirm() {
    setStage("connecting");
    await delay(1200);

    setStage("processing");
    const duration = 2200;
    const start = Date.now();
    await new Promise<void>((resolve) => {
      function tick() {
        const p = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
        setProgress(p);
        if (p < 100) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });

    const ref = onConfirm();
    setTxRef(ref);
    setStage("done");
    setTimeout(() => burstConfetti(), 80);
    onSuccess(ref);
  }

  const canClose = stage === "preview" || stage === "done";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/70 p-4"
      onClick={canClose ? onClose : undefined}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-primary px-5 py-4 text-primary-foreground">
          <div className="text-sm font-bold tracking-wide">
            {config.headerEmoji} {config.headerLabel}
          </div>
          {config.description && (
            <div className="mt-0.5 text-xs text-primary-foreground/70">{config.description}</div>
          )}
        </div>

        {stage === "preview" && (
          <>
            <div className="border-b border-border px-5 py-4 text-center">
              <div className="text-xs text-muted-foreground">Amount</div>
              <div className="mt-1 text-3xl font-bold">{fmtNaira(config.amount)}</div>
            </div>

            <div className="mx-4 mt-4 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {config.fromLabel ?? "FROM"}
              </div>
              <div className="font-semibold">{config.fromName}</div>
              <div className="text-xs text-muted-foreground">Balance: {fmtNaira(config.fromBalance)}</div>
              <div className="text-xs text-muted-foreground">
                Account: {config.fromAccount} ({config.fromBank})
              </div>
            </div>

            <div className="flex items-center justify-center py-2 text-xl text-muted-foreground">↓</div>

            <div className="mx-4 mb-5 rounded-lg border border-success/30 bg-success-soft/50 px-4 py-3 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {config.toLabel ?? "TO"}
              </div>
              <div className="font-semibold">{config.toName}</div>
              {config.toAccount && (
                <div className="text-xs text-muted-foreground">
                  Account: {config.toAccount} ({config.toBank})
                </div>
              )}
            </div>

            <div className="flex gap-3 px-4 pb-5">
              <button
                onClick={onClose}
                className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {config.confirmLabel ?? "Confirm Payment"}
              </button>
            </div>
          </>
        )}

        {stage === "connecting" && (
          <div className="flex flex-col items-center justify-center gap-4 px-5 py-14">
            <Spinner size={40} />
            <div className="text-center">
              <div className="font-semibold">Connecting to Nomba...</div>
              <div className="mt-1 text-xs text-muted-foreground">Establishing secure connection</div>
            </div>
          </div>
        )}

        {stage === "processing" && (
          <div className="px-5 py-10">
            <div className="mb-6 text-center">
              <div className="mb-3 text-4xl">⚡</div>
              <div className="font-semibold">Processing via Nomba...</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {fmtNaira(config.amount)} in transit
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-right text-xs text-muted-foreground">{progress}%</div>
          </div>
        )}

        {stage === "done" && (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success text-3xl text-white">
              ✓
            </div>
            <div className="text-xl font-bold text-success">Transfer Complete!</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {fmtNaira(config.amount)} sent successfully
            </div>
            <div className="mt-3 break-all rounded-md bg-secondary px-3 py-2 font-mono text-xs text-muted-foreground">
              {txRef}
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-md bg-success py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
