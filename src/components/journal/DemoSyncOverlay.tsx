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
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold-primary/10 text-gold-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
        <h2 className="mb-3 font-serif text-2xl text-ink-primary">Your journal syncs every 5 minutes</h2>
        <p className="mb-6 text-sm text-ink-secondary">
          Everything you see here is a sample preview so you can explore how your journal
          works — the charts, stats, calendar and strategies. As soon as you place your first
          trade, your real data replaces it automatically.
        </p>
        <Button variant="gold" size="lg" onClick={dismiss} className="w-full">
          Got it — explore the preview
        </Button>
      </div>
    </div>
  );
}
