/**
 * Templated prose generator for SEO ticker research pages.
 *
 * Produces 150-250 word natural-language summaries.
 * Uses deterministic variation (ticker hash → template index) so 2,500 pages
 * have structural variety without random output.
 */

import type { SeoTickerData, TickerUniverseEntry } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple djb2 hash — returns 0-based bucket index */
function hashBucket(ticker: string, buckets: number): number {
  let h = 5381;
  for (let i = 0; i < ticker.length; i++) {
    h = ((h << 5) + h) ^ ticker.charCodeAt(i);
  }
  return Math.abs(h) % buckets;
}

function formatLargeNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString('en-US')}`;
}

function priceClause(price: SeoTickerData['price']): string {
  if (price.last == null) return '';
  const changeStr =
    price.change_pct != null
      ? `, ${price.change_pct >= 0 ? '+' : ''}${price.change_pct.toFixed(2)}% on the day`
      : '';
  const asOf = price.as_of ? ` as of ${price.as_of}` : '';
  return `The stock is trading at $${price.last.toFixed(2)}${changeStr}${asOf}.`;
}

function fundamentalsClause(f: SeoTickerData['fundamentals']): string {
  const parts: string[] = [];
  if (f.pe != null) parts.push(`a trailing P/E ratio of ${f.pe.toFixed(1)}`);
  if (f.eps != null) parts.push(`earnings per share of $${f.eps.toFixed(2)}`);
  if (f.roe != null) parts.push(`a return on equity of ${(f.roe * 100).toFixed(1)}%`);
  if (f.debtToEquity != null) parts.push(`a debt-to-equity ratio of ${f.debtToEquity.toFixed(2)}`);
  if (parts.length === 0) return '';
  return `Key metrics include ${parts.join(', ')}.`;
}

function revenueClause(f: SeoTickerData['fundamentals']): string {
  if (f.revenue == null && f.netIncome == null) return '';
  const parts: string[] = [];
  if (f.revenue != null) parts.push(`trailing twelve-month revenue of ${formatLargeNumber(f.revenue)}`);
  if (f.netIncome != null) {
    const label = f.netIncome >= 0 ? 'net income' : 'net loss';
    parts.push(`${label} of ${formatLargeNumber(Math.abs(f.netIncome))}`);
  }
  return `The company reports ${parts.join(' and ')}.`;
}

// ---------------------------------------------------------------------------
// Stock templates (4 structural variants)
// ---------------------------------------------------------------------------

type FullTicker = SeoTickerData;
type LiteTicker = TickerUniverseEntry;

function stockSummaryA(t: FullTicker): string {
  const sectorLine =
    t.sector && t.industry
      ? `${t.name} (${t.ticker}) is a publicly traded company in the ${t.sector} sector, specifically within the ${t.industry} industry.`
      : t.sector
      ? `${t.name} (${t.ticker}) operates in the ${t.sector} sector.`
      : `${t.name} (${t.ticker}) is a publicly traded US company.`;

  const desc = t.description ? ` ${t.description}` : '';
  const price = priceClause(t.price);
  const rev = revenueClause(t.fundamentals);
  const fund = fundamentalsClause(t.fundamentals);

  const ctaLine = `Investors tracking ${t.ticker} can follow price movements, analyst estimates, and fundamental changes directly through FINOTAUR's research tools.`;

  return [sectorLine + desc, [price, rev].filter(Boolean).join(' '), fund, ctaLine]
    .filter(Boolean)
    .join('\n\n');
}

function stockSummaryB(t: FullTicker): string {
  const intro =
    t.sector && t.industry
      ? `${t.ticker} is the ticker symbol for ${t.name}, a company classified under the ${t.industry} industry within the broader ${t.sector} sector.`
      : `${t.ticker} is the ticker symbol for ${t.name}, a publicly traded US company.`;

  const desc = t.description ? `\n\n${t.description}` : '';
  const price = priceClause(t.price);
  const fund = fundamentalsClause(t.fundamentals);
  const rev = revenueClause(t.fundamentals);

  const trailing = `FINOTAUR aggregates real-time and fundamental data on ${t.ticker} to help traders and investors make informed decisions. Track ${t.ticker} in your trading journal alongside other positions for a unified view of your portfolio.`;

  return [intro + desc, [price, fund].filter(Boolean).join(' '), rev, trailing]
    .filter(Boolean)
    .join('\n\n');
}

