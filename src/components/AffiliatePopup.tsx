// =====================================================
// FINOTAUR AFFILIATE POPUP - v2.2
// =====================================================
// Place in: src/components/AffiliatePopup.tsx
// 
// CHANGES v2.2:
// - ✅ Removed referral link section (only coupon code)
// - ✅ Green checkmark badge for approved affiliates
// - ✅ Simplified view for approved affiliates
// =====================================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Check, 
  Gift, 
  Users, 
  DollarSign, 
  TrendingUp,
  Sparkles,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  Target,
  Phone,
  MapPin,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ============================================
// TYPES
// ============================================

interface AffiliatePopupProps {
  onClose: () => void;
}

interface AffiliateData {
  isAffiliate: boolean;
  hasApplication: boolean;
  applicationStatus?: string;
  code: string | null;
  stats: {
    totalReferrals: number;
    activeCustomers: number;
    totalEarnings: number;
    pendingEarnings: number;
  } | null;
}

// ============================================
// FORM SCHEMA
// ============================================

const applicationSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string()
    .min(2, "Please enter your full name")
    .refine(
      (name) => name.trim().includes(' '), 
      "Please enter first and last name"
    ),
  phone: z.string().optional(),
  country: z.string().optional(),
  instagram_handle: z.string().optional(),
  youtube_channel: z.string().optional(),
  tiktok_handle: z.string().optional(),
  twitter_handle: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal("")),
  total_followers: z.number().min(0).optional(),
  primary_audience: z.string().optional(),
  audience_location: z.string().optional(),
  promotion_plan: z.string().min(1, "Please select a promotion method"),
  requested_code: z.string().max(15).optional(),
  expected_monthly_referrals: z.number().min(1).optional(),
  referral_source: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

// ============================================
// CUSTOM SELECT COMPONENT
// ============================================

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
}

