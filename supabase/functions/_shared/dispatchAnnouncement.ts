// =====================================================
// Shared dispatch logic for admin announcements
// Used by both publish-announcement (immediate send) and
// dispatch-scheduled-announcements (cron pickup of scheduled sends)
// =====================================================

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Finotaur <noreply@finotaur.com>";

interface Recipient {
  user_id: string;
  email: string;
  display_name: string | null;
  account_type: string | null;
  email_opt_in: boolean | null;
}

export interface DispatchResult {
  inapp: number;
  email_sent: number;
  email_failed: number;
}

/**
 * Loads an admin-generated announcement row, resolves its recipients via
 * get_announcement_recipient_ids(), fans out to the requested channels
 * (in-app rows + Resend email batches), logs the send, and marks the
 * announcement row as sent (or failed, on error).
 */
export async function dispatchAnnouncement(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  id: string
): Promise<DispatchResult> {
  try {
    const { data: row, error: rowError } = await supabaseAdmin
      .from("update_center_notifications")
      .select("title, message, channels, audience_filter, created_by")
      .eq("id", id)
      .single();

    if (rowError || !row) {
      throw new Error(`Announcement ${id} not found: ${rowError?.message ?? "no row"}`);
    }

    const title: string = row.title;
    const message: string = row.message ?? "";
    const channelList: string[] = row.channels ?? ["inapp"];
    const audienceFilter = row.audience_filter ?? {};
    const createdBy = row.created_by ?? null;

    const { data: recipientsData, error: recipientsError } = await supabaseAdmin.rpc(
      "get_announcement_recipient_ids",
      { p_filters: audienceFilter }
    );

    if (recipientsError) {
      throw new Error(`Failed to resolve recipients: ${recipientsError.message}`);
    }

    const recipients: Recipient[] = recipientsData ?? [];

    let inapp = 0;
    let email_sent = 0;
    let email_failed = 0;

    // ---- In-app notifications ----
    if (channelList.includes("inapp") && recipients.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize).map((r) => ({
          notification_id: id,
          user_id: r.user_id,
          subscription_tier: r.account_type ?? "FREE",
        }));

        const { error: insertError } = await supabaseAdmin
          .from("user_notifications")
          .insert(batch);

        if (insertError) {
          console.error("user_notifications insert error:", insertError.message);
        } else {
          inapp += batch.length;
        }
      }
    }

    // ---- Email ----
    if (channelList.includes("email") && recipients.length > 0) {
      const emailRecipients = recipients.filter((r) => r.email_opt_in !== false && !!r.email);
      const batchSize = 50;

      for (let i = 0; i < emailRecipients.length; i += batchSize) {
        const batch = emailRecipients.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map((r) =>
            sendAnnouncementEmail(r.email, title, message, {
              name: r.display_name || undefined,
              email: r.email,
              plan: r.account_type || undefined,
            })
          )
        );

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            email_sent++;
          } else {
            email_failed++;
            console.error("Announcement email send failed:", result.reason);
          }
        });

        if (i + batchSize < emailRecipients.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      await supabaseAdmin.from("announcement_logs").insert({
        sent_by: createdBy,
        subject: title,
        body: message,
        recipients_count: email_sent,
        failed_count: email_failed,
        recipient_filters: audienceFilter,
      });
    }

    await supabaseAdmin
      .from("update_center_notifications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);

    return { inapp, email_sent, email_failed };
  } catch (error) {
    try {
      await supabaseAdmin
        .from("update_center_notifications")
        .update({ status: "failed" })
        .eq("id", id);
    } catch (markError) {
      console.error("Failed to mark announcement as failed:", markError);
    }
    throw error;
  }
}

async function sendAnnouncementEmail(
  to: string,
  subject: string,
  body: string,
  user: { name?: string; email: string; plan?: string }
) {
  const personalizedBody = (body ?? "")
    .replace(/\{\{name\}\}/g, user.name || "Valued Member")
    .replace(/\{\{email\}\}/g, user.email)
    .replace(/\{\{plan\}\}/g, user.plan || "Free");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
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
