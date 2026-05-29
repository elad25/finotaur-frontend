// supabase/functions/backtest-sessions/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   CRUD for paper-trading backtest sessions.
//   Each user can save snapshots of their session (symbol, interval,
//   trades, statistics) for later review.
//
// ROUTES (dispatched by HTTP method + query):
//   POST   /backtest-sessions             → save (body: SaveSessionPayload)
//   GET    /backtest-sessions             → list user's sessions (summary only)
//   GET    /backtest-sessions?id=<uuid>   → load full session + trades
//   DELETE /backtest-sessions?id=<uuid>   → delete one session (cascade trades)
//
// SECURITY:
//   - verify_jwt at gateway = true (default). Authenticated users only.
//   - All DB calls use the user's JWT — RLS policies (auth.uid() = user_id)
//     enforce ownership. No service-role bypass anywhere.
// ═══════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

// DoS guard: cap one session at 10k trades. Saves above this size
// pin an edge worker + hold a DB connection long enough to degrade
// availability under a small number of bad-actor requests.
const MAX_TRADES_PER_SESSION = 10000;

// JSONB column size cap (statistics / config). 100KB is well above the
// largest legitimate payload (real stats blobs are ~2KB) and far below
// what would force Postgres to TOAST or impact query latency.
const MAX_JSON_BYTES = 100 * 1024;

// ─── Types (mirror frontend useBacktestSession) ─────────────────
interface TradePayload {
  side: 'LONG' | 'SHORT';
  entry_time: string;        // ISO
  entry_price: number;
  exit_time?: string;        // ISO
  exit_price?: number;
  size: number;
  stop_loss?: number;
  take_profit?: number;
  pnl?: number;
  pnl_percent?: number;
  exit_reason?: 'manual' | 'sl' | 'tp';
  strategy_id?: string | null;   // strategy attribution tag (NULL = manual)
}

interface PendingOrderPayload {
  id: string;
  side: 'LONG' | 'SHORT';
  type: 'LIMIT' | 'STOP';
  trigger_price: number;
  size: number;
  stop_loss?: number;
  take_profit?: number;
  strategy_id?: string | null;
  created_at: number;
}

interface SaveSessionPayload {
  name?: string;
  symbol: string;
  interval: string;
  asset_class?: 'futures' | 'stocks' | 'crypto';
  start_date: string;        // ISO
  end_date: string;          // ISO
  initial_balance: number;
  final_balance?: number;
  statistics: Record<string, unknown>;
  total_trades: number;
  win_rate: number;
  net_pnl: number;
  profit_factor: number;
  notes?: string;
  config?: Record<string, unknown>;
  trades: TradePayload[];
  pending_orders?: PendingOrderPayload[];
}

// ─── Helpers ────────────────────────────────────────────────────
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// Log the full error server-side (visible via supabase function logs)
// while returning only the generic label to the client. Prevents leakage
// of DB constraint names, column names, or row data through err.message.
function safeError(label: string, err: unknown, status: number): Response {
  console.error(`[backtest-sessions] ${label}:`, err);
  return errorResponse(label, status);
}

