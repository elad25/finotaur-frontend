// src/features/settings/CancellationFeedbackFields.tsx
// Reusable required-feedback fields shown inside each subscription cancel dialog.
// Wired to the existing subscription_cancellation_feedback pipeline.
// Uses the Radix Select (dark, site-matching) instead of a native <select>
// so the open dropdown isn't an OS-rendered light-grey list.

import type { CancellationReason } from "@/services/accountLifecycleService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <Select value={reasonId} onValueChange={onReasonChange}>
          <SelectTrigger className="w-full h-auto bg-zinc-800/60 border-zinc-700 text-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-zinc-500 data-[placeholder]:text-zinc-500">
            <SelectValue placeholder="Select a reason…" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
            {reasons.map((r) => (
              <SelectItem
                key={r.id}
                value={r.id}
                className="text-sm text-zinc-200 focus:bg-zinc-800 focus:text-white cursor-pointer"
              >
                {r.label_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
