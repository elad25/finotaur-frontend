// src/pages/app/journal/admin/affiliate/AffiliateAdminApplications.tsx
// ============================================
// Affiliate Admin - Applications Tab
// Review and approve/reject applications
// ============================================

import { useState, useEffect } from 'react';
import { 
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Instagram,
  Youtube,
  Globe,
  Users,
  MapPin,
  Loader2,
  X,
  AlertCircle,
  Check,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  useAffiliateApplications, 
  useApproveApplication, 
  useRejectApplication 
} from '@/features/affiliate/hooks/useAffiliateAdmin';
import type { AffiliateApplication, AffiliateApplicationStatus } from '@/features/affiliate/types/affiliate.types';
import { supabase } from '@/lib/supabase';
import { SkeletonTable } from '@/components/ds/Skeleton';
import { generateRejectionEmail } from '@/features/affiliate/utils/affiliateEmailTemplates';

interface Props {
  onPendingCountChange?: (count: number) => void;
}

// Discount tiers matching DB config (only 10% and 15%)
type DiscountTier = 'standard' | 'vip';

const DISCOUNT_TIERS: { id: DiscountTier; label: string; discount: number }[] = [
  { id: 'standard', label: 'Standard', discount: 10 },
  { id: 'vip', label: 'VIP', discount: 15 },
];

// ─── Pre-built rejection reasons with rich English affiliate-facing messages ───
// Wording matches the detailed rejection emails in affiliateEmailTemplates.ts (REJECTION_DETAIL_MAP)
// so the preset message shown here and the email the affiliate receives read consistently.
const REJECTION_REASONS: { value: string; label: string; affiliateMessage: string }[] = [
  {
    value: 'insufficient_audience',
    label: 'Insufficient audience size',
    affiliateMessage:
      "After reviewing your application, we found that your current audience size hasn't yet reached the minimum threshold required for our program. This isn't a judgment of your quality — we're simply looking for partners with a follower base that allows for real influence. Once your audience grows, we'd love to receive a new application.",
  },
  {
    value: 'brand_mismatch',
    label: 'Content not aligned with our brand',
    affiliateMessage:
      "Finotaur is focused on capital markets, trading, and financial analysis — and we're looking for partners whose content speaks directly to an audience interested in these topics. After review, we found that your current niche differs from the audience we're targeting. If your direction shifts toward finance in the future, the door is always open.",
  },
  {
    value: 'geographic_restrictions',
    label: 'Geographic restrictions',
    affiliateMessage:
      "Our affiliate program currently operates in a limited number of countries due to regulatory requirements and international payment restrictions. Unfortunately your region isn't included at this stage, but we're working on expanding coverage. We'd love for you to reapply once we expand to your region.",
  },
  {
    value: 'incomplete_application',
    label: 'Incomplete application',
    affiliateMessage:
      "While reviewing your application, we noticed it was missing essential details — some fields may not have been filled in, links may not have been active, or some information may be missing. The good news: this is easy to fix. Simply reapply with all the required details, including active links to your channels, and we'll be happy to review it again.",
  },
  {
    value: 'duplicate_application',
    label: 'Duplicate application',
    affiliateMessage:
      "We found an existing application or account in our system linked to your details. We don't allow duplicate applications from the same person. If you believe this is a mistake — for example, if you previously applied with a different email address — please reach out to us directly and we'll look into it together.",
  },
  {
    value: 'low_quality_content',
    label: 'Content quality below standards',
    affiliateMessage:
      "In reviewing your digital presence, we felt your current content hasn't yet reached the level of quality, professionalism, and consistency we look for in our partners. This is a natural stage every content creator goes through. We recommend continuing to develop your style, and once you've built a stronger portfolio, we'd love to see your application again.",
  },
  {
    value: 'no_active_channels',
    label: 'No active channels verified',
    affiliateMessage:
      "In attempting to verify the content channels you listed, we were unable to find verified activity — the links may not have worked, the channels may not have been public, or the details didn't match the profiles we found. We recommend making sure all your profiles are public and active, then reapplying with accurate details.",
  },
  {
    value: 'other',
    label: 'Other (enter custom reason)',
    affiliateMessage: '',
  },
];

