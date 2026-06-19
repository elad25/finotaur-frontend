/**
 * useTimedQuery — thin wrapper around `useQuery` that races the queryFn against
 * a timeout so a hung Supabase/API call rejects into the error state (→ Retry)
 * instead of leaving the UI stuck on a skeleton forever.
 *
 * Use it anywhere you'd use `useQuery` on a Supabase or external API call.
 * Pass a custom `timeout` (ms) when the default `TIMEOUTS.SUPABASE_QUERY`
 * (15 000 ms) is too aggressive or too lenient for a specific surface.
 *
 * The hook is a 1-for-1 replacement: every option and return value from
 * `useQuery` is preserved — the only addition is the optional `timeout` field.
 *
 * @example
 *   const { data, isLoading, isError, refetch } = useTimedQuery({
 *     queryKey: ['trades', userId],
 *     queryFn: () => fetchTrades(userId),
 *     timeout: TIMEOUTS.SUPABASE_RPC,
 *   });
 */
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult, QueryKey, QueryFunctionContext } from '@tanstack/react-query';
import { withTimeout, TIMEOUTS } from '@/lib/withTimeout';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Extends react-query's `UseQueryOptions` with an optional `timeout` field.
 * All other options are passed through unchanged.
 */
export type UseTimedQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
  /**
   * Maximum time (ms) the queryFn is allowed to run before it is forcibly
   * rejected with a `TimeoutError`. Defaults to `TIMEOUTS.SUPABASE_QUERY`
   * (15 000 ms). Set to `0` or `Infinity` to disable the timeout.
   */
  timeout?: number;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Drop-in replacement for `useQuery` with automatic timeout protection.
 *
 * If `queryFn` is not provided (e.g. the query is disabled), the hook
 * delegates to `useQuery` unchanged — no timeout wrapper is applied.
 */
export function useTimedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseTimedQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  const { timeout = TIMEOUTS.SUPABASE_QUERY, queryFn, queryKey, ...rest } = options;

  // Build a human-readable label for the TimeoutError message so it's easy
  // to identify the offending query in logs / Sentry.
  const label = (() => {
    try {
      return JSON.stringify(queryKey);
    } catch {
      return String(queryKey);
    }
  })();

  // Wrap the queryFn only when one is provided and timeout is meaningful.
  // Capture into a const so TypeScript's narrowing survives inside the closure.
  const fn = typeof queryFn === 'function' ? queryFn : null;
  // Cast to QueryFunction so useQuery accepts the wrapped fn — the generics
  // are already constrained by the outer signature; the cast is only needed
  // because react-query's queryFn union includes the non-callable skipToken.
  const wrappedQueryFn: typeof queryFn =
    fn && timeout > 0 && isFinite(timeout)
      ? (ctx: QueryFunctionContext<TQueryKey>) =>
          withTimeout(Promise.resolve(fn(ctx)) as Promise<TQueryFnData>, timeout, label)
      : queryFn;

  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    queryKey,
    queryFn: wrappedQueryFn,
    ...(rest as UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
  });
}
