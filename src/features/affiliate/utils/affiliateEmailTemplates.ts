// src/features/affiliate/utils/affiliateEmailTemplates.ts
// ============================================
// Email Templates for Affiliate Program
// ============================================

import { COMMISSION_RATE_PCT } from '../affiliateTerms';

interface ApprovalEmailData {
  fullName: string;
  affiliateCode: string;
  discountPercent: number;
}

interface RejectionEmailData {
  fullName: string;
  rejectionReason: string;
  messageToAffiliate: string;
}

// ─── Per-reason detailed email content ───────────────────────────────────────
// Each reason key maps to: { bodyHtml, bodyText, reapplyTip }
const REJECTION_DETAIL_MAP: Record<string, { bodyHtml: string; bodyText: string; reapplyTip: string }> = {
  'Insufficient audience size': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  One of the core requirements of our affiliate program is that partners have a minimum audience size that allows for real influence over their followers' decisions.
  After reviewing your application, we found that your current audience size hasn't yet reached the required threshold.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  This <strong style="color:#fff;">doesn't</strong> mean you have no potential — we regularly see people grow very quickly and join the program successfully.
  We recommend continuing to build your content, growing audience engagement, and coming back to us once you feel you've reached a new milestone.
</p>`,
    bodyText: `
One of our core requirements is that partners have a minimum audience size that allows for real influence.
Your current audience size hasn't yet reached the required threshold — but this can definitely change.
We recommend continuing to grow and reaching back out to us once you hit a new milestone.`,
    reapplyTip: 'Once your audience grows — we are here. Reapply at any time.',
  },

  'Content not aligned with our brand': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  Finotaur is a platform focused on capital markets, trading, and professional financial analysis.
  We're looking for partners whose content speaks directly to an audience interested in these topics — investors, traders, and people seeking serious financial tools.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  After reviewing your activity, we concluded that your current niche differs from the audience we're targeting.
  If your direction changes in the future and you start focusing more on financial topics — we'd love to hear from you again.
</p>`,
    bodyText: `
Finotaur is aimed at an audience interested in capital markets, trading, and financial analysis.
After review, we found that your current niche differs from the audience we're targeting.
If your direction shifts toward finance in the future — we'd love to hear from you again.`,
    reapplyTip: 'If your content direction changes — the door is open. Reapply at any time.',
  },

  'Geographic restrictions': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  Our affiliate program currently operates in a limited number of countries, mainly due to regulatory requirements and international payment restrictions.
  Unfortunately, your geographic region isn't currently included among the regions we support.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  We're actively working on expanding the program's geographic coverage and hope to add more regions soon.
  We'd love for you to come back and apply once we expand coverage to your region.
</p>`,
    bodyText: `
Our affiliate program currently operates only in limited countries due to regulatory requirements.
Your region isn't currently included, but we're working on expanding coverage.
We'd love for you to come back and apply once we expand to your region.`,
    reapplyTip: 'Follow our updates — once we expand to your region, we would love to have you.',
  },

  'Incomplete application': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  While reviewing your application, we noticed it was missing essential details we need to evaluate your fit for the program.
  Some fields may not have been filled in, links may not have been active, or some information may be missing.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  The good news is this is the simplest reason to fix — just reapply with all the required details, including active links to your channels and complete contact information.
  We'd be happy to review the updated application.
</p>`,
    bodyText: `
