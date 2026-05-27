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

      // 1. Insert session row.
      const { data: session, error: sessErr } = await supabase
        .from('backtest_sessions')
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
        })
        .select('id, created_at')
        .single();

      if (sessErr || !session) {
        return errorResponse(`Failed to save session: ${sessErr?.message ?? 'unknown error'}`, 500);
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
        }));

        const { error: tradesErr } = await supabase.from('backtest_trades').insert(tradeRows);
        if (tradesErr) {
          // Best-effort rollback so we don't leave an empty session orphaned.
          await supabase.from('backtest_sessions').delete().eq('id', session.id);
          return errorResponse(`Failed to save trades: ${tradesErr.message}`, 500);
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
            supabase.from('backtest_sessions').select('*').eq('id', id).single(),
            supabase
              .from('backtest_trades')
              .select('*')
              .eq('session_id', id)
              .order('entry_time', { ascending: true }),
          ]);

        if (sessErr) return errorResponse(`Session not found: ${sessErr.message}`, 404);
        if (tradesErr) return errorResponse(`Failed to load trades: ${tradesErr.message}`, 500);

        return jsonResponse({ session, trades: trades ?? [] });
      }

      // ── List (summary only — no trades) ──
      const { data, error } = await supabase
        .from('backtest_sessions')
        .select(
          'id, name, symbol, interval, asset_class, total_trades, win_rate, net_pnl, profit_factor, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) return errorResponse(`Failed to list sessions: ${error.message}`, 500);
      return jsonResponse({ sessions: data ?? [] });
    }

    // ─── DELETE /backtest-sessions?id=… ───────────────────────
    if (req.method === 'DELETE') {
      if (!id) return errorResponse('Query param "id" is required for DELETE');
      const { error } = await supabase.from('backtest_sessions').delete().eq('id', id);
      if (error) return errorResponse(`Failed to delete session: ${error.message}`, 500);
      return jsonResponse({ ok: true, id });
    }

    return errorResponse(`Method not allowed: ${req.method}`, 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Internal error: ${message}`, 500);
  }
});
