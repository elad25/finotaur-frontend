// interactive-brokers-sync v10 (2026-05-30): capture NetLiquidation from NAV/Account section -> last_account_summary + NLV-authoritative snapshot total; ib-auto-sync heartbeat.
//
// v9 (2026-05-28): trades upsert onConflict fix —
//   * trades upsert onConflict must be 'idempotency_key' (the only unique
//     constraint on trades besides PK). Previous 'user_id,broker,external_id'
//     does not match any constraint, so PostgREST returned 42P10 on every row.
//
// v8 (2026-05-28): post-deploy fixes —
//   * skip L,... lot-detail rows (Position section was double-counting QBTS option)
//   * Cash PositionValue from Quantity, not MarketValue (which IBRIT reports as 0 for cash)
//   * trades schema alignment: use asset_class (not asset_type), drop currency,
//     add idempotency_key + risk_estimated (both NOT NULL), restore side=LONG/SHORT
//     (the v6 invariant required by handle_trade_changes_unified trigger).
//
// v7 (2026-05-28): IBRIT multi-section Flex Query parser.
// v7 change: replaced the single-pass `parseCsv` approach with `parseIBRITFlexQuery`,
// which correctly identifies and separates all 7 sections of the IBRIT Flex Query
// multi-section CSV (Activity, Position, NAV, CashReport, PL, Security, Account).
// The old parser treated the first section's header as global headers, producing
// garbage records for every subsequent section. v7 also adds `parsePositionsFromCsv`
// to extract real end-of-day positions directly from the Position section instead of
// reconstructing them from trades. `aggregatePositions` is preserved as a fallback.
// `mapActivityToTrade` updated to handle both legacy (BuySell column) and new
// (TransactionType = BUY/SELL) Activity schemas.
//
// v6 (2026-05-25): added portfolio_snapshots upsert logic for COPILOT chart.
// v5 (2026-05-22): CRITICAL invariant — `last_positions` is NEVER overwritten with [].
// Cash-only IBRIT accounts produce zero trades → aggregatePositions returns []. If we
// wrote that, we'd wipe whatever cash/position data exists from prior runs or other
// ingestion paths. v5 only overwrites last_positions when the new array is non-empty.
//
// Modes:
//   - user-invoked          (Bearer = user JWT, body = {userId})                 → sync one user
//   - cron                  (Bearer = service-role, body = {mode:'cron'})        → loop all active IB connections
//   - backfill_from_trades  (Bearer = user JWT, body = {userId, mode:'backfill_from_trades', days?:365}) → derive historical snapshots from trades
//   - backfill_with_marks   (Bearer = user JWT, body = {userId, mode:'backfill_with_marks', days?:30}) → mark-to-market historical reconstruction using Polygon closes via shared cache
//
// Auth: dualAuth pattern (inlined). Accepts vault.secret_api_key OR SUPABASE_SERVICE_ROLE_KEY
// for cron path, falls through to Supabase JWT validation for user path.
//
// Data source: IBRIT Flex Query (multi-section CSV) at https://ndcdyn.interactivebrokers.com/Reporting/IBRITService
// Writes:
//   - trades                       (upsert on user_id + broker + external_id)
//   - broker_connections.connection_data.last_positions  (from Position section or aggregated from trades)
//   - broker_connections.last_sync_at / last_successful_sync_at / error_count / status
//   - portfolio_snapshots                                 (one row per day per connection — powers COPILOT chart)

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const IBRIT_BASE = 'https://ndcdyn.interactivebrokers.com/Reporting/IBRITService';
const SYNC_DAYS_BACK = 30;
const MAX_CONCURRENT_DAYS = 5;
const DEFAULT_SERVICE_CODE = 'finotaur-ws';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// ─── dualAuth (inlined — Edge bundler can't follow ../_shared/) ───
let _cachedCronSecret: string | null = null;
const SECRET_API_KEY_VAULT_ID = 'f8d7c335-e2fe-405d-a722-54a0161ebfd4';

async function getCronSecret(admin: SupabaseClient): Promise<string | null> {
  if (_cachedCronSecret !== null) return _cachedCronSecret;
  const { data, error } = await admin.rpc('tradovate_vault_read', { p_secret_id: SECRET_API_KEY_VAULT_ID });
  if (error || !data) return null;
  _cachedCronSecret = data as string;
  return _cachedCronSecret;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type AuthResult =
  | { ok: true; isCron: true }
  | { ok: true; isCron: false; userId: string }
  | { ok: false; status: number; message: string };

async function authenticate(req: Request, admin: SupabaseClient): Promise<AuthResult> {
  const header = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return { ok: false, status: 401, message: 'Missing Bearer token' };
  const token = header.slice(7).trim();
  if (!token) return { ok: false, status: 401, message: 'Empty Bearer token' };
  const cronSecret = await getCronSecret(admin);
  if (cronSecret && timingSafeEqual(token, cronSecret)) return { ok: true, isCron: true };
  const internal = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (internal && timingSafeEqual(token, internal)) return { ok: true, isCron: true };
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return { ok: false, status: 401, message: 'Invalid token' };
    return { ok: true, isCron: false, userId: data.user.id };
  } catch {
    return { ok: false, status: 401, message: 'Token verification failed' };
  }
}

// ─── CSV field splitter (handles quoted fields with embedded commas) ───
function splitLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
}

// ─── ParsedSections: result type from parseIBRITFlexQuery ───
type ParsedSections = {
  activity: Record<string, string>[];
  position: Record<string, string>[];
  cashReport: Record<string, string>[];
  nav: Record<string, string>[];
  // Other sections present in real responses but not used for trade/position writes
  pl: Record<string, string>[];
  security: Record<string, string>[];
  account: Record<string, string>[];
};

