// supabase/functions/test-snaptrade/index.ts
// Simple test to see what SnapTrade endpoints are available

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SNAPTRADE_CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID")!;
const SNAPTRADE_CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(content));
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("\n🧪 TESTING SNAPTRADE API ENDPOINTS");

  const results: any[] = [];

  // Test different endpoints
  const endpointsToTest = [
    { path: "/brokerages", method: "GET" },
    { path: "/snapTrade/listBrokerages", method: "GET" },
    { path: "/snap_trade/list_brokerages", method: "GET" },
    { path: "/partners", method: "GET" },
  ];

  for (const endpoint of endpointsToTest) {
    try {
      const timestamp = new Date().toISOString();
      const fullEndpoint = `${endpoint.path}?clientId=${SNAPTRADE_CLIENT_ID}&timestamp=${timestamp}`;
      const url = `https://api.snaptrade.com/api/v1${fullEndpoint}`;
      
      const signature = await generateSignature(endpoint.path, SNAPTRADE_CLIENT_ID, timestamp, "");
      
      console.log(`\n📍 Testing: ${endpoint.method} ${endpoint.path}`);
      
      const response = await fetch(url, {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
          "Signature": signature,
        },
      });

      const text = await response.text();
      
      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: response.status,
        success: response.ok,
        isHtml: text.trim().startsWith("<!doctype") || text.trim().startsWith("<html"),
        preview: text.substring(0, 200),
      });

      console.log(`Status: ${response.status} - ${response.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
      
    } catch (error: any) {
      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        error: error.message,
      });
      console.log(`Error: ${error.message}`);
    }
  }

  return new Response(
    JSON.stringify({
      message: "SnapTrade API Test Results",
      clientId: SNAPTRADE_CLIENT_ID,
      results,
    }, null, 2),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});