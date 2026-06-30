import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { getSession } from "../lib/auth";
import { KEYS, read, write, type TeacherProfile } from "../lib/storage";
import { fetchNigerianBanks, lookupBankAccount, friendlyError } from "../services/nomba";

export const Route = createFileRoute("/teacher/profile")({ component: Page });

function Page() {
  const session = getSession();
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);

  useEffect(() => {
    setLoadingBanks(true);
    fetchNigerianBanks()
      .then(setBanks)
      .catch((e) => toast.error(friendlyError(e)))
      .finally(() => setLoadingBanks(false));
    const p = read<TeacherProfile | null>(KEYS.teacherProfile, null);
    if (p) {
      setBankCode(p.bankCode ?? "");
      setAccountNumber(p.accountNumber ?? "");
      setAccountName(p.accountName ?? "");
    }
  }, []);

  async function verify() {
    if (!bankCode || accountNumber.length < 10) return toast.error("Enter a valid 10-digit account number.");
    setVerifying(true);
    try {
      const r = await lookupBankAccount(bankCode, accountNumber);
      setAccountName(r.accountName);
      toast.success("Account verified ✓");
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setVerifying(false);
    }
  }

  function save() {
    if (!accountName) return toast.error("Verify the account first.");
    const bank = banks.find((b) => b.code === bankCode);
    write<TeacherProfile>(KEYS.teacherProfile, {
      teacherEmail: session?.email ?? "",
      bankCode,
      bankName: bank?.name,
      accountNumber,
      accountName,
    });
    toast.success("Bank details saved");
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Update your bank details to receive salary." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-base font-semibold">Personal details</div>
          <div className="mt-3 text-sm"><span className="text-muted-foreground">Name:</span> {session?.name}</div>
          <div className="text-sm"><span className="text-muted-foreground">Email:</span> {session?.email}</div>
          {session?.phone && <div className="text-sm"><span className="text-muted-foreground">Phone:</span> {session.phone}</div>}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-base font-semibold">Bank account</div>
          <label className="mt-3 block text-xs font-semibold uppercase text-muted-foreground">Bank</label>
          <select value={bankCode} onChange={(e) => { setBankCode(e.target.value); setAccountName(""); }} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">{loadingBanks ? "Loading banks…" : "Select bank"}</option>
            {banks.map((b) => (<option key={b.code} value={b.code}>{b.name}</option>))}
          </select>

          <label className="mt-3 block text-xs font-semibold uppercase text-muted-foreground">Account Number</label>
          <div className="mt-1 flex gap-2">
            <input value={accountNumber} onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10)); setAccountName(""); }} placeholder="10-digit account" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <button onClick={verify} disabled={verifying || !bankCode || accountNumber.length < 10} className="shrink-0 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {verifying ? <Spinner size={14} /> : "Verify"}
            </button>
          </div>
          {accountName && (
            <div className="mt-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success">✓ {accountName}</div>
          )}

          <button onClick={save} disabled={!accountName} className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            Save Bank Details
          </button>
        </div>
      </div>
    </>
  );
}