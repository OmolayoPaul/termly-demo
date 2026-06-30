import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import {
  fetchElectricityProviders, lookupElectricityCustomer, payElectricity,
  fetchDataPlans, buyDataBundle, friendlyError,
} from "../services/nomba";
import { KEYS, read, write, type TxRow } from "../lib/storage";
import { fmtNaira } from "../lib/format";
import { SecuredByNomba } from "../components/TestModeBanner";

export const Route = createFileRoute("/admin/bills")({ component: Page });

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
  const [providers, setProviders] = useState<{ name: string; code: string }[]>([]);
  const [provider, setProvider] = useState("");
  const [meter, setMeter] = useState("");
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<"verify" | "pay" | null>(null);
  const [result, setResult] = useState<{ token: string; reference: string } | null>(null);

  useEffect(() => { fetchElectricityProviders().then(setProviders).catch((e) => toast.error(friendlyError(e))); }, []);

  async function verify() {
    setBusy("verify");
    try { const r = await lookupElectricityCustomer(provider, meter); setCustomer(r.customerName); toast.success("Meter verified"); }
    catch (e) { toast.error(friendlyError(e)); } finally { setBusy(null); }
  }

  async function pay() {
    setBusy("pay");
    try {
      const amt = Number(amount);
      const r = await payElectricity(provider, meter, amt, customer);
      setResult({ token: r.token, reference: r.reference });
      const txs = read<TxRow[]>(KEYS.transactions, []);
      txs.unshift({ id: `tx_${Date.now()}`, date: new Date().toISOString(), studentName: customer, fee: "Electricity Bill", amount: amt, method: "Nomba Bills", reference: r.reference, status: "Paid" });
      write(KEYS.transactions, txs);
    } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(null); }
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
  const [plans, setPlans] = useState<{ id: string; name: string; size: string; validity: string; amount: number }[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [result, setResult] = useState<{ reference: string } | null>(null);

  useEffect(() => {
    if (!network) return;
    fetchDataPlans(network).then(setPlans).catch((e) => toast.error(friendlyError(e)));
  }, [network]);

  async function buy(planId: string, amount: number) {
    if (!phone) return toast.error("Enter phone number");
    setBuying(planId);
    try {
      const r = await buyDataBundle(network, phone, planId, amount);
      setResult({ reference: r.reference });
      const txs = read<TxRow[]>(KEYS.transactions, []);
      txs.unshift({ id: `tx_${Date.now()}`, date: new Date().toISOString(), studentName: phone, fee: `${network} Data Bundle`, amount, method: "Nomba Bills", reference: r.reference, status: "Paid" });
      write(KEYS.transactions, txs);
      toast.success("Data bundle purchased");
    } catch (e) { toast.error(friendlyError(e)); } finally { setBuying(null); }
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