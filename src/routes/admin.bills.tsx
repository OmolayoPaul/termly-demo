import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { KEYS, read, write, type TxRow } from "../lib/storage";
import { fmtNaira } from "../lib/format";
import { SecuredByNomba } from "../components/TestModeBanner";
import { demoPayBill } from "../lib/demoWallet";

export const Route = createFileRoute("/admin/bills")({ component: Page });

const DEMO_PROVIDERS = [
  { name: "AEDC (Abuja Electricity)", code: "AEDC" },
  { name: "IKEDC (Ikeja Electric)", code: "IKEDC" },
  { name: "EKEDC (Eko Electric)", code: "EKEDC" },
  { name: "PHEDC (Port Harcourt Electric)", code: "PHEDC" },
];

const DEMO_DATA_PLANS: Record<string, { id: string; name: string; size: string; validity: string; amount: number }[]> = {
  MTN: [
    { id: "mtn-1gb", name: "1GB Daily", size: "1GB", validity: "1 day", amount: 350 },
    { id: "mtn-3gb", name: "3GB Weekly", size: "3GB", validity: "7 days", amount: 1000 },
    { id: "mtn-10gb", name: "10GB Monthly", size: "10GB", validity: "30 days", amount: 3000 },
  ],
  AIRTEL: [
    { id: "airtel-1.5gb", name: "1.5GB Daily", size: "1.5GB", validity: "1 day", amount: 400 },
    { id: "airtel-4gb", name: "4GB Weekly", size: "4GB", validity: "7 days", amount: 1200 },
    { id: "airtel-11gb", name: "11GB Monthly", size: "11GB", validity: "30 days", amount: 3500 },
  ],
  GLO: [
    { id: "glo-1.2gb", name: "1.2GB Daily", size: "1.2GB", validity: "1 day", amount: 300 },
    { id: "glo-5.8gb", name: "5.8GB Weekly", size: "5.8GB", validity: "7 days", amount: 1500 },
    { id: "glo-13gb", name: "13GB Monthly", size: "13GB", validity: "30 days", amount: 4000 },
  ],
  "9MOBILE": [
    { id: "9m-1gb", name: "1GB Daily", size: "1GB", validity: "1 day", amount: 350 },
    { id: "9m-4.5gb", name: "4.5GB Weekly", size: "4.5GB", validity: "7 days", amount: 1300 },
    { id: "9m-11gb", name: "11GB Monthly", size: "11GB", validity: "30 days", amount: 3800 },
  ],
};

function genToken(): string {
  return Array.from({ length: 4 }, () => String(Math.floor(1000 + Math.random() * 9000))).join("-");
}

function Page() {
  const [tab, setTab] = useState<"electricity" | "data">("electricity");
  return (
    <>
      <PageHeader title="Bills" subtitle="Pay utilities for the school." actions={<SecuredByNomba />} />
      <div className="mb-4 inline-flex rounded-md border border-border bg-card p-1">
        <button onClick={() => setTab("electricity")} className={`rounded px-4 py-1.5 text-sm font-medium ${tab === "electricity" ? "bg-primary text-primary-foreground" : ""}`}>Electricity</button>
        <button onClick={() => setTab("data")} className={`rounded px-4 py-1.5 text-sm font-medium ${tab === "data" ? "bg-primary text-primary-foreground" : ""}`}>Data Bundle</button>
      </div>
      {tab === "electricity" ? <Electricity /> : <Data />}
    </>
  );
}

