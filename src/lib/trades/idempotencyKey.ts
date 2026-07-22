// Idempotency key builders for trades.idempotency_key (NOT NULL UNIQUE).
// Format namespace per source: manual::, tradovate::, csv:: (CSV lives in importUtils).
// See migrations/phase-2e-b3-idempotency-key.sql for the original spec.

import { uuid } from '@/utils/uuid';

export function buildManualIdempotencyKey(): string {
  return `manual::none::${uuid()}`;
}

export function buildTradovateIdempotencyKey(
  brokerConnectionId: string,
  tradovateOrderId: number | string
): string {
  return `tradovate::${brokerConnectionId}::${tradovateOrderId}`;
}

export function isValidIdempotencyKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0 && key.includes('::');
}

/**
 * Build CSV idempotency key per ADL-016: csv::<user_id>::<source>::<sha256-16-hex(payload)>.
 * Async because Web Crypto API is async-only; no sync sha256 library in repo.
 * Hash includes close fields too — re-import after close updates the row instead of colliding.
 */
export async function buildCSVIdempotencyKey(
  userId: string,
  source: string,
  fields: {
    symbol: string;
    quantity: number;
    entry_price: number;
    open_at: string;
    exit_price?: number | null;
    close_at?: string | null;
  }
): Promise<string> {
  const payload = [
    fields.symbol,
    String(fields.quantity),
    String(fields.entry_price),
    fields.open_at,
    fields.exit_price ?? '',
    fields.close_at ?? '',
  ].join('|');
  const buf = new TextEncoder().encode(payload);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const hex16 = Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
  return `csv::${userId}::${source}::${hex16}`;
}
