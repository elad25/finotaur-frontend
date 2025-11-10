// src/components/subscription/SubscriptionStatus.tsx

import { useSubscription } from '@/hooks/useSubscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Crown,
  ArrowUpRight
} from 'lucide-react';
import { formatTradesRemaining, getUpgradeUrgency } from '@/utils/subscriptionHelpers';

export function SubscriptionStatus() {
  const { limits, loading, isPremium, isFreeTrial, tradesRemaining, canAddTrade } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="rounded-2xl border border-yellow-200/20 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      </Card>
    );
  }

  if (!limits) {
    return null;
  }

  const urgency = getUpgradeUrgency(limits);
  const usagePercent = limits.max_trades > 0 
    ? (limits.trades_created_total / limits.max_trades) * 100 
    : 0;

  return (
    <Card className="rounded-2xl border border-yellow-200/20 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isPremium ? (
            <div className="p-2 rounded-lg bg-gold/20 border border-gold/30">
              <Crown className="h-5 w-5 text-gold" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700">
              <Zap className="h-5 w-5 text-zinc-400" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-white">
              {isPremium ? 'Premium Plan' : 'Free Trial'}
            </h3>
            <p className="text-xs text-zinc-400">
              {limits.subscription_status === 'active' ? 'Active' : 
               limits.subscription_status === 'trial' ? 'Trial Period' : 
               'Inactive'}
            </p>
          </div>
        </div>

        {!isPremium && (
          <Button
            size="sm"
            onClick={() => navigate('/pricing')}
            className="bg-gold text-base-900 hover:bg-gold/90 font-semibold"
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Upgrade
          </Button>
        )}
      </div>

      {/* Usage Stats */}
      <div className="space-y-4">
        {/* Trade Count */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">
              {isPremium ? 'Trades This Month' : 'Trial Trades Used'}
            </span>
            <span className="text-sm font-semibold text-white">
              {isPremium ? limits.trade_count : `${limits.trades_created_total} / ${limits.max_trades}`}
            </span>
          </div>

          {!isPremium && (
            <>
              {/* Progress Bar */}
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    urgency === 'critical' ? 'bg-red-500' :
                    urgency === 'high' ? 'bg-orange-500' :
                    urgency === 'medium' ? 'bg-yellow-500' :
                    'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>

              {/* Status Message */}
              {urgency !== 'none' && (
                <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg border ${
                  urgency === 'critical' 
                    ? 'bg-red-500/5 border-red-500/20' :
                  urgency === 'high' 
                    ? 'bg-orange-500/5 border-orange-500/20' :
                  urgency === 'medium'
                    ? 'bg-yellow-500/5 border-yellow-500/20' :
                    'bg-blue-500/5 border-blue-500/20'
                }`}>
                  <AlertCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                    urgency === 'critical' ? 'text-red-400' :
                    urgency === 'high' ? 'text-orange-400' :
                    urgency === 'medium' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-300">
                      {urgency === 'critical' && (
                        <>You've reached your trial limit. Upgrade to continue adding trades.</>
                      )}
                      {urgency === 'high' && (
                        <>Only {tradesRemaining} trades left! Upgrade now for unlimited trades.</>
                      )}
                      {urgency === 'medium' && (
                        <>{tradesRemaining} trades remaining in your trial. Consider upgrading soon.</>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Active Trades */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Active Trades</span>
            <span className="text-sm font-semibold text-white">{limits.trade_count}</span>
          </div>
        </div>

        {/* Features List for Free Users */}
        {isFreeTrial && (
          <div className="pt-4 border-t border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 mb-3">Premium Benefits:</p>
            <ul className="space-y-2">
              {[
                'Unlimited trades',
                'Advanced analytics',
                'AI insights',
                'Strategy tracking',
                'Export reports'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                  <CheckCircle2 className="h-3 w-3 text-gold" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Premium Benefits for Premium Users */}
        {isPremium && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>All premium features unlocked</span>
            </div>
            
            {limits.subscription_expires_at && (
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                <span>
                  Renews on {new Date(limits.subscription_expires_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