function stockSummaryC(t: FullTicker): string {
  const opening =
    t.sector
      ? `When researching ${t.name}, analysts typically begin with its ${t.sector} sector positioning${t.industry ? ` and ${t.industry} industry dynamics` : ''}.`
      : `${t.name} (${t.ticker}) is a US-listed equity tracked across major market indices.`;

  const desc = t.description ? ` ${t.description}` : '';
  const price = priceClause(t.price);
  const rev = revenueClause(t.fundamentals);
  const fund = fundamentalsClause(t.fundamentals);

  const close = `FINOTAUR provides free research summaries, news aggregation, and fundamentals for ${t.ticker} to support both active traders and long-term investors.`;

  return [[opening + desc, price].filter(Boolean).join(' '), [rev, fund].filter(Boolean).join(' '), close]
    .filter(Boolean)
    .join('\n\n');
}

function stockSummaryD(t: FullTicker): string {
  const headline =
    t.sector && t.industry
      ? `${t.name} (Nasdaq/NYSE: ${t.ticker}) is a ${t.industry} company operating within the ${t.sector} sector of the US equity market.`
      : `${t.name} (${t.ticker}) is a publicly listed company on US equity markets.`;

  const desc = t.description ? `\n\n${t.description}` : '';
  const price = priceClause(t.price);
  const fund = fundamentalsClause(t.fundamentals);
  const rev = revenueClause(t.fundamentals);

  const cta = `Use FINOTAUR to track ${t.ticker}'s price action, review fundamentals, and stay current with company news — all in one research dashboard.`;

  return [headline + desc, [price, rev].filter(Boolean).join(' '), fund, cta]
    .filter(Boolean)
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// ETF templates (2 structural variants)
// ---------------------------------------------------------------------------

function etfSummaryA(t: FullTicker | LiteTicker): string {
  const theme =
    'sector' in t && t.sector && t.industry
      ? `${t.industry} theme within the ${t.sector} category`
      : 'sector' in t && t.sector
      ? t.sector
      : 'broad market';

  const intro = `${t.name} (${t.ticker}) is an exchange-traded fund (ETF) providing exposure to the ${theme}.`;

  const priceStr =
    'price' in t && t.price.last != null
      ? `The ETF is currently priced at $${t.price.last.toFixed(2)}${t.price.change_pct != null ? `, ${t.price.change_pct >= 0 ? '+' : ''}${t.price.change_pct.toFixed(2)}% today` : ''}.`
      : '';

  const body = `ETFs like ${t.ticker} offer diversified exposure without the concentration risk of a single stock. They trade on major exchanges throughout the regular session, providing intraday liquidity.`;

  const cta = `FINOTAUR tracks ${t.ticker} price data and sector context to help active traders incorporate ETFs into their research workflow.`;

  return [intro, [priceStr, body].filter(Boolean).join(' '), cta]
    .filter(Boolean)
    .join('\n\n');
}

function etfSummaryB(t: FullTicker | LiteTicker): string {
  const category =
    'sector' in t && t.sector
      ? t.sector
      : 'diversified';

  const intro = `${t.ticker} — ${t.name} — is a ${category} ETF listed on US exchanges. ETFs of this type allow investors to gain broad or targeted exposure while maintaining the flexibility of intraday trading.`;

  const priceStr =
    'price' in t && t.price.last != null
      ? `Current price: $${t.price.last.toFixed(2)}${t.price.change_pct != null ? ` (${t.price.change_pct >= 0 ? '+' : ''}${t.price.change_pct.toFixed(2)}%)` : ''}.`
      : '';

  const body = `Unlike individual stocks, ETFs distribute risk across multiple underlying holdings. Traders often use ${t.ticker} to express a macro or sector view within their portfolio.`;

  const cta = `Track ${t.ticker} alongside individual positions in your FINOTAUR trading journal for a complete picture of your exposure.`;

  return [intro, [priceStr, body].filter(Boolean).join(' '), cta]
    .filter(Boolean)
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Lite fallback (TickerUniverseEntry — no price/fundamentals)
// ---------------------------------------------------------------------------

function liteSummary(t: LiteTicker): string {
  const bucket = hashBucket(t.ticker, 2);
  if (bucket === 0) return etfSummaryA(t);
  return etfSummaryB(t);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Generates a 150-250 word prose summary for a ticker research page.
 * Works with both full SeoTickerData and lightweight TickerUniverseEntry.
 * Variation is deterministic — same ticker always produces the same template.
 */
export function generateSummary(t: SeoTickerData | TickerUniverseEntry): string {
  // Determine if we have the full enriched shape
  const isFull = 'price' in t;

  if (!isFull) {
    return liteSummary(t as LiteTicker);
  }

  const full = t as SeoTickerData;

  if (full.type === 'etf') {
    return hashBucket(full.ticker, 2) === 0
      ? etfSummaryA(full)
      : etfSummaryB(full);
  }

  // Stock: 4 templates
  const templates = [stockSummaryA, stockSummaryB, stockSummaryC, stockSummaryD];
  const idx = hashBucket(full.ticker, templates.length);
  return templates[idx](full);
}
