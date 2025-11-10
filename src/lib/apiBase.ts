// src/lib/apiBase.ts
// Build API base with optional VITE_API_BASE (e.g., http://localhost:3000).
// If not set, use same-origin ''.
export const API_BASE: string =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_BASE) || '';

export function api(path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  return API_BASE + path;
}
