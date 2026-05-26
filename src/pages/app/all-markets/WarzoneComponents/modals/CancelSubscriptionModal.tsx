// =====================================================
// CANCEL SUBSCRIPTION MODAL — Mandatory Feedback (2026-05-26)
// =====================================================
// Two-step flow:
//   1. "reason"  — pick a reason + write ≥1 word feedback (BOTH required)
//   2. "confirm" — final confirmation summary, then submit
//
// The "Continue" button on step 1 stays disabled until BOTH:
//   - a reason is selected
//   - feedback.trim() has at least 1 non-whitespace character
//
// onConfirm receives the structured cancellation data. The parent is
// responsible for POSTing to /api/users/me/cancellation-feedback AND
// invoking the actual Whop cancel call (in that order).
// =====================================================

import { memo, useCallback, useState } from 'react';
import { X, XCircle, Loader2, Check, AlertTriangle } from 'lucide-react';

export interface CancelFeedbackData {
  reason_id: string;
  reason_label: string;
  feedback: string;
}

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CancelFeedbackData) => Promise<void> | void;
  isProcessing: boolean;
  trialDaysRemaining: number | null;
}

const CANCEL_REASONS = [
  { id: 'too_expensive',        label: 'Too expensive' },
  { id: 'not_using',            label: 'Not using it enough' },
  { id: 'missing_feature',      label: 'Missing a feature I need' },
  { id: 'bug_or_issue',         label: 'Bugs / poor experience' },
  { id: 'switching_competitor', label: 'Switching to a competitor' },
  { id: 'temporary_break',      label: 'Temporary break — will return' },
  { id: 'business_change',      label: 'Financial or personal change' },
  { id: 'never_intended',       label: 'Never intended to keep it' },
  { id: 'unclear_value',        label: 'Did not understand the value' },
  { id: 'other',                label: 'Other' },
] as const;

const CancelSubscriptionModal = memo(function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  trialDaysRemaining,
}: CancelSubscriptionModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [step, setStep] = useState<'reason' | 'confirm'>('reason');

  const isInTrial = trialDaysRemaining !== null && trialDaysRemaining > 0;
  const feedbackValid = feedback.trim().length > 0;
  const canContinue = !!selectedReason && feedbackValid;

  const handleClose = useCallback(() => {
    setSelectedReason('');
    setFeedback('');
    setStep('reason');
    onClose();
  }, [onClose]);

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    setStep('confirm');
  }, [canContinue]);

  const handleSubmit = useCallback(async () => {
    if (!canContinue) return;
    const reasonObj = CANCEL_REASONS.find((r) => r.id === selectedReason);
    await onConfirm({
      reason_id: selectedReason,
      reason_label: reasonObj?.label || selectedReason,
      feedback: feedback.trim(),
    });
  }, [canContinue, selectedReason, feedback, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={isProcessing ? undefined : handleClose} />
      <div className="relative bg-gradient-to-br from-[#1a1410] via-[#12100c] to-[#0a0806] border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-red-500/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              {step === 'reason' ? (
                <XCircle className="w-5 h-5 text-red-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {step === 'reason' ? 'Cancel Subscription' : 'Confirm Cancellation'}
              </h2>
              <p className="text-xs text-zinc-400">
                {step === 'reason' ? "We're sorry to see you go" : 'This action cannot be undone'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-red-400/60" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          {isInTrial && step === 'reason' && (
            <div className="bg-green-500/5 rounded-xl p-3 border border-green-500/20 mb-4">
              <p className="text-green-400 font-semibold text-sm">
                Free trial — {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} left. Cancel = no charge.
              </p>
            </div>
          )}

          {step === 'reason' ? (
            <div className="space-y-4">
              {/* Reasons */}
              <div className="space-y-2">
                <p className="text-xs text-zinc-300 font-medium">Why are you cancelling? <span className="text-red-400">*</span></p>
                <div className="space-y-1.5">
                  {CANCEL_REASONS.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => setSelectedReason(reason.id)}
                      className={`w-full px-3 py-2 rounded-lg border text-left transition-all flex items-center justify-between ${
                        selectedReason === reason.id
                          ? 'border-red-500/50 bg-red-500/10'
                          : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-sm text-white">{reason.label}</span>
                      {selectedReason === reason.id && <Check className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback — REQUIRED */}
              <div>
                <label className="flex items-center gap-2 text-xs text-zinc-300 font-medium mb-1">
                  Tell us more <span className="text-red-400">*</span>
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500 font-normal">required</span>
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What would have kept you? At least one word — the team reads every response."
                  className={`w-full px-3 py-2 bg-zinc-800 border rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 resize-none transition-colors ${
                    feedbackValid ? 'border-zinc-700 focus:ring-red-500/50' : 'border-red-500/40 focus:ring-red-500/60'
                  }`}
                  rows={3}
                  maxLength={1000}
                  aria-required="true"
                  aria-invalid={!feedbackValid}
                />
                <div className="flex justify-between mt-1">
                  <p className={`text-[11px] ${feedbackValid ? 'text-zinc-500' : 'text-red-400'}`}>
                    {feedbackValid ? '✓ Looks good' : 'Required — at least one word'}
                  </p>
                  <p className="text-[11px] text-zinc-600">{feedback.length}/1000</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-200 text-sm">
                  Your subscription will be cancelled. You'll keep access until the end of your billing period.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800 space-y-1">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Reason</p>
                <p className="text-sm text-white">{CANCEL_REASONS.find((r) => r.id === selectedReason)?.label}</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800 space-y-1">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Your feedback</p>
                <p className="text-sm text-white whitespace-pre-wrap break-words">{feedback.trim()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-red-500/20 flex gap-2 flex-shrink-0">
          {step === 'reason' ? (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-3 py-2 rounded-xl font-bold bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black text-sm"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className="flex-1 px-3 py-2 rounded-xl border border-red-500/30 text-red-400 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500/10 transition-colors"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('reason')}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 rounded-xl border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Subscription'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default CancelSubscriptionModal;
