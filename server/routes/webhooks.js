import express from 'express';

const router = express.Router();

router.post('/nomba', (req, res) => {
  const event = req.body;
  console.log('[Webhook] Nomba event received:', event.type);

  switch (event.type) {
    case 'checkout.completed':
      console.log('[Webhook] Fee payment confirmed:', event.data);
      break;
    case 'transfer.success':
      console.log('[Webhook] Salary transfer confirmed:', event.data);
      break;
    case 'transfer.failed':
      console.log('[Webhook] Salary transfer failed:', event.data);
      break;
    case 'direct_debit.success':
      console.log('[Webhook] Installment debited:', event.data);
      break;
    default:
      console.log('[Webhook] Unknown event type:', event.type);
  }

  res.status(200).json({ received: true });
});

export default router;
