// ================================================
// ERROR BOUNDARY - PRODUCTION SAFETY
// File: src/components/ErrorBoundary.tsx
// ================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { captureException } from '@/lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Sentry tag to identify which boundary caught the error. Defaults to 'journal'. */
  boundary?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /**
   * True when the error matched the chunk-load mismatch signature and we
   * already tried (or skipped) the auto-reload. Used by render() to swap the
   * generic message for a chunk-specific one and surface a hard-refresh hint.
   */
  isChunkLoadError: boolean;
}

// Vite/Webpack lazy import failures after a redeploy can take several
// message shapes depending on browser. We match all known variants — the
// global handler in App.tsx covers the unhandled-rejection path, this list
// covers the React-Suspense path where the rejection is caught by React.
const CHUNK_LOAD_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
  'Loading chunk',
  'Loading CSS chunk',
];

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = `${error.name ?? ''} ${error.message ?? ''}`;
  return CHUNK_LOAD_ERROR_PATTERNS.some((p) => msg.includes(p));
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkLoadError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, isChunkLoadError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Error Boundary caught:', error, errorInfo);

    this.setState({ errorInfo });

    // Chunk-load auto-recovery. After a redeploy, the in-memory index.html
    // references chunk hashes that no longer exist on the CDN; the SPA
    // fallback returns text/html and the dynamic import throws. React's
    // Suspense catches the rejection before the global window-level handler
    // (App.tsx) gets it, so we mirror the same one-shot-reload logic here.
    // sessionStorage key matches App.tsx so the two paths share the loop
    // guard — if the reload already happened once on this pathname, fall
    // through to the regular error UI (with a chunk-specific hint).
    if (isChunkLoadError(error) && typeof window !== 'undefined') {
      const reloadKey = 'chunk_reload_' + window.location.pathname;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        return;
      }
    }

    // ✅ Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 2026-05-19: enrich Sentry payload with self-diagnostic context. The default
    // capture only included componentStack as an extra and a generic 'journal'
    // tag, which left dashboard events impossible to localize without opening
    // the JSON. The extra fields below show up as searchable tags + structured
    // extras in Sentry — failingComponent in particular pinpoints the React
    // component that threw, which is the first useful signal when triaging.
    const stackLines = errorInfo.componentStack?.trim().split('\n') ?? [];
    const firstFrame = stackLines[0]?.trim() ?? '';
    // componentStack frames look like `    at Overview (...)` or `    in Overview (at ...)`.
    const failingComponent =
      firstFrame.replace(/^(?:at|in)\s+/, '').split(/[\s(]/)[0] || 'unknown';
    const route =
      typeof window !== 'undefined' && window.location ? window.location.pathname : 'unknown';

    captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        errorName: error.name,
        errorMessage: error.message,
        failingComponent,
        route,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      },
      tags: {
        boundary: this.props.boundary ?? 'journal',
        // Tag values must be <200 chars per Sentry — truncate defensively.
        failingComponent: failingComponent.slice(0, 80),
        route: route.slice(0, 80),
        errorName: (error.name || 'Error').slice(0, 40),
      },
    });

    // 2026-05-20: send a parallel fire-and-forget POST to the server's
    // error-report endpoint so the admin alerter gets the event too. Sentry
    // is the primary channel (rich grouping + alert rules); this is the
    // belt-and-suspenders fallback in case Sentry's DSN is rotated, the
    // network blocks Sentry, or alerts aren't configured. Skip the chunk-
    // load case — we auto-reload and don't want to email-spam during a
    // normal deploy. Skip in dev/test so local hot-reload errors don't fire.
    const skipServerReport =
      isChunkLoadError(error) ||
      (typeof import.meta !== 'undefined' &&
        (import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE !== 'production');
    if (!skipServerReport && typeof window !== 'undefined' && typeof fetch === 'function') {
      const buildHash =
        typeof document !== 'undefined'
          ? (document.querySelector('script[type="module"]')?.getAttribute('src') ?? '')
              .match(/index-([A-Za-z0-9_-]+)\.js/)?.[1] ?? ''
          : '';
      const payload = {
        boundary: this.props.boundary ?? 'journal',
        route,
        errorName: error.name,
        errorMessage: (error.message || '').slice(0, 800),
        failingComponent,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        buildHash,
      };
      try {
        fetch('/api/error-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Don't let a logging failure cascade into the render.
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isChunkLoadError: false });
  };

  handleReload = () => {
    // Clear the auto-reload guard so a user-initiated reload always goes
    // through even when the auto path already fired once on this pathname.
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('chunk_reload_' + window.location.pathname);
    }
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/app/journal';
  };

  render() {
    if (this.state.hasError) {
      // ✅ Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // ✅ Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-6">
          <div 
            className="max-w-md w-full bg-[#141414] border rounded-2xl p-8 text-center"
            style={{ borderColor: 'rgba(227, 99, 99, 0.2)' }}
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-[#E36363]/10 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-[#E36363] blur-xl opacity-20 animate-pulse"></div>
              <AlertTriangle className="w-8 h-8 text-[#E36363] relative z-10" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-2">
              {this.state.isChunkLoadError ? 'New version available' : 'Something went wrong'}
            </h2>

            {/* Message */}
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              {this.state.isChunkLoadError
                ? 'Auto-refresh did not pick up the latest build. Hard-refresh with Ctrl+Shift+R (Cmd+Shift+R on Mac) to load the new version.'
                : this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="text-left mb-6 bg-[#0A0A0A] rounded-lg p-4 text-xs text-zinc-500 overflow-auto max-h-40">
                <summary className="cursor-pointer text-[#E36363] mb-2">
                  View technical details
                </summary>
                <pre className="whitespace-pre-wrap break-words">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 bg-[#C9A646] hover:bg-[#B39540] text-black px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}