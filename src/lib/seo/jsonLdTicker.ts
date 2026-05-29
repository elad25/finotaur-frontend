/**
 * JSON-LD schema builders for ticker research pages.
 *
 * Exports:
 *  - tickerCorporationSchema  — Schema.org Corporation or ETF entity
 *  - tickerBreadcrumbSchema   — BreadcrumbList: Home → Research → <Ticker>
 *  - tickerFaqSchema          — FAQPage with data-backed answers (only when data exists)
 *  - buildTickerJsonLd        — Combines all applicable schemas into an array
 */

import type { SeoTickerData } from './types';

const SITE_URL = 'https://www.finotaur.com';

// ---------------------------------------------------------------------------
// Corporation / ETF entity
// ---------------------------------------------------------------------------

export function tickerCorporationSchema(t: SeoTickerData): Record<string, unknown> {
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': t.type === 'etf' ? 'InvestmentOrMutualFund' : 'Corporation',
    name: t.name,
    tickerSymbol: t.ticker,
    url: `${SITE_URL}/research/${t.ticker}`,
  };

  if (t.description) {
    base.description = t.description;
  }

  if (t.industry) {
    base.industry = t.industry;
  }

  if (t.sector) {
    // Use naics category approximation or just a plain string
    base.knowsAbout = t.sector;
  }

  return base;
}

// ---------------------------------------------------------------------------
// BreadcrumbList
// ---------------------------------------------------------------------------

export function tickerBreadcrumbSchema(t: SeoTickerData): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Stock Research',
        item: `${SITE_URL}/research`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${t.name} (${t.ticker})`,
        item: `${SITE_URL}/research/${t.ticker}`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// FAQPage — only generated when we have answers to back up the questions
// ---------------------------------------------------------------------------

export function tickerFaqSchema(t: SeoTickerData): Record<string, unknown> | null {
  const faqs: Array<{ q: string; a: string }> = [];

  // Q1: Sector (only if known)
  if (t.sector) {
    faqs.push({
      q: `What sector is ${t.ticker} in?`,
      a: t.industry
        ? `${t.name} (${t.ticker}) operates in the ${t.industry} industry within the ${t.sector} sector.`
        : `${t.name} (${t.ticker}) is classified in the ${t.sector} sector.`,
    });
  }

  // Q2: Current price (only if known)
  if (t.price.last != null) {
    const changeStr =
      t.price.change_pct != null
        ? ` (${t.price.change_pct >= 0 ? '+' : ''}${t.price.change_pct.toFixed(2)}% change)`
        : '';
    const asOf = t.price.as_of ? ` as of ${t.price.as_of}` : '';
    faqs.push({
      q: `What is ${t.ticker}'s current stock price?`,
      a: `${t.name} (${t.ticker}) last traded at $${t.price.last.toFixed(2)}${changeStr}${asOf}. For live quotes, use a real-time data provider or your brokerage.`,
    });
  }

  // Q3: P/E ratio (only if known)
  if (t.fundamentals.pe != null) {
    faqs.push({
      q: `What is ${t.ticker}'s P/E ratio?`,
      a: `${t.name} (${t.ticker}) has a trailing price-to-earnings (P/E) ratio of ${t.fundamentals.pe.toFixed(1)} based on the latest available fundamentals data.`,
    });
  }

  if (faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };
}

// ---------------------------------------------------------------------------
// Combined builder
// ---------------------------------------------------------------------------

/**
 * Returns all applicable JSON-LD schemas for a ticker page.
 * Safe to pass directly to <SEO jsonLd={...}>.
 */
export function buildTickerJsonLd(t: SeoTickerData): Record<string, unknown>[] {
  const schemas: Record<string, unknown>[] = [
    tickerCorporationSchema(t),
    tickerBreadcrumbSchema(t),
  ];

  const faq = tickerFaqSchema(t);
  if (faq) schemas.push(faq);

  return schemas;
}
