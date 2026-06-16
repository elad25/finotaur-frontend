// src/components/fino/FinoExplains.tsx
// =====================================================
// Reusable "Fino Explains" panel — a gold, collapsible
// <details> card that explains what a page/tool does.
// Collapsed by default; click the chevron to reveal the body.
// Place it where you want (pass positioning via className).
// =====================================================

import type { ReactNode } from 'react';
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

export function FinoExplains({
  title,
  children,
  className = 'mt-ds-3 ml-auto w-fit',
  contentClassName = 'lg:w-[300px]',
  defaultOpen = false,
}: FinoExplainsProps) {
  return (
    <aside className={className}>
      <details
        className="group w-fit rounded-[12px] border border-gold-border bg-surface-1"
        open={defaultOpen}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-ds-4 py-ds-2 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2.5">
            <img
              src="/fino-avatar.png"
              alt="Fino"
              className="h-9 w-9 rounded-full object-cover ring-1 ring-gold-border"
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-primary">
              Fino Explains
            </span>
          </div>
          <ChevronDown
            size={16}
            className="text-gold-primary transition-transform duration-200 group-open:rotate-180"
          />
        </summary>

        <div className={`flex flex-col gap-ds-3 px-ds-4 pb-ds-4 ${contentClassName}`}>
          <p className="text-[15px] font-semibold leading-tight text-ink-primary">
            {title}
          </p>
          <div className="text-[13px] leading-relaxed text-ink-secondary">{children}</div>
        </div>
      </details>
    </aside>
  );
}

export default FinoExplains;
