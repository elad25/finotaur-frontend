// src/components/ds/AvatarPicker.tsx
// Inline avatar picker grid — shows all 30 character options.
// Used inside the Settings General tab Profile card.
//
// Props:
//   value     — currently selected avatar_character id (null = none / monogram)
//   onChange  — called with new id when user picks (or null to clear)
//   saving    — disables interaction while saving

import { useState } from 'react';
import { CharacterAvatar, AVATAR_IDS, AVATAR_META } from '@/components/ds/CharacterAvatar';
import { cn } from '@/lib/utils';

interface AvatarPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  saving?: boolean;
}

const CATEGORIES = [
  { key: 'animal',    label: 'Animals' },
  { key: 'character', label: 'Characters' },
  { key: 'abstract',  label: 'Abstract' },
] as const;

export function AvatarPicker({ value, onChange, saving = false }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);

  const currentLabel = value ? AVATAR_META[value]?.label : null;

  return (
    <div className="grid gap-1.5">
      <span className="text-sm text-zinc-300">Avatar</span>

      {/* Preview + toggle button */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-zinc-800/60 border border-zinc-700/40">
          {value ? (
            <CharacterAvatar id={value} size={48} />
          ) : (
            <span className="text-[18px] font-bold text-zinc-400">?</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {currentLabel && (
            <span className="text-sm text-white font-medium">{currentLabel}</span>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setOpen(o => !o)}
              className="text-xs text-[#C9A646] underline underline-offset-2 hover:text-[#D4B456] transition-colors disabled:opacity-40"
            >
              {open ? 'Close' : value ? 'Change avatar' : 'Choose avatar'}
            </button>
            {value && !open && (
              <button
                type="button"
                disabled={saving}
                onClick={() => onChange(null)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable grid */}
      {open && (
        <div className="mt-3 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4">
          {CATEGORIES.map(({ key, label }) => {
            const ids = AVATAR_IDS.filter(id => AVATAR_META[id]?.category === key);
            return (
              <div key={key} className="mb-4 last:mb-0">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500 mb-2">
                  {label}
                </p>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {ids.map(id => (
                    <button
                      key={id}
                      type="button"
                      disabled={saving}
                      title={AVATAR_META[id]?.label}
                      onClick={() => {
                        onChange(id);
                        setOpen(false);
                      }}
                      className={cn(
                        'rounded-full overflow-hidden transition-all duration-150',
                        'ring-offset-1 ring-offset-zinc-900',
                        value === id
                          ? 'ring-2 ring-[#C9A646] scale-110'
                          : 'ring-1 ring-transparent hover:ring-zinc-500 hover:scale-105',
                        'disabled:pointer-events-none disabled:opacity-40',
                      )}
                    >
                      <CharacterAvatar id={id} size={40} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-zinc-500">Shown next to your posts in the community.</p>
    </div>
  );
}
