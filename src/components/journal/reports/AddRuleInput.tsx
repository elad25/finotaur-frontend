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
        className="flex-1 bg-black/30 border border-yellow-200/15 rounded-xl px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-[#C9A646]/40 disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-zinc-600"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="px-4 py-2 rounded-xl border border-yellow-500/40 bg-yellow-600/25 text-yellow-100 hover:bg-yellow-600/35 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition"
      >
        Add
      </button>
    </div>
  );
}
