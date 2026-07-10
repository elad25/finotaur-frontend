// supabase/functions/tradovate-sync/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   mode="cron"    — sync all connected users (called by pg_cron every 5 min)
//   mode="manual"  — sync one user (called by frontend Sync Now button)
//   mode="initial" — called right after first connection
//
// DEDUP STRATEGY:
//   ON CONFLICT (tradovate_order_id) DO NOTHING
//   → safe to call multiple times, never creates duplicates
//
// COPY TRADING:
//   After inserting each trade, calls process_copy_rules(trade_id)
//   which handles the FLOOR-rounded copy to target portfolios.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticate } from '../_shared/dualAuth.ts';
import { scheduleRetry } from '../_shared/retryQueue.ts';
import { fetchWithRetry as sharedFetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { matchStop, type StopOrder } from './_stopMatch.ts';

// Abort an in-flight fetch after `timeoutMs` (default 20s) so a hung Tradovate
// call rejects (caught by existing error handling) instead of lingering for
// minutes. Honors a caller-provided signal if one is passed.
async function fetchWithTimeout(input: string | URL | Request, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  return await fetch(input, { ...init, signal: (init as any).signal ?? AbortSignal.timeout(timeoutMs) });
}

// Diagnostic: last stop-index summary, surfaced in non-cron responses for verification.
let lastStopDiag: Record<string, unknown> | null = null;
let brokerRiskBudget = 50; // max auto-liq hydrations per cron invocation (rate-limit guard)

// Local alias preserving the existing call sites — `_shared/fetchWithRetry.ts`
// is the canonical Tradovate retry wrapper (handles 429 via p-time/p-ticket
// per Tradovate's official guidance, plus 5xx fixed-delay backoff).
//
// Observability (Phase 1A.2 + 1B.1): every 429 is fire-and-forget INSERTed
// into `public.tradovate_api_call_log` via the `admin` option. Phase 1B
// threads `userId` + `connectionId` down from the syncCredential caller so
// every row can be attributed to a specific broker_connection.
function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: { maxAttempts?: number; userId?: string; connectionId?: string },
): Promise<Response> {
  return sharedFetchWithRetry(url, init, {
    ...opts,
    label: 'tradovate-sync',
    admin: supabaseAdmin,
  });
}

const TRADOVATE_URLS = {
  live: 'https://live.tradovateapi.com/v1',
  demo: 'https://demo.tradovateapi.com/v1',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

// Decode the Tradovate access-token JWT `sub` claim → provider userId.
// OAuth prop-firm tokens (scope=trading_read) return [] from /account/list
// WITHOUT this userId; WITH it they return the sponsored accounts.
function extractUserIdFromJwt(accessToken: string): string | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const sub = payload.sub;
    return sub === undefined || sub === null || sub === '' ? null : String(sub);
  } catch { return null; }
}

// ─── Get access token from Vault ──────────────────────────────
async function getAccessToken(vaultSecretId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('tradovate_vault_read', {
    p_secret_id: vaultSecretId,
  });
  if (error || !data) throw new Error('Cannot read from Vault');
  const parsed = JSON.parse(data);
  // OAuth tokens (stored by oauth-callback) use snake_case `access_token`;
  // legacy tokens may use camelCase `accessToken`. Accept both.
  return parsed.access_token ?? parsed.accessToken;
}

// ─── Fetch fills from Tradovate ───────────────────────────────
// We use /fill/list (NOT /fill/ldeps) because the FINOTAUR app's API key
// permissions don't grant /fill/ldeps even with Orders=Full Access. /fill/list
// returns fills scoped to the authenticated token. Verified end-to-end via
// 13-endpoint diagnostic on 2026-05-08. Tradovate doesn't include accountId
// in /fill/list rows so we cannot filter by account here — accept that for
// single-account users, address multi-account in a separate sprint.
async function fetchFills(
  base: string,
  accessToken: string,
  _accountId: number,
  lastFillId: number,
  attribution?: { userId: string; connectionId: string },
): Promise<TradovateFill[]> {
  // Phase 1B.3: defensive pagination loop.
  //
  // Tradovate's /fill/list public docs don't specify pagination behavior
  // (we use /fill/list because /fill/ldeps requires API key permissions
  // we don't have — see top-of-function comment). Empirically the endpoint
  // returns "all fills scoped to the token" in one call, but if Tradovate
  // ever introduces an undocumented page cap (≥500 fills history is when
  // it could bite), this loop survives that scenario:
  //   - Fetch once.
  //   - If response contains >= PAGE_THRESHOLD rows AND any rows are newer
  //     than the cursor we passed in, advance cursor to the max-id observed
  //     and refetch.
  //   - Cap iterations at MAX_PAGES (sanity).
  //
  // Today (zero observed caps) this is a no-op single iteration. If
  // Tradovate caps later, deep-history users still get all their fills.
  const PAGE_THRESHOLD = 200;
  const MAX_PAGES = 10;
  const url = `${base}/fill/list`;
  const headers = { Authorization: `Bearer ${accessToken}` };

  const collected: TradovateFill[] = [];
  let cursor = lastFillId;
  let iteration = 0;

  while (iteration < MAX_PAGES) {
    iteration++;
    const res = await fetchWithRetry(url, { headers }, attribution);
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    if (!res.ok) throw new Error(`Fill fetch failed: ${res.status}`);

    const page: TradovateFill[] = await res.json();
    const newFills = page.filter(f => f.id > cursor);

    if (newFills.length === 0) break;
    collected.push(...newFills);

    // Only keep paging if (a) response looks capped and (b) we made progress.
    if (page.length < PAGE_THRESHOLD) break;

    const maxIdThisPage = newFills.reduce((m, f) => (f.id > m ? f.id : m), cursor);
    if (maxIdThisPage <= cursor) break; // no forward progress — bail
    cursor = maxIdThisPage;

    if (iteration > 1) {
      console.log(
        `[tradovate-sync] fill_pagination: page=${iteration} collected=${collected.length} cursor=${cursor}`,
      );
    }
  }

  return collected;
}

interface TradovateFill {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  tradeDate: { year: number; month: number; day: number };
  action: 'Buy' | 'Sell';
  qty: number;
  price: number;
  active: boolean;
  finallyPaired: boolean;
}

// ─── Hardcoded futures multipliers (fallback when /product/item returns null/0) ──
// Source: Tradovate / CME contract specs as of 2026-05-09. Maintain when CME adds contracts.
// Used only when fullPointValue from Tradovate API is missing/zero — preferred path is still API.
const KNOWN_FUTURES_MULTIPLIERS: Record<string, number> = {
  // E-mini index futures
  ES: 50,    // E-mini S&P 500
  NQ: 20,    // E-mini Nasdaq-100
  RTY: 50,   // E-mini Russell 2000
  YM: 5,     // E-mini Dow
  // Micro index futures
  MES: 5,    // Micro E-mini S&P 500
  MNQ: 2,    // Micro E-mini Nasdaq-100
  MRTY: 5,   // Micro E-mini Russell 2000  (a.k.a. M2K on some symbol maps)
  M2K: 5,    // Alias for MRTY
  MYM: 0.5,  // Micro E-mini Dow
  // Commodity / metal / energy
  CL: 1000,  // Crude oil
  GC: 100,   // Gold
  SI: 5000,  // Silver
  HG: 25000, // Copper
  NG: 10000, // Natural gas
  // Treasuries
  ZN: 1000,  // 10-Year T-Note
  ZB: 1000,  // 30-Year T-Bond
  ZF: 1000,  // 5-Year T-Note
};

// Extract the base symbol prefix from a contract name like "MNQM6" → "MNQ", "ESZ5" → "ES", "M2KZ5" → "M2K".
// Tradovate naming convention: BASE + MONTH-letter + YEAR-digit(s).
// Month letters per CME: F(Jan) G(Feb) H(Mar) J(Apr) K(May) M(Jun) N(Jul) Q(Aug) U(Sep) V(Oct) X(Nov) Z(Dec).
// BASE starts with a letter and may include digits afterward (e.g. M2K for Micro Russell 2000).
// The lazy `*?` ensures the BASE captures the shortest prefix; the explicit month-letter class
// prevents the greedy match that previously returned "MNQM" for "MNQM6" (a real bug — pre-2026-05-12
// every contract whose API /product/item returned null/0 fell back to multiplier=1).
function extractBaseSymbol(contractName: string): string | null {
  if (!contractName) return null;
  const match = contractName.match(/^([A-Z][A-Z0-9]*?)[FGHJKMNQUVXZ]\d+$/);
  return match ? match[1] : null;
}

// ─── Fetch contract info ──────────────────────────────────────
// B2 perf fix (2026-05-21): global cache via public.tradovate_contracts.
// Same contractId (e.g. MNQM6) used by N users → without this, each cron tick
// re-runs the 3-call API trio per user per fill. Lazy fill of the table on
// API success; KNOWN_FUTURES_MULTIPLIERS fallback path stays un-cached
// (already in-process via the hardcoded constant — no further win there).
const CONTRACT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
async function getContractInfo(
  base: string,
  accessToken: string,
  contractId: number,
  attribution?: { userId: string; connectionId: string },
): Promise<{ name: string; fullPointValue: number }> {
  // ① B2 — DB cache lookup (global across all users/runs). Only honors
  //    api-sourced rows; if the only row is a hardcoded-fallback snapshot,
  //    skip and let the API trio try again (it may have come back since).
  {
    const { data: cached } = await supabaseAdmin
      .from('tradovate_contracts')
      .select('name, full_point_value, fetched_at, source')
      .eq('contract_id', contractId)
      .eq('source', 'api')
      .maybeSingle();
    if (cached && cached.fetched_at) {
      const ageMs = Date.now() - Date.parse(cached.fetched_at);
      if (ageMs < CONTRACT_CACHE_TTL_MS) {
        return {
          name: cached.name,
          fullPointValue: Number(cached.full_point_value),
        };
      }
    }
  }

  // Helper: returns API value if usable (>0), otherwise tries hardcoded table by base symbol.
  // Always logs which source produced the multiplier — observability for Lesson 13 verification.
  const finalize = (name: string, apiValue: number | null | undefined): { name: string; fullPointValue: number } => {
    if (apiValue && apiValue > 0) {
      return { name, fullPointValue: apiValue };
    }
    const baseSymbol = extractBaseSymbol(name);
    if (baseSymbol && KNOWN_FUTURES_MULTIPLIERS[baseSymbol]) {
      const fallback = KNOWN_FUTURES_MULTIPLIERS[baseSymbol];
      console.warn(
        `[tradovate-sync] multiplier_hardcoded_fallback: contractId=${contractId} name=${name} baseSymbol=${baseSymbol} → ${fallback} (API returned ${apiValue ?? 'null'})`
      );
      return { name, fullPointValue: fallback };
    }
    console.warn(
      `[tradovate-sync] multiplier_unknown: contractId=${contractId} name=${name} baseSymbol=${baseSymbol ?? 'null'} → defaulting to 1 (PnL will be wrong)`
    );
    return { name, fullPointValue: 1 };
  };

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // Step 1: contract/item → get name + contractMaturityId
  const contractRes = await fetchWithRetry(
    `${base}/contract/item?id=${contractId}`,
    { headers: authHeaders },
    attribution,
  );
  if (!contractRes.ok) return finalize('UNKNOWN', null);
  const contract = await contractRes.json();
  const contractName = contract.name ?? 'UNKNOWN';

  // Step 2: contractMaturity/item → get productId
  if (!contract.contractMaturityId) return finalize(contractName, null);
  const maturityRes = await fetchWithRetry(
    `${base}/contractMaturity/item?id=${contract.contractMaturityId}`,
    { headers: authHeaders },
    attribution,
  );
  if (!maturityRes.ok) return finalize(contractName, null);
  const maturity = await maturityRes.json();

  // Step 3: product/item → get fullPointValue
  if (!maturity.productId) return finalize(contractName, null);
  const productRes = await fetchWithRetry(
    `${base}/product/item?id=${maturity.productId}`,
    { headers: authHeaders },
    attribution,
  );
  if (!productRes.ok) return finalize(contractName, null);
  const product = await productRes.json();

  const result = finalize(contractName, product.fullPointValue);

  // ② B2 — write back to the cache (api source only, usable value).
  //    ON CONFLICT updates name + fullPointValue + fetched_at so the cache
  //    refreshes on every miss-with-success. Race-safe across parallel users.
  if (product.fullPointValue && product.fullPointValue > 0) {
    const { error: upsertErr } = await supabaseAdmin
      .from('tradovate_contracts')
      .upsert(
        {
          contract_id: contractId,
          name: result.name,
          full_point_value: result.fullPointValue,
          fetched_at: new Date().toISOString(),
          source: 'api',
        },
        { onConflict: 'contract_id' },
      );
    if (upsertErr) {
      // Cache write failure is non-fatal — we already have the value to return.
      console.warn(
        `[tradovate-sync] contracts_cache_upsert_failed: contractId=${contractId} err=${upsertErr.message ?? upsertErr}`
      );
    }
  }

  return result;
}

