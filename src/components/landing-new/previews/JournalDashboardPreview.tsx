// src/components/landing-new/previews/JournalDashboardPreview.tsx
// ================================================
// Real product screenshot (Journal performance dashboard) for the
// landing TRADER section. Captured from the live app; identifying data
// swapped for demo values. Asset: /landing-shots/dashboard.png
// ================================================

interface JournalDashboardPreviewProps {
  className?: string;
}

export function JournalDashboardPreview({ className = "" }: JournalDashboardPreviewProps) {
  return (
    <figure
      className={`overflow-hidden rounded-[12px] border border-border-ds-subtle bg-surface-1 shadow-card-featured ${className}`}
    >
      <img
        src="/landing-shots/dashboard.png"
        alt="Finotaur trading journal performance dashboard — net P&L, win rate, equity curve"
        className="block h-auto w-full"
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}

export default JournalDashboardPreview;
