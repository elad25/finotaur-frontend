// src/routes/macro.ts
import express from "express";
import { getFredGDP, getFredInflation } from "../services/macroService";

const router = express.Router();

// GET /api/macro/gdp
router.get("/gdp", getFredGDP);

// GET /api/macro/inflation
router.get("/inflation", getFredInflation);

export default router;
