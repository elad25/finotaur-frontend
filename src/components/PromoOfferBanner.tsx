// src/components/PromoOfferBanner.tsx
// =====================================================
// FINOTAUR PROMO OFFER BANNER — JOIN2026
// =====================================================
// Site-wide, dismissible top strip (green→purple, gently animated) that
// opens a popup revealing the discount code. Mounted in ProtectedAppLayout.
// Click the strip  → popup with the JOIN2026 code + copy-to-clipboard.
// Click the X      → dismiss (persisted in localStorage).
//
// Offer: Trade Journal Premium for ~$10/mo — $35.00 off the first 3 payments
// (Premium regular price $44.99/mo). All copy is English (FINOTAUR iron rule).
// =====================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const PROMO_CODE = 'JOIN2026';
const DISMISS_KEY = 'finotaur_promo_join2026_dismissed';

export default function PromoOfferBanner() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore storage failures */
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      toast.success('Promo code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (dismissed) return null;

  return (
    <>
      {/* ── Top strip ─────────────────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the Trade Journal Premium offer"
        className="relative flex w-full items-center justify-center gap-2 overflow-hidden px-10 py-2 text-center text-sm font-semibold text-white"
        style={{
          backgroundImage:
            'linear-gradient(90deg, #16a34a 0%, #22c55e 25%, #7c3aed 75%, #9333ea 100%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Moving shine sweep — adds subtle motion to draw the eye */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
          }}
          animate={{ x: ['-150%', '450%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.span
          aria-hidden="true"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 12, -12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative inline-flex"
        >
          <Gift className="h-4 w-4 text-yellow-200" />
        </motion.span>

        <span className="relative">
          Limited offer — Trade Journal Premium for just{' '}
          <span className="font-extrabold underline decoration-yellow-200 decoration-2 underline-offset-2">
            $10/mo
          </span>
          . Tap to reveal your code
        </span>

        {/* Dismiss */}
        <span
          role="button"
          tabIndex={0}
          onClick={handleDismiss}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleDismiss(e as unknown as React.MouseEvent);
          }}
          aria-label="Dismiss offer"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </span>
      </motion.button>

      {/* ── Popup ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Trade Journal Premium offer"
                className="relative w-full max-w-md overflow-hidden rounded-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(16,18,16,0.98) 0%, rgba(10,10,14,0.99) 100%)',
                  border: '2px solid rgba(124,58,237,0.55)',
                  boxShadow: '0 0 60px rgba(34,197,94,0.25), 0 0 80px rgba(124,58,237,0.25)',
                }}
              >
                {/* Close */}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
                >
                  <X className="h-5 w-5 text-white/70" />
                </button>

                {/* Header */}
                <div className="px-6 pb-4 pt-8 text-center">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(124,58,237,0.25) 100%)',
                      border: '2px solid rgba(124,58,237,0.5)',
                    }}
                  >
                    <Gift className="h-8 w-8 text-emerald-300" />
                  </motion.div>

                  <h2 className="mb-1 text-2xl font-bold text-white">
                    Trade Journal Premium
                  </h2>
                  <p className="text-3xl font-extrabold">
                    <span className="mr-2 align-middle text-base font-medium text-slate-500 line-through">
                      $44.99
                    </span>
                    <span className="bg-gradient-to-r from-emerald-400 to-violet-400 bg-clip-text align-middle text-transparent">
                      $10
                    </span>
                    <span className="align-middle text-base font-medium text-slate-400">
                      /month
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    $35.00 off your first 3 payments
                  </p>
                </div>

                {/* Promo code box */}
                <div className="px-6 pb-6">
                  <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                    Use this code
                  </p>
                  <div
                    onClick={handleCopyCode}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleCopyCode();
                    }}
                    className="group relative cursor-pointer rounded-xl p-4 transition-transform hover:scale-[1.01]"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(124,58,237,0.12) 100%)',
                      border: '2px dashed rgba(124,58,237,0.5)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold tracking-wider text-white">
                        {PROMO_CODE}
                      </p>
                      <span className="rounded-lg bg-violet-500/20 p-3 transition-colors group-hover:bg-violet-500/30">
                        {copied ? (
                          <Check className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Copy className="h-5 w-5 text-violet-300" />
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {copied ? 'Copied to clipboard' : 'Click to copy — then apply it at checkout'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
