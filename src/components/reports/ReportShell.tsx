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
import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Lock, Camera } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';
import type { ReportSlide } from '@/lib/reports/reportTypes';
import finoBullWatermark from '@/assets/brand/fino-bull-watermark.png';

// ---------------------------------------------------------------------------
// ReportShell — outer chrome
// ---------------------------------------------------------------------------

export interface ReportShellProps {
  slides: ReportSlide[];
  /** One rendered slide per entry in `slides`, same order — pre-wrapped in ReportSlideFrame. */
  children: ReactNode[];
  onClose?: () => void;
  /** Optional page-level header rendered above the dots/close bar — e.g. "What
   *  your trading data reveals". When omitted, no header block renders (keeps
   *  existing Portfolio/Markets callers pixel-identical). */
  title?: string;
  /** Optional subtitle line under the title, e.g. "24 trades • Jun 10 – Jul 9 (30 days)". */
  subtitle?: string;
  /** Slide keys that are currently locked — hides the camera/share button
   *  while a locked slide is active (no point capturing a blurred card). */
  lockedKeys?: string[];
}

export function ReportShell({ slides, children, onClose, title, subtitle, lockedKeys }: ReportShellProps) {
  const navigate = useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  const isCurrentLocked = !!lockedKeys?.includes(slides[selected]?.key);

  const handleCapture = useCallback(async () => {
    const node = slideRefs.current[selected];
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `finotaur-report-${slides[selected]?.key ?? 'slide'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.warn('[ReportShell] Failed to capture slide image', err);
    }
  }, [selected, slides]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface-base">
      {/* Atmosphere — faint gold-tinted glow, top-center. Institutional, not neon. */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(201,166,70,0.04) 0%, rgba(201,166,70,0.02) 35%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Optional page-level header */}
      {title && (
        <div className="relative z-10 flex flex-shrink-0 flex-col items-center gap-ds-1 px-ds-5 pt-ds-5 text-center">
          <div className="flex items-center gap-ds-2">
            <h1 className="text-2xl font-semibold text-ink-primary sm:text-3xl">{title}</h1>
            {!isCurrentLocked && (
              <button
                type="button"
                onClick={handleCapture}
                aria-label="Download slide image"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-[0.5px] border-border-ds-subtle text-ink-secondary transition-colors duration-base ease-out hover:border-gold-border hover:text-gold-primary"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {subtitle && (
            <p className="font-mono text-sm tabular-nums text-ink-tertiary">{subtitle}</p>
          )}
        </div>
      )}

      {/* Top bar: dot progress + close */}
      <div className="relative z-10 flex flex-shrink-0 items-center justify-between px-ds-5 py-ds-4">
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
                  : i < selected
                    ? 'w-1.5 bg-gold-primary/60 hover:bg-gold-primary/80'
                    : 'w-1.5 bg-surface-2 hover:bg-border-ds-strong',
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
      <div className="relative z-10 min-h-0 flex-1 px-ds-5 pb-ds-6">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => api?.scrollPrev()}
          disabled={selected === 0}
          className="absolute left-ds-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-[0.5px] border-border-ds-subtle bg-surface-1 text-ink-secondary transition-colors duration-base ease-out hover:border-gold-border hover:text-gold-primary disabled:pointer-events-none disabled:opacity-30 sm:flex"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <Carousel setApi={setApi} opts={{ loop: false, align: 'center' }} className="h-full w-full">
          <CarouselContent className="h-full">
            {slides.map((s, i) => (
              <CarouselItem key={s.key} className="flex h-full items-start justify-center">
                <div
                  ref={(el) => {
                    slideRefs.current[i] = el;
                  }}
                  data-report-slide={s.key}
                  className="mx-auto h-full max-h-full w-full max-w-4xl overflow-y-auto overscroll-contain py-ds-2 pr-ds-2"
                >
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
          className="absolute right-ds-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-[0.5px] border-border-ds-subtle bg-surface-1 text-ink-secondary transition-colors duration-base ease-out hover:border-gold-border hover:text-gold-primary disabled:pointer-events-none disabled:opacity-30 sm:flex"
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
  /** When true, renders the faint golden-bull brand watermark behind the card. */
  watermark?: boolean;
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
  watermark = false,
  children,
  takeaway,
  locked = false,
  lockedOverlay,
}: ReportSlideFrameProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-6">
      {watermark && (
        <img
          src={finoBullWatermark}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[92%] max-w-[760px] -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.11]"
        />
      )}

      <div className="relative z-10 space-y-ds-5">
        <div>
          <Eyebrow>{pill}</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold text-ink-primary">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>}
        </div>

        <div className={cn(locked && 'pointer-events-none select-none opacity-60 blur-sm')}>
          {children}
        </div>

        {!locked && takeaway}
      </div>

      {locked && lockedOverlay && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-surface-base/50 backdrop-blur-[1px]">
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
