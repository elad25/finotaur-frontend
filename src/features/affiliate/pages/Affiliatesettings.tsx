// src/features/affiliate/pages/Affiliatesettings.tsx
// 🚀 Optimized with memoization, useCallback, and performance improvements

import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  Settings, User, Mail, Phone, CreditCard, 
  Save, Check, AlertCircle, Copy, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// TYPES
// =====================================================

interface AffiliateProfile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  affiliate_code: string;
  coupon_code: string;
  status: string;
  current_tier: 'tier_1' | 'tier_2' | 'tier_3';
  discount_tier: 'standard' | 'vip';
  paypal_email: string | null;
  payment_method: string;
  created_at: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const TIER_CONFIG: Record<string, { name: string; commission: number }> = {
  tier_1: { name: 'Starter', commission: 10 },
  tier_2: { name: 'Growth', commission: 15 },
  tier_3: { name: 'Pro', commission: 20 },
};

const DISCOUNT_CONFIG: Record<string, { name: string; discount: number }> = {
  standard: { name: 'Standard', discount: 10 },
  vip: { name: 'VIP', discount: 15 },
};

type TierKey = keyof typeof TIER_CONFIG;
type DiscountKey = keyof typeof DISCOUNT_CONFIG;

// =====================================================
// MEMOIZED COMPONENTS
// =====================================================

interface SectionCardProps {
  children: React.ReactNode;
  highlight?: boolean;
}

const SectionCard = memo(function SectionCard({ children, highlight = false }: SectionCardProps) {
  return (
    <div 
      className="rounded-xl p-6"
      style={{
        background: highlight 
          ? 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.05) 100%)'
          : 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
        border: highlight 
          ? '1px solid rgba(201,166,70,0.2)'
          : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {children}
    </div>
  );
});

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
}

const SectionHeader = memo(function SectionHeader({ icon: Icon, title }: SectionHeaderProps) {
  return (
    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <Icon className="h-5 w-5 text-[#C9A646]" />
      {title}
    </h2>
  );
});

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  hint?: string;
}

