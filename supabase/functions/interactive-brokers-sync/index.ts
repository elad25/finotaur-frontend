// interactive-brokers-sync v3 — IBRIT (Flex Query) + cron mode
//
// Modes:
//   - user-invoked (Bearer = user JWT, body = {userId})       → sync a single user
//   - cron        (Bearer = service-role, body = {mode:'cron'}) → loop all active IB connections
//
// Auth: dualAuth pattern (inlined). Accepts vault.secret_api_key OR SUPABASE_SERVICE_ROLE_KEY
// for cron path, falls through to Supabase JWT validation for user path.
//
// Data source: IBRIT Activity report (CSV) at https://ndcdyn.interactivebrokers.com/Reporting/IBRITService
// Writes:
//   - trades table (upsert on user_id + broker + external_id)
//   - broker_connections.connection_data.last_positions (aggregated from trades, IBRIT shape)
//   - broker_connections.last_sync_at / last_successful_sync_at / error_count / status

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

// ─── CSV parser (handles quoted fields with embedded commas + IBRIT envelope markers) ───
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !/^(BOF|EOF|BOA|EOA)/.test(l));
  if (lines.length < 2) return [];
  const splitLine = (line: string): string[] => {
    const out: string[] = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur); return out;
  };
  const headers = splitLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

function formatYYYYMMDD(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

async function fetchIBRITActivity(token: string, queryId: string, serviceCode: string, date: Date): Promise<Record<string, string>[]> {
  const url = new URL(IBRIT_BASE);
  url.searchParams.set('t', token);
  url.searchParams.set('q', queryId);
  url.searchParams.set('rd', formatYYYYMMDD(date));
  url.searchParams.set('s', serviceCode);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url.toString(), { method: 'GET', headers: { 'Accept': 'text/csv,text/plain,*/*' }, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`IBRIT HTTP ${res.status}: ${text.slice(0, 200)}`);
    // IBRIT inline error code (e.g. "1052: Invalid token")
    const errMatch = text.match(/^(?:ERROR\s+)?(\d{4}):/m);
    if (errMatch) {
      const code = errMatch[1];
      if (code === '1010') return []; // NO_STATEMENT — no activity on this day (not an error)
      throw new Error(`IBRIT error ${code}: ${text.slice(0, 300)}`);
    }
    return parseCsv(text);
  } finally { clearTimeout(timer); }
}

function mapActivityToTrade(rec: Record<string, string>, userId: string): Record<string, unknown> | null {
  const extId = rec.TransactionID || rec.IBExecID || rec.IBOrderID;
  if (!extId) return null;
  const txType = (rec.TransactionType || '').toUpperCase();
  if (txType && !/EXCHTRADE|BOOKTRADE|TRADE/.test(txType)) return null; // skip dividends/fees/transfers
  const buySell = (rec.BuySell || '').toUpperCase();
  if (buySell !== 'BUY' && buySell !== 'SELL') return null;
  const tradeDate = rec.TradeDate || rec.SettleDate || rec.ReportDate;
  const tradeTime = rec.TradeTime || '000000';
  let openAt = new Date().toISOString();
  if (tradeDate && /^\d{8}$/.test(tradeDate)) {
    const y = tradeDate.slice(0, 4), m = tradeDate.slice(4, 6), d = tradeDate.slice(6, 8);
    const t = /^\d{6}$/.test(tradeTime) ? `${tradeTime.slice(0,2)}:${tradeTime.slice(2,4)}:${tradeTime.slice(4,6)}` : '00:00:00';
    openAt = new Date(`${y}-${m}-${d}T${t}Z`).toISOString();
  }
  return {
    user_id: userId, broker: 'interactive_brokers',
    external_id: 'ib_' + extId,
    symbol: rec.Symbol || rec.UnderlyingSymbol || 'UNKNOWN',
    side: buySell.toLowerCase(),
    quantity: Math.abs(Number(rec.Quantity) || 0),
    entry_price: Number(rec.TradePrice) || 0,
    fees: Math.abs(Number(rec.IBCommission) || 0),
    open_at: openAt,
    asset_type: (rec.AssetClass || 'STK').toLowerCase(),
    currency: rec.CurrencyPrimary || 'USD',
  };
}

