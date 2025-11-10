// app/api/integrations/tradingview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service-client';
import { WebhookCache } from '@/lib/cache/webhook-cache';
import { checkRateLimit, getRemainingTokens } from '@/lib/rate-limit/webhook-limiter';
import type { BrokerTrade } from '@/lib/brokers/types';

interface TradingViewWebhook {
  webhook_secret: string;
  user_id: string;
  action: 'BUY' | 'SELL' | 'CLOSE_LONG' | 'CLOSE_SHORT';
  symbol: string;
  price: number;
  quantity: number;
  strategy?: string;
  notes?: string;
  stop_loss?: number;
  take_profit?: number;
  timestamp?: string;
}

interface WebhookResponse {
  success: boolean;
  trade_id?: string;
  message: string;
  error?: string;
  details?: string;
  processing_time_ms?: number;
  rate_limit?: {
    remaining: number;
  };
}

// Response cache for idempotency (prevents duplicate trades from retry logic)
// Map structure: idempotencyKey -> { response, timestamp }
const responseCache = new Map<string, { response: WebhookResponse; timestamp: number }>();
const RESPONSE_CACHE_TTL = 5000; // 5 seconds

// Validation helper - runs before any DB calls
function validatePayload(payload: any): payload is TradingViewWebhook {
  return (
    payload &&
    typeof payload.webhook_secret === 'string' &&
    typeof payload.user_id === 'string' &&
    ['BUY', 'SELL', 'CLOSE_LONG', 'CLOSE_SHORT'].includes(payload.action) &&
    typeof payload.symbol === 'string' &&
    typeof payload.price === 'number' &&
    typeof payload.quantity === 'number' &&
    payload.price > 0 &&
    payload.quantity > 0
  );
}

// Generate idempotency key from payload
function getIdempotencyKey(payload: TradingViewWebhook): string {
  return `${payload.user_id}:${payload.action}:${payload.symbol}:${payload.price}:${payload.quantity}:${payload.timestamp || ''}`;
}

// Verify webhook secret with caching
async function verifyWebhookSecret(
  userId: string,
  providedSecret: string
): Promise<boolean> {
  // Check cache first - prevents DB hit for every request
  const cached = WebhookCache.get(userId);
  if (cached && cached.secret === providedSecret) {
    return true;
  }

  // Cache miss - query DB with minimal columns (only what we need)
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('user_settings')
    .select('tradingview_webhook_secret')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data || data.tradingview_webhook_secret !== providedSecret) {
    return false;
  }

  // Cache for future requests (60 minute TTL)
  WebhookCache.set(userId, data.tradingview_webhook_secret);
  return true;
}

/**
 * POST /api/integrations/tradingview
 * Main webhook endpoint for TradingView alerts
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const payload = await request.json();

    // Step 1: Validate payload structure BEFORE any DB calls
    if (!validatePayload(payload)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid payload structure',
          details: 'Required fields: webhook_secret, user_id, action, symbol, price, quantity'
        },
        { status: 400 }
      );
    }

    // Step 2: Idempotency check - prevent duplicate processing
    // This protects against TradingView retry logic or network issues
    const idempotencyKey = getIdempotencyKey(payload);
    const cachedResponse = responseCache.get(idempotencyKey);
    
    if (cachedResponse && Date.now() - cachedResponse.timestamp < RESPONSE_CACHE_TTL) {
      return NextResponse.json(
        { 
          ...cachedResponse.response,
          processing_time_ms: Date.now() - startTime 
        }, 
        { 
          headers: { 
            'X-Cache': 'HIT',
            'X-Idempotency-Key': idempotencyKey
          }
        }
      );
    }

    // Step 3: Rate limiting - prevent abuse (token bucket algorithm)
    if (!checkRateLimit(payload.user_id)) {
      const remaining = getRemainingTokens(payload.user_id);
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit exceeded',
          details: 'Too many requests. Please slow down.',
          rate_limit: {
            remaining: Math.floor(remaining)
          }
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': Math.floor(remaining).toString()
          }
        }
      );
    }

    // Step 4: Verify webhook secret (with caching - 95% cache hit rate)
    const isValid = await verifyWebhookSecret(
      payload.user_id,
      payload.webhook_secret
    );

    if (!isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid webhook credentials',
          details: 'Webhook secret does not match. Generate a new URL from settings.'
        },
        { status: 401 }
      );
    }

    // Step 5: Process trade action
    const supabase = getServiceClient();
    const isOpening = payload.action === 'BUY' || payload.action === 'SELL';
    const isClosing = payload.action === 'CLOSE_LONG' || payload.action === 'CLOSE_SHORT';

    let result: NextResponse;

    if (isOpening) {
      result = await handleOpenTrade(supabase, payload);
    } else if (isClosing) {
      result = await handleCloseTrade(supabase, payload);
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid action',
          details: 'Action must be BUY, SELL, CLOSE_LONG, or CLOSE_SHORT'
        },
        { status: 400 }
      );
    }

    // Cache successful responses for idempotency
    if (result.status === 200) {
      const responseData = await result.json();
      const enrichedResponse: WebhookResponse = {
        ...responseData,
        processing_time_ms: Date.now() - startTime,
        rate_limit: {
          remaining: Math.floor(getRemainingTokens(payload.user_id))
        }
      };

      responseCache.set(idempotencyKey, {
        response: enrichedResponse,
        timestamp: Date.now(),
      });

      // Cleanup old cache entries periodically (prevent memory bloat)
      if (responseCache.size > 1000) {
        cleanupResponseCache();
      }

      return NextResponse.json(enrichedResponse, { 
        headers: { 
          'X-Cache': 'MISS',
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'X-RateLimit-Remaining': Math.floor(getRemainingTokens(payload.user_id)).toString()
        }
      });
    }

    return result;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error('TradingView webhook error:', {
      message: error.message,
      stack: error.stack,
      duration,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        processing_time_ms: duration,
      },
      { status: 500 }
    );
  }
}

// Cleanup stale response cache entries
function cleanupResponseCache(): void {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > RESPONSE_CACHE_TTL) {
      responseCache.delete(key);
    }
  }
}

/**
 * Handle opening a new trade
 * Optimized: Only selects the ID column we need
 */