Your application is missing essential details we need for a complete evaluation.
The good news: this is easy to fix — reapply with all details, active links, and complete contact information.`,
    reapplyTip: 'Reapply with all complete details — we would be happy to review it soon.',
  },

  'Duplicate application': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  We found an existing application or account in our system linked to your details.
  To maintain order and consistency in the program, we don't allow duplicate applications from the same person.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  If you believe this is a mistake — for example, if you previously applied with a different email address, or there's confusion with another account —
  please reach out to us directly and we'll look into it together. We're here to help.
</p>`,
    bodyText: `
We found an existing application or account in our system linked to your details.
If you believe this is a mistake, reach out to us directly and we'll look into it.`,
    reapplyTip: 'For questions about an existing account — contact our team directly.',
  },

  'Content quality below standards': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  In reviewing your digital presence, we felt your current content hasn't yet reached the level of quality, professionalism, and consistency we look for in our partners.
  This isn't a criticism — it's simply a stage every content creator goes through.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  We recommend continuing to develop your style, investing in visuals and editing, and aiming for consistency in publishing.
  Once you've built a stronger portfolio — we'd love to see your application again.
</p>`,
    bodyText: `
Your current content hasn't yet reached the level of quality and professionalism we look for in our partners.
We recommend further developing your style and returning once you feel your results speak for themselves.`,
    reapplyTip: 'Once you feel your content has reached the next level — reapply. We would love to see your growth.',
  },

  'No active channels verified': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  In attempting to verify the content channels you listed in your application, we were unable to find verified activity.
  The links may not have worked, the channels may not have been public, or the details submitted didn't match the profiles we found.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  We recommend making sure all links to your profiles are public and active, then reapplying with accurate details.
  This will help us review your application in the best possible way.
</p>`,
    bodyText: `
We were unable to verify the content channels you listed — the links may not have worked or the details didn't match.
Make sure all your profiles are public and active, then reapply with accurate details.`,
    reapplyTip: 'Update your links and make sure they are public — then reapply.',
  },
};

// ─── Build styled HTML body section for rejection ────────────────────────────
function buildRejectionBody(rejectionReason: string, messageToAffiliate: string): { bodyHtml: string; bodyText: string; reapplyTip: string } {
  const detail = REJECTION_DETAIL_MAP[rejectionReason];

  if (detail) {
    return detail;
  }

  // Fallback for "Other" / custom reasons
  return {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  After careful review of your application, we've decided not to approve it at this time.
  The detailed reason is noted below.
</p>`,
    bodyText: `After reviewing your application, we've decided not to approve it at this time.`,
    reapplyTip: 'We would love to receive a new application in the future once circumstances change.',
  };
}

