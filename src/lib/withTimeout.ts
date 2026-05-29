export class TimeoutError extends Error {
  readonly timedOut = true;
  readonly label: string;
  readonly ms: number;

  constructor(label: string, ms: number) {
    super(`Timeout after ${ms}ms: ${label}`);
    this.name = 'TimeoutError';
    this.label = label;
    this.ms = ms;
  }
}

/**
 * Race a promise against a timeout. Resolves with the promise's value,
 * or rejects with a TimeoutError if `ms` elapses first.
 *
 * Use for any network call on a critical render path. Without this, a
 * hung Supabase/API call leaves the UI stuck on a spinner forever.
 */
export function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });

  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timer) clearTimeout(timer);
    }),
    timeoutPromise,
  ]);
}

/**
 * Standard timeout values. Tune per surface based on observed p99 latency.
 */
export const TIMEOUTS = {
  AUTH: 12_000,
  SUPABASE_QUERY: 15_000,
  SUPABASE_RPC: 20_000,
  EXTERNAL_API: 30_000,
} as const;
