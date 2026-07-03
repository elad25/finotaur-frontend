// ============================================================================
// BACKTEST CANDLE-FETCH ERRORS
// Typed error used across binanceDataService / candleSource so callers
// (e.g. useAutoBacktestStore) can map failures to friendly English messages
// instead of guessing from raw Error.message strings.
// ============================================================================

export type CandleFetchErrorKind =
  | 'symbol-not-found'
  | 'rate-limited'
  | 'timeout'
  | 'network'
  | 'http';

export class CandleFetchError extends Error {
  kind: CandleFetchErrorKind;
  /** Present when the source signaled a Retry-After (seconds). */
  retryAfterSec?: number;

  constructor(message: string, kind: CandleFetchErrorKind, retryAfterSec?: number) {
    super(message);
    this.name = 'CandleFetchError';
    this.kind = kind;
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * Build a CandleFetchError from a failed (non-ok) Binance Response.
 * Reads the JSON body defensively — Binance error payloads look like
 * `{ "code": -1121, "msg": "Invalid symbol." }` but the body may also be
 * empty/non-JSON (e.g. an upstream proxy error page).
 */
export async function candleFetchErrorFromResponse(
  response: Response,
): Promise<CandleFetchError> {
  const status = response.status;

  let code: number | undefined;
  let msg: string | undefined;
  try {
    const body = await response.clone().json();
    if (body && typeof body === 'object') {
      code = typeof body.code === 'number' ? body.code : undefined;
      msg = typeof body.msg === 'string' ? body.msg : undefined;
    }
  } catch {
    // Non-JSON or empty body — fall through with code/msg undefined.
  }

  const isSymbolNotFound =
    code === -1121 ||
    (typeof msg === 'string' && /invalid symbol/i.test(msg)) ||
    status === 400;

  if (isSymbolNotFound) {
    return new CandleFetchError(
      msg ?? `Binance API error: ${response.statusText || status}`,
      'symbol-not-found',
    );
  }

  if (status === 429 || status === 418) {
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    return new CandleFetchError(
      `Binance API rate limit (${status})`,
      'rate-limited',
      Number.isFinite(retryAfterSec) ? retryAfterSec : undefined,
    );
  }

  return new CandleFetchError(
    `Binance API error: ${response.statusText || status}`,
    'http',
  );
}

/**
 * Build a CandleFetchError from a thrown error (network failure, abort, etc).
 * Already-typed CandleFetchErrors pass through unchanged.
 */
export function candleFetchErrorFromThrown(error: unknown): CandleFetchError {
  if (error instanceof CandleFetchError) return error;

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new CandleFetchError('Request timed out', 'timeout');
  }
  // Some environments (older Node/undici) throw a plain Error named AbortError
  // instead of a DOMException — check name defensively.
  if (error instanceof Error && error.name === 'AbortError') {
    return new CandleFetchError('Request timed out', 'timeout');
  }

  if (error instanceof TypeError) {
    return new CandleFetchError(error.message || 'Network error', 'network');
  }

  const message = error instanceof Error ? error.message : 'Unknown fetch error';
  return new CandleFetchError(message, 'network');
}
