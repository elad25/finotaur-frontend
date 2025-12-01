// src/features/affiliate/utils/affiliateEmailTemplates.ts
// ============================================
// Email Templates for Affiliate Program
// ============================================

interface ApprovalEmailData {
  fullName: string;
  affiliateCode: string;
  discountPercent: number;
}

export function generateApprovalEmail(data: ApprovalEmailData): { html: string; text: string; subject: string } {
  const { fullName, affiliateCode, discountPercent } = data;
  const firstName = fullName.split(' ')[0];
  const dashboardUrl = 'https://www.finotaur.com/affiliate';

  const subject = `🎉 Welcome to the Finotaur Affiliate Program, ${firstName}!`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Finotaur Affiliates</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <img src="https://www.finotaur.com/logo.png" alt="Finotaur" style="height: 50px; width: auto;" />
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%); border-radius: 16px; border: 1px solid #333; overflow: hidden;">
              
              <!-- Gold Header Bar -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="background: linear-gradient(90deg, #D4AF37 0%, #F4D03F 50%, #D4AF37 100%); padding: 20px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #000; font-size: 24px; font-weight: 700;">
                      🎉 Congratulations!
                    </h1>
                  </td>
                </tr>
              </table>
              
              <!-- Content -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 40px 30px;">
                    
                    <p style="color: #ffffff; font-size: 18px; margin: 0 0 20px 0; line-height: 1.6;">
                      Hey ${firstName}! 👋
                    </p>
                    
                    <p style="color: #cccccc; font-size: 16px; margin: 0 0 30px 0; line-height: 1.6;">
                      Great news! Your application to join the <strong style="color: #D4AF37;">Finotaur Affiliate Program</strong> has been approved!
                    </p>
                    
                    <!-- Affiliate Code Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                      <tr>
                        <td style="background: rgba(212, 175, 55, 0.1); border: 2px solid #D4AF37; border-radius: 12px; padding: 25px; text-align: center;">
                          <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0;">
                            Your Affiliate Code
                          </p>
                          <p style="color: #D4AF37; font-size: 32px; font-weight: 700; font-family: 'Courier New', monospace; margin: 0; letter-spacing: 3px;">
                            ${affiliateCode}
                          </p>
                          <p style="color: #888; font-size: 14px; margin: 15px 0 0 0;">
                            Your referrals get <strong style="color: #D4AF37;">${discountPercent}% off</strong> their subscription
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Benefits -->
                    <p style="color: #ffffff; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">
                      As a Finotaur Affiliate, you'll enjoy:
                    </p>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #D4AF37; font-size: 16px;">✓</span>
                          <span style="color: #cccccc; font-size: 15px; margin-left: 10px;">20% commission on every successful referral</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #D4AF37; font-size: 16px;">✓</span>
                          <span style="color: #cccccc; font-size: 15px; margin-left: 10px;">Real-time tracking dashboard</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #D4AF37; font-size: 16px;">✓</span>
                          <span style="color: #cccccc; font-size: 15px; margin-left: 10px;">Monthly payouts with detailed reports</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #D4AF37; font-size: 16px;">✓</span>
                          <span style="color: #cccccc; font-size: 15px; margin-left: 10px;">Exclusive marketing materials</span>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding: 10px 0 30px 0;">
                          <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(90deg, #D4AF37 0%, #F4D03F 50%, #D4AF37 100%); color: #000; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 40px; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px;">
                            Go to Dashboard →
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #888; font-size: 14px; margin: 0; line-height: 1.6; text-align: center;">
                      Start sharing your code today and watch your earnings grow! 💰
                    </p>
                    
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0 0 10px 0;">
                Questions? Reply to this email or contact us at
                <a href="mailto:support@finotaur.com" style="color: #D4AF37; text-decoration: none;">support@finotaur.com</a>
              </p>
              <p style="color: #444; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Finotaur. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Welcome to the Finotaur Affiliate Program, ${firstName}!

Great news! Your application has been approved!

YOUR AFFILIATE CODE: ${affiliateCode}

Your referrals get ${discountPercent}% off their subscription.

As a Finotaur Affiliate, you'll enjoy:
• 20% commission on every successful referral
• Real-time tracking dashboard
• Monthly payouts with detailed reports
• Exclusive marketing materials

Go to your dashboard: ${dashboardUrl}

Start sharing your code today and watch your earnings grow!

Questions? Contact us at support@finotaur.com

© ${new Date().getFullYear()} Finotaur. All rights reserved.
  `.trim();

  return { html, text, subject };
}