// ============================================================
// Welcome Email Service — frontend client
// ============================================================
// Fires a best-effort POST to /api/users/me/welcome immediately
// after a new user signs up so the welcome email is sent without
// waiting for the daily cron backstop.
//
// Design: fire-and-forget, swallows all errors. The server endpoint
// is idempotent, so duplicate calls (e.g. from both the OAuth and
// email paths on the same sign-up) are safe.
//
// Auth pattern mirrors accountLifecycleService.ts (same base path,
// same getSession → access_token header construction).
//
// Added 2026-06-13 — instant-welcome-email session.
// ============================================================

import { getSupabaseClient } from "@/services/api/supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Fire-and-forget POST to /api/users/me/welcome.
 * Never throws — all errors are swallowed so signup is never blocked.
 * Use as: `void fireWelcomeEmail();`
 */
export async function fireWelcomeEmail(): Promise<void> {
  try {
    const {
      data: { session },
    } = await getSupabaseClient().auth.getSession();

    const token = session?.access_token;
    if (!token) {
      // No token yet (e.g. email-confirmation flow) — cron is the backstop.
      return;
    }

    await fetch(`${API_BASE}/users/me/welcome`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  } catch (err) {
    // Intentionally swallowed — this is best-effort. The daily cron
    // will send the welcome email if this call fails.
    console.debug("[WelcomeEmail] fire-and-forget call failed (non-blocking):", err);
  }
}
