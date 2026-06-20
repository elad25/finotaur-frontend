// Accounts hidden from the journal "All Accounts" aggregate. They only appear when
// explicitly selected in the account filter. (e.g. the WHISPER paper-strategy account.)
export const HIDDEN_FROM_ALL_ACCOUNTS_NAMES = ['WHISPER (Paper)'] as const;

/** Real portfolio UUIDs whose name marks them hidden-from-all-accounts. */
export function resolveHiddenPortfolioIds(
  portfolios: ReadonlyArray<{ id: string; name: string }> | null | undefined
): string[] {
  if (!portfolios) return [];
  const names = new Set<string>(HIDDEN_FROM_ALL_ACCOUNTS_NAMES);
  return portfolios
    .filter((p) => names.has(p.name) && /^[0-9a-f-]{36}$/i.test(p.id)) // real UUIDs only (skip synthetic broker_/trado_ ids)
    .map((p) => p.id);
}

/**
 * Apply a null-safe exclusion of hidden portfolios to a Supabase query, ONLY for the
 * all-accounts case. No-op otherwise. `query` is a PostgREST filter builder.
 */
export function excludeHiddenWhenAllAccounts<T extends { or: (filter: string) => T }>(
  query: T,
  isAllAccounts: boolean,
  hiddenPortfolioIds: string[]
): T {
  if (!isAllAccounts || hiddenPortfolioIds.length === 0) return query;
  return query.or(`portfolio_id.is.null,portfolio_id.not.in.(${hiddenPortfolioIds.join(',')})`);
}
