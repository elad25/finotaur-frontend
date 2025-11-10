/**
 * Cloudflare Worker - Support Email Handler with Resend
 * 
 * Setup:
 * 1. Sign up at https://resend.com
 * 2. Get API key
 * 3. Add to wrangler.toml: RESEND_API_KEY = "your-key"
 * 4. Verify domain at Resend
 */

export interface Env {
  RESEND_API_KEY: string;
}

interface SupportRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: "low" | "medium" | "high";
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    try {
      const data: SupportRequest = await request.json();

      // Validation
      if (!data.name || !data.email || !data.subject || !data.message) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid email address" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      const priorityEmoji = {
        low: "🟢",
        medium: "🟡",
        high: "🔴",
      };

      // Send email via Resend
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Finotaur Support <support@finotaur.com>",
          to: ["support@finotaur.com"],
          reply_to: data.email,
          subject: `[${data.priority.toUpperCase()}] ${data.subject}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f5f5f5;
                }
                .container {
                  background: white;
                  border-radius: 12px;
                  padding: 30px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .header {
                  background: linear-gradient(135deg, #C9A646 0%, #D4AF37 100%);
                  color: white;
                  padding: 20px;
                  border-radius: 8px;
                  margin-bottom: 25px;
                }
                .header h1 {
                  margin: 0;
                  font-size: 24px;
                  font-weight: 600;
                }
                .priority {
                  display: inline-block;
                  padding: 6px 12px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 600;
                  text-transform: uppercase;
                  margin-top: 10px;
                  background: ${data.priority === 'high' ? '#FEE2E2' : data.priority === 'medium' ? '#FEF3C7' : '#D1FAE5'};
                  color: ${data.priority === 'high' ? '#DC2626' : data.priority === 'medium' ? '#D97706' : '#059669'};
                }
                .field {
                  margin-bottom: 20px;
                }
                .label {
                  font-size: 12px;
                  font-weight: 600;
                  color: #6B7280;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 6px;
                }
                .value {
                  font-size: 15px;
                  color: #111827;
                }
                .message-box {
                  background: #F9FAFB;
                  border-left: 4px solid #C9A646;
                  padding: 16px;
                  border-radius: 6px;
                  margin-top: 8px;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                }
                .footer {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #E5E7EB;
                  text-align: center;
                  color: #6B7280;
                  font-size: 13px;
                }
                .reply-button {
                  display: inline-block;
                  background: #C9A646;
                  color: white;
                  padding: 12px 24px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎯 New Support Request</h1>
                  <span class="priority">
                    ${priorityEmoji[data.priority]} ${data.priority.toUpperCase()} PRIORITY
                  </span>
                </div>

                <div class="field">
                  <div class="label">From</div>
                  <div class="value"><strong>${data.name}</strong></div>
                  <div class="value" style="color: #6B7280; margin-top: 4px;">${data.email}</div>
                </div>

                <div class="field">
                  <div class="label">Subject</div>
                  <div class="value"><strong>${data.subject}</strong></div>
                </div>

                <div class="field">
                  <div class="label">Message</div>
                  <div class="message-box">${data.message}</div>
                </div>

                <div class="field">
                  <div class="label">Timestamp</div>
                  <div class="value">${new Date().toLocaleString('en-US', { 
                    dateStyle: 'full', 
                    timeStyle: 'long',
                    timeZone: 'Asia/Jerusalem'
                  })}</div>
                </div>

                <a href="mailto:${data.email}" class="reply-button">
                  Reply to ${data.name}
                </a>

                <div class="footer">
                  <p>Sent from Finotaur Support System</p>
                  <p style="margin-top: 8px;">
                    <a href="https://finotaur.com" style="color: #C9A646;">finotaur.com</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const error = await emailResponse.text();
        console.error("Resend error:", error);
        throw new Error("Failed to send email");
      }

      console.log("Email sent successfully via Resend");

      return new Response(
        JSON.stringify({
          success: true,
          message: "Support request sent successfully",
          reference: Date.now().toString(36).toUpperCase(),
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );

    } catch (error) {
      console.error("Error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
  },
};