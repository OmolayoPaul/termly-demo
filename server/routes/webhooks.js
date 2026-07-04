import express from 'express';
import crypto from 'crypto';

const router = express.Router();

/**
 * In-memory webhook event store.
 * Key: orderReference (string)
 * Value: { orderReference, transactionRef, amount, status, type, receivedAt }
 *
 * Capped at MAX_EVENTS entries. Entries expire after TTL_MS.
 */
const MAX_EVENTS = 2000;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const webhookEvents = new Map();

function pruneExpired() {
  const cutoff = Date.now() - TTL_MS;
  for (const [key, val] of webhookEvents) {
    if (val.receivedAt < cutoff) webhookEvents.delete(key);
  }
}

function storeEvent(orderReference, payload) {
  pruneExpired();
  if (webhookEvents.size >= MAX_EVENTS) {
    // evict the oldest entry
    const oldest = [...webhookEvents.entries()].sort((a, b) => a[1].receivedAt - b[1].receivedAt)[0];
    if (oldest) webhookEvents.delete(oldest[0]);
  }
  webhookEvents.set(orderReference, { ...payload, receivedAt: Date.now() });
  console.log(`[Webhook] Stored event for ref: ${orderReference}`);
}

/**
 * Verify Nomba HMAC-SHA256 signature.
 * Returns true if signature is valid or if no secret is configured (dev fallback).
 */
function verifySignature(req) {
  const isLive = process.env.NOMBA_ENV === 'live';
  const nombaPrivateKey = isLive ? process.env.NOMBA_LIVE_PRIVATE_KEY : process.env.NOMBA_PRIVATE_KEY;
  const secret = process.env.NOMBA_WEBHOOK_SECRET || nombaPrivateKey;
  if (!secret) return true; // no secret configured — skip verification

  const signature = req.headers['x-nomba-signature'] || req.headers['x-signature'];
  if (!signature) {
    console.warn('[Webhook] Missing signature header — accepting anyway (configure NOMBA_WEBHOOK_SECRET to enforce)');
    return true;
  }

  const rawBody = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false; // malformed signature header (wrong length/encoding)
  }
}

/** POST /api/webhooks/nomba — Nomba sends payment events here */
router.post('/nomba', (req, res) => {
  try {
    if (!verifySignature(req)) {
      console.warn('[Webhook] Signature verification failed — rejecting');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const type = event.type || 'unknown';
    console.log(`[Webhook] Nomba event: ${type}`);

    switch (type) {
      case 'checkout.completed': {
        const d = event.data || {};
        const ref = d.orderReference || d.reference;
        if (ref) {
          storeEvent(ref, {
            orderReference: ref,
            transactionRef: d.transactionRef || d.transactionReference || ref,
            amount: Number(d.amount) || 0,
            status: 'SUCCESS',
            type,
          });
        }
        break;
      }

      case 'transfer.success': {
        const d = event.data || {};
        const ref = d.transactionReference || d.reference;
        if (ref) {
          storeEvent(ref, {
            orderReference: ref,
            transactionRef: d.transactionReference || ref,
            amount: Number(d.amount) || 0,
            status: 'SUCCESS',
            type,
          });
        }
        break;
      }

      case 'direct_debit.success': {
        const d = event.data || {};
        const ref = d.mandateId || d.reference;
        if (ref) {
          storeEvent(ref, {
            orderReference: ref,
            transactionRef: d.transactionReference || ref,
            amount: Number(d.amount) || 0,
            status: 'SUCCESS',
            type,
          });
        }
        break;
      }

      case 'transfer.failed':
      case 'checkout.failed': {
        const d = event.data || {};
        const ref = d.orderReference || d.transactionReference || d.reference;
        if (ref) {
          storeEvent(ref, {
            orderReference: ref,
            transactionRef: ref,
            amount: Number(d.amount) || 0,
            status: 'FAILED',
            type,
          });
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook] Error processing event:', err.message);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

/** GET /api/webhooks/event/:ref — Frontend polls this to check if Nomba already confirmed */
router.get('/event/:ref', (req, res) => {
  pruneExpired();
  const event = webhookEvents.get(req.params.ref);
  if (!event) return res.json({ found: false });
  res.json({ found: true, ...event });
});

/**
 * GET /api/webhooks/recent?since=<ms timestamp>
 * Returns all events received after the given timestamp (or last 5 min if omitted).
 * Used by the admin notification badge.
 */
router.get('/recent', (req, res) => {
  pruneExpired();
  const since = Number(req.query.since) || (Date.now() - 5 * 60 * 1000);
  const events = [...webhookEvents.values()]
    .filter((e) => e.receivedAt > since)
    .sort((a, b) => b.receivedAt - a.receivedAt)
    .slice(0, 50);
  res.json({ events, count: events.length, serverTime: Date.now() });
});

/** GET /api/webhooks/health — Sanity check */
router.get('/health', (_req, res) => {
  res.json({ eventCount: webhookEvents.size, uptime: process.uptime() });
});

export default router;
