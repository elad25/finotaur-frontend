import * as React from 'react';

const CHIPS: string[] = [
  "Add a trade I just closed",
  "Show me my last 5 losing trades",
  "What's my biggest tilt pattern this week?",
  "Tag my recent NQ trades with 'reversal'",
];

interface PromptChipsProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export default function PromptChips({ onSelect, disabled = false }: PromptChipsProps): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-ds-2">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(chip)}
          className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-3 text-left text-sm text-ink-secondary hover:border-gold-primary/40 hover:text-ink-primary transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
