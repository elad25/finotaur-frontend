// src/components/subscription/TrialWarningBanner.tsx

import { AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';

export function TrialWarningBanner() {
  const navigate = useNavigate();
  const { tradesRemaining, isLimitReached, isPremium, limits } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if premium
  if (isPremium) return null;

  // Don't show if dismissed
  if (dismissed) return null;

  // Show warning when 3 or fewer trades remaining, or limit reached
  const shouldShow = isLimitReached || (tradesRemaining <= 3 && tradesRemaining > 0);
  
  if (!shouldShow) return null;

  return (
    <div 
      className={`relative border-b ${
        isLimitReached 
          ? 'bg-red-500/10 border-red-500/20' 
          : 'bg-gold/10 border-gold/20'
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Message */}
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
              isLimitReached ? 'text-red-400' : 'text-gold'
            }`} />
            <p className="text-sm font-medium text-white">
              {isLimitReached ? (
                <>
                  <span className="font-bold">Free trial ended.</span> You've used all {limits?.max_trades || 10} free trades. Upgrade to continue trading.
                </>
              ) : (
                <>
                  <span className="font-bold">{tradesRemaining} free trades remaining.</span> Upgrade for unlimited access.
                </>
              )}
            </p>
          </div>

          {/* Right: CTA + Dismiss */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="bg-gold text-base-900 hover:bg-gold/90 font-medium h-8"
              onClick={() => navigate('/pricing')}
            >
              Upgrade Now
            </Button>
            
            {!isLimitReached && (
              <button
                onClick={() => setDismissed(true)}
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}