import { Check } from 'lucide-react';

/**
 * Supporting reassurance placed OUTSIDE the gold "Start free" button.
 * The gold button holds only "Start free"; the reassurance lives here as
 * green-check items (no pill): "14 days of full access" and "No credit card".
 */
export function StartFreeLabel({ className = '' }: { className?: string }) {
  const item = (text: string) => (
    <span className="inline-flex items-center gap-1.5">
      <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden />
      {text}
    </span>
  );

  return (
    <span
      className={`inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm font-medium text-white/75 ${className}`}
    >
      {item('14 days of full access')}
      {item('No credit card')}
    </span>
  );
}
