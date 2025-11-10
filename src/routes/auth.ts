// src/routes/auth.ts
import { Router } from "express";
import bcrypt from "bcryptjs";

// Avoid unused import warnings if not used yet
void bcrypt;

const router = Router();

// Simple health/ping for auth module
router.get("/health", (_req, res) => {
  res.json({ status: "ok", module: "auth" });
});

// ---- Placeholders (keep your real handlers if you have them) ----
// router.post("/login", async (req, res) => { /* ... */ });
// router.post("/register", async (req, res) => { /* ... */ });
// router.post("/logout", async (req, res) => { /* ... */ });
// -----------------------------------------------------------------

export default router;
