import { NavLink } from 'react-router-dom';
import { PageTemplate } from '@/components/PageTemplate';
import { Card, Eyebrow } from '@/components/ds/Card';
import { futuresTabs, type FuturesTabId } from './data';

interface FuturesPageShellProps {
  active: FuturesTabId;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function FuturesPageShell({ active, title, description, children }: FuturesPageShellProps) {
  return (
    <PageTemplate title={title} description={description}>
      <div className="space-y-ds-5">
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

        <div className="grid grid-cols-2 gap-ds-2 md:grid-cols-5">
          {futuresTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === active;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={[
                  'flex min-h-12 items-center gap-ds-2 rounded-[12px] border px-ds-3 py-ds-3 text-sm transition-colors duration-base ease-out',
                  isActive
                    ? 'border-gold-border bg-gold-primary/10 text-gold-primary'
                    : 'border-border-ds-subtle bg-surface-1 text-ink-secondary hover:border-border-ds-default hover:text-ink-primary',
                ].join(' ')}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </NavLink>
            );
          })}
        </div>

        {children}
      </div>
    </PageTemplate>
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
