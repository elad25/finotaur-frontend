// supabase/functions/snaptrade-proxy/index.ts
// FIXED VERSION - Proper SnapTrade API integration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID")!;
const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SNAPTRADE_BASE_URL = "https://api.snaptrade.com/api/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, OPTIONS",
};

// Generate HMAC-SHA256 signature
async function generateSignature(
  endpoint: string,
  clientId: string,
  timestamp: string,
  body: string
): Promise<string> {
  const content = `${endpoint}${clientId}${timestamp}${body}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SNAPTRADE_CONSUMER_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(content)
  );

  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("\n🔵 ========== SNAPTRADE PROXY REQUEST ==========");

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      throw new Error("Invalid authentication");
    }

    console.log("✅ User authenticated:", user.id);

    // Parse request
    const requestBody = await req.json();
    let { endpoint, method = "GET", body = null } = requestBody;

    if (!endpoint) {
      throw new Error("Missing endpoint parameter");
    }

    console.log("📍 Endpoint:", endpoint);
    console.log("🔧 Method:", method);
    console.log("📦 Body:", body ? JSON.stringify(body).substring(0, 100) : "none");

    // Build URL
    const timestamp = new Date().toISOString();
    
    // Add query params
    let fullEndpoint = endpoint;
    const separator = endpoint.includes("?") ? "&" : "?";
    fullEndpoint += `${separator}clientId=${SNAPTRADE_CLIENT_ID}&timestamp=${timestamp}`;
    
    const fullUrl = `${SNAPTRADE_BASE_URL}${fullEndpoint}`;
    console.log("🌐 Full URL:", fullUrl);

    // Generate signature (use ORIGINAL endpoint without clientId/timestamp)
    const bodyString = body ? JSON.stringify(body) : "";
    const signature = await generateSignature(
      endpoint,
      SNAPTRADE_CLIENT_ID,
      timestamp,
      bodyString
    );

    console.log("🔐 Signature generated");
    console.log("📤 Calling SnapTrade API...");
    
    // Make request to SnapTrade
    const snaptradeResponse = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Signature": signature,
      },
      body: method !== "GET" && body ? bodyString : undefined,
    });

    const responseText = await snaptradeResponse.text();
    console.log("📥 Response Status:", snaptradeResponse.status);
    console.log("📄 Response Preview:", responseText.substring(0, 200));

    // Check if response is HTML error page
    if (responseText.trim().startsWith("<!doctype") || responseText.trim().startsWith("<html")) {
      console.error("❌ Received HTML error page (endpoint not found)");
      return new Response(
        JSON.stringify({
          error: "SnapTrade API endpoint not found",
          status: snaptradeResponse.status,
          endpoint: endpoint,
          hint: "This endpoint may not be available in your SnapTrade plan. Pay-as-you-go plans have limited endpoints.",
          details: "Contact SnapTrade support to verify which endpoints are available in your plan.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle non-OK responses
    if (!snaptradeResponse.ok) {
      console.error("❌ SnapTrade API error");
      
      let errorDetails = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch (e) {
        // Keep as text if not JSON
      }
      
      return new Response(
        JSON.stringify({
          error: `SnapTrade API error: ${snaptradeResponse.status}`,
          status: snaptradeResponse.status,
          details: errorDetails,
          endpoint: endpoint,
        }),
        {
          status: snaptradeResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Success!");
    console.log("=".repeat(50) + "\n");
    
    return new Response(responseText, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Proxy Error:", error);
    console.error("Stack:", error.stack);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        stack: error.stack,
        hint: "Check Supabase Edge Function logs for details",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});