import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { clearSession, getSession } from "../lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Termly" }] }),
  component: AdminLayout,
});

const nav: { to: string; label: string; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/students", label: "Students" },
  { to: "/admin/fees", label: "Fees" },
  { to: "/admin/installments", label: "Installment Plans" },
  { to: "/admin/payroll", label: "Payroll" },
  { to: "/admin/bills", label: "Bills" },
  { to: "/admin/transactions", label: "Transactions" },
  { to: "/admin/reminders", label: "Reminders" },
];

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "admin") navigate({ to: "/" });
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <img src="/logo.png" alt="" className="h-10 w-10 rounded-md bg-white object-contain p-0.5" />
          <div>
            <div className="text-base font-bold">Termly</div>
            <div className="text-xs text-sidebar-foreground/70">Admin Portal</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 text-sm">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to as string}
                className={`block rounded-md px-3 py-2 transition ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <button
            onClick={() => {
              clearSession();
              navigate({ to: "/" });
            }}
            className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 py-2 text-sm hover:bg-sidebar-accent"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}