/**
 * Glossary terms registry — single source of truth for every term.
 *
 * Adding a new term: create `<slug>.tsx` next to this file, then add an entry
 * to this array. The dynamic route + sitemap automation will pick it up.
 */

import type { GlossaryTermMeta } from './types';
import OptionsFlowContent from './options-flow';
import DarkPoolContent from './dark-pool';
import IvRankContent from './iv-rank';

export const glossaryTerms: GlossaryTermMeta[] = [
  {
    slug: 'options-flow',
    title: 'Options Flow',
    keyword: 'options flow',
    summary:
      'The real-time stream of every options contract traded — strike, size, side. Watch where institutional money is positioning before the rest of the market notices.',
    published: '2026-05-17',
    related: ['unusual-options-activity', 'dark-pool', 'iv-rank'],
    Component: OptionsFlowContent,
  },
  {
    slug: 'dark-pool',
    title: 'Dark Pool',
    keyword: 'dark pool trading',
    summary:
      'Private exchanges where institutions execute large block orders without telegraphing intent. Roughly 40-50% of US equity volume runs through them.',
    published: '2026-05-17',
    related: ['options-flow', 'iv-rank'],
    Component: DarkPoolContent,
  },
  {
    slug: 'iv-rank',
    title: 'IV Rank',
    keyword: 'IV rank',
    summary:
      'Where current implied volatility sits relative to a stock’s own 52-week range. The right way to compare options "expensiveness" across the market.',
    published: '2026-05-17',
    related: ['options-flow', 'dark-pool'],
    Component: IvRankContent,
  },
];

/** O(1) lookup by slug. Used by the dynamic route. */
export const glossaryBySlug: Record<string, GlossaryTermMeta> = Object.fromEntries(
  glossaryTerms.map((t) => [t.slug, t])
);

/** Get a term's metadata by slug, or undefined if not found. */
export function getGlossaryTerm(slug: string): GlossaryTermMeta | undefined {
  return glossaryBySlug[slug];
}
