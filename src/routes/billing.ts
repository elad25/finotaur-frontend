
import { Router } from 'express';
import { env } from '../env.js';

const r = Router();

r.post('/checkout-session', async (_req, res) => {
  if (!env.STRIPE_SECRET_KEY) {
    return res.status(400).json({ ok: false, error: 'unknown_plan_or_price_not_configured' });
  }
  // Placeholder: implement Stripe checkout
  return res.json({ ok: true, url: env.CHECKOUT_SUCCESS_URL });
});

export default r;
