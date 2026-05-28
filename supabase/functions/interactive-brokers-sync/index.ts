// interactive-brokers-sync v9 (2026-05-28): trades upsert onConflict fix —
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
    return parseIBRITFlexQuery(text);
  } finally { clearTimeout(timer); }
}

// ─── mapActivityToTrade: handles both legacy (BuySell column) and new (TransactionType=BUY/SELL) schemas ───
function mapActivityToTrade(rec: Record<string, string>, userId: string): Record<string, unknown> | null {
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
): Promise<boolean> {
  // Cash-only IBRIT accounts always have at least one CASH position; empty array = sync produced nothing meaningful.
  if (positions.length === 0) return false;
  const { totalValue, cash } = computeTotalsFromPositions(positions);
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
    const row = mapActivityToTrade(rec, userId); if (!row) continue;
    const { error: upsertErr } = await supabaseAdmin.from('trades').upsert(row, { onConflict: 'idempotency_key', ignoreDuplicates: true });
    if (upsertErr) { console.error('[ib-sync v8] trade upsert:', upsertErr.message); tradeErrors++; }
    else tradesInserted++;
  }

  // Positions: prefer Position section (most recent report date only to avoid duplicating 30 days × N positions)
  // Fallback to aggregatePositions if no Position section rows were returned.
  let positionsSnapshot: Record<string, unknown>[] = [];
  let positionsSource: 'position_section' | 'aggregated' | 'preserved' = 'aggregated';

  if (allSections.position.length > 0) {
    // Use only the most recent report date's position rows to get current state
    const latestReportDate = allSections.position
      .map(r => r.ReportDate || '')
      .filter(d => d !== '')
      .sort()
      .at(-1) ?? '';

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

  const now = new Date().toISOString();
  await supabaseAdmin.from('broker_connections').update({
    last_sync_at: now, last_successful_sync_at: now,
    error_count: 0, last_error: firstErrorMsg, last_error_at: firstErrorMsg ? now : null,
    status: 'connected',
    connection_data: { ...cd, last_positions: positionsForWrite, last_synced_date: formatYYYYMMDD(today), sync_meta: { http_ok: httpOk, http_empty: httpEmpty, http_err: httpErr, last_run: now, positions_source: positionsSource } },
  }).eq('id', conn.id);

  // Snapshot uses whichever positions array we kept (Position section OR aggregated OR preserved prior).
  const snapshotInserted = await upsertSnapshotForToday(conn.id, userId, positionsForWrite);

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const auth = await authenticate(req, supabaseAdmin);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.message }), { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let body: { userId?: string; mode?: string; days?: number };
  try { body = await req.json(); } catch { body = {}; }

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
    const summaries: UserSyncSummary[] = [];
    for (const c of (conns || [])) {
      try { summaries.push(await syncOneUser(c.user_id)); }
      catch (e) { summaries.push({ userId: c.user_id, tradesInserted: 0, tradeErrors: 0, positionsCount: 0, daysQueried: 0, daysWithData: 0, daysEmpty: 0, daysErrored: 0, firstError: e instanceof Error ? e.message : String(e) }); }
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
