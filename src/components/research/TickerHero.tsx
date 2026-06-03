/**
 * TickerHero — header section for a ticker research page.
 *
 * Displays: large ticker symbol, company name, sector/industry badges,
 * current price + change (DS Price/Change components), "as of" date,
 * and a gold CTA button linking to /register.
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ds/Button';
import { Price, Change } from '@/components/ds/NumberDisplay';
import type { SeoTickerData } from '@/lib/seo/types';

interface TickerHeroProps {
  t: SeoTickerData;
}

export function TickerHero({ t }: TickerHeroProps) {
  const hasSector = t.sector != null;
  const hasIndustry = t.industry != null;
  const hasPrice = t.price.last != null;
  const hasChange = t.price.change_pct != null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-6 md:p-8">
      {/* Subtle gold glow top-left */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#C9A646]/[0.12] blur-[80px]" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {/* Left: identity */}
        <div className="space-y-3">
          {/* Ticker + type badge */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-4xl font-bold tracking-tight text-[#C9A646] md:text-5xl">
              {t.ticker}
            </span>
            <span className="rounded-full border border-[#C9A646]/30 bg-[#C9A646]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#C9A646]">
              {t.type === 'etf' ? 'ETF' : 'Stock'}
            </span>
          </div>

          {/* Company name */}
          <h1 className="text-xl font-semibold text-white md:text-2xl">{t.name}</h1>

          {/* Sector / industry badges */}
          {(hasSector || hasIndustry) && (
            <div className="flex flex-wrap gap-2">
              {hasSector && (
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/70">
                  {t.sector}
                </span>
              )}
              {hasIndustry && (
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/60">
                  {t.industry}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: price block + CTA */}
        <div className="flex flex-col items-start gap-4 md:items-end">
          {/* Price display */}
          {hasPrice ? (
            <div className="space-y-1">
              <Price value={t.price.last!} size="large" format="currency" />
              <div className="flex items-center gap-2">
                {hasChange && (
                  <Change value={t.price.change_pct!} format="percent" decimals={2} />
                )}
                {t.price.as_of && (
                  <span className="text-xs text-white/40">as of {t.price.as_of}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/40">Price data unavailable</p>
          )}

          {/* CTA */}
          <Button
            variant="gold"
            size="default"
            asChild
            showArrow={false}
          >
            <Link to={`/register?ref=seo&ticker=${t.ticker}`}>
              Track {t.ticker} in your trading journal
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
