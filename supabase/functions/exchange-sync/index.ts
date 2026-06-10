// supabase/functions/exchange-sync/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   mode="cron"    — sync all connected exchange users (pg_cron)
//   mode="manual"  — sync one user (frontend Sync Now button)
//
// DEDUP STRATEGY:
//   ON CONFLICT (idempotency_key) DO NOTHING
//   → safe to call multiple times, never creates duplicates
//
// SUPPORTED EXCHANGES (dispatched via registry):
//   binance  — live now
//   bybit, coinbase, okx, kraken — registry stubs (throws if called)
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticate } from '../_shared/dualAuth.ts';
import { scheduleRetry } from '../_shared/retryQueue.ts';
import { getExchangeAdapter, isExchangeSupported } from '../_shared/exchanges/registry.ts';
import { readExchangeCredentials } from '../_shared/exchanges/vault-credentials.ts';
import type { UnifiedExchangeTrade } from '../_shared/exchanges/interface.ts';

// ─── Brokers handled by this function (exchange API-key based) ─
const EXCHANGE_BROKERS = ['binance', 'bybit', 'coinbase', 'okx', 'kraken'];

// ─── Module-level service-role client ────────────────────────
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// ─── Funding-attach algorithm ─────────────────────────────────
// Approximate attribution: assigns each funding payment to the
// perp trade whose open window contains the funding timestamp.
// Each perp trade's window is [tradeTime, nextTradeTimeInSymbolGroup).
// The last trade's window extends to +Infinity.
// Funding events for symbols with no perp trades are dropped.
function attachFunding(
  perpTrades: UnifiedExchangeTrade[],
  fundingEvents: { symbol: string; amount: number; time: string }[],
): Map<string, number> {
  const fundingByTradeId = new Map<string, number>();

  // Initialize accumulator for every perp trade.
  for (const t of perpTrades) {
    fundingByTradeId.set(t.externalId, 0);
  }

  if (fundingEvents.length === 0 || perpTrades.length === 0) {
    return fundingByTradeId;
  }

  // Group perp trades by symbol, sorted ascending by tradeTime.
  const bySymbol = new Map<string, UnifiedExchangeTrade[]>();
  for (const t of perpTrades) {
    if (!bySymbol.has(t.symbol)) bySymbol.set(t.symbol, []);
    bySymbol.get(t.symbol)!.push(t);
  }
  for (const group of bySymbol.values()) {
    group.sort((a, b) => Date.parse(a.tradeTime) - Date.parse(b.tradeTime));
  }

  // Attach each funding event to the correct trade window.
  for (const event of fundingEvents) {
    const group = bySymbol.get(event.symbol);
    if (!group || group.length === 0) {
      // No perp trades for this symbol in this sync window — drop.
      continue;
    }

    const eventTimeMs = Date.parse(event.time);

    // Find which trade window contains the funding time.
    // Walk the sorted group: each trade owns [tradeTime, nextTradeTime).
    let matched: UnifiedExchangeTrade | null = null;
    for (let i = 0; i < group.length; i++) {
      const tradeTimeMs = Date.parse(group[i].tradeTime);
      const nextTradeTimeMs =
        i + 1 < group.length ? Date.parse(group[i + 1].tradeTime) : Infinity;

      if (eventTimeMs >= tradeTimeMs && eventTimeMs < nextTradeTimeMs) {
        matched = group[i];
        break;
      }
    }

    // If before the first trade, attach to the first trade anyway.
    if (!matched) {
      matched = group[0];
    }

    const prev = fundingByTradeId.get(matched.externalId) ?? 0;
    fundingByTradeId.set(matched.externalId, prev + event.amount);
  }

  return fundingByTradeId;
}

