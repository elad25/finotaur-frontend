// src/components/fino/FinoExplains.tsx
// =====================================================
// Reusable "Fino Explains" panel — a gold, collapsible
// card that explains what a page/tool does.
// Collapsed by default; click the chevron to reveal the body.
// Place it where you want (pass positioning via className).
//
// The expanded panel is rendered via a React portal to
// document.body with position: fixed so it can escape any
// ancestor `overflow-hidden` / stacking context (e.g.
// CopilotPageHeader's `relative overflow-hidden` wrapper).
// =====================================================

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface FinoExplainsProps {
  /** Headline question, e.g. "What is the Company Research Center?" */
  title: string;
  /** Explanation body (text or nodes). */
  children: ReactNode;
  /** Extra classes for the outer <aside> (e.g. positioning). */
  className?: string;
  /** Classes controlling the expanded body width (default lg:w-[300px]). */
  contentClassName?: string;
  /** Start expanded. Defaults to collapsed. */
  defaultOpen?: boolean;
}

interface PanelCoords {
  top: number;
  right: number;
}

export function FinoExplains({
  title,
  children,
  className = 'mt-ds-3 ml-auto w-fit',
  contentClassName = 'w-[300px]',
  defaultOpen = false,
}: FinoExplainsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateCoords();

    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <aside className={className}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-fit cursor-pointer list-none items-center justify-between gap-2 rounded-full border border-gold-border bg-black py-1 pl-1.5 pr-3"
      >
        <div className="flex items-center gap-2">
          <img
            src="/fino-avatar.png"
            alt="Fino"
            className="h-6 w-6 rounded-full object-cover ring-1 ring-gold-border"
          />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-gold-bright">
            Fino Explains
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`text-gold-primary/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 60 }}
            className={`flex max-w-[80vw] flex-col gap-ds-3 rounded-2xl border border-gold-border bg-black p-3.5 shadow-xl shadow-black/60 ${contentClassName}`}
          >
            <p className="text-[15px] font-semibold leading-tight text-ink-primary">
              {title}
            </p>
            <div className="text-[13px] leading-relaxed text-ink-secondary">{children}</div>
          </div>,
          document.body,
        )}
    </aside>
  );
}

export default FinoExplains;
