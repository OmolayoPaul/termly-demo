import fetch from 'node-fetch';

const isLive = process.env.NOMBA_ENV === 'live';
const BASE_URL = process.env.NOMBA_BASE_URL || 'https://api.nomba.com/v1';
const CLIENT_ID = isLive ? process.env.NOMBA_LIVE_CLIENT_ID : process.env.NOMBA_CLIENT_ID;
const PRIVATE_KEY = isLive ? process.env.NOMBA_LIVE_PRIVATE_KEY : process.env.NOMBA_PRIVATE_KEY;
const PARENT_ACCOUNT_ID = process.env.NOMBA_PARENT_ACCOUNT_ID;

let cachedToken = null;
let tokenExpiry = 0;

export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const response = await fetch(`${BASE_URL}/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId: PARENT_ACCOUNT_ID },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: PRIVATE_KEY }),
  });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Auth failed');
  cachedToken = data.data.access_token;
  tokenExpiry = Date.now() + data.data.expiresIn * 1000 - 300000;
  console.log('[Nomba] Token fetched successfully');
  return cachedToken;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', accountId: PARENT_ACCOUNT_ID };
}

export async function createCheckoutOrder(amount, customerEmail, customerName, callbackUrl, description) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/checkout/orders`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      orderReference: `TERMLY-${Date.now()}`,
      customerId: customerEmail,
      customerName,
      amount,
      currency: 'NGN',
      callbackUrl,
      description: description || 'School fee payment - Termly',
    }),
  });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Checkout failed');
  return { checkoutLink: data.data.checkoutLink, orderReference: data.data.orderReference };
}

export async function verifyTransaction(orderReference) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/checkout/orders/${orderReference}`, { headers: authHeaders(token) });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Verification failed');
  return { status: data.data.status, amount: data.data.amount, transactionRef: data.data.transactionRef };
}

export async function fetchNigerianBanks() {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/transfers/banks`, { headers: authHeaders(token) });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Could not load banks');
  return data.data;
}

export async function lookupBankAccount(bankCode, accountNumber) {
  const token = await getAccessToken();
  const response = await fetch(
    `${BASE_URL}/transfers/bank/lookup?bankCode=${bankCode}&accountNumber=${accountNumber}`,
    { headers: authHeaders(token) },
  );
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Account lookup failed');
  return { accountName: data.data.accountName };
}

export async function transferToBank(bankCode, accountNumber, accountName, amount, narration) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/transfers/bank`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      amount, bankCode, accountNumber, accountName, narration,
      currency: 'NGN', transactionReference: `TERMLY-PAY-${Date.now()}`,
    }),
  });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Transfer failed');
  return { status: data.data.status, transactionId: data.data.transactionId };
}

export async function createVirtualAccount(studentName, studentId) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/virtual-accounts`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      accountName: studentName + ' - Termly',
      accountReference: 'STUDENT-' + studentId,
      currency: 'NGN',
      permanent: true,
    }),
  });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Virtual account creation failed');
  return { accountNumber: data.data.accountNumber, bankName: data.data.bankName, accountReference: data.data.accountReference };
}

export async function createDirectDebitMandate(amount, startDate, phoneNumber, email) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/direct-debits`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      amount, currency: 'NGN', startDate, frequency: 'MONTHLY',
      customerPhone: phoneNumber, customerEmail: email,
      narration: 'Termly school fee installment',
    }),
  });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Mandate creation failed');
  return { mandateId: data.data.mandateId, status: data.data.status, nextDebitDate: data.data.nextDebitDate };
}

export async function fetchElectricityProviders() {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/bills/electricity-providers`, { headers: authHeaders(token) });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Could not load providers');
  return data.data;
}

export async function lookupElectricityCustomer(providerCode, meterNumber) {
  const token = await getAccessToken();
  const response = await fetch(
    `${BASE_URL}/bills/electricity/lookup?providerCode=${providerCode}&meterNumber=${meterNumber}`,
    { headers: authHeaders(token) },
  );
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Lookup failed');
  return { customerName: data.data.customerName };
}

export async function payElectricity(providerCode, meterNumber, amount, customerName) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/bills/electricity`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ providerCode, meterNumber, amount, customerName, currency: 'NGN' }),
  });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Payment failed');
  return { status: data.data.status, token: data.data.token, reference: data.data.reference };
}

export async function fetchDataPlans(network) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/airtime-data/data-plans?network=${network}`, { headers: authHeaders(token) });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Could not load plans');
  return data.data;
}

export async function buyDataBundle(network, phone, planId, amount) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/airtime-data/data`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ network, phone, planId, amount, currency: 'NGN' }),
  });
  const data = await response.json();
  if (data.code !== '00') throw new Error(data.description || 'Data purchase failed');
  return { status: data.data.status, reference: data.data.reference };
}
