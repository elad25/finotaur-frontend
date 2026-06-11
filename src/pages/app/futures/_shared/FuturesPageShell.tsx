import { GlassCard } from '@/pages/app/crypto/_shared/GlassUI';
import { cn } from '@/lib/utils';

interface FuturesPageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function FuturesPageShell({ children }: FuturesPageShellProps) {
  return (
    <div className="animate-fade-in space-y-5">
      {/* Compliance notice — amber-accented glass card */}
      <GlassCard glow="amber" className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wider font-medium text-amber-400/80">
            Licensed-data safe
          </p>
          <p className="text-sm text-white/50 leading-6">
            Futures quotes, live charts, DOM, volume, and exchange open-interest data remain sealed until a licensed feed is approved.
            This desk uses static contract specs, local calculators, and educational market structure only.
          </p>
        </div>
        <div className="flex-shrink-0 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-400 whitespace-nowrap">
          No CME data fetches
        </div>
      </GlassCard>

      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between mb-4', className)}>
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wider font-medium text-amber-400/70">{eyebrow}</p>
        <h2 className="text-base sm:text-lg font-bold text-white/90">{title}</h2>
        {description && <p className="text-xs text-white/40 leading-5">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
