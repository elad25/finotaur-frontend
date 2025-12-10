// =====================================================================
// 🔒 SNAPTRADE PROXY - PRODUCTION SECURE VERSION
// =====================================================================
// Version: 2.0.0 - Security Hardened
// Based on: v9.0.152 SnapTrade SDK
// 
// ✅ Security Fixes Applied:
// - FIX-001: CORS restricted to allowed domains only (was "*")
// - FIX-002: Safe logging - API keys never exposed in logs
// - FIX-003: Rate limiting (60 req/min per user)
// - FIX-004: Better error handling without sensitive data leaks
// - FIX-005: Environment-based security controls
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Snaptrade } from "npm:snaptrade-typescript-sdk@9.0.152";

// =====================================================================
// ENVIRONMENT VARIABLES
// =====================================================================

const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ENVIRONMENT = Deno.env.get("ENVIRONMENT") || "production";

// =====================================================================
// 🔒 FIX-001: CORS - Restricted Origins Only (was "*")
// =====================================================================

const ALLOWED_ORIGINS: string[] = [
  "https://finotaur.com",
  "https://www.finotaur.com",
  "https://app.finotaur.com",
];

// Add localhost for development only
if (ENVIRONMENT === "development" || ENVIRONMENT === "local") {
  ALLOWED_ORIGINS.push(
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
  );
}

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

// =====================================================================
// 🔒 FIX-002: Safe Logging Utility (was exposing API keys)
// =====================================================================

