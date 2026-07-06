export interface CopierDemoBannerProps {
  className?: string;
}

export function CopierDemoBanner({ className }: CopierDemoBannerProps) {
  return (
    <div
      className={`w-full border-b border-gold-primary/20 bg-gold-primary/10 px-4 py-2 text-center ${className ?? ''}`}
    >
      <p className="text-xs md:text-sm text-ink-secondary">
        <span className="font-semibold text-gold-primary">Sample data</span>
        {" — you're viewing a preview of the Copier. Connect a broker account to go live with your own trades."}
      </p>
    </div>
  );
}
