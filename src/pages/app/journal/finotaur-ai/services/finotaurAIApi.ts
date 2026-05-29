// src/pages/app/journal/finotaur-ai/services/finotaurAIApi.ts
// Auth: credentials: 'include' passes the Supabase session cookie.
// The server's requireAuthJWT middleware validates the JWT from the cookie.

import type { FinotaurScore } from '../types';

export async function fetchFinotaurScore(windowDays: number = 30): Promise<FinotaurScore> {
  const res = await fetch(`/api/journal-ai/score?window=${windowDays}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`fetchFinotaurScore failed (${res.status})${text ? ': ' + text : ''}`);
  }

  const data: FinotaurScore = await res.json();
  return data;
}