// ─── Multi-section IBRIT Flex Query parser (replaces parseCsv) ───
// Structure:
//   H,<acct>,<SectionName>,<report_dt>,<report_time>,<rd>,<fx_rate>,  ← section start
//   <header row — starts with Type,AccountID,...>                      ← column names
//   D,...                                                               ← data rows (canonical aggregate)
//   T,<count>,                                                          ← section trailer
//
// NOTE: L,... rows are lot-detail sub-rows (one L per open lot within a D aggregate position).
// They are intentionally skipped — routing them would double-count every multi-lot position.
//
// Returns empty arrays for sections not present in the response (no crash on partial data).
function parseIBRITFlexQuery(text: string): ParsedSections {
  const result: ParsedSections = {
    activity: [], position: [], cashReport: [], nav: [], pl: [], security: [], account: [],
  };

  // Strip envelope markers (BOF/EOF/BOA/EOA) and blank lines
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^(BOF|EOF|BOA|EOA)/.test(l));

  let currentSection: string | null = null;
  let currentHeaders: string[] | null = null;

  for (const line of lines) {
    // Section-start: H,<acct>,<SectionName>,... — column 3 (index 2) is the section name
    if (line.startsWith('H,')) {
      const parts = line.split(',');
      const sectionName = parts[2]?.trim() ?? '';
      currentSection = sectionName.toLowerCase(); // e.g. "activity", "position", "nav"
      currentHeaders = null; // reset: next non-H/non-T line is the header row
      continue;
    }

    // Section trailer: reset headers but keep section name until the next H
    if (line.startsWith('T,')) {
      currentHeaders = null;
      continue;
    }

    // No active section → skip
    if (currentSection === null) continue;

    // First non-H/non-T line after a section start is the column header row
    if (currentHeaders === null) {
      currentHeaders = splitLine(line);
      continue;
    }

    // Data rows: only D (aggregate/canonical) rows. L rows are lot sub-details — skipping them
    // prevents double-counting positions that have multiple open lots (e.g. QBTS option with 1 lot
    // would appear once as D and once as L, inflating position counts).
    if (!line.startsWith('D,')) continue;  // only D rows; L rows are lot sub-details, not new positions

    const vals = splitLine(line);
    const rec: Record<string, string> = {};
    for (let i = 0; i < currentHeaders.length; i++) {
      rec[currentHeaders[i]] = vals[i] ?? '';
    }

    // Route record into the appropriate section bucket
    switch (currentSection) {
      case 'activity':    result.activity.push(rec);    break;
      case 'position':    result.position.push(rec);    break;
      case 'cashreport':  result.cashReport.push(rec);  break;
      case 'nav':         result.nav.push(rec);         break;
      case 'pl':          result.pl.push(rec);          break;
      case 'security':    result.security.push(rec);    break;
      case 'account':     result.account.push(rec);     break;
      // Unknown sections are silently dropped; no crash
    }
  }

  return result;
}

