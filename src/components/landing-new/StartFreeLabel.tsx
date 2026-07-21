/**
 * Supporting label placed OUTSIDE the gold "Start free" button.
 * The gold button holds only "Start free"; the reassurance ("14 days of full
 * access" + a green "No credit card" pill) lives here, next to / below it.
 *
 * - default:  14 days of full access   [ No credit card ]
 * - pillOnly: [ No credit card ]        (for the tight navbar)
 */
export function StartFreeLabel({
  pillOnly = false,
  className = '',
}: {
  pillOnly?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm font-medium text-white/75 whitespace-nowrap ${className}`}
    >
      {!pillOnly && <span>14 days of full access</span>}
      <span className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide leading-none text-white shadow-sm">
        No credit card
      </span>
    </span>
  );
}
