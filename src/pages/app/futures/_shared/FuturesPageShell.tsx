import { Card, Eyebrow } from '@/components/ds/Card';

interface FuturesPageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function FuturesPageShell({ children }: FuturesPageShellProps) {
  return (
    <div className="animate-fade-in space-y-ds-5">
      <Card variant="featured" padding="compact" className="flex flex-col gap-ds-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-ds-1">
          <Eyebrow>Licensed-data safe</Eyebrow>
          <p className="text-sm text-ink-secondary">
            Futures quotes, live charts, DOM, volume, and exchange open-interest data remain sealed until a licensed feed is approved.
            This desk uses static contract specs, local calculators, and educational market structure only.
          </p>
        </div>
        <div className="rounded-md border border-gold-border bg-gold-primary/10 px-ds-3 py-ds-2 text-xs font-medium text-gold-primary">
          No CME data fetches
        </div>
      </Card>

      {children}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="space-y-ds-1">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-xl font-semibold text-ink-primary">{title}</h2>
      {description ? <p className="text-sm text-ink-secondary">{description}</p> : null}
    </div>
  );
}
