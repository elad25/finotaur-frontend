// src/routes/macro.js
import { Router } from 'express';
import { getFredGDP, getFredInflation } from '../services/macroService.js';

const router = Router();

// GET /api/macro/gdp
router.get('/gdp', getFredGDP);

// GET /api/macro/inflation
router.get('/inflation', getFredInflation);

export default router;