export function generateRejectionEmail(data: RejectionEmailData): { html: string; text: string; subject: string } {
  const { fullName, rejectionReason, messageToAffiliate } = data;
  const firstName = fullName.split(' ')[0];
  const supportEmail = 'support@finotaur.com';
  const applyUrl = 'https://www.finotaur.com/affiliate';

  const subject = `Update on Your Affiliate Application – Finotaur`;

  const { bodyHtml, bodyText, reapplyTip } = buildRejectionBody(rejectionReason, messageToAffiliate);

  const html = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Affiliate Application Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <img src="https://www.finotaur.com/logo.png" alt="Finotaur" style="height: 50px; width: auto;" />
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%); border-radius: 16px; border: 1px solid #333; overflow: hidden;">

              <!-- Header Bar -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="background: linear-gradient(90deg, #1a1a1a 0%, #222 100%); border-bottom: 2px solid #333; padding: 20px 30px; text-align: left;">
                    <h1 style="margin: 0; color: #fff; font-size: 20px; font-weight: 700;">
                      Update on Your Affiliate Program Application
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Content -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 40px 30px;">

                    <p style="color: #ffffff; font-size: 17px; margin: 0 0 16px 0; line-height: 1.6;">
                      Hi ${firstName},
                    </p>

                    <p style="color: #cccccc; font-size: 15px; margin: 0 0 24px 0; line-height: 1.7;">
                      Thank you so much for applying to join the <strong style="color: #D4AF37;">Finotaur</strong> Affiliate Program.
                      We appreciate the time you invested and your interest in becoming part of our community.
                    </p>

                    <!-- Reason Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                      <tr>
                        <td style="background: rgba(255,255,255,0.03); border: 1px solid #2a2a2a; border-left: 3px solid #D4AF37; border-radius: 8px; padding: 22px 24px;">
                          <p style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">Reason for Rejection</p>
                          <p style="color: #e0e0e0; font-size: 15px; font-weight: 600; margin: 0 0 16px 0;">${rejectionReason}</p>
                          <p style="color: #bbb; font-size: 14px; margin: 0; line-height: 1.75;">${messageToAffiliate}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Detailed explanation -->
                    ${bodyHtml}

                    <!-- Divider -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 28px 0;">
                      <tr><td style="border-top: 1px solid #2a2a2a;"></td></tr>
                    </table>

                    <!-- Reapply encouragement -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                      <tr>
                        <td style="background: rgba(212,175,55,0.06); border: 1px solid rgba(212,175,55,0.2); border-radius: 10px; padding: 20px 24px;">
                          <p style="color: #D4AF37; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">
                            🚪 The Door Is Open for You
                          </p>
                          <p style="color: #ccc; font-size: 14px; margin: 0; line-height: 1.75;">
                            ${reapplyTip}
                            <br/>
                            The application process is quick and simple — <a href="${applyUrl}" style="color: #D4AF37; text-decoration: none; font-weight: 600;">click here to submit a new application</a>.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #cccccc; font-size: 15px; margin: 0 0 28px 0; line-height: 1.7;">
                      If you have any questions, would like further clarification, or believe this is a mistake — don't hesitate to reach out to us directly.
                      We're here and happy to help.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding-bottom: 10px;">
                          <a href="mailto:${supportEmail}" style="display: inline-block; background: transparent; color: #D4AF37; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; border: 1.5px solid #D4AF37;">
                            Contact Our Team
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <p style="color: #555; font-size: 12px; margin: 0 0 8px 0;">
                Questions? Reach us at
                <a href="mailto:${supportEmail}" style="color: #D4AF37; text-decoration: none;">${supportEmail}</a>
              </p>
              <p style="color: #333; font-size: 11px; margin: 0;">
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
Hi ${firstName},

Thank you for applying to the Finotaur Affiliate Program.
We appreciate the time you invested.

After review, we've decided not to approve the application at this time.

Reason: ${rejectionReason}

${messageToAffiliate}

${bodyText}

${reapplyTip}
Submit a new application here: ${applyUrl}

For questions, you can reach us at: ${supportEmail}

© ${new Date().getFullYear()} Finotaur. All rights reserved.
  `.trim();

  return { html, text, subject };
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
                            Your referrals get <strong style="color: #D4AF37;">${discountPercent}% off</strong> their subscription · Valid on all plans
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
                          <span style="color: #cccccc; font-size: 15px; margin-left: 10px;">${COMMISSION_RATE_PCT}% commission on every successful referral for 12 months</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #D4AF37; font-size: 16px;">✓</span>
                          <span style="color: #cccccc; font-size: 15px; margin-left: 10px;">Your referrals get ${discountPercent}% off their subscription (all plans)</span>
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
                          <span style="color: #cccccc; font-size: 15px; margin-left: 10px;">Monthly payouts via Whop with detailed reports</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #D4AF37; font-size: 16px;">✓</span>
                          <span style="color: #cccccc; font-size: 15px; margin-left: 10px;">After 12 months, your referred users keep their discount automatically</span>
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

Your referrals get ${discountPercent}% off their subscription (valid on all plans).

As a Finotaur Affiliate, you'll enjoy:
• ${COMMISSION_RATE_PCT}% commission on every successful referral for 12 months
• Your referrals get ${discountPercent}% off their subscription
• Real-time tracking dashboard
• Monthly payouts via Whop with detailed reports
• After 12 months, your referred users keep their discount automatically

Go to your dashboard: ${dashboardUrl}

Start sharing your code today and watch your earnings grow!

Questions? Contact us at support@finotaur.com

© ${new Date().getFullYear()} Finotaur. All rights reserved.
  `.trim();

  return { html, text, subject };
}