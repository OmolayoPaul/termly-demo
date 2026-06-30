import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { clearSession, getSession } from "../lib/auth";

export const Route = createFileRoute("/parent")({ component: ParentLayout });

const nav: { to: string; label: string; exact?: boolean }[] = [
  { to: "/parent/dashboard", label: "Dashboard" },
  { to: "/parent/fees", label: "Pay Fees" },
  { to: "/parent/installments", label: "Installments" },
  { to: "/parent/transactions", label: "Transactions" },
];

function ParentLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "parent") navigate({ to: "/" });
  }, [navigate]);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="text-lg font-bold">Termly <span className="text-muted-foreground font-medium">Parent</span></div>
          <div className="flex items-center gap-5 text-sm">
            {nav.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to as string} className={active ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}>
                  {n.label}
                </Link>
              );
            })}
            <button onClick={() => { clearSession(); navigate({ to: "/" }); }} className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary">Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8"><Outlet /></main>
    </div>
  );
}