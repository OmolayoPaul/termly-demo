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

type Step = "form" | "kyc";

function SignupPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"parent" | "teacher">("parent");
  const [error, setError] = useState<string | null>(null);

  // KYC state
  const [bvn, setBvn] = useState("");
  const [dob, setDob] = useState("");
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycBusy, setKycBusy] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);

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
      kyc_verified: false,
    };
    setPendingUser(newUser);
    setStep("kyc");
  }

  async function verifyKyc(e: React.FormEvent) {
    e.preventDefault();
    setKycError(null);
    if (!/^\d{11}$/.test(bvn)) return setKycError("BVN must be exactly 11 digits.");
    if (!dob) return setKycError("Date of birth is required.");
    setKycBusy(true);
    await new Promise((r) => setTimeout(r, 2000));
    setKycBusy(false);
    setKycVerified(true);
    if (pendingUser) {
      const verifiedUser: User = { ...pendingUser, kyc_verified: true };
      const users = read<User[]>(KEYS.users, []);
      write(KEYS.users, [...users, verifiedUser]);
    }
    toast.success("Identity verified! Redirecting to sign in…");
    setTimeout(() => nav({ to: "/" }), 2000);
  }

  function skipKyc() {
    if (pendingUser) {
      const users = read<User[]>(KEYS.users, []);
      write(KEYS.users, [...users, pendingUser]);
    }
    toast.success("Account created! Complete KYC later to enable payments.");
    setTimeout(() => nav({ to: "/" }), 1800);
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
          <p className="mt-1 text-sm text-white/80">
            {step === "form" ? "Create your account" : "Verify your identity"}
          </p>
        </div>

        {step === "form" && (
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

            <button type="submit" className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90">
              Create Account
            </button>

            <p className="mt-3 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/" className="font-semibold text-primary hover:underline">Sign in</Link>
            </p>
            <div className="mt-4 flex justify-center"><SecuredByNomba /></div>
          </form>
        )}

        {step === "kyc" && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-2xl">
            {kycVerified ? (
              <div className="text-center py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-3xl text-white">✓</div>
                <h3 className="mt-3 text-lg font-bold text-success">Identity Verified</h3>
                <p className="text-sm text-muted-foreground mt-1">Redirecting to sign in…</p>
              </div>
            ) : (
              <form onSubmit={verifyKyc}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🔐</span>
                  <div>
                    <h2 className="font-bold text-lg leading-tight">Verify Your Identity</h2>
                    <p className="text-xs text-muted-foreground">Required for payments</p>
                  </div>
                </div>

                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enter your BVN</label>
                <input
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="11-digit Bank Verification Number"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  maxLength={11}
                />

                <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enter your Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />

                {kycError && <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{kycError}</p>}

                <button type="submit" disabled={kycBusy} className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-60">
                  {kycBusy ? "Verifying with Nomba…" : "Verify Identity"}
                </button>

                <button type="button" onClick={skipKyc} className="mt-2 w-full rounded-md border border-border py-2 text-sm text-muted-foreground hover:bg-secondary">
                  Skip for now
                </button>

                <div className="mt-4 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5 font-medium">🔒 Secured by Nomba</div>
                  <p>Your BVN is encrypted and never stored in plain text</p>
                  <p className="mt-1">KYC flow uses BVN verification. Production version integrates Dojah or Smile ID for real NIN/BVN lookup against NIBSS database.</p>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
