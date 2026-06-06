export type CanonicalAssetClass = 'stock' | 'etf' | 'futures' | 'options' | 'crypto' | 'forex';

/** Map any raw asset-class string (UI labels, IBKR/Tradovate codes, plurals) to the
 *  single canonical vocabulary the UI/calc layer checks. Unknown/empty → null (never guess). */
export function normalizeAssetClass(raw: string | null | undefined): CanonicalAssetClass | null {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'opt': case 'option': case 'options': return 'options';
    case 'stk': case 'stock': case 'stocks': case 'equity': case 'equities': case 'shares': return 'stock';
    case 'fut': case 'future': case 'futures': return 'futures';
    case 'cash': case 'fx': case 'forex': return 'forex';
    case 'crypto': case 'perp': case 'perpetual': case 'coin': return 'crypto';
    case 'etf': case 'etfs': return 'etf';
    default: return null;
  }
}