export default function AffiliateAdminApplications({ onPendingCountChange }: Props) {
  const [statusFilter, setStatusFilter] = useState<AffiliateApplicationStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<AffiliateApplication | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReasonKey, setRejectReasonKey] = useState('');
  const [affiliateMessage, setAffiliateMessage] = useState('');
  const [showMessageEditor, setShowMessageEditor] = useState(false);
  const [discountTier, setDiscountTier] = useState<DiscountTier>('standard');
  const [useRequestedCode, setUseRequestedCode] = useState(true);

  const { data: applications, isLoading } = useAffiliateApplications(statusFilter);
  const approveApplication = useApproveApplication();
  const rejectApplication = useRejectApplication();

  // Update pending count
  useEffect(() => {
    if (applications && onPendingCountChange) {
      const pendingCount = applications.filter(a => a.status === 'pending').length;
      onPendingCountChange(pendingCount);
    }
  }, [applications, onPendingCountChange]);

  // Filter by search
  const filteredApplications = applications?.filter(app => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.full_name.toLowerCase().includes(query) ||
      app.email.toLowerCase().includes(query) ||
      app.requested_code?.toLowerCase().includes(query)
    );
  }) || [];

  // Helper to display code (without prefix)
  const displayCode = (code: string | null | undefined) => {
    if (!code) return '-';
    // Remove FINOTAUR- prefix if exists (for old data)
    return code.startsWith('FINOTAUR-') ? code.replace('FINOTAUR-', '') : code;
  };

  // Handle approve
  const handleApprove = async () => {
    if (!selectedApp) return;
    
    // Determine which code to use (no prefix)
    let codeToUse: string | undefined;
    if (useRequestedCode && selectedApp.requested_code) {
      // Remove FINOTAUR- prefix if exists (for old data)
      codeToUse = selectedApp.requested_code.startsWith('FINOTAUR-') 
        ? selectedApp.requested_code.replace('FINOTAUR-', '') 
        : selectedApp.requested_code;
    } else {
      // Remove FINOTAUR- prefix if admin typed it
      codeToUse = customCode 
        ? (customCode.startsWith('FINOTAUR-') ? customCode.replace('FINOTAUR-', '') : customCode)
        : undefined;
    }
    
    await approveApplication.mutateAsync({
      applicationId: selectedApp.id,
      customCode: codeToUse,
      adminNotes: adminNotes || undefined,
      discountTier: discountTier,
    });

    setShowApproveModal(false);
    setSelectedApp(null);
    setCustomCode('');
    setAdminNotes('');
    setDiscountTier('standard');
    setUseRequestedCode(true);
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedApp || !rejectReasonKey) return;

    const reasonObj = REJECTION_REASONS.find(r => r.value === rejectReasonKey);
    const reasonLabel = reasonObj?.label || rejectReasonKey;
    const messageToAffiliate = affiliateMessage.trim() || reasonObj?.affiliateMessage || reasonLabel;

    await rejectApplication.mutateAsync({
      applicationId: selectedApp.id,
      reason: reasonLabel,
      adminNotes: adminNotes || undefined,
    });

    // Send rejection email
    try {
      const emailContent = generateRejectionEmail({
        fullName: selectedApp.full_name,
        rejectionReason: reasonLabel,
        messageToAffiliate,
      });
      await supabase.functions.invoke('send-affiliate-email', {
        body: {
          to: selectedApp.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        },
      });
    } catch (emailErr) {
      console.error('Failed to send rejection email:', emailErr);
    }

    setShowRejectModal(false);
    setSelectedApp(null);
    setRejectReasonKey('');
    setAffiliateMessage('');
    setAdminNotes('');
    setShowMessageEditor(false);
  };

  // Open approve modal and initialize values
  const openApproveModal = (app: AffiliateApplication) => {
    setSelectedApp(app);
    setCustomCode('');
    setUseRequestedCode(!!app.requested_code);
    setDiscountTier('standard');
    setAdminNotes('');
    setShowApproveModal(true);
  };

  // Handle code change
  const handleCodeChange = (newCode: string) => {
    const cleanCode = newCode.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCustomCode(cleanCode);
  };

  // Status badge colors
  const getStatusBadge = (status: AffiliateApplicationStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'under_review':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'approved':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'suspended':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (isLoading) {
    return <SkeletonTable rows={6} cols={5} className="mt-4" />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${statusFilter === status 
                  ? 'bg-[#D4AF37] text-black' 
                  : 'bg-[#111111] text-gray-400 hover:text-white border border-gray-800'
                }
              `}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'pending' && applications && (
                <span className="ml-2 px-1.5 py-0.5 bg-black/20 rounded text-xs">
                  {applications.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or code..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-gray-800 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#D4AF37]/50"
          />
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {filteredApplications.length === 0 ? (
          <div className="text-center py-12 bg-[#111111] border border-gray-800 rounded-xl">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No applications found</p>
          </div>
        ) : (
          filteredApplications.map((app) => (
            <div 
              key={app.id}
              className="bg-[#111111] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Basic Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold">{app.full_name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(app.status)}`}>
                      {app.status}
                    </span>
                    {app.requested_code && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-semibold rounded-lg border border-[#D4AF37]/30">
                        <span className="text-[#D4AF37]/70">Requested:</span>
                        <span className="font-mono">{displayCode(app.requested_code)}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{app.email}</p>
                  
                  {/* Social Links */}
                  <div className="flex flex-wrap gap-3">
                    {app.instagram_handle && (
                      <span className="flex items-center gap-1 text-xs text-pink-400">
                        <Instagram className="w-3 h-3" />
                        @{app.instagram_handle}
                      </span>
                    )}
                    {app.youtube_channel && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <Youtube className="w-3 h-3" />
                        {app.youtube_channel}
                      </span>
                    )}
                    {app.website_url && (
                      <span className="flex items-center gap-1 text-xs text-blue-400">
                        <Globe className="w-3 h-3" />
                        Website
                      </span>
                    )}
                    {app.total_followers > 0 && (
                      <span className="flex items-center gap-1 text-xs text-purple-400">
                        <Users className="w-3 h-3" />
                        {app.total_followers.toLocaleString('en-US')} followers
                      </span>
                    )}
                    {app.country && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {app.country}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedApp(app)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-[#0A0A0A] rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  
                  {app.status === 'pending' && (
                    <>
                      <button
                        onClick={() => openApproveModal(app)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setShowRejectModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-sm font-medium"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Promotion Plan Preview */}
              {app.promotion_plan && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-gray-500 text-xs mb-1">Promotion Plan:</p>
                  <p className="text-gray-300 text-sm line-clamp-2">{app.promotion_plan}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {app.status === 'rejected' && app.rejection_reason && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-red-400/70 text-xs mb-1">Rejection Reason:</p>
                  <p className="text-red-400 text-sm">{app.rejection_reason}</p>
                </div>
              )}

              {/* Date */}
              <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
                <span>Applied: {new Date(app.created_at).toLocaleDateString('en-US')}</span>
                {app.reviewed_at && (
                  <span>Reviewed: {new Date(app.reviewed_at).toLocaleDateString('en-US')}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Details Modal */}
      {selectedApp && !showApproveModal && !showRejectModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedApp(null)}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Application Details</h3>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#0A0A0A] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Full Name</p>
                    <p className="text-white">{selectedApp.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-white">{selectedApp.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                    <p className="text-white">{selectedApp.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Country</p>
                    <p className="text-white">{selectedApp.country || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Requested Code</p>
                    <p className="text-[#D4AF37] font-mono">{displayCode(selectedApp.requested_code)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Followers</p>
                    <p className="text-white">{selectedApp.total_followers?.toLocaleString('en-US') || '0'}</p>
                  </div>
                </div>
              </div>

              {/* Social Presence */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Social Presence</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Instagram</p>
                    <p className="text-pink-400">{selectedApp.instagram_handle ? `@${selectedApp.instagram_handle}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">YouTube</p>
                    <p className="text-red-400">{selectedApp.youtube_channel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">TikTok</p>
                    <p className="text-white">{selectedApp.tiktok_handle ? `@${selectedApp.tiktok_handle}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Twitter</p>
                    <p className="text-blue-400">{selectedApp.twitter_handle ? `@${selectedApp.twitter_handle}` : '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Website</p>
                    <p className="text-blue-400">{selectedApp.website_url || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Audience Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Audience Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Primary Audience</p>
                    <p className="text-white">{selectedApp.primary_audience || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Audience Location</p>
                    <p className="text-white">{selectedApp.audience_location || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Expected Monthly Referrals</p>
                    <p className="text-white">{selectedApp.expected_monthly_referrals || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Referral Source</p>
                    <p className="text-white">{selectedApp.referral_source || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Promotion Plan */}
              {selectedApp.promotion_plan && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Promotion Plan</h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap bg-[#0A0A0A] p-4 rounded-lg">
                    {selectedApp.promotion_plan}
                  </p>
                </div>
              )}

              {/* Actions */}
              {selectedApp.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-800">
                  <button
                    onClick={() => openApproveModal(selectedApp)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve Application
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 font-semibold rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal - Compact Design */}
      {showApproveModal && selectedApp && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowApproveModal(false)}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Approve Application</h3>
              <p className="text-gray-400 text-sm mt-1">
                Create affiliate account for {selectedApp.full_name}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Affiliate Code - Compact Design */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Affiliate Code (Whop Coupon)
                </label>
                <p className="text-gray-500 text-xs mb-2">
                  This code will be created in Whop. It can be changed — the code grants a discount to buyers and links the commission to the affiliate.
                </p>
                
                {selectedApp.requested_code ? (
                  <div className="space-y-2">
                    {/* Option 1: Use requested code */}
                    <div 
                      onClick={() => setUseRequestedCode(true)}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                        ${useRequestedCode 
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                          : 'border-gray-700 bg-[#0A0A0A] hover:border-gray-600'
                        }
                      `}
                    >
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${useRequestedCode 
                          ? 'border-[#D4AF37] bg-[#D4AF37]' 
                          : 'border-gray-600'
                        }
                      `}>
                        {useRequestedCode && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <span className="text-gray-400 text-sm">Use requested:</span>
                      <span className="font-mono text-[#D4AF37] font-semibold">
                        {displayCode(selectedApp.requested_code)}
                      </span>
                    </div>

                    {/* Option 2: Give different code */}
                    <div 
                      onClick={() => setUseRequestedCode(false)}
                      className={`
                        p-3 rounded-lg border cursor-pointer transition-all
                        ${!useRequestedCode 
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                          : 'border-gray-700 bg-[#0A0A0A] hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                          ${!useRequestedCode 
                            ? 'border-[#D4AF37] bg-[#D4AF37]' 
                            : 'border-gray-600'
                          }
                        `}>
                          {!useRequestedCode && <Check className="w-3 h-3 text-black" />}
                        </div>
                        <span className="text-gray-400 text-sm">Give different code</span>
                      </div>
                      {!useRequestedCode && (
                        <input
                          type="text"
                          value={customCode}
                          onChange={(e) => handleCodeChange(e.target.value)}
                          placeholder={`${selectedApp.full_name.split(' ')[0].toUpperCase()}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full mt-2 px-3 py-2 bg-black/50 border border-gray-700 rounded-lg font-mono text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  /* No Requested Code - Simple Input */
                  <div>
                    <input
                      type="text"
                      value={customCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      placeholder={`${selectedApp.full_name.split(' ')[0].toUpperCase()}`}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] font-mono"
                    />
                    <p className="text-gray-500 text-xs mt-2">
                      Leave empty to auto-generate
                    </p>
                  </div>
                )}
              </div>

              {/* Customer Discount Tier */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Customer Discount Tier
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {DISCOUNT_TIERS.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setDiscountTier(tier.id)}
                      className={`
                        relative p-4 rounded-lg border-2 transition-all text-center
                        ${discountTier === tier.id
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                          : 'border-gray-700 bg-[#0A0A0A] hover:border-gray-600'
                        }
                      `}
                    >
                      {discountTier === tier.id && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                      <p className={`font-semibold ${discountTier === tier.id ? 'text-[#D4AF37]' : 'text-white'}`}>
                        {tier.label}
                      </p>
                      <p className={`text-sm ${discountTier === tier.id ? 'text-[#D4AF37]/70' : 'text-gray-500'}`}>
                        {tier.discount}% off
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Discount customers receive when using the code — valid on all plans. The affiliate earns a 10% commission on every payment for 12 months.
                </p>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Admin Notes (optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setCustomCode('');
                  setAdminNotes('');
                  setDiscountTier('standard');
                  setUseRequestedCode(true);
                }}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approveApplication.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {approveApplication.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApp && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowRejectModal(false)}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Reject Application</h3>
                <p className="text-gray-400 text-sm mt-1">{selectedApp.full_name} · {selectedApp.email}</p>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="p-2 text-gray-400 hover:text-white hover:bg-[#0A0A0A] rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">
                  The applicant will receive a rejection email with the reason selected. This action cannot be undone.
                </p>
              </div>

              {/* Reason selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {REJECTION_REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => {
                        setRejectReasonKey(r.value);
                        setAffiliateMessage(r.affiliateMessage);
                        setShowMessageEditor(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                        ${rejectReasonKey === r.value
                          ? 'border-red-500/60 bg-red-500/10'
                          : 'border-gray-700 bg-[#0A0A0A] hover:border-gray-600'
                        }
                      `}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                        ${rejectReasonKey === r.value ? 'border-red-400 bg-red-400' : 'border-gray-600'}`}>
                        {rejectReasonKey === r.value && <div className="w-2 h-2 rounded-full bg-black" />}
                      </div>
                      <span className={`text-sm font-medium ${rejectReasonKey === r.value ? 'text-red-300' : 'text-gray-300'}`}>
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message to affiliate – collapsible editor */}
              {rejectReasonKey && (
                <div className="rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setShowMessageEditor(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#0A0A0A] hover:bg-[#111] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-sm font-medium text-gray-300">Message to affiliate (sent in email)</span>
                    </div>
                    {showMessageEditor ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {showMessageEditor && (
                    <div className="p-4 bg-[#0D0D0D] border-t border-gray-800">
                      <p className="text-gray-500 text-xs mb-2">This text will appear in the rejection email. Auto-filled — feel free to edit.</p>
                      <textarea
                        value={affiliateMessage}
                        onChange={(e) => setAffiliateMessage(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2.5 bg-black/60 border border-gray-700 rounded-lg text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] resize-none leading-relaxed"
                      />
                    </div>
                  )}
                  {!showMessageEditor && affiliateMessage && (
                    <div className="px-4 py-3 bg-[#0D0D0D] border-t border-gray-800">
                      <p className="text-gray-500 text-xs line-clamp-2">{affiliateMessage}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin internal notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Internal notes (not sent to applicant)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes for the team only..."
                  rows={2}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReasonKey('');
                  setAffiliateMessage('');
                  setAdminNotes('');
                  setShowMessageEditor(false);
                }}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejectApplication.isPending || !rejectReasonKey}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {rejectApplication.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Reject & Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}