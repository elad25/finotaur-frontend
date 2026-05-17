/**
 * <SEO> — per-route meta tags via react-helmet-async.
 *
 * Wave 2 of the SEO initiative. Together with the default tags in
 * `index.html`, this lets every public route ship its own title,
 * description, canonical, Open Graph, Twitter Card, and JSON-LD.
 *
 * Helmet wins on conflict — defaults in index.html cover the homepage
 * before React hydrates; <SEO> overrides them post-hydrate.
 */

import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://www.finotaur.com';
const SITE_NAME = 'Finotaur';
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/logo.png`;
const TWITTER_HANDLE = '@finotaur';

export interface SEOProps {
  /** Page title — will be appended with site name unless `titleAsIs` is true */
  title: string;
  /** 50–160 chars, used for both `<meta description>` and OG/Twitter */
  description: string;
  /** Path relative to site root, e.g. `/about`. Becomes canonical + og:url. */
  path: string;
  /** Override the OG/Twitter image (must be absolute URL) */
  ogImage?: string;
  /** Prevent search engines indexing this page */
  noindex?: boolean;
  /** Structured data — single object or array. Each rendered as a JSON-LD <script> */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Use title verbatim (no " — Finotaur" suffix) */
  titleAsIs?: boolean;
}

export function SEO({
  title,
  description,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
  jsonLd,
  titleAsIs = false,
}: SEOProps) {
  const fullTitle = titleAsIs ? title : `${title} — ${SITE_NAME}`;
  const url = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const jsonLdArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:creator" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={fullTitle} />

      {/* JSON-LD blocks (rich snippets, Knowledge Graph signals) */}
      {jsonLdArray.map((data, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