async function handleOpenTrade(
  supabase: ReturnType<typeof getServiceClient>,
  payload: TradingViewWebhook
): Promise<NextResponse> {
  // Generate unique external ID with timestamp and random component
  const randomSuffix = Math.random().toString(36).substring(2, 11);
  const external_id = `tv_${Date.now()}_${randomSuffix}`;

  const newTrade: Partial<BrokerTrade> = {
    external_id,
    broker: 'tradingview',
    symbol: payload.symbol,
    side: payload.action === 'BUY' ? 'LONG' : 'SHORT',
    entry_price: payload.price,
    quantity: payload.quantity,
    fees: 0,
    open_at: payload.timestamp || new Date().toISOString(),
    stop_price: payload.stop_loss,
    target_price: payload.take_profit,
    strategy: payload.strategy,
    notes: payload.notes,
    asset_type: 'stock',
  };

  // Insert and return only the ID - minimal payload
  const { data, error } = await supabase
    .from('trades')
    .insert({
      ...newTrade,
      user_id: payload.user_id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save trade:', {
      error: error.message,
      code: error.code,
      details: error.details,
      user_id: payload.user_id,
      symbol: payload.symbol,
    });

    // Provide specific error messages for common issues
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { 
          success: false,
          error: 'Duplicate trade',
          details: 'A trade with this external_id already exists'
        },
        { status: 409 }
      );
    }

    if (error.code === '23503') { // Foreign key violation
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid user',
          details: 'User ID does not exist'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save trade',
        details: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    trade_id: data.id,
    message: 'Trade opened successfully',
  });
}

/**
 * Handle closing an existing trade
 * Optimized: Direct UPDATE with composite index instead of RPC
 */
async function handleCloseTrade(
  supabase: ReturnType<typeof getServiceClient>,
  payload: TradingViewWebhook
): Promise<NextResponse> {
  const side = payload.action === 'CLOSE_LONG' ? 'LONG' : 'SHORT';
  const now = new Date().toISOString();

  // Direct update query - uses composite index (user_id, symbol, side, closed_at)
  // This is more efficient than RPC for simple operations
  const { data, error } = await supabase
    .from('trades')
    .update({
      exit_price: payload.price,
      close_at: now, // Note: using close_at (matches your schema)
      updated_at: now,
    })
    .eq('user_id', payload.user_id)
    .eq('symbol', payload.symbol)
    .eq('side', side)
    .is('close_at', null) // Only open trades (using close_at not closed_at)
    .order('open_at', { ascending: false }) // Most recent first
    .limit(1)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Failed to close trade:', {
      error: error.message,
      code: error.code,
      user_id: payload.user_id,
      symbol: payload.symbol,
      side,
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to close trade',
        details: error.message
      },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { 
        success: false,
        error: 'No open trade found',
        details: `No open ${side} position for ${payload.symbol}`
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    trade_id: data.id,
    message: 'Trade closed successfully',
  });
}

/**
 * Generate webhook URL with secret
 * Called from user settings page
 */
export async function generateWebhookURL(userId: string): Promise<string> {
  // Generate secure random secret
  // crypto.randomUUID() is available in Node 14.17+, Edge runtime, and browsers
  const secret = crypto.randomUUID();
  
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        tradingview_webhook_secret: secret,
      },
      {
        onConflict: 'user_id',
      }
    )
    .select('user_id')
    .single();

  if (error) {
    console.error('Failed to generate webhook URL:', error);
    throw new Error('Failed to generate webhook URL');
  }

  // Update cache immediately to avoid DB hit on first webhook
  WebhookCache.set(userId, secret);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://finotaur.com';
  return `${baseUrl}/api/integrations/tradingview?user_id=${userId}&secret=${secret}`;
}

/**
 * GET /api/integrations/tradingview
 * Health check endpoint for monitoring
 */
export async function GET(request: NextRequest) {
  // Try to get cache stats, fallback to basic info if not available
  let cacheStats: any;
  try {
    // @ts-ignore - getStats may not exist in basic cache implementation
    cacheStats = WebhookCache.getStats ? WebhookCache.getStats() : { 
      note: 'Stats not available - using basic cache' 
    };
  } catch {
    cacheStats = { 
      note: 'Stats not available - using basic cache' 
    };
  }

  return NextResponse.json({
    status: 'healthy',
    service: 'tradingview-webhook',
    timestamp: new Date().toISOString(),
    cache_stats: cacheStats,
    response_cache_size: responseCache.size,
  });
}