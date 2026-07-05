import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { KEYS, read, write, type Student, type FeeRow, type TxRow } from "../lib/storage";
import { fmtNaira } from "../lib/format";

export const Route = createFileRoute("/admin/submission")({ component: Page });

const DEMO_MODE_KEY = "termly_demo_mode";

type ApiEntry = {
  name: string;
  endpoint: string;
  status: "ok" | "error" | "unreachable" | "loading";
  description: string;
};

type HealthResult = {
  env: string;
  timestamp: string;
  authenticated: boolean;
  authError?: string;
  apis: Record<string, Omit<ApiEntry, "status"> & { status: "ok" | "error" | "unreachable" }>;
};

const API_LABELS: Record<string, { icon: string; track: string }> = {
  auth:            { icon: "🔑", track: "Core" },
  checkout:        { icon: "🛒", track: "Build Track – Checkout & Recurring" },
  transfer:        { icon: "💸", track: "Build Track – Payroll" },
  virtualAccounts: { icon: "🏦", track: "Build Track – Virtual Accounts as Infrastructure" },
  directDebit:     { icon: "🔄", track: "Build Track – Checkout & Recurring" },
  bills:           { icon: "⚡", track: "Infrastructure Track" },
};

function StatusDot({ status }: { status: ApiEntry["status"] }) {
  if (status === "loading") return (
    <span className="flex h-3 w-3 items-center justify-center">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </span>
  );
  return (
    <span className={`flex h-3 w-3 shrink-0 rounded-full ${
      status === "ok" ? "bg-success" : status === "error" ? "bg-destructive" : "bg-warning"
    }`} />
  );
}

