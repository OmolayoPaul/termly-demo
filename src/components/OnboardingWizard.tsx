import { useState } from "react";
import { toast } from "sonner";
import { KEYS, read, write, type SchoolProfile, type ClassFee } from "../lib/storage";

const DEFAULT_CLASSES = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];

function currentTermLabel() {
  const now = new Date();
  const year = now.getFullYear();
  return `First Term ${year}/${year + 1}`;
}

export function OnboardingWizard({ onComplete }: { onComplete: (profile: SchoolProfile) => void }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    type: "Secondary" as SchoolProfile["type"],
    logoDataUrl: undefined as string | undefined,
  });
  const [term, setTerm] = useState({
    termName: currentTermLabel(),
    termStart: "",
    termEnd: "",
  });
  const [classFees, setClassFees] = useState<ClassFee[]>(DEFAULT_CLASSES.map((c) => ({ className: c, amount: 0 })));

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((p) => ({ ...p, logoDataUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function goNext1() {
    if (!profile.name || !profile.address || !profile.phone || !profile.email) {
      return toast.error("Please fill in all required school profile fields.");
    }
    setStep(2);
  }

  function goNext2() {
    if (!term.termName || !term.termStart || !term.termEnd) {
      return toast.error("Please fill in the term name and dates.");
    }
    setStep(3);
  }

  function finish() {
    const fullProfile: SchoolProfile = {
      ...profile,
      ...term,
      classFees,
    };
    write(KEYS.schoolProfile, fullProfile);
    write(KEYS.onboarded, true);
    onComplete(fullProfile);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold">Welcome to Termly 👋</h2>
            <p className="mt-1 text-sm text-muted-foreground">Let's set up your school profile.</p>

            <label className="mt-4 block text-sm font-medium">School name</label>
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Bimron Comprehensive College" />

            <label className="mt-3 block text-sm font-medium">Address</label>
            <input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Lagos, Nigeria" />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Phone number</label>
                <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="080..." />
              </div>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="school@email.com" />
              </div>
            </div>

            <label className="mt-3 block text-sm font-medium">School type</label>
            <select value={profile.type} onChange={(e) => setProfile({ ...profile, type: e.target.value as SchoolProfile["type"] })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="Primary">Primary</option>
              <option value="Secondary">Secondary</option>
              <option value="Both">Both</option>
            </select>

            <label className="mt-3 block text-sm font-medium">Logo (optional)</label>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="mt-1 w-full text-sm" />
            {profile.logoDataUrl && (
              <img src={profile.logoDataUrl} alt="Logo preview" className="mt-2 h-12 w-12 rounded-md border border-border object-contain" />
            )}

            <button onClick={goNext1} className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Next</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold">First Term Setup</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tell us about the current term and class fees.</p>

            <label className="mt-4 block text-sm font-medium">Current term name</label>
            <input value={term.termName} onChange={(e) => setTerm({ ...term, termName: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Term start date</label>
                <input type="date" value={term.termStart} onChange={(e) => setTerm({ ...term, termStart: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Term end date</label>
                <input type="date" value={term.termEnd} onChange={(e) => setTerm({ ...term, termEnd: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>

            <label className="mt-4 block text-sm font-medium">Fee amount per class (₦)</label>
            <div className="mt-1 max-h-48 space-y-2 overflow-y-auto">
              {classFees.map((cf, i) => (
                <div key={cf.className} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-sm">{cf.className}</span>
                  <input
                    value={cf.amount || ""}
                    onChange={(e) => {
                      const v = Number(e.target.value.replace(/[^\d]/g, "")) || 0;
                      setClassFees((prev) => prev.map((x, idx) => (idx === i ? { ...x, amount: v } : x)));
                    }}
                    inputMode="numeric"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    placeholder="e.g. 150000"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium hover:bg-secondary">Back</button>
              <button onClick={goNext2} className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-2xl text-white">✓</div>
            <h2 className="mt-3 text-xl font-bold text-success">Termly is ready!</h2>
            <p className="mt-1 text-sm text-muted-foreground">Here's what we set up for {profile.name}:</p>

            <div className="mt-4 space-y-1 rounded-md bg-secondary/40 p-3 text-left text-sm">
              <div><span className="text-muted-foreground">School:</span> {profile.name} ({profile.type})</div>
              <div><span className="text-muted-foreground">Term:</span> {term.termName}</div>
              <div><span className="text-muted-foreground">Duration:</span> {term.termStart} → {term.termEnd}</div>
              <div><span className="text-muted-foreground">Classes with fees set:</span> {classFees.filter((c) => c.amount > 0).length} / {classFees.length}</div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border border-border p-2">👨‍🎓<br />Add Students</div>
              <div className="rounded-md border border-border p-2">🧑‍🏫<br />Add Teachers</div>
              <div className="rounded-md border border-border p-2">💵<br />Set Fees</div>
            </div>

            <button onClick={finish} className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Go to Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function isOnboarded(): boolean {
  return read<boolean>(KEYS.onboarded, false);
}

export function getSchoolProfile(): SchoolProfile | null {
  return read<SchoolProfile | null>(KEYS.schoolProfile, null);
}