// ─── Map a UnifiedExchangeTrade to a trades table row ─────────
function mapToTradeRow(
  t: UnifiedExchangeTrade,
  conn: {
    id: string;
    user_id: string;
    broker: string;
    environment: string | null;
  },
  fundingByTradeId: Map<string, number>,
): Record<string, unknown> {
  const fundingSum = fundingByTradeId.get(t.externalId) ?? 0;
  const funding_paid = t.positionType === 'Perpetual' && fundingSum !== 0
    ? fundingSum
    : null;

  // positionType from adapter is 'Spot' | 'Perpetual'; DB expects lowercase.
  const position_type = t.positionType.toLowerCase(); // 'spot' | 'perpetual'

  // PnL preservation: perpetual trades with realizedPnl from the exchange
  // are inserted with input_mode='risk-only' so the DB trigger preserves pnl.
  // Spot trades are inserted as OPEN — the journal will compute PnL separately.
  // The trigger does NOT auto-set outcome, so we supply it explicitly.
  const pnlFields: Record<string, unknown> =
    t.positionType === 'Perpetual' && t.realizedPnl != null
      ? {
          input_mode: 'risk-only',
          pnl: t.realizedPnl,
          close_at: t.tradeTime,
          outcome:
            t.realizedPnl > 0.01
              ? 'WIN'
              : t.realizedPnl < -0.01
              ? 'LOSS'
              : 'BE',
        }
      : {
          input_mode: 'summary',
          pnl: null,
          close_at: null,
          outcome: 'OPEN',
        };

  return {
    user_id: conn.user_id,
    external_id: t.externalId,
    // idempotency_key scoped by broker + user + environment + exchange-native id
    idempotency_key: `${conn.broker}::${conn.user_id}::${conn.environment ?? 'live'}::${t.externalId}`,
    symbol: t.symbol,
    side: t.side,           // 'LONG' | 'SHORT'
    quantity: t.quantity,
    entry_price: t.entryPrice,
    exit_price: null,
    open_at: t.tradeTime,   // ISO string
    asset_class: 'crypto',
    position_type,           // 'spot' | 'perpetual'
    leverage: t.leverage ?? null,
    fees: t.fees ?? 0,
    funding_paid,
    broker: conn.broker,
    import_source: 'api',
    multiplier: null,
    ...pnlFields,
  };
}

// ─── Connection result shape ───────────────────────────────────
interface ConnectionResult {
  connectionId: string;
  broker: string;
  inserted: number;
  skipped: number;
  error: string | null;
}

// ─── Sync one connection ───────────────────────────────────────
async function syncConnection(conn: {
  id: string;
  user_id: string;
  broker: string;
  environment: string | null;
  connection_data: Record<string, unknown> | null;
  last_sync_at: string | null;
  error_count: number | null;
}): Promise<ConnectionResult> {
  const result: ConnectionResult = {
    connectionId: conn.id,
    broker: conn.broker,
    inserted: 0,
    skipped: 0,
    error: null,
  };

  // Guard: only process exchanges with a working adapter.
  if (!isExchangeSupported(conn.broker)) {
    console.warn(`[exchange-sync] unsupported exchange broker="${conn.broker}" connId=${conn.id} — skipping`);
    result.error = `Exchange "${conn.broker}" not yet supported`;
    return result;
  }

  // Guard: vault_secret_id and symbols are required in connection_data.
  const vaultSecretId = conn.connection_data?.vault_secret_id as string | undefined;
  const rawSymbols = conn.connection_data?.symbols;
  if (!vaultSecretId) {
    console.warn(`[exchange-sync] missing vault_secret_id connId=${conn.id} — skipping`);
    result.error = 'Missing vault_secret_id in connection_data';
    return result;
  }
  if (!rawSymbols || (Array.isArray(rawSymbols) && (rawSymbols as unknown[]).length === 0)) {
    console.warn(`[exchange-sync] missing/empty symbols connId=${conn.id} — skipping`);
    result.error = 'Missing or empty symbols in connection_data';
    return result;
  }
  const symbols = Array.isArray(rawSymbols)
    ? (rawSymbols as string[])
    : String(rawSymbols).split(/[\s,]+/).filter(Boolean);

  // Read credentials from Vault — never log the returned value.
  const creds = await readExchangeCredentials(supabaseAdmin, vaultSecretId);

  const adapter = getExchangeAdapter(conn.broker as Parameters<typeof getExchangeAdapter>[0]);

  // Convert last_sync_at ISO → epoch ms for adapter `since` param.
  const since = conn.last_sync_at ? Date.parse(conn.last_sync_at) : undefined;

  // Fetch all three datasets from the exchange.
  const [spot, perp, funding] = await Promise.all([
    adapter.fetchSpotTrades(creds, { symbols, since }),
    adapter.fetchPerpTrades(creds, { symbols, since }),
    adapter.fetchFunding(creds, { since }),
  ]);

  // Attach funding payments to perp trades (approximate attribution).
  const fundingByTradeId = attachFunding(perp, funding);

  // Build rows for all trades (spot + perp).
  const rows = [
    ...spot.map((t) => mapToTradeRow(t, conn, fundingByTradeId)),
    ...perp.map((t) => mapToTradeRow(t, conn, fundingByTradeId)),
  ];

  if (rows.length === 0) {
    // No new data — update connection metadata and return.
    await supabaseAdmin
      .from('broker_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_successful_sync_at: new Date().toISOString(),
        status: 'connected',
        error_count: 0,
        error_message: null,
      })
      .eq('id', conn.id);

    return result;
  }

  // Upsert rows — ON CONFLICT(idempotency_key) DO NOTHING.
  const { error: upsertError, data: upsertData } = await supabaseAdmin
    .from('trades')
    .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true })
    .select('id');

  if (upsertError) {
    const msg = upsertError.message ?? String(upsertError);
    console.error(`[exchange-sync] upsert error connId=${conn.id}: ${msg}`);

    await supabaseAdmin
      .from('broker_connections')
      .update({
        status: 'error',
        error_count: (conn.error_count ?? 0) + 1,
        error_message: msg.slice(0, 500),
      })
      .eq('id', conn.id);

    await scheduleRetry(supabaseAdmin, conn.id, msg);

    result.error = msg;
    result.skipped = rows.length;
    return result;
  }

  // Count how many were actually inserted (not skipped as duplicates).
  const insertedCount = upsertData ? upsertData.length : 0;
  const skippedCount = rows.length - insertedCount;

  // Update connection metadata on success.
  await supabaseAdmin
    .from('broker_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      last_successful_sync_at: new Date().toISOString(),
      status: 'connected',
      error_count: 0,
      error_message: null,
    })
    .eq('id', conn.id);

  result.inserted = insertedCount;
  result.skipped = skippedCount;
  return result;
}

