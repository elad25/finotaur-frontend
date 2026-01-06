// supabase/functions/send-update-notification/index.ts
// =====================================================
// EDGE FUNCTION: Send email when new system_update is created
// Triggered by: Database webhook on system_updates INSERT
// =====================================================

// @ts-ignore - Deno imports work at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno imports work at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Deno environment variables
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SystemUpdate {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'announcement' | 'feature' | 'maintenance';
  target_group?: string;
  is_pinned?: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  newsletter_enabled: boolean;
  newsletter_preferences: {
    update_center_email?: boolean;
    [key: string]: unknown;
  } | null;
  top_secret_enabled?: boolean;
  newsletter_paid?: boolean;
}

interface WebhookPayload {
  record: SystemUpdate;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json() as WebhookPayload;
    const record = payload.record;
    
    if (!record) {
      return new Response(
        JSON.stringify({ error: "No record provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📢 New system update:", record.title);

    // Initialize Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Determine which users should receive this notification based on target_group
    let profileQuery = supabase
      .from('profiles')
      .select('id, email, display_name, newsletter_enabled, newsletter_preferences, top_secret_enabled, newsletter_paid')
      .eq('newsletter_enabled', true);

    // Filter by target group
    if (record.target_group && record.target_group !== 'all') {
      if (record.target_group === 'top_secret') {
        profileQuery = profileQuery.eq('top_secret_enabled', true);
      } else if (record.target_group === 'newsletter') {
        profileQuery = profileQuery.or('newsletter_enabled.eq.true,newsletter_paid.eq.true');
      }
      // 'trading_journal' group = all users (no additional filter)
    }

    const { data: profiles, error: profilesError } = await profileQuery;

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log("No eligible users found for this notification");
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, message: "No eligible users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter users who have update_center_email enabled
    const eligibleUsers = (profiles as Profile[]).filter((profile) => {
      const prefs = profile.newsletter_preferences;
      // Default to true if not set
      return prefs?.update_center_email !== false;
    });

    console.log(`📧 Sending emails to ${eligibleUsers.length} users`);

    // Send emails
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const user of eligibleUsers) {
      try {
        const emailHtml = generateEmailHtml(record, user.display_name || 'Trader');
        
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Finotaur <updates@finotaur.com>",
            to: [user.email],
            subject: `🔔 ${record.title} - Finotaur Update Center`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          emailsSent++;
          console.log(`✅ Email sent to ${user.email}`);
        } else {
          emailsFailed++;
          const errorText = await emailResponse.text();
          console.error(`❌ Failed to send to ${user.email}:`, errorText);
        }
      } catch (emailError) {
        emailsFailed++;
        console.error(`❌ Error sending to ${user.email}:`, emailError);
      }
    }

    console.log(`📊 Results: ${emailsSent} sent, ${emailsFailed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent, 
        emailsFailed,
        totalEligible: eligibleUsers.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateEmailHtml(update: SystemUpdate, userName: string): string {
  const typeColors: Record<string, string> = {
    info: '#3B82F6',
    success: '#22C55E',
    warning: '#EAB308',
    announcement: '#D4AF37',
    feature: '#8B5CF6',
    maintenance: '#F97316',
  };

  const typeLabels: Record<string, string> = {
    info: 'ℹ️ Info',
    success: '✅ Success',
    warning: '⚠️ Warning',
    announcement: '📢 Announcement',
    feature: '🚀 New Feature',
    maintenance: '🔧 Maintenance',
  };

  const badgeColor = typeColors[update.type] || '#D4AF37';
  const badgeLabel = typeLabels[update.type] || 'Update';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Update - Finotaur</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #111111; border-radius: 16px; border: 1px solid #333;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #333;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <div style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #C19A2F); padding: 12px 16px; border-radius: 12px;">
                      <span style="color: #000; font-weight: 700; font-size: 18px;">🦖 FINOTAUR</span>
                    </div>
                  </td>
                  <td style="text-align: right;">
                    <span style="display: inline-block; background-color: ${badgeColor}20; color: ${badgeColor}; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                      ${badgeLabel}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 8px;">Hey ${userName} 👋</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 24px;">
                You have a new notification in your Update Center.
              </p>

              <!-- Update Card -->
              <div style="background-color: #1a1a1a; border: 1px solid ${badgeColor}40; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #D4AF37; font-size: 18px; margin: 0 0 12px; font-weight: 600;">
                  ${update.title}
                </h3>
                <p style="color: #ccc; font-size: 14px; line-height: 1.6; margin: 0;">
                  ${update.content}
                </p>
                ${update.is_pinned ? `
                <div style="margin-top: 16px;">
                  <span style="background-color: #D4AF3720; color: #D4AF37; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                    📌 Pinned
                  </span>
                </div>
                ` : ''}
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="https://finotaur.com/app" 
                       style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #C19A2F); color: #000; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px;">
                      View in Update Center →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #333;">
              <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
                You're receiving this because you enabled Update Center notifications.<br>
                <a href="https://finotaur.com/app/settings?tab=notifications" style="color: #D4AF37; text-decoration: none;">
                  Manage notification preferences
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}