// ─── Map fills to trade rows ───────────────────────────────────
// Tradovate fills are individual executions.
// We insert each fill as a trade with outcome=OPEN (will be matched later).
// A simplified mapping: Buy=LONG, Sell=SHORT.
// ─── Process a fill: open new trade or close existing ─────────
// Uses tradovate_position_state as FIFO open-position tracker.
// Buy fill  → always opens a new LONG trade (entry)
// Sell fill → closes the oldest LONG, or opens a new SHORT (if no LONG open)
// Short flow: Sell=open SHORT entry, Buy=close SHORT
async function processFill(
  fill: TradovateFill,
  cred: {
    id: string;
    user_id: string;
    account_id: number;
    environment: 'live' | 'demo';
    // portfolio_id: set for legacy multi-account syncs so each Tradovate account's
    // fills are attributed to the matching portfolios row (journal account selector).
    // Null for OAuth single-account syncs (preserves existing behavior).
    portfolio_id?: string | null;
  },
  symbol: string,
  multiplier: number,
  base: string,
  accessToken: string,
  stopOrders: StopOrder[] = [],
  accountEquityAtEntry: number | null = null,
): Promise<'inserted' | 'updated' | 'skipped' | 'error'> {

  const fillSide  = fill.action === 'Buy' ? 'LONG' : 'SHORT';
  const closeSide = fillSide === 'LONG' ? 'SHORT' : 'LONG'; // opposite = what this closes
  const fillAt    = fill.timestamp ?? new Date(
    fill.tradeDate.year, fill.tradeDate.month - 1, fill.tradeDate.day
  ).toISOString();

  // ── Check if there's an open position on the OPPOSITE side (this fill closes it)
  const { data: openPos } = await supabaseAdmin
    .from('tradovate_position_state')
    .select('*')
    .eq('user_id', cred.user_id)
    .eq('tradovate_account_id', cred.account_id)
    .eq('symbol', symbol)
    .eq('side', closeSide)
    .gt('open_quantity', 0)
    .maybeSingle();

  if (openPos && openPos.open_trade_id) {
    // ── CLOSE — v46: proper partial-close via partial_exits JSONB ─────────
    // v45 (broken): every close fill set exit_price + close_at on the trade
    // row, even if it was a partial close. Subsequent partials overwrote it,
    // and the DB trigger computed pnl from the FULL stored quantity × the
    // LAST exit price — producing wrong PnL.
    //
    // v46 (this code): partial fills append to `partial_exits` JSONB and
    // only decrement `position_state.open_quantity`. The trade row stays
    // OPEN (no exit_price, no outcome) until the LAST closing fill brings
    // remainingQty to 0. At that point we set exit_price to the
    // QUANTITY-WEIGHTED AVERAGE of every leg in partial_exits, and the DB
    // trigger computes pnl = (avg_exit - avg_entry) × quantity × multiplier,
    // which is mathematically equal to summing each leg's PnL.
    //
    // Schema note: `trades.partial_exits` (jsonb) already exists and the
    // frontend renders it (see manual trade 6f1310da from 2025-12-16).
    const { data: currentTrade, error: tradeFetchErr } = await supabaseAdmin
      .from('trades')
      .select('quantity, partial_exits')
      .eq('id', openPos.open_trade_id)
      .single();

    if (tradeFetchErr || !currentTrade) {
      console.error('[tradovate-sync] close trade fetch error:', tradeFetchErr?.message ?? 'no trade');
      return 'error';
    }

    const closedQty = Math.min(fill.qty, openPos.open_quantity);
    const remainingQty = openPos.open_quantity - closedQty;

    const existingExits: Array<Record<string, unknown>> = Array.isArray(currentTrade.partial_exits)
      ? currentTrade.partial_exits as Array<Record<string, unknown>>
      : [];
    const totalQty = Number(currentTrade.quantity) || closedQty;
    const newExit = {
      id:         `tradovate::partial-close::${fill.id}`,
      price:      fill.price,
      quantity:   closedQty,
      percentage: totalQty > 0
        ? Math.round((closedQty / totalQty) * 10000) / 100
        : 0,
      timestamp:  fillAt,
      fill_id:    fill.id,
    };
    const updatedExits = [...existingExits, newExit];

    if (remainingQty > 0) {
      // PARTIAL — keep trade OPEN, record exit leg, decrement position state.
      const { error: partialErr } = await supabaseAdmin
        .from('trades')
        .update({ partial_exits: updatedExits })
        .eq('id', openPos.open_trade_id);
      if (partialErr) {
        console.error('[tradovate-sync] partial close trade update error:', partialErr.message);
        return 'error';
      }

      const { error: stateErr } = await supabaseAdmin
        .from('tradovate_position_state')
        .update({ open_quantity: remainingQty, last_updated_at: fillAt })
        .eq('id', openPos.id);
      if (stateErr) {
        console.error('[tradovate-sync] partial close state update error:', stateErr.message);
        return 'error';
      }

      console.log(JSON.stringify({
        event:                'partial_close',
        trade_id:             openPos.open_trade_id,
        fill_id:              fill.id,
        closed_qty:           closedQty,
        remaining_qty:        remainingQty,
        partial_exits_count:  updatedExits.length,
      }));

      return 'updated';
    }

    // FULL — last fill that brings remainingQty to 0. Compute weighted-avg
    // exit_price across every leg in partial_exits and finalize the trade.
    const totalExitQty = updatedExits.reduce(
      (sum, e) => sum + Number((e as { quantity?: number }).quantity ?? 0),
      0,
    );
    const weightedAvgExit = totalExitQty > 0
      ? updatedExits.reduce(
          (sum, e) =>
            sum +
            Number((e as { price?: number }).price ?? 0) *
              Number((e as { quantity?: number }).quantity ?? 0),
          0,
        ) / totalExitQty
      : fill.price;

    const { error: closeErr } = await supabaseAdmin
      .from('trades')
      .update({
        exit_price:    weightedAvgExit,
        close_at:      fillAt,
        fees:          null,
        partial_exits: updatedExits,
        // pnl + outcome computed by DB trigger handle_trade_changes_unified
        // from stored quantity × multiplier × (exit_price - entry_price).
      })
      .eq('id', openPos.open_trade_id);
    if (closeErr) {
      console.error('[tradovate-sync] full close trade update error:', closeErr.message);
      return 'error';
    }

    const { error: delErr } = await supabaseAdmin
      .from('tradovate_position_state')
      .delete()
      .eq('id', openPos.id);
    if (delErr) {
      console.error('[tradovate-sync] full close position_state delete error:', delErr.message);
      return 'error';
    }

    console.log(JSON.stringify({
      event:              'full_close',
      trade_id:           openPos.open_trade_id,
      final_fill_id:      fill.id,
      total_exit_legs:    updatedExits.length,
      weighted_avg_exit:  weightedAvgExit,
      total_qty_closed:   totalExitQty,
    }));

    return 'updated';
  }

  // ── OPEN: no opposite position to close → add to or create position ────────
  //
  // B-4 (2026-05-12): check whether a same-side position already exists.
  // If yes, this fill is an ADD-ON leg: accumulate qty + weighted-avg the
  // entry_price on the existing trade row (Elad chose "single trade row per
  // multi-leg position" — see plan α.3). If no, create a fresh trade row.
  //
  // The previous code blindly inserted a new trade row per fill AND blindly
  // upserted position_state with `open_quantity = fill.qty` (overwrite, not
  // accumulate), so multi-leg positions silently lost both their cumulative
  // qty and their weighted-avg entry price. avg_entry_price = price-of-last-leg
  // was the symptom; multiplier=1 on closes was the downstream consequence.
  //
  // Known limitation (tracked as new OQ post α.3): the CLOSE path still
  // treats any closing fill as a full close of the (now singular) trade row
  // even when fill.qty < open_quantity. After this change, partial closes
  // will set `outcome` on a row that still has residual qty in position_state.
  // The next close fill will overwrite that row's exit_price / pnl. Partial
  // closes are uncommon for Elad's current futures usage (qty=2–5, typically
  // closed in one fill). Defer the partial-close fix to a separate session.

  const { data: existingSamePos } = await supabaseAdmin
    .from('tradovate_position_state')
    .select('*')
    .eq('user_id', cred.user_id)
    .eq('tradovate_account_id', cred.account_id)
    .eq('symbol', symbol)
    .eq('side', fillSide)
    .gt('open_quantity', 0)
    .maybeSingle();

  if (existingSamePos && existingSamePos.open_trade_id) {
    // ── ADDON-LEG — v48: track every entry leg in partial_entries JSONB ────
    // v47 (broken for interleaved scaling): computed weighted-avg from
    // position_state.avg_entry_price + new fill price. When a partial close
    // happened between addons, the position_state.avg reflected the post-partial
    // state (not the full entry history), and trade.quantity counted "currently
    // open" not "total ever entered" — so the DB trigger's pnl formula
    // `qty × multiplier × price_diff` used the wrong qty.
    //
    // v48: APPEND to partial_entries JSONB, recompute entry_price + quantity
    // from the FULL history. trade.quantity = sum(partial_entries.qty) =
    // total ever entered. At full close, this matches sum(partial_exits.qty)
    // so the trigger pnl formula is mathematically correct.
    //
    // Interleaved example (BUY 1 + BUY 1 + SELL 1 + BUY 1 + SELL 2):
    //   partial_entries grows to [{p1,1},{p2,1},{p3,1}], trade.qty=3
    //   partial_exits grows to [{s1,1},{s2,2}], total exit qty=3
    //   pnl = (avg_exit - avg_entry) × 3 × multiplier  ✓
    const { data: currentTrade, error: tradeFetchErr } = await supabaseAdmin
      .from('trades')
      .select('partial_entries')
      .eq('id', existingSamePos.open_trade_id)
      .single();

    if (tradeFetchErr || !currentTrade) {
      console.error('[tradovate-sync] addon trade fetch error:', tradeFetchErr?.message ?? 'no trade');
      return 'error';
    }

    const existingEntries: Array<Record<string, unknown>> = Array.isArray(currentTrade.partial_entries)
      ? currentTrade.partial_entries as Array<Record<string, unknown>>
      : [];
    const newEntry = {
      id:        `tradovate::partial-entry::${fill.id}`,
      price:     fill.price,
      quantity:  fill.qty,
      timestamp: fillAt,
      fill_id:   fill.id,
    };
    const updatedEntries = [...existingEntries, newEntry];

    const totalEnteredQty = updatedEntries.reduce(
      (sum, e) => sum + Number((e as { quantity?: number }).quantity ?? 0),
      0,
    );
    const weightedAvgEntry = totalEnteredQty > 0
      ? updatedEntries.reduce(
          (sum, e) =>
            sum +
            Number((e as { price?: number }).price ?? 0) *
              Number((e as { quantity?: number }).quantity ?? 0),
          0,
        ) / totalEnteredQty
      : fill.price;

    const { error: updateTradeErr } = await supabaseAdmin
      .from('trades')
      .update({
        quantity:        totalEnteredQty,
        entry_price:     weightedAvgEntry,
        partial_entries: updatedEntries,
      })
      .eq('id', existingSamePos.open_trade_id);

    if (updateTradeErr) {
      console.error('[tradovate-sync] addon-leg trade update error:', updateTradeErr.message);
      return 'error';
    }

    // position_state.open_quantity tracks CURRENT OPEN (after intervening
    // partial closes), so increment by the new fill's qty — NOT replace with
    // totalEnteredQty (that would re-open closed legs).
    const newOpenQty = Number(existingSamePos.open_quantity) + fill.qty;
    const { error: updateStateErr } = await supabaseAdmin
      .from('tradovate_position_state')
      .update({
        open_quantity:   newOpenQty,
        avg_entry_price: weightedAvgEntry,
        last_updated_at: fillAt,
      })
      .eq('id', existingSamePos.id);

    if (updateStateErr) {
      console.error('[tradovate-sync] addon-leg state update error:', updateStateErr.message);
      return 'error';
    }

    console.log(JSON.stringify({
      event:               'addon_leg',
      trade_id:            existingSamePos.open_trade_id,
      fill_id:             fill.id,
      total_entry_legs:    updatedEntries.length,
      total_entered_qty:   totalEnteredQty,
      weighted_avg_entry:  weightedAvgEntry,
      open_quantity:       newOpenQty,
    }));

    return 'updated';
  }

  // ── PHANTOM OVERSHOOT GUARD ────────────────────────────────────────────────
  // Problem: copier retry or APEX bracket order causes two SELL fills for the
  // same account at nearly the same time. First fill closes the LONG; second
  // fill arrives milliseconds later, finds no open position, and would create
  // a phantom SHORT. Root cause: two separate orders (copier retry + bracket)
  // both executed for the same account. Incident: PAAPEX1958500000159 / fill
  // 520271351209 created a phantom SHORT after fill 520271351178 closed LONG.
  //
  // Guard: if an opposite-side trade was closed for this account within the
  // last 30 seconds, this fill is an overshoot — skip it.
  {
    const thirtySecondsAgo = new Date(new Date(fillAt).getTime() - 30_000).toISOString();
    let recentCloseQuery = supabaseAdmin
      .from('trades')
      .select('id, close_at')
      .eq('user_id', cred.user_id)
      .eq('symbol', symbol)
      .eq('side', closeSide)          // closeSide = opposite of fillSide (defined above)
      .not('close_at', 'is', null)
      .gte('close_at', thirtySecondsAgo)
      .limit(1);
    if (cred.portfolio_id) {
      recentCloseQuery = recentCloseQuery.eq('portfolio_id', cred.portfolio_id);
    }
    const { data: recentClose } = await recentCloseQuery.maybeSingle();
    if (recentClose) {
      console.log(JSON.stringify({
        event:           'phantom_overshoot_skipped',
        fill_id:         fill.id,
        symbol,
        fill_side:       fillSide,
        recent_close_id: recentClose.id,
        recent_close_at: recentClose.close_at,
        fill_at:         fillAt,
      }));
      return 'skipped';
    }
  }

  // First leg: create a fresh trade row + position state row.
  const matchedStop = matchStop(
    {
      symbol,
      side: fillSide,
      entryPrice: fill.price,
      openAt: fillAt,
      closeAt: null,
      entryOrderId: (fill as any).orderId ?? null,
    },
    stopOrders,
  );
  if (matchedStop) {
    console.log(JSON.stringify({
      event:       'stop_matched',
      external_id: `tradovate::fill::${fill.id}`,
      symbol,
      side:        fillSide,
      stop_price:  matchedStop.stopPrice,
    }));
  }

  const { data: newTrade, error: insertErr } = await supabaseAdmin
    .from('trades')
    .insert({
      user_id:              cred.user_id,
      // NOTE (post-F1.A): cred now comes from broker_connections (not tradovate_credentials).
      //       broker_connection_id / broker_account_id still intentionally omitted (NULL)
      //       in F1.A — wiring trades.broker_connection_id to broker_connections(id) is
      //       J2 / OQ-23 scope. See MASTER_PLAN.
      // NOTE: broker_trade_id column does not exist in trades schema —
      // external_id (`tradovate::fill::${fill.id}`) IS the broker trade ref.
      external_id:          `tradovate::fill::${fill.id}`,
      idempotency_key:      `tradovate::${cred.user_id}::${cred.environment}::${fill.id}`,
      // portfolio_id: wires this trade to the per-account journal portfolio row.
      // Set for legacy multi-account syncs (one portfolios row per Tradovate account);
      // null for OAuth single-account syncs (no change to existing behavior).
      portfolio_id:         cred.portfolio_id ?? null,
      symbol,
      side:                 fillSide,
      quantity:             fill.qty,
      entry_price:          fill.price,
      stop_price:           matchedStop?.stopPrice ?? null,
      exit_price:           null,
      pnl:                  null,
      open_at:              fillAt,
      close_at:             null,
      outcome:              'OPEN',
      import_source:        'tradovate',
      broker:               'tradovate',
      // v45: ALWAYS null. The DB trigger `handle_trade_changes_unified` calls
      // `get_asset_multiplier(symbol)` to fill the correct value at insert time.
      // v44's `multiplier ?? null` was insufficient because Tradovate's API can
      // return wrong-but-truthy values (e.g. 1 for MNQM6), and v43's hardcoded
      // fallback only fired on null/0. Architectural decision: DB is the SINGLE
      // source of truth for multipliers (table covers 30+ symbols), edge fn just
      // ships the trade row. See OQ-launch-readiness audit 2026-05-20.
      multiplier:           null,
      // See close-path comment above: Tradovate fills carry no fee data; null
      // is honest, 0 was a silent lie. DB default for `fees` is 0 but the column
      // is nullable, and downstream consumers tolerate null via COALESCE.
      fees:                 null,
      // v48: initialize partial_entries with this first leg so subsequent addons
      // can append + recompute weighted-avg from the full history.
      partial_entries:      [{
        id:        `tradovate::partial-entry::${fill.id}`,
        price:     fill.price,
        quantity:  fill.qty,
        timestamp: fillAt,
        fill_id:   fill.id,
      }],
      // Captured once per account per sync run via /cashBalance/getCashBalanceSnapshot.
      // Enables "% of equity" risk strategies to compute dynamic 1R at trade open time.
      // null when the snapshot fetch failed or account_id was unavailable — strategies
      // must treat null as "unknown equity" and fall back gracefully.
      account_equity_at_entry: accountEquityAtEntry ?? null,
    })
    .select('id')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') return 'skipped'; // duplicate fill
    console.error('[tradovate-sync] open trade error:', insertErr.message);
    return 'error';
  }

  // v44 fix: UPSERT instead of INSERT. v43 used .insert() which could fail
  // silently in production (2026-05-20 elad incident: 3 fills landed in trades
  // table but position_state stayed empty → multi-leg detection broke → SHORT 2
  // never matched the 2 LONG legs). Root cause was never pinned down (Postgres
  // logs windowed too short by the time we looked), but symptoms matched a
  // stale orphan row on the unique constraint (user_id, account_id, symbol, side)
  // that our SELECT at line 350 missed because it filtered `open_quantity > 0`.
  // UPSERT with onConflict self-heals that path. Structured logging surfaces
  // any future failure with code/details/hint instead of just .message.
  const { error: insertStateErr } = await supabaseAdmin
    .from('tradovate_position_state')
    .upsert({
      user_id:              cred.user_id,
      tradovate_account_id: cred.account_id,
      symbol,
      side:                 fillSide,
      open_quantity:        fill.qty,
      avg_entry_price:      fill.price,
      open_trade_id:        newTrade.id,
      last_updated_at:      fillAt,
    }, { onConflict: 'user_id,tradovate_account_id,symbol,side' });

  if (insertStateErr) {
    console.error(JSON.stringify({
      event:        'position_state_upsert_failed',
      user_id:      cred.user_id,
      account_id:   cred.account_id,
      symbol,
      side:         fillSide,
      fill_id:      fill.id,
      trade_id:     newTrade.id,
      error_code:   insertStateErr.code ?? null,
      error_msg:    insertStateErr.message ?? null,
      error_detail: (insertStateErr as { details?: string }).details ?? null,
      error_hint:   (insertStateErr as { hint?: string }).hint ?? null,
    }));
    return 'error';
  }

  return 'inserted';
}

