// src/components/credits/CreditBalance.tsx
// =====================================================
// FINOTAUR AI CREDITS - HEADER BALANCE WIDGET
// =====================================================
// Version: 1.0.0
// Date: 2026-01-03
// =====================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreditsDisplay } from '@/hooks/useCredits';
import { formatCredits, PLAN_CONFIGS, CREDIT_PACKS } from '@/constants/credits';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, 
  Zap, 
  Crown, 
  ChevronDown,
  Flame,
  Plus,
  ArrowRight,
  Gift,
  Clock
} from 'lucide-react';

// ============================================
// COMPONENT
// ============================================

export function CreditBalance() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { 
    total, 
    monthly, 
    purchased, 
    rollover,
    plan, 
    loading, 
    softCapActive,
    heavyRemaining 
  } = useCreditsDisplay();

  const planConfig = PLAN_CONFIGS[plan];
  const usagePercent = planConfig.monthlyCredits > 0 
    ? Math.round((monthly / planConfig.monthlyCredits) * 100) 
    : 0;

  // ============================================
  // LOADING STATE
  // ============================================
  
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 animate-pulse">
        <Sparkles className="w-4 h-4 text-[#C9A646]" />
        <span className="text-sm text-zinc-400">...</span>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg 
            transition-all duration-200 hover:scale-105
            ${softCapActive 
              ? 'bg-orange-500/20 border border-orange-500/40' 
              : 'bg-zinc-800/80 border border-zinc-700/50 hover:border-[#C9A646]/40'
            }
          `}
        >
          {softCapActive ? (
            <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#C9A646]" />
          )}
          
          <span className={`text-sm font-medium ${softCapActive ? 'text-orange-400' : 'text-white'}`}>
            {formatCredits(total)}
          </span>
          
          <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-80 p-0 bg-zinc-900 border border-zinc-700"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C9A646]" />
              <span className="font-semibold text-white">AI Credits</span>
            </div>
            <Badge 
              variant="outline" 
              className={`
                ${plan === 'pro' 
                  ? 'bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/40' 
                  : plan === 'core'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40'
                }
              `}
            >
              {plan === 'pro' && <Crown className="w-3 h-3 mr-1" />}
              {planConfig.name}
            </Badge>
          </div>
          
          {/* Total Balance */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{formatCredits(total)}</span>
            <span className="text-sm text-zinc-500">credits</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-4 space-y-3">
          {/* Monthly Progress */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-zinc-400">Monthly ({planConfig.monthlyCredits})</span>
              <span className="text-white font-medium">{monthly}</span>
            </div>
            <Progress 
              value={usagePercent} 
              className="h-2 bg-zinc-800"
            />
          </div>

          {/* Additional Credits */}
          {(purchased > 0 || rollover > 0) && (
            <div className="flex gap-3 text-sm">
              {purchased > 0 && (
                <div className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-zinc-400">Purchased:</span>
                  <span className="text-emerald-400 font-medium">{purchased}</span>
                </div>
              )}
              {rollover > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-zinc-400">Rollover:</span>
                  <span className="text-blue-400 font-medium">{rollover}</span>
                </div>
              )}
            </div>
          )}

          {/* Soft Cap Warning */}
          {softCapActive && (
            <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <div className="flex items-center gap-2 text-orange-400 text-sm">
                <Flame className="w-4 h-4" />
                <span className="font-medium">You're on fire today!</span>
              </div>
              <p className="text-xs text-orange-400/70 mt-1 ml-6">
                Heavy actions now cost 2x credits
              </p>
            </div>
          )}

          {/* Heavy Actions Counter */}
          {plan !== 'free' && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#C9A646]" />
                <span className="text-sm text-zinc-400">Heavy actions today</span>
              </div>
              <span className={`text-sm font-medium ${heavyRemaining === 0 ? 'text-orange-400' : 'text-white'}`}>
                {heavyRemaining}/{planConfig.dailyHeavyLimit}
              </span>
            </div>
          )}
        </div>

        <Separator className="bg-zinc-800" />

        {/* Actions */}
        <div className="p-3 space-y-2">
          {/* Buy Credits - Only for paid plans */}
          {plan !== 'free' && (
            <Button
              variant="outline"
              className="w-full justify-between border-[#C9A646]/40 text-[#C9A646] hover:bg-[#C9A646]/10"
              onClick={() => {
                setOpen(false);
                navigate('/app/credits/purchase');
              }}
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Buy Credit Pack
              </span>
              <span className="text-xs text-zinc-500">from ${CREDIT_PACKS[0].price}</span>
            </Button>
          )}

          {/* Upgrade CTA for Free/Core */}
          {plan !== 'pro' && plan !== 'enterprise' && (
            <Button
              className="w-full bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black font-semibold hover:opacity-90"
              onClick={() => {
                setOpen(false);
                navigate('/app/all-markets/pricing');
              }}
            >
              {plan === 'free' ? 'Upgrade to Core' : 'Upgrade to Pro'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {/* View Usage History */}
          <Button
            variant="ghost"
            className="w-full text-zinc-400 hover:text-white"
            onClick={() => {
              setOpen(false);
              navigate('/app/settings#credits');
            }}
          >
            View usage history
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default CreditBalance;