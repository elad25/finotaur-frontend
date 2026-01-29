// =====================================================
// CANCEL SUBSCRIPTION MODAL - Code Split Modal
// =====================================================

import { memo, useState, useCallback } from 'react';
import { X, AlertCircle, Loader2, XCircle, Heart, Shield, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  membershipId: string | null;
  onSuccess: () => void;
}

const CancelSubscriptionModal = memo(function CancelSubscriptionModal({ 
  isOpen, 
  onClose, 
  membershipId,
  onSuccess 
}: CancelSubscriptionModalProps) {
  const [step, setStep] = useState<'confirm' | 'reason' | 'processing' | 'success' | 'error'>('confirm');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const reasons = [
    { id: 'too_expensive', label: 'Too expensive', icon: '💰' },
    { id: 'not_useful', label: 'Not finding it useful', icon: '📊' },
    { id: 'found_alternative', label: 'Found an alternative', icon: '🔄' },
    { id: 'temporary_break', label: 'Taking a break', icon: '⏸️' },
    { id: 'other', label: 'Other reason', icon: '💭' },
  ];

  const handleCancel = useCallback(async () => {
    if (!membershipId) {
      setErrorMessage('No active membership found');
      setStep('error');
      return;
    }

    setStep('processing');

    try {
      const response = await fetch(`${API_BASE}/api/whop/cancel-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membership_id: membershipId,
          reason: selectedReason,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
          onClose();
          setStep('confirm');
          setSelectedReason(null);
        }, 2000);
      } else {
        setErrorMessage(data.error || 'Failed to cancel subscription');
        setStep('error');
      }
    } catch (error) {
      setErrorMessage('Network error. Please try again.');
      setStep('error');
    }
  }, [membershipId, selectedReason, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setStep('confirm');
      setSelectedReason(null);
      setErrorMessage('');
    }, 300);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-md bg-black/80" onClick={handleClose} />
      
      <div className="relative w-full max-w-md">
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(30,25,18,0.99) 0%, rgba(15,12,8,1) 100%)',
            border: '1px solid rgba(201,166,70,0.3)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}
        >
          
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all z-10"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>

          <div className="p-6">
            
            {step === 'confirm' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-500/15 border border-red-500/30">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                </div>
                
                <h3 className="text-white font-bold text-xl text-center mb-2">Cancel Subscription?</h3>
                <p className="text-slate-400 text-center text-sm mb-6">
                  You'll lose access to all War Zone features at the end of your billing period.
                </p>

                <div className="space-y-2 mb-6">
                  {[
                    { icon: Shield, text: 'Daily Intelligence Reports' },
                    { icon: Clock, text: 'Weekly Tactical Reviews' },
                    { icon: Heart, text: 'Discord Community Access' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                      <item.icon className="w-4 h-4 text-red-400/70" />
                      <span className="text-slate-400 text-sm">{item.text}</span>
                      <XCircle className="w-4 h-4 text-red-400/50 ml-auto" />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)',
                      color: '#000',
                      boxShadow: '0 4px 20px rgba(201,166,70,0.4)'
                    }}
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={() => setStep('reason')}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm bg-white/[0.03] border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 'reason' && (
              <>
                <h3 className="text-white font-bold text-xl text-center mb-2">Help us improve</h3>
                <p className="text-slate-400 text-center text-sm mb-6">Why are you canceling? (Optional)</p>

                <div className="space-y-2 mb-6">
                  {reasons.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => setSelectedReason(reason.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                        selectedReason === reason.id
                          ? "bg-[#C9A646]/15 border border-[#C9A646]/40 text-white"
                          : "bg-white/[0.02] border border-white/[0.06] text-slate-400 hover:border-[#C9A646]/20"
                      )}
                    >
                      <span className="text-lg">{reason.icon}</span>
                      <span className="text-sm">{reason.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('confirm')}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm bg-white/[0.03] border border-white/10 text-slate-400 hover:bg-white/[0.06] transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-500 text-white transition-all"
                  >
                    Cancel Subscription
                  </button>
                </div>
              </>
            )}

            {step === 'processing' && (
              <div className="py-8 text-center">
                <Loader2 className="w-12 h-12 text-[#C9A646] animate-spin mx-auto mb-4" />
                <p className="text-white font-semibold">Processing cancellation...</p>
                <p className="text-slate-400 text-sm mt-1">Please wait</p>
              </div>
            )}

            {step === 'success' && (
              <div className="py-8 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-green-500/15 border border-green-500/30 mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-semibold">Subscription Canceled</p>
                <p className="text-slate-400 text-sm mt-1">You'll retain access until end of billing period</p>
              </div>
            )}

            {step === 'error' && (
              <div className="py-8 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-500/15 border border-red-500/30 mx-auto mb-4">
                  <XCircle className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-white font-semibold">Cancellation Failed</p>
                <p className="text-red-400 text-sm mt-1 mb-4">{errorMessage}</p>
                <button
                  onClick={() => setStep('confirm')}
                  className="px-6 py-2 rounded-xl font-semibold text-sm bg-white/[0.03] border border-white/10 text-slate-300 hover:bg-white/[0.06] transition-all"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default CancelSubscriptionModal;