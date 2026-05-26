// src/components/upcoming-events/EventThesisDrawer.tsx
// =====================================================
// Right-side slide-in drawer showing the AI thesis for an event.
// Fetches /thesis on open. Server returns cached or generates fresh.
// =====================================================

import { useEffect, useState, useCallback, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Sparkles, Loader2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getThesis } from '@/services/upcomingEvents.api';
import {
  EVENT_TYPE_LABELS,
  type UpcomingEvent,
  type ThesisResponse,
} from '@/types/upcomingEvents';

interface EventThesisDrawerProps {
  event: UpcomingEvent | null;          // null = closed
  onClose: () => void;
}

export function EventThesisDrawer({ event, onClose }: EventThesisDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [thesis, setThesis] = useState<ThesisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // ─── Fetch thesis when event changes (or retry triggered) ──────────────
  useEffect(() => {
    if (!event) {
      // Drawer closed — clear stale state so next open starts fresh
      setThesis(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setThesis(null);

    getThesis(event.id).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res) {
        setError('Could not load thesis. Please try again.');
      } else {
        setThesis(res);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, retryNonce]);

  // ─── ESC to close ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [event, onClose]);

  // ─── Body scroll lock when open ────────────────────────────────────────
  useEffect(() => {
    if (!event) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [event]);

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {event && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={handleOverlayClick}
          />

          {/* Drawer panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              'fixed top-0 right-0 z-50 h-full',
              'w-full sm:w-[480px] md:w-[560px]',
              'bg-surface-base border-l-[0.5px] border-border-ds-subtle',
              'flex flex-col',
              'shadow-glow-gold-resting',
            )}
            role="dialog"
            aria-modal="true"
            aria-label={`AI thesis for ${event.title}`}
          >
            {/* Header */}
            <header className="flex-shrink-0 border-b-[0.5px] border-border-ds-subtle p-ds-5">
              <div className="flex items-start justify-between gap-ds-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-ds-2 mb-ds-2">
                    <Sparkles className="w-4 h-4 text-gold-primary" />
                    <span className="font-sans text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
                      AI Thesis
                    </span>
                  </div>
                  <h2 className="font-sans text-[16px] font-medium text-ink-primary leading-snug">
                    {event.title}
                  </h2>
                  <div className="mt-ds-2 flex items-center gap-ds-2 flex-wrap font-sans text-[12px] text-ink-secondary">
                    <span>{EVENT_TYPE_LABELS[event.event_type]}</span>
                    {event.primary_ticker && (
                      <>
                        <span>·</span>
                        <span className="font-mono tabular-nums text-ink-primary">
                          {event.primary_ticker}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span className="font-mono tabular-nums">{event.event_date}</span>
                    {event.event_time && (
                      <>
                        <span>·</span>
                        <span className="font-mono tabular-nums">{event.event_time} ET</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className={cn(
                    'flex-shrink-0 p-ds-1 rounded-sm',
                    'text-ink-secondary hover:text-ink-primary',
                    'hover:bg-surface-1',
                    'transition-colors duration-base ease-out',
                    'focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary',
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-ds-5">
              {loading && <ThesisSkeleton />}

              {error && !loading && (
                <div className="flex flex-col items-center text-center py-ds-7 gap-ds-3">
                  <AlertCircle className="w-8 h-8 text-num-negative opacity-70" />
                  <p className="font-sans text-[14px] text-ink-primary">{error}</p>
                  <button
                    type="button"
                    onClick={() => setRetryNonce((n) => n + 1)}
                    className={cn(
                      'inline-flex items-center gap-ds-1 px-ds-3 py-ds-1 rounded-sm',
                      'font-sans text-[12px] font-medium',
                      'text-gold-primary border-[0.5px] border-gold-border',
                      'hover:bg-gold-primary/10 transition-colors duration-base',
                      'focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary',
                    )}
                  >
                    Try again
                  </button>
                </div>
              )}

              {thesis && !loading && (
                <>
                  {/* Cache indicator */}
                  <div
                    className={cn(
                      'mb-ds-4 inline-flex items-center gap-ds-1',
                      'px-ds-2 py-[2px] rounded-sm',
                      'font-sans text-[11px] tracking-[0.5px] uppercase',
                      thesis.cached
                        ? 'bg-surface-1 text-ink-secondary border-[0.5px] border-border-ds-subtle'
                        : 'bg-gold-primary/10 text-gold-primary border-[0.5px] border-gold-border',
                    )}
                  >
                    {thesis.cached ? (
                      <>
                        <Clock className="w-3 h-3" />
                        Cached · {formatRelativeTime(thesis.generated_at)}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Just generated
                      </>
                    )}
                  </div>

                  {/* Markdown thesis with DS-aligned styling */}
                  <article>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h2: ({ children }) => (
                          <h3 className="font-sans text-[14px] font-semibold tracking-[0.5px] uppercase text-gold-primary mt-ds-5 mb-ds-2 first:mt-0">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="font-sans text-[14px] leading-relaxed text-ink-primary mb-ds-3">
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="space-y-ds-2 mb-ds-3 ml-ds-4 list-disc marker:text-gold-muted">
                            {children}
                          </ul>
                        ),
                        li: ({ children }) => (
                          <li className="font-sans text-[14px] leading-relaxed text-ink-primary">
                            {children}
                          </li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-ink-primary">{children}</strong>
                        ),
                        code: ({ children }) => (
                          <code className="font-mono text-[12px] tabular-nums text-gold-primary bg-surface-1 px-1 rounded-sm">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {thesis.thesis}
                    </ReactMarkdown>
                  </article>
                </>
              )}
            </div>

            {/* Footer */}
            {event.source_url && (
              <footer className="flex-shrink-0 border-t-[0.5px] border-border-ds-subtle p-ds-4">
                <a
                  href={event.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'font-sans text-[12px] text-ink-secondary hover:text-gold-primary',
                    'transition-colors duration-base',
                  )}
                >
                  Source ↗
                </a>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────

function ThesisSkeleton() {
  return (
    <div className="space-y-ds-4 animate-pulse">
      <div className="flex items-center gap-ds-2">
        <Loader2 className="w-4 h-4 text-gold-primary animate-spin" />
        <span className="font-sans text-[12px] text-ink-secondary">
          Generating thesis…
        </span>
      </div>
      <div className="space-y-ds-2">
        <div className="h-3 w-1/3 bg-surface-1 rounded" />
        <div className="h-2 w-full bg-surface-1 rounded" />
        <div className="h-2 w-5/6 bg-surface-1 rounded" />
        <div className="h-2 w-4/6 bg-surface-1 rounded" />
      </div>
      <div className="space-y-ds-2">
        <div className="h-3 w-1/4 bg-surface-1 rounded" />
        <div className="h-2 w-full bg-surface-1 rounded" />
        <div className="h-2 w-3/4 bg-surface-1 rounded" />
      </div>
    </div>
  );
}

// ─── Relative time helper ─────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
