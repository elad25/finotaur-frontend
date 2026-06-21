// src/features/settings/CancellationFeedbackFields.tsx
// Reusable required-feedback fields shown inside each subscription cancel dialog.
// Wired to the existing subscription_cancellation_feedback pipeline.

import type { CancellationReason } from "@/services/accountLifecycleService";

interface CancellationFeedbackFieldsProps {
  reasons: CancellationReason[];
  reasonId: string;
  onReasonChange: (id: string) => void;
  text: string;
  onTextChange: (text: string) => void;
}

export function CancellationFeedbackFields({
  reasons,
  reasonId,
  onReasonChange,
  text,
  onTextChange,
}: CancellationFeedbackFieldsProps) {
  return (
    <div className="mx-6 mb-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Why are you cancelling? <span className="text-red-400">*</span>
        </label>
        <select
          value={reasonId}
          onChange={(e) => onReasonChange(e.target.value)}
          className="w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors"
        >
          <option value="" disabled>Select a reason…</option>
          {reasons.map((r) => (
            <option key={r.id} value={r.id}>{r.label_en}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          What could we improve? <span className="text-red-400">*</span>
        </label>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={3}
          placeholder="Tell us what didn't work, or what would have made you stay…"
          className="w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Your feedback goes straight to the founder.
        </p>
      </div>
    </div>
  );
}
