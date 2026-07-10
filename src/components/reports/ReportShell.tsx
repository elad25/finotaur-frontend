/**
 * ReportShell — full-screen FINO Report page shell.
 *
 * Chrome: top dot-progress indicator (active dot = gold pill), a close
 * button that returns to /app/home, and an Embla-powered slide carousel
 * with circular prev/next arrows. Individual report pages (Journal,
 * Portfolio) supply one child per slide, each wrapped in `ReportSlideFrame`
 * (also exported here) for the shared card chrome: category pill, big
 * title, content area, and Key Takeaway box.
 *
 * Mount target: routes under `/app/reports/*` are registered in
 * ProtectedAppLayout's HIDE_CHROME_ROUTES, so this shell IS the entire
 * screen — no TopNav/SubNav/Sidebar behind it.
 *
 * @see DESIGN_SYSTEM.md §4 (radius), §7 (motion)
 */
import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Lock } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';
import type { ReportSlide } from '@/lib/reports/reportTypes';

// ---------------------------------------------------------------------------
// ReportShell — outer chrome
// ---------------------------------------------------------------------------

export interface ReportShellProps {
  slides: ReportSlide[];
  /** One rendered slide per entry in `slides`, same order — pre-wrapped in ReportSlideFrame. */
  children: ReactNode[];
  onClose?: () => void;
}

export function ReportShell({ slides, children, onClose }: ReportShellProps) {
  const navigate = useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  const handleClose = useCallback(() => {
    if (onClose) onClose();
    else navigate('/app/home');
  }, [onClose, navigate]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-base">
      {/* Top bar: dot progress + close */}
      <div className="flex flex-shrink-0 items-center justify-between px-ds-5 py-ds-4">
        <div className="flex items-center gap-2" role="tablist" aria-label="Report slides">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === selected}
              aria-label={`Go to ${s.title}`}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-base ease-out cursor-pointer',
                i === selected
                  ? 'w-8 bg-gradient-gold'
                  : 'w-1.5 bg-border-ds-default hover:bg-border-ds-strong',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close report"
          className="flex h-9 w-9 items-center justify-center rounded-full border-[0.5px] border-border-ds-subtle text-ink-secondary transition-colors duration-base ease-out hover:border-border-ds-default hover:text-ink-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Slide carousel */}
      <div className="relative min-h-0 flex-1 px-ds-5 pb-ds-6">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => api?.scrollPrev()}
          disabled={selected === 0}
          className="absolute left-ds-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-[0.5px] border-border-ds-subtle bg-surface-1 text-ink-secondary transition-colors duration-base ease-out hover:border-gold-border hover:text-gold-primary disabled:pointer-events-none disabled:opacity-30 sm:flex"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <Carousel setApi={setApi} opts={{ loop: false, align: 'center' }} className="h-full w-full">
          <CarouselContent className="h-full">
            {slides.map((s, i) => (
              <CarouselItem key={s.key} className="flex h-full items-center justify-center">
                <div className="mx-auto h-full max-h-full w-full max-w-4xl overflow-y-auto py-ds-2">
                  {children[i]}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <button
          type="button"
          aria-label="Next slide"
          onClick={() => api?.scrollNext()}
          disabled={selected === slides.length - 1}
          className="absolute right-ds-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-[0.5px] border-border-ds-subtle bg-surface-1 text-ink-secondary transition-colors duration-base ease-out hover:border-gold-border hover:text-gold-primary disabled:pointer-events-none disabled:opacity-30 sm:flex"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReportSlideFrame — shared per-slide card chrome
// ---------------------------------------------------------------------------

export interface ReportSlideFrameProps {
  pill: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Rendered below content when unlocked — pass a <KeyTakeaway />. */
  takeaway?: ReactNode;
  locked?: boolean;
  lockedOverlay?: ReactNode;
}

export function ReportSlideFrame({
  pill,
  title,
  subtitle,
  children,
  takeaway,
  locked = false,
  lockedOverlay,
}: ReportSlideFrameProps) {
  return (
    <div className="relative space-y-ds-5 rounded-xl border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-6">
      <div>
        <Eyebrow>{pill}</Eyebrow>
        <h2 className="mt-2 text-2xl font-semibold text-ink-primary">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>}
      </div>

      <div className={cn(locked && 'pointer-events-none select-none opacity-60 blur-sm')}>
        {children}
      </div>

      {!locked && takeaway}

      {locked && lockedOverlay && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-surface-base/50 backdrop-blur-[1px]">
          {lockedOverlay}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LockedSlideOverlay — shared "unlock with <tier>" panel used inside the
// `lockedOverlay` slot above.
// ---------------------------------------------------------------------------

export interface LockedSlideOverlayProps {
  title: string;
  copy: string;
  ctaLabel: string;
  onUpgrade: () => void;
}

export function LockedSlideOverlay({ title, copy, ctaLabel, onUpgrade }: LockedSlideOverlayProps) {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-ds-3 rounded-xl border-[0.5px] border-gold-border bg-surface-base/90 p-ds-5 text-center shadow-lg">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-border bg-surface-1 text-gold-primary">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink-primary">{title}</p>
      <p className="text-xs text-ink-secondary">{copy}</p>
      <Button variant="gold" size="compact" onClick={onUpgrade}>
        {ctaLabel}
      </Button>
    </div>
  );
}

export default ReportShell;
