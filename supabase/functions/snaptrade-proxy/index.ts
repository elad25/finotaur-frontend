// supabase/functions/snaptrade-proxy/index.ts
// ✅ SIMPLE & WORKING VERSION - Always includes clientId and timestamp
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

// Generate HMAC-SHA256 signature using SnapTrade's format
async function generateSignature(
  path: string,
  query: string,
  body: any
): Promise<string> {
  const sigObject = {
    content: body || {},
    path: path,
    query: query
  };
  
  const sigContent = JSON.stringify(sigObject);
  console.log("📝 Signature content:", sigContent.substring(0, 300));
  
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
    encoder.encode(sigContent)
  );

  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  return base64Signature;
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

    console.log("📍 Original endpoint:", endpoint);
    console.log("🔧 Method:", method);

    // ✅ SIMPLE APPROACH: Always add clientId and timestamp
    const timestamp = new Date().toISOString();
    
    // Split path and query
    const [basePath, existingQuery] = endpoint.split('?');
    
    // Build complete query string
    let allParams = existingQuery || '';
    
    // Add clientId if not present
    if (!allParams.includes('clientId=')) {
      allParams += (allParams ? '&' : '') + `clientId=${SNAPTRADE_CLIENT_ID}`;
    }
    
    // Add timestamp if not present
    if (!allParams.includes('timestamp=')) {
      allParams += (allParams ? '&' : '') + `timestamp=${timestamp}`;
    }
    
    console.log("📍 Base path:", basePath);
    console.log("📍 Query string for signature:", allParams);
    
    // Build full URL
    const fullUrl = `${SNAPTRADE_BASE_URL}${basePath}?${allParams}`;
    console.log("🌐 Full URL:", fullUrl);

    // Parse body if needed
    let bodyObject = body;
    if (typeof body === 'string' && body) {
      try {
        bodyObject = JSON.parse(body);
      } catch (e) {
        // Keep as is
      }
    }

    // Generate signature
    const signature = await generateSignature(basePath, allParams, bodyObject);
    console.log("🔐 Signature generated (length:", signature.length, ")");
    console.log("📤 Calling SnapTrade API...");
    
    // Make request to SnapTrade
    const snaptradeResponse = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Signature": signature,
      },
      body: method !== "GET" && body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });

    const responseText = await snaptradeResponse.text();
    console.log("📥 Response Status:", snaptradeResponse.status);
    console.log("📄 Response Preview:", responseText.substring(0, 200));

    // Check if response is OK (200-299)
    if (snaptradeResponse.ok) {
      console.log("✅ Success!");
      console.log("=".repeat(50) + "\n");
      
      return new Response(responseText, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Response is NOT OK - handle errors
    console.error("❌ SnapTrade API error");

    // Check if response is HTML error page
    if (responseText.trim().startsWith("<!doctype") || responseText.trim().startsWith("<html")) {
      console.error("❌ Received HTML error page (endpoint not found)");
      return new Response(
        JSON.stringify({
          error: "SnapTrade API endpoint not found",
          status: snaptradeResponse.status,
          endpoint: endpoint,
          hint: "This endpoint may not be available in your SnapTrade plan.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Try to parse error JSON
    let errorDetails = responseText;
    try {
      const errorJson = JSON.parse(responseText);
      errorDetails = JSON.stringify(errorJson, null, 2);
    } catch (e) {
      // Keep as text
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