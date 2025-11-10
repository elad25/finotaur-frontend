
// src/utils/getSymbol.ts
export function normalizeSymbol(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  if (!s) return null;
  // reject accidental ":" or placeholder
  if (s === ":" || s === "::") return null;
  // simple whitelist: letters, digits, dot, hyphen (e.g., BRK.B, RDS-A)
  return /^[A-Z0-9.\-]{1,8}$/.test(s) ? s : null;
}

export function resolveSymbolFromLocation(): string {
  try {
    const u = new URL(window.location.href);
    const q = normalizeSymbol(u.searchParams.get("symbol"));
    if (q) return q;
  } catch {}
  const parts = window.location.pathname.split("/").filter(Boolean);
  // try last 2 parts to support /stocks/:symbol or /app/stocks/:symbol
  for (let i = parts.length - 1; i >= 0 && i >= parts.length - 2; i--) {
    const p = normalizeSymbol(parts[i]);
    if (p) return p;
  }
  return "AAPL";
}
