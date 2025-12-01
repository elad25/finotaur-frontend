// src/features/affiliate/services/affiliateEmailService.ts
// ============================================
// Service to send affiliate emails via Edge Function
// ============================================

import { supabase } from '@/lib/supabase';
import { generateApprovalEmail } from '../utils/affiliateEmailTemplates';

interface SendApprovalEmailParams {
  email: string;
  fullName: string;
  affiliateCode: string;
  discountPercent: number;
}

export async function sendAffiliateApprovalEmail(params: SendApprovalEmailParams): Promise<{ success: boolean; error?: string }> {
  const { email, fullName, affiliateCode, discountPercent } = params;

  try {
    const emailContent = generateApprovalEmail({
      fullName,
      affiliateCode,
      discountPercent,
    });

    const { data, error } = await supabase.functions.invoke('send-affiliate-email', {
      body: {
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      },
    });

    if (error) {
      console.error('Error sending affiliate approval email:', error);
      return { success: false, error: error.message };
    }

    console.log('Affiliate approval email sent successfully:', data);
    return { success: true };
  } catch (err) {
    console.error('Exception sending affiliate approval email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}