// src/components/fino/FinoInstantAnswerCard.tsx
// =====================================================
// FINO AI — renders a computed InstantAnswer (see src/lib/finoInstantAnswers.ts)
// inside the chat drawer's message list. Zero AI cost — the numbers come
// straight from the trader's own trades. A footer button lets the user still
// ask FINO to explain "why" (spends 1 AI question) via onAskFino.
// =====================================================

import { Zap, Sparkles } from 'lucide-react';
import type { InstantAnswer } from '@/lib/finoInstantAnswers';

const TONE_TEXT_CLASS: Record<'neutral' | 'good' | 'warn', string> = {
  neutral: 'text-ink-primary',
  good: 'text-[#4ADE80]',
  warn: 'text-[#F59E0B]',
};

export default function FinoInstantAnswerCard({
  answer,
  onAskFino,
  onDismiss,
}: {
  answer: InstantAnswer;
  onAskFino: (question: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="mx-4 mb-2 rounded-xl border border-border-ds-subtle bg-surface-1 p-4"
      style={{ borderLeft: '2px solid #C9A646' }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-gold-primary" />
          <span className="text-xs font-bold text-ink-primary">{answer.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="text-ink-tertiary transition-colors hover:text-ink-primary"
          >
            ✕
          </button>
        </div>
      </div>

      {answer.stats.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {answer.stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-[9px] uppercase tracking-wide text-ink-tertiary">{stat.label}</p>
              <p className={`text-sm font-bold tabular-nums ${TONE_TEXT_CLASS[stat.tone]}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mb-3 text-[11px] leading-relaxed text-ink-tertiary">{answer.verdict}</p>

      <button
        type="button"
        onClick={() => onAskFino(answer.followUp)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9A646]/30 bg-[#C9A646]/5 px-3 py-1.5 text-[11px] font-semibold text-gold-primary transition-colors hover:bg-[#C9A646]/10"
      >
        <Sparkles className="h-3 w-3" />
        {answer.followUpLabel ?? 'Ask FINO why'}
      </button>
    </div>
  );
}
