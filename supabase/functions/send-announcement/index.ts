import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resend API (או כל שירות מייל אחר)
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Finotaur <noreply@finotaur.com>";

interface AnnouncementRequest {
  subject: string;
  body: string;
  recipients: {
    // Journal
    journal_all?: boolean;
    journal_premium?: boolean;
    journal_basic?: boolean;
    journal_free?: boolean;
    journal_trial?: boolean;
    // Newsletter
    newsletter_all?: boolean;
    newsletter_paid?: boolean;
    newsletter_trial?: boolean;
    newsletter_topsecret_discount?: boolean;
    // Top Secret
    topsecret_all?: boolean;
    topsecret_paid?: boolean;
    topsecret_trial?: boolean;
    topsecret_month_1_2?: boolean;
    topsecret_month_3_plus?: boolean;
    // Platform
    platform_all?: boolean;
    platform_core?: boolean;
    platform_pro?: boolean;
    platform_enterprise?: boolean;
    // Special
    all_users?: boolean;
    all_paying?: boolean;
    all_trials?: boolean;
    cancelled_winback?: boolean;
    active_this_week?: boolean;
    inactive_30_days?: boolean;
  };
  test_email?: string; // For test sends
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      throw new Error("Admin access required");
    }

    const body: AnnouncementRequest = await req.json();
    const { subject, body: emailBody, recipients, test_email } = body;

    // If test email, send only to that address
    if (test_email) {
      const result = await sendEmail(test_email, subject, emailBody, { name: "Test User", email: test_email, plan: "Test" });
      return new Response(
        JSON.stringify({ success: true, sent: 1, test: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query based on recipients
    const emails = await getRecipientEmails(supabase, recipients);

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No recipients found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send emails in batches
    let sent = 0;
    let failed = 0;
    const batchSize = 50;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(user => sendEmail(user.email, subject, emailBody, user))
      );

      results.forEach(result => {
        if (result.status === "fulfilled") sent++;
        else failed++;
      });

      // Small delay between batches to avoid rate limits
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Log the announcement
    await supabase.from("announcement_logs").insert({
      sent_by: user.id,
      subject,
      body: emailBody,
      recipients_count: sent,
      failed_count: failed,
      recipient_filters: recipients,
    });

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: emails.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getRecipientEmails(supabase: any, recipients: AnnouncementRequest["recipients"]) {
  const conditions: string[] = [];

  // Journal conditions
  if (recipients.journal_all) {
    conditions.push(`(account_type IS NOT NULL AND account_type != 'free')`);
  } else {
    if (recipients.journal_premium) conditions.push(`account_type = 'premium'`);
    if (recipients.journal_basic) conditions.push(`account_type = 'basic'`);
    if (recipients.journal_free) conditions.push(`(account_type IS NULL OR account_type = 'free')`);
    if (recipients.journal_trial) conditions.push(`subscription_status = 'trial'`);
  }

  // Newsletter conditions
  if (recipients.newsletter_all) {
    conditions.push(`newsletter_status IN ('active', 'trial')`);
  } else {
    if (recipients.newsletter_paid) conditions.push(`newsletter_status = 'active'`);
    if (recipients.newsletter_trial) conditions.push(`newsletter_status = 'trial'`);
    // TopSecret discount - users with both newsletter and top_secret
    if (recipients.newsletter_topsecret_discount) {
      conditions.push(`(newsletter_status = 'active' AND top_secret_status = 'active')`);
    }
  }

  // Top Secret conditions
  if (recipients.topsecret_all) {
    conditions.push(`top_secret_status IN ('active', 'trial')`);
  } else {
    if (recipients.topsecret_paid) conditions.push(`top_secret_status = 'active'`);
    if (recipients.topsecret_trial) conditions.push(`top_secret_status = 'trial'`);
    // Month 1-2 vs Month 3+ would need additional date logic
    if (recipients.topsecret_month_1_2) {
      conditions.push(`(top_secret_status = 'active' AND top_secret_started_at > NOW() - INTERVAL '60 days')`);
    }
    if (recipients.topsecret_month_3_plus) {
      conditions.push(`(top_secret_status = 'active' AND top_secret_started_at <= NOW() - INTERVAL '60 days')`);
    }
  }

  // Platform conditions
  if (recipients.platform_all) {
    conditions.push(`platform_plan IN ('core', 'pro', 'enterprise')`);
  } else {
    if (recipients.platform_core) conditions.push(`platform_plan = 'core'`);
    if (recipients.platform_pro) conditions.push(`platform_plan = 'pro'`);
    if (recipients.platform_enterprise) conditions.push(`platform_plan = 'enterprise'`);
  }

  // Special groups
  if (recipients.all_users) {
    conditions.push(`1=1`); // Everyone
  }
  if (recipients.all_paying) {
    conditions.push(`(
      (subscription_status = 'active' AND account_type IN ('basic', 'premium'))
      OR newsletter_status = 'active'
      OR top_secret_status = 'active'
      OR platform_plan IN ('core', 'pro', 'enterprise')
    )`);
  }
  if (recipients.all_trials) {
    conditions.push(`(
      subscription_status = 'trial'
      OR newsletter_status = 'trial'
      OR platform_is_in_trial = true
    )`);
  }
  if (recipients.cancelled_winback) {
    conditions.push(`(
      subscription_status = 'cancelled'
      OR newsletter_status = 'cancelled'
      OR top_secret_status = 'cancelled'
    )`);
  }
  if (recipients.active_this_week) {
    conditions.push(`last_login_at > NOW() - INTERVAL '7 days'`);
  }
  if (recipients.inactive_30_days) {
    conditions.push(`(last_login_at < NOW() - INTERVAL '30 days' OR last_login_at IS NULL)`);
  }

  // If no conditions, return empty
  if (conditions.length === 0) {
    return [];
  }

  // Build the query
  const whereClause = conditions.join(" OR ");
  
  const { data, error } = await supabase
    .from("profiles")
    .select("email, display_name, account_type")
    .filter("is_banned", "neq", true)
    .not("email", "is", null);

  if (error) {
    console.error("Query error:", error);
    return [];
  }

  // For complex OR conditions, we might need to use RPC
  // For now, let's use a simpler approach with the RPC function
  const { data: recipients_data, error: rpc_error } = await supabase
    .rpc("get_announcement_recipients", { 
      p_filters: recipients 
    });

  if (rpc_error) {
    console.error("RPC error:", rpc_error);
    // Fallback to basic query
    return data || [];
  }

  return recipients_data || [];
}

async function sendEmail(
  to: string, 
  subject: string, 
  body: string, 
  user: { name?: string; email: string; plan?: string }
) {
  // Replace variables in the email
  let personalizedBody = body
    .replace(/\{\{name\}\}/g, user.name || "Valued Member")
    .replace(/\{\{email\}\}/g, user.email)
    .replace(/\{\{plan\}\}/g, user.plan || "Free");

  // Send via Resend
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: subject,
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
            <p><a href="https://finotaur.com/unsubscribe?email=${encodeURIComponent(to)}" style="color: #C9A646;">Unsubscribe</a></p>
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}