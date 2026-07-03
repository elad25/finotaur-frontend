export function DemoBanner() {
  return (
    <div className="w-full border-b border-gold-primary/20 bg-gold-primary/10 px-4 py-2 text-center">
      <p className="text-xs md:text-sm text-ink-secondary">
        <span className="font-semibold text-gold-primary">Sample data</span>
        {' — a live preview of your trading journal. Your real data replaces it automatically after your first trade.'}
      </p>
    </div>
  );
}
