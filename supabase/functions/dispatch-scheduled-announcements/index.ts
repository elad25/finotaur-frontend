// =====================================================
// Supabase Edge Function: dispatch-scheduled-announcements
// =====================================================
// Called by pg_cron (every minute, see
// supabase/migrations/README_announcements_cron.md). Picks up any admin
// announcement whose scheduled_at has arrived and dispatches it via
// _shared/dispatchAnnouncement.ts.
// Deploy: supabase functions deploy dispatch-scheduled-announcements --no-verify-jwt
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { dispatchAnnouncement } from "../_shared/dispatchAnnouncement.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  try {
    // ---- Auth: CRON_SECRET query param OR service-role Authorization header ----
    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    const cronSecret = Deno.env.get("CRON_SECRET");

    const authHeader = req.headers.get("Authorization");
    const hasValidSecret = !!cronSecret && secretParam === cronSecret;
    const hasServiceRole = !!supabaseKey && !!authHeader?.includes(supabaseKey);

    if (!hasValidSecret && !hasServiceRole) {
      console.log("⚠️ Unauthorized dispatch-scheduled-announcements attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Find due scheduled announcements ----
    const { data: due, error: dueError } = await supabaseAdmin
      .from("update_center_notifications")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (dueError) {
      throw new Error(`Failed to query scheduled announcements: ${dueError.message}`);
    }

    const ids: string[] = (due ?? []).map((row: { id: string }) => row.id);
    const errors: Array<{ id: string; error: string }> = [];
    let processed = 0;

    for (const id of ids) {
      try {
        await dispatchAnnouncement(supabaseAdmin, id);
        processed++;
      } catch (err) {
        console.error(`Failed to dispatch scheduled announcement ${id}:`, err);
        errors.push({ id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, total: ids.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("dispatch-scheduled-announcements error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
