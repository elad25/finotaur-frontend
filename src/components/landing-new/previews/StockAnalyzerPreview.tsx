// src/components/landing-new/previews/StockAnalyzerPreview.tsx
// ================================================
// Real product screenshot (AI Stock Analyzer) for the landing INVESTOR
// section. Captured from the live app; live price removed so the shot
// stays evergreen. Asset: /landing-shots/analyzer.png
// ================================================

interface StockAnalyzerPreviewProps {
  className?: string;
}

export function StockAnalyzerPreview({ className = "" }: StockAnalyzerPreviewProps) {
  return (
    <figure
      className={`overflow-hidden rounded-[12px] border border-border-ds-subtle bg-surface-1 shadow-card-featured ${className}`}
    >
      <img
        src="/landing-shots/analyzer.png"
        alt="Finotaur AI Stock Analyzer — institutional-grade research with bull case, bear case, and options flow"
        className="block h-auto w-full"
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}

export default StockAnalyzerPreview;
