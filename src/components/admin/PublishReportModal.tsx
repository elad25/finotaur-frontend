// =====================================================
// PUBLISH REPORT MODAL COMPONENT - FIXED VERSION
// =====================================================
// Place in: src/components/admin/PublishReportModal.tsx
//
// ⭐ FIX: Now passes markdownContent and htmlContent directly
//    to the database, solving "Content pending..." issue
//
// Used by TopSecretAdmin to publish reports to user dashboard
// TOP SECRET subscribers only
// =====================================================

import React, { useState } from 'react';
import {
  X,
  Send,
  Mail,
  MailX,
  Eye,
  Star,
  Loader2,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

interface PublishReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'ism' | 'company' | 'crypto' | 'weekly';
  reportId: string;
  reportData: {
    title: string;
    subtitle?: string;
    highlights?: string[];
    keyMetricLabel?: string;
    keyMetricValue?: string;
    keyInsightsCount?: number;
    pdfUrl?: string;
    markdownPreview?: string;
    qaScore?: number;
    // For company
    ticker?: string;
    companyName?: string;
    sector?: string;
    // For ISM
    reportMonth?: string;
    pmiValue?: number;
    // For crypto
    marketRegime?: string;
    // ⭐ NEW: Full content fields (REQUIRED FOR CRYPTO!)
    markdownContent?: string;
    htmlContent?: string;
  };
  onPublishSuccess?: () => void;
}

// Only TOP SECRET subscribers receive reports
type TargetGroup = 'top_secret';

// ============================================
// API FUNCTIONS
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function publishReportToDashboard(params: {
  reportType: string;
  originalReportId: string;
  title: string;
  subtitle?: string;
  highlights?: string[];
  keyMetricLabel?: string;
  keyMetricValue?: string;
  keyInsightsCount?: number;
  pdfUrl?: string;
  markdownPreview?: string;
  qaScore?: number;
  ticker?: string;
  companyName?: string;
  sector?: string;
  reportMonth?: string;
  pmiValue?: number;
  marketRegime?: string;
  isFeatured: boolean;
  targetGroup: TargetGroup;
  adminNote?: string;
  // ⭐ NEW: Full content parameters
  markdownContent?: string;
  htmlContent?: string;
}): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // If this report is being set as featured, first unfeature all other reports of the same type
    if (params.isFeatured) {
      const { error: unfeaturedError } = await supabase
        .from('published_reports')
        .update({ is_featured: false })
        .eq('report_type', params.reportType)
        .eq('is_featured', true);
      
      if (unfeaturedError) {
        console.warn('Failed to unfeature previous reports:', unfeaturedError);
      }
    }

    // ⭐ LOG: Show what we're sending
    console.log('[Publish] Sending to database:', {
      reportType: params.reportType,
      hasMarkdownContent: !!params.markdownContent,
      markdownLength: params.markdownContent?.length || 0,
      hasHtmlContent: !!params.htmlContent,
      htmlLength: params.htmlContent?.length || 0,
    });

    const { data, error } = await supabase.rpc('publish_report_to_dashboard', {
      p_report_type: params.reportType,
      p_original_report_id: params.originalReportId,
      p_title: params.title,
      p_subtitle: params.subtitle || null,
      p_highlights: params.highlights || null,
      p_key_metric_label: params.keyMetricLabel || null,
      p_key_metric_value: params.keyMetricValue || null,
      p_key_insights_count: params.keyInsightsCount || 0,
      p_pdf_url: params.pdfUrl || null,
      p_markdown_preview: params.markdownPreview?.slice(0, 500) || null,
      p_qa_score: params.qaScore || null,
      p_ticker: params.ticker || null,
      p_company_name: params.companyName || null,
      p_sector: params.sector || null,
      p_report_month: params.reportMonth || null,
      p_pmi_value: params.pmiValue || null,
      p_market_regime: params.marketRegime || null,
      p_is_featured: params.isFeatured,
      p_target_group: params.targetGroup,
      p_admin_id: user.id,
      p_admin_note: params.adminNote || null,
      // ⭐ NEW: Pass full content to database
      p_markdown_content: params.markdownContent || null,
      p_html_content: params.htmlContent || null,
    });

    if (error) throw error;
    
    console.log('[Publish] Success! Report ID:', data);
    return { success: true, reportId: data };
  } catch (err: any) {
    console.error('[Publish] Error:', err);
    return { success: false, error: err.message };
  }
}

