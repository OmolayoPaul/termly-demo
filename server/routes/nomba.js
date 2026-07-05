import express from 'express';
import * as nomba from '../services/nomba.js';

const router = express.Router();

function handleError(res, err) {
  console.error('[Nomba API Error]', err.message);
  const map = {
    'Insufficient': 'Insufficient funds in account.',
    'Invalid account': 'Account could not be verified.',
    'not found': 'Record not found.',
    'Resource not found': 'Record not found.',
    'Unauthorized': 'Session expired. Please log in again.',
    'Forbidden': 'Transfer not permitted. Check that your Nomba account has outbound transfers enabled.',
    'unexpected system error': 'Bank lookup failed. Please verify the account number and try again.',
  };
  const key = Object.keys(map).find((k) => err.message.toLowerCase().includes(k.toLowerCase()));
  const friendly = key ? map[key] : err.message || 'Payment service error. Please try again.';
  res.status(400).json({ error: friendly });
}

router.get('/health', async (req, res) => {
  const result = {
    env: process.env.NOMBA_ENV || 'test',
    timestamp: new Date().toISOString(),
    authenticated: false,
    apis: {},
  };
  try {
    const token = await nomba.getAccessToken();
    result.authenticated = !!token;
  } catch (e) {
    result.authError = e.message;
  }
  const apiStatus = result.authenticated ? 'ok' : 'unreachable';
  result.apis = {
    auth:           { name: 'Authentication API',   endpoint: '/auth/token/issue',       status: result.authenticated ? 'ok' : 'error', description: 'auto-refresh bearer token' },
    checkout:       { name: 'Checkout Orders API',  endpoint: '/checkout/orders',         status: apiStatus, description: 'hosted payment page for fee collection' },
    transfer:       { name: 'Bank Transfer API',    endpoint: '/transfers',               status: apiStatus, description: 'payroll disbursements with account verification' },
    virtualAccounts:{ name: 'Virtual Accounts API', endpoint: '/accounts/virtual',        status: apiStatus, description: 'one dedicated account per student at registration' },
    directDebit:    { name: 'Direct Debit API',     endpoint: '/direct-debit/mandates',   status: apiStatus, description: 'monthly installment mandates for school fees' },
    bills:          { name: 'Bills API',            endpoint: '/bills',                   status: apiStatus, description: 'electricity tokens and data bundles for staff' },
  };
  res.json(result);
});

router.post('/checkout', async (req, res) => {
  try {
    const { amount, email, name, description } = req.body;
    const origin = req.headers.origin || `https://${req.headers.host}` || `http://localhost:${process.env.PORT || 5000}`;
    const callbackUrl = origin + '/payment/callback';
    const webhookUrl = origin + '/api/webhooks/nomba';
    const result = await nomba.createCheckoutOrder(amount, email, name, callbackUrl, webhookUrl, description);
    res.json(result);
  } catch (err) { handleError(res, err); }
});

router.get('/verify/:orderReference', async (req, res) => {
  try {
    const result = await nomba.verifyTransaction(req.params.orderReference);
    res.json(result);
  } catch (err) { handleError(res, err); }
});

router.get('/banks', async (req, res) => {
  try {
    const banks = await nomba.fetchNigerianBanks();
    res.json({ banks });
  } catch (err) { handleError(res, err); }
});

router.post('/lookup', async (req, res) => {
  try {
    const { bankCode, accountNumber } = req.body;
    const result = await nomba.lookupBankAccount(bankCode, accountNumber);
    res.json(result);
  } catch (err) { handleError(res, err); }
});

router.post('/transfer', async (req, res) => {
  try {
    const { bankCode, accountNumber, accountName, amount, narration } = req.body;
    const result = await nomba.transferToBank(bankCode, accountNumber, accountName, amount, narration);
    res.json(result);
  } catch (err) { handleError(res, err); }
});

router.post('/virtual-account', async (req, res) => {
  try {
    const { studentName, studentId } = req.body;
    const result = await nomba.createVirtualAccount(studentName, studentId);
    res.json(result);
  } catch (err) { handleError(res, err); }
});

router.post('/direct-debit', async (req, res) => {
  try {
    const { amount, startDate, phoneNumber, email } = req.body;
    const result = await nomba.createDirectDebitMandate(amount, startDate, phoneNumber, email);
    res.json(result);
  } catch (err) { handleError(res, err); }
});

router.get('/electricity/providers', async (req, res) => {
  try {
    const providers = await nomba.fetchElectricityProviders();
    res.json({ providers });
  } catch (err) { handleError(res, err); }
});

router.post('/electricity/lookup', async (req, res) => {
  try {
    const { providerCode, meterNumber } = req.body;
    const result = await nomba.lookupElectricityCustomer(providerCode, meterNumber);
    res.json(result);
  } catch (err) { handleError(res, err); }
});

router.post('/electricity/pay', async (req, res) => {
  try {
    const { providerCode, meterNumber, amount, customerName } = req.body;
    const result = await nomba.payElectricity(providerCode, meterNumber, amount, customerName);
    res.json(result);
  } catch (err) { handleError(res, err); }
});

router.get('/data/plans', async (req, res) => {
  try {
    const plans = await nomba.fetchDataPlans(req.query.network);
    res.json({ plans });
  } catch (err) { handleError(res, err); }
});

router.post('/data/buy', async (req, res) => {
  try {
    const { network, phone, planId, amount } = req.body;
    const result = await nomba.buyDataBundle(network, phone, planId, amount);
    res.json(result);
  } catch (err) { handleError(res, err); }
});

export default router;
