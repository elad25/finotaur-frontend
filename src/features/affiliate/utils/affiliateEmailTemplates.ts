// src/features/affiliate/utils/affiliateEmailTemplates.ts
// ============================================
// Email Templates for Affiliate Program
// ============================================

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
  אחת הדרישות המרכזיות בתוכנית האפילייטים שלנו היא שלשותפים תהיה קהל מינימלי שמאפשר השפעה אמיתית על ההחלטות של עוקביהם.
  לאחר בחינת הבקשה שלך, מצאנו שבשלב זה גודל הקהל שלך טרם הגיע לסף הנדרש.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  זה <strong style="color:#fff;">לא</strong> אומר שאין לך פוטנציאל — אנחנו רואים אנשים שצומחים מהר מאוד ומצטרפים לתוכנית בהצלחה.
  אנחנו ממליצים להמשיך לפתח את התוכן שלך, להגדיל את מעורבות הקהל ולחזור אלינו כשתרגיש שהגעת לנקודה חדשה.
</p>`,
    bodyText: `
אחת הדרישות המרכזיות שלנו היא שלשותפים תהיה קהל מינימלי שמאפשר השפעה אמיתית.
בשלב זה גודל הקהל שלך טרם הגיע לסף הנדרש — אך זה בהחלט ניתן לשינוי.
אנחנו ממליצים להמשיך לצמוח ולחזור אלינו כשתגיע לנקודה חדשה.`,
    reapplyTip: 'כשהקהל שלך יגדל — אנחנו כאן. הגש בקשה מחדש בכל עת.',
  },

  'Content not aligned with our brand': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  Finotaur היא פלטפורמה המתמקדת בשוקי ההון, מסחר, וניתוח פיננסי מקצועי.
  אנחנו מחפשים שותפים שהתוכן שלהם מדבר ישירות לקהל שמתעניין בנושאים אלו — משקיעים, סוחרים, ואנשים שמחפשים כלים פיננסיים רציניים.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  לאחר בחינת הפעילות שלך, הגענו למסקנה שהנישה הנוכחית שלך שונה מהקהל שאנחנו מיועדים לו.
  אם בעתיד הכיוון שלך ישתנה ותתחיל לעסוק יותר בנושאים פיננסיים — נשמח מאוד לשמוע ממך שוב.
</p>`,
    bodyText: `
Finotaur מיועדת לקהל שמתעניין בשוקי הון, מסחר וניתוח פיננסי.
לאחר בחינה, מצאנו שהנישה הנוכחית שלך שונה מהקהל שאנחנו פונים אליו.
אם הכיוון שלך ישתנה לכיוון פיננסי בעתיד — נשמח לשמוע ממך שוב.`,
    reapplyTip: 'אם הכיוון התוכן שלך ישתנה — הדלת פתוחה. הגש בקשה מחדש בכל עת.',
  },

  'Geographic restrictions': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  כרגע תוכנית האפילייטים שלנו פועלת במספר מוגבל של מדינות, בעיקר בשל דרישות רגולטוריות ומגבלות תשלום בינלאומיות.
  לצערנו, האזור הגאוגרפי שלך אינו נכלל בשלב זה בין האזורים שאנו תומכים בהם.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  אנחנו עובדים באופן פעיל על הרחבת הכיסוי הגאוגרפי של התוכנית, ומקווים להוסיף אזורים נוספים בקרוב.
  נשמח אם תחזור ותגיש בקשה כאשר נרחיב את הכיסוי לאזורך.
</p>`,
    bodyText: `
