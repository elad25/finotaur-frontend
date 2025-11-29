// =====================================================
// FINOTAUR COUPON INPUT COMPONENT
// =====================================================
// Place this in: src/features/affiliate/components/CouponInput.tsx
// =====================================================

import { useState } from 'react';
import { Tag, X, Check, Loader2, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CouponInputProps {
  manualCode: string;
  setManualCode: (code: string) => void;
  onApply: () => Promise<boolean>;
  onRemove: () => void;
  isValidating: boolean;
  error: string | null;
  validatedCode: { code: string; affiliateName?: string } | null;
  discountPercent: number;
  savings?: number;
}

export default function CouponInput({
  manualCode,
  setManualCode,
  onApply,
  onRemove,
  isValidating,
  error,
  validatedCode,
  discountPercent,
  savings,
}: CouponInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // If code is already applied, show success state
  if (validatedCode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-xl p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-semibold text-sm">
                  {validatedCode.code}
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {Math.round(discountPercent * 100)}% OFF
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {validatedCode.affiliateName 
                  ? `Referred by ${validatedCode.affiliateName}`
                  : 'Discount applied!'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {savings && savings > 0 && (
              <span className="text-emerald-400 font-bold text-lg">
                -${savings.toFixed(2)}
              </span>
            )}
            <button
              onClick={onRemove}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
              aria-label="Remove coupon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Collapsed state - just show "Have a coupon?" link
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 text-[#C9A646] hover:text-[#E5C158] text-sm font-medium transition-colors group"
      >
        <Tag className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        <span>Have a coupon or referral code?</span>
      </button>
    );
  }

  // Expanded state - show input
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && onApply()}
            placeholder="Enter code (e.g., FINOTAUR-ALEX)"
            className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-[#C9A646]/50 focus:ring-1 focus:ring-[#C9A646]/20 transition-all"
            disabled={isValidating}
          />
        </div>
        
        <button
          onClick={onApply}
          disabled={isValidating || !manualCode.trim()}
          className="px-5 py-3 bg-[#C9A646] hover:bg-[#E5C158] disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-semibold rounded-xl transition-all text-sm flex items-center gap-2 min-w-[100px] justify-center"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            'Apply'
          )}
        </button>
        
        <button
          onClick={() => {
            setIsExpanded(false);
            setManualCode('');
          }}
          className="p-3 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-red-400 text-xs flex items-center gap-1.5"
          >
            <X className="w-3 h-3" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// DISCOUNT BADGE COMPONENT
// For showing discount on plan cards
// ============================================

export function DiscountBadge({ 
  percent, 
  className = '' 
}: { 
  percent: number; 
  className?: string;
}) {
  if (percent <= 0) return null;
  
  return (
    <div className={`inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full ${className}`}>
      <Percent className="w-3 h-3" />
      <span>{Math.round(percent * 100)}% OFF</span>
    </div>
  );
}

// ============================================
// PRICE DISPLAY COMPONENT
// Shows original and discounted price
// ============================================

export function PriceDisplay({
  originalPrice,
  discountedPrice,
  period = '/month',
  featured = false,
}: {
  originalPrice: number;
  discountedPrice?: number;
  period?: string;
  featured?: boolean;
}) {
  const hasDiscount = discountedPrice && discountedPrice < originalPrice;
  
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-baseline gap-2">
        {hasDiscount && (
          <span className="text-lg text-zinc-500 line-through">
            ${originalPrice.toFixed(2)}
          </span>
        )}
        <span className={`text-4xl font-bold ${featured ? 'text-[#C9A646]' : 'text-white'}`}>
          ${(discountedPrice || originalPrice).toFixed(2)}
        </span>
        <span className="text-slate-400 text-sm">{period}</span>
      </div>
      
      {hasDiscount && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-emerald-400 text-sm font-semibold"
        >
          You save ${(originalPrice - discountedPrice).toFixed(2)}!
        </motion.span>
      )}
    </div>
  );
}