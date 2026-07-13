// =====================================================
// Supabase Edge Function: publish-announcement
// =====================================================
// Admin-only. Creates an admin announcement (update_center_notifications
// row) and either dispatches it immediately (in-app + email fan-out via
// _shared/dispatchAnnouncement.ts) or, when scheduled_at is in the future,
// leaves it in status='scheduled' for dispatch-scheduled-announcements to
// pick up.
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { dispatchAnnouncement } from "../_shared/dispatchAnnouncement.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Finotaur <noreply@finotaur.com>";

interface PublishAnnouncementRequest {
  title: string;
  message: string;
  channels: string[];
  audience_filter: Record<string, boolean>;
  scheduled_at?: string | null;
  priority?: string;
  test_email?: string;
}

const ALLOWED_CHANNELS = ["inapp", "email"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Helper: JSON response with a specific HTTP status.
  const fail = (status: number, error: string) =>
    new Response(
      JSON.stringify({ success: false, error }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  try {
    // ---- Auth: admin only ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return fail(401, "No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return fail(401, "Unauthorized");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return fail(403, "Admin access required");
    }

    // ---- Parse + validate body ----
    const body: PublishAnnouncementRequest = await req.json();
    const { title, message, channels, audience_filter, scheduled_at, priority, test_email } = body;

    if (!title || !title.trim()) {
      return fail(400, "title is required");
    }

    if (!Array.isArray(channels) || channels.length === 0) {
      return fail(400, "channels must be a non-empty array");
    }

    if (channels.some((c) => !ALLOWED_CHANNELS.includes(c))) {
      return fail(400, `channels must be a subset of ${JSON.stringify(ALLOWED_CHANNELS)}`);
    }

    if (!audience_filter || typeof audience_filter !== "object" || Array.isArray(audience_filter)) {
      return fail(400, "audience_filter must be an object");
    }

    if (!Object.values(audience_filter).some((v) => v === true)) {
      return fail(400, "audience_filter must have at least one true key");
    }

    // ---- Test send: single email, no DB writes ----
    if (test_email) {
      const personalizedBody = (message ?? "")
        .replace(/\{\{name\}\}/g, "Test User")
        .replace(/\{\{email\}\}/g, test_email)
        .replace(/\{\{plan\}\}/g, "Test");

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [test_email],
          subject: title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #0A0A0A; padding: 20px; text-align: center;">
                <img src="https://finotaur.com/logo.png" alt="Finotaur" style="height: 40px;" />
              </div>
              <div style="padding: 30px; background: #1A1A1A; color: #F4F4F4;">
                ${personalizedBody.replace(/\n/g, "<br>")}
              </div>
              <div style="background: #0A0A0A; padding: 20px; text-align: center; color: #808080; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Finotaur. All rights reserved.</p>
                <p><a href="https://finotaur.com/unsubscribe?email=${encodeURIComponent(test_email)}" style="color: #C9A646;">Unsubscribe</a></p>
              </div>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to send test email: ${errText}`);
      }

      return new Response(
        JSON.stringify({ success: true, test: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Determine immediate vs scheduled ----
    const isFuture = !!scheduled_at && new Date(scheduled_at).getTime() > Date.now() + 30000;

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("update_center_notifications")
      .insert({
        title,
        message,
        type: "announcement",
        category: "announcement",
        is_admin_generated: true,
        visibility: "live",
        priority: priority ?? "normal",
        channels,
        audience_filter,
        scheduled_at: scheduled_at ?? null,
        created_by: user.id,
        status: isFuture ? "scheduled" : "sent",
        published_at: isFuture ? scheduled_at : new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      throw new Error(`Failed to create announcement: ${insertError?.message ?? "no row returned"}`);
    }

    const id: string = inserted.id;

    if (isFuture) {
      return new Response(
        JSON.stringify({ success: true, scheduled: true, id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const counts = await dispatchAnnouncement(supabaseAdmin, id);

    return new Response(
      JSON.stringify({ success: true, sent: true, id, counts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("publish-announcement error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