function Electricity() {
  const providers = DEMO_PROVIDERS;
  const [provider, setProvider] = useState("");
  const [meter, setMeter] = useState("");
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<"verify" | "pay" | null>(null);
  const [result, setResult] = useState<{ token: string; reference: string } | null>(null);

  async function verify() {
    setBusy("verify");
    await new Promise((res) => setTimeout(res, 700));
    setCustomer("Bimron Comprehensive School (Demo Customer)");
    toast.success("Meter verified");
    setBusy(null);
  }

  async function pay() {
    setBusy("pay");
    await new Promise((res) => setTimeout(res, 900));
    const amt = Number(amount);
    const reference = demoPayBill(amt);
    setResult({ token: genToken(), reference });
    const txs = read<TxRow[]>(KEYS.transactions, []);
    txs.unshift({ id: `tx_${Date.now()}`, date: new Date().toISOString(), studentName: customer, fee: "Electricity Bill", amount: amt, method: "Demo Wallet", reference, status: "Paid" });
    write(KEYS.transactions, txs);
    setBusy(null);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <label className="block text-sm">Provider</label>
        <select value={provider} onChange={(e) => { setProvider(e.target.value); setCustomer(""); }} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Select provider</option>
          {providers.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
        <label className="mt-3 block text-sm">Meter Number</label>
        <div className="mt-1 flex gap-2">
          <input value={meter} onChange={(e) => { setMeter(e.target.value); setCustomer(""); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={verify} disabled={!provider || !meter || busy === "verify"} className="shrink-0 rounded-md bg-secondary px-3 text-sm">{busy === "verify" ? <Spinner size={14}/> : "Verify"}</button>
        </div>
        {customer && <div className="mt-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success">✓ {customer}</div>}
        <label className="mt-3 block text-sm">Amount (₦)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={pay} disabled={!customer || !amount || busy === "pay"} className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy === "pay" ? <span className="inline-flex items-center gap-2"><Spinner size={14}/> Processing electricity payment…</span> : "Pay Bill"}
        </button>
      </div>
      {result && (
        <div className="rounded-xl border border-success/30 bg-success-soft p-5">
          <div className="text-lg font-bold text-success">✓ Electricity Paid!</div>
          <div className="mt-2 text-sm">Token: <strong className="break-all">{result.token}</strong></div>
          <div className="text-sm">Reference: <code className="text-xs">{result.reference}</code></div>
        </div>
      )}
    </div>
  );
}

function Data() {
  const networks = ["MTN", "AIRTEL", "GLO", "9MOBILE"];
  const [network, setNetwork] = useState("");
  const [phone, setPhone] = useState("");
  const [buying, setBuying] = useState<string | null>(null);
  const [result, setResult] = useState<{ reference: string } | null>(null);

  const plans = network ? DEMO_DATA_PLANS[network] ?? [] : [];

  async function buy(planId: string, amount: number) {
    if (!phone) return toast.error("Enter phone number");
    setBuying(planId);
    await new Promise((res) => setTimeout(res, 800));
    const reference = demoPayBill(amount);
    setResult({ reference });
    const txs = read<TxRow[]>(KEYS.transactions, []);
    txs.unshift({ id: `tx_${Date.now()}`, date: new Date().toISOString(), studentName: phone, fee: `${network} Data Bundle`, amount, method: "Demo Wallet", reference, status: "Paid" });
    write(KEYS.transactions, txs);
    toast.success("Data bundle purchased");
    setBuying(null);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm">Network</label>
          <select value={network} onChange={(e) => setNetwork(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select network</option>
            {networks.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Phone Number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-lg border border-border p-4">
            <div className="font-semibold">{p.name}</div>
            <div className="text-xs text-muted-foreground">{p.size} · {p.validity}</div>
            <div className="mt-1 text-lg font-bold">{fmtNaira(p.amount)}</div>
            <button onClick={() => buy(p.id, p.amount)} disabled={!phone || buying === p.id} className="mt-2 w-full rounded-md bg-primary py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
              {buying === p.id ? <Spinner size={12}/> : "Buy Bundle"}
            </button>
          </div>
        ))}
        {plans.length === 0 && <div className="col-span-full text-center text-sm text-muted-foreground">Select a network to view available plans.</div>}
      </div>
      {result && <div className="mt-4 rounded-md bg-success-soft px-3 py-2 text-sm text-success">✓ Data Bundle Purchased! Ref: {result.reference}</div>}
    </div>
  );
}