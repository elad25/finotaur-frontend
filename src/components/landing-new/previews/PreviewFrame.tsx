// src/components/landing-new/previews/PreviewFrame.tsx
// ================================================
// Shared "browser chrome" frame for product-preview components on the
// landing page. Provides the title bar (3 dots + mono label) so every
// preview shares the same window-chrome treatment.
// ================================================

import type { ReactNode } from "react";

interface PreviewFrameProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export const PreviewFrame = ({ label, children, className = "" }: PreviewFrameProps) => {
  return (
    <div
      className={`rounded-[12px] border border-border-ds-subtle bg-surface-1 overflow-hidden shadow-card-featured ${className}`}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-ds-4 py-ds-3 border-b border-border-ds-subtle bg-section-card-rest">
        <span className="w-[9px] h-[9px] rounded-full bg-ink-muted/40" />
        <span className="w-[9px] h-[9px] rounded-full bg-ink-muted/40" />
        <span className="w-[9px] h-[9px] rounded-full bg-ink-muted/40" />
        <span className="ml-ds-2 font-mono text-[11px] tracking-[0.12em] text-ink-tertiary uppercase">
          {label}
        </span>
      </div>

      {/* Content */}
      <div className="p-ds-5">{children}</div>
    </div>
  );
};

export default PreviewFrame;