async function sendReportEmail(params: {
  reportType: string;
  reportId: string;
  title: string;
  targetGroup: TargetGroup;
}): Promise<{ success: boolean; recipientCount?: number; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/reports/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    return { success: true, recipientCount: data.recipientCount };
  } catch (err: any) {
    console.error('[SendEmail] Error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// COMPONENT
// ============================================

export default function PublishReportModal({
  isOpen,
  onClose,
  reportType,
  reportId,
  reportData,
  onPublishSuccess,
}: PublishReportModalProps) {
  // State - always TOP SECRET, always featured (latest report)
  const [isFeatured, setIsFeatured] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState<'idle' | 'publishing' | 'sending_email' | 'done'>('idle');

  if (!isOpen) return null;

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishStep('publishing');

    try {
      // ⭐ VALIDATION: Warn if no content for crypto reports
      if (reportType === 'crypto' && !reportData.markdownContent) {
        console.warn('[Publish] WARNING: No markdownContent provided for crypto report!');
      }

      // Step 1: Publish to dashboard (always to TOP SECRET subscribers)
      const publishResult = await publishReportToDashboard({
        reportType,
        originalReportId: reportId,
        title: reportData.title,
        subtitle: reportData.subtitle,
        highlights: reportData.highlights,
        keyMetricLabel: reportData.keyMetricLabel,
        keyMetricValue: reportData.keyMetricValue,
        keyInsightsCount: reportData.keyInsightsCount,
        pdfUrl: reportData.pdfUrl,
        markdownPreview: reportData.markdownPreview,
        qaScore: reportData.qaScore,
        ticker: reportData.ticker,
        companyName: reportData.companyName,
        sector: reportData.sector,
        reportMonth: reportData.reportMonth,
        pmiValue: reportData.pmiValue,
        marketRegime: reportData.marketRegime,
        isFeatured,
        targetGroup: 'top_secret', // Always TOP SECRET
        adminNote: adminNote || undefined,
        // ⭐ NEW: Pass content from reportData
        markdownContent: reportData.markdownContent,
        htmlContent: reportData.htmlContent,
      });

      if (!publishResult.success) {
        throw new Error(publishResult.error || 'Failed to publish');
      }

      toast.success('✅ Report published to TOP SECRET members!');

      // Step 2: Send email if requested
      if (sendEmail && publishResult.reportId) {
        setPublishStep('sending_email');
        
        const emailResult = await sendReportEmail({
          reportType,
          reportId: publishResult.reportId,
          title: reportData.title,
          targetGroup: 'top_secret',
        });

        if (emailResult.success) {
          // Update the published report with email info
          await supabase.rpc('mark_published_report_email_sent', {
            p_report_id: publishResult.reportId,
            p_recipient_count: emailResult.recipientCount || 0,
          });
          
          toast.success(`📧 Email sent to ${emailResult.recipientCount} TOP SECRET members!`);
        } else {
          toast.error(`Email failed: ${emailResult.error}`);
        }
      }

      setPublishStep('done');
      
      // Callback and close
      setTimeout(() => {
        onPublishSuccess?.();
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('[Publish] Error:', err);
      toast.error(`Failed to publish: ${err.message}`);
      setPublishStep('idle');
    } finally {
      setIsPublishing(false);
    }
  };

  const getReportTypeLabel = () => {
    switch (reportType) {
      case 'ism': return 'ISM Macro Report';
      case 'company': return `Company Analysis: ${reportData.ticker || 'Unknown'}`;
      case 'crypto': return 'Crypto Market Report';
      case 'weekly': return 'Weekly Review';
      default: return 'Report';
    }
  };

  const getReportGradient = () => {
    switch (reportType) {
      case 'ism': return 'from-blue-600 to-cyan-600';
      case 'company': return 'from-purple-600 to-pink-600';
      case 'crypto': return 'from-orange-600 to-amber-600';
      case 'weekly': return 'from-emerald-600 to-teal-600';
      default: return 'from-gray-600 to-gray-500';
    }
  };

  // ⭐ NEW: Show content status indicator
  const hasContent = !!(reportData.markdownContent || reportData.htmlContent);
  const contentLength = (reportData.markdownContent?.length || 0) + (reportData.htmlContent?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#0a0a12] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-800 bg-gradient-to-r ${getReportGradient()} bg-opacity-10`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Publish Report</h2>
              <p className="text-sm text-gray-400">{getReportTypeLabel()}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Report Preview */}
          <div className="p-4 rounded-xl bg-[#0d0d18] border border-gray-800">
            <h3 className="font-medium text-white mb-1">{reportData.title}</h3>
            {reportData.subtitle && (
              <p className="text-sm text-gray-400 mb-2">{reportData.subtitle}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {reportData.qaScore && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  QA: {reportData.qaScore}/100
                </span>
              )}
              {reportData.keyInsightsCount && (
                <span>{reportData.keyInsightsCount} Key Insights</span>
              )}
              {/* ⭐ NEW: Content status indicator */}
              {hasContent ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="w-3 h-3" />
                  Content: {Math.round(contentLength / 1000)}K chars
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  ⚠️ No content attached
                </span>
              )}
            </div>
          </div>

          {/* ⭐ NEW: Warning if no content */}
          {!hasContent && reportType === 'crypto' && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-amber-400">
                ⚠️ Warning: No report content detected. The published report may show "Content pending..." 
                Make sure the report was fully generated before publishing.
              </p>
            </div>
          )}

          {/* Target Group - Fixed to TOP SECRET */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Target Audience</label>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[#C9A646] bg-[#C9A646]/10">
              <Lock className="w-5 h-5 text-[#C9A646]" />
              <div>
                <p className="text-sm font-medium text-white">TOP SECRET Subscribers Only</p>
                <p className="text-xs text-gray-500">Only TOP SECRET members will see this report</p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Featured Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0d0d18] border border-gray-800">
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${isFeatured ? 'text-[#C9A646]' : 'text-gray-500'}`} />
                <div>
                  <p className="text-sm font-medium text-white">Featured Report</p>
                  <p className="text-xs text-gray-500">
                    {isFeatured 
                      ? 'This will be the featured report (previous featured will be unfeatured)' 
                      : 'Show at the top of the list'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFeatured(!isFeatured)}
                className={`relative w-11 h-6 rounded-full transition-all ${
                  isFeatured ? 'bg-[#C9A646]' : 'bg-gray-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                  isFeatured ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Send Email Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0d0d18] border border-gray-800">
              <div className="flex items-center gap-2">
                {sendEmail ? (
                  <Mail className="w-4 h-4 text-blue-400" />
                ) : (
                  <MailX className="w-4 h-4 text-gray-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">Send Email Notification</p>
                  <p className="text-xs text-gray-500">
                    {sendEmail ? 'TOP SECRET members will be notified by email' : 'No email will be sent'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSendEmail(!sendEmail)}
                className={`relative w-11 h-6 rounded-full transition-all ${
                  sendEmail ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                  sendEmail ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Admin Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Admin Note (optional)</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Internal note about this publication..."
              className="w-full px-3 py-2 bg-[#0d0d18] border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30 text-sm resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-[#080812] flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r ${getReportGradient()} text-white font-medium transition-all hover:opacity-90 disabled:opacity-50`}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {publishStep === 'publishing' && 'Publishing...'}
                {publishStep === 'sending_email' && 'Sending Email...'}
                {publishStep === 'done' && 'Done!'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Publish {sendEmail ? '& Send Email' : 'to Dashboard'}
              </>
            )}
          </button>
        </div>

        {/* Success Overlay */}
        {publishStep === 'done' && (
          <div className="absolute inset-0 bg-[#0a0a12]/95 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Published Successfully!</h3>
              <p className="text-gray-400">Report is now visible to TOP SECRET members</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}