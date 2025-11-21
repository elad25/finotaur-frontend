import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SNAPTRADE_BASE_URL = "https://api.snaptrade.com/api/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, OPTIONS"
};

// 🔍 DEBUG: Log environment variables
console.log("🔧 Environment check:");
console.log("  SNAPTRADE_CLIENT_ID:", SNAPTRADE_CLIENT_ID ? `${SNAPTRADE_CLIENT_ID.substring(0, 10)}... (length: ${SNAPTRADE_CLIENT_ID.length})` : "❌ MISSING");
console.log("  SNAPTRADE_CONSUMER_KEY:", SNAPTRADE_CONSUMER_KEY ? `${SNAPTRADE_CONSUMER_KEY.substring(0, 10)}... (length: ${SNAPTRADE_CONSUMER_KEY.length})` : "❌ MISSING");
console.log("  SUPABASE_URL:", SUPABASE_URL ? "✅" : "❌ MISSING");

/**
 * ✅ FIXED: Stringify that matches Python's json.dumps(separators=(",", ":"), sort_keys=True)
 */
function sortedStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, any> = {};
      Object.keys(value).sort().forEach(k => {
        sorted[k] = value[k];
      });
      return sorted;
    }
    return value;
  });
}

async function generateSignature(
  path: string,
  query: string,
  content: any
): Promise<string> {
  console.log("\n" + "=".repeat(80));
  console.log("🔐 SIGNATURE GENERATION - DETAILED DEBUG");
  console.log("=".repeat(80));
  
  // Step 1: Build signature object
  const sigObject: any = {};
  sigObject.content = content;
  
  // Remove /api/v1 prefix if exists
  const pathForSignature = path.startsWith('/api/v1') 
    ? path.substring(7)
    : path;
  
  sigObject.path = pathForSignature;
  sigObject.query = query;

  // Step 2: Stringify
  const sigContent = sortedStringify(sigObject);

  console.log("📋 Signature Components:");
  console.log("  1. Original path:", path);
  console.log("  2. Path for signature:", pathForSignature);
  console.log("  3. Query string:", query);
  console.log("  4. Content:", JSON.stringify(content, null, 2));
  console.log("  5. Final sigObject:", JSON.stringify(sigObject, null, 2));
  console.log("  6. Stringified (for HMAC):", sigContent);
  console.log("  7. Consumer Key (first 10 chars):", SNAPTRADE_CONSUMER_KEY?.substring(0, 10));

  // Step 3: HMAC-SHA256
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
  
  // Step 4: Base64 encode
  const base64Signature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );
  
  console.log("  8. Base64 signature:", base64Signature);
  console.log("  9. Signature length:", base64Signature.length);
  console.log("=".repeat(80) + "\n");
  
  return base64Signature;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log("\n" + "=".repeat(80));
  console.log("📥 NEW REQUEST TO SNAPTRADE PROXY");
  console.log("=".repeat(80));
  console.log("⏰ Timestamp:", new Date().toISOString());

  try {
    // Auth check
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

    const requestBody = await req.json();
    console.log("📦 Raw request body:", JSON.stringify(requestBody, null, 2));
    
    const { 
      endpoint, 
      method = "GET", 
      body = null,
      userId,
      userSecret 
    } = requestBody;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("\n📍 Parsed Request Details:");
    console.log("  endpoint:", endpoint);
    console.log("  method:", method);
    console.log("  userId:", userId || "NOT PROVIDED");
    console.log("  userSecret:", userSecret ? `${userSecret.substring(0, 15)}... (length: ${userSecret.length})` : "NOT PROVIDED");
    console.log("  body:", body ? JSON.stringify(body, null, 2) : "null");

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const basePath = endpoint.split('?')[0];
    
    const fullPath = basePath.startsWith('/api/v1') 
      ? basePath 
      : `/api/v1${basePath}`;
    
    const isRegisterUser = basePath.includes('registerUser') || endpoint.includes('registerUser');
    
    console.log("\n📌 Endpoint Analysis:");
    console.log("  basePath:", basePath);
    console.log("  fullPath:", fullPath);
    console.log("  isRegisterUser:", isRegisterUser);
    
    // Build query params
    const queryParams = new URLSearchParams({
      clientId: SNAPTRADE_CLIENT_ID!,
      timestamp: timestamp
    });
    
    let actualBody: any = null;
    
    if (isRegisterUser) {
      actualBody = body?.userId ? { userId: body.userId } : body;
      console.log("  📝 registerUser: userId in BODY:", body?.userId || '❌ MISSING');
    } else {
      if (userId) {
        console.log("  ✅ Adding userId to query:", userId);
        queryParams.set('userId', userId);
      } else {
        console.log("  ⚠️ NO userId provided for non-register endpoint!");
      }
      
      if (userSecret) {
        console.log("  ✅ Adding userSecret to query:", userSecret.substring(0, 15) + "...");
        queryParams.set('userSecret', userSecret);
      } else {
        console.log("  ⚠️ NO userSecret provided!");
      }
      
      actualBody = body;
    }
    
    const queryString = queryParams.toString();
    const fullUrl = `${SNAPTRADE_BASE_URL}${basePath}?${queryString}`;
    
    console.log("\n📤 Building SnapTrade Request:");
    console.log("  Full URL:", fullUrl);
    console.log("  Query string:", queryString);
    console.log("  Body:", actualBody ? JSON.stringify(actualBody, null, 2) : "null");

    // Generate signature
    const signature = await generateSignature(
      fullPath,
      queryString,
      actualBody
    );

    console.log("\n🚀 Sending to SnapTrade:");
    console.log("  URL:", fullUrl);
    console.log("  Method:", method);
    console.log("  Headers:", {
      "Content-Type": "application/json",
      "Signature": `${signature.substring(0, 20)}...`
    });

    const snaptradeResponse = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Signature": signature
      },
      body: actualBody ? JSON.stringify(actualBody) : undefined
    });

    const responseText = await snaptradeResponse.text();
    
    console.log("\n📥 Response from SnapTrade:");
    console.log("  Status:", snaptradeResponse.status, snaptradeResponse.statusText);
    console.log("  Headers:", Object.fromEntries(snaptradeResponse.headers.entries()));
    console.log("  Body:", responseText);
    console.log("=".repeat(80) + "\n");

    if (snaptradeResponse.ok) {
      return new Response(responseText, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Error response
    let errorDetails;
    try {
      errorDetails = JSON.parse(responseText);
    } catch {
      errorDetails = responseText;
    }

    return new Response(
      JSON.stringify({
        error: `SnapTrade API error: ${snaptradeResponse.status}`,
        status: snaptradeResponse.status,
        details: errorDetails
      }),
      { 
        status: snaptradeResponse.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("\n" + "=".repeat(80));
    console.error("❌ CRITICAL ERROR");
    console.error("=".repeat(80));
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("=".repeat(80) + "\n");
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});