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
import CoveredCallContent from './covered-call';
import DeathCrossContent from './death-cross';
import GammaSqueezeContent from './gamma-squeeze';
import GoldenCrossContent from './golden-cross';
import IronCondorContent from './iron-condor';
import PaymentForOrderFlowContent from './payment-for-order-flow';
import SectorRotationContent from './sector-rotation';
import ShortInterestContent from './short-interest';
import ThetaDecayContent from './theta-decay';
import VegaContent from './vega';

export const glossaryTerms: GlossaryTermMeta[] = [
  {
    slug: 'covered-call',
    title: 'Covered Call',
    keyword: 'covered call strategy',
    summary:
      'Selling an out-of-the-money call against 100 shares you own. Generates income and lowers your cost basis, while capping upside above the strike. The lowest-risk options strategy.',
    published: '2026-05-19',
    related: ['options-flow', 'iv-rank', 'theta-decay'],
    Component: CoveredCallContent,
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
    slug: 'death-cross',
    title: 'Death Cross',
    keyword: 'death cross trading signal',
    summary:
      'The bearish counterpart to the golden cross — the 50-day moving average crosses below the 200-day. Historically precedes major drawdowns but also produces false signals at market lows.',
    published: '2026-05-19',
    related: ['golden-cross', 'short-interest', 'sector-rotation'],
    Component: DeathCrossContent,
  },
  {
    slug: 'gamma-squeeze',
    title: 'Gamma Squeeze',
    keyword: 'gamma squeeze stocks',
    summary:
      'When rapid stock price rises force options market-makers to buy underlying shares to hedge short-gamma exposure, creating a self-reinforcing rally. Famous examples: GME Jan 2021, AMC.',
    published: '2026-05-19',
    related: ['options-flow', 'short-interest', 'iron-condor'],
    Component: GammaSqueezeContent,
  },
  {
    slug: 'golden-cross',
    title: 'Golden Cross',
    keyword: 'golden cross stock signal',
    summary:
      'A bullish technical signal where the 50-day moving average crosses above the 200-day. Used as long-term trend confirmation. Inverse: the death cross.',
    published: '2026-05-19',
    related: ['death-cross', 'sector-rotation', 'short-interest'],
    Component: GoldenCrossContent,
  },
  {
    slug: 'iron-condor',
    title: 'Iron Condor',
    keyword: 'iron condor options strategy',
    summary:
      'A four-leg options strategy that profits when the underlying stays within a defined range. Sells an OTM call and put, buys further-out wings to cap risk. Best in high-IV, low-trend environments.',
    published: '2026-05-19',
    related: ['iv-rank', 'theta-decay', 'vega'],
    Component: IronCondorContent,
  },
  {
    slug: 'iv-rank',
    title: 'IV Rank',
    keyword: 'IV rank',
    summary:
      'Where current implied volatility sits relative to a stock\'s own 52-week range. The right way to compare options "expensiveness" across the market.',
    published: '2026-05-17',
    related: ['options-flow', 'dark-pool'],
    Component: IvRankContent,
  },
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
    slug: 'payment-for-order-flow',
    title: 'Payment for Order Flow (PFOF)',
    keyword: 'payment for order flow PFOF',
    summary:
      'When retail brokers route customer orders to market-makers in exchange for payment. Controversial — improves brokerage economics but may compromise execution quality.',
    published: '2026-05-19',
    related: ['options-flow', 'dark-pool'],
    Component: PaymentForOrderFlowContent,
  },
  {
    slug: 'sector-rotation',
    title: 'Sector Rotation',
    keyword: 'sector rotation investing',
    summary:
      'The cyclical movement of capital between sectors as the economic cycle progresses. Technology and consumer discretionary lead early; utilities and consumer staples lead late.',
    published: '2026-05-19',
    related: ['golden-cross', 'death-cross', 'options-flow'],
    Component: SectorRotationContent,
  },
  {
    slug: 'short-interest',
    title: 'Short Interest',
    keyword: 'short interest stock',
    summary:
      'The percentage of a stock\'s float held by short sellers. High short interest (>20% of float) can fuel short squeezes when buying pressure forces shorts to cover.',
    published: '2026-05-19',
    related: ['gamma-squeeze', 'options-flow', 'death-cross'],
    Component: ShortInterestContent,
  },
  {
    slug: 'theta-decay',
    title: 'Theta Decay',
    keyword: 'theta decay options',
    summary:
      'The daily erosion of an option\'s time value as expiration approaches. Sellers collect theta; buyers pay it. Accelerates sharply in the last 30 days before expiration.',
    published: '2026-05-19',
    related: ['iv-rank', 'vega', 'iron-condor'],
    Component: ThetaDecayContent,
  },
  {
    slug: 'vega',
    title: 'Vega',
    keyword: 'vega options Greek',
    summary:
      'The Greek that measures an option\'s sensitivity to changes in implied volatility. A vega of 0.10 means the option gains $0.10 for every 1-percentage-point rise in IV.',
    published: '2026-05-19',
    related: ['iv-rank', 'theta-decay', 'iron-condor'],
    Component: VegaContent,
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