// ─── Sync one credential ───────────────────────────────────────
// `cred` now comes from broker_connections. account_id is TEXT in the new
// schema (was BIGINT in tradovate_credentials) — parse once and use number
// for downstream Tradovate API calls + tradovate_position_state/sync_state
// queries which still expect numeric account_id.
async function syncCredential(cred: {
  id: string;
  user_id: string;
  environment: 'live' | 'demo';
  connection_data: { vault_secret_id?: string; env_verified?: boolean } | null;
  account_id: string;
  auth_method?: string | null;
}, syncMode = 'cron', backfillStops = false): Promise<{ inserted: number; errors: number; reconcile?: { userId: string; environment: 'live' | 'demo'; connectionId: string; discoverySucceeded: boolean; liveAccountIds: number[] } }> {
  let resolvedEnvironment: 'live' | 'demo' = cred.environment;
  let base = TRADOVATE_URLS[resolvedEnvironment];
  const syncStartedAt = new Date();
  let inserted = 0;
  let errors = 0;

  // Coerce account_id TEXT → number for Tradovate API + numeric DB queries
  const accountIdNum = parseInt(cred.account_id, 10);
  if (!Number.isFinite(accountIdNum)) {
    throw new Error(`Invalid account_id (not numeric): ${cred.account_id}`);
  }

  // 1. Get access token — vault_secret_id lives in connection_data jsonb
  const vaultSecretId = cred.connection_data?.vault_secret_id;
  if (!vaultSecretId) throw new Error(`No vault_secret_id in connection_data for ${cred.id}`);
  const accessToken = await getAccessToken(vaultSecretId);

  // 1b. OAuth env self-heal: verify which Tradovate environment the account
  // actually lives on, and correct the stored environment if needed.
  // Runs only once per connection (env_verified flag prevents repeat calls).
  //
  // Why: prop-firm OAuth tokens (Apex/Topstep/MFFU, scope=trading_read) return
  // [] from /account/list WITHOUT ?userId=<sub>. The JWT sub claim carries the
  // provider userId that unlocks sponsored accounts. We union both query forms
  // (with userId and without) to handle all OAuth flavors defensively.
  //
  // Non-fatal: if /account/list returns [] on both envs (transient OAuth scope
  // quirk or token not fully provisioned yet), we warn and keep the stored env
  // so the fill fetch can still proceed. env_verified is NOT set, allowing
  // a future tick to retry once permissions settle.
  if (cred.auth_method === 'oauth' && !cred.connection_data?.env_verified) {
    const providerUserId = extractUserIdFromJwt(accessToken);

    const tryEnv = async (env: 'live' | 'demo'): Promise<boolean> => {
      const baseUrl = TRADOVATE_URLS[env];
      const candidateUrls: string[] = [];
      if (providerUserId !== null) {
        candidateUrls.push(`${baseUrl}/account/list?userId=${encodeURIComponent(providerUserId)}`);
      }
      candidateUrls.push(`${baseUrl}/account/list`);

      for (const url of candidateUrls) {
        try {
          const res = await fetchWithTimeout(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) continue;
          const body = await res.json();
          if (!Array.isArray(body)) continue;
          const accounts = body as Array<{ id: number }>;
          if (accounts.some(a => a.id === accountIdNum)) return true;
        } catch {
          // per-URL errors are non-fatal; try next candidate
        }
      }
      return false;
    };

    const storedEnv   = cred.environment;
    const otherEnv    = storedEnv === 'live' ? 'demo' : 'live';
    const foundOnStored = await tryEnv(storedEnv);

    if (foundOnStored) {
      // Account confirmed on stored env — mark verified, no environment change.
      resolvedEnvironment = storedEnv;
      base = TRADOVATE_URLS[resolvedEnvironment];
      await supabaseAdmin
        .from('broker_connections')
        .update({ connection_data: { ...cred.connection_data, env_verified: true } })
        .eq('id', cred.id);
    } else {
      const foundOnOther = await tryEnv(otherEnv);
      if (foundOnOther) {
        // Account lives on the other env — switch, persist, mark verified.
        resolvedEnvironment = otherEnv;
        base = TRADOVATE_URLS[resolvedEnvironment];
        await supabaseAdmin
          .from('broker_connections')
          .update({
            environment: otherEnv,
            connection_data: { ...cred.connection_data, env_verified: true },
          })
          .eq('id', cred.id);
        console.log(`[tradovate-sync] env self-heal: account ${accountIdNum} switched ${storedEnv} → ${otherEnv} for connection ${cred.id}`);
      } else {
        // /account/list returned [] on both envs — OAuth scope quirk or token
        // not yet provisioned. Keep stored env, do NOT set env_verified so the
        // next tick retries. Fill fetch proceeds with stored env (may return 0
        // fills, which is benign).
        console.warn(
          `[tradovate-sync] env self-heal: account ${accountIdNum} not found via /account/list on either env` +
          ` (OAuth scope quirk) — falling back to stored env ${storedEnv} for connection ${cred.id}`
        );
        resolvedEnvironment = storedEnv;
        base = TRADOVATE_URLS[resolvedEnvironment];
      }
    }
  }

  // 2. Get sync cursor for the primary account (seeds the per-account cursor map
  // built in Step L4 below; also used for the no-fills L8 heartbeat fallback).
  const { data: syncState } = await supabaseAdmin
    .from('tradovate_sync_state')
    .select('last_fill_id, fills_processed')
    .eq('user_id', cred.user_id)
    .eq('environment', cred.environment)
    .eq('account_id', accountIdNum)
    .single();

  // Phase 1B.1: every Tradovate API call from this credential's sync run
  // carries user_id + connection_id in 429 / non-2xx observability rows.
  const attribution = { userId: cred.user_id, connectionId: cred.id };

  // ─── Multi-account path (all connections: OAuth + legacy) ─────────────────
  // A single Tradovate token can control many accounts (e.g. 28 APEX prop-firm
  // accounts under one OAuth login, or many accounts under one legacy credential).
  // The token's /fill/list returns fills for ALL of them interleaved, with no
  // accountId field on the fill itself. We attribute each fill to an account via
  // the orderId → accountId map from /order/list, then process each account's
  // fill subset independently through processAccountFills (correct per-account
  // position engine + cursor). N=1 is handled correctly by the same path.

  // Step L1: discover all accounts controlled by this token.
  // OAuth tokens (scope=trading_read) return [] from plain /account/list but
  // return sponsored accounts when ?userId=<jwtSub> is supplied. Mirror the env
  // self-heal pattern: try the userId-qualified URL first for OAuth, then plain
  // as fallback; take the first candidate returning a non-empty array.
  let discoveredAccountIds: number[] = [accountIdNum];
  let discoveredAccounts: Array<{ id: number; active?: boolean; archived?: boolean }> = [{ id: accountIdNum }];
  let discoverySucceeded = false;
  try {
    const providerUserId = cred.auth_method === 'oauth'
      ? extractUserIdFromJwt(accessToken)
      : null;

    const candidateUrls: string[] = [];
    if (providerUserId !== null) {
      // OAuth: userId-qualified URL first — unlocks prop-firm sponsored accounts.
      candidateUrls.push(`${base}/account/list?userId=${encodeURIComponent(providerUserId)}`);
    }
    candidateUrls.push(`${base}/account/list`);

    let accountsFound = false;
    for (const url of candidateUrls) {
      try {
        // Tradovate-aware retry wrapper (429 p-time/p-ticket + 5xx backoff),
        // same as every other Tradovate call in this file. A bare fetch() here
        // meant a transient rate-limit during multi-connection sync returned a
        // non-ok response → both candidates skipped → discovery silently fell
        // back to primary-account-only, so newly-added accounts (e.g. new APEX
        // accounts under an existing connection) were never self-healed into
        // portfolios. Retrying fixes that.
        const accountRes = await fetchWithRetry(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }, attribution);
        if (!accountRes.ok) {
          console.warn(
            `[tradovate-sync] account discovery: ${url} returned HTTP ${accountRes.status} — ` +
            `trying next candidate for connection ${cred.id}`
          );
          continue;
        }
        const accountBody = await accountRes.json();
        if (!Array.isArray(accountBody) || accountBody.length === 0) {
          console.warn(
            `[tradovate-sync] account discovery: ${url} returned empty or non-array — ` +
            `trying next candidate for connection ${cred.id}`
          );
          continue;
        }
        const parsedAccounts = (accountBody as Array<{ id: number; active?: boolean; archived?: boolean }>)
          .filter(a => typeof a.id === 'number' && Number.isFinite(a.id));
        const parsed = parsedAccounts.map(a => a.id);
        if (parsed.length === 0) {
          // Array present but no valid ids — try next candidate.
          continue;
        }
        discoveredAccounts = parsedAccounts;
        discoveredAccountIds = parsed;
        accountsFound = true;
        discoverySucceeded = true;
        console.log(JSON.stringify({
          event: 'accounts_discovered',
          connection_id: cred.id,
          auth_method: cred.auth_method ?? 'unknown',
          discovery_url: url,
          count: discoveredAccountIds.length,
          primary_account_id: accountIdNum,
        }));
        break; // first non-empty candidate wins
      } catch (urlErr) {
        console.warn(
          `[tradovate-sync] account discovery: fetch error for ${url}:`, urlErr
        );
      }
    }
    if (!accountsFound) {
      console.warn(
        `[tradovate-sync] account discovery: all candidates returned empty — ` +
        `falling back to primary account ${accountIdNum} for connection ${cred.id}`
      );
    }
  } catch (err) {
    console.warn(
      `[tradovate-sync] account discovery: unexpected error — ` +
      `falling back to primary account ${accountIdNum}:`, err
    );
  }

  // Compute the set of live (non-archived, non-inactive) account IDs for
  // portfolio reconciliation. Only populated when discovery actually succeeded;
  // an empty array means "unknown" and must never trigger reconciliation.
  // Accounts where `archived` is explicitly true or `active` is explicitly
  // false are excluded; undefined flags are treated as live (conservative).
  const liveAccountIds: number[] = discoverySucceeded
    ? discoveredAccounts
        .filter(a => a.archived !== true && a.active !== false)
        .map(a => a.id)
    : [];

  // Discovery observability: record accounts the broker returned but reports
  // NOT live (archived or inactive). Their exclusion from liveAccountIds hides
  // them from the journal account lists, and without a trace the decision is
  // undiagnosable from support ("my account is missing" — which side dropped
  // it?). Logged as a structured event AND persisted via record_sync_completion
  // p_log_details (broker_sync_logs.sync_details) on the no-fills path below.
  const excludedAccounts = discoverySucceeded
    ? discoveredAccounts
        .filter(a => a.archived === true || a.active === false)
        .map(a => ({
          id: a.id,
          active: a.active ?? null,
          archived: a.archived ?? null,
        }))
    : [];
  if (excludedAccounts.length > 0) {
    console.log(JSON.stringify({
      event: 'accounts_excluded_not_live',
      connection_id: cred.id,
      count: excludedAccounts.length,
      excluded: excludedAccounts,
    }));
  }

  // Orphan attribution (root fix, 2026-07-07): every account THIS connection's
  // discovery returns as live belongs to THIS connection. Claim any live
  // account whose portfolio is currently unowned (credential_id IS NULL) and
  // link it to this connection. Closes the gap where a pre-existing portfolio
  // (an account that predates the current connection, or that the broker
  // re-lists under the same token after a renumber/reallocation) stays NULL
  // forever — the re-attribution step's env/uniqueness gating silently skips
  // it, so it lingers is_active with no owner and surfaces as a duplicate
  // "orphan" account group in the journal/copier UI. Scoped to
  // `credential_id IS NULL` ONLY: it never steals an account already owned by
  // another connection, so there is no cross-connection flip-flop. No
  // environment filter — tradovate_account_id is globally unique and we only
  // touch this token's own discovered live set.
  if (discoverySucceeded && liveAccountIds.length > 0) {
    const { data: claimedRows, error: claimErr } = await supabaseAdmin
      .from('portfolios')
      .update({ credential_id: cred.id, updated_at: new Date().toISOString() })
      .eq('user_id', cred.user_id)
      .eq('source', 'tradovate')
      .is('credential_id', null)
      .in('tradovate_account_id', liveAccountIds)
      .select('id');
    if (claimErr) {
      console.error('[tradovate-sync] orphan_claim_failed:', cred.id, String(claimErr.message ?? claimErr).slice(0, 300));
    } else if ((claimedRows ?? []).length > 0) {
      console.log(JSON.stringify({ event: 'orphan_portfolios_claimed', connection_id: cred.id, claimed: (claimedRows ?? []).length }));
    }
  }

  // Step L2: build orderId → accountId attribution map from /order/list.
  // A single call mirrors the single-call assumption of fetchFills — no
  // pagination. Tradovate returns all orders in the account's history.
  // Warn if response is suspiciously large (possible undocumented page cap).
  const orderMap = new Map<number, number>(); // orderId → accountId
  // Raw order objects preserved for stop-order index construction below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawOrderBody: any[] = [];
  try {
    const orderRes = await fetchWithTimeout(`${base}/order/list`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (orderRes.ok) {
      const orderBody = await orderRes.json();
      if (Array.isArray(orderBody)) {
        rawOrderBody = orderBody;
        if (orderBody.length >= 1000) {
          console.warn(
            `[tradovate-sync] legacy: /order/list returned ${orderBody.length} rows — ` +
            `may be hitting an undocumented page cap; some fills may be attributed to wrong account. ` +
            `connection=${cred.id}`
          );
        }
        for (const order of orderBody as Array<{ id: number; accountId: number }>) {
          if (typeof order.id === 'number' && typeof order.accountId === 'number') {
            orderMap.set(order.id, order.accountId);
          }
        }
        console.log(JSON.stringify({
          event: 'legacy_order_map_built',
          connection_id: cred.id,
          order_count: orderBody.length,
          map_size: orderMap.size,
        }));
      }
    } else {
      console.warn(
        `[tradovate-sync] legacy: /order/list returned HTTP ${orderRes.status} — ` +
        `all fills will be attributed to primary account ${accountIdNum} for connection ${cred.id}`
      );
    }
  } catch (err) {
    console.warn(
      `[tradovate-sync] legacy: /order/list fetch error — ` +
      `all fills will be attributed to primary account ${accountIdNum}:`, err
    );
  }

  // Step L2b: build stopOrders index for stop-price derivation.
  //
  // Tradovate often stores stopPrice/orderType on the orderVersion record rather
  // than the order record itself. Fetch /orderVersion/list defensively; on any
  // failure, continue with an empty map (stop derivation degrades gracefully —
  // forward fills still land, just without stop_price).
  const ovByOrderId = new Map<number, { orderType?: string; stopPrice?: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawOvBody: any[] = [];
  try {
    const ovRes = await fetchWithTimeout(`${base}/orderVersion/list`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (ovRes.ok) {
      const ovBody = await ovRes.json();
      if (Array.isArray(ovBody)) {
        rawOvBody = ovBody;
        // Keep, per orderId, the EARLIEST version (smallest id) that has a stopPrice set.
        for (const ov of ovBody as Array<{ id?: number; orderId?: number; orderType?: string; stopPrice?: number }>) {
          const ovId     = ov?.id;
          const orderId  = ov?.orderId;
          const sp       = ov?.stopPrice;
          if (typeof orderId !== 'number' || sp == null) continue;
          const existing = ovByOrderId.get(orderId);
          if (existing === undefined || (typeof ovId === 'number' && typeof existing === 'object' && (existing as any)._minId > ovId)) {
            ovByOrderId.set(orderId, { orderType: ov?.orderType, stopPrice: Number(sp), _minId: ovId } as any);
          }
        }
      }
    } else {
      console.warn(
        `[tradovate-sync] stop_index: /orderVersion/list returned HTTP ${ovRes.status} — ` +
        `stop derivation degraded for connection ${cred.id}`
      );
    }
  } catch (ovErr) {
    console.warn(
      `[tradovate-sync] stop_index: /orderVersion/list fetch error — stop derivation degraded:`, ovErr
    );
  }

  // Build the StopOrder[] from raw order objects + orderVersion overlay.
  // Contract-symbol resolution reuses getContractInfo (B2 DB cache) with a
  // local in-memory cache to avoid redundant calls within this sync run.
  const stopContractCache = new Map<number, string>(); // contractId → symbol
  const stopOrders: StopOrder[] = [];

  for (const o of rawOrderBody) {
    const id: number | undefined = o?.id;
    if (typeof id !== 'number') continue;

    const orderType: string | undefined  = o?.orderType  ?? ovByOrderId.get(id)?.orderType;
    const stopPrice: number | undefined  = o?.stopPrice  ?? ovByOrderId.get(id)?.stopPrice;

    if (orderType !== 'Stop' && orderType !== 'StopLimit') continue;
    if (stopPrice == null) continue;

    const contractId: number | undefined = o?.contractId;
    if (typeof contractId !== 'number') continue;

    // Resolve symbol via cache-first path.
    let symbol: string;
    if (stopContractCache.has(contractId)) {
      symbol = stopContractCache.get(contractId)!;
    } else {
      try {
        const info = await getContractInfo(base, accessToken, contractId, attribution);
        symbol = info.name;
        stopContractCache.set(contractId, symbol);
      } catch {
        continue; // can't resolve symbol — skip this order
      }
    }

    const action: 'Buy' | 'Sell' | undefined = o?.action;
    if (action !== 'Buy' && action !== 'Sell') continue;

    const timestamp: string | undefined = o?.timestamp;
    if (typeof timestamp !== 'string') continue;

    stopOrders.push({
      orderId:   id,
      symbol,
      action,
      orderType,
      stopPrice: Number(stopPrice),
      timestamp,
      parentId:  o?.parentId ?? null,
    });
  }

  // Diagnostic log — confirms live payload shape via get_logs.
  lastStopDiag = {
    order_count:  rawOrderBody.length,
    order_keys:   rawOrderBody[0] ? Object.keys(rawOrderBody[0]) : [],
    ov_count:     rawOvBody.length,
    ov_keys:      rawOvBody[0] ? Object.keys(rawOvBody[0]) : [],
    stop_orders:  stopOrders.length,
    sample_stop:  stopOrders[0] ?? null,
  };
  console.log(JSON.stringify({ event: 'stop_index_built', ...lastStopDiag }));

  // Prop Risk (additive): tradovate_account_id → Tradovate account `name`.
  // Used only to attribute cash-balance snapshots to prop_touch_equity /
  // portfolios.account_name; never affects fill sync logic.
  const nameByAccountId = new Map<number, string>();
  for (const acc of discoveredAccounts as Array<{ id: number; name?: string }>) {
    if (acc.name) nameByAccountId.set(acc.id, acc.name);
  }

  // Step L3: build portfolio map: tradovate_account_id → portfolios.id.
  // tradovate-auth already creates one portfolios row per account on connect.
  // Self-healing: if a discovered account has no portfolio row (e.g. eval→live
  // transition where a new funded account appeared after initial connect), create
  // it now so fills can be attributed correctly without requiring a full re-auth.
  const portfolioMap = new Map<number, string>(); // tradovate_account_id → portfolios.id
  const inactivePortfolioByAccountId = new Map<number, string>(); // tradovate_account_id → portfolios.id (is_active === false)
  if (discoveredAccountIds.length > 0) {
    const { data: portfolioRows, error: portfolioErr } = await supabaseAdmin
      .from('portfolios')
      .select('id, tradovate_account_id, is_active')
      .eq('user_id', cred.user_id)
      .eq('environment', resolvedEnvironment)
      .in('tradovate_account_id', discoveredAccountIds);
    if (portfolioErr) {
      console.warn(
        `[tradovate-sync] legacy: portfolios lookup error (portfolio_id will be null):`,
        portfolioErr.message
      );
    } else {
      for (const row of (portfolioRows ?? []) as Array<{ id: string; tradovate_account_id: number; is_active?: boolean }>) {
        if (row.tradovate_account_id !== null) {
          portfolioMap.set(Number(row.tradovate_account_id), row.id);
          if (row.is_active === false) {
            inactivePortfolioByAccountId.set(Number(row.tradovate_account_id), row.id);
          }
        }
      }
    }

    // Auto-create portfolio rows for any discovered account that has no row yet.
    // Uses discoveredAccounts (has name + id) vs discoveredAccountIds (ids only).
    // Live accounts only: never (re)create a portfolio row for an account the
    // broker reports archived/inactive — dead prop-firm accounts must not be
    // resurrected into the journal/copier account lists.
    const missingAccounts = discoveredAccounts.filter(
      a => !portfolioMap.has(a.id) && a.archived !== true && a.active !== false
    );
    if (missingAccounts.length > 0) {
      console.log(JSON.stringify({
        event: 'new_accounts_discovered_self_heal',
        connection_id: cred.id,
        missing_count: missingAccounts.length,
        account_ids: missingAccounts.map(a => a.id),
      }));
      for (const acc of missingAccounts) {
        try {
          const accWithName = acc as { id: number; name?: string; active?: boolean; archived?: boolean };
          const accName = accWithName.name ?? String(acc.id);
          const { data: newPortfolio } = await supabaseAdmin.rpc('upsert_portfolio_from_tradovate', {
            p_user_id:              cred.user_id,
            p_tradovate_account_id: acc.id,
            p_account_spec:         `${accName}${acc.id}`,
            p_account_name:         accName,
            p_environment:          resolvedEnvironment,
            p_credential_id:        cred.id,
            p_connection_label:     null,
          });
          // Re-query for the newly created row's id
          const { data: createdRow } = await supabaseAdmin
            .from('portfolios')
            .select('id')
            .eq('user_id', cred.user_id)
            .eq('tradovate_account_id', acc.id)
            .eq('environment', resolvedEnvironment)
            .maybeSingle();
          if (createdRow?.id) {
            portfolioMap.set(acc.id, createdRow.id);
            console.log(JSON.stringify({
              event: 'portfolio_self_healed',
              connection_id: cred.id,
              account_id: acc.id,
              portfolio_id: createdRow.id,
            }));
          }
        } catch (healErr) {
          console.warn(
            `[tradovate-sync] self-heal: failed to create portfolio for account ${acc.id}:`,
            healErr
          );
        }
      }
    }

    // Reactivation self-heal: a portfolio row may have been wrongly deactivated
    // while this connection's token was expired (reconcile treated "can't see"
    // as "doesn't exist"). Now that discovery succeeded and the broker reports
    // the account live again, reactivate it so it reappears in the journal/
    // copier account lists. Only reactivate accounts the broker currently
    // reports live (not archived, not inactive) — never resurrect dead accounts.
    // Gated on discoverySucceeded: the fallback-to-primary-account path sets
    // discoveredAccounts=[{id: accountIdNum}] with no active/archived flags,
    // which would otherwise pass the "live" filter unconditionally.
    if (discoverySucceeded && inactivePortfolioByAccountId.size > 0) {
      const accountsToReactivate = discoveredAccounts.filter(
        a => a.archived !== true && a.active !== false && inactivePortfolioByAccountId.has(a.id)
      );
      if (accountsToReactivate.length > 0) {
        const portfolioIdsToReactivate = accountsToReactivate.map(
          a => inactivePortfolioByAccountId.get(a.id)!
        );
        try {
          await supabaseAdmin
            .from('portfolios')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .in('id', portfolioIdsToReactivate);
          console.log(JSON.stringify({
            event: 'portfolios_reactivated',
            connection_id: cred.id,
            count: portfolioIdsToReactivate.length,
            account_ids: accountsToReactivate.map(a => a.id),
          }));
        } catch (reactivateErr) {
          console.warn(
            `[tradovate-sync] reactivation self-heal: failed to reactivate portfolios for connection ${cred.id}:`,
            reactivateErr
          );
        }
      }
    }
  }

  // Step L4: read per-account cursors from tradovate_sync_state.
  // Build a map: accountId → { last_fill_id, fills_processed }.
  const cursorMap = new Map<number, { last_fill_id: number; fills_processed: number }>();
  // Seed with existing primary-account cursor so we don't re-fetch known fills.
  cursorMap.set(accountIdNum, {
    last_fill_id:    syncState?.last_fill_id ?? 0,
    fills_processed: syncState?.fills_processed ?? 0,
  });
  if (discoveredAccountIds.length > 1) {
    const { data: allCursorRows } = await supabaseAdmin
      .from('tradovate_sync_state')
      .select('account_id, last_fill_id, fills_processed')
      .eq('user_id', cred.user_id)
      .eq('environment', resolvedEnvironment)
      .in('account_id', discoveredAccountIds);
    for (const row of (allCursorRows ?? []) as Array<{ account_id: number; last_fill_id: number; fills_processed: number }>) {
      cursorMap.set(Number(row.account_id), {
        last_fill_id:    row.last_fill_id ?? 0,
        fills_processed: row.fills_processed ?? 0,
      });
    }
  }

  // Step L5: fetch ALL fills once, using the minimum cursor across all accounts
  // so no account's new fills are missed.
  let minCursor = 0;
  for (const id of discoveredAccountIds) {
    const cur = cursorMap.get(id)?.last_fill_id ?? 0;
    if (minCursor === 0 || cur < minCursor) minCursor = cur;
  }
  const allFills = await fetchFills(base, accessToken, accountIdNum, minCursor, attribution);
  // Sort ascending by fill.id (monotonic with execution time) for correct
  // position engine sequencing within each account's subset.
  allFills.sort((a, b) => a.id - b.id);

  // Step L6: attribute each fill to its account via the order map.
  // Falls back to primary accountIdNum when orderId not in the map.
  const fillsByAccount = new Map<number, TradovateFill[]>();
  for (const id of discoveredAccountIds) fillsByAccount.set(id, []);
  let unmappedCount = 0;
  for (const fill of allFills) {
    const targetAccountId = orderMap.get(fill.orderId) ?? null;
    if (targetAccountId !== null && fillsByAccount.has(targetAccountId)) {
      fillsByAccount.get(targetAccountId)!.push(fill);
    } else {
      // orderId not in map or belongs to an account not in discoveredAccountIds —
      // attribute to primary account so fills are never silently dropped.
      fillsByAccount.get(accountIdNum)!.push(fill);
      unmappedCount++;
    }
  }
  if (unmappedCount > 0) {
    console.warn(JSON.stringify({
      event: 'legacy_unmapped_fills',
      connection_id: cred.id,
      unmapped_count: unmappedCount,
      attributed_to: accountIdNum,
      note: 'orderId not found in /order/list map; attributed to primary account',
    }));
  }

  // Step L7: process each account's fill subset independently.
  let legacyInserted = 0;
  let legacyErrors   = 0;
  let anyAccountHadFills = false;

  for (const acctId of discoveredAccountIds) {
    const cursor = cursorMap.get(acctId) ?? { last_fill_id: 0, fills_processed: 0 };
    // Filter to only fills newer than this account's own cursor (some fills were
    // fetched with minCursor which may be lower than this account's cursor).
    const accountFills = (fillsByAccount.get(acctId) ?? [])
      .filter(f => f.id > cursor.last_fill_id);

    // Pull the prop firm's ENFORCED drawdown from Tradovate's auto-liq engine
    // (userAccountAutoLiq) for every discovered account, before the fills gate.
    // Throttled 24h + capped per invocation. Isolated; never affects the fills path.
    try {
      const brAccountName = nameByAccountId.get(acctId) ?? String(acctId);
      const { data: existingRisk } = await supabaseAdmin
        .from('prop_account_broker_risk')
        .select('fetched_at')
        .eq('user_id', cred.user_id)
        .eq('account_name', brAccountName)
        .maybeSingle();
      const lastFetch = existingRisk?.fetched_at ? new Date(existingRisk.fetched_at).getTime() : 0;
      const stale = Date.now() - lastFetch > 24 * 60 * 60 * 1000;
      if (stale && brokerRiskBudget > 0) {
        brokerRiskBudget--;
        const hdr = { headers: { Authorization: `Bearer ${accessToken}` } };
        const jget = async (u: string) => {
          const r = await fetchWithTimeout(`${base}${u}`, hdr);
          return r.ok ? await r.json() : { _status: r.status };
        };
        const acct = await jget(`/account/item?id=${acctId}`);
        const autoLiqDeps = await jget(`/userAccountAutoLiq/deps?masterid=${acctId}`);
        const raw = { account: acct, autoLiqDeps };
        // userAccountAutoLiq/deps returns an array of the account's auto-liq configs.
        const cfg = Array.isArray(autoLiqDeps) ? autoLiqDeps[0] : null;
        const toNum = (v: unknown): number | null => {
          const n = typeof v === 'string' ? parseFloat(v) : (v as number);
          return typeof n === 'number' && isFinite(n) ? n : null;
        };
        const trailing = cfg ? toNum((cfg as any).trailingMaxDrawdown) : null;
        const floor = cfg ? toNum((cfg as any).trailingMaxDrawdownLimit) : null;
        const daily = cfg ? toNum((cfg as any).dailyLossAutoLiq) : null;
        const mode =
          cfg && typeof (cfg as any).trailingMaxDrawdownMode === 'string'
            ? (cfg as any).trailingMaxDrawdownMode
            : null;
        const alpId = (acct as any)?.autoLiqProfileId ?? null;
        const parsedOk = trailing != null || floor != null || daily != null;
        const { error: riskErr } = await supabaseAdmin.rpc('prop_store_broker_risk_v2', {
          p_user_id: cred.user_id,
          p_account_name: brAccountName,
          p_auto_liq_profile_id: alpId,
          p_trailing_amount: trailing,
          p_daily_loss_limit: daily,
          p_drawdown_floor: floor,
          p_drawdown_mode: mode,
          p_parsed_ok: parsedOk,
          p_raw: raw,
        });
        if (riskErr) console.warn('[broker-risk] store error', brAccountName, riskErr.message);
      }
    } catch (riskProbeErr) {
      console.warn('[broker-risk] fetch error', String(riskProbeErr));
    }

    if (accountFills.length === 0) continue;
    anyAccountHadFills = true;

    const portfolioId = portfolioMap.get(acctId) ?? null;
    const accountName = nameByAccountId.get(acctId) ?? String(acctId);
    const result = await processAccountFills({
      connectionId:          cred.id,
      userId:                cred.user_id,
      accountIdNum:          acctId,
      accountName,
      environment:           resolvedEnvironment,
      portfolioId,
      base,
      accessToken,
      fills:                 accountFills, // pre-sorted, pre-filtered
      syncMode,
      syncStartedAt,
      attribution,
      prevFillsProcessed:    cursor.fills_processed,
      stopOrders,
      discoveredCount:       discoveredAccountIds.length,
      discoveryOk:           discoverySucceeded,
    });
    legacyInserted += result.inserted;
    legacyErrors   += result.errors;
  }

  // Step L7b: backfill stop_price for existing trades with stop_price IS NULL.
  // Only runs when the caller passes backfillStops=true (never on normal cron ticks).
  if (backfillStops) {
    const { data: openTrades, error: backfillQueryErr } = await supabaseAdmin
      .from('trades')
      .select('id, symbol, side, entry_price, open_at, close_at, external_id')
      .eq('user_id', cred.user_id)
      .eq('broker', 'tradovate')
      .is('stop_price', null)
      .is('deleted_at', null);

    if (backfillQueryErr) {
      console.warn('[tradovate-sync] stop_backfill query error:', backfillQueryErr.message);
    } else {
      const scanned = (openTrades ?? []).length;
      let filled = 0;
      for (const trade of (openTrades ?? []) as Array<{
        id: string;
        symbol: string;
        side: string;
        entry_price: number;
        open_at: string;
        close_at: string | null;
        external_id: string | null;
      }>) {
        const tradeSide = (trade.side === 'LONG' || trade.side === 'SHORT') ? trade.side : null;
        if (!tradeSide) continue;
        const matched = matchStop(
          {
            symbol:       trade.symbol,
            side:         tradeSide as 'LONG' | 'SHORT',
            entryPrice:   Number(trade.entry_price),
            openAt:       trade.open_at,
            closeAt:      trade.close_at ?? null,
            entryOrderId: null,
          },
          stopOrders,
        );
        if (!matched) continue;
        // Guard: only write if stop_price IS still null (prevent overwriting user-set R).
        const { error: updateErr } = await supabaseAdmin
          .from('trades')
          .update({ stop_price: matched.stopPrice })
          .eq('id', trade.id)
          .is('stop_price', null);
        if (!updateErr) filled++;
      }
      console.log(JSON.stringify({
        event:    'stop_backfill_done',
        user_id:  cred.user_id,
        scanned,
        filled,
      }));
    }
  }

  // Step L8: if NO account had new fills, call no-fills record_sync_completion
  // once for the primary account to update last_sync_at / heartbeat.
  if (!anyAccountHadFills) {
    const { error: rpcErr } = await supabaseAdmin.rpc('record_sync_completion', {
      p_connection_id:        cred.id,
      p_user_id:              cred.user_id,
      p_account_id:           accountIdNum,
      p_environment:          resolvedEnvironment,
      p_max_fill_id:          null,
      p_prev_fills_processed: cursorMap.get(accountIdNum)?.fills_processed ?? 0,
      p_inserted:             0,
      p_errors:               0,
      p_fills_fetched:        0,
      p_sync_mode:            syncMode,
      p_sync_started_at:      syncStartedAt.toISOString(),
      p_log_details:          {
        reason: 'no_new_fills',
        path: 'legacy_multi_account',
        discovered_count: discoveredAccountIds.length,
        discovery_ok: discoverySucceeded,
        ...(excludedAccounts.length > 0 ? { excluded_not_live: excludedAccounts } : {}),
      },
    });
    if (rpcErr) {
      console.error('[tradovate-sync] record_sync_completion failed (legacy no-fills):', rpcErr);
    }
    return {
      inserted: 0,
      errors: 0,
      reconcile: { userId: cred.user_id, environment: resolvedEnvironment, connectionId: cred.id, discoverySucceeded, liveAccountIds },
    };
  }

  return {
    inserted: legacyInserted,
    errors:   legacyErrors,
    reconcile: { userId: cred.user_id, environment: resolvedEnvironment, connectionId: cred.id, discoverySucceeded, liveAccountIds },
  };
}

// ─── Per-account fill processing ──────────────────────────────
// Extracted from syncCredential so both the single-account (OAuth) and
// multi-account (legacy) paths share identical fill → trade logic.
//
// Preconditions the caller MUST satisfy:
//   - `fills` already filtered to f.id > this account's last_fill_id
//   - `fills` already sorted ascending by f.id
//   - `prevFillsProcessed` comes from the account's tradovate_sync_state row
//
// Handles:
//   - no-fills early return (with record_sync_completion heartbeat)
//   - contract cache population
//   - batched-RPC path (PROCESS_FILLS_VIA_RPC, gated OFF by default)
//   - JS per-fill loop fallback (always used when portfolioId is set, to
//     stamp portfolio_id on each trade row — the RPC doesn't accept it)
//   - record_sync_completion + scheduleRetry-on-errors
async function processAccountFills(args: {
  connectionId:          string;
  userId:                string;
  accountIdNum:          number;
  // Prop Risk (additive): Tradovate account `name` (matches portfolios.account_name),
  // used only to attribute the cash-balance snapshot to prop_touch_equity.
  accountName:           string;
  environment:           'live' | 'demo';
  portfolioId:           string | null;
  base:                  string;
  accessToken:           string;
  fills:                 TradovateFill[];
  syncMode:              string;
  syncStartedAt:         Date;
  attribution:           { userId: string; connectionId: string };
  prevFillsProcessed:    number;
  stopOrders?:           StopOrder[];
  // Discovery-health observability (threaded from syncCredential's single
  // discovery pass so record_sync_completion can persist it here too).
  discoveredCount:       number;
  discoveryOk:           boolean;
}): Promise<{ inserted: number; errors: number }> {
  const {
    connectionId, userId, accountIdNum, accountName, environment, portfolioId,
    base, accessToken, fills, syncMode, syncStartedAt, attribution,
    prevFillsProcessed, stopOrders = [], discoveredCount, discoveryOk,
  } = args;

  // ─── Cash balance snapshot (once per account, using THIS account's own id) ──
  // Fetched here so every account in a multi-account credential gets its OWN
  // equity snapshot — not the primary credential account's balance (bug fix).
  // Pattern mirrors /order/list fetch (plain fetch + Bearer token, non-critical).
  // Any failure → null + warn + CONTINUE (must never break the sync).
  let accountEquityAtEntry: number | null = null;
  try {
    const balanceRes = await fetchWithTimeout(
      `${base}/cashBalance/getCashBalanceSnapshot?accountId=${accountIdNum}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (balanceRes.ok) {
      const balanceBody = await balanceRes.json();
      const n = Number(balanceBody?.amount);
      accountEquityAtEntry = Number.isFinite(n) ? n : null;
      if (accountEquityAtEntry === null) {
        console.warn(
          `[tradovate-sync] cash_balance_parse_failed: accountId=${accountIdNum} ` +
          `connection=${connectionId} amount_type=${typeof balanceBody?.amount}`,
        );
      }
    } else {
      console.warn(
        `[tradovate-sync] cash_balance_non_ok: accountId=${accountIdNum} ` +
        `connection=${connectionId} status=${balanceRes.status}`,
      );
    }
  } catch (balanceErr) {
    console.warn(
      `[tradovate-sync] cash_balance_fetch_error: accountId=${accountIdNum} ` +
      `connection=${connectionId}`,
      balanceErr,
    );
  }

  // ─── Prop Risk equity capture (additive, fully isolated) ───────────────────
  // Feeds the "Prop Risk" dashboard's live drawdown view for accounts that are
  // NOT running the desktop copier agent (which reports equity via a separate
  // path — see useAgentAccountSnapshots). Re-fetches the same cash balance
  // snapshot endpoint used above (independent call, kept isolated so any
  // change here can never affect account_equity_at_entry or the fills sync).
  // A failure here MUST NOT throw out of / abort the fills sync for this or
  // any other account — log and continue.
  try {
    const propBalanceRes = await fetchWithTimeout(
      `${base}/cashBalance/getCashBalanceSnapshot?accountId=${accountIdNum}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (propBalanceRes.ok) {
      const propBalanceBody = await propBalanceRes.json();
      const balance = Number(propBalanceBody?.amount);
      const openPnl = Number(propBalanceBody?.openPnL);
      if (Number.isFinite(balance)) {
        const { error: propRpcErr } = await supabaseAdmin.rpc('prop_touch_equity', {
          p_user_id:      userId,
          p_account_name: accountName,
          p_balance:      balance,
          p_open_pnl:     Number.isFinite(openPnl) ? openPnl : null,
          p_source:       'tradovate',
        });
        if (propRpcErr) {
          console.warn(
            `[tradovate-sync] prop_touch_equity_failed: accountId=${accountIdNum} ` +
            `accountName=${accountName} connection=${connectionId}`,
            propRpcErr,
          );
        }
      } else {
        console.warn(
          `[tradovate-sync] prop_equity_parse_failed: accountId=${accountIdNum} ` +
          `connection=${connectionId} amount_type=${typeof propBalanceBody?.amount}`,
        );
      }
    } else {
      console.warn(
        `[tradovate-sync] prop_equity_balance_non_ok: accountId=${accountIdNum} ` +
        `connection=${connectionId} status=${propBalanceRes.status}`,
      );
    }
  } catch (propErr) {
    console.warn(
      `[tradovate-sync] prop_equity_capture_error: accountId=${accountIdNum} ` +
      `accountName=${accountName} connection=${connectionId}`,
      propErr,
    );
  }

  let inserted = 0;
  let errors   = 0;

  if (fills.length === 0) {
    // B6 perf fix (2026-05-21): one RPC instead of UPDATE + clearRetry + INSERT.
    // record_sync_completion handles broker_connections metadata + clearRetry +
    // broker_sync_logs in a single transaction. Cursor upsert skipped (p_max_fill_id=null).
    const { error: rpcErr } = await supabaseAdmin.rpc('record_sync_completion', {
      p_connection_id:        connectionId,
      p_user_id:              userId,
      p_account_id:           accountIdNum,
      p_environment:          environment,
      p_max_fill_id:          null,
      p_prev_fills_processed: prevFillsProcessed,
      p_inserted:             0,
      p_errors:               0,
      p_fills_fetched:        0,
      p_sync_mode:            syncMode,
      p_sync_started_at:      syncStartedAt.toISOString(),
      p_log_details:          {
        reason: 'no_new_fills',
        discovered_count: discoveredCount,
        discovery_ok: discoveryOk,
      },
    });
    if (rpcErr) {
      console.error('[tradovate-sync] record_sync_completion failed (no-fills path):', rpcErr);
    }
    return { inserted: 0, errors: 0 };
  }

  // 4. Insert fills as trades (dedup via UNIQUE index)
  // Batch contract lookups (cache per contractId)
  const contractCache: Record<number, { name: string; fullPointValue: number }> = {};

  // processFill expects numeric account_id (matches tradovate_position_state schema).
  // portfolio_id: set for legacy multi-account (one portfolios row per Tradovate
  // account); null for OAuth (preserves existing behavior byte-for-byte).
  const credForFill = {
    id:           connectionId,
    user_id:      userId,
    account_id:   accountIdNum,
    environment,
    portfolio_id: portfolioId,
  };

  // B1 perf fix (2026-05-21) — feature-flagged batched-RPC path.
  // Default OFF. Enable per-deployment via `PROCESS_FILLS_VIA_RPC=true` env var.
  // When enabled: resolve contract info upfront (uses B2 cache), then make ONE
  // RPC call with the full fills array + contract map instead of N×4-6 round-
  // trips. Same per-fill semantics as the JS path (CLOSE/ADDON/OPEN), just
  // wrapped in a single transaction. Falls back to JS path if RPC errors.
  //
  // IMPORTANT: when portfolioId is non-null (legacy multi-account), we ALWAYS
  // use the JS per-fill loop (skip RPC path) because process_tradovate_fills RPC
  // does not accept a portfolio_id parameter. This ensures portfolio_id is stamped
  // on every trade row for the account-selector filter in the journal.
  const useBatchedRpc =
    portfolioId === null &&
    (Deno.env.get('PROCESS_FILLS_VIA_RPC') ?? '').toLowerCase() === 'true';
  let batchedRpcHandled = false;

  if (useBatchedRpc) {
    // Pre-resolve every unique contractId so the RPC has all metadata it needs.
    // getContractInfo already short-circuits via tradovate_contracts cache (B2),
    // so this typically costs 0 HTTP calls per cron tick steady-state.
    const uniqueContractIds = Array.from(new Set(fills.map(f => f.contractId)));
    for (const cid of uniqueContractIds) {
      if (!contractCache[cid]) {
        try {
          contractCache[cid] = await getContractInfo(base, accessToken, cid, attribution);
        } catch (err) {
          console.error(`[tradovate-sync] contract resolve failed cid=${cid}:`, err);
        }
      }
    }

    const contractMap: Record<string, { name: string; multiplier: number }> = {};
    for (const [cid, info] of Object.entries(contractCache)) {
      contractMap[cid] = { name: info.name, multiplier: info.fullPointValue };
    }
    const fillsPayload = fills.map(f => ({
      id:         f.id,
      action:     f.action,
      contractId: f.contractId,
      qty:        f.qty,
      price:      f.price,
      timestamp:  f.timestamp ?? new Date(
        f.tradeDate.year, f.tradeDate.month - 1, f.tradeDate.day
      ).toISOString(),
    }));

    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('process_tradovate_fills', {
      p_user_id:      userId,
      p_account_id:   accountIdNum,
      p_environment:  environment,
      p_contract_map: contractMap,
      p_fills:        fillsPayload,
    });

    if (rpcErr) {
      console.error('[tradovate-sync] process_tradovate_fills RPC failed — falling back to per-fill loop:', rpcErr);
      // batchedRpcHandled stays false → JS loop below handles fills as fallback
    } else {
      const summary = rpcData as { inserted: number; updated: number; skipped: number; errors: number };
      inserted = (summary.inserted ?? 0) + (summary.updated ?? 0);
      errors   = summary.errors ?? 0;
      batchedRpcHandled = true;
      console.log(JSON.stringify({
        event: 'process_fills_via_rpc',
        inserted: summary.inserted,
        updated:  summary.updated,
        skipped:  summary.skipped,
        errors:   summary.errors,
        n_fills:  fills.length,
      }));
    }
  }

  // Per-fill JS loop path (unchanged from v48). Runs when feature flag is OFF
  // OR when the batched RPC errored above (fallback path),
  // OR when portfolioId is non-null (legacy multi-account — RPC path skipped above).
  if (!batchedRpcHandled) {
    for (const fill of fills) {
      try {
        if (!contractCache[fill.contractId]) {
          contractCache[fill.contractId] = await getContractInfo(
            base, accessToken, fill.contractId, attribution,
          );
        }
        const contract = contractCache[fill.contractId];

        const result = await processFill(
          fill, credForFill,
          contract.name, contract.fullPointValue,
          base, accessToken,
          stopOrders,
          accountEquityAtEntry,
        );

        if (result === 'inserted' || result === 'updated') inserted++;
        else if (result === 'error') errors++;
        // 'skipped' = duplicate, not an error
      } catch (err) {
        console.error('[tradovate-sync] fill error:', err);
        errors++;
      }
    }
  }

  // 5. + 6. + 7. B6 perf fix (2026-05-21): one RPC instead of:
  //   - tradovate_sync_state UPSERT (cursor)
  //   - broker_connections UPDATE (metadata)
  //   - broker_connections UPDATE again via clearRetry (only on success)
  //   - broker_sync_logs INSERT
  // → 3 writes in one transaction. Error path still chains scheduleRetry after
  // for the backoff math + notification dispatch that don't fit cleanly in plpgsql.
  const maxFillId = fills.reduce((m, f) => (f.id > m ? f.id : m), 0);
  const { error: rpcErr } = await supabaseAdmin.rpc('record_sync_completion', {
    p_connection_id:        connectionId,
    p_user_id:              userId,
    p_account_id:           accountIdNum,
    p_environment:          environment,
    p_max_fill_id:          maxFillId,
    p_prev_fills_processed: prevFillsProcessed,
    p_inserted:             inserted,
    p_errors:               errors,
    p_fills_fetched:        fills.length,
    p_sync_mode:            syncMode,
    p_sync_started_at:      syncStartedAt.toISOString(),
    p_log_details:          {
      fills_fetched: fills.length,
      max_fill_id: maxFillId,
      discovered_count: discoveredCount,
      discovery_ok: discoveryOk,
    },
  });
  if (rpcErr) {
    console.error('[tradovate-sync] record_sync_completion failed (fills path):', rpcErr);
  }

  if (errors > 0) {
    // Error path: RPC only wrote metadata + log; scheduleRetry computes backoff
    // and may invoke broker-state-change-notify (transitions to degraded).
    await scheduleRetry(supabaseAdmin, connectionId, `${errors} fills failed to insert`);
  }

  return { inserted, errors };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Phase 1A.4 (2026-05-12): smaller batch + larger stagger to reduce burst
// rate against Tradovate's per-IP 80 req/min limit.
//
// Prior: BATCH_SIZE=20, STAGGER_MS=200 (10 parallel/sec from one IP).
// Now:  BATCH_SIZE=10, STAGGER_MS=500 (~3-4 parallel/sec) — halves burst.
//
// Trade-off: cron tick takes ~2x longer at scale. At 1000 connections this
// is ~4 min wall clock (still inside the 5-min cron window). Beyond 1000
// connections we need sharded cron OR the WS streamer (Phase 2).
//
// Note: these are tuning knobs, not the scale-out solution. The real fix
// for 10K+ users is event-driven WS ingestion (see MASTER_PLAN OQ-64).
const BATCH_SIZE = 10;
const STAGGER_MS = 500;

// ─── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // OQ-37+38: dual-auth (cron shared-secret OR user JWT). verify_jwt:false at
  // gateway means the Edge Function itself must reject unauthorized callers.
  const auth = await authenticate(req, supabaseAdmin);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.message }),
      {
        status: auth.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }

  try {
    const body = await req.json();
    const mode: string = body.mode ?? 'manual';
    // backfillStops: when true, after forward-fill processing each credential
    // also scans existing trades with stop_price IS NULL and patches them.
    // Never true on cron ticks — must be explicitly sent in the payload.
    const backfillStops: boolean = mode !== 'cron' && body.backfillStops === true;

    // Includes both 'tradovate' and 'ninja_trader' since NT Web accounts run
    // on the same Tradovate cloud API and need the same sync handling. The
    // trade rows themselves are still tagged broker='tradovate' (data source)
    // while the connection row keeps its branded broker value for UI display.
    // Exclude rows with null account_id (OAuth rows where account discovery has not
    // yet succeeded — they throw at line 714's numeric coercion). Self-healing in
    // oauth-refresh will populate account_id once Tradovate returns accounts; those
    // rows will rejoin the sync on the next tick automatically.
    let credentialsQuery = supabaseAdmin
      .from('broker_connections')
      .select('id, user_id, environment, connection_data, account_id, created_at, auth_method, status')
      .in('broker', ['tradovate', 'ninja_trader'])
      .eq('is_active', true)
      .not('account_id', 'is', null);

    // Single user (manual / initial)
    if (mode !== 'cron' && body.userId) {
      credentialsQuery = credentialsQuery.eq('user_id', body.userId);
      if (body.environment) {
        credentialsQuery = credentialsQuery.eq('environment', body.environment);
      }
    }

    // Cron: skip rows still within their backoff window.
    // Manual/initial paths skip this filter — user clicked Sync Now, they want to retry immediately.
    if (mode === 'cron') {
      const nowIso = new Date().toISOString();
      credentialsQuery = credentialsQuery.or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`);
    }

    const { data: credentials, error } = await credentialsQuery;
    if (error) throw error;

    // Free-tier lockdown: FREE-plan users' broker connections must stop syncing.
    // Batch-fetch every owner's account_type in ONE query (not per-connection
    // inside the loop below) — cheap even at thousands of connections.
    // Fail-open on a lookup error: an existing paid-user sync must not break
    // because of a transient profiles read failure.
    let syncableCredentials = credentials ?? [];
    if (syncableCredentials.length > 0) {
      const ownerIds = Array.from(new Set(syncableCredentials.map((c) => c.user_id)));
      const { data: owners, error: ownersError } = await supabaseAdmin
        .from('profiles')
        .select('id, account_type')
        .in('id', ownerIds);
      if (ownersError) {
        console.warn('[tradovate-sync] free_tier_check_failed:', ownersError.message);
      } else {
        const freeUserIds = new Set(
          (owners ?? [])
            .filter((o: { account_type?: string | null }) => o.account_type === 'free')
            .map((o: { id: string }) => o.id),
        );
        if (freeUserIds.size > 0) {
          syncableCredentials = syncableCredentials.filter((c) => {
            if (freeUserIds.has(c.user_id)) {
              console.log(`skip free-plan connection ${c.id}`);
              return false;
            }
            return true;
          });
        }
      }
    }

    let totalInserted = 0;
    let totalErrors   = 0;
    let synced        = 0;

    let allConnections = syncableCredentials;

    // Reconciliation ownership map: every active account-owning connection grouped
    // by (user_id, environment). A (user,env) is only reconciled when EVERY one of
    // its healthy connections was processed AND returned a successful non-empty account
    // discovery this run — so a connection skipped by the active-user filter or a
    // failed discovery never lets another connection wipe its accounts.
    //
    // Degraded/expired connections are INCLUDED in the expected set on purpose
    // (changed 2026-07-05): excluding them let the aggregate (credential_id=null)
    // reconcile run with a live-set missing a temporarily-broken sibling's accounts,
    // deactivating that sibling's portfolios (incident 2026-07-05: an expired APEX
    // connection's account vanished from the journal account list seconds after the
    // user re-authed). A broken connection now blocks the AGGREGATE reconcile for
    // its (user, env) until it recovers or is deleted; genuine cleanup still happens
    // via (a) the per-connection credential-scoped reconcile and (b) the legacy
    // (credential_id IS NULL) reconcile, both of which run on partial coverage.
    const expectedByUserEnv = new Map<string, { userId: string; environment: string; connIds: Set<string> }>();
    for (const bc of allConnections as Array<{ id: string; user_id: string; environment: string; status?: string }>) {
      const key = `${bc.user_id}::${bc.environment}`;
      let entry = expectedByUserEnv.get(key);
      if (!entry) { entry = { userId: bc.user_id, environment: bc.environment, connIds: new Set<string>() }; expectedByUserEnv.set(key, entry); }
      entry.connIds.add(bc.id);
    }
    const processedByUserEnv = new Map<string, { liveIds: Set<number>; coveredConnIds: Set<string> }>();
    // Per-connection live sets for credential-scoped reconciliation + unique-claimer
    // re-attribution. Unlike processedByUserEnv, entries here are actionable even
    // when the (user, env) is not fully covered — a dead sibling connection must
    // not block cleanup of THIS connection's own accounts.
    const perConnLive: Array<{ userId: string; environment: string; connectionId: string; liveIds: number[] }> = [];

    // Phase 1B.2 — active-user filter (cron mode only).
    //
    // Skip cron-syncing connections whose owner has had no trade activity in
    // the last 7 days AND whose connection is older than 7 days. New accounts
    // (< 7 days) are always kept so initial sync runs even before the user
    // has any trades yet. Cuts steady-state cron load by an expected 80%+
    // once the user base spreads beyond active traders.
    //
    // Manual / initial modes bypass this filter — user explicitly asked for sync.
    //
    // Implementation: 1 extra DB read (trades.user_id where created_at > 7d).
    // Build a Set, filter the connections list in-memory. Cheaper than a
    // server-side join + works around postgrest's lack of inline EXISTS.
    let activeConnections = allConnections;
    if (mode === 'cron' && allConnections.length > 0) {
      const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // B4 perf fix (2026-05-21): replaces full-row scan with DISTINCT RPC backed
      // by idx_trades_active_traders partial index. Drop-in shape ([{user_id}]).
      // Defense-in-depth: if RPC errors (missing/migration drift), fall back
      // to the original scan so cron never deadletters on this filter.
      let recentTraders: { user_id: string }[] | null = null;
      let rpcErr: { message?: string } | null = null;
      {
        const { data, error: e } = await supabaseAdmin
          .rpc('get_active_tradovate_user_ids', { p_lookback: '7 days' });
        if (e) {
          rpcErr = e;
        } else {
          recentTraders = (data ?? []) as { user_id: string }[];
        }
      }
      if (rpcErr) {
        console.warn(
          '[tradovate-sync] active_user_rpc_fallback: get_active_tradovate_user_ids errored',
          rpcErr?.message ?? rpcErr,
        );
        const sevenDaysAgoIso = new Date(sevenDaysAgoMs).toISOString();
        const { data } = await supabaseAdmin
          .from('trades')
          .select('user_id')
          .eq('broker', 'tradovate')
          .gte('created_at', sevenDaysAgoIso);
        recentTraders = (data ?? []) as { user_id: string }[];
      }
      const activeUserIds = new Set<string>(
        (recentTraders ?? []).map((r) => r.user_id),
      );

      // B5 perf fix (2026-05-21): broker_connections.created_at is now in the
      // primary SELECT (line ~873), so the grace check uses the in-scope value
      // and the secondary `ageRows` round-trip is removed entirely.
      const skipped: string[] = [];
      const kept: typeof allConnections = [];
      for (const bc of allConnections as Array<{ id: string; user_id: string; created_at?: string }>) {
        if (activeUserIds.has(bc.user_id)) {
          kept.push(bc);
          continue;
        }
        // New-connection grace: keep if < 7 days old, even with no trade activity yet.
        const createdAtMs = bc.created_at ? Date.parse(bc.created_at) : NaN;
        if (!Number.isNaN(createdAtMs) && createdAtMs >= sevenDaysAgoMs) {
          kept.push(bc);
        } else {
          skipped.push(bc.id);
        }
      }
      activeConnections = kept;
      console.log(JSON.stringify({
        event: 'active_user_filter',
        kept: activeConnections.length,
        skipped_inactive: skipped.length,
        total: allConnections.length,
        rpc_used: !rpcErr,
      }));
    }
    const runStart = Date.now();
    let totalProcessed = 0;
    let totalSuccess   = 0;
    let totalFailed    = 0;
    let totalSynced    = 0;
    let batchCount     = 0;

    // B7 perf fix (2026-05-21): collect TOKEN_EXPIRED credentials during the
    // batch loop instead of fire-and-forget per error. After the loop, fire
    // ONE call to /tradovate-auth { mode: 'refresh' }. The auth fn already
    // filters by `token_expires_at < now + RENEW_AHEAD_MS` so the single
    // invocation covers every expired connection — no `connection_ids[]`
    // filter or auth-fn change required. Eliminates the N-invocation
    // self-DoS pattern where a cohort of ~200 tokens expiring in the same
    // tick triggered 200 simultaneous edge-function invocations.
    const expiredCredIds = new Set<string>();

    for (let i = 0; i < activeConnections.length; i += BATCH_SIZE) {
      const batch = activeConnections.slice(i, i + BATCH_SIZE);
      batchCount++;

      const results = await Promise.allSettled(
        batch.map(cred => syncCredential(cred as any, mode, backfillStops))
      );

      for (let j = 0; j < results.length; j++) {
        const cred = batch[j];
        const outcome = results[j];
        totalProcessed++;

        if (outcome.status === 'fulfilled') {
          const result = outcome.value;
          totalInserted += result.inserted;
          totalErrors   += result.errors;
          synced++;
          totalSuccess++;
          totalSynced += result.inserted;

          const rec = result.reconcile;
          if (rec && rec.discoverySucceeded) {
            const key = `${rec.userId}::${rec.environment}`;
            let pe = processedByUserEnv.get(key);
            if (!pe) { pe = { liveIds: new Set<number>(), coveredConnIds: new Set<string>() }; processedByUserEnv.set(key, pe); }
            for (const id of rec.liveAccountIds) pe.liveIds.add(id);
            pe.coveredConnIds.add(rec.connectionId);
            if (rec.liveAccountIds.length > 0) {
              perConnLive.push({ userId: rec.userId, environment: rec.environment, connectionId: rec.connectionId, liveIds: rec.liveAccountIds });
            }
          }
        } else {
          const err = outcome.reason;
          const msg = String(err);
          console.error(`[tradovate-sync] connection ${cred.id}:`, msg);

          if (msg.includes('TOKEN_EXPIRED')) {
            // Schedule silent retry — never flip is_active (that column is owned by whop-webhook)
            await scheduleRetry(supabaseAdmin, cred.id, 'Token expired — auto-refresh triggered');

            // Collect for the single bulk refresh after the loop. See B7 comment above.
            expiredCredIds.add(cred.id);
          } else {
            // Generic failure — schedule silent retry backoff
            await scheduleRetry(supabaseAdmin, cred.id, msg.slice(0, 500));
          }
          totalErrors++;
          totalFailed++;
        }
      }

      if (i + BATCH_SIZE < activeConnections.length) {
        await sleep(STAGGER_MS);
      }
    }

    // B7 — single coalesced refresh call. Auth fn picks up every connection
    // with `token_expires_at` within its renewal window in one invocation.
    if (expiredCredIds.size > 0) {
      console.log(JSON.stringify({
        event: 'token_refresh_coalesced',
        expired_count: expiredCredIds.size,
      }));
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/tradovate-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ mode: 'refresh' }),
      }).catch(() => {});
    }

    // ── Per-connection re-attribution + reconciliation ───────────────────────
    // Step 1 — unique-claimer re-attribution: an account returned live by exactly
    // ONE connection this run belongs to that connection. Historical upserts were
    // last-writer-wins on credential_id, which mis-assigned accounts across
    // connections (e.g. APEX accounts displayed under a Lucid connection).
    // Accounts claimed by 2+ connections are left untouched — no flip-flops.
    // Runs BEFORE deactivation so a row rescued from a wrong owner is judged
    // against the live set of its true owner, not the wrong one's.
    const claimersByUserEnv = new Map<string, Map<number, Set<string>>>();
    for (const pc of perConnLive) {
      const key = `${pc.userId}::${pc.environment}`;
      let byAcct = claimersByUserEnv.get(key);
      if (!byAcct) { byAcct = new Map<number, Set<string>>(); claimersByUserEnv.set(key, byAcct); }
      for (const id of pc.liveIds) {
        let s = byAcct.get(id);
        if (!s) { s = new Set<string>(); byAcct.set(id, s); }
        s.add(pc.connectionId);
      }
    }
    for (const pc of perConnLive) {
      const byAcct = claimersByUserEnv.get(`${pc.userId}::${pc.environment}`);
      const uniquelyMine = pc.liveIds.filter(id => byAcct?.get(id)?.size === 1);
      if (uniquelyMine.length === 0) continue;
      try {
        const { data: movedRows, error: mErr } = await supabaseAdmin
          .from('portfolios')
          .update({ credential_id: pc.connectionId, updated_at: new Date().toISOString() })
          .eq('user_id', pc.userId)
          .eq('environment', pc.environment)
          .eq('source', 'tradovate')
          .in('tradovate_account_id', uniquelyMine)
          .or(`credential_id.is.null,credential_id.neq.${pc.connectionId}`)
          .select('id');
        if (mErr) {
          console.error('[tradovate-sync] reattribute_failed:', pc.connectionId, String(mErr.message ?? mErr).slice(0, 300));
        } else if ((movedRows ?? []).length > 0) {
          console.log(JSON.stringify({ event: 'portfolios_reattributed', connection_id: pc.connectionId, moved: (movedRows ?? []).length }));
        }
      } catch (mEx) {
        console.error('[tradovate-sync] reattribute_exception:', pc.connectionId, String(mEx).slice(0, 300));
      }
    }

    // Step 2 — credential-scoped deactivation: portfolios attributed to this
    // connection whose account the broker no longer reports live. Scoped by
    // credential_id (4-arg RPC overload), so a failing sibling connection can
    // neither block this cleanup nor cause false wipes of foreign accounts.
    for (const pc of perConnLive) {
      try {
        const { data: pcDeactivated, error: pErr } = await supabaseAdmin.rpc(
          'reconcile_tradovate_portfolios',
          { p_user_id: pc.userId, p_environment: pc.environment, p_live_account_ids: pc.liveIds, p_credential_id: pc.connectionId },
        );
        if (pErr) {
          console.error('[tradovate-sync] reconcile_per_conn_failed:', pc.connectionId, String(pErr.message ?? pErr).slice(0, 300));
        } else if (typeof pcDeactivated === 'number' && pcDeactivated > 0) {
          console.log(JSON.stringify({ event: 'portfolios_reconciled_per_connection', connection_id: pc.connectionId, deactivated: pcDeactivated, live_count: pc.liveIds.length }));
        }
      } catch (pEx) {
        console.error('[tradovate-sync] reconcile_per_conn_exception:', pc.connectionId, String(pEx).slice(0, 300));
      }
    }

    // ── Live account reconciliation ──────────────────────────────────────────
    // For each (user, env) whose EVERY owning connection was covered by a
    // successful non-empty discovery this run, deactivate portfolios whose
    // account is no longer in the live (non-archived, non-inactive) set. The RPC
    // has its own empty-array guard; we also skip empty sets here defensively.
    // NOTE: p_credential_id is passed explicitly (null) — the DB has two
    // overloads of this function and a 3-named-arg call is ambiguous (42725 /
    // PGRST203), which silently disabled reconciliation between 2026-06-24 and
    // 2026-07-03 until the 3-arg overload was dropped. Four named args resolve
    // uniquely to the 4-arg overload regardless.
    let reconciledUserEnvs = 0;
    let reconciledRows = 0;
    for (const [key, exp] of expectedByUserEnv) {
      const proc = processedByUserEnv.get(key);
      if (!proc) continue;
      let fullyCovered = true;
      for (const cid of exp.connIds) {
        if (!proc.coveredConnIds.has(cid)) { fullyCovered = false; break; }
      }
      if (!fullyCovered) continue;
      const liveIds = [...proc.liveIds];
      if (liveIds.length === 0) continue; // empty-guard (never wipe everything)
      try {
        const { data: deactivated, error: rErr } = await supabaseAdmin.rpc(
          'reconcile_tradovate_portfolios',
          { p_user_id: exp.userId, p_environment: exp.environment, p_live_account_ids: liveIds, p_credential_id: null },
        );
        if (rErr) {
          console.error('[tradovate-sync] reconcile_portfolios_failed:', key, String(rErr.message ?? rErr).slice(0, 300));
        } else {
          const n = typeof deactivated === 'number' ? deactivated : 0;
          reconciledUserEnvs++;
          reconciledRows += n;
          if (n > 0) {
            console.log(JSON.stringify({ event: 'portfolios_reconciled', user_id: exp.userId, environment: exp.environment, deactivated: n, live_count: liveIds.length }));
          }
        }
      } catch (recErr) {
        console.error('[tradovate-sync] reconcile_portfolios_exception:', key, String(recErr).slice(0, 300));
      }
    }
    if (reconciledUserEnvs > 0) {
      console.log(JSON.stringify({ event: 'reconcile_summary', user_envs: reconciledUserEnvs, rows_deactivated: reconciledRows }));
    }

    // ── Legacy-account reconciliation (credential_id=null) ────────────────────
    // For (user, env) combos where at least ONE connection succeeded but not
    // all (fullyCovered was false), we still clean up "ownerless" portfolios
    // (credential_id IS NULL). These are legacy accounts from before the
    // multi-connection era, or accounts whose original connection was deleted.
    // They are not exclusively claimed by any specific connection, so we can
    // safely deactivate any that were not returned by ANY connection that did
    // succeed this run.
    let legacyReconciledRows = 0;
    for (const [key, exp] of expectedByUserEnv) {
      const proc = processedByUserEnv.get(key);
      if (!proc || proc.coveredConnIds.size === 0) continue;
      // Skip if already handled by fullyCovered reconcile above.
      let alreadyFullyCovered = true;
      for (const cid of exp.connIds) {
        if (!proc.coveredConnIds.has(cid)) { alreadyFullyCovered = false; break; }
      }
      if (alreadyFullyCovered) continue;
      const liveIds = [...proc.liveIds];
      if (liveIds.length === 0) continue;
      try {
        const { data: legacyDeactivated, error: lErr } = await supabaseAdmin.rpc(
          'reconcile_tradovate_legacy_portfolios',
          { p_user_id: exp.userId, p_environment: exp.environment, p_live_account_ids: liveIds },
        );
        if (lErr) {
          console.error('[tradovate-sync] reconcile_legacy_failed:', key, String(lErr.message ?? lErr).slice(0, 300));
        } else {
          const n = typeof legacyDeactivated === 'number' ? legacyDeactivated : 0;
          legacyReconciledRows += n;
          if (n > 0) {
            console.log(JSON.stringify({ event: 'legacy_portfolios_reconciled', user_id: exp.userId, environment: exp.environment, deactivated: n, covered_conns: proc.coveredConnIds.size, expected_conns: exp.connIds.size }));
          }
        }
      } catch (lRecErr) {
        console.error('[tradovate-sync] reconcile_legacy_exception:', key, String(lRecErr).slice(0, 300));
      }
    }
    if (legacyReconciledRows > 0) {
      console.log(JSON.stringify({ event: 'legacy_reconcile_summary', rows_deactivated: legacyReconciledRows }));
    }

    const durationMs = Date.now() - runStart;
    console.log(JSON.stringify({
      event: "tradovate_sync_run_complete",
      totalProcessed,
      totalSuccess,
      totalFailed,
      totalSynced,
      durationMs,
      batchCount,
      batchSize: BATCH_SIZE,
      staggerMs: STAGGER_MS,
    }));

    // Cron heartbeat — last successful run timestamp for external monitoring.
    // Only write 'ok' or 'partial'. On total failure, SKIP the heartbeat entirely so
    // cron-health's staleness check (not the brittle 'failed' status) drives alerting.
    // Prevents UptimeRobot flapping on a single transient cron tick.
    const heartbeatStatus: 'ok' | 'partial' | null =
      totalFailed === 0 ? 'ok' : (totalSuccess > 0 ? 'partial' : null);
    if (heartbeatStatus !== null) {
      try {
        await supabaseAdmin.from('cron_heartbeat').upsert({
          job_name: 'tradovate-sync',
          last_run_at: new Date().toISOString(),
          last_status: heartbeatStatus,
          last_duration_ms: durationMs,
          last_payload: {
            totalProcessed,
            totalSuccess,
            totalFailed,
            totalSynced,
            batchCount,
          },
        }, { onConflict: 'job_name' });
      } catch (hbErr) {
        console.error('[tradovate-sync] heartbeat upsert failed:', String(hbErr).slice(0, 300));
      }
    } else {
      console.warn('[tradovate-sync] total failure — skipping heartbeat write to let staleness alert');
    }

    return json({ synced, totalInserted, totalErrors, ...(mode !== 'cron' ? { stopDiag: lastStopDiag } : {}) });

  } catch (err: unknown) {
    console.error('[tradovate-sync]', err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}