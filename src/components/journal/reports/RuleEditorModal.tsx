import { useState, useEffect } from 'react';
import type { ProgressRule } from '@/hooks/useProgressTracker';

type Props = {
  open: boolean;
  rule: ProgressRule | null;
  onClose: () => void;
  onSave: (id: string, text: string) => void;
};

export default function RuleEditorModal({ open, rule, onClose, onSave }: Props) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (rule) setText(rule.text);
  }, [rule]);

  if (!open || !rule) return null;

  const trimmed = text.trim();
  const saveDisabled = !trimmed || trimmed === rule.text;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-6 w-full max-w-md space-y-4 shadow-xl">
        <h2 className="text-base font-semibold text-ink-primary">Edit rule</h2>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={200}
          autoFocus
          className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-ink-primary outline-none focus:ring-1 focus:ring-[#C9A646]/40"
          onKeyDown={e => {
            if (e.key === 'Enter' && !saveDisabled) onSave(rule.id, trimmed);
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-ink-secondary hover:text-ink-primary hover:bg-white/[0.06] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(rule.id, trimmed)}
            disabled={saveDisabled}
            className="px-4 py-2 rounded-xl border border-[#C9A646]/40 bg-[#C9A646]/55 text-white hover:bg-[#C9A646]/65 shadow-[0_0_18px_rgba(201,166,70,0.18)] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
