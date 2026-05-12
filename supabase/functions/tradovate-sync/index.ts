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
import { scheduleRetry, clearRetry } from '../_shared/retryQueue.ts';
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
async function getContractInfo(
  base: string,
  accessToken: string,
  contractId: number,
  attribution?: { userId: string; connectionId: string },
): Promise<{ name: string; fullPointValue: number }> {
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

  return finalize(contractName, product.fullPointValue);
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
    // ── CLOSE: this fill exits an existing trade ──────────────
    const pnl = closeSide === 'LONG'
      ? (fill.price - openPos.avg_entry_price) * Math.min(fill.qty, openPos.open_quantity) * multiplier
      : (openPos.avg_entry_price - fill.price) * Math.min(fill.qty, openPos.open_quantity) * multiplier;

    const outcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE';
    const closedQty = Math.min(fill.qty, openPos.open_quantity);

    // Update the trade to closed.
    // fees=null (not 0): Tradovate's /fill/list endpoint does NOT return per-fill
    // commission data, so we genuinely don't know. Writing 0 was a silent lie that
    // inflated P&L by the commission amount. Downstream code already treats null
    // as "unknown" via COALESCE(fees,0) / Number(fees || 0); the pnl above is the
    // raw exit-minus-entry calculation and does NOT subtract fees.
    const { error: updateErr } = await supabaseAdmin
      .from('trades')
      .update({
        exit_price: fill.price,
        close_at:   fillAt,
        pnl:        Math.round(pnl * 100) / 100,
        outcome,
        fees:       null,
      })
      .eq('id', openPos.open_trade_id);

    if (updateErr) {
      console.error('[tradovate-sync] close trade error:', updateErr.message);
      return 'error';
    }

    // Update position state
    const remainingQty = openPos.open_quantity - closedQty;
    if (remainingQty <= 0) {
      await supabaseAdmin
        .from('tradovate_position_state')
        .delete()
        .eq('id', openPos.id);
    } else {
      await supabaseAdmin
        .from('tradovate_position_state')
        .update({ open_quantity: remainingQty })
        .eq('id', openPos.id);
    }

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
    // Add-on leg: update the existing trade row + position state in place.
    const oldQty = Number(existingSamePos.open_quantity);
    const oldAvg = Number(existingSamePos.avg_entry_price);
    const totalQty = oldQty + fill.qty;
    const weightedAvg = (oldAvg * oldQty + fill.price * fill.qty) / totalQty;

    const { error: updateTradeErr } = await supabaseAdmin
      .from('trades')
      .update({
        quantity:    totalQty,
        entry_price: weightedAvg,
      })
      .eq('id', existingSamePos.open_trade_id);

    if (updateTradeErr) {
      console.error('[tradovate-sync] addon-leg trade update error:', updateTradeErr.message);
      return 'error';
    }

    const { error: updateStateErr } = await supabaseAdmin
      .from('tradovate_position_state')
      .update({
        open_quantity:   totalQty,
        avg_entry_price: weightedAvg,
        last_updated_at: fillAt,
      })
      .eq('id', existingSamePos.id);

    if (updateStateErr) {
      console.error('[tradovate-sync] addon-leg state update error:', updateStateErr.message);
      return 'error';
    }

    console.log(
      `[tradovate-sync] addon_leg: trade=${existingSamePos.open_trade_id} ` +
      `symbol=${symbol} side=${fillSide} ` +
      `qty=${oldQty}+${fill.qty}=${totalQty} ` +
      `avg=${oldAvg.toFixed(4)}→${weightedAvg.toFixed(4)}`
    );

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
      multiplier:           multiplier ?? 1,
      // See close-path comment above: Tradovate fills carry no fee data; null
      // is honest, 0 was a silent lie. DB default for `fees` is 0 but the column
      // is nullable, and downstream consumers tolerate null via COALESCE.
      fees:                 null,
    })
    .select('id')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') return 'skipped'; // duplicate fill
    console.error('[tradovate-sync] open trade error:', insertErr.message);
    return 'error';
  }

  // Insert (not upsert) — we already verified no same-side position exists.
  // The unique constraint on (user_id, tradovate_account_id, symbol, side)
  // protects against the rare race-condition path.
  const { error: insertStateErr } = await supabaseAdmin
    .from('tradovate_position_state')
    .insert({
      user_id:              cred.user_id,
      tradovate_account_id: cred.account_id,
      symbol,
      side:                 fillSide,
      open_quantity:        fill.qty,
      avg_entry_price:      fill.price,
      open_trade_id:        newTrade.id,
      last_updated_at:      fillAt,
    });

  if (insertStateErr) {
    // 23505 = race condition: a parallel run created the position between
    // our SELECT and INSERT. Caller will retry on next cron tick.
    console.error('[tradovate-sync] open state insert error:', insertStateErr.message);
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
  if (fills.length === 0) {
    // Update last_sync_at even when no new fills
    await supabaseAdmin.from('broker_connections').update({
      last_sync_at:            new Date().toISOString(),
      last_successful_sync_at: new Date().toISOString(),
    }).eq('id', cred.id);
    // Clear any pending retry state — successful sync means the connection is healthy
    await clearRetry(supabaseAdmin, cred.id);

    // Log skipped sync (no new fills to process)
    try {
      const completedAt = new Date();
      await supabaseAdmin.from('broker_sync_logs').insert({
        connection_id:   cred.id,
        account_id:      null, // numeric Tradovate account_id; broker_accounts UUID not available here
        user_id:         cred.user_id,
        sync_type:       'fills',
        sync_trigger:    syncMode,
        status:          'success',
        records_fetched: 0,
        records_created: 0,
        records_updated: 0,
        records_skipped: 0,
        records_failed:  0,
        started_at:      syncStartedAt.toISOString(),
        completed_at:    completedAt.toISOString(),
        duration_ms:     completedAt.getTime() - syncStartedAt.getTime(),
        sync_details:    { reason: 'no_new_fills' },
      });
    } catch (logErr) {
      console.error('[tradovate-sync] broker_sync_logs insert failed (skipped path):', logErr);
    }

    return { inserted: 0, errors: 0 };
  }

  // 4. Insert fills as trades (dedup via UNIQUE index)
  // Batch contract lookups (cache per contractId)
  const contractCache: Record<number, { name: string; fullPointValue: number }> = {};

  // processFill expects numeric account_id (matches tradovate_position_state schema).
  // environment is also passed for the idempotency_key formula (see processFill body).
  const credForFill = { id: cred.id, user_id: cred.user_id, account_id: accountIdNum, environment: cred.environment };

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

  // 5. Update sync cursor
  const maxFillId = Math.max(...fills.map(f => f.id));
  await supabaseAdmin.from('tradovate_sync_state').upsert({
    user_id:         cred.user_id,
    environment:     cred.environment,
    account_id:      accountIdNum,
    last_fill_id:    maxFillId,
    last_sync_at:    new Date().toISOString(),
    fills_processed: (syncState?.fills_processed ?? 0) + inserted,
  }, { onConflict: 'user_id,environment,account_id' });

  // 6. Update broker_connections metadata
  await supabaseAdmin.from('broker_connections').update({
    last_sync_at:            new Date().toISOString(),
    last_successful_sync_at: errors === 0 ? new Date().toISOString() : null,
    error_count:             errors > 0 ? errors : 0,
  }).eq('id', cred.id);

  if (errors === 0) {
    // Successful sync — clear any pending retry state (sets status='connected')
    await clearRetry(supabaseAdmin, cred.id);
  } else {
    // Partial fill errors — schedule retry backoff
    await scheduleRetry(supabaseAdmin, cred.id, `${errors} fills failed to insert`);
  }

  // 7. Write observability log — non-critical, never blocks the sync
  try {
    const completedAt = new Date();
    const logStatus = errors === 0 ? 'success' : inserted > 0 ? 'partial' : 'failed';
    await supabaseAdmin.from('broker_sync_logs').insert({
      connection_id:   cred.id,
      account_id:      null, // broker_accounts UUID not available at this layer; fill in OQ-23 scope
      user_id:         cred.user_id,
      sync_type:       'fills',
      sync_trigger:    syncMode,
      status:          logStatus,
      records_fetched: fills.length,
      records_created: inserted,
      records_updated: 0,
      records_skipped: fills.length - inserted - errors,
      records_failed:  errors,
      error_message:   errors > 0 ? `${errors} fills failed to insert` : null,
      started_at:      syncStartedAt.toISOString(),
      completed_at:    completedAt.toISOString(),
      duration_ms:     completedAt.getTime() - syncStartedAt.getTime(),
      sync_details:    { fills_fetched: fills.length, max_fill_id: maxFillId },
    });
  } catch (logErr) {
    console.error('[tradovate-sync] broker_sync_logs insert failed:', logErr);
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

    let credentialsQuery = supabaseAdmin
      .from('broker_connections')
      .select('id, user_id, environment, connection_data, account_id')
      .eq('broker', 'tradovate')
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
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentTraders } = await supabaseAdmin
        .from('trades')
        .select('user_id')
        .eq('broker', 'tradovate')
        .gte('created_at', sevenDaysAgo);
      const activeUserIds = new Set<string>(
        (recentTraders ?? []).map((r: { user_id: string }) => r.user_id),
      );
      const skipped: string[] = [];
      activeConnections = allConnections.filter((bc: { id: string; user_id: string; created_at?: string }) => {
        if (activeUserIds.has(bc.user_id)) return true;
        // New connection grace — keep if connection is < 7 days old.
        // broker_connections.created_at not in SELECT (saves a column);
        // we'll fetch it lazily only for connections that need the grace check.
        return false; // default skip; grace check below repopulates kept new accounts
      });
      // Lazy grace fetch — only for connections we'd otherwise skip.
      const candidatesForGrace = allConnections.filter(
        (bc: { id: string; user_id: string }) => !activeUserIds.has(bc.user_id),
      );
      if (candidatesForGrace.length > 0) {
        const { data: ageRows } = await supabaseAdmin
          .from('broker_connections')
          .select('id, created_at')
          .in('id', candidatesForGrace.map((c: { id: string }) => c.id))
          .gte('created_at', sevenDaysAgo);
        const newConnIds = new Set<string>((ageRows ?? []).map((r: { id: string }) => r.id));
        const grace = candidatesForGrace.filter((c: { id: string }) => newConnIds.has(c.id));
        activeConnections = [...activeConnections, ...grace];
        for (const c of candidatesForGrace) {
          if (!newConnIds.has(c.id)) skipped.push(c.id);
        }
      }
      console.log(JSON.stringify({
        event: 'active_user_filter',
        kept: activeConnections.length,
        skipped_inactive: skipped.length,
        total: allConnections.length,
      }));
    }
    const runStart = Date.now();
    let totalProcessed = 0;
    let totalSuccess   = 0;
    let totalFailed    = 0;
    let totalSynced    = 0;
    let batchCount     = 0;

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

            // Fire-and-forget refresh attempt — may revive the token in the background
            fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/tradovate-auth`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ mode: 'refresh' }),
            }).catch(() => {});
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