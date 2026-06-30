import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KEYS, read, write, type User } from "../lib/storage";
import { SecuredByNomba } from "../components/TestModeBanner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account · Termly" }] }),
  component: SignupPage,
});

function passwordScore(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

function SignupPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"parent" | "teacher">("parent");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);
  const strengthLabel = ["Too weak", "Weak", "Okay", "Good", "Strong"][score];
  const strengthColor = ["bg-destructive", "bg-destructive", "bg-warning", "bg-info", "bg-success"][score];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name || !email || !phone || !password) return setError("Please fill in all fields.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    const users = read<User[]>(KEYS.users, []);
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
      return setError("An account with this email already exists.");
    const newUser: User = {
      id: `u_${Date.now()}`,
      name,
      email,
      phone,
      role,
      password,
      createdAt: new Date().toISOString(),
    };
    write(KEYS.users, [...users, newUser]);
    setBusy(true);
    toast.success("Account created! Redirecting to sign in…");
    setTimeout(() => nav({ to: "/" }), 2000);
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))" }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Termly logo" className="h-20 w-20 rounded-xl bg-white/95 object-contain p-2 shadow-lg" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Termly</h1>
          <p className="mt-1 text-sm text-white/80">Create your account</p>
        </div>
        <form onSubmit={submit} className="mt-6 rounded-2xl bg-card p-6 shadow-2xl">
          <label className="mt-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          {password && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className={`h-full ${strengthColor}`} style={{ width: `${(score / 4) * 100}%` }} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Strength: {strengthLabel}</div>
            </div>
          )}

          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as "parent" | "teacher")} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
          </select>

          {error && <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}

          <button type="submit" disabled={busy} className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-60">
            {busy ? "Creating…" : "Create Account"}
          </button>

          <p className="mt-3 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
          <div className="mt-4 flex justify-center"><SecuredByNomba /></div>
        </form>
      </div>
    </main>
  );
}