/**
 * DataState — declarative loading / error / empty / success wrapper.
 *
 * Eliminates the stuck-skeleton bug class where components check `isLoading`
 * but never check `isError`, leaving users on a skeleton forever when a
 * fetch fails or times out.
 *
 * Render order: loading → error → empty → children(data).
 *
 * @example
 *   <DataState
 *     isLoading={isLoading}
 *     isError={isError}
 *     data={trades}
 *     onRetry={refetch}
 *     empty={<p className="text-ink-muted text-sm">No trades yet.</p>}
 *   >
 *     {(data) => <TradeList trades={data} />}
 *   </DataState>
 */
import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { SectionSpinner } from '@/components/ds/Spinner';
import { Button } from '@/components/ds/Button';
import { TimeoutError } from '@/lib/withTimeout';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props accepted by the DataState component. */
export interface DataStateProps<T> {
  /** True while the initial fetch is in-flight. */
  isLoading: boolean;
  /**
   * True when the fetch has settled into an error state.
   * DataState also triggers the error branch when `error` is truthy, even if
   * `isError` is not explicitly passed, to handle ad-hoc error patterns.
   */
  isError?: boolean;
  /** The error value from the query (unknown intentionally — callers may pass any shape). */
  error?: unknown;
  /** The data returned by the query. May be undefined while loading or after an error. */
  data: T | undefined;
  /** Called when the user clicks the Retry button in the default error block. */
  onRetry?: () => void;

  /**
   * What to render while `isLoading` is true.
   * Defaults to `<SectionSpinner />` — a neutral mid-weight ds loader that
   * works inside cards, panels, and full sections without layout shift.
   */
  loading?: React.ReactNode;

  /**
   * Custom error UI. Two forms:
   *   - ReactNode: rendered as-is.
   *   - Function: receives `(error, retry)` — use when you need error-specific copy.
   * When omitted, a compact default block is shown (icon + message + Retry button).
   */
  errorFallback?:
    | React.ReactNode
    | ((error: unknown, retry: (() => void) | undefined) => React.ReactNode);

  /**
   * What to render when data is present but considered empty.
   * Only shown when `isEmpty(data)` returns true AND `empty` is provided.
   * If `empty` is not provided, the children render-prop is called even for
   * an "empty" data value — callers handle that case themselves.
   */
  empty?: React.ReactNode;

  /**
   * Custom emptiness predicate.
   * Default: returns true for `undefined`, `null`, and zero-length arrays.
   */
  isEmpty?: (data: T) => boolean;

  /**
   * Render-prop called only when data is present (and non-empty, if `empty`
   * was provided). Receives the non-undefined data value.
   */
  children: (data: T) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Default helpers
// ---------------------------------------------------------------------------

function defaultIsEmpty<T>(data: T): boolean {
  if (data === undefined || data === null) return true;
  if (Array.isArray(data)) return data.length === 0;
  return false;
}

/** Returns true when the error is a TimeoutError (class instance or plain object with .timedOut). */
function isTimeoutError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  // Fallback: plain-object style (e.g. serialised across a boundary)
  return typeof error === 'object' && error !== null && (error as Record<string, unknown>).timedOut === true;
}

/** Compact error block — icon + copy + optional Retry button. */
function DefaultErrorBlock({
  error,
  onRetry,
}: {
  error?: unknown;
  onRetry?: () => void;
}) {
  const timedOut = isTimeoutError(error);
  const Icon = timedOut ? Clock : AlertCircle;
  const message = timedOut
    ? 'This is taking longer than expected.'
    : "Couldn’t load this. Please try again.";

  return (
    <div className="w-full flex flex-col items-center justify-center gap-3 py-10 text-center">
      <Icon
        className="text-[#9a9484] shrink-0"
        size={28}
        aria-hidden="true"
      />
      <p className="text-sm text-ink-muted leading-snug max-w-xs">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="goldOutline"
          size="compact"
          showArrow={false}
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Generic DataState wrapper. The type parameter `T` is the shape of `data`
 * and is inferred automatically from the `children` render-prop signature.
 */
export function DataState<T>({
  isLoading,
  isError,
  error,
  data,
  onRetry,
  loading = <SectionSpinner />,
  errorFallback,
  empty,
  isEmpty = defaultIsEmpty,
  children,
}: DataStateProps<T>): React.ReactElement | null {
  // 1. Loading branch
  if (isLoading) {
    return <>{loading}</>;
  }

  // 2. Error branch — triggered by isError flag OR a truthy error value
  if (isError || error) {
    if (errorFallback !== undefined) {
      const node =
        typeof errorFallback === 'function'
          ? errorFallback(error, onRetry)
          : errorFallback;
      return <>{node}</>;
    }
    return <DefaultErrorBlock error={error} onRetry={onRetry} />;
  }

  // 3. Empty branch — only when a custom empty node was supplied
  if (empty !== undefined && (data === undefined || isEmpty(data))) {
    return <>{empty}</>;
  }

  // 4. Data is present — call the render-prop.
  //    If data is still undefined here (no empty node was provided), the
  //    caller's render-prop receives undefined cast to T; callers that omit
  //    `empty` are expected to handle the undefined case themselves.
  return <>{children(data as T)}</>;
}

export default DataState;
