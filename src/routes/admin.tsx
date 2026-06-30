import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clearSession, getSession } from "../lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Termly" }] }),
  component: AdminLayout,
});

const nav: { to: string; label: string; exact?: boolean }[] = [
  { to: "/admin/dashboard", label: "Dashboard" },
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "admin") navigate({ to: "/" });
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`${open ? "fixed inset-y-0 left-0 z-40 flex" : "hidden md:flex"} w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground`}>
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
                onClick={() => setOpen(false)}
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
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 md:hidden">
          <button onClick={() => setOpen((v) => !v)} className="rounded-md border border-border px-2 py-1 text-sm">☰ Menu</button>
          <div className="text-sm font-bold">Termly Admin</div>
        </div>
        <main className="min-w-0 flex-1 overflow-x-auto px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}