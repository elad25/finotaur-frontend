import React, { useEffect, useState } from 'react';
import CommandPalette from './CommandPalette';
import '@/styles/command-palette.css';

export default function CommandSearchButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
        onClick={() => setOpen(true)}
        title="Search (Ctrl/Cmd+K)"
      >
        Search…
      </button>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  );
}
