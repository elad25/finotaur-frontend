import { useEffect, useState } from 'react';
import { Button } from '@/components/ds/Button';

const DISMISS_KEY = 'finotaur_copier_demo_overlay_dismissed_v1';

export interface CopierDemoOverlayProps {
  /** Label for the primary CTA. Defaults to "Explore the preview" (dismiss-only). */
  ctaLabel?: string;
  /**
   * Called when the CTA is clicked, in addition to dismissing the overlay.
   * Pass 2 wires this to "Upgrade to Premium" (non-Premium users) or
   * "Connect your broker" (Premium users). Omit for a plain dismiss-only CTA.
   */
  onCta?: () => void;
}

export function CopierDemoOverlay({ ctaLabel, onCta }: CopierDemoOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(DISMISS_KEY) !== '1');
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  const handleCta = () => {
    onCta?.();
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-[24px] border border-gold-primary/20 bg-[#111111] p-8 text-center shadow-[0_0_80px_rgba(201,166,70,0.12)]">
        <img
          src="/logo.png"
          alt="FINOTAUR"
          className="mx-auto mb-5 h-24 w-auto"
          style={{
            maskImage: 'radial-gradient(ellipse at center, black 55%, transparent 90%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 55%, transparent 90%)',
          }}
        />
        <h2 className="mb-3 font-serif text-2xl text-ink-primary">A preview of the Copier</h2>
        <p className="mb-6 text-sm text-ink-secondary">
          Sample data showing how the Copier mirrors a leader account to your followers.
          Connect your accounts to go live.
        </p>
        <Button variant="gold" size="lg" onClick={handleCta} className="w-full">
          {ctaLabel ?? 'Explore the preview'}
        </Button>
      </div>
    </div>
  );
}
