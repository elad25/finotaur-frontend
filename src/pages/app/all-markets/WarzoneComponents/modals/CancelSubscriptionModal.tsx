// =====================================================
// CANCEL SUBSCRIPTION MODAL - ORIGINAL SIMPLE DESIGN
// =====================================================

import { memo } from 'react';
import { X, XCircle, Loader2 } from 'lucide-react';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  trialDaysRemaining: number | null;
}

const CancelSubscriptionModal = memo(function CancelSubscriptionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isProcessing, 
  trialDaysRemaining 
}: CancelSubscriptionModalProps) {
  if (!isOpen) return null;
  
  const isInTrial = trialDaysRemaining !== null && trialDaysRemaining > 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-gradient-to-br from-[#1a1410] via-[#12100c] to-[#0a0806] border border-red-500/30 rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Cancel Subscription</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-red-500/10">
            <X className="w-5 h-5 text-red-400/60" />
          </button>
        </div>
        <div className="p-6">
          {isInTrial && (
            <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/20 mb-6">
              <p className="text-green-400 font-semibold text-sm">
                Free trial - {trialDaysRemaining} days left. Cancel = no charge.
              </p>
            </div>
          )}
          <p className="text-[#C9A646]/70 text-center mb-6">Are you sure?</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={onClose} 
              className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black"
            >
              Keep Subscription
            </button>
            <button 
              onClick={onConfirm} 
              disabled={isProcessing} 
              className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 font-semibold flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CancelSubscriptionModal;