תוכנית האפילייטים שלנו פועלת כרגע במדינות מוגבלות בלבד בשל דרישות רגולטוריות.
האזור שלך אינו נכלל בשלב זה, אך אנחנו עובדים על הרחבת הכיסוי.
נשמח שתחזור ותגיש בקשה כשנרחיב לאזורך.`,
    reapplyTip: 'עקוב אחר עדכונים שלנו — כשנרחיב לאזורך, נשמח לקבל אותך.',
  },

  'Incomplete application': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  בעת בדיקת הבקשה שלך, שמנו לב שחסרים בה פרטים חיוניים שאנו זקוקים להם כדי להעריך את ההתאמה שלך לתוכנית.
  ייתכן שחלק מהשדות לא מולאו, קישורים לא היו פעילים, או שמידע מסוים חסר.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  הבשורה הטובה היא שזו הסיבה הפשוטה ביותר לתיקון — פשוט הגש בקשה מחדש עם כל הפרטים הנדרשים, כולל קישורים פעילים לערוצים שלך ופרטי יצירת קשר מלאים.
  נשמח לבחון את הבקשה המעודכנת.
</p>`,
    bodyText: `
הבקשה שלך חסרה פרטים חיוניים שאנו זקוקים להם להערכה מלאה.
הבשורה הטובה: זה קל לתיקון — הגש בקשה מחדש עם כל הפרטים, קישורים פעילים ופרטי קשר מלאים.`,
    reapplyTip: 'הגש בקשה מחדש עם כל הפרטים המלאים — נשמח לבחון אותה בהקדם.',
  },

  'Duplicate application': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  מצאנו במערכת שלנו בקשה קיימת או חשבון הקשורים לפרטים שלך.
  כדי לשמור על סדר ועקביות בתוכנית, אנחנו לא מאפשרים בקשות כפולות מאותו אדם.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  אם אתה חושב שמדובר בטעות — למשל, אם הגשת בקשה עם כתובת אימייל אחרת בעבר, או שיש בלבול עם חשבון אחר —
  אנא פנה אלינו ישירות ונבדוק את זה יחד. אנחנו כאן כדי לעזור.
</p>`,
    bodyText: `
