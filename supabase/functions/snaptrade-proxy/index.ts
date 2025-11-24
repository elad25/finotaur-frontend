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
 * ✅ FIXED: Deep recursive sorting that matches SnapTrade's signature algorithm
 */
function sortedStringify(obj: any): string {
  if (obj === null) {
    return 'null';
  }
  
  if (obj === undefined) {
    return 'null';
  }
  
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return JSON.stringify(obj);
  }
  
  // Deep sort all keys recursively
  const sortObject = (o: any): any => {
    if (o === null || o === undefined) {
      return o;
    }
    
    if (Array.isArray(o)) {
      return o.map(sortObject);
    }
    
    if (typeof o === 'object') {
      const sorted: Record<string, any> = {};
      Object.keys(o).sort().forEach(k => {
        sorted[k] = sortObject(o[k]);
      });
      return sorted;
    }
    
    return o;
  };
  
  const sorted = sortObject(obj);
  return JSON.stringify(sorted);
}

/**
 * ✅ NEW: Build query string with alphabetically sorted keys
 */
function buildSortedQueryString(params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  const parts: string[] = [];
  
  for (const key of sortedKeys) {
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
  }
  
  return parts.join('&');
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

  // Step 2: Stringify with deep sorting
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
      userSecret,
      isPublic = false 
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
    console.log("  isPublic:", isPublic);
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
    
    // ✅ FIXED: Build query params as object first
    // For registerUser, we need special handling - clientId and timestamp are ONLY for signature!
    const queryParamsObj: Record<string, string> = {};
    
    // These are for signature calculation only
    const signatureParams: Record<string, string> = {
      clientId: SNAPTRADE_CLIENT_ID!,
      timestamp: timestamp
    };
    
    let actualBody: any = null;
    
    if (isRegisterUser) {
      // ✅ CRITICAL FIX: For registerUser, ALL params go in both URL and signature
      if (body?.userId) {
        queryParamsObj.userId = body.userId;
        queryParamsObj.clientId = SNAPTRADE_CLIENT_ID!;
        queryParamsObj.timestamp = timestamp;
        
        // Signature uses same params
        signatureParams.userId = body.userId;
        
        console.log("  📝 registerUser: userId in QUERY:", body.userId);
        console.log("  📝 registerUser: all params in URL");
      } else {
        console.log("  ❌ registerUser: NO userId in body!");
      }
      actualBody = null;  // ✅ No body for registerUser!
    } else if (!isPublic) {
      // Only add credentials for non-public endpoints
      // ✅ For non-registerUser endpoints, add clientId and timestamp to query
      queryParamsObj.clientId = SNAPTRADE_CLIENT_ID!;
      queryParamsObj.timestamp = timestamp;
      
      if (userId) {
        console.log("  ✅ Adding userId to query:", userId);
        queryParamsObj.userId = userId;
      } else {
        console.log("  ⚠️ NO userId provided for non-register endpoint!");
      }
      
      if (userSecret) {
        console.log("  ✅ Adding userSecret to query:", userSecret.substring(0, 15) + "...");
        queryParamsObj.userSecret = userSecret;
      } else {
        console.log("  ⚠️ NO userSecret provided!");
      }
      
      // Signature params are same as query params for non-registerUser
      Object.assign(signatureParams, queryParamsObj);
      
      actualBody = body;
    } else {
      console.log("  🌐 PUBLIC endpoint - no credentials needed");
      // ✅ Public endpoints also get clientId and timestamp
      queryParamsObj.clientId = SNAPTRADE_CLIENT_ID!;
      queryParamsObj.timestamp = timestamp;
      Object.assign(signatureParams, queryParamsObj);
      actualBody = body;
    }
    
    // ✅ FIXED: Use sorted query string builder
    const queryString = buildSortedQueryString(queryParamsObj);
    
    // ✅ CRITICAL: For signature, use signatureParams (which includes clientId/timestamp)
    const signatureQueryString = buildSortedQueryString(signatureParams);
    
    const fullUrl = `${SNAPTRADE_BASE_URL}${basePath}?${queryString}`;
    
    console.log("\n📤 Building SnapTrade Request:");
    console.log("  Full URL:", fullUrl);
    console.log("  Query string (for URL):", queryString);
    console.log("  Query string (for SIGNATURE):", signatureQueryString);
    console.log("  Query params object:", JSON.stringify(queryParamsObj, null, 2));
    console.log("  Signature params object:", JSON.stringify(signatureParams, null, 2));
    console.log("  Body:", actualBody ? JSON.stringify(actualBody, null, 2) : "null");

    // Generate signature using signatureQueryString
    const signature = await generateSignature(
      fullPath,
      signatureQueryString,  // ✅ Use signature query string!
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
    
    // ✅ CRITICAL DEBUG: Check if response has userSecret
    if (isRegisterUser && snaptradeResponse.ok) {
      try {
        const parsed = JSON.parse(responseText);
        console.log("\n🔍 PARSED RESPONSE for registerUser:");
        console.log("  Type:", Array.isArray(parsed) ? 'Array' : typeof parsed);
        console.log("  Keys:", Object.keys(parsed));
        console.log("  Has userId:", !!parsed.userId);
        console.log("  Has userSecret:", !!parsed.userSecret);
        console.log("  userSecret value:", parsed.userSecret || 'MISSING!');
        console.log("  Full object:", JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.error("  ❌ Failed to parse response:", e);
      }
    }
    
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