function formatYYYYMMDD(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

async function fetchIBRITActivity(token: string, queryId: string, serviceCode: string, date: Date): Promise<ParsedSections> {
  const url = new URL(IBRIT_BASE);
  url.searchParams.set('t', token);
  url.searchParams.set('q', queryId);
  url.searchParams.set('rd', formatYYYYMMDD(date));
  url.searchParams.set('s', serviceCode);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const empty: ParsedSections = { activity: [], position: [], cashReport: [], nav: [], pl: [], security: [], account: [] };
  try {
    const res = await fetch(url.toString(), { method: 'GET', headers: { 'Accept': 'text/csv,text/plain,*/*' }, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`IBRIT HTTP ${res.status}: ${text.slice(0, 200)}`);
    // IBRIT inline error code (e.g. "1052: Invalid token")
    const errMatch = text.match(/^(?:ERROR\s+)?(\d{4}):/m);
    if (errMatch) {
      const code = errMatch[1];
      if (code === '1010') return empty; // NO_STATEMENT — no activity on this day (not an error)
      throw new Error(`IBRIT error ${code}: ${text.slice(0, 300)}`);
    }
    const parsed = parseIBRITFlexQuery(text);
    // Stamp every NAV/Account row with the request date so extractAccountSummary
    // can select the latest day's row (NAV rows have no ReportDate column).
    const rd = formatYYYYMMDD(date);
    for (const r of parsed.nav) (r as Record<string, string>).__rd = rd;
    for (const r of parsed.account) (r as Record<string, string>).__rd = rd;
    return parsed;
  } finally { clearTimeout(timer); }
}

// ─── mapActivityToTrade: handles both legacy (BuySell column) and new (TransactionType=BUY/SELL) schemas ───
function mapActivityToTrade(rec: Record<string, string>, userId: string, brokerConnectionId: string | null): Record<string, unknown> | null {
  // Prefer TransactionID, fall back to TradeID, then legacy IB fields
  const extId = rec.TransactionID || rec.TradeID || rec.IBExecID || rec.IBOrderID || rec.OrderID;
  if (!extId) return null;

  const txType = (rec.TransactionType || '').toUpperCase();
  let side: string;

  if ('BuySell' in rec && rec.BuySell) {
    // Legacy schema: BuySell column present — use it + require txType to be a trade type
    if (!/EXCHTRADE|BOOKTRADE|TRADE/.test(txType)) return null; // skip dividends/fees/transfers
    const buySell = rec.BuySell.toUpperCase();
    if (buySell !== 'BUY' && buySell !== 'SELL') return null;
    side = buySell; // keep uppercase BUY/SELL; mapped to LONG/SHORT at return
  } else {
    // New schema (v7): TransactionType IS the direction (BUY / SELL)
    if (txType !== 'BUY' && txType !== 'SELL') return null; // skip transfers, dividends, etc.
    side = txType; // already uppercase BUY/SELL; mapped to LONG/SHORT at return
  }

  // Date: prefer TradeDate (YYYYMMDD), else SettleDate, else ReportDate
  const tradeDate = rec.TradeDate || rec.SettleDate || rec.ReportDate;

  // Time: prefer DateTime (YYYYMMDD HH:MM:SS), else OrderTime (YYYYMMDD;HH:MM:SS), else legacy TradeTime (HHMMSS)
  let openAt = new Date().toISOString();
  if (tradeDate && /^\d{8}$/.test(tradeDate)) {
    const y = tradeDate.slice(0, 4), mo = tradeDate.slice(4, 6), dy = tradeDate.slice(6, 8);
    let timeStr = '00:00:00';
    if (rec.DateTime) {
      // Format: "YYYYMMDD HH:MM:SS"
      const dtParts = rec.DateTime.split(' ');
      if (dtParts[1]) timeStr = dtParts[1]; // already HH:MM:SS
    } else if (rec.OrderTime) {
      // Format: "YYYYMMDD;HH:MM:SS"
      const otParts = rec.OrderTime.split(';');
      if (otParts[1]) timeStr = otParts[1]; // already HH:MM:SS
    } else if (rec.TradeTime && /^\d{6}$/.test(rec.TradeTime)) {
      // Legacy: HHMMSS → HH:MM:SS
      timeStr = `${rec.TradeTime.slice(0, 2)}:${rec.TradeTime.slice(2, 4)}:${rec.TradeTime.slice(4, 6)}`;
    }
    openAt = new Date(`${y}-${mo}-${dy}T${timeStr}Z`).toISOString();
  }

  // Symbol: prefer Symbol column, strip option chain to underlying ticker (e.g. "QBTS  260605C00030000" → "QBTS")
  const rawSymbol = rec.Symbol || rec.UnderlyingSymbol || 'UNKNOWN';
  const symbol = rawSymbol.split(/\s+/)[0] || rawSymbol;

  // underlying_symbol: use UnderlyingSymbol if present, else the already-cleaned ticker
  const underlying = rec.UnderlyingSymbol || symbol;
  // contract_id: the full IBRIT Symbol (includes option chain, e.g. "QBTS  260605C00030000")
  const rawContractId = rec.Symbol || '';

  // side mapping: DB trigger `handle_trade_changes_unified` requires LONG/SHORT (uppercase).
  // Using BUY/SELL or lowercase will leave pnl=NULL and outcome='OPEN' in the trigger — v6 invariant.
  // side variable is uppercase BUY or SELL at this point; map to the required DB values.
  const direction = side === 'BUY' ? 'LONG' : 'SHORT';

  return {
    user_id: userId,
    broker: 'interactive_brokers',
    external_id: 'ib_' + extId,
    idempotency_key: 'ib_' + extId,   // NOT NULL in trades schema; same value as external_id is fine
    risk_estimated: false,              // NOT NULL in trades schema; false for broker-imported trades
    symbol,
    side: direction,                    // LONG or SHORT — required by handle_trade_changes_unified trigger
    quantity: Math.abs(Number(rec.Quantity) || 0),
    entry_price: Number(rec.UnitPrice) || Number(rec.TradePrice) || 0,
    fees: Math.abs(Number(rec.Commission) || Number(rec.IBCommission) || 0),
    open_at: openAt,
    asset_class: (rec.AssetType || rec.AssetClass || 'STK').toLowerCase(), // column is asset_class, NOT asset_type
    underlying_symbol: underlying || null,
    contract_id: rawContractId || null,
    ib_conid: rec.ConID || null,
    sync_source: 'interactive_brokers_ibrit_v8',
    broker_connection_id: brokerConnectionId ?? null,
  };
}

// ─── parsePositionsFromCsv: extract positions directly from the Position section ───
// For accounts where the Flex Query includes a Position section, this gives accurate
// end-of-day holdings with real market prices — much better than aggregatePositions.
function parsePositionsFromCsv(sections: ParsedSections): Record<string, unknown>[] {
  const positions: Record<string, unknown>[] = [];
  for (const rec of sections.position) {
    const assetType = (rec.AssetType || '').toUpperCase();
    const rawSymbol = rec.Symbol || '';

    if (assetType === 'CASH' || rawSymbol === '') {
      // Cash balance row: Symbol is empty, AssetType = CASH.
      // IBRIT reports MarketValue="0" for cash rows — the actual balance is in Quantity.
      // Using `MarketValue || Quantity` would short-circuit on the truthy string "0", returning "0".
      // Always read cash value directly from Quantity.
      positions.push({
        Symbol: rec.Currency || 'USD',
        Description: `${rec.Currency || 'USD'} Cash Balance`,
        Quantity: rec.Quantity || '0',
        MarkPrice: '0',
        PositionValue: rec.Quantity || '0',
        CostBasisPrice: '1',
        CostBasisMoney: rec.Quantity || '0',
        FifoPnlUnrealized: '0',
        CurrencyPrimary: rec.Currency || 'USD',
        AssetClass: 'CASH',
      });
    } else {
      // Security position row
      const symbol = rawSymbol.split(/\s+/)[0] || rawSymbol; // strip option chain suffix
      positions.push({
        Symbol: symbol,
        Description: rec.SecurityDescription || rec.BBTicker || rawSymbol,
        Quantity: rec.Quantity || '0',
        MarkPrice: rec.MarketPrice || '0',
        PositionValue: rec.MarketValue || '0',
        CostBasisPrice: rec.CostPrice || '0',
        CostBasisMoney: rec.CostBasis || '0',
        FifoPnlUnrealized: rec.UnrealizedPL || '0',
        CurrencyPrimary: rec.Currency || 'USD',
        AssetClass: rec.AssetType || 'STK',
      });
    }
  }
  return positions;
}

// ─── aggregatePositions: fallback — reconstruct positions from activity trades ───
// (No real-time prices from Activity report; uses last TradePrice as MarkPrice proxy.)
// Used when Flex Query response does not include a Position section.
function aggregatePositions(trades: Record<string, string>[]): Record<string, unknown>[] {
  const map = new Map<string, { Symbol: string; Description: string; netQty: number; totalCost: number; lastPrice: number; CurrencyPrimary: string; AssetClass: string }>();
  const sorted = [...trades].sort((a, b) => (a.TradeDate || '').localeCompare(b.TradeDate || ''));
  for (const t of sorted) {
    const sym = t.Symbol || t.UnderlyingSymbol; if (!sym) continue;
    const qty = Number(t.Quantity) || 0;
    const px = Number(t.UnitPrice) || Number(t.TradePrice) || 0;
    // Support both legacy BuySell column and new TransactionType direction
    const buySellRaw = (t.BuySell || t.TransactionType || '').toUpperCase();
    const buySell = (buySellRaw === 'BUY' || buySellRaw === 'SELL') ? buySellRaw : '';
    const signedQty = buySell === 'SELL' ? -Math.abs(qty) : Math.abs(qty);
    const underlyingSym = sym.split(/\s+/)[0] || sym;
    const entry = map.get(underlyingSym) ?? { Symbol: underlyingSym, Description: t.SecurityDescription || t.Description || underlyingSym, netQty: 0, totalCost: 0, lastPrice: px, CurrencyPrimary: t.Currency || t.CurrencyPrimary || 'USD', AssetClass: t.AssetType || t.AssetClass || 'STK' };
    entry.netQty += signedQty;
    if (buySell === 'BUY') entry.totalCost += Math.abs(qty) * px;
    entry.lastPrice = px || entry.lastPrice;
    map.set(underlyingSym, entry);
  }
  const positions: Record<string, unknown>[] = [];
  for (const e of map.values()) {
    if (e.netQty === 0) continue;
    const buyQty = Math.abs(e.netQty);
    const avgCost = buyQty > 0 ? e.totalCost / buyQty : 0;
    const positionValue = e.netQty * e.lastPrice;
    positions.push({
      Symbol: e.Symbol, Description: e.Description,
      Quantity: String(e.netQty), MarkPrice: String(e.lastPrice),
      PositionValue: String(positionValue),
      CostBasisPrice: String(avgCost), CostBasisMoney: String(avgCost * Math.abs(e.netQty)),
      FifoPnlUnrealized: String(positionValue - avgCost * e.netQty),
      CurrencyPrimary: e.CurrencyPrimary, AssetClass: e.AssetClass,
    });
  }
  return positions;
}

interface UserSyncSummary {
  userId: string;
  tradesInserted: number;
  tradeErrors: number;
  positionsCount: number;
  daysQueried: number;
  daysWithData: number;
  daysEmpty: number;
  daysErrored: number;
  firstError: string | null;
  skipped?: string;
  snapshotInserted?: boolean;
  positionsSource?: 'position_section' | 'aggregated' | 'preserved';
}

// ─── AccountSummary: authoritative account value extracted from NAV/Account sections ───
type AccountSummary = {
  netliquidation: { amount: number; currency: 'USD' };
  totalcashvalue?: { amount: number };
  as_of: string;
  source_field: string;
};

// extractAccountSummary: scans NAV then Account section rows for NetLiquidation (NLV).
// Returns null if no positive NLV is found — caller must fall back to position-derived totals.
// The function logs raw rows for diagnostic field-name discovery (real IB column names vary).
function extractAccountSummary(sections: ParsedSections, latestReportDate: string): AccountSummary | null {
  // Diagnostic: log the last row of each section so we can verify field names in production logs.
  if (sections.nav.length > 0) {
    console.log('[ib-sync] NAV last row:', JSON.stringify(sections.nav.at(-1)));
  }
  if (sections.account.length > 0) {
    console.log('[ib-sync] Account last row:', JSON.stringify(sections.account.at(-1)));
  }

  // NLV candidate field names in priority order (case-insensitive comparison applied below).
  // 'Totals' (plural) is the real IBRIT NAV-section field name — must be first.
  const NLV_KEYS = ['Totals', 'EndingValue', 'EndingNAV', 'NetLiquidation', 'NetLiquidationValue', 'Total', 'NAV'];
  // Cash candidate field names (optional).
  // 'CashTotal' is the real IBRIT NAV-section field name — must be first.
  const CASH_KEYS = ['CashTotal', 'EndingCash', 'TotalCashValue', 'Cash', 'CashBalance'];

  // Helper: pick the best row from an array — prefer the row whose date key matches
  // latestReportDate, else use the last row.
  // Priority for date key: synthetic '__rd' (stamped in fetchIBRITActivity for rows that
  // lack a native ReportDate column, e.g. NAV section), then any key whose lowercase ===
  // 'reportdate' (Account section and legacy schemas).
  function pickRow(rows: Record<string, string>[]): Record<string, string> | null {
    if (rows.length === 0) return null;
    if (latestReportDate) {
      // 1. Check for synthetic __rd stamp (NAV section rows have no ReportDate column).
      if ('__rd' in rows[0]) {
        const match = rows.findLast(r => r.__rd === latestReportDate);
        if (match) return match;
      }
      // 2. Fall back to native ReportDate key (case-insensitive scan).
      const reportDateKey = Object.keys(rows[0]).find(k => k.toLowerCase() === 'reportdate');
      if (reportDateKey) {
        const match = rows.findLast(r => r[reportDateKey] === latestReportDate);
        if (match) return match;
      }
    }
    // 3. Last resort: use the final row in the array.
    return rows.at(-1)!;
  }

  // Helper: find the first matching key in a row (case-insensitive), return [key, numericValue]
  // or null if none of the candidates match or the value is not a finite positive number.
  function findValue(
    row: Record<string, string>,
    candidates: readonly string[],
  ): [string, number] | null {
    const rowKeys = Object.keys(row);
    for (const candidate of candidates) {
      const found = rowKeys.find(k => k.toLowerCase() === candidate.toLowerCase());
      if (found !== undefined) {
        const num = Number(row[found]);
        if (Number.isFinite(num) && num > 0) return [found, num];
      }
    }
    return null;
  }

  // Try NAV section first, then Account section.
  const candidateSources: Array<{ label: string; rows: Record<string, string>[] }> = [
    { label: 'nav', rows: sections.nav },
    { label: 'account', rows: sections.account },
  ];

  for (const { rows } of candidateSources) {
    const row = pickRow(rows);
    if (!row) continue;

    const nlvMatch = findValue(row, NLV_KEYS);
    if (!nlvMatch) continue;

    const [nlvKey, nlvAmount] = nlvMatch;

    // Determine the as_of date: prefer synthetic __rd (NAV rows lack a native ReportDate),
    // then fall back to a native ReportDate key, then latestReportDate.
    const reportDateKey = Object.keys(row).find(k => k.toLowerCase() === 'reportdate');
    const asOf = (row.__rd) ? row.__rd
      : (reportDateKey && row[reportDateKey]) ? row[reportDateKey]
      : latestReportDate;

    // Optional cash extraction.
    const cashMatch = findValue(row, CASH_KEYS);
    const summary: AccountSummary = {
      netliquidation: { amount: nlvAmount, currency: 'USD' },
      as_of: asOf,
      source_field: nlvKey,
    };
    if (cashMatch) {
      summary.totalcashvalue = { amount: cashMatch[1] };
    }

    console.log('[ib-sync] extractAccountSummary: NLV =', nlvAmount, 'field =', nlvKey, 'as_of =', asOf);
    return summary;
  }

  console.log('[ib-sync] extractAccountSummary: no positive NLV found in NAV or Account sections');
  return null;
}

// Sum PositionValue across all positions (cash positions in IBRIT carry their balance as PositionValue).
function computeTotalsFromPositions(positions: Record<string, unknown>[]): { totalValue: number; cash: number } {
  let totalValue = 0;
  let cash = 0;
  for (const p of positions) {
    const v = Number(p.PositionValue) || 0;
    totalValue += v;
    if (String(p.AssetClass || '').toUpperCase() === 'CASH') cash += v;
  }
  return { totalValue, cash };
}

async function upsertSnapshotForToday(
  connectionId: string,
  userId: string,
  positions: Record<string, unknown>[],
  overrides?: { totalValue?: number; cash?: number },
): Promise<boolean> {
  // Cash-only IBRIT accounts always have at least one CASH position; empty array = sync produced nothing meaningful.
  if (positions.length === 0) return false;
  const { totalValue: posTotalValue, cash: posCash } = computeTotalsFromPositions(positions);
  // Allow callers to pass NLV-authoritative values that supersede position-derived sums.
  const totalValue = overrides?.totalValue ?? posTotalValue;
  const cash = overrides?.cash ?? posCash;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const { error } = await supabaseAdmin
    .from('portfolio_snapshots')
    .upsert(
      {
        user_id: userId,
        broker_connection_id: connectionId,
        snapshot_date: today,
        total_value: totalValue,
        cash,
        buying_power: cash, // no margin info from Activity report; equals cash for cash-only accounts
        source: 'live',
        metadata: { positions_count: positions.length },
      },
      { onConflict: 'broker_connection_id,snapshot_date' },
    );
  if (error) {
    console.error('[ib-sync v8] portfolio_snapshots upsert failed:', error.message);
    return false;
  }
  return true;
}

async function syncOneUser(userId: string): Promise<UserSyncSummary> {
  const { data: conn, error: connErr } = await supabaseAdmin
    .from('broker_connections').select('id, connection_data, is_active, account_id')
    .eq('user_id', userId).eq('broker', 'interactive_brokers').maybeSingle();
  if (connErr || !conn || !conn.is_active) {
    return { userId, tradesInserted: 0, tradeErrors: 0, positionsCount: 0, daysQueried: 0, daysWithData: 0, daysEmpty: 0, daysErrored: 0, firstError: null, skipped: 'no_active_connection' };
  }
  const cd = conn.connection_data || {};
  const ibToken = cd.token as string | undefined;
  const queryId = cd.query_id as string | undefined;
  const serviceCode = (cd.service_code as string | undefined) || DEFAULT_SERVICE_CODE;
  if (!ibToken || !queryId) {
    return { userId, tradesInserted: 0, tradeErrors: 0, positionsCount: 0, daysQueried: 0, daysWithData: 0, daysEmpty: 0, daysErrored: 0, firstError: 'missing_credentials' };
  }

  const today = new Date();
  const dates: Date[] = [];
  for (let i = 1; i <= SYNC_DAYS_BACK; i++) {
    const d = new Date(today); d.setUTCDate(today.getUTCDate() - i); dates.push(d);
  }

  // Accumulate all sections across all queried days
  const allSections: ParsedSections = {
    activity: [], position: [], cashReport: [], nav: [], pl: [], security: [], account: [],
  };
  let httpOk = 0, httpEmpty = 0, httpErr = 0;
  let firstErrorMsg: string | null = null;

  for (let i = 0; i < dates.length; i += MAX_CONCURRENT_DAYS) {
    const batch = dates.slice(i, i + MAX_CONCURRENT_DAYS);
    const results = await Promise.allSettled(batch.map(d => fetchIBRITActivity(ibToken, queryId, serviceCode, d)));
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const sections = r.value;
        const hasData = sections.activity.length > 0 || sections.position.length > 0 || sections.nav.length > 0;
        if (!hasData) {
          httpEmpty++;
        } else {
          httpOk++;
          allSections.activity.push(...sections.activity);
          allSections.position.push(...sections.position);
          allSections.cashReport.push(...sections.cashReport);
          allSections.nav.push(...sections.nav);
          allSections.pl.push(...sections.pl);
          allSections.security.push(...sections.security);
          allSections.account.push(...sections.account);
        }
      } else {
        httpErr++;
        if (!firstErrorMsg) firstErrorMsg = (r.reason instanceof Error ? r.reason.message : String(r.reason));
      }
    }
  }

  // AccountID: prefer connection's stored value, then pull from parsed sections
  let accountId: string | null = conn.account_id;
  if (!accountId) {
    const firstRec = allSections.activity[0] ?? allSections.position[0];
    const rawId = firstRec?.AccountID ?? null;
    if (rawId) {
      accountId = rawId;
      await supabaseAdmin.from('broker_connections').update({ account_id: accountId }).eq('id', conn.id);
    }
  }

  // Upsert trades from Activity section
  let tradesInserted = 0, tradeErrors = 0;
  for (const rec of allSections.activity) {
    const row = mapActivityToTrade(rec, userId, conn?.id ?? null); if (!row) continue;
    const { error: upsertErr } = await supabaseAdmin.from('trades').upsert(row, { onConflict: 'idempotency_key', ignoreDuplicates: true });
    if (upsertErr) { console.error('[ib-sync v8] trade upsert:', upsertErr.message); tradeErrors++; }
    else tradesInserted++;
  }

  // Positions: prefer Position section (most recent report date only to avoid duplicating 30 days × N positions)
  // Fallback to aggregatePositions if no Position section rows were returned.
  let positionsSnapshot: Record<string, unknown>[] = [];
  let positionsSource: 'position_section' | 'aggregated' | 'preserved' = 'aggregated';

  // latestReportDate: needed both for position de-duplication and for extractAccountSummary row selection.
  const latestReportDate = allSections.position.length > 0
    ? (allSections.position
        .map(r => r.ReportDate || '')
        .filter(d => d !== '')
        .sort()
        .at(-1) ?? '')
    : '';

  if (allSections.position.length > 0) {
    // Use only the most recent report date's position rows to get current state
    const latestPositionRows = latestReportDate
      ? allSections.position.filter(r => r.ReportDate === latestReportDate)
      : allSections.position; // fallback: use all if ReportDate missing

    const tempSections: ParsedSections = { ...allSections, position: latestPositionRows };
    positionsSnapshot = parsePositionsFromCsv(tempSections);
    positionsSource = 'position_section';
  } else {
    // Fallback: reconstruct from activity trades
    positionsSnapshot = aggregatePositions(allSections.activity);
    positionsSource = 'aggregated';
  }

  // v5 fix: do not overwrite existing last_positions with [] (cash-only accounts produce no trades).
  const existingPositions = (cd.last_positions as Record<string, unknown>[] | undefined) || [];
  let positionsForWrite: Record<string, unknown>[];
  if (positionsSnapshot.length > 0) {
    positionsForWrite = positionsSnapshot;
  } else {
    positionsForWrite = existingPositions;
    positionsSource = 'preserved';
  }

  // v10: extract authoritative account value from NAV/Account sections.
  // Forward-only: preserve the previous value when extraction returns null this run.
  const accountSummary = extractAccountSummary(allSections, latestReportDate);
  const lastAccountSummary =
    accountSummary ?? (cd as Record<string, unknown>).last_account_summary ?? null;

  const now = new Date().toISOString();
  await supabaseAdmin.from('broker_connections').update({
    last_sync_at: now, last_successful_sync_at: now,
    error_count: 0, last_error: firstErrorMsg, last_error_at: firstErrorMsg ? now : null,
    status: 'connected',
    connection_data: {
      ...cd,
      last_positions: positionsForWrite,
      last_synced_date: formatYYYYMMDD(today),
      sync_meta: { http_ok: httpOk, http_empty: httpEmpty, http_err: httpErr, last_run: now, positions_source: positionsSource },
      last_account_summary: lastAccountSummary,
    },
  }).eq('id', conn.id);

  // v10: prefer authoritative NLV for snapshot total_value; fall back to position-derived sum.
  const posTotals = computeTotalsFromPositions(positionsForWrite);
  const snapshotTotalValue =
    (accountSummary?.netliquidation?.amount && accountSummary.netliquidation.amount > 0)
      ? accountSummary.netliquidation.amount
      : posTotals.totalValue;
  const snapshotCash = accountSummary?.totalcashvalue?.amount ?? posTotals.cash;

  // Snapshot uses whichever positions array we kept (Position section OR aggregated OR preserved prior).
  const snapshotInserted = await upsertSnapshotForToday(conn.id, userId, positionsForWrite, {
    totalValue: snapshotTotalValue,
    cash: snapshotCash,
  });

  return { userId, tradesInserted, tradeErrors, positionsCount: positionsSnapshot.length, daysQueried: dates.length, daysWithData: httpOk, daysEmpty: httpEmpty, daysErrored: httpErr, firstError: firstErrorMsg, snapshotInserted, positionsSource };
}

