import fetch from 'node-fetch';

const isLive = process.env.NOMBA_ENV === 'live';
const BASE_URL = process.env.NOMBA_BASE_URL || 'https://api.nomba.com/v1';
const CLIENT_ID = isLive ? process.env.NOMBA_LIVE_CLIENT_ID : process.env.NOMBA_CLIENT_ID;
const PRIVATE_KEY = isLive ? process.env.NOMBA_LIVE_PRIVATE_KEY : process.env.NOMBA_PRIVATE_KEY;
const PARENT_ACCOUNT_ID = process.env.NOMBA_PARENT_ACCOUNT_ID; // used ONLY for token auth
const SUB_ACCOUNT_ID = process.env.NOMBA_SUB_ACCOUNT_ID;       // used for ALL other API calls

let cachedToken = null;
let tokenExpiry = 0;

// Auth uses PARENT account — this is correct per Nomba docs
export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  console.log('[Nomba] Using accountId header:', PARENT_ACCOUNT_ID, 'for endpoint: /auth/token/issue (PARENT)');
  const response = await fetch(`${BASE_URL}/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId: PARENT_ACCOUNT_ID },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: PRIVATE_KEY }),
  });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Auth failed');
  }
  cachedToken = data.data.access_token;
  tokenExpiry = Date.now() + data.data.expiresIn * 1000 - 300000;
  console.log('[Nomba] Token fetched successfully (parent account authenticated)');
  return cachedToken;
}

// All non-auth calls use SUB_ACCOUNT_ID
function authHeaders(token, endpoint = '') {
  console.log('[Nomba] Using accountId header:', SUB_ACCOUNT_ID, 'for endpoint:', endpoint, '(SUB-ACCOUNT)');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', accountId: SUB_ACCOUNT_ID };
}

// Transfers debit from parent account level — use PARENT account ID in header
function transferHeaders(token, endpoint = '') {
  console.log('[Nomba] Using accountId header:', PARENT_ACCOUNT_ID, 'for endpoint:', endpoint, '(PARENT — transfer)');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', accountId: PARENT_ACCOUNT_ID };
}

export async function createCheckoutOrder(amount, customerEmail, customerName, callbackUrl, webhookUrl, description) {
  const token = await getAccessToken();
  const body = {
    orderReference: `TERMLY-${Date.now()}`,
    customerId: customerEmail,
    customerName,
    amount,
    currency: 'NGN',
    callbackUrl,
    description: description || 'School fee payment - Termly',
  };
  if (webhookUrl) body.webhookUrl = webhookUrl;
  const response = await fetch(`${BASE_URL}/checkout/orders`, {
    method: 'POST',
    headers: authHeaders(token, '/checkout/orders'),
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Checkout failed');
  }
  return { checkoutLink: data.data.checkoutLink, orderReference: data.data.orderReference };
}

export async function verifyTransaction(orderReference) {
  const token = await getAccessToken();
  const endpoint = `/checkout/orders/${orderReference}`;
  const response = await fetch(`${BASE_URL}${endpoint}`, { headers: authHeaders(token, endpoint) });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Verification failed');
  }
  return { status: data.data.status, amount: data.data.amount, transactionRef: data.data.transactionRef };
}

export async function fetchNigerianBanks() {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/transfers/banks`, { headers: authHeaders(token, '/transfers/banks') });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Could not load banks');
  }
  return data.data;
}

export async function lookupBankAccount(bankCode, accountNumber) {
  const token = await getAccessToken();
  const endpoint = `/transfers/bank/lookup?bankCode=${bankCode}&accountNumber=${accountNumber}`;
  const response = await fetch(`${BASE_URL}${endpoint}`, { headers: transferHeaders(token, endpoint) });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Account lookup failed');
  }
  return { accountName: data.data.accountName };
}

export async function transferToBank(bankCode, accountNumber, accountName, amount, narration) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/transfers/bank`, {
    method: 'POST',
    headers: transferHeaders(token, '/transfers/bank'),
    body: JSON.stringify({
      amount,
      bankCode,
      accountNumber,
      accountName,
      narration,
      currency: 'NGN',
      merchantTxRef: `TERMLY-PAY-${Date.now()}`,
      sourceAccountId: SUB_ACCOUNT_ID,
    }),
  });
  const data = await response.json();
  const errMsg = data.description
    || (Array.isArray(data.errors) ? data.errors.join('; ') : null)
    || null;
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(errMsg || 'Transfer failed');
  }
  return { status: data.data?.status, transactionId: data.data?.merchantTxRef || data.data?.transactionId };
}

export async function createVirtualAccount(studentName, studentId) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/virtual-accounts`, {
    method: 'POST',
    headers: authHeaders(token, '/virtual-accounts'),
    body: JSON.stringify({
      accountName: studentName + ' - Termly',
      accountReference: 'STUDENT-' + studentId,
      currency: 'NGN',
      permanent: true,
    }),
  });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Virtual account creation failed');
  }
  return { accountNumber: data.data.accountNumber, bankName: data.data.bankName, accountReference: data.data.accountReference };
}

export async function createDirectDebitMandate(amount, startDate, phoneNumber, email) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/direct-debits`, {
    method: 'POST',
    headers: authHeaders(token, '/direct-debits'),
    body: JSON.stringify({
      amount, currency: 'NGN', startDate, frequency: 'MONTHLY',
      customerPhone: phoneNumber, customerEmail: email,
      narration: 'Termly school fee installment',
    }),
  });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Mandate creation failed');
  }
  return { mandateId: data.data.mandateId, status: data.data.status, nextDebitDate: data.data.nextDebitDate };
}

export async function fetchElectricityProviders() {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/bills/electricity-providers`, { headers: authHeaders(token, '/bills/electricity-providers') });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Could not load providers');
  }
  return data.data;
}

export async function lookupElectricityCustomer(providerCode, meterNumber) {
  const token = await getAccessToken();
  const endpoint = `/bills/electricity/lookup?providerCode=${providerCode}&meterNumber=${meterNumber}`;
  const response = await fetch(`${BASE_URL}${endpoint}`, { headers: authHeaders(token, endpoint) });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Lookup failed');
  }
  return { customerName: data.data.customerName };
}

export async function payElectricity(providerCode, meterNumber, amount, customerName) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/bills/electricity`, {
    method: 'POST',
    headers: authHeaders(token, '/bills/electricity'),
    body: JSON.stringify({ providerCode, meterNumber, amount, customerName, currency: 'NGN' }),
  });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Payment failed');
  }
  return { status: data.data.status, token: data.data.token, reference: data.data.reference };
}

export async function fetchDataPlans(network) {
  const token = await getAccessToken();
  const endpoint = `/airtime-data/data-plans?network=${network}`;
  const response = await fetch(`${BASE_URL}${endpoint}`, { headers: authHeaders(token, endpoint) });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Could not load plans');
  }
  return data.data;
}

export async function buyDataBundle(network, phone, planId, amount) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/airtime-data/data`, {
    method: 'POST',
    headers: authHeaders(token, '/airtime-data/data'),
    body: JSON.stringify({ network, phone, planId, amount, currency: 'NGN' }),
  });
  const data = await response.json();
  if (data.code !== '00') {
    console.log('Nomba raw response:', JSON.stringify(data, null, 2));
    throw new Error(data.description || 'Data purchase failed');
  }
  return { status: data.data.status, reference: data.data.reference };
}