function CustomSelect({ value, onChange, placeholder, options, icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2.5
          bg-[#1A1A1A] border border-zinc-800 rounded-lg
          text-left text-sm transition-all
          hover:border-zinc-700 focus:outline-none focus:border-[#C9A646]/50
          ${selectedOption ? 'text-white' : 'text-zinc-500'}
        `}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-zinc-500 flex-shrink-0">{icon}</span>}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[150]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 z-[200] bg-[#1A1A1A] border border-zinc-800 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-3 py-2.5 text-left text-sm transition-colors
                    hover:bg-zinc-800
                    ${value === option.value ? 'bg-[#C9A646]/10 text-[#C9A646]' : 'text-zinc-300'}
                  `}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AffiliatePopup({ onClose }: AffiliatePopupProps) {
  const { user } = useAuth();
  const [affiliateData, setAffiliateData] = useState<AffiliateData>({
    isAffiliate: false,
    hasApplication: false,
    code: null,
    stats: null,
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);

  // Form state for custom selects
  const [primaryAudience, setPrimaryAudience] = useState('');
  const [promotionPlan, setPromotionPlan] = useState('');
  const [audienceLocation, setAudienceLocation] = useState('');
  const [referralSource, setReferralSource] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      email: user?.email || '',
      full_name: user?.user_metadata?.display_name || '',
      total_followers: 0,
      expected_monthly_referrals: 5,
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    setValue('primary_audience', primaryAudience);
    setValue('promotion_plan', promotionPlan);
    setValue('audience_location', audienceLocation);
    setValue('referral_source', referralSource);
  }, [primaryAudience, promotionPlan, audienceLocation, referralSource, setValue]);

  useEffect(() => {
    checkAffiliateStatus();
  }, [user]);

  const checkAffiliateStatus = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (affiliate && affiliate.status === 'active') {
        setAffiliateData({
          isAffiliate: true,
          hasApplication: false,
          code: affiliate.affiliate_code || affiliate.coupon_code,
          stats: {
            totalReferrals: affiliate.total_qualified_referrals || 0,
            activeCustomers: affiliate.total_active_customers || 0,
            totalEarnings: Number(affiliate.total_earnings_usd) || 0,
            pendingEarnings: Number(affiliate.total_pending_usd) || 0,
          },
        });
        setLoading(false);
        return;
      }

      const { data: application } = await supabase
        .from('affiliate_applications')
        .select('id, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (application) {
        setAffiliateData({
          isAffiliate: false,
          hasApplication: true,
          applicationStatus: application.status,
          code: null,
          stats: null,
        });
      }
    } catch (err) {
      console.error('Error checking affiliate status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!affiliateData.code) return;

    try {
      await navigator.clipboard.writeText(affiliateData.code);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const checkCodeAvailability = async (code: string): Promise<boolean> => {
    if (!code || code.trim() === '') return true;
    
    const cleanCode = code.toUpperCase();
    
    const { data: existingAffiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('affiliate_code', cleanCode)
      .maybeSingle();

    if (existingAffiliate) return false;

    const { data: existingAffiliateWithPrefix } = await supabase
      .from('affiliates')
      .select('id')
      .eq('affiliate_code', `FINOTAUR-${cleanCode}`)
      .maybeSingle();

    if (existingAffiliateWithPrefix) return false;

    const { data: existingApplication } = await supabase
      .from('affiliate_applications')
      .select('id')
      .eq('requested_code', cleanCode)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingApplication) return false;

    return true;
  };

  const onSubmitApplication = async (data: ApplicationFormData) => {
    if (!user?.id) {
      toast.error('Please log in first');
      return;
    }

    setSubmitting(true);
    setCodeError(null);
    
    try {
      if (data.requested_code && data.requested_code.trim() !== '') {
        const isAvailable = await checkCodeAvailability(data.requested_code);
        if (!isAvailable) {
          setCodeError('This code is already taken. Please choose a different one.');
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('affiliate_applications')
        .insert({
          user_id: user.id,
          email: data.email,
          full_name: data.full_name,
          phone: data.phone || null,
          country: data.country || null,
          instagram_handle: data.instagram_handle || null,
          youtube_channel: data.youtube_channel || null,
          tiktok_handle: data.tiktok_handle || null,
          twitter_handle: data.twitter_handle || null,
          website_url: data.website_url || null,
          total_followers: data.total_followers || 0,
          primary_audience: data.primary_audience || null,
          audience_location: data.audience_location || null,
          promotion_plan: data.promotion_plan,
          requested_code: data.requested_code?.toUpperCase().replace(/[^A-Z0-9]/g, '') || null,
          expected_monthly_referrals: data.expected_monthly_referrals || null,
          referral_source: data.referral_source || null,
          status: 'pending',
        });

      if (error) throw error;

      toast.success("Application submitted!", {
        description: "We'll review your application within 24-48 hours.",
      });

      setAffiliateData({
        ...affiliateData,
        hasApplication: true,
        applicationStatus: 'pending',
      });
      setShowForm(false);

    } catch (error: any) {
      console.error('Application error:', error);
      toast.error("Failed to submit application", {
        description: error.message || "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // SELECT OPTIONS
  // ============================================

  const audienceOptions = [
    { value: 'forex_traders', label: 'Forex Traders' },
    { value: 'crypto_traders', label: 'Crypto Traders' },
    { value: 'stock_traders', label: 'Stock Traders' },
    { value: 'futures_traders', label: 'Futures Traders' },
    { value: 'options_traders', label: 'Options Traders' },
    { value: 'prop_traders', label: 'Prop Firm Traders' },
    { value: 'day_traders', label: 'Day Traders' },
    { value: 'swing_traders', label: 'Swing Traders' },
    { value: 'general_finance', label: 'General Finance' },
    { value: 'mixed', label: 'Mixed Audience' },
  ];

  const promotionOptions = [
    { value: 'youtube', label: 'YouTube Videos & Reviews' },
    { value: 'instagram', label: 'Instagram Content' },
    { value: 'tiktok', label: 'TikTok Content' },
    { value: 'twitter', label: 'Twitter/X Posts' },
    { value: 'discord', label: 'Discord / Telegram' },
    { value: 'blog', label: 'Blog / Website' },
    { value: 'email', label: 'Email Newsletter' },
    { value: 'podcast', label: 'Podcast' },
    { value: 'courses', label: 'Trading Courses' },
    { value: 'referrals', label: 'Word of Mouth' },
    { value: 'multiple', label: 'Multiple Platforms' },
  ];

  const locationOptions = [
    { value: 'usa', label: 'United States' },
    { value: 'europe', label: 'Europe' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'canada', label: 'Canada' },
    { value: 'australia', label: 'Australia' },
    { value: 'asia', label: 'Asia' },
    { value: 'middle_east', label: 'Middle East' },
    { value: 'latin_america', label: 'Latin America' },
    { value: 'global', label: 'Global / Mixed' },
  ];

  const sourceOptions = [
    { value: 'social_media', label: 'Social Media' },
    { value: 'search_engine', label: 'Google Search' },
    { value: 'friend_referral', label: 'Friend Referral' },
    { value: 'existing_user', label: 'Finotaur User' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'blog_article', label: 'Blog / Article' },
    { value: 'other', label: 'Other' },
  ];

  // ============================================
  // RENDER
  // ============================================

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
            {showForm ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => formStep === 1 ? setShowForm(false) : setFormStep(1)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-400" />
                </button>
                <div>
                  <h2 className="text-white font-semibold">Partner Application</h2>
                  <p className="text-xs text-zinc-500">Step {formStep} of 2</p>
                </div>
              </div>
            ) : affiliateData.isAffiliate ? (
              /* 🔥 Green checkmark badge for approved affiliates */
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-emerald-400 font-semibold">AFFILIATE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-[#C9A646]" />
                </div>
                <span className="text-white font-semibold">Affiliate Program</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-[#C9A646] animate-spin" />
              </div>

            ) : affiliateData.isAffiliate ? (
              /* ============================================
                 🔥 v2.2 SIMPLIFIED AFFILIATE VIEW
                 Only shows code (no referral link)
                 ============================================ */
              <div className="space-y-5">
                {/* Success Badge */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">Active Partner</span>
                  </div>
                </div>

                {/* Coupon Code */}
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 block">
                    Your Coupon Code
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#C9A646]/5 border border-[#C9A646]/20 rounded-lg px-4 py-3 text-center">
                      <span className="text-[#C9A646] font-bold text-lg tracking-wider">
                        {affiliateData.code}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-4 bg-[#C9A646] hover:bg-[#B8953F] rounded-lg transition-colors flex items-center justify-center"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-black" />
                      ) : (
                        <Copy className="w-5 h-5 text-black" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Commission Info */}
                <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-4">
                  <p className="text-[#C9A646] text-xs font-semibold uppercase tracking-wider mb-2">
                    Your Benefits
                  </p>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <p>✓ Up to <span className="text-white font-semibold">20%</span> commission per referral</p>
                    <p>✓ <span className="text-white font-semibold">12 months</span> recurring income</p>
                    <p>✓ Milestone bonuses up to <span className="text-white font-semibold">$1,400+</span></p>
                  </div>
                </div>

                {/* Quick Stats (minimal) - only show if has referrals */}
                {(affiliateData.stats?.activeCustomers || 0) > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1A1A1A] rounded-xl p-3 text-center border border-zinc-800">
                      <Users className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-white">
                        {affiliateData.stats?.activeCustomers || 0}
                      </div>
                      <div className="text-[10px] text-zinc-500">Active Referrals</div>
                    </div>
                    <div className="bg-[#1A1A1A] rounded-xl p-3 text-center border border-zinc-800">
                      <DollarSign className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-emerald-400">
                        ${affiliateData.stats?.totalEarnings?.toFixed(0) || '0'}
                      </div>
                      <div className="text-[10px] text-zinc-500">Total Earned</div>
                    </div>
                  </div>
                )}
              </div>

            ) : affiliateData.hasApplication ? (
              /* ============================================
                 PENDING APPLICATION
                 ============================================ */
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-[#C9A646]/10 border-2 border-[#C9A646]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-[#C9A646]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Application Submitted</h3>
                <p className="text-sm text-zinc-400 mb-4">We're reviewing your application.<br/>Usually takes 24-48 hours.</p>
                <div className="bg-[#C9A646]/5 border border-[#C9A646]/20 rounded-xl p-3">
                  <p className="text-xs text-[#C9A646]">We'll notify you by email once approved.</p>
                </div>
              </div>

            ) : showForm ? (
              /* ============================================
                 APPLICATION FORM
                 ============================================ */
              <form onSubmit={handleSubmit(onSubmitApplication)} className="space-y-4">
                {/* Progress */}
                <div className="flex gap-2 mb-2">
                  <div className={`flex-1 h-1 rounded-full ${formStep >= 1 ? 'bg-[#C9A646]' : 'bg-zinc-800'}`} />
                  <div className={`flex-1 h-1 rounded-full ${formStep >= 2 ? 'bg-[#C9A646]' : 'bg-zinc-800'}`} />
                </div>

                {formStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    {/* Name & Email */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-zinc-400 text-xs mb-1.5 block">Full Name *</Label>
                        <Input
                          {...register("full_name")}
                          placeholder="John Doe"
                          className="bg-[#1A1A1A] border-zinc-800 text-white text-sm h-10"
                        />
                        {errors.full_name && <p className="text-red-400 text-[10px] mt-1">{errors.full_name.message}</p>}
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs mb-1.5 block">Email *</Label>
                        <Input
                          {...register("email")}
                          type="email"
                          placeholder="john@email.com"
                          className="bg-[#1A1A1A] border-zinc-800 text-white text-sm h-10"
                        />
                        {errors.email && <p className="text-red-400 text-[10px] mt-1">{errors.email.message}</p>}
                      </div>
                    </div>

                    {/* Phone & Country */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-zinc-400 text-xs mb-1.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Phone
                        </Label>
                        <Input
                          {...register("phone")}
                          placeholder="+1 234 567 8900"
                          className="bg-[#1A1A1A] border-zinc-800 text-white text-sm h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs mb-1.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Country
                        </Label>
                        <Input
                          {...register("country")}
                          placeholder="United States"
                          className="bg-[#1A1A1A] border-zinc-800 text-white text-sm h-10"
                        />
                      </div>
                    </div>

                    {/* Social - 2x2 grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-zinc-400 text-xs mb-1.5 flex items-center gap-1">
                          <Instagram className="w-3 h-3 text-pink-400" /> Instagram
                        </Label>
                        <Input
                          {...register("instagram_handle")}
                          placeholder="@username"
                          className="bg-[#1A1A1A] border-zinc-800 text-white text-sm h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs mb-1.5 flex items-center gap-1">
                          <Youtube className="w-3 h-3 text-red-500" /> YouTube
                        </Label>
                        <Input
                          {...register("youtube_channel")}
                          placeholder="Channel name"
                          className="bg-[#1A1A1A] border-zinc-800 text-white text-sm h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs mb-1.5 flex items-center gap-1">
                          <Twitter className="w-3 h-3 text-blue-400" /> Twitter/X
                        </Label>
                        <Input
                          {...register("twitter_handle")}
                          placeholder="@username"
                          className="bg-[#1A1A1A] border-zinc-800 text-white text-sm h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs mb-1.5 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-[#C9A646]" /> Website
                        </Label>
                        <Input
                          {...register("website_url")}
                          placeholder="https://..."
                          className="bg-[#1A1A1A] border-zinc-800 text-white text-sm h-10"
                        />
                      </div>
                    </div>

                    {/* Followers */}
                    <div>
                      <Label className="text-zinc-400 text-xs mb-1.5 block">Total Followers (all platforms)</Label>
                      <Input
                        type="number"
                        {...register("total_followers", { valueAsNumber: true })}
                        placeholder="10000"
                        className="bg-[#1A1A1A] border-zinc-800 text-white text-sm h-10"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={async () => {
                        const isValid = await trigger(['full_name', 'email']);
                        if (isValid) setFormStep(2);
                      }}
                      className="w-full bg-[#C9A646] hover:bg-[#B8953F] text-black font-medium h-10"
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </motion.div>
                )}

                {formStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    {/* Custom Code */}
                    <div>
                      <Label className="text-zinc-400 text-xs mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#C9A646]" /> Preferred Code (Optional)
                      </Label>
                      <div className="relative">
                        <Input
                          {...register("requested_code", {
                            onChange: (e) => {
                              e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                              setCodeError(null);
                              setCodeAvailable(null);
                            }
                          })}
                          placeholder="YOURCODE"
                          maxLength={15}
                          className={`bg-[#1A1A1A] border-zinc-800 text-white text-sm h-10 font-mono uppercase pr-8 ${
                            codeError ? 'border-red-500' : codeAvailable === true ? 'border-emerald-500' : ''
                          }`}
                          onBlur={async (e) => {
                            const code = e.target.value;
                            if (code && code.trim() !== '') {
                              setCheckingCode(true);
                              const isAvailable = await checkCodeAvailability(code);
                              setCheckingCode(false);
                              setCodeAvailable(isAvailable);
                              if (!isAvailable) setCodeError('Code taken');
                            }
                          }}
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {checkingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A646]" /> :
                           codeAvailable === true ? <Check className="w-3.5 h-3.5 text-emerald-400" /> :
                           codeAvailable === false ? <X className="w-3.5 h-3.5 text-red-400" /> : null}
                        </div>
                      </div>
                      {codeError && <p className="text-red-400 text-[10px] mt-1">{codeError}</p>}
                      {codeAvailable === true && <p className="text-emerald-400 text-[10px] mt-1">✓ Available</p>}
                    </div>

                    {/* Primary Audience */}
                    <div>
                      <Label className="text-zinc-400 text-xs mb-1.5 block">Primary Audience</Label>
                      <CustomSelect
                        value={primaryAudience}
                        onChange={setPrimaryAudience}
                        placeholder="Select audience type"
                        options={audienceOptions}
                      />
                    </div>

                    {/* Promotion Method */}
                    <div>
                      <Label className="text-zinc-400 text-xs mb-1.5 flex items-center gap-1">
                        <Target className="w-3 h-3 text-[#C9A646]" /> How will you promote? *
                      </Label>
                      <CustomSelect
                        value={promotionPlan}
                        onChange={setPromotionPlan}
                        placeholder="Select promotion method"
                        options={promotionOptions}
                      />
                      {errors.promotion_plan && <p className="text-red-400 text-[10px] mt-1">Please select a method</p>}
                    </div>

                    {/* Location */}
                    <div>
                      <Label className="text-zinc-400 text-xs mb-1.5 block">Audience Location</Label>
                      <CustomSelect
                        value={audienceLocation}
                        onChange={setAudienceLocation}
                        placeholder="Select region"
                        options={locationOptions}
                      />
                    </div>

                    {/* Source */}
                    <div>
                      <Label className="text-zinc-400 text-xs mb-1.5 block">How did you find us?</Label>
                      <CustomSelect
                        value={referralSource}
                        onChange={setReferralSource}
                        placeholder="Select source"
                        options={sourceOptions}
                      />
                    </div>

                    {/* Benefits */}
                    <div className="bg-[#C9A646]/5 border border-[#C9A646]/20 rounded-xl p-3">
                      <p className="text-[#C9A646] text-xs font-medium mb-1.5">What you'll get:</p>
                      <div className="text-[11px] text-zinc-400 space-y-0.5">
                        <p>✓ Up to 20% commission</p>
                        <p>✓ 12 months recurring income</p>
                        <p>✓ Bonuses up to $1,400+</p>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setFormStep(1)}
                        className="flex-1 text-zinc-400 hover:text-white h-10"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting || !!codeError || checkingCode}
                        className="flex-1 bg-[#C9A646] hover:bg-[#B8953F] text-black font-medium h-10 disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </form>

            ) : (
              /* ============================================
                 CTA - Join Program
                 ============================================ */
              <div className="space-y-5">
                {/* Hero */}
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#C9A646]/20 to-transparent border border-[#C9A646]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-6 h-6 text-[#C9A646]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Earn with Finotaur</h3>
                  <p className="text-sm text-zinc-400">Up to 20% commission on referrals</p>
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  {[
                    { icon: DollarSign, text: 'Up to 20% per referral', color: 'text-emerald-400' },
                    { icon: TrendingUp, text: '12 months recurring', color: 'text-[#C9A646]' },
                    { icon: Gift, text: 'Bonuses up to $1,400+', color: 'text-purple-400' },
                    { icon: Users, text: '5% from sub-affiliates', color: 'text-blue-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#1A1A1A] rounded-xl p-3">
                      <div className={`w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-zinc-300">{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-3 bg-gradient-to-r from-[#C9A646] to-[#B8953F] hover:from-[#B8953F] hover:to-[#A8852F] text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Apply Now
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-center text-[11px] text-zinc-500">
                  Free to join • No minimum followers
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}