// ─── CORS headers (matches corsHeaders from _shared/cors.ts) ──
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Main handler ──────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Dual-auth: cron shared-secret OR user JWT (verify_jwt:false at gateway).
  const auth = await authenticate(req, supabaseAdmin);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.message }),
      {
        status: auth.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }

  try {
    const body = await req.json();
    const mode: string = auth.isCron ? 'cron' : (body.mode ?? 'manual');

    // For manual mode, userId must come from the authenticated user (not body).
    // For cron mode, iterate all active exchange connections.
    const manualUserId = auth.isCron ? null : (auth as { isCron: false; userId: string }).userId;

    // Build query for active exchange broker connections.
    let query = supabaseAdmin
      .from('broker_connections')
      .select('id, user_id, broker, environment, connection_data, last_sync_at, error_count')
      .in('broker', EXCHANGE_BROKERS)
      .eq('is_active', true);

    if (mode !== 'cron' && manualUserId) {
      query = query.eq('user_id', manualUserId);
    }

    // Cron: skip rows still within their backoff window.
    if (mode === 'cron') {
      const nowIso = new Date().toISOString();
      query = query.or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`);
    }

    const { data: connections, error: queryError } = await query;
    if (queryError) throw queryError;

    const results: ConnectionResult[] = [];

    for (const conn of (connections ?? [])) {
      try {
        const r = await syncConnection(conn as Parameters<typeof syncConnection>[0]);
        results.push(r);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[exchange-sync] connection ${conn.id} threw: ${msg}`);

        // Update connection to error state and schedule backoff retry.
        await supabaseAdmin
          .from('broker_connections')
          .update({
            status: 'error',
            error_count: (conn.error_count ?? 0) + 1,
            error_message: msg.slice(0, 500),
          })
          .eq('id', conn.id)
          .catch(() => {});

        await scheduleRetry(supabaseAdmin, conn.id, msg).catch(() => {});

        results.push({
          connectionId: conn.id,
          broker: conn.broker,
          inserted: 0,
          skipped: 0,
          error: msg.slice(0, 300),
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, results }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (err: unknown) {
    console.error('[exchange-sync]', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }
});
