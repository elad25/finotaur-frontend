// src/routes/sec.ts
import express from "express";
import { getCompanyFilings, getInsiderTrades } from "../services/secService";

const router = express.Router();

// GET /api/sec/filings?symbol=AAPL
router.get("/filings", getCompanyFilings);

// GET /api/sec/insider?symbol=TSLA
router.get("/insider", getInsiderTrades);

export default router;