מצאנו בקשה קיימת או חשבון הקשורים לפרטים שלך במערכת.
אם לדעתך מדובר בטעות, פנה אלינו ישירות ונבדוק.`,
    reapplyTip: 'לשאלות על חשבון קיים — צור קשר ישירות עם הצוות שלנו.',
  },

  'Content quality below standards': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  בבחינת הנוכחות הדיגיטלית שלך, הרגשנו שהתוכן הנוכחי שלך עדיין לא מגיע לרמת האיכות, המקצועיות והעקביות שאנחנו מחפשים בשותפינו.
  זה לא ביקורת — זה פשוט שלב בדרך שכל יוצר תוכן עובר.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  אנחנו ממליצים להמשיך לפתח את הסגנון שלך, להשקיע במראה ובעריכה, ולשאוף לעקביות בפרסום.
  לאחר שתבנה תיק עבודות חזק יותר — נשמח לראות את הבקשה שלך שוב.
</p>`,
    bodyText: `
התוכן הנוכחי שלך טרם הגיע לרמת האיכות והמקצועיות שאנחנו מחפשים בשותפינו.
אנחנו ממליצים לפתח עוד את הסגנון שלך ולשוב כשתרגיש שהתוצאות מדברות בעד עצמן.`,
    reapplyTip: 'כשתרגיש שהתוכן שלך הגיע לרמה הבאה — הגש בקשה מחדש. נשמח לראות את הגדילה שלך.',
  },

  'No active channels verified': {
    bodyHtml: `
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  בניסיון לאמת את ערוצי התוכן שציינת בבקשה, לא הצלחנו למצוא פעילות מאומתת.
  ייתכן שהקישורים לא עבדו, שהערוצים לא היו ציבוריים, או שהפרטים שנרשמו לא תאמו את הפרופילים שמצאנו.
</p>
<p style="color:#cccccc;font-size:15px;margin:0 0 16px 0;line-height:1.8;">
  אנחנו ממליצים לוודא שכל הקישורים לפרופילים שלך ציבוריים ופעילים, ולאחר מכן להגיש בקשה מחדש עם פרטים מדויקים.
  זה יעזור לנו לבחון את הבקשה שלך בצורה הטובה ביותר.
</p>`,
    bodyText: `
לא הצלחנו לאמת את ערוצי התוכן שציינת — ייתכן שהקישורים לא עבדו או שהפרטים לא תאמו.
וודא שכל הפרופילים שלך ציבוריים ופעילים, ולאחר מכן הגש בקשה מחדש עם פרטים מדויקים.`,
    reapplyTip: 'עדכן את הקישורים שלך וודא שהם ציבוריים — ואז הגש מחדש.',
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
  לאחר בחינה מדוקדקת של הבקשה שלך, החלטנו בשלב זה שלא לאשר אותה.
  הסיבה המפורטת מצוינת למטה.
</p>`,
    bodyText: `לאחר בחינה של הבקשה שלך, החלטנו בשלב זה שלא לאשר אותה.`,
    reapplyTip: 'נשמח לקבל בקשה מחדש בעתיד כשהנסיבות ישתנו.',
  };
}

export function generateRejectionEmail(data: RejectionEmailData): { html: string; text: string; subject: string } {
  const { fullName, rejectionReason, messageToAffiliate } = data;
  const firstName = fullName.split(' ')[0];
  const supportEmail = 'support@finotaur.com';
  const applyUrl = 'https://www.finotaur.com/affiliate';

  const subject = `עדכון בנוגע לבקשת האפילייט שלך – Finotaur`;

  const { bodyHtml, bodyText, reapplyTip } = buildRejectionBody(rejectionReason, messageToAffiliate);

  const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>עדכון בקשת אפילייט</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; direction: rtl;">
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
                  <td style="background: linear-gradient(90deg, #1a1a1a 0%, #222 100%); border-bottom: 2px solid #333; padding: 20px 30px; text-align: right;">
                    <h1 style="margin: 0; color: #fff; font-size: 20px; font-weight: 700;">
                      עדכון על בקשת הצטרפות לתוכנית השותפים
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Content -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 40px 30px;">

                    <p style="color: #ffffff; font-size: 17px; margin: 0 0 16px 0; line-height: 1.6;">
                      היי ${firstName},
                    </p>

                    <p style="color: #cccccc; font-size: 15px; margin: 0 0 24px 0; line-height: 1.7;">
                      תודה רבה שהגשת בקשה להצטרף לתוכנית השותפים של <strong style="color: #D4AF37;">Finotaur</strong>.
                      אנחנו מעריכים את הזמן שהשקעת ואת הרצון שלך להיות חלק מהקהילה שלנו.
                    </p>

                    <!-- Reason Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                      <tr>
                        <td style="background: rgba(255,255,255,0.03); border: 1px solid #2a2a2a; border-right: 3px solid #D4AF37; border-radius: 8px; padding: 22px 24px;">
                          <p style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">סיבת הדחייה</p>
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
                            🚪 הדלת פתוחה עבורך
                          </p>
                          <p style="color: #ccc; font-size: 14px; margin: 0; line-height: 1.75;">
                            ${reapplyTip}
                            <br/>
                            תהליך ההגשה פשוט ומהיר — <a href="${applyUrl}" style="color: #D4AF37; text-decoration: none; font-weight: 600;">לחץ כאן להגשת בקשה חדשה</a>.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #cccccc; font-size: 15px; margin: 0 0 28px 0; line-height: 1.7;">
                      אם יש לך שאלות, רוצה לקבל הבהרה נוספת, או שאתה מאמין שמדובר בטעות — אל תהסס לפנות אלינו ישירות.
                      אנחנו כאן וישמח לנו לעזור.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding-bottom: 10px;">
                          <a href="mailto:${supportEmail}" style="display: inline-block; background: transparent; color: #D4AF37; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; border: 1.5px solid #D4AF37;">
                            צור קשר עם הצוות שלנו
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
                שאלות? פנה אלינו בכתובת
                <a href="mailto:${supportEmail}" style="color: #D4AF37; text-decoration: none;">${supportEmail}</a>
              </p>
              <p style="color: #333; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Finotaur. כל הזכויות שמורות.
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
היי ${firstName},

תודה שהגשת בקשה לתוכנית השותפים של Finotaur.
אנחנו מעריכים את הזמן שהשקעת.

לאחר בחינה, החלטנו שלא לאשר את הבקשה בשלב זה.

סיבה: ${rejectionReason}

${messageToAffiliate}

${bodyText}

${reapplyTip}
הגש בקשה חדשה כאן: ${applyUrl}

לשאלות, ניתן לפנות אלינו ב: ${supportEmail}

© ${new Date().getFullYear()} Finotaur. כל הזכויות שמורות.
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
                          <span style="color: #cccccc; font-size: 15px; margin-left: 10px;">10% commission on every successful referral for 12 months</span>
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
• 10% commission on every successful referral for 12 months
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