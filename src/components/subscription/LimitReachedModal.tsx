// src/components/subscription/LimitReachedModal.tsx
// ✅✅✅ UPDATED: Better messaging for 30+ trades limit

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lock, Zap, CheckCircle2, AlertCircle, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LimitReachedModalProps {
  open: boolean;
  onClose: () => void;
  tradesUsed: number;
  maxTrades: number;
}

export function LimitReachedModal({ 
  open, 
  onClose, 
  tradesUsed, 
  maxTrades 
}: LimitReachedModalProps) {
  const navigate = useNavigate();
  
  // ✅ Check if this is FREE (10 trades) or BASIC (30+ trades)
  const isFreeUser = maxTrades <= 10;
  const isBasicUser = maxTrades > 10 && tradesUsed >= 30;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0A0A0A] border-[#C9A646]/20">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#C9A646]/10 border-2 border-[#C9A646]/30">
            {isFreeUser ? (
              <Lock className="h-8 w-8 text-[#C9A646]" />
            ) : (
              <Ban className="h-8 w-8 text-red-400" />
            )}
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-white">
            {isFreeUser ? 'Free Trial Limit Reached' : 'Monthly Limit Reached'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Usage Stats */}
          <div className="text-center">
            <p className="text-zinc-400 mb-2">You've created</p>
            <div className="text-4xl font-black text-[#C9A646]">
              {tradesUsed}{isFreeUser ? `/${maxTrades}` : ''}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {isFreeUser ? 'free trades' : 'trades this month'}
            </p>
          </div>

          {/* Important Notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-300">
                {isFreeUser 
                  ? 'Deleting trades won\'t reset the counter.'
                  : 'Your monthly limit resets on the 1st of next month. Upgrade to Premium for unlimited trades.'
                }
              </p>
            </div>
          </div>

          {/* Upgrade Benefits */}
          <div className="rounded-xl border border-[#C9A646]/30 bg-gradient-to-br from-[#C9A646]/10 to-[#C9A646]/5 p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="mt-0.5 rounded-full bg-[#C9A646]/20 p-2">
                <Zap className="h-4 w-4 text-[#C9A646]" />
              </div>
              <div>
                <p className="font-semibold text-white">Upgrade to Premium</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Never hit a limit again
                </p>
              </div>
            </div>

            <ul className="space-y-2">
              {[
                '∞ Unlimited trades',
                '📊 Advanced analytics & charts',
                '🤖 AI-powered insights',
                '📈 Strategy performance tracking',
                '📄 Export reports (PDF/CSV)',
                '⚡ Priority support'
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-[#C9A646] flex-shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Price */}
          <div className="text-center py-2">
            <span className="text-3xl font-black text-white">$12.99</span>
            <span className="text-zinc-400">/month</span>
            <p className="text-xs text-zinc-500 mt-1">Cancel anytime • No hidden fees</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-zinc-700 hover:bg-zinc-800"
              onClick={onClose}
            >
              {isFreeUser ? 'Maybe Later' : 'Close'}
            </Button>
            <Button
              className="flex-1 bg-[#C9A646] text-black hover:bg-[#E5C158] font-bold shadow-lg shadow-[#C9A646]/20"
              onClick={() => {
                navigate('/app/journal/pricing');
                onClose();
              }}
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}