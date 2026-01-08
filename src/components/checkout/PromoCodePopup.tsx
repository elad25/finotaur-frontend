// src/components/checkout/PromoCodePopup.tsx
// =====================================================
// FINOTAUR PROMO CODE POPUP - v1.0.0
// =====================================================
// Shows before checkout to inform users about the discount
// =====================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Copy, Check, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PromoCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  promoCode?: string;
  productName?: string;
  originalPrice?: number;
  discountedPrice?: number;
  trialDays?: number;
  discountMonths?: number;
}

export default function PromoCodePopup({
  isOpen,
  onClose,
  onContinue,
  promoCode = 'FINOTAUR50',
  productName = 'Top Secret',
  originalPrice = 70,
  discountedPrice = 35,
  trialDays = 14,
  discountMonths = 2,
}: PromoCodePopupProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(promoCode);
      setCopied(true);
      toast.success('Promo code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleContinue = () => {
    onContinue();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-md rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.99) 100%)',
                border: '2px solid rgba(201,166,70,0.5)',
                boxShadow: '0 0 60px rgba(201,166,70,0.3)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>

              {/* Header with Sparkles */}
              <div className="relative pt-8 pb-4 px-6 text-center">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.3) 0%, rgba(201,166,70,0.1) 100%)',
                    border: '2px solid rgba(201,166,70,0.5)',
                  }}
                >
                  <Gift className="w-8 h-8 text-[#C9A646]" />
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-2">
                  🎁 Exclusive Offer!
                </h2>
                <p className="text-slate-400">
                  Use this promo code at checkout
                </p>
              </div>

              {/* Promo Code Box */}
              <div className="px-6 pb-4">
                <div
                  className="relative p-4 rounded-xl cursor-pointer group"
                  onClick={handleCopyCode}
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)',
                    border: '2px dashed rgba(201,166,70,0.5)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#C9A646] font-medium mb-1">PROMO CODE</p>
                      <p className="text-2xl font-bold text-white tracking-wider">{promoCode}</p>
                    </div>
                    <button
                      className="p-3 rounded-lg bg-[#C9A646]/20 hover:bg-[#C9A646]/30 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-[#C9A646]" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Click to copy</p>
                </div>
              </div>

              {/* Benefits */}
              <div className="px-6 pb-4">
                <div className="space-y-3">
                  {/* Trial */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{trialDays} Days FREE Trial</p>
                      <p className="text-xs text-slate-400">No charge today</p>
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 font-bold text-sm">50%</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        <span className="line-through text-slate-500 mr-2">${originalPrice}</span>
                        <span className="text-emerald-400">${discountedPrice}/month</span>
                      </p>
                      <p className="text-xs text-slate-400">For the first {discountMonths} months</p>
                    </div>
                  </div>

                  {/* After Discount */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-[#C9A646]/20 flex items-center justify-center">
                      <span className="text-[#C9A646] font-bold text-sm">→</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">${originalPrice}/month after</p>
                      <p className="text-xs text-slate-400">Regular price • Cancel anytime</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="px-6 pb-4">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-amber-200 text-sm text-center">
                    💡 <strong>Paste the code</strong> in the "Promo code" field on the next page
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <div className="p-6 pt-2">
                <Button
                  onClick={handleContinue}
                  className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    color: '#000',
                    boxShadow: '0 8px 32px rgba(201,166,70,0.4)',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    Continue to Checkout
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>

                <p className="text-xs text-center text-slate-500 mt-3">
                  Secure checkout powered by Whop
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}