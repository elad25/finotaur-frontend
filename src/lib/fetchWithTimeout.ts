// ============================================================================
// FETCH WITH TIMEOUT
// Thin wrapper around the native fetch() that aborts the request after a
// configurable timeout. Kept generic on purpose: it throws the native
// AbortError/DOMException through unchanged — callers map it to their own
// domain error types (see services/backtest/errors.ts for an example).
// ============================================================================

/**
 * Fetch with an automatic timeout via AbortController.
 *
 * If the caller already passed an `init.signal`, it is respected: the request
 * aborts on EITHER the caller's signal or the timeout, whichever fires first.
 *
 * @param input      Same as fetch()'s first argument.
 * @param init       Same as fetch()'s second argument (optional).
 * @param timeoutMs  Timeout in milliseconds. Defaults to 15000 (15s).
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // If the caller supplied their own signal, forward its abort to ours too.
  const callerSignal = init?.signal;
  const onCallerAbort = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', onCallerAbort);
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
  }
}
