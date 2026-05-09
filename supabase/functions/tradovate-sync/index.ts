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

// ─── Retry helper for transient Tradovate API errors ─────────
// Retries on 5xx and 429. Returns immediately on 401 (token expiry
// handled by caller) and other 4xx (client errors, not retriable).
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: { maxAttempts?: number }
): Promise<Response> {
  const max = opts?.maxAttempts ?? 3;
  const delays = [1000, 2000, 4000]; // ms — used for attempts 1→2, 2→3
  let lastErr: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      const res = await fetch(url, init);
      // 401 → don't retry, signal token expiry
      if (res.status === 401) return res;
      // 4xx (other than 401/429) → don't retry, client error
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return res;
      // 5xx and 429 → retry
      if (res.status >= 500 || res.status === 429) {
        if (attempt === max) return res;
        await new Promise(r => setTimeout(r, delays[attempt - 1] ?? 4000));
        continue;
      }
      // 2xx/3xx → success
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt === max) throw err;
      await new Promise(r => setTimeout(r, delays[attempt - 1] ?? 4000));
    }
  }
  throw lastErr ?? new Error('fetchWithRetry: exhausted attempts');
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
  lastFillId: number
): Promise<TradovateFill[]> {
  const url = `${base}/fill/list`;
  const res = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!res.ok) throw new Error(`Fill fetch failed: ${res.status}`);

  const fills: TradovateFill[] = await res.json();

  // Only fills newer than last cursor
  return fills.filter(f => f.id > lastFillId);
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

// Extract the base symbol prefix from a contract name like "MNQM6" → "MNQ", "ESZ5" → "ES".
// Returns null if no leading-letter prefix found.
function extractBaseSymbol(contractName: string): string | null {
  if (!contractName) return null;
  const match = contractName.match(/^([A-Z]+)\d/);
  return match ? match[1] : null;
}

// ─── Fetch contract info ──────────────────────────────────────
async function getContractInfo(
  base: string,
  accessToken: string,
  contractId: number
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

  // Step 1: contract/item → get name + contractMaturityId
  const contractRes = await fetchWithRetry(`${base}/contract/item?id=${contractId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!contractRes.ok) return finalize('UNKNOWN', null);
  const contract = await contractRes.json();
  const contractName = contract.name ?? 'UNKNOWN';

  // Step 2: contractMaturity/item → get productId
  if (!contract.contractMaturityId) return finalize(contractName, null);
  const maturityRes = await fetchWithRetry(`${base}/contractMaturity/item?id=${contract.contractMaturityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!maturityRes.ok) return finalize(contractName, null);
  const maturity = await maturityRes.json();

  // Step 3: product/item → get fullPointValue
  if (!maturity.productId) return finalize(contractName, null);
  const productRes = await fetchWithRetry(`${base}/product/item?id=${maturity.productId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
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

    // Update the trade to closed
    const { error: updateErr } = await supabaseAdmin
      .from('trades')
      .update({
        exit_price: fill.price,
        close_at:   fillAt,
        pnl:        Math.round(pnl * 100) / 100,
        outcome,
        fees:       0,
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

  // ── OPEN: no opposite position → open a new trade ────────────
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
      fees:                 0,
    })
    .select('id')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') return 'skipped'; // duplicate fill
    console.error('[tradovate-sync] open trade error:', insertErr.message);
    return 'error';
  }

  // Track open position
  await supabaseAdmin
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

  // 3. Fetch new fills
  const fills = await fetchFills(base, accessToken, accountIdNum, lastFillId);
  if (fills.length === 0) {
    // Update last_sync_at even when no new fills
    await supabaseAdmin.from('broker_connections').update({
      last_sync_at:            new Date().toISOString(),
      last_successful_sync_at: new Date().toISOString(),
    }).eq('id', cred.id);

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
          base, accessToken, fill.contractId
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
    last_error:              errors > 0 ? `${errors} fills failed to insert` : null,
    last_error_at:           errors > 0 ? new Date().toISOString() : null,
    status:                  errors > 0 ? 'error' : 'connected',
  }).eq('id', cred.id);

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

    const { data: credentials, error } = await credentialsQuery;
    if (error) throw error;

    let totalInserted = 0;
    let totalErrors   = 0;
    let synced        = 0;

    for (const cred of credentials ?? []) {
      try {
        const result = await syncCredential(cred as any, mode);
        totalInserted += result.inserted;
        totalErrors   += result.errors;
        synced++;
      } catch (err: unknown) {
        const msg = String(err);
        console.error(`[tradovate-sync] connection ${cred.id}:`, msg);

        if (msg.includes('TOKEN_EXPIRED')) {
          // Token dead — flip is_active=false so the row moves to "Re-auth Required"
          // ('expired' is not a valid broker_connections.status — coerce to 'disconnected')
          await supabaseAdmin.from('broker_connections').update({
            status:          'disconnected',
            is_active:       false,
            last_error:      'Token expired — auto-refresh triggered',
            last_error_at:   new Date().toISOString(),
            disconnected_at: new Date().toISOString(),
          }).eq('id', cred.id);

          // Fire-and-forget refresh attempt — may revive the row to is_active=true
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/tradovate-auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ mode: 'refresh' }),
          }).catch(() => {});
        } else {
          await supabaseAdmin.from('broker_connections').update({
            status:        'error',
            error_count:   1,
            last_error:    msg.slice(0, 500),
            last_error_at: new Date().toISOString(),
          }).eq('id', cred.id);
        }
        totalErrors++;
      }
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