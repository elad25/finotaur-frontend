import { useEffect, useState } from 'react';
import { Button } from '@/components/ds/Button';

const DISMISS_KEY = 'finotaur_journal_demo_overlay_dismissed_v1';

export function DemoSyncOverlay() {
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
        <h2 className="mb-3 font-serif text-2xl text-ink-primary">A preview of your journal</h2>
        <p className="mb-6 text-sm text-ink-secondary">
          Sample data so you can see how everything works. Your first trade takes over — synced automatically.
        </p>
        <Button variant="gold" size="lg" onClick={dismiss} className="w-full">
          Explore the preview
        </Button>
      </div>
    </div>
  );
}
