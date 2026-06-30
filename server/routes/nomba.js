import express from 'express';
import * as nomba from '../services/nomba.js';

const router = express.Router();

function handleError(res, err) {
  console.error('[Nomba API Error]', err.message);
  const map = {
    Insufficient: 'Insufficient funds in account.',
    'Invalid account': 'Account could not be verified.',
    'not found': 'Record not found.',
    Unauthorized: 'Session expired. Please log in again.',
  };
  const key = Object.keys(map).find((k) => err.message.includes(k));
  res.status(400).json({ error: key ? map[key] : 'Payment service error. Please try again.' });
}

router.post('/checkout', async (req, res) => {
  try {
    const { amount, email, name, description } = req.body;
    const callbackUrl = (req.headers.origin || `http://localhost:${process.env.PORT || 3001}`) + '/payment/callback';
    const result = await nomba.createCheckoutOrder(amount, email, name, callbackUrl, description);
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