// Backfill historical snapshots from existing trades. Walks day-by-day, computes cumulative
// realized P&L and net cash outlay, derives an estimated total_value at EOD. Imprecise — current
// cash balance is assumed constant historically. Used as a one-time bootstrap so the COPILOT chart
// has shape before the daily cron has accumulated real snapshots.
async function backfillFromTrades(userId: string, days: number): Promise<{ inserted: number; skipped: number; range: string; error?: string }> {
  const { data: conn, error: connErr } = await supabaseAdmin
    .from('broker_connections').select('id, connection_data')
    .eq('user_id', userId).eq('broker', 'interactive_brokers').eq('is_active', true).maybeSingle();
  if (connErr || !conn) return { inserted: 0, skipped: 0, range: '', error: 'no_active_connection' };

  // Anchor: current cash balance from latest snapshot (live or null).
  const positions = (conn.connection_data?.last_positions as Record<string, unknown>[]) || [];
  const { cash: currentCash } = computeTotalsFromPositions(positions);

  const { data: trades, error: tradesErr } = await supabaseAdmin
    .from('trades')
    .select('open_at, side, quantity, entry_price, fees')
    .eq('user_id', userId).eq('broker', 'interactive_brokers')
    .order('open_at', { ascending: true });
  if (tradesErr) return { inserted: 0, skipped: 0, range: '', error: tradesErr.message };

  const endDate = new Date();
  const startDate = new Date(); startDate.setUTCDate(endDate.getUTCDate() - days);

  // Pre-aggregate net cash outflow per day (buy = outflow, sell = inflow).
  const dailyNetFlow = new Map<string, number>();
  for (const t of (trades || [])) {
    const dt = t.open_at ? String(t.open_at).slice(0, 10) : null;
    if (!dt) continue;
    const qty = Number(t.quantity) || 0;
    const px = Number(t.entry_price) || 0;
    const fee = Number(t.fees) || 0;
    const sign = String(t.side).toLowerCase() === 'buy' ? -1 : 1;
    const flow = sign * (qty * px) - fee;
    dailyNetFlow.set(dt, (dailyNetFlow.get(dt) || 0) + flow);
  }

  // Walk from endDate backwards, unwinding cash flow to reconstruct estimated EOD totalValue.
  // At today: totalValue = currentCash. Going back: add buy outflow back, subtract sell inflow.
  const rows: Record<string, unknown>[] = [];
  let cursorValue = currentCash;
  for (let i = 0; i <= days; i++) {
    const d = new Date(endDate); d.setUTCDate(endDate.getUTCDate() - i);
    const dt = d.toISOString().slice(0, 10);
    const flow = dailyNetFlow.get(dt) || 0;
    rows.push({
      user_id: userId,
      broker_connection_id: conn.id,
      snapshot_date: dt,
      total_value: Math.max(0, cursorValue),
      cash: null,
      buying_power: null,
      source: 'backfill_trades',
      metadata: { reconstructed_at: new Date().toISOString() },
    });
    cursorValue -= flow; // walking backward: undo the flow
  }

  let inserted = 0; let skipped = 0;
  for (const row of rows) {
    const { error } = await supabaseAdmin
      .from('portfolio_snapshots')
      .insert(row);
    if (error) {
      // 23505 = unique violation → day already has live snapshot, skip (live wins).
      if (error.code === '23505') skipped++;
      else console.error('[ib-sync v8 backfill] insert error:', error.message);
    } else inserted++;
  }

  return {
    inserted, skipped,
    range: `${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}`,
  };
}

