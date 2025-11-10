// src/routes/quote.js
import { Router } from 'express';
import { getQuote } from '../services/quoteService.js';

const router = Router();

// GET /api/quote?symbol=BTC
router.get('/', getQuote);

export default router;
