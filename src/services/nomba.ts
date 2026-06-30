const API_BASE = '/api/nomba';

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const m = msg.toLowerCase();
  if (m.includes('fail') && m.includes('fetch')) return 'Payment service unavailable. Try again.';
  if (m.includes('cors')) return 'Payment service unavailable. Try again.';
  if (m.includes('network')) return 'Payment service unavailable. Try again.';
  if (m.includes('unauthor') || m.includes('token') || m.includes('expired'))
    return 'Session expired. Please log in again.';
  if (m.includes('insufficient')) return 'Insufficient funds in account.';
  if (m.includes('invalid account') || m.includes('account name')) return 'Account could not be verified.';
  if (m.includes('transfer')) return 'Transfer failed. Contact support.';
  return msg || 'Something went wrong.';
}

async function apiCall(endpoint: string, method: string = 'GET', body?: unknown) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return response.json();
}

export async function createCheckoutOrder(
  amount: number,
  customerEmail: string,
  customerName: string,
  description?: string,
) {
  return apiCall('/checkout', 'POST', { amount, email: customerEmail, name: customerName, description });
}

export async function verifyTransaction(orderReference: string) {
  return apiCall(`/verify/${orderReference}`);
}

export async function fetchNigerianBanks() {
  const data = await apiCall('/banks');
  return data.banks as { name: string; code: string }[];
}

export async function lookupBankAccount(bankCode: string, accountNumber: string) {
  return apiCall('/lookup', 'POST', { bankCode, accountNumber }) as Promise<{ accountName: string }>;
}

export async function transferToBank(
  bankCode: string,
  accountNumber: string,
  accountName: string,
  amount: number,
  narration: string,
) {
  return apiCall('/transfer', 'POST', { bankCode, accountNumber, accountName, amount, narration }) as Promise<{
    status: string;
    transactionId: string;
  }>;
}

export async function createVirtualAccount(studentName: string, studentId: string) {
  return apiCall('/virtual-account', 'POST', { studentName, studentId }) as Promise<{
    accountNumber: string;
    bankName: string;
    accountReference: string;
  }>;
}

export async function createDirectDebitMandate(
  amount: number,
  startDate: string,
  phoneNumber: string,
  email: string,
) {
  return apiCall('/direct-debit', 'POST', { amount, startDate, phoneNumber, email }) as Promise<{
    mandateId: string;
    status: string;
    nextDebitDate: string;
  }>;
}

export async function fetchElectricityProviders() {
  const data = await apiCall('/electricity/providers');
  return data.providers as { name: string; code: string }[];
}

export async function lookupElectricityCustomer(providerCode: string, meterNumber: string) {
  return apiCall('/electricity/lookup', 'POST', { providerCode, meterNumber }) as Promise<{ customerName: string }>;
}

export async function payElectricity(
  providerCode: string,
  meterNumber: string,
  amount: number,
  customerName: string,
) {
  return apiCall('/electricity/pay', 'POST', { providerCode, meterNumber, amount, customerName }) as Promise<{
    status: string;
    token: string;
    reference: string;
  }>;
}

export async function fetchDataPlans(network: string) {
  const data = await apiCall(`/data/plans?network=${network}`);
  return data.plans as { id: string; name: string; size: string; validity: string; amount: number }[];
}

export async function buyDataBundle(network: string, phone: string, planId: string, amount: number) {
  return apiCall('/data/buy', 'POST', { network, phone, planId, amount }) as Promise<{
    status: string;
    reference: string;
  }>;
}