const SafeLog = {
  /** Mask sensitive strings - show only first 4 and last 4 chars */
  mask(value: string | undefined | null): string {
    if (!value) return "N/A";
    if (value.length <= 8) return "****";
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  },

  /** Log environment check without exposing secrets */
  envCheck() {
    console.log("🔧 SnapTrade Proxy - Environment Check:");
    console.log("  ENVIRONMENT:", ENVIRONMENT);
    console.log("  CLIENT_ID:", SNAPTRADE_CLIENT_ID ? "✅ Set" : "❌ Missing");
    console.log("  CLIENT_ID valid:", SNAPTRADE_CLIENT_ID?.length === 14 ? "✅ Yes (14 chars)" : `❌ No (${SNAPTRADE_CLIENT_ID?.length || 0}/14 chars)`);
    console.log("  CONSUMER_KEY:", SNAPTRADE_CONSUMER_KEY ? "✅ Set" : "❌ Missing");
    console.log("  CONSUMER_KEY valid:", SNAPTRADE_CONSUMER_KEY?.length === 50 ? "✅ Yes (50 chars)" : `❌ No (${SNAPTRADE_CONSUMER_KEY?.length || 0}/50 chars)`);
    console.log("  SUPABASE_URL:", SUPABASE_URL ? "✅ Set" : "❌ Missing");
    console.log("  SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Missing");
  },

  /** Log request info without sensitive data */
  request(req: Request, context: string) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📥 ${context}`);
    console.log("=".repeat(80));
    console.log("⏰ Time:", new Date().toISOString());
    console.log("📍 Method:", req.method);
    console.log("🌐 Path:", new URL(req.url).pathname);
  },

  /** Log response without sensitive data */
  response(status: number, hasData: boolean) {
    console.log(`\n${status < 400 ? "✅" : "❌"} Response: ${status}`);
    console.log("📦 Has data:", hasData);
    console.log("=".repeat(80) + "\n");
  },

  /** Log error safely */
  error(error: any, context: string) {
    console.error(`\n${"=".repeat(80)}`);
    console.error(`❌ ERROR in ${context}`);
    console.error("=".repeat(80));
    console.error("Message:", error?.message || "Unknown error");
    console.error("Status:", error?.status || "N/A");
    if (error?.code) console.error("Code:", error.code);
    console.error("=".repeat(80) + "\n");
  },
};

// =====================================================================
// 🔒 FIX-003: Rate Limiting (was missing)
// =====================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blocked: boolean;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return;
  
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 60, windowMs: 60000, blockDurationMs: 300000 }
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No existing entry
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
      blocked: false,
    });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: new Date(now + config.windowMs),
    };
  }

  // Check if blocked
  if (entry.blocked && now < entry.resetAt) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfterMs: entry.resetAt - now,
    };
  }

  // Increment count
  entry.count++;

  // Check limit
  if (entry.count > config.limit) {
    if (config.blockDurationMs) {
      entry.blocked = true;
      entry.resetAt = now + config.blockDurationMs;
    }
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfterMs: entry.resetAt - now,
    };
  }

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
    ...(result.retryAfterMs ? { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } : {}),
  };
}

function createRateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: result.retryAfterMs ? Math.ceil(result.retryAfterMs / 1000) : undefined,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        "Content-Type": "application/json",
      },
    }
  );
}

// =====================================================================
// Initialize SnapTrade SDK
// =====================================================================

SafeLog.envCheck();

// Validate credentials
if (!SNAPTRADE_CLIENT_ID || SNAPTRADE_CLIENT_ID.length !== 14) {
  console.error("❌ Invalid SNAPTRADE_CLIENT_ID! Must be exactly 14 characters.");
}

if (!SNAPTRADE_CONSUMER_KEY || SNAPTRADE_CONSUMER_KEY.length !== 50) {
  console.error("❌ Invalid SNAPTRADE_CONSUMER_KEY! Must be exactly 50 characters.");
}

let snaptrade: Snaptrade;
try {
  snaptrade = new Snaptrade({
    consumerKey: SNAPTRADE_CONSUMER_KEY!,
    clientId: SNAPTRADE_CLIENT_ID!,
  });
  console.log("✅ SnapTrade SDK initialized successfully (v9.0.152)");
} catch (e: any) {
  console.error("❌ Failed to initialize SnapTrade SDK:", e.message);
  throw e;
}

// =====================================================================
// MAIN SERVER
// =====================================================================

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  SafeLog.request(req, "NEW REQUEST");

  try {
    // ✅ Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("❌ No auth header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log("❌ Auth failed:", authError?.message || "Unknown");
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ User authenticated:", SafeLog.mask(user.id));

    // 🔒 Rate Limiting - by user ID
    const rateLimit = checkRateLimit(user.id, {
      limit: 60,              // 60 requests
      windowMs: 60000,        // per minute
      blockDurationMs: 300000 // block for 5 mins if exceeded
    });

    if (!rateLimit.allowed) {
      console.log("⚠️ Rate limit exceeded for user:", SafeLog.mask(user.id));
      return createRateLimitResponse(rateLimit, corsHeaders);
    }

    // ✅ Parse request
    const requestBody = await req.json();
    
    // 🔒 FIX-004: Don't log full request body (may contain secrets)
    console.log("📦 Request received for endpoint:", requestBody.endpoint);
    
    const { 
      endpoint, 
      method = "GET", 
      body = null,
      userId,
      userSecret,
      isPublic = false 
    } = requestBody;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("\n📍 Request Details:");
    console.log("  endpoint:", endpoint);
    console.log("  method:", method);
    console.log("  userId:", userId ? SafeLog.mask(userId) : "NOT PROVIDED");
    console.log("  userSecret:", userSecret ? "PROVIDED (masked)" : "NOT PROVIDED");
    console.log("  isPublic:", isPublic);

    let result: any;

    try {
      // ============================================================================
      // TEST API STATUS
      // ============================================================================
      
      if (endpoint === '/test' || endpoint === 'test') {
        console.log("\n🧪 Testing API Status");
        
        const statusResponse = await snaptrade.apiStatus.check();
        console.log("✅ API Status check successful");
        
        result = {
          test: "success",
          apiStatus: statusResponse.data,
          timestamp: new Date().toISOString(),
          credentials: {
            clientIdConfigured: !!SNAPTRADE_CLIENT_ID,
            clientIdValid: SNAPTRADE_CLIENT_ID?.length === 14,
            consumerKeyConfigured: !!SNAPTRADE_CONSUMER_KEY,
            consumerKeyValid: SNAPTRADE_CONSUMER_KEY?.length === 50,
          }
        };
      }
      
      // ============================================================================
      // REGISTER USER
      // ============================================================================
      
      else if (endpoint.includes('/snapTrade/registerUser') || endpoint === '/snapTrade/registerUser') {
        const userIdToRegister = body?.userId || userId || user.id;
        
        console.log("\n📝 Calling SDK: registerSnapTradeUser");
        console.log("  userId:", SafeLog.mask(userIdToRegister));
        
        const response = await snaptrade.authentication.registerSnapTradeUser({
          userId: userIdToRegister
        });
        
        result = response.data;
        
        // ✅ Validate response
        if (!result.userSecret || result.userSecret.trim() === '') {
          console.error("⚠️ WARNING: Registration returned empty userSecret!");
          throw new Error("Registration did not return userSecret");
        }
        
        console.log("✅ registerUser SUCCESS");
        console.log("  userId:", SafeLog.mask(result.userId));
        console.log("  userSecret: ✅ Received (masked)");
      }
      
      // ============================================================================
      // LOGIN USER (GET OAUTH URL)
      // ============================================================================
      
      else if (endpoint.includes('/snapTrade/login') || endpoint === '/snapTrade/login') {
        console.log("\n🔗 Calling SDK: loginSnapTradeUser");
        
        // ✅ Validate required parameters
        if (!userId || !userSecret) {
          throw new Error("userId and userSecret are required for login");
        }
        
        const response = await snaptrade.authentication.loginSnapTradeUser({
          userId: userId!,
          userSecret: userSecret!,
          broker: body?.broker,
          immediateRedirect: body?.immediateRedirect ?? true,
          customRedirect: body?.customRedirect,
          reconnect: body?.reconnect,
          connectionType: body?.connectionType ?? 'read',
          connectionPortalVersion: body?.connectionPortalVersion ?? 'v4'
        });
        
        result = response.data;
        console.log("✅ loginUser SUCCESS");
        console.log("  redirectURI:", result.redirectURI ? "✅ Generated" : "❌ Missing");
      }
      
      // ============================================================================
      // LIST BROKERAGES (PUBLIC)
      // ============================================================================
      
      else if (endpoint.includes('/brokerages') || endpoint === '/brokerages') {
        console.log("\n📋 Calling SDK: listAllBrokerages");
        
        const response = await snaptrade.referenceData.listAllBrokerages();
        
        result = response.data;
        console.log("✅ Got", result.length, "brokerages");
      }
      
      // ============================================================================
      // LIST CONNECTIONS
      // ============================================================================
      
      else if (endpoint.includes('/connections') && method === 'GET' && !endpoint.match(/\/connections\/[^/]+/)) {
        console.log("\n🔌 Calling SDK: listBrokerageAuthorizations");
        
        if (!userId || !userSecret) {
          throw new Error("userId and userSecret are required");
        }
        
        const response = await snaptrade.connections.listBrokerageAuthorizations({
          userId: userId!,
          userSecret: userSecret!
        });
        
        result = response.data;
        console.log("✅ Got", result.length, "connections");
      }
      
      // ============================================================================
      // DELETE CONNECTION
      // ============================================================================
      
      else if (endpoint.match(/\/connections\/([^/]+)$/) && method === 'DELETE') {
        const connectionId = endpoint.match(/\/connections\/([^/]+)$/)?.[1];
        console.log("\n🗑️ Calling SDK: removeBrokerageAuthorization");
        console.log("  connectionId:", SafeLog.mask(connectionId));
        
        if (!userId || !userSecret) {
          throw new Error("userId and userSecret are required");
        }
        
        const response = await snaptrade.connections.removeBrokerageAuthorization({
          authorizationId: connectionId!,
          userId: userId!,
          userSecret: userSecret!
        });
        
        result = response.data;
        console.log("✅ Connection deleted");
      }
      
      // ============================================================================
      // REFRESH CONNECTION
      // ============================================================================
      
      else if (endpoint.match(/\/connections\/([^/]+)\/refresh$/) && method === 'POST') {
        const connectionId = endpoint.match(/\/connections\/([^/]+)\/refresh$/)?.[1];
        console.log("\n🔄 Calling SDK: refreshBrokerageAuthorization");
        console.log("  connectionId:", SafeLog.mask(connectionId));
        
        if (!userId || !userSecret) {
          throw new Error("userId and userSecret are required");
        }
        
        const response = await snaptrade.connections.refreshBrokerageAuthorization({
          authorizationId: connectionId!,
          userId: userId!,
          userSecret: userSecret!
        });
        
        result = response.data;
        console.log("✅ Connection refreshed");
      }
      
      // ============================================================================
      // GET ACCOUNTS
      // ============================================================================
      
      else if (endpoint.includes('/accounts') && method === 'GET' && !endpoint.includes('/holdings') && !endpoint.match(/\/accounts\/[^/]+/)) {
        console.log("\n💼 Calling SDK: listUserAccounts");
        
        if (!userId || !userSecret) {
          throw new Error("userId and userSecret are required");
        }
        
        const response = await snaptrade.accountInformation.listUserAccounts({
          userId: userId!,
          userSecret: userSecret!
        });
        
        result = response.data;
        console.log("✅ Got", result.length, "accounts");
      }
      
      // ============================================================================
      // GET HOLDINGS
      // ============================================================================
      
      else if (endpoint.includes('/holdings')) {
        console.log("\n📈 Calling SDK: getAllUserHoldings");
        
        if (!userId || !userSecret) {
          throw new Error("userId and userSecret are required");
        }
        
        const response = await snaptrade.accountInformation.getAllUserHoldings({
          userId: userId!,
          userSecret: userSecret!
        });
        
        result = response.data;
        console.log("✅ Got holdings");
      }
      
      // ============================================================================
      // GET ACTIVITIES
      // ============================================================================
      
      else if (endpoint.includes('/activities')) {
        console.log("\n📜 Calling SDK: getActivities");
        
        if (!userId || !userSecret) {
          throw new Error("userId and userSecret are required");
        }
        
        const response = await snaptrade.transactionsAndReporting.getActivities({
          userId: userId!,
          userSecret: userSecret!,
          startDate: body?.startDate,
          endDate: body?.endDate,
          accounts: body?.accounts,
          brokerageAuthorizations: body?.brokerageAuthorizations,
          type: body?.type
        });
        
        result = response.data;
        console.log("✅ Got", result.length, "activities");
      }
      
      // ============================================================================
      // DELETE USER (for cleanup/reset)
      // ============================================================================
      
      else if (endpoint.includes('/snapTrade/deleteUser') || endpoint.includes('/deleteUser')) {
        const userIdToDelete = body?.userId || userId || user.id;
        
        console.log("\n🗑️ Calling SDK: deleteSnapTradeUser");
        console.log("  userId:", SafeLog.mask(userIdToDelete));
        
        try {
          const response = await snaptrade.authentication.deleteSnapTradeUser({
            userId: userIdToDelete
          });
          
          result = {
            status: 'deleted',
            detail: response.data?.detail || 'User queued for deletion; please wait for webhook for confirmation.',
            userId: SafeLog.mask(userIdToDelete)
          };
          
          console.log("✅ deleteUser SUCCESS");
          
        } catch (deleteError: any) {
          console.error("❌ Delete failed:", deleteError.message);
          
          // If user doesn't exist, that's okay
          if (deleteError.status === 404) {
            result = {
              status: 'not_found',
              detail: 'User does not exist in SnapTrade',
              userId: SafeLog.mask(userIdToDelete)
            };
          } else {
            throw deleteError;
          }
        }
      }
      
      // ============================================================================
      // LIST USERS (for debugging - consider restricting in production)
      // ============================================================================
      
      else if (endpoint.includes('/snapTrade/listUsers') || endpoint.includes('/listUsers')) {
        console.log("\n👥 Calling SDK: listSnapTradeUsers");
        
        // ⚠️ Consider restricting this to admin users only in production
        if (ENVIRONMENT === "production") {
          console.warn("⚠️ listUsers called in production - consider restricting access");
        }
        
        const response = await snaptrade.authentication.listSnapTradeUsers();
        
        result = response.data;
        console.log("✅ Got", result?.length || 0, "users");
      }
      
      // ============================================================================
      // FALLBACK
      // ============================================================================
      
      else {
        console.log("⚠️ Endpoint not implemented:", endpoint);
        return new Response(
          JSON.stringify({ 
            error: "Endpoint not implemented", 
            endpoint,
            method,
            availableEndpoints: [
              "GET  /test - Test API connection",
              "POST /snapTrade/registerUser - Register new user",
              "POST /snapTrade/login - Get OAuth URL",
              "GET  /brokerages - List available brokerages",
              "GET  /connections - List user connections",
              "DELETE /connections/{id} - Delete connection",
              "POST /connections/{id}/refresh - Refresh connection",
              "GET  /accounts - List accounts",
              "GET  /holdings - Get holdings",
              "GET  /activities - Get activities",
              "DELETE /snapTrade/deleteUser - Delete user",
              "GET  /snapTrade/listUsers - List all users"
            ]
          }),
          { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      SafeLog.response(200, !!result);

      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            ...getRateLimitHeaders(rateLimit),
            "Content-Type": "application/json" 
          } 
        }
      );

    } catch (sdkError: any) {
      SafeLog.error(sdkError, "SDK Operation");

      // ✅ Specific error handling for 401
      if (sdkError.status === 401) {
        console.error("\n🔍 AUTHENTICATION ERROR DETECTED!");
        console.error("─".repeat(80));
        
        if (sdkError.message?.includes('signature') || sdkError.body?.detail?.includes('signature')) {
          console.error("ERROR TYPE: Invalid Signature");
          console.error("CAUSE: Consumer Key is incorrect or expired");
          console.error("");
          console.error("ACTION REQUIRED:");
          console.error("1. Go to: https://app.snaptrade.com");
          console.error("2. Navigate to: Settings → API Keys");
          console.error("3. Click 'Regenerate Consumer Key'");
          console.error("4. Copy the new key (50 characters)");
          console.error("5. Update Supabase:");
          console.error("   supabase secrets set SNAPTRADE_CONSUMER_KEY=YOUR_NEW_KEY");
          console.error("6. Redeploy:");
          console.error("   supabase functions deploy snaptrade-proxy");
        }
        console.error("─".repeat(80));
      }

      return new Response(
        JSON.stringify({
          error: "SnapTrade SDK error",
          message: sdkError.message,
          status: sdkError.status,
          // 🔒 FIX-004: Don't expose full error body in production
          ...(ENVIRONMENT !== "production" && { details: sdkError.body }),
          hint: sdkError.status === 401 
            ? "Check your SnapTrade API credentials. See logs for details."
            : "An error occurred processing your request."
        }),
        { 
          status: sdkError.status || 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

  } catch (error: any) {
    SafeLog.error(error, "CRITICAL");
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        // 🔒 FIX-004: Don't expose error details in production
        message: ENVIRONMENT === "development" ? error.message : "An unexpected error occurred",
        hint: "Check Edge Function logs for details"
      }),
      { status: 500, headers: { ...getCorsHeaders(null), "Content-Type": "application/json" } }
    );
  }
});