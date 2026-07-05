import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clearSession, getSession } from "../lib/auth";
import { useWebhookNotifications } from "../hooks/useWebhookNotifications";
import { OnboardingWizard, isOnboarded, getSchoolProfile } from "../components/OnboardingWizard";
import type { SchoolProfile } from "../lib/storage";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Termly" }] }),
  component: AdminLayout,
});

const nav: { to: string; label: string; exact?: boolean; notif?: boolean }[] = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/students", label: "Students" },
  { to: "/admin/fees", label: "Fees" },
  { to: "/admin/installments", label: "Installment Plans" },
  { to: "/admin/subscriptions", label: "Subscriptions" },
  { to: "/admin/payroll", label: "Payroll" },
  { to: "/admin/bills", label: "Bills" },
  { to: "/admin/virtual-accounts", label: "Virtual Accounts" },
  { to: "/admin/transactions", label: "Transactions", notif: true },
  { to: "/admin/reminders", label: "Reminders" },
  { to: "/admin/submission", label: "🏆 Submission" },
];

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { unreadCount, dismiss } = useWebhookNotifications();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "admin") {
      navigate({ to: "/" });
      return;
    }
    setSchoolProfile(getSchoolProfile());
    if (!isOnboarded()) setShowOnboarding(true);
  }, [navigate]);

  function handleNavClick(item: (typeof nav)[0]) {
    setOpen(false);
    if (item.notif) dismiss();
  }

  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={(profile) => {
          setSchoolProfile(profile);
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`${open ? "fixed inset-y-0 left-0 z-40 flex" : "hidden md:flex"} w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground`}>
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          {schoolProfile?.logoDataUrl ? (
            <img src={schoolProfile.logoDataUrl} alt="" className="h-10 w-10 rounded-md bg-white object-contain p-0.5" />
          ) : (
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-md bg-white object-contain p-0.5" />
          )}
          <div className="min-w-0">
            <div className="truncate text-base font-bold">{schoolProfile?.name || "Termly"}</div>
            <div className="text-xs text-sidebar-foreground/70">{schoolProfile ? "Powered by Termly" : "Admin Portal"}</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 text-sm">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const badge = n.notif && unreadCount > 0;
            return (
              <Link
                key={n.to}
                to={n.to as string}
                onClick={() => handleNavClick(n)}
                className={`flex items-center justify-between rounded-md px-3 py-2 transition ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent"
                }`}
              >
                <span>{n.label}</span>
                {badge && (
                  <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
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
          <Link
            to="/admin/transactions"
            onClick={dismiss}
            className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border text-base hover:bg-secondary"
            title="Transactions"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
        <main className="min-w-0 flex-1 overflow-x-auto px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
