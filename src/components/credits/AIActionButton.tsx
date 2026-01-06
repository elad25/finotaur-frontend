// src/components/credits/AIActionButton.tsx
// =====================================================
// FINOTAUR AI CREDITS - ACTION BUTTON
// =====================================================
// A reusable button component that handles credit spending
// Use this for any AI-powered action in the app
// =====================================================

import { useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '@/hooks/useCredits';
import { 
  CREDIT_COSTS, 
  ACTION_TYPES, 
  ACTION_DISPLAY,
  type CreditAction 
} from '@/constants/credits';
import { Button, ButtonProps } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, Lock, AlertTriangle, ArrowRight } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface AIActionButtonProps extends Omit<ButtonProps, 'onClick'> {
  action: CreditAction;
  onExecute: () => Promise<void> | void;
  children: ReactNode;
  showCost?: boolean;
  confirmHeavy?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================
// COMPONENT
// ============================================

export function AIActionButton({
  action,
  onExecute,
  children,
  showCost = true,
  confirmHeavy = true,
  metadata = {},
  disabled,
  className,
  ...buttonProps
}: AIActionButtonProps) {
  const navigate = useNavigate();
  const { spendCredits, canAfford, getEffectiveCost, status } = useCredits();
  
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showInsufficent, setShowInsufficient] = useState(false);

  const baseCost = CREDIT_COSTS[action];
  const actionType = ACTION_TYPES[action];
  const effectiveCost = getEffectiveCost(action);
  const display = ACTION_DISPLAY[actionType];
  const affordable = canAfford(action);

  // ============================================
  // HANDLE CLICK
  // ============================================

  const handleClick = async () => {
    // Light actions - just execute
    if (actionType === 'light') {
      setLoading(true);
      try {
        await onExecute();
      } finally {
        setLoading(false);
      }
      return;
    }

    // Check if free user trying heavy action
    if (actionType === 'heavy' && status?.plan === 'free') {
      setShowUpgrade(true);
      return;
    }

    // Check if can afford
    if (!affordable) {
      setShowInsufficient(true);
      return;
    }

    // Heavy action confirmation (if enabled)
    if (confirmHeavy && actionType === 'heavy') {
      setShowConfirm(true);
      return;
    }

    // Execute the action
    await executeAction();
  };

  const executeAction = async () => {
    setLoading(true);
    setShowConfirm(false);

    try {
      const result = await spendCredits(action, metadata);

      if (result.success) {
        await onExecute();
      } else if (result.requiresUpgrade) {
        setShowUpgrade(true);
      } else if (result.canPurchase) {
        setShowInsufficient(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleClick}
              disabled={disabled || loading}
              className={className}
              {...buttonProps}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                showCost && effectiveCost > 0 && (
                  <Badge 
                    variant="outline" 
                    className={`mr-2 ${display.bgColor} ${display.color} ${display.borderColor} text-xs`}
                  >
                    {display.icon} {effectiveCost}
                  </Badge>
                )
              )}
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <span className={display.color}>{display.icon} {display.label}</span>
              {effectiveCost > 0 && (
                <span className="text-zinc-400 ml-2">
                  {effectiveCost} credit{effectiveCost !== 1 ? 's' : ''}
                  {effectiveCost !== baseCost && (
                    <span className="text-orange-400 ml-1">(2x soft cap)</span>
                  )}
                </span>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Heavy Action Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C9A646]" />
              Confirm AI Action
            </DialogTitle>
            <DialogDescription>
              This is a heavy AI action that will use <strong className="text-white">{effectiveCost} credits</strong>.
              {effectiveCost !== baseCost && (
                <span className="block mt-1 text-orange-400">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Soft cap active - 2x cost applied
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={executeAction}
              className="bg-[#C9A646] text-black hover:bg-[#B8963F]"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Required Dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#C9A646]" />
              Upgrade Required
            </DialogTitle>
            <DialogDescription>
              Heavy AI actions require a paid plan. Upgrade to unlock powerful AI features!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>
              Maybe Later
            </Button>
            <Button 
              onClick={() => {
                setShowUpgrade(false);
                navigate('/app/all-markets/pricing');
              }}
              className="bg-[#C9A646] text-black hover:bg-[#B8963F]"
            >
              View Plans <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insufficient Credits Dialog */}
      <Dialog open={showInsufficent} onOpenChange={setShowInsufficient}>
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Insufficient Credits
            </DialogTitle>
            <DialogDescription>
              You need <strong className="text-white">{effectiveCost} credits</strong> for this action, 
              but only have <strong className="text-white">{status?.creditsTotal || 0}</strong> available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInsufficient(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowInsufficient(false);
                navigate('/app/credits/purchase');
              }}
              className="bg-[#C9A646] text-black hover:bg-[#B8963F]"
            >
              Buy Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AIActionButton;