// Backfill historical snapshots using mark-to-market prices from Polygon.
// Computes total_value(d) = cash(d) + Σ(holding[t](d).qty × close[t][d] × multiplier[t])
// where multiplier=100 for options, 1 for stocks/ETFs. Close prices are fetched from Polygon
// and cached in the shared postgres table `polygon_close_cache` to avoid redundant API calls.
async function backfillWithMarks(userId: string, days: number): Promise<{
  inserted: number;
  skipped: number;
  range: string;
  marks_cache_hit: number;
  marks_cache_miss: number;
  tickers_priced: number;
  error?: string;
}> {
  const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');
  if (!POLYGON_API_KEY) {
    console.log('[ib-sync backfill-marks] POLYGON_API_KEY not set — cache-only mode (missing dates will be null)');
  }

  // 1. Fetch broker_connection with last_positions
  const { data: conn, error: connErr } = await supabaseAdmin
    .from('broker_connections').select('id, connection_data')
    .eq('user_id', userId).eq('broker', 'interactive_brokers').eq('is_active', true).maybeSingle();
  if (connErr || !conn) return { inserted: 0, skipped: 0, range: '', marks_cache_hit: 0, marks_cache_miss: 0, tickers_priced: 0, error: 'no_active_connection' };

  // 2. currentCash from last_positions
  const lastPositions = (conn.connection_data?.last_positions as Record<string, unknown>[]) || [];
  const { cash: currentCash } = computeTotalsFromPositions(lastPositions);

  // 3. Build current holdings map (exclude CASH rows)
  const currentHoldings = new Map<string, { qty: number; assetClass: string }>();
  for (const p of lastPositions) {
    const ac = String(p.AssetClass || '').toUpperCase();
    if (ac === 'CASH') continue;
    const sym = String(p.Symbol || '');
    if (!sym) continue;
    const qty = Number(p.Quantity) || 0;
    if (qty !== 0) currentHoldings.set(sym, { qty, assetClass: String(p.AssetClass || 'STK') });
  }

  // 4. Fetch trades — need symbol + asset_class for qty reconstruction
  const { data: tradesRaw, error: tradesErr } = await supabaseAdmin
    .from('trades')
    .select('open_at, side, quantity, entry_price, fees, symbol, asset_class, underlying_symbol')
    .eq('user_id', userId).eq('broker', 'interactive_brokers')
    .order('open_at', { ascending: true });
  if (tradesErr) return { inserted: 0, skipped: 0, range: '', marks_cache_hit: 0, marks_cache_miss: 0, tickers_priced: 0, error: tradesErr.message };
  const trades = tradesRaw || [];

  // Edge case: no trades at all
  if (trades.length === 0) {
    console.log('[ib-sync backfill-marks] no trades found for user');
    return { inserted: 0, skipped: 0, range: '', marks_cache_hit: 0, marks_cache_miss: 0, tickers_priced: 0, error: 'no_trades' };
  }

  // 5. Date range
  const endDate = new Date();
  endDate.setUTCHours(0, 0, 0, 0); // midnight UTC
  const startDate = new Date(endDate);
  startDate.setUTCDate(endDate.getUTCDate() - days);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  // 6a. dailyNetFlow (buy = negative, sell = positive; fees subtracted) — same sign as v1
  const dailyNetFlow = new Map<string, number>();
  // 6b. dailyQtyDelta: date → symbol → signed qty delta (buy = +, sell = -)
  const dailyQtyDelta = new Map<string, Map<string, number>>();
  // Also collect asset class per symbol from trades (for multiplier detection)
  const tradeAssetClass = new Map<string, string>();

  for (const t of trades) {
    const dt = t.open_at ? String(t.open_at).slice(0, 10) : null;
    if (!dt) continue;

    const sym = String(t.symbol || '');
    const qty = Number(t.quantity) || 0;
    const px = Number(t.entry_price) || 0;
    const fee = Number(t.fees) || 0;
    const sideUp = String(t.side || '').toUpperCase();
    const isBuy = sideUp === 'BUY' || sideUp === 'LONG';

    // net flow: buy = outflow (negative), sell = inflow (positive); fees always reduce
    const sign = isBuy ? -1 : 1;
    const flow = sign * (qty * px) - fee;
    dailyNetFlow.set(dt, (dailyNetFlow.get(dt) || 0) + flow);

    // qty delta: buy = positive, sell = negative
    if (sym) {
      const qtySign = isBuy ? 1 : -1;
      const dayMap = dailyQtyDelta.get(dt) ?? new Map<string, number>();
      dayMap.set(sym, (dayMap.get(sym) || 0) + qtySign * qty);
      dailyQtyDelta.set(dt, dayMap);

      if (t.asset_class && !tradeAssetClass.has(sym)) {
        tradeAssetClass.set(sym, String(t.asset_class));
      }
    }
  }

  // 7. Unique tickers: union of currentHoldings + all symbols from dailyQtyDelta within backfill window
  const uniqueTickers = new Set<string>();
  for (const sym of currentHoldings.keys()) uniqueTickers.add(sym);
  for (const [dt, dayMap] of dailyQtyDelta.entries()) {
    if (dt >= startStr && dt <= endStr) {
      for (const sym of dayMap.keys()) uniqueTickers.add(sym);
    }
  }

  // 8. Fetch marks per ticker with polygon_close_cache
  // marks: ticker → date(YYYY-MM-DD) → close | null
  const allMarks = new Map<string, Map<string, number | null>>();
  let marksCacheHit = 0;
  let marksCacheMiss = 0;

  // Generate array of all dates in window (YYYY-MM-DD) for cache miss detection
  const windowDates: string[] = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    windowDates.push(d.toISOString().slice(0, 10));
  }

  for (const ticker of uniqueTickers) {
    const tickerMarks = new Map<string, number | null>();

    // Query cache
    const { data: cached } = await supabaseAdmin
      .from('polygon_close_cache')
      .select('date, close')
      .eq('ticker', ticker)
      .gte('date', startStr)
      .lte('date', endStr);

    const cachedDates = new Set<string>();
    for (const row of (cached || [])) {
      const dateStr = String(row.date).slice(0, 10);
      tickerMarks.set(dateStr, row.close !== null && row.close !== undefined ? Number(row.close) : null);
      cachedDates.add(dateStr);
      marksCacheHit++;
    }

    // Find uncached dates
    const uncachedDates = windowDates.filter(d => !cachedDates.has(d));
    marksCacheMiss += uncachedDates.length;

    if (uncachedDates.length > 0 && POLYGON_API_KEY) {
      // Fetch from Polygon (one call covers the full range)
      const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${startStr}/${endStr}?adjusted=true&sort=asc&limit=5000&apiKey=${POLYGON_API_KEY}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      let polygonResults: Array<{ t: number; c: number }> = [];
      try {
        const res = await fetch(polygonUrl, { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          polygonResults = (json.results as Array<{ t: number; c: number }>) || [];
        } else {
          console.log(`[ib-sync backfill-marks] Polygon HTTP ${res.status} for ${ticker} — will use null marks`);
        }
      } catch (e) {
        console.log(`[ib-sync backfill-marks] Polygon fetch error for ${ticker}:`, e instanceof Error ? e.message : String(e));
      } finally {
        clearTimeout(timer);
      }

      // Build fetched date → close map
      const fetchedMap = new Map<string, number>();
      for (const bar of polygonResults) {
        const dateStr = new Date(bar.t).toISOString().slice(0, 10);
        fetchedMap.set(dateStr, bar.c);
      }

      console.log(`[ib-sync backfill-marks] ${ticker}: cache_miss=${uncachedDates.length}, polygon_bars=${polygonResults.length}`);

      // Bulk upsert: fetched dates get real close; other uncached dates get null (known no-trading)
      const upsertRows: Array<{ ticker: string; date: string; close: number | null; fetched_at: string }> = [];
      const nowIso = new Date().toISOString();
      for (const d of uncachedDates) {
        const close = fetchedMap.has(d) ? fetchedMap.get(d)! : null;
        tickerMarks.set(d, close);
        upsertRows.push({ ticker, date: d, close: close !== undefined ? close : null, fetched_at: nowIso });
      }
      if (upsertRows.length > 0) {
        const { error: upsertErr } = await supabaseAdmin
          .from('polygon_close_cache')
          .upsert(upsertRows, { onConflict: 'ticker,date', ignoreDuplicates: false });
        if (upsertErr) console.log(`[ib-sync backfill-marks] cache upsert error for ${ticker}:`, upsertErr.message);
      }

      // Throttle between tickers
      await new Promise(r => setTimeout(r, 200));
    } else if (uncachedDates.length > 0) {
      // No Polygon key — populate uncached dates as null (cache-only graceful degradation)
      for (const d of uncachedDates) tickerMarks.set(d, null);
      console.log(`[ib-sync backfill-marks] ${ticker}: ${uncachedDates.length} dates uncached, no Polygon key — using null`);
    }

    allMarks.set(ticker, tickerMarks);
  }

  // 9. Compute multipliers (100 for options, 1 for everything else)
  const multipliers = new Map<string, number>();
  for (const ticker of uniqueTickers) {
    // Check current holdings first, then trade asset class
    const acFromHoldings = currentHoldings.get(ticker)?.assetClass ?? '';
    const acFromTrades = tradeAssetClass.get(ticker) ?? '';
    const ac = (acFromHoldings || acFromTrades).toLowerCase();
    const isOption = ac === 'opt' || ac === 'option' || ac === 'options';
    multipliers.set(ticker, isOption ? 100 : 1);
  }

  // Helper: last-known-good close price at or before date d, within 7-day look-back
  function priorClose(ticker: string, d: string): number | null {
    const tickerMap = allMarks.get(ticker);
    if (!tickerMap) return null;
    // Try the date itself first, then walk back up to 7 days
    const dDate = new Date(d);
    for (let back = 0; back <= 7; back++) {
      const candidate = new Date(dDate);
      candidate.setUTCDate(dDate.getUTCDate() - back);
      const candidateStr = candidate.toISOString().slice(0, 10);
      if (tickerMap.has(candidateStr)) {
        const val = tickerMap.get(candidateStr);
        if (val !== null && val !== undefined) return val;
      }
    }
    return null; // no usable price found → caller treats as 0
  }

  // 10. Walk backward
  const reconstructedAt = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];
  let cash = currentCash;
  // Initialize holdings from currentHoldings
  const holdings = new Map<string, number>();
  for (const [sym, h] of currentHoldings.entries()) holdings.set(sym, h.qty);

  for (let i = 0; i <= days; i++) {
    const d = new Date(endDate);
    d.setUTCDate(endDate.getUTCDate() - i);
    const dt = d.toISOString().slice(0, 10);

    // Compute mark-to-market total value
    let positionsValue = 0;
    let marksUsed = 0;
    const multiplierOverrides: Record<string, number> = {};
    for (const [sym, qty] of holdings.entries()) {
      if (qty === 0) continue;
      const close = priorClose(sym, dt);
      const multiplier = multipliers.get(sym) ?? 1;
      const effectiveClose = close ?? 0;
      if (close === null) {
        console.log(`[ib-sync backfill-marks] warning: no price for ${sym} on ${dt} — using 0`);
      }
      positionsValue += qty * effectiveClose * multiplier;
      marksUsed++;
      if (multiplier !== 1) multiplierOverrides[sym] = multiplier;
    }

    const totalValue = Math.max(0, cash + positionsValue);

    rows.push({
      user_id: userId,
      broker_connection_id: conn.id,
      snapshot_date: dt,
      total_value: totalValue,
      cash,
      buying_power: cash,
      source: 'backfill_with_marks',
      metadata: {
        reconstructed_at: reconstructedAt,
        marks_used: marksUsed,
        multiplier_overrides: Object.keys(multiplierOverrides).length > 0 ? multiplierOverrides : undefined,
      },
    });

    // Undo this day's deltas to reconstruct prior day state
    const flow = dailyNetFlow.get(dt) || 0;
    cash -= flow;

    const dayQtyDeltas = dailyQtyDelta.get(dt);
    if (dayQtyDeltas) {
      for (const [sym, delta] of dayQtyDeltas.entries()) {
        holdings.set(sym, (holdings.get(sym) || 0) - delta);
      }
    }
  }

  // 11. Insert rows (23505 → skip)
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const { error } = await supabaseAdmin
      .from('portfolio_snapshots')
      .insert(row);
    if (error) {
      if (error.code === '23505') skipped++;
      else console.error('[ib-sync backfill-marks] insert error:', error.message);
    } else inserted++;
  }

  const tickers_priced = uniqueTickers.size;
  console.log(`[ib-sync backfill-marks] done: inserted=${inserted} skipped=${skipped} cache_hit=${marksCacheHit} cache_miss=${marksCacheMiss} tickers=${tickers_priced}`);

  // 12. Return
  return {
    inserted,
    skipped,
    range: `${startStr} → ${endStr}`,
    marks_cache_hit: marksCacheHit,
    marks_cache_miss: marksCacheMiss,
    tickers_priced,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const auth = await authenticate(req, supabaseAdmin);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.message }), { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let body: { userId?: string; mode?: string; days?: number };
  try { body = await req.json(); } catch { body = {}; }

  // BACKFILL WITH MARKS MODE: mark-to-market historical reconstruction using Polygon closes
  if (body.mode === 'backfill_with_marks') {
    const { userId } = body;
    if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!auth.isCron && auth.userId !== userId) return new Response(JSON.stringify({ error: 'Forbidden: userId mismatch' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const days = body.days ?? 30;
    const result = await backfillWithMarks(userId, days);
    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // BACKFILL MODE: reconstruct historical portfolio_snapshots from trades (one-shot bootstrap)
  if (body.mode === 'backfill_from_trades') {
    const { userId } = body;
    if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!auth.isCron && auth.userId !== userId) return new Response(JSON.stringify({ error: 'Forbidden: userId mismatch' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const days = Math.max(1, Math.min(Number(body.days) || 365, 730));
    const result = await backfillFromTrades(userId, days);
    return new Response(JSON.stringify({ ok: !result.error, mode: 'backfill_from_trades', ...result }), { status: result.error ? 500 : 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // CRON MODE: loop all active IB connections (service-role auth only)
  if (body.mode === 'cron') {
    if (!auth.isCron) {
      return new Response(JSON.stringify({ error: 'Forbidden: cron mode requires service-role auth' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: conns, error: listErr } = await supabaseAdmin
      .from('broker_connections').select('user_id')
      .eq('broker', 'interactive_brokers').eq('is_active', true);
    if (listErr) {
      return new Response(JSON.stringify({ error: 'list_failed', message: listErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const startMs = Date.now();
    const summaries: UserSyncSummary[] = [];
    let cronErrors = 0;
    for (const c of (conns || [])) {
      try { summaries.push(await syncOneUser(c.user_id)); }
      catch (e) {
        cronErrors++;
        summaries.push({ userId: c.user_id, tradesInserted: 0, tradeErrors: 0, positionsCount: 0, daysQueried: 0, daysWithData: 0, daysEmpty: 0, daysErrored: 0, firstError: e instanceof Error ? e.message : String(e) });
      }
    }

    // v10: write a heartbeat row so cron-health/observability can confirm ib-auto-sync ran.
    // Convention (matches tradovate-sync): write 'ok'/'partial' only; on total failure SKIP the
    // heartbeat so cron-health's staleness check drives alerting instead of a brittle 'failed' status.
    // NOTE: cron_heartbeat.last_status has a CHECK constraint allowing only 'ok' | 'partial' | 'failed'.
    const hbStatus: 'ok' | 'partial' | null =
      cronErrors === 0 ? 'ok' : (summaries.length - cronErrors > 0 ? 'partial' : null);
    if (hbStatus !== null) {
      try {
        await supabaseAdmin.from('cron_heartbeat').upsert({
          job_name: 'ib-auto-sync',
          last_run_at: new Date().toISOString(),
          last_status: hbStatus,
          last_duration_ms: Date.now() - startMs,
          last_payload: { synced: summaries.length - cronErrors, errors: cronErrors },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'job_name' });
      } catch (heartbeatErr) {
        console.error('[ib-sync] cron heartbeat upsert failed (non-fatal):', heartbeatErr instanceof Error ? heartbeatErr.message : String(heartbeatErr));
      }
    }

    return new Response(JSON.stringify({ ok: true, mode: 'cron', users: summaries.length, summaries }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // USER MODE: single user sync
  const { userId } = body;
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (!auth.isCron && auth.userId !== userId) return new Response(JSON.stringify({ error: 'Forbidden: userId mismatch' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const summary = await syncOneUser(userId);
    if (summary.skipped) return new Response(JSON.stringify({ skipped: true, reason: summary.skipped }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ ok: true, ...summary }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ib-sync v8] fatal for user', userId.slice(0, 8), ':', message);
    try {
      const { data: fresh } = await supabaseAdmin.from('broker_connections').select('id, error_count').eq('user_id', userId).eq('broker', 'interactive_brokers').maybeSingle();
      if (fresh) await supabaseAdmin.from('broker_connections').update({ error_count: (fresh.error_count ?? 0) + 1, last_error: message, last_error_at: new Date().toISOString() }).eq('id', fresh.id);
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