// Aggregate trades → IBRIT-shaped position snapshot.
// (No real-time prices from Activity report; uses last TradePrice as MarkPrice proxy.)
function aggregatePositions(trades: Record<string, string>[]): Record<string, unknown>[] {
  const map = new Map<string, { Symbol: string; Description: string; netQty: number; totalCost: number; lastPrice: number; CurrencyPrimary: string; AssetClass: string }>();
  const sorted = [...trades].sort((a, b) => (a.TradeDate || '').localeCompare(b.TradeDate || ''));
  for (const t of sorted) {
    const sym = t.Symbol || t.UnderlyingSymbol; if (!sym) continue;
    const qty = Number(t.Quantity) || 0;
    const px = Number(t.TradePrice) || 0;
    const buySell = (t.BuySell || '').toUpperCase();
    const signedQty = buySell === 'SELL' ? -Math.abs(qty) : Math.abs(qty);
    const entry = map.get(sym) ?? { Symbol: sym, Description: t.Description || sym, netQty: 0, totalCost: 0, lastPrice: px, CurrencyPrimary: t.CurrencyPrimary || 'USD', AssetClass: t.AssetClass || 'STK' };
    entry.netQty += signedQty;
    if (buySell === 'BUY') entry.totalCost += Math.abs(qty) * px;
    entry.lastPrice = px || entry.lastPrice;
    map.set(sym, entry);
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

  const allRecords: Record<string, string>[] = [];
  let httpOk = 0, httpEmpty = 0, httpErr = 0;
  let firstErrorMsg: string | null = null;
  for (let i = 0; i < dates.length; i += MAX_CONCURRENT_DAYS) {
    const batch = dates.slice(i, i + MAX_CONCURRENT_DAYS);
    const results = await Promise.allSettled(batch.map(d => fetchIBRITActivity(ibToken, queryId, serviceCode, d)));
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.length === 0) httpEmpty++;
        else { httpOk++; allRecords.push(...r.value); }
      } else { httpErr++; if (!firstErrorMsg) firstErrorMsg = (r.reason instanceof Error ? r.reason.message : String(r.reason)); }
    }
  }

  let accountId: string | null = conn.account_id;
  if (!accountId && allRecords.length > 0) {
    accountId = allRecords[0].AccountId || null;
    if (accountId) await supabaseAdmin.from('broker_connections').update({ account_id: accountId }).eq('id', conn.id);
  }

  let tradesInserted = 0, tradeErrors = 0;
  for (const rec of allRecords) {
    const row = mapActivityToTrade(rec, userId); if (!row) continue;
    const { error: upsertErr } = await supabaseAdmin.from('trades').upsert(row, { onConflict: 'user_id,broker,external_id', ignoreDuplicates: true });
    if (upsertErr) { console.error('[ib-sync] trade upsert:', upsertErr.message); tradeErrors++; }
    else tradesInserted++;
  }

  const positionsSnapshot = aggregatePositions(allRecords);
  const now = new Date().toISOString();
  await supabaseAdmin.from('broker_connections').update({
    last_sync_at: now, last_successful_sync_at: now,
    error_count: 0, last_error: firstErrorMsg, last_error_at: firstErrorMsg ? now : null,
    status: 'connected',
    connection_data: { ...cd, last_positions: positionsSnapshot, last_synced_date: formatYYYYMMDD(today), sync_meta: { http_ok: httpOk, http_empty: httpEmpty, http_err: httpErr, last_run: now } },
  }).eq('id', conn.id);

  return { userId, tradesInserted, tradeErrors, positionsCount: positionsSnapshot.length, daysQueried: dates.length, daysWithData: httpOk, daysEmpty: httpEmpty, daysErrored: httpErr, firstError: firstErrorMsg };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const auth = await authenticate(req, supabaseAdmin);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.message }), { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let body: { userId?: string; mode?: string };
  try { body = await req.json(); } catch { body = {}; }

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
    console.error('[ib-sync v3] fatal for user', userId.slice(0, 8), ':', message);
    try {
      const { data: fresh } = await supabaseAdmin.from('broker_connections').select('id, error_count').eq('user_id', userId).eq('broker', 'interactive_brokers').maybeSingle();
      if (fresh) await supabaseAdmin.from('broker_connections').update({ error_count: (fresh.error_count ?? 0) + 1, last_error: message, last_error_at: new Date().toISOString() }).eq('id', fresh.id);
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
