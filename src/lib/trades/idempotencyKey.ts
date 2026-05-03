// Idempotency key builders for trades.idempotency_key (NOT NULL UNIQUE).
// Format namespace per source: manual::, tradovate::, csv:: (CSV lives in importUtils).
// See migrations/phase-2e-b3-idempotency-key.sql for the original spec.

export function buildManualIdempotencyKey(): string {
  return `manual::none::${crypto.randomUUID()}`;
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