const InputField = memo(function InputField({ 
  label, 
  value, 
  onChange, 
  placeholder,
  type = 'text',
  icon: Icon,
  disabled = false,
  hint
}: InputFieldProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        )}
        <input
          type={type}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "w-full py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A646]/50 disabled:opacity-50 disabled:cursor-not-allowed",
            Icon ? "pl-10 pr-4" : "px-4"
          )}
          placeholder={placeholder}
        />
      </div>
      {hint && (
        <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AffiliateSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [affiliate, setAffiliate] = useState<AffiliateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    display_name: '',
    phone: '',
    paypal_email: '',
  });

  // Fetch affiliate data
  useEffect(() => {
    let isMounted = true;

    async function fetchAffiliate() {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (!isMounted) return;

        if (error || !data) {
          navigate('/app/journal/overview');
          return;
        }

        setAffiliate(data);
        setFormData({
          display_name: data.display_name || '',
          phone: data.phone || '',
          paypal_email: data.paypal_email || '',
        });
      } catch (error) {
        console.error('Error fetching affiliate:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAffiliate();
    return () => { isMounted = false; };
  }, [user?.id, navigate]);

  // Handlers
  const handleDisplayNameChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, display_name: value }));
    setSaved(false);
    setError('');
  }, []);

  const handlePhoneChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, phone: value }));
    setSaved(false);
    setError('');
  }, []);

  const handlePaypalEmailChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, paypal_email: value }));
    setSaved(false);
    setError('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!affiliate?.id) return;

    // Validate PayPal email
    if (formData.paypal_email && !formData.paypal_email.includes('@')) {
      setError('Please enter a valid PayPal email address');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('affiliates')
        .update({
          display_name: formData.display_name,
          phone: formData.phone || null,
          paypal_email: formData.paypal_email || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', affiliate.id);

      if (error) {
        setError('Failed to save changes. Please try again.');
        console.error('Error saving:', error);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Update local state
      setAffiliate(prev => prev ? {
        ...prev,
        display_name: formData.display_name,
        phone: formData.phone || null,
        paypal_email: formData.paypal_email || null,
      } : null);

    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  }, [affiliate?.id, formData]);

  const handleCopyCode = useCallback(async () => {
    if (!affiliate?.affiliate_code) return;
    
    try {
      await navigator.clipboard.writeText(affiliate.affiliate_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [affiliate?.affiliate_code]);

  // Computed values
  const tierConfig = useMemo(() => {
    const tier = affiliate?.current_tier as TierKey | undefined;
    return tier ? TIER_CONFIG[tier] : TIER_CONFIG.tier_1;
  }, [affiliate?.current_tier]);

  const discountConfig = useMemo(() => {
    const discount = affiliate?.discount_tier as DiscountKey | undefined;
    return discount ? DISCOUNT_CONFIG[discount] : DISCOUNT_CONFIG.standard;
  }, [affiliate?.discount_tier]);

  const formattedCreatedAt = useMemo(() => {
    if (!affiliate?.created_at) return '';
    return new Date(affiliate.created_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [affiliate?.created_at]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C9A646]"></div>
      </div>
    );
  }

  if (!affiliate) {
    return null;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-[#C9A646]" />
          Affiliate Settings
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your profile and payout settings
        </p>
      </div>

      {/* Profile Section */}
      <SectionCard>
        <SectionHeader icon={User} title="Profile" />

        <div className="space-y-4">
          <InputField
            label="Display Name"
            value={formData.display_name}
            onChange={handleDisplayNameChange}
            placeholder="Your display name"
          />

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Email <span className="text-gray-500">(read-only)</span>
            </label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-gray-300">{affiliate.email}</span>
            </div>
          </div>

          <InputField
            label="Phone Number"
            value={formData.phone}
            onChange={handlePhoneChange}
            placeholder="+1 234 567 8900"
            type="tel"
            icon={Phone}
          />
        </div>
      </SectionCard>

      {/* Payout Settings */}
      <SectionCard>
        <SectionHeader icon={CreditCard} title="Payout Settings" />

        <div className="space-y-4">
          {/* Payment Method */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Payment Method
            </label>
            <div className="px-4 py-3 bg-black/20 border border-white/5 rounded-lg text-gray-300 capitalize">
              PayPal
            </div>
          </div>

          <InputField
            label="PayPal Email"
            value={formData.paypal_email}
            onChange={handlePaypalEmailChange}
            placeholder="your-paypal@email.com"
            type="email"
            icon={Mail}
            hint="Make sure this email is connected to a verified PayPal account"
          />

          {/* Payout Info */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Minimum Payout</span>
              <span className="text-white">$100</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-400">Payout Date</span>
              <span className="text-white">15th of each month</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Your Code Section */}
      <SectionCard highlight>
        <SectionHeader icon={Globe} title="Your Code" />

        <div className="space-y-4">
          {/* Coupon Code */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Coupon Code
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-black/30 border border-[#C9A646]/30 rounded-lg">
                <span className="text-xl font-mono font-bold text-[#C9A646]">
                  {affiliate.affiliate_code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className={cn(
                  "px-4 py-3 rounded-lg transition-all flex items-center gap-2",
                  copied 
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-[#C9A646]/20 text-[#C9A646] hover:bg-[#C9A646]/30"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tiers Info */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Commission Tier
              </label>
              <div className="text-white font-medium">
                {tierConfig.name} <span className="text-[#C9A646]">({tierConfig.commission}%)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Customer Discount
              </label>
              <div className="text-white font-medium">
                {discountConfig.name} <span className="text-emerald-400">({discountConfig.discount}% off)</span>
              </div>
            </div>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-500 flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            Contact support if you need to change your affiliate code
          </p>
        </div>
      </SectionCard>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
            saving
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : saved
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-[#C9A646] text-black hover:bg-[#D4B85A]"
          )}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black"></div>
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="h-5 w-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Account Info */}
      <div 
        className="rounded-xl p-4 text-sm text-gray-500"
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.03)',
        }}
      >
        <p>Affiliate since: {formattedCreatedAt}</p>
      </div>
    </div>
  );
}