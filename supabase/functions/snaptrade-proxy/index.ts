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

function sortedStringify(obj: any): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(sortedStringify).join(',') + ']';
  
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => `"${key}":${sortedStringify(obj[key])}`);
  return '{' + pairs.join(',') + '}';
}

async function generateSignature(
  path: string,
  query: string,
  content: any
): Promise<string> {
  const sigObject: any = {};
  sigObject.content = content;
  
  // ✅ CRITICAL FIX: SnapTrade expects path WITHOUT /api/v1 prefix in signature!
  const pathForSignature = path.startsWith('/api/v1') 
    ? path.substring(7)  // Remove '/api/v1' prefix
    : path;
  
  sigObject.path = pathForSignature;
  sigObject.query = query;

  const sigContent = sortedStringify(sigObject);

  console.log("🔐 Signature generation:");
  console.log("  Original path:", path);
  console.log("  Path for signature:", pathForSignature);
  console.log("  Sig string:", sigContent);

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
  
  const base64Signature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );
  
  console.log("  Base64 signature:", base64Signature.substring(0, 30) + "...");
  
  return base64Signature;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log("\n" + "=".repeat(80));
  console.log("📥 NEW REQUEST");
  console.log("=".repeat(80));

  try {
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
    
    // ✅ FIX: Extract userId and userSecret from ROOT of request body
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

    console.log("\n📍 Request Details:");
    console.log("  Endpoint:", endpoint);
    console.log("  Method:", method);
    console.log("  Has userId:", !!userId);
    console.log("  Has userSecret:", !!userSecret);
    console.log("  Body:", body ? JSON.stringify(body, null, 2) : "null");

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const basePath = endpoint.split('?')[0];
    
    const fullPath = basePath.startsWith('/api/v1') 
      ? basePath 
      : `/api/v1${basePath}`;
    
    // ✅ Check if this is registerUser endpoint (doesn't need userSecret)
    const isRegisterUser = basePath.includes('registerUser') || endpoint.includes('registerUser');
    
    console.log(`📌 Endpoint type: ${isRegisterUser ? 'REGISTER USER (no userSecret needed)' : 'REGULAR'}`);
    console.log(`   basePath: ${basePath}, endpoint: ${endpoint}`);
    
    // Build query params
    const queryParams = new URLSearchParams({
      clientId: SNAPTRADE_CLIENT_ID!,
      timestamp: timestamp
    });
    
    // ✅ CRITICAL: For registerUser, userId goes in BODY, not query!
    let actualBody: any = null;
    
    if (isRegisterUser) {
      // For registerUser: userId MUST be in body, NEVER in query
      actualBody = body?.userId ? { userId: body.userId } : body;
      console.log("  ✅ registerUser: userId in BODY:", body?.userId || 'missing!');
      // Do NOT add userId or userSecret to query params for registerUser
    } else {
      // For other endpoints: userId/userSecret in query, other data in body
      if (userId) {
        console.log("  ✅ Adding userId to query:", userId);
        queryParams.set('userId', userId);
      }
      
      if (userSecret) {
        console.log("  ✅ Adding userSecret to query:", userSecret.substring(0, 10) + "...");
        queryParams.set('userSecret', userSecret);
      }
      
      actualBody = body;
    }
    
    const queryString = queryParams.toString();
    const fullUrl = `${SNAPTRADE_BASE_URL}${basePath}?${queryString}`;
    
    console.log("\n📤 Building SnapTrade request:");
    console.log("  Full path:", fullPath);
    console.log("  Query string:", queryString);
    console.log("  Body:", actualBody ? JSON.stringify(actualBody, null, 2) : "null");

    // Generate signature
    const signature = await generateSignature(
      fullPath,
      queryString,
      actualBody
    );

    console.log("\n🔑 Request to SnapTrade:");
    console.log("  URL:", fullUrl);
    console.log("  Method:", method);
    console.log("  Body:", body ? JSON.stringify(body) : "null");
    console.log("  Signature:", signature.substring(0, 30) + "...");
    console.log("\n⏳ Sending...");

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
    console.log("  Body:", responseText.substring(0, 500));
    console.log("=".repeat(80) + "\n");

    if (snaptradeResponse.ok) {
      return new Response(responseText, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({
        error: `SnapTrade API error: ${snaptradeResponse.status}`,
        status: snaptradeResponse.status,
        details: responseText
      }),
      { 
        status: snaptradeResponse.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("❌ Function error:", error);
    console.log("=".repeat(80) + "\n");
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});