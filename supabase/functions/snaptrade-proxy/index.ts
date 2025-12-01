// ✅ FULLY FIXED VERSION - Proper SnapTrade SDK authentication
// 🔧 Includes deleteUser support for cleanup
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Snaptrade } from "npm:snaptrade-typescript-sdk@9.0.152";

const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, OPTIONS"
};

console.log("🔧 SnapTrade Proxy - Environment Check:");
console.log("  CLIENT_ID:", SNAPTRADE_CLIENT_ID);
console.log("  CLIENT_ID length:", SNAPTRADE_CLIENT_ID?.length, "(should be 14)");
console.log("  CONSUMER_KEY length:", SNAPTRADE_CONSUMER_KEY?.length, "(should be 50)");

// ✅ CRITICAL: Validate credentials before initializing SDK
if (!SNAPTRADE_CLIENT_ID || SNAPTRADE_CLIENT_ID.length !== 14) {
  console.error("❌ Invalid SNAPTRADE_CLIENT_ID! Must be exactly 14 characters.");
  console.error("   Current:", SNAPTRADE_CLIENT_ID);
  console.error("   Length:", SNAPTRADE_CLIENT_ID?.length);
}

if (!SNAPTRADE_CONSUMER_KEY || SNAPTRADE_CONSUMER_KEY.length !== 50) {
  console.error("❌ Invalid SNAPTRADE_CONSUMER_KEY! Must be exactly 50 characters.");
  console.error("   Length:", SNAPTRADE_CONSUMER_KEY?.length);
}

// ✅ Initialize SnapTrade SDK
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log("\n" + "=".repeat(80));
  console.log("📥 NEW REQUEST");
  console.log("=".repeat(80));
  console.log("⏰ Time:", new Date().toISOString());
  console.log("🌐 URL:", req.url);
  console.log("📍 Method:", req.method);

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
      console.log("❌ Auth failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ User authenticated:", user.id);

    // ✅ Parse request
    const requestBody = await req.json();
    console.log("📦 Request body:", JSON.stringify(requestBody, null, 2));
    
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
    console.log("  userId:", userId || body?.userId || "NOT PROVIDED");
    console.log("  userSecret:", userSecret ? "PROVIDED" : "NOT PROVIDED");
    console.log("  isPublic:", isPublic);

    let result: any;

    try {
      // ============================================================================
      // TEST API STATUS
      // ============================================================================
      
      if (endpoint === '/test' || endpoint === 'test') {
        console.log("\n🧪 Testing API Status");
        
        try {
          const statusResponse = await snaptrade.apiStatus.check();
          console.log("✅ API Status check successful");
          
          result = {
            test: "success",
            apiStatus: statusResponse.data,
            timestamp: new Date().toISOString(),
            credentials: {
              clientIdLength: SNAPTRADE_CLIENT_ID?.length,
              consumerKeyLength: SNAPTRADE_CONSUMER_KEY?.length,
            }
          };
        } catch (testError: any) {
          console.error("❌ API Status test failed:", testError.message);
          throw testError;
        }
      }
      
      // ============================================================================
      // REGISTER USER
      // ============================================================================
      
      else if (endpoint.includes('/snapTrade/registerUser') || endpoint === '/snapTrade/registerUser') {
        const userIdToRegister = body?.userId || userId || user.id;
        
        console.log("\n📝 Calling SDK: registerSnapTradeUser");
        console.log("  userId:", userIdToRegister);
        
        try {
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
          console.log("  userId:", result.userId);
          console.log("  userSecret length:", result.userSecret?.length);
          
        } catch (regError: any) {
          console.error("❌ Registration failed:", regError.message);
          console.error("   Status:", regError.status);
          console.error("   Body:", JSON.stringify(regError.body, null, 2));
          throw regError;
        }
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
        console.log("  redirectURI:", result.redirectURI);
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
        console.log("  connectionId:", connectionId);
        
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
        console.log("  connectionId:", connectionId);
        
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
        console.log("  userId:", userIdToDelete);
        
        try {
          const response = await snaptrade.authentication.deleteSnapTradeUser({
            userId: userIdToDelete
          });
          
          result = {
            status: 'deleted',
            detail: response.data?.detail || 'User queued for deletion; please wait for webhook for confirmation.',
            userId: userIdToDelete
          };
          
          console.log("✅ deleteUser SUCCESS");
          
        } catch (deleteError: any) {
          console.error("❌ Delete failed:", deleteError.message);
          
          // If user doesn't exist, that's okay
          if (deleteError.status === 404) {
            result = {
              status: 'not_found',
              detail: 'User does not exist in SnapTrade',
              userId: userIdToDelete
            };
          } else {
            throw deleteError;
          }
        }
      }
      
      // ============================================================================
      // LIST USERS (for debugging)
      // ============================================================================
      
      else if (endpoint.includes('/snapTrade/listUsers') || endpoint.includes('/listUsers')) {
        console.log("\n👥 Calling SDK: listSnapTradeUsers");
        
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

      console.log("\n✅ REQUEST SUCCESSFUL!");
      console.log("=".repeat(80) + "\n");

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (sdkError: any) {
      console.error("\n" + "=".repeat(80));
      console.error("❌ SDK ERROR");
      console.error("=".repeat(80));
      console.error("Message:", sdkError.message);
      console.error("Status:", sdkError.status);
      
      if (sdkError.body) {
        console.error("Response Body:", JSON.stringify(sdkError.body, null, 2));
      }
      
      if (sdkError.response) {
        console.error("Response:", sdkError.response);
      }

      // ✅ Specific error handling
      if (sdkError.status === 401) {
        console.error("\n🔍 AUTHENTICATION ERROR DETECTED!");
        console.error("─".repeat(80));
        
        if (sdkError.message?.includes('signature') || sdkError.body?.detail?.includes('signature')) {
          console.error("ERROR TYPE: Invalid Signature");
          console.error("");
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
          console.error("");
          console.error("Current credentials:");
          console.error("  CLIENT_ID length:", SNAPTRADE_CLIENT_ID?.length, "/14");
          console.error("  CONSUMER_KEY length:", SNAPTRADE_CONSUMER_KEY?.length, "/50");
        } else {
          console.error("ERROR TYPE: Authentication Failed");
          console.error("CAUSE: Invalid Client ID or Consumer Key");
          console.error("");
          console.error("Verify your credentials match SnapTrade Dashboard");
        }
        
        console.error("=".repeat(80));
      }

      return new Response(
        JSON.stringify({
          error: "SnapTrade SDK error",
          message: sdkError.message,
          status: sdkError.status,
          details: sdkError.body || sdkError.message,
          hint: sdkError.status === 401 
            ? "Check your SnapTrade API credentials. See logs for details."
            : undefined
        }),
        { 
          status: sdkError.status || 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

  } catch (error: any) {
    console.error("\n" + "=".repeat(80));
    console.error("❌ CRITICAL ERROR");
    console.error("=".repeat(80));
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("=".repeat(80));
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error.message,
        hint: "Check Edge Function logs for details"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});