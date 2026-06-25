// supabase/functions/admin-impersonate/index.ts
// =====================================================
// ADMIN IMPERSONATE - Edge Function (true session swap)
// =====================================================
// Mints a REAL Supabase session for a target user so an admin can
// view the product exactly as that user sees it (1:1) for diagnostics.
//
// Security model:
//  - Caller must present a valid JWT (their own admin session).
//  - We verify the caller is role admin/super_admin (and not banned)
//    using the service-role client (RLS-independent, authoritative).
//  - The target must exist and must NOT be an admin/super_admin.
//  - We mint the session via auth.admin.generateLink({ type:'magiclink' }),
//    which generates a one-time token WITHOUT sending any email. The
//    frontend exchanges it with supabase.auth.verifyOtp() to become the
//    target. The target user's existing sessions are unaffected.
//  - Every start is written to admin_impersonation_sessions (audit).
//
// The service-role key NEVER reaches the browser — it lives only here.
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: Missing Authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client bound to the CALLER's token — used only to identify the caller.
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service-role client — authoritative checks + session minting + audit.
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Identify the caller from their JWT.
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) {
      throw new Error("Unauthorized: Invalid token");
    }

    // 2. Authoritatively verify the caller is an admin.
    const { data: adminProfile, error: adminErr } = await admin
      .from("profiles")
      .select("role, email, is_banned")
      .eq("id", caller.id)
      .single();

    if (adminErr || !adminProfile) {
      throw new Error("Unauthorized: Caller profile not found");
    }
    if (adminProfile.is_banned || !["admin", "super_admin"].includes(adminProfile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // 3. Parse + validate the target.
    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body?.target_user_id;
    if (!targetUserId) {
      throw new Error("target_user_id is required");
    }
    if (targetUserId === caller.id) {
      throw new Error("Cannot impersonate yourself");
    }

    const { data: target, error: targetErr } = await admin
      .from("profiles")
      .select("id, email, display_name, role")
      .eq("id", targetUserId)
      .single();

    if (targetErr || !target) {
      throw new Error("Target user not found");
    }
    if (["admin", "super_admin"].includes(target.role)) {
      throw new Error("Cannot impersonate another admin");
    }
    if (!target.email) {
      throw new Error("Target user has no email — cannot mint a session");
    }

    // 4. Mint a real one-time token for the target (no email is sent).
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: target.email,
    });

    const tokenHash = linkData?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      throw new Error(`Failed to mint session: ${linkError?.message || "no token returned"}`);
    }

    // 5. Audit row (best-effort — never block the swap on logging).
    const sessionToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
    const expiresAt = new Date(Date.now() + TWO_HOURS_MS).toISOString();

    const { error: auditErr } = await admin.from("admin_impersonation_sessions").insert({
      admin_id: caller.id,
      impersonated_user_id: target.id,
      session_token: sessionToken,
      expires_at: expiresAt,
      impersonated_user_email: target.email,
      impersonated_user_name: target.display_name || target.email,
      admin_email: adminProfile.email,
      is_active: true,
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    });
    if (auditErr) {
      console.warn("Impersonation audit insert failed:", auditErr.message);
    }

    console.log(`🎭 ${adminProfile.email} → impersonating ${target.email} (${target.id})`);

    return new Response(
      JSON.stringify({
        success: true,
        token_hash: tokenHash,
        verification_type: linkData?.properties?.verification_type || "magiclink",
        session_token: sessionToken,
        target: {
          id: target.id,
          email: target.email,
          name: target.display_name || target.email,
        },
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("admin-impersonate error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: message.includes("Unauthorized") ? 401 : 400,
      },
    );
  }
});
