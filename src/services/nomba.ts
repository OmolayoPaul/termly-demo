import { NOMBA_CONFIG } from "../config/nomba";

const BASE_URL = NOMBA_CONFIG.baseUrl;
const CLIENT_ID = NOMBA_CONFIG.clientId;
const PRIVATE_KEY = NOMBA_CONFIG.privateKey;
const PARENT_ACCOUNT_ID = NOMBA_CONFIG.parentAccountId;

let cachedToken: string | null = null;
let tokenExpiry = 0;

function log(label: string, data: unknown) {
  // eslint-disable-next-line no-console
  console.log(`[Nomba] ${label}`, data);
}

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.toLowerCase();
  if (m.includes("fail") && m.includes("fetch")) return "Payment service unavailable. Try again.";
  if (m.includes("cors")) return "Payment service unavailable. Try again.";
  if (m.includes("network")) return "Payment service unavailable. Try again.";
  if (m.includes("unauthor") || m.includes("token") || m.includes("expired"))
    return "Session expired. Please log in again.";
  if (m.includes("insufficient")) return "Insufficient funds in account.";
  if (m.includes("invalid account") || m.includes("account name")) return "Account could not be verified.";
  if (m.includes("transfer")) return "Transfer failed. Contact support.";
  return msg || "Something went wrong.";
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const response = await fetch(`${BASE_URL}/auth/token/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accountId: PARENT_ACCOUNT_ID },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: PRIVATE_KEY,
    }),
  });
  const data = await response.json();
  log("token", data);
  if (data.code !== "00") throw new Error(data.description || "Auth failed");
  cachedToken = data.data.access_token;
  tokenExpiry = Date.now() + data.data.expiresIn * 1000 - 300000;
  return cachedToken!;
}

async function authedFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    accountId: PARENT_ACCOUNT_ID,
    ...(init.headers || {}),
  };
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

export async function createCheckoutOrder(amount: number, customerEmail: string, customerName: string) {
  const orderReference = `TERMLY-${Date.now()}`;
  const response = await authedFetch(`/checkout/orders`, {
    method: "POST",
    body: JSON.stringify({
      orderReference,
      customerId: customerEmail,
      customerName,
      amount,
      currency: "NGN",
      callbackUrl: window.location.origin + "/payment/callback",
      description: "School fee payment - Termly",
    }),
  });
  const data = await response.json();
  log("createCheckoutOrder", data);
  if (data.code !== "00") throw new Error(data.description || "Checkout failed");
  return { checkoutLink: data.data.checkoutLink, orderReference: data.data.orderReference };
}

export async function verifyTransaction(orderReference: string) {
  const response = await authedFetch(`/checkout/orders/${orderReference}`);
  const data = await response.json();
  log("verifyTransaction", data);
  if (data.code !== "00") throw new Error(data.description || "Verification failed");
  return {
    status: data.data.status,
    amount: data.data.amount,
    transactionRef: data.data.transactionRef,
  };
}

export async function fetchNigerianBanks() {
  const response = await authedFetch(`/transfers/banks`);
  const data = await response.json();
  log("fetchNigerianBanks", data);
  if (data.code !== "00") throw new Error(data.description || "Could not load banks");
  return data.data as { name: string; code: string }[];
}

export async function lookupBankAccount(bankCode: string, accountNumber: string) {
  const response = await authedFetch(`/transfers/bank/lookup?bankCode=${bankCode}&accountNumber=${accountNumber}`);
  const data = await response.json();
  log("lookupBankAccount", data);
  if (data.code !== "00") throw new Error(data.description || "Account lookup failed");
  return { accountName: data.data.accountName as string };
}

export async function transferToBank(
  bankCode: string,
  accountNumber: string,
  accountName: string,
  amount: number,
  narration: string,
) {
  const response = await authedFetch(`/transfers/bank`, {
    method: "POST",
    body: JSON.stringify({
      amount,
      bankCode,
      accountNumber,
      accountName,
      narration,
      currency: "NGN",
      transactionReference: `TERMLY-PAY-${Date.now()}`,
    }),
  });
  const data = await response.json();
  log("transferToBank", data);
  if (data.code !== "00") throw new Error(data.description || "Transfer failed");
  return { status: data.data.status as string, transactionId: data.data.transactionId as string };
}

export async function createVirtualAccount(studentName: string, studentId: string) {
  const response = await authedFetch(`/virtual-accounts`, {
    method: "POST",
    body: JSON.stringify({
      accountName: studentName + " - Termly",
      accountReference: "STUDENT-" + studentId,
      currency: "NGN",
      permanent: true,
    }),
  });
  const data = await response.json();
  log("createVirtualAccount", data);
  if (data.code !== "00") throw new Error(data.description || "Virtual account creation failed");
  return {
    accountNumber: data.data.accountNumber as string,
    bankName: data.data.bankName as string,
    accountReference: data.data.accountReference as string,
  };
}

export async function createDirectDebitMandate(
  amount: number,
  startDate: string,
  phoneNumber: string,
  email: string,
) {
  const response = await authedFetch(`/direct-debits`, {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: "NGN",
      startDate,
      frequency: "MONTHLY",
      customerPhone: phoneNumber,
      customerEmail: email,
      narration: "Termly school fee installment",
    }),
  });
  const data = await response.json();
  log("createDirectDebitMandate", data);
  if (data.code !== "00") throw new Error(data.description || "Mandate creation failed");
  return {
    mandateId: data.data.mandateId as string,
    status: data.data.status as string,
    nextDebitDate: data.data.nextDebitDate as string,
  };
}

export async function fetchElectricityProviders() {
  const response = await authedFetch(`/bills/electricity-providers`);
  const data = await response.json();
  log("fetchElectricityProviders", data);
  if (data.code !== "00") throw new Error(data.description || "Could not load providers");
  return data.data as { name: string; code: string }[];
}

export async function lookupElectricityCustomer(providerCode: string, meterNumber: string) {
  const response = await authedFetch(
    `/bills/electricity/lookup?providerCode=${providerCode}&meterNumber=${meterNumber}`,
  );
  const data = await response.json();
  log("lookupElectricityCustomer", data);
  if (data.code !== "00") throw new Error(data.description || "Lookup failed");
  return { customerName: data.data.customerName as string };
}

export async function payElectricity(
  providerCode: string,
  meterNumber: string,
  amount: number,
  customerName: string,
) {
  const response = await authedFetch(`/bills/electricity`, {
    method: "POST",
    body: JSON.stringify({ providerCode, meterNumber, amount, customerName, currency: "NGN" }),
  });
  const data = await response.json();
  log("payElectricity", data);
  if (data.code !== "00") throw new Error(data.description || "Payment failed");
  return {
    status: data.data.status as string,
    token: data.data.token as string,
    reference: data.data.reference as string,
  };
}

export async function fetchDataPlans(network: string) {
  const response = await authedFetch(`/airtime-data/data-plans?network=${network}`);
  const data = await response.json();
  log("fetchDataPlans", data);
  if (data.code !== "00") throw new Error(data.description || "Could not load plans");
  return data.data as { id: string; name: string; size: string; validity: string; amount: number }[];
}

export async function buyDataBundle(network: string, phone: string, planId: string, amount: number) {
  const response = await authedFetch(`/airtime-data/data`, {
    method: "POST",
    body: JSON.stringify({ network, phone, planId, amount, currency: "NGN" }),
  });
  const data = await response.json();
  log("buyDataBundle", data);
  if (data.code !== "00") throw new Error(data.description || "Data purchase failed");
  return { status: data.data.status as string, reference: data.data.reference as string };
}