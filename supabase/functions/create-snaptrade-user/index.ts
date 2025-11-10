// supabase/functions/create-snaptrade-user/index.ts
// WORKAROUND VERSION - for Pay-as-you-go plans without registerUser access
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🚀 [Create SnapTrade User - WORKAROUND] Starting...");

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      throw new Error("Unauthorized");
    }

    console.log("✅ User authenticated:", user.id);

    // Check if user already exists
    const { data: existing } = await supabase
      .from("snaptrade_users")
      .select("snaptrade_user_id, snaptrade_user_secret")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      console.log("✅ User already has SnapTrade credentials");
      return new Response(
        JSON.stringify({
          userId: existing.snaptrade_user_id,
          userSecret: existing.snaptrade_user_secret,
          alreadyExists: true,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // WORKAROUND: Since registerUser is not available in Pay-as-you-go,
    // we create a placeholder entry that will work with the OAuth flow
    const snaptradeUserId = `finotaur_${user.id}`;
    
    console.log("⚠️ WORKAROUND MODE: Creating placeholder credentials");
    console.log("📝 User ID:", snaptradeUserId);
    console.log("ℹ️  User will need to complete OAuth connection");

    // Generate a placeholder secret
    // This will be replaced when the user completes the OAuth flow
    const placeholderSecret = crypto.randomUUID();

    // Save to database
    const { error: insertError } = await supabase
      .from("snaptrade_users")
      .insert({
        user_id: user.id,
        snaptrade_user_id: snaptradeUserId,
        snaptrade_user_secret: placeholderSecret,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("❌ Failed to save to database:", insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }

    console.log("✅ Placeholder credentials saved");
    console.log("ℹ️  User should now proceed with broker connection");

    return new Response(
      JSON.stringify({
        userId: snaptradeUserId,
        userSecret: placeholderSecret,
        isPlaceholder: true,
        message: "Credentials created. Please connect your broker to complete setup.",
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("💥 Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to create user",
        details: error.stack,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});