// src/components/subscription/BasicLimitReachedModal.tsx
// 🔥 DEDICATED MODAL FOR BASIC USERS WHO HIT 25 TRADES LIMIT
// Different design & messaging from FREE users

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Zap, CheckCircle2, TrendingUp, Infinity, BarChart3, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BasicLimitReachedModalProps {
  open: boolean;
  onClose: () => void;
  tradesUsed: number;
  daysUntilReset?: number; // Days until the 1st of next month
}

export function BasicLimitReachedModal({ 
  open, 
  onClose, 
  tradesUsed,
  daysUntilReset = 0
}: BasicLimitReachedModalProps) {
  const navigate = useNavigate();

  // Calculate days until reset if not provided
  const getDaysUntilReset = () => {
    if (daysUntilReset > 0) return daysUntilReset;
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const diffTime = nextMonth.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const days = getDaysUntilReset();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-[#0A0A0A] to-[#111] border-purple-500/30 shadow-2xl shadow-purple-500/10">
        <DialogHeader>
          {/* Premium Crown Icon */}
          <div className="mx-auto mb-4 relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-purple-500/40">
              <Crown className="h-10 w-10 text-purple-400" />
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-xl -z-10" />
          </div>
          
          <DialogTitle className="text-center text-2xl font-bold text-white">
            You're Trading Like a Pro! 🔥
          </DialogTitle>
          <p className="text-center text-zinc-400 text-sm mt-2">
            You've maxed out your Basic plan this month
          </p>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Usage Stats - More visual */}
          <div className="relative rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-5 overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
            
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Trades this month</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{tradesUsed}</span>
                  <span className="text-lg text-zinc-500">/ 25</span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-zinc-400 mb-1">Resets in</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-purple-400">{days}</span>
                  <span className="text-sm text-zinc-500">days</span>
                </div>
              </div>
            </div>
            
            {/* Progress bar - full */}
            <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-purple-500 to-red-500 rounded-full" />
            </div>
          </div>

          {/* Why Wait Message */}
          <div className="text-center py-2">
            <p className="text-zinc-300">
              <span className="text-purple-400 font-semibold">Don't wait {days} days</span> to continue your trading journey
            </p>
          </div>

          {/* Premium Benefits - Grid Style */}
          <div className="rounded-2xl border border-[#C9A646]/30 bg-gradient-to-br from-[#C9A646]/10 to-[#C9A646]/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-[#C9A646]/20">
                <Zap className="h-5 w-5 text-[#C9A646]" />
              </div>
              <div>
                <p className="font-bold text-[#C9A646]">Upgrade to Premium</p>
                <p className="text-xs text-zinc-400">Everything in Basic, plus:</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Infinity, text: 'Unlimited trades', highlight: true },
                { icon: BarChart3, text: 'Advanced analytics' },
                { icon: TrendingUp, text: 'AI insights' },
                { icon: Clock, text: 'Priority support' },
              ].map((benefit, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-2 p-2.5 rounded-lg ${
                    benefit.highlight 
                      ? 'bg-[#C9A646]/20 border border-[#C9A646]/30' 
                      : 'bg-zinc-800/50'
                  }`}
                >
                  <benefit.icon className={`h-4 w-4 ${benefit.highlight ? 'text-[#C9A646]' : 'text-zinc-400'}`} />
                  <span className={`text-sm ${benefit.highlight ? 'text-[#C9A646] font-semibold' : 'text-zinc-300'}`}>
                    {benefit.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Price Comparison */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-center opacity-50">
              <p className="text-xs text-zinc-500 line-through">Basic $19.99</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600" />
            <div className="text-center">
              <span className="text-3xl font-black text-[#C9A646]">$24.92</span>
              <span className="text-zinc-400">/mo</span>
              <p className="text-xs text-emerald-400 mt-0.5">Only $4.93 more!</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              className="w-full h-12 bg-gradient-to-r from-[#C9A646] to-[#E5C158] text-black hover:from-[#E5C158] hover:to-[#C9A646] font-bold text-base shadow-lg shadow-[#C9A646]/30 transition-all hover:scale-[1.02]"
              onClick={() => {
                navigate('/app/journal/pricing');
                onClose();
              }}
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Premium
            </Button>
            
            <Button
              variant="ghost"
              className="w-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              onClick={onClose}
            >
              I'll wait {days} days for reset
            </Button>
          </div>

          {/* Trust badge */}
          <p className="text-center text-xs text-zinc-600">
            ✓ Cancel anytime • ✓ Instant access • ✓ No hidden fees
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}