// src/components/PromoOfferChip.tsx
// =====================================================
// FINOTAUR PROMO OFFER CHIP — JOIN2026
// =====================================================
// Compact green pill that lives in the TopNav (between the FINOTAUR logo
// and the search omnibox). Gently animated (shine sweep + pulsing gift)
// to draw clicks. Click → popup revealing the JOIN2026 code with
// copy-to-clipboard.
//
// Offer: Trade Journal Premium for ~$10/mo — $35.00 off the first 3 payments
// (Premium regular price $44.99/mo). All copy is English (FINOTAUR iron rule).
// =====================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const PROMO_CODE = 'JOIN2026';

export default function PromoOfferChip() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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

  return (
    <>
      {/* ── Green chip (in the TopNav) ────────────────────────────── */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Trade Journal Premium offer — $10/month"
        className="group relative inline-flex flex-shrink-0 items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 text-xs font-semibold text-white"
        style={{
          backgroundImage: 'linear-gradient(135deg, #15803d 0%, #22c55e 50%, #16a34a 100%)',
          boxShadow: '0 0 0 1px rgba(34,197,94,0.35), 0 2px 10px rgba(34,197,94,0.35)',
        }}
        animate={{ boxShadow: [
          '0 0 0 1px rgba(34,197,94,0.35), 0 2px 10px rgba(34,197,94,0.30)',
          '0 0 0 1px rgba(34,197,94,0.55), 0 2px 16px rgba(34,197,94,0.55)',
          '0 0 0 1px rgba(34,197,94,0.35), 0 2px 10px rgba(34,197,94,0.30)',
        ] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Moving shine sweep */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
          }}
          animate={{ x: ['-150%', '400%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
        />

        <motion.span
          aria-hidden="true"
          animate={{ rotate: [0, 12, -12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative inline-flex"
        >
          <Gift className="h-3.5 w-3.5 text-yellow-100" />
        </motion.span>

        <span className="relative hidden whitespace-nowrap sm:inline">
          Premium for $10
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
              className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Trade Journal Premium offer"
                className="relative w-full max-w-md overflow-hidden rounded-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(13,20,15,0.98) 0%, rgba(8,12,9,0.99) 100%)',
                  border: '2px solid rgba(34,197,94,0.55)',
                  boxShadow: '0 0 60px rgba(34,197,94,0.30)',
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
                        'linear-gradient(135deg, rgba(34,197,94,0.35) 0%, rgba(22,163,74,0.18) 100%)',
                      border: '2px solid rgba(34,197,94,0.5)',
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
                    <span className="align-middle text-emerald-400">$10</span>
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
                        'linear-gradient(135deg, rgba(34,197,94,0.14) 0%, rgba(22,163,74,0.08) 100%)',
                      border: '2px dashed rgba(34,197,94,0.5)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold tracking-wider text-white">
                        {PROMO_CODE}
                      </p>
                      <span className="rounded-lg bg-emerald-500/20 p-3 transition-colors group-hover:bg-emerald-500/30">
                        {copied ? (
                          <Check className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Copy className="h-5 w-5 text-emerald-300" />
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
