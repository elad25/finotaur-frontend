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
async function fetchFills(
  base: string,
  accessToken: string,
  accountId: number,
  lastFillId: number
): Promise<TradovateFill[]> {
  const url = `${base}/fill/ldeps?masterids=${accountId}`;
  const res = await fetch(url, {
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

// ─── Fetch contract info ──────────────────────────────────────
async function getContractInfo(
  base: string,
  accessToken: string,
  contractId: number
): Promise<{ name: string; fullPointValue: number }> {
  // Step 1: contract/item → get name + contractMaturityId
  const contractRes = await fetch(`${base}/contract/item?id=${contractId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!contractRes.ok) return { name: 'UNKNOWN', fullPointValue: 1 };
  const contract = await contractRes.json();

  // Step 2: contractMaturity/item → get productId
  if (!contract.contractMaturityId) return { name: contract.name ?? 'UNKNOWN', fullPointValue: 1 };
  const maturityRes = await fetch(`${base}/contractMaturity/item?id=${contract.contractMaturityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!maturityRes.ok) return { name: contract.name ?? 'UNKNOWN', fullPointValue: 1 };
  const maturity = await maturityRes.json();

  // Step 3: product/item → get fullPointValue
  if (!maturity.productId) return { name: contract.name ?? 'UNKNOWN', fullPointValue: 1 };
  const productRes = await fetch(`${base}/product/item?id=${maturity.productId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!productRes.ok) return { name: contract.name ?? 'UNKNOWN', fullPointValue: 1 };
  const product = await productRes.json();

  return {
    name: contract.name ?? 'UNKNOWN',
    fullPointValue: product.fullPointValue ?? 1,
  };
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
  cred: { id: string; user_id: string; account_id: number },
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
      // NOTE: cred is from tradovate_credentials, NOT broker_connections.
      //       broker_connection_id / broker_account_id intentionally omitted
      //       (NULL) — types don't match. J2 will add lookup. See OQ-22.
      external_id:          `tradovate::fill::${fill.id}`,
      broker_trade_id:      String(fill.id),
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
async function syncCredential(cred: {
  id: string;
  user_id: string;
  environment: 'live' | 'demo';
  vault_secret_id: string;
  account_id: number;
}): Promise<{ inserted: number; errors: number }> {
  const base = TRADOVATE_URLS[cred.environment];
  let inserted = 0;
  let errors = 0;

  // 1. Get access token
  const accessToken = await getAccessToken(cred.vault_secret_id);

  // 2. Get sync cursor
  const { data: syncState } = await supabaseAdmin
    .from('tradovate_sync_state')
    .select('last_fill_id, fills_processed')
    .eq('user_id', cred.user_id)
    .eq('environment', cred.environment)
    .eq('account_id', cred.account_id)
    .single();

  const lastFillId = syncState?.last_fill_id ?? 0;

  // 3. Fetch new fills
  const fills = await fetchFills(base, accessToken, cred.account_id, lastFillId);
  if (fills.length === 0) {
    // Update last_sync_at even when no new fills
    await supabaseAdmin.from('tradovate_credentials').update({
      last_sync_at: new Date().toISOString(),
    }).eq('id', cred.id);
    return { inserted: 0, errors: 0 };
  }

  // 4. Insert fills as trades (dedup via UNIQUE index)
  // Batch contract lookups (cache per contractId)
  const contractCache: Record<number, { name: string; fullPointValue: number }> = {};

  for (const fill of fills) {
    try {
      if (!contractCache[fill.contractId]) {
        contractCache[fill.contractId] = await getContractInfo(
          base, accessToken, fill.contractId
        );
      }
      const contract = contractCache[fill.contractId];

      const result = await processFill(
        fill, cred,
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
    account_id:      cred.account_id,
    last_fill_id:    maxFillId,
    last_sync_at:    new Date().toISOString(),
    fills_processed: (syncState?.fills_processed ?? 0) + inserted,
  }, { onConflict: 'user_id,environment,account_id' });

  // 6. Update credential metadata
  await supabaseAdmin.from('tradovate_credentials').update({
    last_sync_at:       new Date().toISOString(),
    sync_error_count:   errors > 0 ? (syncState?.fills_processed ?? 0) + 1 : 0,
    sync_error_message: errors > 0 ? `${errors} fills failed to insert` : null,
    status:             'connected',
  }).eq('id', cred.id);

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
      .from('tradovate_credentials')
      .select('id, user_id, environment, vault_secret_id, account_id')
      .eq('status', 'connected');

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
        const result = await syncCredential(cred as any);
        totalInserted += result.inserted;
        totalErrors   += result.errors;
        synced++;
      } catch (err: unknown) {
        const msg = String(err);
        console.error(`[tradovate-sync] cred ${cred.id}:`, msg);

        // Mark as expired if token invalid
                if (msg.includes('TOKEN_EXPIRED')) {
          await supabaseAdmin.from('tradovate_credentials').update({
            status: 'expired',
            sync_error_message: 'Token expired — auto-refresh triggered',
          }).eq('id', cred.id);

          // טריגר refresh אוטומטי מיידי
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/tradovate-auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ mode: 'refresh' }),
          }).catch(() => {}); // fire and forget
        } else {
          await supabaseAdmin.from('tradovate_credentials').update({
            sync_error_count: 1,
            sync_error_message: msg.slice(0, 200),
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