/**
 * Shared label for the primary "Start free" CTA buttons.
 * Keeps the "Start free" wording in the button's own (gold) style and moves the
 * no-card reassurance into a distinct green pill. Used across the landing CTAs
 * (Hero, Navbar, TraderSection) so every button reads the same.
 *
 * - full (default): "Start free — 14 days of full access"  [ No credit card ]
 * - compact:        "Start free"                            [ No credit card ]
 */
export function StartFreeLabel({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
      {compact ? 'Start free' : 'Start free — 14 days of full access'}
      <span className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none text-white shadow-sm">
        No credit card
      </span>
    </span>
  );
}
