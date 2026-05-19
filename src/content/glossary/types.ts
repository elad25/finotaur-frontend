/**
 * Glossary content types. Each term gets its own .tsx file with JSX content,
 * plus an entry in `terms.ts` registry with metadata (title, summary, related).
 *
 * Kept deliberately simple — no MDX, no parser. Just typed React components.
 */

import type { ComponentType } from 'react';

export interface GlossaryTermMeta {
  /** URL slug, e.g. "options-flow". Lowercase, hyphen-separated, no special chars. */
  slug: string;
  /** Display title, e.g. "Options Flow". Title case. */
  title: string;
  /** One-sentence summary shown on the index + meta description. */
  summary: string;
  /** Search keyword phrase, e.g. "options flow scanner". Helps with OG title nuance. */
  keyword: string;
  /** ISO date, e.g. "2026-05-17". For dateModified on JSON-LD + sitemap. */
  published: string;
  /** Slugs of related terms. Used for internal linking + "See also". */
  related: string[];
  /** Lazy-loaded React component with the actual prose content. */
  Component: ComponentType;
}
