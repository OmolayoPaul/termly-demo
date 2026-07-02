import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authenticate, dashboardPathFor, demoCreds, getSession, setSession, type Role } from "../lib/auth";
import { SecuredByNomba } from "../components/TestModeBanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Termly — Every Term, On Time" },
      { name: "description", content: "Termly school admin portal: manage fees, payroll, bills, and parent payments." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState(demoCreds.admin.email);
  const [password, setPassword] = useState(demoCreds.admin.password);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (s) nav({ to: dashboardPathFor(s.role) });
  }, [nav]);

  useEffect(() => {
    setEmail(demoCreds[role].email);
    setPassword(demoCreds[role].password);
  }, [role]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const session = authenticate(email, password, role);
    if (!session) {
      setError("Invalid email or password for this role.");
      return;
    }
    setSession(session);
    nav({ to: dashboardPathFor(role) });
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        background:
          "linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))",
      }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="Termly logo"
            className="h-24 w-24 rounded-xl bg-white/95 object-contain p-2 shadow-lg"
          />
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white">Termly</h1>
          <p className="mt-1 text-sm text-white/80">Every Term, On Time</p>
        </div>

        <form
          onSubmit={submit}
          className="mt-8 rounded-2xl bg-card p-7 shadow-2xl ring-1 ring-black/5"
        >
          <h2 className="text-center text-sm font-medium text-muted-foreground">
            Sign in to your account
          </h2>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="admin">Administrator</option>
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          {error && (
            <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90"
          >
            Sign in
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo credentials pre-filled above
          </p>
          <p className="mt-2 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Create one
            </Link>
          </p>
          <div className="mt-4 flex justify-center">
            <SecuredByNomba />
          </div>
        </form>
      </div>
    </main>
  );
}
