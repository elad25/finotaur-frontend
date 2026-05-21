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

// ─── Get access token from Vault ──────────────────────────────
async function getAccessToken(vaultSecretId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('tradovate_vault_read', {
    p_secret_id: vaultSecretId,
  });
  if (error || !data) throw new Error('Cannot read from Vault');
  const parsed = JSON.parse(data);
  return parsed.accessToken;
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
  cred: { id: string; user_id: string; account_id: number; environment: 'live' | 'demo' },
  symbol: string,
  multiplier: number,
  base: string,
  accessToken: string
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

  // First leg: create a fresh trade row + position state row.
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
      symbol,
      side:                 fillSide,
      quantity:             fill.qty,
      entry_price:          fill.price,
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
  connection_data: { vault_secret_id?: string } | null;
  account_id: string;
}, syncMode = 'cron'): Promise<{ inserted: number; errors: number }> {
  const base = TRADOVATE_URLS[cred.environment];
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

  // 2. Get sync cursor
  const { data: syncState } = await supabaseAdmin
    .from('tradovate_sync_state')
    .select('last_fill_id, fills_processed')
    .eq('user_id', cred.user_id)
    .eq('environment', cred.environment)
    .eq('account_id', accountIdNum)
    .single();

  const lastFillId = syncState?.last_fill_id ?? 0;

  // Phase 1B.1: every Tradovate API call from this credential's sync run
  // carries user_id + connection_id in 429 / non-2xx observability rows.
  const attribution = { userId: cred.user_id, connectionId: cred.id };

  // 3. Fetch new fills
  const fills = await fetchFills(base, accessToken, accountIdNum, lastFillId, attribution);
  // v47 fix: Tradovate's /fill/list returns fills in FIFO-pairing order
  // (each opening fill followed by its matching closing fill), NOT in fill.id
  // order. Without sorting, multi-leg positions get processed as N independent
  // round-trips instead of one aggregated position (e.g. BUY+BUY+BUY+SELL+SELL+SELL
  // becomes 3 separate trade rows instead of 1 with 3 partial_exits).
  // fill.id is monotonic with execution time on Tradovate, so sort by id ASC
  // restores the actual sequence the user executed.
  fills.sort((a, b) => a.id - b.id);
  if (fills.length === 0) {
    // B6 perf fix (2026-05-21): one RPC instead of UPDATE + clearRetry + INSERT.
    // record_sync_completion handles broker_connections metadata + clearRetry +
    // broker_sync_logs in a single transaction. Cursor upsert skipped (p_max_fill_id=null).
    const { error: rpcErr } = await supabaseAdmin.rpc('record_sync_completion', {
      p_connection_id:        cred.id,
      p_user_id:              cred.user_id,
      p_account_id:           accountIdNum,
      p_environment:          cred.environment,
      p_max_fill_id:          null,
      p_prev_fills_processed: syncState?.fills_processed ?? 0,
      p_inserted:             0,
      p_errors:               0,
      p_fills_fetched:        0,
      p_sync_mode:            syncMode,
      p_sync_started_at:      syncStartedAt.toISOString(),
      p_log_details:          { reason: 'no_new_fills' },
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
  // environment is also passed for the idempotency_key formula (see processFill body).
  const credForFill = { id: cred.id, user_id: cred.user_id, account_id: accountIdNum, environment: cred.environment };

  // B1 perf fix (2026-05-21) — feature-flagged batched-RPC path.
  // Default OFF. Enable per-deployment via `PROCESS_FILLS_VIA_RPC=true` env var.
  // When enabled: resolve contract info upfront (uses B2 cache), then make ONE
  // RPC call with the full fills array + contract map instead of N×4-6 round-
  // trips. Same per-fill semantics as the JS path (CLOSE/ADDON/OPEN), just
  // wrapped in a single transaction. Falls back to JS path if RPC errors.
  const useBatchedRpc =
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
      p_user_id:      cred.user_id,
      p_account_id:   accountIdNum,
      p_environment:  cred.environment,
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
  // OR when the batched RPC errored above (fallback path).
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
          base, accessToken
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
    p_connection_id:        cred.id,
    p_user_id:              cred.user_id,
    p_account_id:           accountIdNum,
    p_environment:          cred.environment,
    p_max_fill_id:          maxFillId,
    p_prev_fills_processed: syncState?.fills_processed ?? 0,
    p_inserted:             inserted,
    p_errors:               errors,
    p_fills_fetched:        fills.length,
    p_sync_mode:            syncMode,
    p_sync_started_at:      syncStartedAt.toISOString(),
    p_log_details:          { fills_fetched: fills.length, max_fill_id: maxFillId },
  });
  if (rpcErr) {
    console.error('[tradovate-sync] record_sync_completion failed (fills path):', rpcErr);
  }

  if (errors > 0) {
    // Error path: RPC only wrote metadata + log; scheduleRetry computes backoff
    // and may invoke broker-state-change-notify (transitions to degraded).
    await scheduleRetry(supabaseAdmin, cred.id, `${errors} fills failed to insert`);
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

    // Includes both 'tradovate' and 'ninja_trader' since NT Web accounts run
    // on the same Tradovate cloud API and need the same sync handling. The
    // trade rows themselves are still tagged broker='tradovate' (data source)
    // while the connection row keeps its branded broker value for UI display.
    let credentialsQuery = supabaseAdmin
      .from('broker_connections')
      .select('id, user_id, environment, connection_data, account_id, created_at')
      .in('broker', ['tradovate', 'ninja_trader'])
      .eq('is_active', true);

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

    let totalInserted = 0;
    let totalErrors   = 0;
    let synced        = 0;

    let allConnections = credentials ?? [];

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
        batch.map(cred => syncCredential(cred as any, mode))
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

    return json({ synced, totalInserted, totalErrors });

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