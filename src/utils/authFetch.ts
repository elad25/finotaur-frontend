// src/utils/authFetch.ts
// =====================================================
// 🔐 AUTH FETCH — Authenticated fetch wrapper
// =====================================================
// Wraps native fetch() and auto-injects the Authorization
// header from the current Supabase session (if one exists).
//
// Usage:
//   import { authFetch } from '@/utils/authFetch';
//   const res = await authFetch('/api/stock-cache/MSFT/brief');
//
// Behavior:
//   • If a Supabase session exists and caller has NOT already
//     supplied an Authorization header, injects Bearer token.
//   • If no session (anonymous / not logged in): passes the
//     request through unchanged (does NOT break public routes).
//   • If getSession() itself throws: falls back to anonymous
//     request and logs a warning (fail-safe).
// =====================================================

import { supabase } from '@/lib/supabase';

/**
 * Authenticated wrapper around fetch().
 * Auto-injects `Authorization: Bearer <token>` from the current
 * Supabase session when available. Falls back to anonymous request
 * if no session exists or if session retrieval fails.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (token) {
      // Merge Authorization header — respect any caller-supplied value
      const existingHeaders = init?.headers
        ? new Headers(init.headers as HeadersInit)
        : new Headers();

      if (!existingHeaders.has('Authorization')) {
        existingHeaders.set('Authorization', `Bearer ${token}`);
      }

      return fetch(input, { ...init, headers: existingHeaders });
    }
  } catch (err) {
    // getSession() failed — degrade gracefully to anonymous request
    console.warn('[authFetch] Could not retrieve session, sending unauthenticated request:', err);
  }

  // No session or error: pass through unchanged
  return fetch(input, init);
}
