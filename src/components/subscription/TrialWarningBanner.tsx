// src/components/subscription/TrialWarningBanner.tsx
// 🔥 v2.0: Updated for 2-tier model (Basic with trial, Premium without)

import { AlertCircle, X, Clock, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';

export function TrialWarningBanner() {
  const navigate = useNavigate();
 const { 
  tradesRemaining, 
  isLimitReached, 
  isPremium, 
  isBasic,
  isInTrial,
  trialDaysRemaining,
  isLegacyFreeUser,
  limits 
} = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if premium (unlimited trades)
  if (isPremium) return null;

  // Don't show if dismissed
  if (dismissed) return null;

  // 🔥 v2.0: Different scenarios:
  // 1. Trial user approaching end of trial
  // 2. Basic user approaching trade limit
  // 3. Basic user hit trade limit
  // 4. Trial ended (no longer in trial, no subscription)

const isTrialEnding = isInTrial && trialDaysRemaining !== undefined && trialDaysRemaining <= 3;
const isApproachingLimit = !isPremium && tradesRemaining <= 3 && tradesRemaining > 0;
const shouldShow = isLimitReached || isApproachingLimit || isTrialEnding || isLegacyFreeUser;
  
  if (!shouldShow) return null;

  // Determine the message and styling based on scenario
const getContent = () => {
  // Legacy free users - must select a plan
  if (isLegacyFreeUser) {
    return {
      bgColor: 'bg-red-500/10 border-red-500/20',
      iconColor: 'text-red-400',
      icon: AlertCircle,
      message: (
        <>
          <span className="font-bold">Action required!</span>
          {' '}Your free account needs to be upgraded. Select a plan to continue trading.
        </>
      ),
      ctaText: 'Select Plan',
      canDismiss: false,
    };
  }

  // Trial ending soon
  if (isTrialEnding && trialDaysRemaining !== undefined) {
    return {
        bgColor: 'bg-blue-500/10 border-blue-500/20',
        iconColor: 'text-blue-400',
        icon: Clock,
        message: (
          <>
            <span className="font-bold">
              {trialDaysRemaining === 0 
                ? 'Your trial ends today!' 
                : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left in your trial.`
              }
            </span>
            {' '}Subscribe now to keep your access.
          </>
        ),
        ctaText: 'Subscribe Now',
        canDismiss: trialDaysRemaining > 1,
      };
    }

    // Trade limit reached (Basic users)
    if (isLimitReached) {
      return {
        bgColor: 'bg-red-500/10 border-red-500/20',
        iconColor: 'text-red-400',
        icon: AlertCircle,
        message: (
          <>
            <span className="font-bold">Monthly trade limit reached.</span>
            {' '}You've used all {limits?.max_trades || 25} trades this month.
            {isPremium ? '' : ' Upgrade to Premium for unlimited trades.'}
          </>
        ),
        ctaText: 'Upgrade to Premium',
        canDismiss: false,
      };
    }

    // Approaching trade limit (Basic users)
    if (isApproachingLimit) {
      return {
        bgColor: 'bg-gold/10 border-gold/20',
        iconColor: 'text-gold',
        icon: AlertCircle,
        message: (
          <>
            <span className="font-bold">{tradesRemaining} trades remaining this month.</span>
            {' '}Upgrade to Premium for unlimited access.
          </>
        ),
        ctaText: 'Upgrade to Premium',
        canDismiss: true,
      };
    }

    // Default fallback
    return {
      bgColor: 'bg-gold/10 border-gold/20',
      iconColor: 'text-gold',
      icon: AlertCircle,
      message: (
        <>
          <span className="font-bold">Upgrade for more features.</span>
          {' '}Get unlimited trades and AI insights.
        </>
      ),
      ctaText: 'View Plans',
      canDismiss: true,
    };
  };

  const content = getContent();
  const IconComponent = content.icon;

  return (
    <div className={`relative border-b ${content.bgColor}`} style={{ backgroundColor: '#0A0A0A' }}>
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Message */}
          <div className="flex items-center gap-3 flex-1">
            <IconComponent className={`h-5 w-5 flex-shrink-0 ${content.iconColor}`} />
            <p className="text-sm font-medium text-white">
              {content.message}
            </p>
          </div>

          {/* Right: CTA + Dismiss */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="bg-gold text-base-900 hover:bg-gold/90 font-medium h-8"
              onClick={() => navigate('/pricing')}
            >
              {content.ctaText}
            </Button>
            
            {content.canDismiss && (
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