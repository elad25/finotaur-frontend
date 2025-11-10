// src/utils/http.ts
import fetch, { RequestInit } from 'node-fetch';

export async function j(url: string, init: RequestInit = {}) {
  const r = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': process.env.SEC_USER_AGENT || 'finotaur/1.0 (contact@example.com)',
      'Accept': 'application/json',
      ...(init.headers || {})
    }
  });
  if (!r.ok) {
    const text = await r.text().catch(()=>'');
    throw new Error(`HTTP ${r.status} ${r.statusText} :: ${text.slice(0,200)}`);
  }
  return r.json();
}
