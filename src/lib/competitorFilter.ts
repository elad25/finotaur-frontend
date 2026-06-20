/**
 * competitorFilter.ts
 *
 * Prevents a company from appearing as its own competitor in the Stock Analyzer
 * "Competitive Landscape". AI prompts sometimes ignore the "do not include self"
 * instruction, so this is the enforced safety layer applied after every AI response,
 * across all data paths (Anthropic pipeline, OpenAI fallback).
 */

const CORPORATE_SUFFIXES = new Set([
  'inc', 'incorporated', 'corp', 'corporation', 'co', 'company',
  'ltd', 'limited', 'plc', 'holdings', 'holding', 'group',
  'sa', 'nv', 'ag', 'the', 'lp', 'llc', 'ord', 'class',
  'a', 'b', 'c',
]);

/** Normalise a ticker symbol: strip exchange prefix, uppercase, alphanumeric only. */
function normTicker(t: string | null | undefined): string {
  if (!t) return '';
  const afterColon = t.includes(':') ? t.slice(t.lastIndexOf(':') + 1) : t;
  return afterColon.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Normalise a company name to its core tokens for fuzzy equality.
 * Steps: lowercase → strip parenthetical remarks → collapse non-alphanumeric to spaces
 * → trim → split → strip leading/trailing corporate-suffix tokens (never emptying).
 */
function normName(n: string | null | undefined): string {
  if (!n) return '';
  let s = n.toLowerCase();
  // Remove anything in parentheses
  s = s.replace(/\([^)]*\)/g, '');
  // Replace non-alphanumeric chars with space
  s = s.replace(/[^a-z0-9]/g, ' ');
  // Collapse multiple spaces and trim
  s = s.replace(/\s+/g, ' ').trim();

  const tokens = s.split(' ');

  // Strip trailing suffix tokens (never empty the array)
  while (tokens.length > 1 && CORPORATE_SUFFIXES.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  // Strip leading suffix tokens (never empty the array)
  while (tokens.length > 1 && CORPORATE_SUFFIXES.has(tokens[0])) {
    tokens.shift();
  }

  return tokens.join(' ');
}

/**
 * Returns true when `candidate` and `subject` refer to the same company,
 * using two independent signals: exact normalised ticker match, or exact
 * normalised core-name match.
 */
export function isSameCompany(
  candidate: { ticker?: string | null; name?: string | null },
  subject: { ticker?: string | null; name?: string | null },
): boolean {
  const ct = normTicker(candidate.ticker);
  const st = normTicker(subject.ticker);
  if (ct && st && ct === st) return true;

  const cn = normName(candidate.name);
  const sn = normName(subject.name);
  if (cn && sn && cn === sn) return true;

  return false;
}

/**
 * Filters `competitors` to remove any entry that matches `subject` (the company
 * being analysed). Safe to call with any input — returns [] for non-arrays.
 */
export function filterOutSelfCompetitors<
  T extends { ticker?: string | null; name?: string | null },
>(competitors: T[], subject: { ticker?: string | null; name?: string | null }): T[] {
  return Array.isArray(competitors)
    ? competitors.filter((c) => !isSameCompany(c, subject))
    : [];
}
