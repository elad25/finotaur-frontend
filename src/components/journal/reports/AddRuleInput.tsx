import { useState, KeyboardEvent } from 'react';

type Props = { onAdd: (text: string) => void; disabled?: boolean };

export default function AddRuleInput({ onAdd, disabled }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="New daily rule..."
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        maxLength={200}
        className="flex-1 bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-ink-primary outline-none focus:ring-1 focus:ring-[#C9A646]/40 disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-ink-tertiary"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="px-4 py-2 rounded-xl border border-[#C9A646]/40 bg-[#C9A646]/55 text-white hover:bg-[#C9A646]/65 shadow-[0_0_18px_rgba(201,166,70,0.18)] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all"
      >
        Add
      </button>
    </div>
  );
}