function StatusPill({ status }: { status: ApiEntry["status"] }) {
  const map = {
    ok: "bg-success/15 text-success border-success/30",
    error: "bg-destructive/15 text-destructive border-destructive/30",
    unreachable: "bg-warning/15 text-warning-foreground border-warning/30",
    loading: "bg-secondary text-muted-foreground border-border",
  };
  const label = { ok: "✓ Connected", error: "✗ Auth Failed", unreachable: "⚠ Pending Auth", loading: "Checking…" };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function Page() {
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [demoMode, setDemoMode] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(DEMO_MODE_KEY);
    return stored === null ? true : stored === "true";
  });

  const students = read<Student[]>(KEYS.students, []);
  const fees = read<FeeRow[]>(KEYS.fees, []);
  const txs = read<TxRow[]>(KEYS.transactions, []);

  const withAccounts = students.filter((s) => s.virtualAccount?.accountNumber).length;
  const totalCollected = fees.reduce((s, f) => s + f.paid, 0);
  const totalTx = txs.length;

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/nomba/health");
      const data: HealthResult = await res.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch {
      setHealth(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { runCheck(); }, [runCheck]);

  function toggleDemoMode() {
    const next = !demoMode;
    setDemoMode(next);
    window.localStorage.setItem(DEMO_MODE_KEY, String(next));
  }

  const apis: (ApiEntry & { key: string })[] = health
    ? Object.entries(health.apis).map(([key, v]) => ({
        key,
        name: v.name,
        endpoint: v.endpoint,
        description: v.description,
        status: checking ? "loading" : v.status,
      }))
    : ["auth","checkout","transfer","virtualAccounts","directDebit","bills"].map((key) => ({
        key, name: key, endpoint: "", description: "", status: "loading" as const,
      }));

  const allOk = health?.authenticated && Object.values(health.apis).every((a) => a.status === "ok");
  const connectedCount = health ? Object.values(health.apis).filter((a) => a.status === "ok").length : 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
                🏆 Nomba Hackathon Submission
              </span>
              {allOk && (
                <span className="rounded-full bg-success px-3 py-0.5 text-xs font-bold text-white">
                  All Systems Go
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Termly</h1>
            <p className="mt-1 text-primary-foreground/80">
              School Fee Collection · Payroll · Utility Payments — Powered by Nomba
            </p>
          </div>
          <img src="/logo.png" alt="Termly" className="hidden h-16 w-16 rounded-xl bg-white object-contain p-1 shadow md:block" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Students", value: students.length },
            { label: "Virtual Accounts", value: withAccounts },
            { label: "Total Collected", value: fmtNaira(totalCollected) },
            { label: "Transactions", value: totalTx },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/10 px-4 py-3 text-center">
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-primary-foreground/70">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo / Live Mode Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        <div>
          <div className="font-semibold">Payment Mode</div>
          <div className="text-sm text-muted-foreground">
            {demoMode
              ? "Demo mode — payments simulated locally, no real Nomba API calls from the UI"
              : "Live mode — payment flows call the real Nomba API via the Express server"}
          </div>
        </div>
        <button
          onClick={toggleDemoMode}
          className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            demoMode ? "bg-secondary" : "bg-success"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
              demoMode ? "translate-x-1" : "translate-x-8"
            }`}
          />
        </button>
      </div>

      {/* Nomba API Integration Status */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-semibold">Nomba API Integration Status</div>
            <div className="text-xs text-muted-foreground">
              {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : "Checking…"}
              {health && (
                <span className={`ml-2 font-medium ${health.authenticated ? "text-success" : "text-warning-foreground"}`}>
                  · {connectedCount}/6 endpoints connected · {(health.env || "test").toUpperCase()} environment
                </span>
              )}
            </div>
          </div>
          <button
            onClick={runCheck}
            disabled={checking}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            {checking ? "Checking…" : "⟳ Re-check"}
          </button>
        </div>

        {health?.authError && (
          <div className="mx-4 mt-4 rounded-md bg-warning/10 border border-warning/30 px-4 py-2.5 text-sm text-warning-foreground">
            <strong>Auth note:</strong> {health.authError} — Live Nomba credentials required for live API calls. Demo mode uses local simulation.
          </div>
        )}

        <div className="divide-y divide-border">
          {apis.map((api, i) => {
            const meta = API_LABELS[api.key] ?? { icon: "🔌", track: "Core" };
            return (
              <div key={api.key} className="flex items-start gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-lg">
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{health?.apis[api.key]?.name ?? api.key}</span>
                    <StatusPill status={api.status} />
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {meta.track}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {health?.apis[api.key]?.description}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-muted-foreground/70">
                    {health?.apis[api.key]?.endpoint}
                  </div>
                </div>
                <div className="mt-1.5">
                  <StatusDot status={api.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracks + Architecture in 2-column */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tracks Covered */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4 font-semibold">Tracks Covered</div>
          <div className="space-y-3 px-5 py-4">
            {[
              { badge: "Build Track", label: "Checkout & Recurring", desc: "Hosted checkout for school fees + Direct Debit installment mandates", icon: "🛒" },
              { badge: "Build Track", label: "Virtual Accounts as Infrastructure", desc: "Every student gets a permanent named Nomba virtual account at registration — zero manual reconciliation", icon: "🏦" },
              { badge: "Infrastructure", label: "Subscriptions Engine", desc: "Automatic installment plan scheduling with payment tracking and status updates", icon: "🔄" },
              { badge: "Infrastructure", label: "KYC-Gated Payment Flow", desc: "BVN verification required before parents can initiate payments", icon: "🪪" },
            ].map((t) => (
              <div key={t.label} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base">{t.icon}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{t.badge}</span>
                    <span className="text-sm font-semibold">{t.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security + Architecture */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4 font-semibold">Security Measures</div>
            <ul className="space-y-2 px-5 py-4 text-sm">
              {[
                "JWT-based auth — all routes role-protected",
                "Bcrypt password hashing (saltRounds: 10)",
                "HMAC SHA-256 webhook signature verification",
                "Rate limiting — 100 req/15 min general, 10 req/min payments",
                "Helmet.js HTTP security headers",
                "Zero credentials in frontend — all Nomba calls server-side only",
                "All secrets in Replit environment secrets",
              ].map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <span className="mt-0.5 text-success">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4 font-semibold">Webhook</div>
            <div className="px-5 py-4 text-sm space-y-1">
              <div className="font-mono text-xs break-all rounded bg-secondary px-3 py-2">
                POST /api/webhooks/nomba
              </div>
              <div className="text-xs text-muted-foreground">
                Events: checkout.completed · transfer.success · transfer.failed · direct_debit.success
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Developer + Live URLs */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card px-5 py-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Developer</div>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">O</div>
            <div>
              <div className="font-bold">Omolayo Paul Adeyemi</div>
              <div className="text-sm text-muted-foreground">First Class Computer Science · TASUED 2025</div>
              <div className="text-sm text-muted-foreground">NYSC — IT Teacher, Bimron Comprehensive College, Lagos</div>
              <div className="text-sm font-medium text-primary">Founder · Glass Nexus Academy EdTech</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-5 py-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Live URLs</div>
          <div className="space-y-3">
            {[
              { label: "App", url: "https://termly-demo--glassnexusacade.replit.app" },
              { label: "Webhook", url: "https://termly-demo--glassnexusacade.replit.app/api/webhooks/nomba" },
            ].map((u) => (
              <div key={u.label}>
                <div className="text-xs font-semibold text-muted-foreground mb-1">{u.label}</div>
                <a
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-all rounded-md bg-secondary/50 px-3 py-2 font-mono text-xs text-primary hover:underline"
                >
                  {u.url}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Webhook Event Log */}
      <WebhookLog />

      {/* Stack */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4 font-semibold">Tech Stack</div>
        <div className="flex flex-wrap gap-2 px-5 py-4">
          {[
            "React 19", "TanStack Router", "Vite 8", "Tailwind CSS 4",
            "Node.js + Express", "Nomba API", "JWT + bcrypt", "Helmet.js",
            "Replit Hosting", "localStorage (demo)", "PostgreSQL (prod)",
          ].map((t) => (
            <span key={t} className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-sm font-medium">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type WebhookEvent = {
  orderReference: string;
  transactionRef: string;
  amount: number;
  status: "SUCCESS" | "FAILED";
  type: string;
  studentName?: string;
  description?: string;
  demo?: boolean;
  receivedAt: number;
};

const EVENT_TYPES = [
  { value: "checkout.completed",   label: "checkout.completed",   icon: "🛒" },
  { value: "transfer.success",     label: "transfer.success",     icon: "💸" },
  { value: "transfer.failed",      label: "transfer.failed",      icon: "❌" },
  { value: "direct_debit.success", label: "direct_debit.success", icon: "🔄" },
];

function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function WebhookLog() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [injecting, setInjecting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const sinceRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/webhooks/recent?since=0`);
      const data = await res.json();
      const incoming: WebhookEvent[] = (data.events ?? []).slice(0, 10);

      setEvents((prev) => {
        const prevIds = new Set(prev.map((e) => e.orderReference));
        const freshIds = incoming
          .filter((e) => !prevIds.has(e.orderReference))
          .map((e) => e.orderReference);
        if (freshIds.length) setNewIds(new Set(freshIds));
        return incoming;
      });
    } catch { /* server may be starting */ }
  }, []);

  useEffect(() => {
    poll();
  }, [poll]);

  useEffect(() => {
    if (!autoRefresh) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(poll, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, poll]);

  // Clear "new" highlight after 3s
  useEffect(() => {
    if (newIds.size === 0) return;
    const t = setTimeout(() => setNewIds(new Set()), 3000);
    return () => clearTimeout(t);
  }, [newIds]);

  async function inject(type: string) {
    setInjecting(true);
    try {
      await fetch("/api/webhooks/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      await poll();
    } finally {
      setInjecting(false);
    }
  }

  const typeIcon: Record<string, string> = {
    "checkout.completed":   "🛒",
    "transfer.success":     "💸",
    "transfer.failed":      "❌",
    "direct_debit.success": "🔄",
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-lg">📡</span>
            {autoRefresh && (
              <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
            )}
          </div>
          <div>
            <div className="font-semibold">Live Webhook Event Log</div>
            <div className="text-xs text-muted-foreground">
              Showing last 10 events · auto-refreshes every 3 s
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              autoRefresh
                ? "border-success/40 bg-success/10 text-success"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            {autoRefresh ? "● Live" : "○ Paused"}
          </button>
          <button
            onClick={poll}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            ⟳ Refresh
          </button>
        </div>
      </div>

      {/* Inject demo events */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/20 px-5 py-3">
        <span className="text-xs font-semibold text-muted-foreground">Inject demo event:</span>
        {EVENT_TYPES.map((et) => (
          <button
            key={et.value}
            onClick={() => inject(et.value)}
            disabled={injecting}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
          >
            {et.icon} {et.label}
          </button>
        ))}
      </div>

      {/* Event rows */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-muted-foreground">
          <span className="text-3xl">📭</span>
          <div className="text-sm font-medium">No webhook events received yet</div>
          <div className="text-xs">Use the buttons above to inject a demo event, or trigger a real payment flow</div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {events.map((ev) => {
            const isNew = newIds.has(ev.orderReference);
            const isSuccess = ev.status === "SUCCESS";
            return (
              <div
                key={ev.orderReference}
                className={`flex items-start gap-4 px-5 py-3.5 transition-colors duration-700 ${
                  isNew ? "bg-success/5" : ""
                }`}
              >
                {/* Icon */}
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
                  isSuccess ? "bg-success/10" : "bg-destructive/10"
                }`}>
                  {typeIcon[ev.type] ?? "🔔"}
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">{ev.type}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isSuccess
                        ? "bg-success/15 text-success"
                        : "bg-destructive/15 text-destructive"
                    }`}>
                      {ev.status}
                    </span>
                    {ev.demo && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        DEMO
                      </span>
                    )}
                    {isNew && (
                      <span className="animate-pulse rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white">
                        NEW
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {ev.description ?? ev.studentName ?? ev.orderReference}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground/70">
                    <span className="font-mono">{ev.orderReference}</span>
                    {ev.amount > 0 && (
                      <span className={`font-semibold ${isSuccess ? "text-success" : "text-destructive"}`}>
                        {fmtNaira(ev.amount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                  {timeAgo(ev.receivedAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <div className="border-t border-border px-5 py-2 text-center text-xs text-muted-foreground">
          {events.length} event{events.length !== 1 ? "s" : ""} shown · Webhook endpoint: <span className="font-mono">/api/webhooks/nomba</span>
        </div>
      )}
    </div>
  );
}