// ─── Handler ────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return errorResponse('Missing Authorization header', 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return errorResponse('Server misconfigured: missing SUPABASE_URL or SUPABASE_ANON_KEY', 500);
  }

  // Client scoped to the calling user — RLS enforces ownership.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Confirm the caller is authenticated.
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return errorResponse('Unauthorized: invalid token', 401);

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  try {
    // ─── POST /backtest-sessions ──────────────────────────────
    if (req.method === 'POST') {
      const payload = (await req.json()) as SaveSessionPayload;
      if (!payload.symbol || !payload.interval || !Array.isArray(payload.trades)) {
        return errorResponse('Invalid payload: symbol, interval, and trades[] are required');
      }
      if (payload.trades.length > MAX_TRADES_PER_SESSION) {
        return errorResponse(
          `Too many trades in one session (max ${MAX_TRADES_PER_SESSION})`,
          413,
        );
      }
      const statsBytes = JSON.stringify(payload.statistics ?? {}).length;
      const configBytes = JSON.stringify(payload.config ?? {}).length;
      if (statsBytes > MAX_JSON_BYTES || configBytes > MAX_JSON_BYTES) {
        return errorResponse(
          `Payload too large (max ${MAX_JSON_BYTES} bytes per JSON field)`,
          413,
        );
      }

      // 1. Insert session row.
      const { data: session, error: sessErr } = await supabase
        .from('backtest_sessions_v2')
        .insert({
          user_id: user.id,
          name: payload.name ?? null,
          symbol: payload.symbol,
          interval: payload.interval,
          asset_class: payload.asset_class ?? null,
          start_date: payload.start_date,
          end_date: payload.end_date,
          initial_balance: payload.initial_balance,
          final_balance: payload.final_balance ?? null,
          statistics: payload.statistics,
          total_trades: payload.total_trades,
          win_rate: payload.win_rate,
          net_pnl: payload.net_pnl,
          profit_factor: payload.profit_factor,
          notes: payload.notes ?? null,
          config: payload.config ?? null,
          pending_orders: payload.pending_orders ?? [],
        })
        .select('id, created_at')
        .single();

      if (sessErr || !session) {
        return safeError('Failed to save session', sessErr, 500);
      }

      // 2. Insert trades (bulk). Skip if empty array.
      if (payload.trades.length > 0) {
        const tradeRows = payload.trades.map((t) => ({
          session_id: session.id,
          side: t.side,
          entry_time: t.entry_time,
          entry_price: t.entry_price,
          exit_time: t.exit_time ?? null,
          exit_price: t.exit_price ?? null,
          size: t.size,
          stop_loss: t.stop_loss ?? null,
          take_profit: t.take_profit ?? null,
          pnl: t.pnl ?? null,
          pnl_percent: t.pnl_percent ?? null,
          exit_reason: t.exit_reason ?? null,
          strategy_id: t.strategy_id ?? null,
        }));

        const { error: tradesErr } = await supabase.from('backtest_trades_v2').insert(tradeRows);
        if (tradesErr) {
          // Best-effort rollback so we don't leave an empty session orphaned.
          await supabase.from('backtest_sessions_v2').delete().eq('id', session.id);
          return safeError('Failed to save trades', tradesErr, 500);
        }
      }

      return jsonResponse({ id: session.id, created_at: session.created_at }, 201);
    }

    // ─── GET /backtest-sessions ───────────────────────────────
    if (req.method === 'GET') {
      // ── Single session load (with trades) ──
      if (id) {
        const [{ data: session, error: sessErr }, { data: trades, error: tradesErr }] =
          await Promise.all([
            supabase.from('backtest_sessions_v2').select('*').eq('id', id).single(),
            supabase
              .from('backtest_trades_v2')
              .select('*')
              .eq('session_id', id)
              .order('entry_time', { ascending: true }),
          ]);

        if (sessErr) return safeError('Session not found', sessErr, 404);
        if (tradesErr) return safeError('Failed to load trades', tradesErr, 500);

        return jsonResponse({ session, trades: trades ?? [] });
      }

      // ── List (summary only — no trades) ──
      // Cursor-based pagination on created_at DESC.
      // Query params:
      //   limit  — rows per page (default 50, max 200)
      //   before — ISO timestamp cursor; returns rows older than this value
      const rawLimit = parseInt(url.searchParams.get('limit') ?? '50', 10);
      const pageLimit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(rawLimit, 1), 200)
        : 50;
      const beforeParam = url.searchParams.get('before');
      const beforeDate = beforeParam ? new Date(beforeParam) : null;

      let query = supabase
        .from('backtest_sessions_v2')
        .select(
          'id, name, symbol, interval, asset_class, total_trades, win_rate, net_pnl, profit_factor, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(pageLimit + 1); // over-fetch by 1 to detect next page

      if (beforeDate && !isNaN(beforeDate.getTime())) {
        query = query.lt('created_at', beforeDate.toISOString());
      }

      const { data, error } = await query;

      if (error) return safeError('Failed to list sessions', error, 500);

      const rows = data ?? [];
      const hasMore = rows.length > pageLimit;
      const sessions = hasMore ? rows.slice(0, pageLimit) : rows;
      // next_cursor is the created_at of the last row we're returning
      const next_cursor = hasMore ? sessions[sessions.length - 1].created_at : null;

      return jsonResponse({ sessions, next_cursor });
    }

    // ─── DELETE /backtest-sessions?id=… ───────────────────────
    if (req.method === 'DELETE') {
      if (!id) return errorResponse('Query param "id" is required for DELETE');
      const { error } = await supabase.from('backtest_sessions_v2').delete().eq('id', id);
      if (error) return safeError('Failed to delete session', error, 500);
      return jsonResponse({ ok: true, id });
    }

    return errorResponse(`Method not allowed: ${req.method}`, 405);
  } catch (err) {
    return safeError('Internal error', err, 500);
  }
});
