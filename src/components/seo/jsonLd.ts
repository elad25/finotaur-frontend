/**
 * JSON-LD builders for Finotaur pages.
 *
 * Keep schemas tight — Google only rewards accurate structured data,
 * and false claims (FAQ, Rating) can trigger manual actions.
 */

const SITE_URL = 'https://www.finotaur.com';
const ORG_NAME = 'Finotaur';

/** Reusable Organization reference for nesting */
const ORG_REF = {
  '@type': 'Organization',
  name: ORG_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
};

/**
 * BreadcrumbList — show navigation path in SERPs.
 * Pass an array of `[name, path]` tuples. Root is implicit.
 */
export function breadcrumbList(items: Array<[string, string]>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name,
      item: `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`,
    })),
  };
}

/**
 * WebPage — generic page metadata.
 * Best paired with breadcrumb + Organization.
 */
export function webPage(opts: {
  name: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path.startsWith('/') ? opts.path : `/${opts.path}`}`,
    isPartOf: {
      '@type': 'WebSite',
      name: ORG_NAME,
      url: SITE_URL,
    },
    publisher: ORG_REF,
  };
}

/**
 * AboutPage — about-us markup with founder/company context.
 */
export function aboutPage(opts: {
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${ORG_NAME}`,
    description: opts.description,
    url: `${SITE_URL}${opts.path.startsWith('/') ? opts.path : `/${opts.path}`}`,
    about: ORG_REF,
  };
}

/**
 * ContactPage — contact-us markup.
 */
export function contactPage(opts: { path: string }): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact ${ORG_NAME}`,
    url: `${SITE_URL}${opts.path.startsWith('/') ? opts.path : `/${opts.path}`}`,
    about: ORG_REF,
  };
}

/**
 * SoftwareApplication — full product schema with tier-priced offers.
 * Use on homepage and pricing-style pages.
 */
export function softwareApplication(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: ORG_NAME,
    applicationCategory: 'FinanceApplication',
    applicationSubCategory: 'Trading Intelligence Platform',
    operatingSystem: 'Web',
    url: SITE_URL,
    description:
      'AI trading intelligence platform with free unlimited AI stock analysis, options flow scanner, dark pool data, and institutional-grade research.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free AI Stock Analyzer, Top Movers, Earnings Calendar, Watchlists, Crypto, News',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '59',
        priceCurrency: 'USD',
        description: 'AI Sector, Macro, Earnings analysis, Options Suite, Flow Scanner, Dark Pool Scanner, Trading Journal',
      },
      {
        '@type': 'Offer',
        name: 'Finotaur',
        price: '89',
        priceCurrency: 'USD',
        description: 'Everything in Pro plus TOP SECRET Newsletter, AI Top 5, AI Options Intelligence, AI Copilot, Block Trades, Trade Copier',
      },
    ],
  };
}

/**
 * FAQPage — for landing pages with explicit Q&A sections.
 * Use carefully — Google penalizes fake/manipulated FAQ markup.
 */
export function faqPage(faqs: Array<{ q: string; a: string }>): Record<string, unknown> {
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

/**
 * Article — for journal / blog-style content.
 */
export function article(opts: {
  headline: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    url: `${SITE_URL}${opts.path.startsWith('/') ? opts.path : `/${opts.path}`}`,
    publisher: ORG_REF,
    author: ORG_REF,
    ...(opts.datePublished && { datePublished: opts.datePublished }),
    ...(opts.dateModified && { dateModified: opts.dateModified }),
  };
}
