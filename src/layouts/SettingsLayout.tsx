// src/layouts/SettingsLayout.tsx
// =====================================================
// FINOTAUR UNIFIED SETTINGS LAYOUT
// Single layout with internal tabs - NO nested routes!
// =====================================================
// 🔧 UPDATED: Matches actual DB schema from profiles table
// 🔧 v2: Locked profile with edit button, removed theme,
//        dual subscriptions (platform + journal), no payment method,
//        simplified security
// 🔧 v3: Added Newsletter subscription management
// 🔧 v4: Added Top Secret subscription fields to query + display
// =====================================================

import { useState, useEffect, createContext, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { 
  Settings, Loader2, Save, Crown, Zap, ArrowRight, CreditCard, Bell, Shield,
  Clock, Calendar, CheckCircle2, AlertCircle, Key, Eye, EyeOff, 
  TrendingUp, Newspaper, AlertTriangle, Sparkles, Brain, Flame,
  Pencil, X, Globe, User, BookOpen, ExternalLink, Mail
} from "lucide-react";
import { toast } from "sonner";

// ============================================
// TYPES - Matches actual DB schema
// ============================================

type TabId = "general" | "billing" | "credits" | "notifications" | "security";

// Newsletter preferences JSONB structure
interface NewsletterPreferences {
  market_alerts?: boolean;
  daily_newsletter?: boolean;
  trade_alerts?: boolean;
  product_updates?: boolean;
  digest_frequency?: string;
  update_center_email?: boolean; // Push notifications for Update Center via email
}

// Profile data matching actual DB columns
interface ProfileData {
  // Basic info
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  preferred_timezone: string | null;
  
  // Platform subscription (main website)
  platform_plan: string | null;
  platform_subscription_status: string | null;
  platform_billing_interval: string | null;
  platform_subscription_started_at: string | null;
  platform_subscription_expires_at: string | null;
  platform_is_in_trial: boolean;
  platform_trial_ends_at: string | null;
  platform_cancelled_at: string | null;
  platform_cancel_at_period_end: boolean;
  
  // Trading Journal subscription (account_type)
  account_type: string | null;
  subscription_status: string | null;
  subscription_interval: string | null;
  subscription_expires_at: string | null;
  is_in_trial: boolean;
  trial_ends_at: string | null;
  
  // Newsletter subscription (War Zone)
  newsletter_enabled: boolean;
  newsletter_status: string | null;
  newsletter_paid: boolean;
  newsletter_paid_at: string | null;
  newsletter_whop_membership_id: string | null;
  newsletter_started_at: string | null;
  newsletter_expires_at: string | null;
  newsletter_trial_ends_at: string | null;
  newsletter_cancel_at_period_end: boolean;
  newsletter_unsubscribed_at: string | null;
  newsletter_interval: string | null;
  newsletter_preferences: NewsletterPreferences | null;
  
  // 🔥 Top Secret subscription - v5 FIXED: matches actual DB columns
  top_secret_enabled: boolean;
  top_secret_status: string | null;
  top_secret_whop_membership_id: string | null;
  top_secret_started_at: string | null;
  top_secret_expires_at: string | null;
  top_secret_interval: string | null;
  top_secret_cancel_at_period_end: boolean;
  top_secret_unsubscribed_at: string | null;
  top_secret_is_in_trial: boolean;
  top_secret_trial_ends_at: string | null;
  top_secret_trial_used: boolean;
  
  // 🔥 v5.0.0: Bundle subscription (War Zone + Top Secret)
  bundle_enabled: boolean;
  bundle_status: string | null;
  bundle_whop_membership_id: string | null;
  bundle_started_at: string | null;
  bundle_expires_at: string | null;
  bundle_interval: string | null;
  bundle_cancel_at_period_end: boolean;
  bundle_is_in_trial: boolean;
  bundle_trial_ends_at: string | null;
  bundle_trial_used: boolean;
  
  // UI preferences (stored in metadata JSONB)
  metadata: {
    compact_mode?: boolean;
    [key: string]: unknown;
  } | null;
  
  // Risk settings
  portfolio_size: number | null;
  risk_per_trade: number | null;
  risk_mode: string | null;
  
  // Account info
  role: string | null;
  is_lifetime: boolean;
  
  // Trade limits
  trade_count: number;
  max_trades: number;
  current_month_trades_count: number;
}

interface SettingsContextType {
  profile: ProfileData | null;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData | null>>;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  refreshProfile: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const SettingsContext = createContext<SettingsContextType | null>(null);

const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};

// ============================================
// CONSTANTS
// ============================================

const tabs: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "billing", label: "Subscription", icon: CreditCard },
  { id: "credits", label: "AI Credits", icon: Sparkles },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Jerusalem", label: "Israel (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function getPlanInfo(plan: string | null, type: 'platform' | 'journal' = 'platform') {
  if (type === 'journal') {
    const plans: Record<string, { name: string; price: string; color: string }> = {
      free: { name: 'Free', price: '$0', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
      basic: { name: 'Basic', price: '$30/mo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      premium: { name: 'Premium', price: '$39.99/mo', color: 'bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/30' },
    };
    return plans[plan || 'free'] || plans.free;
  }
  
  // Normalize: strip "platform_" prefix if present (DB stores "platform_core", UI uses "core")
  const normalizedPlan = (plan || 'free').replace('platform_', '');
  
  const plans: Record<string, { name: string; price: string; color: string }> = {
    free: { name: 'Free', price: '$0', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
    core: { name: 'Core', price: '$59/mo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    finotaur: { name: 'Finotaur', price: '$109/mo', color: 'bg-gradient-to-r from-[#C9A646]/20 to-amber-500/20 text-[#C9A646] border-[#C9A646]/40' },
    enterprise: { name: 'Enterprise', price: '$500/mo', color: 'bg-gradient-to-r from-[#C9A646]/20 to-amber-500/20 text-[#C9A646] border-[#C9A646]/40' },
  };
  return plans[normalizedPlan] || plans.free;
}

function getTimezoneLabel(value: string | null): string {
  const tz = timezones.find(t => t.value === value);
  return tz?.label || value || 'Not set';
}

// ============================================
// TAB: GENERAL (with locked profile + edit mode)
// ============================================

const GeneralTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile, setProfile, saving, setSaving } = useSettings();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for form fields
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState("America/New_York");

  // Sync local state with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || user?.email?.split('@')[0] || '');
      setTimezone(profile.preferred_timezone || "America/New_York");
    }
  }, [profile, user]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          preferred_timezone: timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Update local state
      setProfile(prev => prev ? { 
        ...prev, 
        display_name: displayName, 
        preferred_timezone: timezone,
      } : null);
      
      setIsEditing(false);
      toast.success('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setDisplayName(profile?.display_name || user?.email?.split('@')[0] || '');
    setTimezone(profile?.preferred_timezone || "America/New_York");
    setIsEditing(false);
  };

  const platformPlan = profile?.platform_plan || 'free';
  const isPro = ['platform_core', 'platform_finotaur', 'platform_enterprise'].includes(platformPlan);
  const platformIsFree = platformPlan === 'free' || !platformPlan;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 flex items-center justify-center border border-[#C9A646]/20">
            <Settings className="w-5 h-5 text-[#C9A646]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">General Settings</h1>
            <p className="text-sm text-zinc-400">Customize your profile and preferences</p>
          </div>
        </div>
        <Badge className="bg-[#C9A646]/15 text-[#C9A646] border-[#C9A646]/30 border px-3 py-1">
          {platformIsFree ? <Zap className="w-3.5 h-3.5 mr-1.5" /> : <Crown className="w-3.5 h-3.5 mr-1.5" />}
          {getPlanInfo(platformPlan, 'platform').name}
        </Badge>
      </div>

      {/* Profile Card - Locked with Edit Button */}
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-semibold text-white">Profile</h2>
          </div>
          
          {!isEditing ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="gap-2"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancel}
                className="gap-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={saving}
                className="gap-2 bg-[#C9A646] hover:bg-[#B8963F] text-black"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </Button>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {/* Display Name */}
          <div className="grid gap-1.5">
            <Label className="text-sm text-zinc-300">Display Name</Label>
            {isEditing ? (
              <Input 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="max-w-md h-10 bg-zinc-800/80 border-zinc-600/50 text-white placeholder:text-zinc-500"
              />
            ) : (
              <div className="max-w-md h-10 px-3 flex items-center rounded-md bg-zinc-800/40 border border-zinc-700/30 text-white">
                {profile?.display_name || user?.email?.split('@')[0] || 'Not set'}
              </div>
            )}
            <p className="text-xs text-zinc-500">Shown in the app and community</p>
          </div>
          
          {/* Email */}
          <div className="grid gap-1.5">
            <Label className="text-sm text-zinc-400">Email Address</Label>
            <div className="max-w-md h-10 px-3 flex items-center rounded-md bg-zinc-800/40 border border-zinc-700/30 text-zinc-400">
              {profile?.email || user?.email || ''}
            </div>
          </div>
        </div>
      </Card>

      {/* Timezone Card */}
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="font-semibold text-white">Regional</h2>
          </div>
          
          {!isEditing && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="gap-2"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
        </div>
        
        <div className="grid gap-1.5">
          <Label className="text-sm text-zinc-300">Timezone</Label>
          {isEditing ? (
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="max-w-md h-10 bg-zinc-800/80 border-zinc-600/50 text-white">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="max-w-md h-10 px-3 flex items-center rounded-md bg-zinc-800/40 border border-zinc-700/30 text-white">
              {getTimezoneLabel(profile?.preferred_timezone)}
            </div>
          )}
          <p className="text-xs text-zinc-500">Used for trade timestamps</p>
        </div>
      </Card>

      {/* Upgrade CTA (for free users) */}
      {platformPlan === 'free' && (
        <Card className="p-5 border-[#C9A646]/30 bg-gradient-to-r from-[#C9A646]/10 via-[#C9A646]/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C9A646]/30 to-[#C9A646]/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#C9A646]" />
              </div>
              <div>
                <p className="font-semibold text-white">Upgrade to Pro</p>
                <p className="text-sm text-zinc-400">Unlimited trades & premium features</p>
              </div>
            </div>
<Button 
  disabled
  size="sm" 
  className="bg-zinc-600 text-zinc-400 cursor-not-allowed opacity-50"
>
  Upgrade <ArrowRight className="w-4 h-4 ml-1" />
</Button>
          </div>
        </Card>
      )}
    </div>
  );
};


// ============================================
// 🔥 API HELPER: Manage Product Subscription
// ============================================

interface ProductSubscriptionResponse {
  success: boolean;
  message?: string;
  error?: string;
  subscription?: {
    product: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    expiresAt: string | null;
  };
}

async function manageProductSubscription(
  action: "cancel" | "reactivate" | "status",
  product: "newsletter" | "top_secret",
  reason?: string
): Promise<ProductSubscriptionResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(
`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, product, reason }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`❌ manageProductSubscription error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// TAB: BILLING (Platform + Trading Journal + Newsletter + Top Secret subscriptions)
// ============================================

const BillingTab = () => {
  const { profile, setProfile, saving, setSaving, refreshProfile } = useSettings();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Newsletter cancellation state
  const [showNewsletterCancelDialog, setShowNewsletterCancelDialog] = useState(false);
  const [showTopSecretCancelDialog, setShowTopSecretCancelDialog] = useState(false);
  const [cancellingTopSecret, setCancellingTopSecret] = useState(false);
  const [cancellingNewsletter, setCancellingNewsletter] = useState(false);
  
  // 🔥 NEW: Bundle cancellation states
  const [showBundleCancelDialog, setShowBundleCancelDialog] = useState(false);
  const [bundleCancelStep, setBundleCancelStep] = useState<'options' | 'retention_offer'>('options');
  const [bundleCancelLoading, setBundleCancelLoading] = useState(false);
  const [bundleCancelProduct, setBundleCancelProduct] = useState<'newsletter' | 'top_secret' | null>(null);
  const [bundleInfo, setBundleInfo] = useState<{
    otherProductName: string;
    priceImpact: { currentPrice: number; newPrice: number; affectedProduct: string } | null;
    cancellingFullPriceProduct?: boolean;
    discountedProductWillBeCancelled?: boolean;
    hasBundle?: boolean;  // 🔥 v2.7.0: Added for scenario detection
    bundleDetails?: {
      newsletterActive: boolean;
      topSecretActive: boolean;
      newsletterIsDiscounted: boolean;
      topSecretIsDiscounted: boolean;
      newsletterIsFullPrice: boolean;
      topSecretIsFullPrice: boolean;
    };
  } | null>(null);
  // 🔥 NEW: Separate loading states for reactivation
  const [reactivatingNewsletter, setReactivatingNewsletter] = useState(false);
  const [reactivatingTopSecret, setReactivatingTopSecret] = useState(false);
  const [reactivatingBundle, setReactivatingBundle] = useState(false);
  // 🔥 NEW: Upgrade states
  const [upgradingNewsletter, setUpgradingNewsletter] = useState(false);
  const [upgradingTopSecret, setUpgradingTopSecret] = useState(false);
  // 🔥 Platform cancel states
  const [showPlatformCancelDialog, setShowPlatformCancelDialog] = useState(false);
  const [cancellingPlatform, setCancellingPlatform] = useState(false);

  // Platform subscription (main website)
  const platformPlan = profile?.platform_plan || 'free';
  const platformStatus = profile?.platform_subscription_status || 'inactive';
  const platformInfo = getPlanInfo(platformPlan, 'platform');
  const platformIsActive = ['active', 'trial'].includes(platformStatus);
  const platformIsFree = platformPlan === 'free' || platformPlan === null || platformPlan === undefined || !platformPlan;
  
  // Trading Journal subscription
  const journalPlan = profile?.account_type || 'free';
  const journalStatus = profile?.subscription_status || 'inactive';
  const journalInfo = getPlanInfo(journalPlan, 'journal');
  const journalIsActive = ['active', 'trial'].includes(journalStatus);
  const journalIsFree = journalPlan === 'free' || !journalPlan;
  
  // Newsletter subscription (War Zone)
  const newsletterEnabled = profile?.newsletter_enabled ?? false;
  const newsletterPaid = profile?.newsletter_paid ?? false;
  const newsletterStatus = profile?.newsletter_status || 'inactive';
  const newsletterIsActive = newsletterStatus === 'active' || newsletterStatus === 'trial';
  const newsletterInterval = profile?.newsletter_interval || 'monthly';
  
  // 🔥 v6 FIXED: Top Secret subscription - proper active detection
  const topSecretEnabled = profile?.top_secret_enabled ?? false;
  const topSecretStatus = profile?.top_secret_status || 'inactive';
  const topSecretIsInTrial = profile?.top_secret_is_in_trial ?? false;
  // 🔥 v6.1 FIX: Check enabled flag AND valid status for active state (including 'canceling')
  const topSecretIsActive = topSecretEnabled && ['active', 'trial', 'trialing', 'canceling'].includes(topSecretStatus);
  const topSecretInterval = profile?.top_secret_interval || 'monthly';
  
  // 🔥 v5 FIXED: Calculate intro pricing status using actual DB fields
  const getTopSecretPricingInfo = () => {
    // Use DB trial flag instead of calculating
    if (topSecretIsInTrial && profile?.top_secret_trial_ends_at) {
      const trialEndsAt = new Date(profile.top_secret_trial_ends_at);
      const now = new Date();
      const trialDaysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      return { 
        isInTrial: true, 
        isInIntro: false, 
        introMonthsRemaining: 2, 
        currentPrice: 0,
        trialDaysRemaining,
      };
    }
    
    if (!profile?.top_secret_started_at || topSecretInterval === 'yearly') {
      return { 
        isInTrial: false,
        isInIntro: false, 
        introMonthsRemaining: 0, 
        currentPrice: topSecretInterval === 'yearly' ? 899 : 89.99,
        trialDaysRemaining: 0,
      };
    }
    
    const startedAt = new Date(profile.top_secret_started_at);
    const now = new Date();
    
    // Calculate months since started (after 14-day trial)
    // Trial is 14 days, then intro pricing kicks in
    const trialEndDate = new Date(startedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    const introEndDate = new Date(trialEndDate.getTime() + 2 * 30 * 24 * 60 * 60 * 1000); // ~2 months after trial
    
    if (now < trialEndDate) {
      // Still in trial
      return { isInTrial: true, isInIntro: false, introMonthsRemaining: 2, currentPrice: 0, trialDaysRemaining: Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) };
    } else if (now < introEndDate) {
      // In intro period ($44.99/mo - 50% off)
      const monthsIntoIntro = Math.floor((now.getTime() - trialEndDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
      return { isInTrial: false, isInIntro: true, introMonthsRemaining: 2 - monthsIntoIntro, currentPrice: 45 };
    } else {
      // Regular pricing ($89.99/mo)
      return { isInTrial: false, isInIntro: false, introMonthsRemaining: 0, currentPrice: 89.99 };
    }
  };
  
  const topSecretPricing = getTopSecretPricingInfo();
  
  // 🔥 NEW: Newsletter (War Zone) Pricing Info
  const getNewsletterPricingInfo = () => {
    if (!profile?.newsletter_started_at) {
      return { isInTrial: false, isInIntro: false, introMonthsRemaining: 2, currentPrice: 0, trialDaysRemaining: 0 };
    }
    
    const startedAt = new Date(profile.newsletter_started_at);
    const now = new Date();
    
    // Trial is 7 days, then intro pricing kicks in (50% off for 2 months = $34.99)
    const trialEndDate = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const introEndDate = new Date(trialEndDate.getTime() + 2 * 30 * 24 * 60 * 60 * 1000); // ~2 months after trial
    
    if (now < trialEndDate) {
      // Still in trial
      return { isInTrial: true, isInIntro: false, introMonthsRemaining: 2, currentPrice: 0, trialDaysRemaining: Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) };
    } else if (now < introEndDate) {
      // In intro period ($34.99/mo - 50% off)
      const monthsIntoIntro = Math.floor((now.getTime() - trialEndDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
      return { isInTrial: false, isInIntro: true, introMonthsRemaining: 2 - monthsIntoIntro, currentPrice: 44.99 };
    } else {
      // Regular pricing ($69.99/mo)
      return { isInTrial: false, isInIntro: false, introMonthsRemaining: 0, currentPrice: 69.99 };
    }
  };
  
  const newsletterPricing = getNewsletterPricingInfo();
  
  const isLifetime = profile?.is_lifetime ?? false;

// 🔥 v2.7.0: Check for bundle before cancelling - handles BOTH scenarios
  const checkBundleBeforeCancel = async (product: 'newsletter' | 'top_secret') => {
    if (!user) return false;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      console.log(`🔍 Checking bundle before cancel for ${product}...`);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "check_bundle",
            product,
          }),
        }
      );

      const data = await response.json();
      
      console.log(`📊 Bundle check response:`, data);
      
      // 🔥 v2.8.0: Only show Bundle Dialog for Scenario A (cancelling full price product)
      // Scenario A: Cancelling full price product → discounted product loses discount → Show Bundle Dialog
      // Scenario B: Cancelling discounted product → full price product unaffected → Show NORMAL Dialog (not Bundle!)
      if (data.hasBundle && data.cancellingFullPriceProduct) {
        console.log(`🎯 Scenario A detected - showing Bundle Dialog`);
        // Only show bundle dialog when cancelling FULL PRICE product
        setBundleCancelProduct(product);
        setBundleInfo({
          otherProductName: data.otherProductName,
          priceImpact: data.priceImpact,
          cancellingFullPriceProduct: true,
          discountedProductWillBeCancelled: data.discountedProductWillBeCancelled || false,
          bundleDetails: data.bundleDetails,
          hasBundle: true,
        });
        setShowBundleCancelDialog(true);
        return true; // Indicates bundle dialog shown
      }
      
      // Scenario B: Cancelling discounted product - proceed with normal cancel dialog
      // The full price product continues unchanged
      console.log(`📋 Scenario B or no bundle - showing normal dialog`);
      
      return false; // No bundle, proceed with normal cancel
    } catch (error) {
      console.error('Error checking bundle:', error);
      return false;
    }
  };

  const handleCancelNewsletter = async (cancelBothProducts?: boolean, confirmPriceIncrease?: boolean) => {
    if (!user) return;
    
    // First check for bundle (only if not already confirmed)
    if (!cancelBothProducts && !confirmPriceIncrease) {
      const hasBundleDialog = await checkBundleBeforeCancel('newsletter');
      if (hasBundleDialog) {
        setShowNewsletterCancelDialog(false);
        return;
      }
    }
    
    setCancellingNewsletter(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "cancel",
            product: "newsletter",
            reason: "User requested cancellation",
            cancelBothProducts,
            confirmPriceIncrease,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel newsletter");
      }
      
      // Refresh profile to get updated state from DB
      await refreshProfile();
      
      setShowNewsletterCancelDialog(false);
      toast.success(data.message || 'Newsletter subscription will be cancelled at period end');
    } catch (error) {
      console.error('Error cancelling newsletter:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel newsletter');
    } finally {
      setCancellingNewsletter(false);
    }
  };

  // Handle newsletter reactivation
  const handleReactivateNewsletter = async () => {
    setReactivatingNewsletter(true);
    try {
      const result = await manageProductSubscription("reactivate", "newsletter");
      
      if (!result.success) {
        throw new Error(result.error || "Failed to reactivate newsletter");
      }
      
      // Refresh profile to get updated state from DB
      await refreshProfile();
      
      toast.success(result.message || 'Newsletter subscription reactivated');
    } catch (error) {
      console.error('Error reactivating newsletter:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate newsletter');
    } finally {
      setReactivatingNewsletter(false);
    }
  };



  // Handle Top Secret cancellation
  const handleCancelTopSecret = async (cancelBothProducts?: boolean, confirmPriceIncrease?: boolean) => {
    if (!user) return;
    
    // First check for bundle (only if not already confirmed)
    if (!cancelBothProducts && !confirmPriceIncrease) {
      const hasBundleDialog = await checkBundleBeforeCancel('top_secret');
      if (hasBundleDialog) {
        setShowTopSecretCancelDialog(false);
        return;
      }
    }
    
    setCancellingTopSecret(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "cancel",
            product: "top_secret",
            reason: "User requested cancellation",
            cancelBothProducts,
            confirmPriceIncrease,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel Top Secret");
      }
      
      // Refresh profile to get updated state from DB
      await refreshProfile();
      
      setShowTopSecretCancelDialog(false);
      toast.success(data.message || 'Top Secret subscription will be cancelled at period end');
    } catch (error) {
      console.error('Error cancelling Top Secret:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel Top Secret');
    } finally {
      setCancellingTopSecret(false);
    }
  };

  // Handle Top Secret reactivation
  const handleReactivateTopSecret = async () => {
    setReactivatingTopSecret(true);
    try {
      const result = await manageProductSubscription("reactivate", "top_secret");
      
      if (!result.success) {
        throw new Error(result.error || "Failed to reactivate Top Secret");
      }
      
      // Refresh profile to get updated state from DB
      await refreshProfile();
      
      toast.success(result.message || 'Top Secret subscription reactivated');
    } catch (error) {
      console.error('Error reactivating Top Secret:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate Top Secret');
    } finally {
      setReactivatingTopSecret(false);
    }
  };

  // 🔥 NEW: Handle Newsletter upgrade from Monthly to Yearly
  const handleUpgradeNewsletterToYearly = async () => {
    if (!user) return;
    
    setUpgradingNewsletter(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Call create-whop-checkout edge function with yearly plan
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-whop-checkout`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan_id: 'plan_bp2QTGuwfpj0A', // War Zone Yearly plan
            subscription_category: 'newsletter',
            email: user.email,
            user_id: user.id,
            redirect_url: `${window.location.origin}/app/settings?tab=billing&upgrade=newsletter_yearly_success`,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Whop checkout
      window.location.href = data.checkout_url;
      
    } catch (error) {
      console.error('Error upgrading newsletter:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start upgrade');
      setUpgradingNewsletter(false);
    }
  };

  // 🔥 NEW: Handle Top Secret upgrade from Monthly to Yearly
  const handleUpgradeTopSecretToYearly = async () => {
    if (!user) return;
    
    setUpgradingTopSecret(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Call create-whop-checkout edge function with yearly plan
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-whop-checkout`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan_id: 'plan_PxxbBlSdkyeo7', // Top Secret Yearly plan
            subscription_category: 'top_secret',
            email: user.email,
            user_id: user.id,
            redirect_url: `${window.location.origin}/app/settings?tab=billing&upgrade=top_secret_yearly_success`,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Whop checkout
      window.location.href = data.checkout_url;
      
    } catch (error) {
      console.error('Error upgrading Top Secret:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start upgrade');
      setUpgradingTopSecret(false);
    }
  };


  // 🔥 Handle Platform subscription cancellation
  const handleCancelPlatform = async () => {
    if (!user) return;
    
    setCancellingPlatform(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "cancel",
            product: "platform",
            reason: "User requested cancellation",
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to cancel platform subscription");

      await refreshProfile();
      setShowPlatformCancelDialog(false);
      toast.success(data.message || 'Platform subscription will be cancelled at period end');
    } catch (error) {
      console.error('Error cancelling platform:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel');
    } finally {
      setCancellingPlatform(false);
    }
  };

  // 🔥 Handle Platform reactivation
  const handleReactivatePlatform = async () => {
    setCancellingPlatform(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "reactivate",
            product: "platform",
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Platform subscription reactivated!');
        await refreshProfile();
      } else {
        toast.error(data.error || 'Failed to reactivate');
      }
    } catch (error) {
      toast.error('Failed to reactivate platform subscription');
    } finally {
      setCancellingPlatform(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Subscriptions</h1>
          <p className="text-sm text-zinc-500">Manage your plans</p>
        </div>
      </div>

      {/* Platform Subscription Card (Main Website) */}
      <Card className={cn(
        "p-5 relative overflow-hidden",
        platformPlan === 'platform_core'
          ? "bg-gradient-to-br from-blue-950/30 via-zinc-900/80 to-zinc-900/90 border-blue-500/30"
          : ['platform_finotaur', 'platform_enterprise'].includes(platformPlan)
          ? "bg-gradient-to-br from-yellow-950/40 via-amber-950/30 to-zinc-900/90 border-2 border-[#C9A646]/40 shadow-xl shadow-amber-900/20"
          : "bg-zinc-900/50 border-zinc-700/50"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {platformIsFree ? (
              <Zap className="w-4 h-4 text-zinc-400" />
            ) : ['platform_core'].includes(platformPlan) ? (
              <Crown className="w-4 h-4 text-blue-400" />
            ) : (
              <Crown className="w-4 h-4 text-[#C9A646]" />
            )}
            <h2 className="font-medium text-white">Finotaur Platform</h2>
          </div>
          <a 
            href="https://whop.com/finotaur" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
          >
            Manage on Whop <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-white">{platformInfo.name}</span>
              <Badge variant="outline" className={cn(
                profile?.platform_cancel_at_period_end 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                  : platformInfo.color
              )}>
                {isLifetime ? (
                  <><Crown className="w-3 h-3 mr-1" />Lifetime</>
                ) : profile?.platform_cancel_at_period_end ? (
                  <><Clock className="w-3 h-3 mr-1" />Cancelling</>
                ) : platformIsActive ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" />{profile?.platform_is_in_trial ? 'Trial' : 'Active'}</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" />{platformStatus}</>
                )}
              </Badge>
            </div>
            <span className="text-lg font-semibold text-white">
              {isLifetime ? 'Lifetime' : platformInfo.price}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Billing cycle</p>
              <p className="capitalize text-zinc-300">
                {isLifetime ? 'Never expires' : (profile?.platform_billing_interval || 'N/A')}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">
                {profile?.platform_is_in_trial ? 'Trial ends' : 'Next billing'}
              </p>
              <p className="flex items-center gap-1 text-zinc-300">
                {isLifetime ? (
                  <><Crown className="w-3 h-3 text-[#C9A646]" />Forever</>
                ) : profile?.platform_is_in_trial ? (
                  <><Clock className="w-3 h-3 text-amber-400" />{formatDate(profile?.platform_trial_ends_at)}</>
                ) : (
                  <><Calendar className="w-3 h-3" />{formatDate(profile?.platform_subscription_expires_at)}</>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {(platformIsFree || platformPlan === 'free') ? (
            <Button
              size="sm"
              onClick={() => navigate('/app/all-markets/pricing')}
              className="mt-4 w-full bg-gradient-to-r from-[#C9A646] via-[#E5C76B] to-[#C9A646] hover:from-[#D4B04F] hover:via-[#F0D87A] hover:to-[#D4B04F] text-black font-semibold shadow-lg shadow-[#C9A646]/30 border border-[#C9A646]/50 transition-all duration-300 hover:shadow-[#C9A646]/50 hover:scale-[1.02]"
            >
              <Crown className="w-3.5 h-3.5 mr-1.5" />
              Upgrade Plan
            </Button>
          ) : platformIsActive && !isLifetime && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-700/50">
              {!profile?.platform_cancel_at_period_end && (
                <>
                  {profile?.platform_billing_interval === 'monthly' && (
                    <Button
                      size="sm"
                      onClick={() => navigate('/app/all-markets/pricing')}
                      className="bg-gradient-to-r from-[#C9A646] via-[#E5C76B] to-[#C9A646] hover:from-[#D4B04F] hover:via-[#F0D87A] hover:to-[#D4B04F] text-black font-semibold shadow-lg shadow-[#C9A646]/30 border border-[#C9A646]/50 transition-all duration-300 hover:shadow-[#C9A646]/50 hover:scale-[1.02]"
                    >
                      <Crown className="w-3.5 h-3.5 mr-1.5" />
                      Upgrade to Yearly {platformPlan === 'platform_core' ? '(Save 17%)' : '(Save 17%)'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => navigate('/app/all-markets/pricing')}
                    className="bg-gradient-to-r from-[#C9A646] via-[#E5C76B] to-[#C9A646] hover:from-[#D4B04F] hover:via-[#F0D87A] hover:to-[#D4B04F] text-black font-semibold shadow-lg shadow-[#C9A646]/30 border border-[#C9A646]/50 transition-all duration-300 hover:shadow-[#C9A646]/50 hover:scale-[1.02]"
                  >
                    <Crown className="w-3.5 h-3.5 mr-1.5" />
                    Upgrade Plan
                  </Button>
                </>
              )}
              {profile?.platform_cancel_at_period_end ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReactivatePlatform}
                  disabled={cancellingPlatform}
                  className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-400/50"
                >
                  {cancellingPlatform ? (
                    <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Restoring...</>
                  ) : (
                    <>Undo Cancellation</>
                  )}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlatformCancelDialog(true)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30"
                >
                  Unsubscribe
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Trading Journal Subscription Card */}
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <h2 className="font-medium text-white">Trading Journal</h2>
          </div>
          <a 
            href="https://whop.com/finotaur" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
          >
            Manage on Whop <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-white">{journalInfo.name}</span>
              <Badge variant="outline" className={journalInfo.color}>
                {journalIsActive ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" />{profile?.is_in_trial ? 'Trial' : 'Active'}</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" />{journalStatus}</>
                )}
              </Badge>
            </div>
            <span className="text-lg font-semibold text-white">{journalInfo.price}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Billing cycle</p>
              <p className="capitalize text-zinc-300">
                {profile?.subscription_interval || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">
                {profile?.is_in_trial ? 'Trial ends' : 'Next billing'}
              </p>
              <p className="flex items-center gap-1 text-zinc-300">
                {profile?.is_in_trial ? (
                  <><Clock className="w-3 h-3 text-amber-400" />{formatDate(profile?.trial_ends_at)}</>
                ) : (
                  <><Calendar className="w-3 h-3" />{formatDate(profile?.subscription_expires_at)}</>
                )}
              </p>
            </div>
          </div>
          
          {/* Trade limits info */}
          <div className="mt-4 pt-4 border-t border-zinc-700/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Monthly trades used</span>
              <span className="text-zinc-300">
                {profile?.current_month_trades_count || 0} / {profile?.max_trades === 999999 ? '∞' : profile?.max_trades || 10}
              </span>
            </div>
          </div>
        </div>

        {journalIsFree && (
          <div className="mt-4">
<Button 
  onClick={() => navigate('/app/journal/pricing')}
  size="sm" 
  className="bg-[#C9A646] hover:bg-[#B8963F] text-black"
>
  Upgrade Journal <ArrowRight className="w-4 h-4 ml-1" />
</Button>
          </div>
        )}
      </Card>

      {/* 🔥 WAR ZONE NEWSLETTER CARD - Hide if user has Bundle */}
      {!profile?.bundle_enabled && (
      <Card className={cn(
        "p-6 relative overflow-hidden shadow-xl",
        newsletterIsActive && newsletterInterval === 'yearly'
          ? "bg-gradient-to-br from-yellow-950/40 via-amber-950/30 to-zinc-900/90 border-2 border-yellow-500/40 shadow-yellow-900/20"
          : "bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-zinc-900/90 border-purple-600/30 shadow-purple-900/10"
      )}>
        {/* Subtle animated glow */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r via-transparent",
          newsletterIsActive && newsletterInterval === 'yearly'
            ? "from-yellow-500/10 to-amber-500/10"
            : "from-purple-600/5 to-purple-600/5"
        )} />
        <div className={cn(
          "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent",
          newsletterIsActive && newsletterInterval === 'yearly'
            ? "via-yellow-500/60"
            : "via-purple-500/50"
        )} />
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                newsletterIsActive && newsletterInterval === 'yearly'
                  ? "bg-gradient-to-br from-yellow-500/40 to-amber-500/30 border border-yellow-500/50 shadow-yellow-500/30"
                  : "bg-gradient-to-br from-purple-500/30 to-pink-500/20 border border-purple-500/40 shadow-purple-500/20"
              )}>
                <Mail className={cn(
                  "w-5 h-5",
                  newsletterIsActive && newsletterInterval === 'yearly' ? "text-yellow-300" : "text-purple-300"
                )} />
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">War Zone Intelligence</h2>
                <p className="text-xs text-zinc-400">Daily Market Newsletter</p>
              </div>
            </div>
            {newsletterIsActive && (
              <a 
                href="https://whop.com/finotaur" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-purple-300 flex items-center gap-1.5 transition-colors"
              >
                Manage on Whop <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          
          {/* Main Content Box */}
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-sm">
            {/* Plan & Price Row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-white">
                  {newsletterIsActive ? 'Premium Access' : 'Not Subscribed'}
                </span>
                {newsletterIsActive && newsletterInterval === 'yearly' && (
                  <Badge className="bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border border-yellow-500/50 text-xs px-2.5 py-1 shadow-lg shadow-yellow-500/20">
                    <Crown className="w-3.5 h-3.5 mr-1.5" />Annual Member
                  </Badge>
                )}
                <Badge variant="outline" className={cn(
                  "px-2.5 py-1",
                  profile?.newsletter_cancel_at_period_end
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : newsletterIsActive 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : newsletterStatus === 'cancelled'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                )}>
                  {profile?.newsletter_cancel_at_period_end ? (
                    <><Clock className="w-3 h-3 mr-1" />Cancelling</>
                  ) : newsletterIsActive ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />{newsletterStatus === 'trial' ? 'Trial' : 'Active'}</>
                  ) : newsletterStatus === 'cancelled' ? (
                    <><AlertCircle className="w-3 h-3 mr-1" />Cancelled</>
                  ) : (
                    <><AlertCircle className="w-3 h-3 mr-1" />Inactive</>
                  )}
                </Badge>
              </div>
              <div className="text-right">
                {newsletterIsActive ? (
                  newsletterInterval === 'yearly' ? (
                    <span className="text-xl font-bold text-white">$699/yr</span>
                  ) : newsletterPricing.isInTrial ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">Free Trial</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5">
                        {newsletterPricing.trialDaysRemaining} days left
                      </Badge>
                    </div>
                  ) : newsletterPricing.isInIntro ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">$44.99/mo</span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs px-2 py-0.5">
                        50% OFF
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-white">$69.99/mo</span>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 line-through text-sm">$69.99</span>
                    <span className="text-xl font-bold text-white">$44.99/mo</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Daily market intelligence</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Private Discord access</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Institutional-grade analysis</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Exclusive war zone alerts</span>
              </div>
            </div>

            {/* Billing Info for Active Subscribers */}
            {newsletterIsActive && (
              <div className={cn(
                "mb-5 p-4 rounded-lg",
                newsletterInterval === 'yearly'
                  ? "bg-gradient-to-br from-yellow-900/20 to-amber-900/10 border border-yellow-500/30"
                  : "bg-zinc-800/50 border border-zinc-700/40"
              )}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Billing cycle</p>
                    <p className={cn(
                      "capitalize font-medium",
                      newsletterInterval === 'yearly' ? "text-yellow-300" : "text-zinc-200"
                    )}>
                      {newsletterInterval === 'yearly' ? '✨ Yearly' : 'Monthly'}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
                      {newsletterPricing.isInTrial ? 'First charge' : 'Next billing'}
                    </p>
                    <p className="text-zinc-200 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {newsletterPricing.isInTrial && profile?.newsletter_started_at
                        ? formatDate(new Date(new Date(profile.newsletter_started_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
                        : formatDate(profile?.newsletter_expires_at)
                      }
                    </p>
                  </div>
                </div>
                
                {newsletterInterval === 'monthly' && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/30">
                    {newsletterPricing.isInTrial ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">7-Day Trial</Badge>
                        <span className="text-zinc-400">→ Then $44.99/mo for 2 months → $69.99/mo after</span>
                      </div>
                    ) : newsletterPricing.isInIntro ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Intro Pricing</Badge>
                        <span className="text-zinc-400">
                          {newsletterPricing.introMonthsRemaining === 2 
                            ? '$44.99 → $44.99 → Then $69.99/mo'
                            : '$44.99 → Then $69.99/mo'
                          }
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">Regular pricing active</p>
                    )}
                  </div>
                )}
                
                {profile?.newsletter_started_at && (
                  <div className="mt-2 pt-2 border-t border-zinc-700/30">
                    <p className="text-xs text-zinc-500">Member since {formatDate(profile.newsletter_started_at)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Status Footer */}
            {newsletterIsActive ? (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">
                    {profile?.newsletter_cancel_at_period_end ? (
                      <span>Access until {formatDate(
                        newsletterPricing.isInTrial && profile?.newsletter_trial_ends_at
                          ? profile.newsletter_trial_ends_at
                          : profile?.newsletter_expires_at
                      )}</span>
                    ) : newsletterStatus === 'trial' ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        Trial expires {formatDate(profile?.newsletter_trial_ends_at)}
                      </span>
                    ) : (
                      <span>Full access active</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 🔥 NEW: Upgrade to Yearly button for monthly subscribers */}
                    {newsletterInterval === 'monthly' && !profile?.newsletter_cancel_at_period_end && (
<Button
  size="sm"
  onClick={handleUpgradeNewsletterToYearly}
  disabled={upgradingNewsletter}
  className="bg-gradient-to-r from-[#C9A646] via-[#E5C76B] to-[#C9A646] hover:from-[#D4B04F] hover:via-[#F0D87A] hover:to-[#D4B04F] text-black font-semibold shadow-lg shadow-[#C9A646]/30 border border-[#C9A646]/50 transition-all duration-300 hover:shadow-[#C9A646]/50 hover:scale-[1.02]"
>
  {upgradingNewsletter ? (
    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Upgrading...</>
  ) : (
    <><Crown className="w-3.5 h-3.5 mr-1.5" />Upgrade to Yearly (Save $140)</>
  )}
</Button>
                    )}
                    {profile?.newsletter_cancel_at_period_end ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReactivateNewsletter}
                        disabled={reactivatingNewsletter}
                        className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/50"
                      >
                        {reactivatingNewsletter ? (
                          <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Restoring...</>
                        ) : (
                          <>Undo Cancellation</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewsletterCancelDialog(true)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30"
                      >
                        Unsubscribe
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : newsletterStatus === 'cancelled' ? (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Subscription cancelled</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReactivateNewsletter}
                    disabled={saving}
                    className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                  >
                    {saving ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Reactivating...</> : <>Reactivate</>}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 text-center font-medium">
                    🔥 Limited: 7-day FREE trial → $44.99/mo for 2 months → $69.99/mo
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/app/all-markets/warzone')}
                  size="sm"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium shadow-lg shadow-purple-900/20"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
      )}

      {/* 🔥 TOP SECRET CARD - Hide if user has Bundle */}
      {!profile?.bundle_enabled && (
      <Card className={cn(
        "p-6 relative overflow-hidden shadow-xl",
        topSecretIsActive && topSecretInterval === 'yearly'
          ? "bg-gradient-to-br from-yellow-950/40 via-amber-950/30 to-zinc-900/90 border-2 border-yellow-500/40 shadow-yellow-900/20"
          : "bg-gradient-to-br from-red-950/40 via-zinc-900/80 to-zinc-900/90 border-red-600/30 shadow-red-900/10"
      )}>


        {/* Subtle animated glow */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r via-transparent",
          topSecretIsActive && topSecretInterval === 'yearly'
            ? "from-yellow-500/10 to-amber-500/10"
            : "from-red-600/5 to-orange-600/5"
        )} />
        <div className={cn(
          "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent",
          topSecretIsActive && topSecretInterval === 'yearly'
            ? "via-yellow-500/60"
            : "via-red-500/50"
        )} />
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                topSecretIsActive && topSecretInterval === 'yearly'
                  ? "bg-gradient-to-br from-yellow-500/40 to-amber-500/30 border border-yellow-500/50 shadow-yellow-500/30"
                  : "bg-gradient-to-br from-red-500/30 to-orange-500/20 border border-red-500/40 shadow-red-500/20"
              )}>
                <Flame className={cn(
                  "w-5 h-5",
                  topSecretIsActive && topSecretInterval === 'yearly' ? "text-yellow-300" : "text-red-300"
                )} />
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                  Top Secret
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[10px] px-2 py-0.5 uppercase tracking-wider">
                    Classified
                  </Badge>
                </h2>
                <p className="text-xs text-zinc-400">Exclusive Insider Access</p>
              </div>
            </div>
            {topSecretIsActive && (
              <a 
                href="https://whop.com/finotaur" 
                target="_blank" 
                rel="noopener noreferrer"
                className={cn(
                  "text-xs flex items-center gap-1.5 transition-colors",
                  topSecretInterval === 'yearly'
                    ? "text-zinc-500 hover:text-yellow-300"
                    : "text-zinc-500 hover:text-red-300"
                )}
              >
                Manage on Whop <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          
          {/* Main Content Box */}
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-sm">
            {/* Plan & Price Row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-white">
                  {topSecretIsActive ? 'Premium Access' : 'Not Subscribed'}
                </span>
                {topSecretIsActive && topSecretInterval === 'yearly' && (
                  <Badge className="bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border border-yellow-500/50 text-xs px-2.5 py-1 shadow-lg shadow-yellow-500/20">
                    <Crown className="w-3.5 h-3.5 mr-1.5" />Annual Member
                  </Badge>
                )}
                <Badge variant="outline" className={cn(
                  "px-2.5 py-1",
                  profile?.top_secret_cancel_at_period_end
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : topSecretIsActive 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : topSecretStatus === 'cancelled'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                )}>
                  {profile?.top_secret_cancel_at_period_end ? (
                    <><Clock className="w-3 h-3 mr-1" />Cancelling</>
                  ) : topSecretIsActive ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />Active</>
                  ) : topSecretStatus === 'cancelled' ? (
                    <><AlertCircle className="w-3 h-3 mr-1" />Cancelled</>
                  ) : (
                    <><AlertCircle className="w-3 h-3 mr-1" />Inactive</>
                  )}
                </Badge>
              </div>
              <div className="text-right">
                {topSecretIsActive ? (
                  topSecretInterval === 'yearly' ? (
                    <span className="text-xl font-bold text-white">$899/yr</span>
                  ) : topSecretPricing.isInTrial ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">Free Trial</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5">
                        {topSecretPricing.trialDaysRemaining} days left
                      </Badge>
                    </div>
                  ) : topSecretPricing.isInIntro ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">$44.99/mo</span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs px-2 py-0.5">
                        50% OFF
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-white">$89.99/mo</span>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 line-through text-sm">$89.99</span>
                    <span className="text-xl font-bold text-white">$44.99/mo</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-[#C9A646] shrink-0" />
                <span>Market intelligence</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-[#C9A646] shrink-0" />
                <span>Private Discord access</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-[#C9A646] shrink-0" />
                <span>Premium insider alerts</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-[#C9A646] shrink-0" />
                <span>Early feature access</span>
              </div>
            </div>

            {/* Billing Info for Active Subscribers */}
            {topSecretIsActive && (
              <div className={cn(
                "mb-5 p-4 rounded-lg",
                topSecretInterval === 'yearly'
                  ? "bg-gradient-to-br from-yellow-900/20 to-amber-900/10 border border-yellow-500/30"
                  : "bg-zinc-800/50 border border-zinc-700/40"
              )}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Billing cycle</p>
                    <p className={cn(
                      "capitalize font-medium",
                      topSecretInterval === 'yearly' ? "text-yellow-300" : "text-zinc-200"
                    )}>
                      {topSecretInterval === 'yearly' ? '✨ Yearly' : 'Monthly'}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
                      {topSecretPricing.isInTrial ? 'First charge' : 'Next billing'}
                    </p>
                    <p className="text-zinc-200 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {topSecretPricing.isInTrial && profile?.top_secret_started_at
                        ? formatDate(new Date(new Date(profile.top_secret_started_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString())
                        : formatDate(profile?.top_secret_expires_at)
                      }
                    </p>
                  </div>
                </div>
                
                {topSecretInterval === 'monthly' && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/30">
                    {topSecretPricing.isInTrial ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">14-Day Trial</Badge>
                        <span className="text-zinc-400">→ Then $44.99/mo for 2 months → $89.99/mo after</span>
                      </div>
                    ) : topSecretPricing.isInIntro ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Intro Pricing</Badge>
                        <span className="text-zinc-400">
                          {topSecretPricing.introMonthsRemaining === 2 
                            ? '$44.99 → $44.99 → Then $89.99/mo'
                            : '$44.99 → Then $89.99/mo'
                          }
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">Regular pricing active</p>
                    )}
                  </div>
                )}
                
                {profile?.top_secret_started_at && (
                  <div className="mt-2 pt-2 border-t border-zinc-700/30">
                    <p className="text-xs text-zinc-500">Member since {formatDate(profile.top_secret_started_at)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Status Footer */}
            {topSecretIsActive ? (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">
                    {profile?.top_secret_cancel_at_period_end ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Access until {formatDate(
                          topSecretPricing.isInTrial && profile?.top_secret_trial_ends_at
                            ? profile.top_secret_trial_ends_at
                            : profile?.top_secret_expires_at
                        )}
                      </span>
                    ) : (
                      <span>Full classified access</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 🔥 NEW: Upgrade to Yearly button for monthly subscribers */}
                    {topSecretInterval === 'monthly' && !profile?.top_secret_cancel_at_period_end && (
                      <Button
                        size="sm"
                        onClick={handleUpgradeTopSecretToYearly}
                        disabled={upgradingTopSecret}
                        className="bg-gradient-to-r from-[#C9A646] via-[#E5C76B] to-[#C9A646] hover:from-[#D4B04F] hover:via-[#F0D87A] hover:to-[#D4B04F] text-black font-semibold shadow-lg shadow-[#C9A646]/30 border border-[#C9A646]/50 transition-all duration-300 hover:shadow-[#C9A646]/50 hover:scale-[1.02]"
                      >
                        {upgradingTopSecret ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Upgrading...</>
                        ) : (
                          <><Crown className="w-3.5 h-3.5 mr-1.5" />Upgrade to Yearly (Save $180)</>
                        )}
                      </Button>
                    )}
                    {profile?.top_secret_cancel_at_period_end ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReactivateTopSecret}
                        disabled={reactivatingTopSecret}
                        className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:border-red-400/50"
                      >
                        {reactivatingTopSecret ? (
                          <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Restoring...</>
                        ) : (
                          <>Undo Cancellation</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTopSecretCancelDialog(true)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30"
                      >
                        Unsubscribe
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : topSecretStatus === 'cancelled' ? (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Subscription cancelled</span>
                  <Button
                    onClick={() => navigate('/app/top-secret')}
                    variant="outline"
                    size="sm"
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                  >
                    Resubscribe
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 text-center font-medium">
                    🔥 Limited: 14-day FREE trial → $44.99/mo for 2 months → $89.99/mo
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/app/top-secret')}
                  size="sm"
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-medium shadow-lg shadow-red-900/20"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
      )}

      {/* 🔥 BUNDLE CARD - War Zone + Top Secret Combined */}
      {/* Show Bundle card ALWAYS - whether user has bundle, one product, or neither */}
      {(profile?.bundle_enabled || !profile?.bundle_enabled) && (
        <Card className={cn(
          "p-6 relative overflow-hidden shadow-xl border-2",
          profile?.bundle_enabled && profile?.bundle_interval === 'yearly'
            ? "bg-gradient-to-br from-yellow-950/50 via-amber-950/40 to-zinc-900/90 border-yellow-500/50 shadow-yellow-900/30"
            : "bg-gradient-to-br from-amber-950/40 via-yellow-950/30 to-zinc-900/90 border-amber-500/40 shadow-amber-900/20"
        )}>
          {/* Subtle animated glow */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r via-transparent",
            profile?.bundle_enabled && profile?.bundle_interval === 'yearly'
              ? "from-yellow-500/15 to-amber-500/15"
              : "from-amber-500/10 to-yellow-500/10"
          )} />
          <div className={cn(
            "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent",
            profile?.bundle_enabled && profile?.bundle_interval === 'yearly'
              ? "via-yellow-400/70"
              : "via-amber-500/60"
          )} />
          
          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg",
                  profile?.bundle_enabled && profile?.bundle_interval === 'yearly'
                    ? "bg-gradient-to-br from-yellow-500/50 to-amber-500/40 border-yellow-500/60 shadow-yellow-500/40"
                    : "bg-gradient-to-br from-amber-500/40 to-yellow-500/30 border-amber-500/50 shadow-amber-500/30"
                )}>
                  <Crown className={cn(
                    "w-5 h-5",
                    profile?.bundle_enabled && profile?.bundle_interval === 'yearly' ? "text-yellow-300" : "text-amber-300"
                  )} />
                </div>
                <div>
                  <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                    War Zone + Top Secret Bundle
                    {profile?.bundle_enabled && profile?.bundle_interval === 'yearly' && (
                      <Badge className="bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border border-yellow-500/50 text-[10px] px-2 py-0.5 uppercase tracking-wider shadow-lg shadow-yellow-500/20">
                        <Crown className="w-3 h-3 mr-1" />Annual
                      </Badge>
                    )}
                    {!profile?.bundle_enabled && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] px-2 py-0.5 uppercase tracking-wider">
                        Best Value
                      </Badge>
                    )}
                  </h2>
                  <p className="text-xs text-zinc-400">Complete Research Package</p>
                </div>
              </div>
              {profile?.bundle_enabled && (
                <a 
                  href="https://whop.com/finotaur" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-500 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
                >
                  Manage on Whop <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            
            {/* Main Content Box */}
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-sm">
              {/* Plan & Price Row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-white">
                    {profile?.bundle_enabled ? 'Active Bundle' : 'Premium Bundle'}
                  </span>
                  {profile?.bundle_enabled && (
                    <Badge variant="outline" className={cn(
                      "px-2.5 py-1",
                      profile?.bundle_cancel_at_period_end
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : profile?.bundle_is_in_trial
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    )}>
                      {profile?.bundle_cancel_at_period_end ? (
                        <><Clock className="w-3 h-3 mr-1" />Cancelling</>
                      ) : profile?.bundle_is_in_trial ? (
                        <><Clock className="w-3 h-3 mr-1" />Trial</>
                      ) : (
                        <><CheckCircle2 className="w-3 h-3 mr-1" />Active</>
                      )}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  {profile?.bundle_enabled ? (
                    profile?.bundle_interval === 'yearly' ? (
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-yellow-300">$1090/yr</span>
                        <span className="text-xs text-emerald-400">Save $218/year!</span>
                      </div>
                    ) : profile?.bundle_is_in_trial ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-white">Free Trial</span>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5">
                          {Math.max(0, Math.ceil((new Date(profile?.bundle_trial_ends_at || '').getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} days left
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-amber-400">$109/mo</span>
                    )
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-zinc-500 line-through text-sm">$159.98/mo</span>
                      <span className="text-xl font-bold text-amber-400">$109/mo</span>
                      <span className="text-xs text-emerald-400">Save $49.98/mo!</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>War Zone Daily Reports</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Top Secret Research</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>All Premium Discord</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Priority Support</span>
                </div>
              </div>

              {/* Billing Info for Active Bundle Subscribers */}
              {profile?.bundle_enabled && (
                <div className={cn(
                  "mb-5 p-4 rounded-lg",
                  profile?.bundle_interval === 'yearly'
                    ? "bg-gradient-to-br from-yellow-900/20 to-amber-900/10 border border-yellow-500/30"
                    : "bg-zinc-800/50 border border-zinc-700/40"
                )}>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Billing cycle</p>
                      <p className={cn(
                        "capitalize font-medium",
                        profile?.bundle_interval === 'yearly' ? "text-yellow-300" : "text-zinc-200"
                      )}>
                        {profile?.bundle_interval === 'yearly' ? '✨ Yearly' : 'Monthly'}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
                        {profile?.bundle_is_in_trial ? 'First charge' : 'Next billing'}
                      </p>
                      <p className="text-zinc-200 font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {formatDate(profile?.bundle_is_in_trial ? profile?.bundle_trial_ends_at : profile?.bundle_expires_at)}
                      </p>
                    </div>
                  </div>
                  
                  {profile?.bundle_started_at && (
                    <div className="mt-2 pt-2 border-t border-zinc-700/30">
                      <p className="text-xs text-zinc-500">Member since {formatDate(profile.bundle_started_at)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* CTA Section */}
              <div className="pt-4 border-t border-zinc-700/50">
                {profile?.bundle_enabled ? (
                  /* Active Bundle - Show Upgrade to Yearly or Cancel */
                  <div className="space-y-3">
                    {profile?.bundle_interval === 'monthly' && !profile?.bundle_cancel_at_period_end && (
                      <Button
                        onClick={async () => {
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            
                            if (!session?.access_token) {
                              toast.error("Please log in to upgrade");
                              return;
                            }

                            const response = await fetch(
                              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-whop-checkout`,
                              {
                                method: "POST",
                                headers: {
                                  "Authorization": `Bearer ${session.access_token}`,
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  plan_id: 'plan_M2zS1EoNXJF10', // Bundle Yearly plan
                                  subscription_category: 'bundle',
                                  email: user?.email,
                                  user_id: user?.id,
                                  redirect_url: `${window.location.origin}/app/settings?tab=billing&upgrade=bundle_yearly_success`,
                                }),
                              }
                            );

                            const data = await response.json();
                            
                            if (!response.ok || !data.checkout_url) {
                              throw new Error(data.error || "Failed to create checkout session");
                            }

                            window.location.href = data.checkout_url;
                          } catch (error) {
                            console.error('Error upgrading Bundle:', error);
                            toast.error(error instanceof Error ? error.message : 'Failed to start upgrade');
                          }
                        }}
                        size="sm"
                        className="w-full bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black font-semibold shadow-lg shadow-yellow-900/30"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade to Yearly (Save $218)
                      </Button>
                    )}
                    {profile?.bundle_cancel_at_period_end ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reactivatingBundle}
                        onClick={async () => {
                          setReactivatingBundle(true);
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.access_token) {
                              toast.error('Please log in to reactivate');
                              return;
                            }
                          
                            const response = await fetch(
                              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
                              {
                                method: "POST",
                                headers: {
                                  "Authorization": `Bearer ${session.access_token}`,
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  action: "reactivate",
                                  product: "bundle",
                                }),
                              }
                            );
                            const data = await response.json();
                            if (data.success) {
                              toast.success('Bundle subscription reactivated!');
                              await refreshProfile();
                            } else {
                              toast.error(data.error || 'Failed to reactivate');
                            }
                          } catch (error) {
                            toast.error('Failed to reactivate bundle');
                          } finally {
                            setReactivatingBundle(false);
                          }
                        }}
                        className="w-full border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                      >
                        {reactivatingBundle ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Reactivating...</>
                        ) : (
                          <>Reactivate Bundle</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBundleCancelDialog(true)}
                        className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30"
                      >
                        Unsubscribe
                      </Button>
                    )}
                  </div>
               ) : (
                  /* No Bundle - Show two pricing cards side by side */
                  <>
                    {/* Price Comparison Banner */}
                    <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs">
                      <span className="text-zinc-500 line-through">War Zone $69.99</span>
                      <span className="text-zinc-600">+</span>
                      <span className="text-zinc-500 line-through">Top Secret $89.99</span>
                      <span className="text-zinc-600">=</span>
                      <span className="text-zinc-500 line-through">$159.98/mo</span>
                    </div>

                    {/* Two Pricing Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* Monthly Bundle Card */}
                      <div className="relative p-4 rounded-xl bg-zinc-800/60 border border-amber-500/30">
                        {/* 7-Day Trial Badge */}
                        <div className="absolute -top-2.5 left-3">
                          <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                            7-DAY FREE TRIAL
                          </div>
                        </div>

                        <div className="pt-3">
                          <h4 className="text-sm font-bold text-white mb-2">Monthly Bundle</h4>
                          
                          {/* Price */}
                          <div className="mb-3">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-amber-400">$109</span>
                              <span className="text-zinc-500 text-xs">/month</span>
                            </div>
                            <p className="text-emerald-400 text-[10px] font-semibold mt-0.5">
                              Save $50.98/month vs separate!
                            </p>
                          </div>

                          {/* Features */}
                          <div className="space-y-1.5 mb-3">
                            <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              <span>War Zone Daily Intelligence</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              <span>Top Secret Reports (10/mo)</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              <span>Private Discord Access</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              <span>7-Day Free Trial</span>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <Button
                            onClick={() => {
                              const redirectUrl = encodeURIComponent(`${window.location.origin}/app/settings?tab=billing&upgrade=bundle_monthly_success`);
                              window.location.href = `https://whop.com/checkout/plan_ICooR8aqtdXad?email=${user?.email || ''}&redirect_url=${redirectUrl}`;
                            }}
                            size="sm"
                            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-semibold text-xs py-2"
                          >
                            <Crown className="w-3 h-3 mr-1" />
                            Start Free Trial
                          </Button>
                        </div>
                      </div>

                      {/* Yearly Bundle Card - BEST VALUE */}
                      <div className="relative p-4 rounded-xl bg-gradient-to-br from-yellow-900/40 to-amber-900/30 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/10">
                        {/* BEST VALUE Badge */}
                        <div className="absolute -top-2.5 right-3">
                          <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-yellow-500 to-amber-400 text-black shadow-lg shadow-yellow-500/30">
                            BEST VALUE
                          </div>
                        </div>

                        <div className="pt-3">
                          <h4 className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent mb-2">
                            Yearly Bundle
                          </h4>
                          
                          {/* Price */}
                          <div className="mb-3">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-white">$1090</span>
                              <span className="text-zinc-500 text-xs">/year</span>
                            </div>
                            <p className="text-emerald-400 text-[10px] font-semibold mt-0.5">
                              Just $90.83/mo — Save $218/year!
                            </p>
                          </div>

                          {/* Features */}
                          <div className="space-y-1.5 mb-3">
                            <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                              <span>Everything in Monthly</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                              <span>Locked price for 12 months</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                              <span>Priority support access</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                              <span>Founding member badge</span>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <Button
                            onClick={() => {
                              const redirectUrl = encodeURIComponent(`${window.location.origin}/app/settings?tab=billing&upgrade=bundle_yearly_success`);
                              window.location.href = `https://whop.com/checkout/plan_M2zS1EoNXJF10?email=${user?.email || ''}&redirect_url=${redirectUrl}`;
                            }}
                            size="sm"
                            className="w-full bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black font-semibold text-xs py-2"
                          >
                            <Crown className="w-3 h-3 mr-1" />
                            Get Yearly Bundle
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Link to Top Secret page for more info */}
                    <p className="text-center text-xs text-zinc-500">
                      <a href="/app/top-secret" className="text-amber-400 hover:text-amber-300 transition-colors">
                        No thanks, just Top Secret for $89.99/month →
                      </a>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Platform Cancel Confirmation Dialog */}
      <Dialog open={showPlatformCancelDialog} onOpenChange={setShowPlatformCancelDialog}>
        <DialogContent className="sm:max-w-md p-0 gap-0 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-[#C9A646]/20 border border-blue-500/30 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <DialogTitle className="text-xl font-semibold text-white mb-1">
                Cancel {platformInfo.name} Plan?
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                You'll lose access to all {platformInfo.name} features at the end of your billing period.
              </DialogDescription>
            </div>
          </div>

          <div className="mx-6 mb-4">
            <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/20">
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-medium text-amber-300">What you'll lose</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>All premium market analysis tools</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Advanced charts & indicators</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>AI Assistant & Flow Scanner</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Priority support access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 pt-2 space-y-3">
            <button
              onClick={() => setShowPlatformCancelDialog(false)}
              disabled={cancellingPlatform}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              Keep My {platformInfo.name} Plan
            </button>
            
            <button
              onClick={handleCancelPlatform}
              disabled={cancellingPlatform}
              className="w-full group py-3 px-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancellingPlatform ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Cancelling...</span></>
              ) : (
                <><X className="w-4 h-4" /><span>Yes, Cancel My Subscription</span></>
              )}
            </button>
            
            <p className="text-center text-xs text-zinc-500">
              You'll retain access until {formatDate(profile?.platform_subscription_expires_at)}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="p-4 bg-zinc-900/30 border-zinc-800">
        <p className="text-sm text-zinc-500 flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          All subscriptions are managed through Whop. Click "Manage on Whop" to update your plan, billing, or cancel.
        </p>
      </Card>

      {/* Newsletter Cancel Confirmation Dialog - Premium Design */}
<Dialog open={showNewsletterCancelDialog} onOpenChange={setShowNewsletterCancelDialog}>
  <DialogContent className="sm:max-w-md p-0 gap-0 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 shadow-2xl shadow-black/50 overflow-hidden">
    {/* Premium Header with Gradient */}
    <div className="relative px-6 pt-6 pb-4">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Icon badge */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/10">
          <Mail className="w-6 h-6 text-purple-400" />
        </div>
        
        <DialogTitle className="text-xl font-semibold text-white mb-1">
          Cancel War Zone Newsletter?
        </DialogTitle>
        <DialogDescription className="text-zinc-400 text-sm">
          You'll stop receiving our daily market intelligence reports and exclusive insights.
        </DialogDescription>
      </div>
    </div>
    
    {/* What you'll miss section */}
    <div className="mx-6 mb-4">
      <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent rounded-xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-300">What you'll miss</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Daily institutional-grade market analysis</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Exclusive war zone alerts & signals</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Private Discord community access</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Early access to market-moving intel</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="p-6 pt-2 space-y-3">
      {/* Keep Subscription - Primary CTA */}
      <button
        onClick={() => setShowNewsletterCancelDialog(false)}
        disabled={cancellingNewsletter}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="w-4 h-4" />
        Keep My Subscription
      </button>
      
      {/* Cancel - Secondary/Destructive */}
      <button
        onClick={() => handleCancelNewsletter()}
        disabled={cancellingNewsletter}
        className="w-full group py-3 px-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-700/50 disabled:hover:bg-zinc-800/30 disabled:hover:text-zinc-400"
      >
        {cancellingNewsletter ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Cancelling...</span>
          </>
        ) : (
          <>
            <X className="w-4 h-4" />
            <span>Yes, Cancel My Subscription</span>
          </>
        )}
      </button>
      
      <p className="text-center text-xs text-zinc-500">
        You'll retain access until the end of your billing period
      </p>
    </div>
  </DialogContent>
</Dialog>

      {/* Top Secret Cancel Confirmation Dialog - Premium Design */}
<Dialog open={showTopSecretCancelDialog} onOpenChange={setShowTopSecretCancelDialog}>
  <DialogContent className="sm:max-w-md p-0 gap-0 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 shadow-2xl shadow-black/50 overflow-hidden">
    {/* Premium Header with Gradient */}
    <div className="relative px-6 pt-6 pb-4">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Icon badge */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center mb-4 shadow-lg shadow-red-500/10">
          <Flame className="w-6 h-6 text-red-400" />
        </div>
        
        <DialogTitle className="text-xl font-semibold text-white mb-1">
          Cancel Top Secret Access?
        </DialogTitle>
        <DialogDescription className="text-zinc-400 text-sm">
          You'll lose access to exclusive intelligence and private community.
        </DialogDescription>
      </div>
    </div>
    
    {/* What you'll miss section */}
    <div className="mx-6 mb-4">
      <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent rounded-xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-300">What you'll miss</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Exclusive market intelligence reports</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Private Discord community access</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Premium insider alerts & signals</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Early access to new features</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="p-6 pt-2 space-y-3">
      {/* Keep Subscription - Primary CTA */}
      <button
        onClick={() => setShowTopSecretCancelDialog(false)}
        disabled={cancellingTopSecret}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="w-4 h-4" />
        Keep My Subscription
      </button>
      
      {/* Cancel - Secondary/Destructive */}
      <button
        onClick={() => handleCancelTopSecret()}
        disabled={cancellingTopSecret}
        className="w-full group py-3 px-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-700/50 disabled:hover:bg-zinc-800/30 disabled:hover:text-zinc-400"
      >
        {cancellingTopSecret ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Cancelling...</span>
          </>
        ) : (
          <>
            <X className="w-4 h-4" />
            <span>Yes, Cancel My Subscription</span>
          </>
        )}
      </button>
      
      <p className="text-center text-xs text-zinc-500">
        You'll retain access until the end of your billing period
      </p>
    </div>
  </DialogContent>
</Dialog>

    {/* 🔥 v4.0: Bundle Cancellation Dialog - Different flows for Monthly vs Yearly */}
      <Dialog open={showBundleCancelDialog} onOpenChange={(open) => {
        setShowBundleCancelDialog(open);
        if (!open) setBundleCancelStep('options'); // Reset step when closing
      }}>
        <DialogContent className={cn(
          "p-0 gap-0 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 shadow-2xl shadow-black/50 overflow-hidden",
          profile?.bundle_interval === 'yearly' ? "sm:max-w-[420px]" : "sm:max-w-md"
        )}>
          {/* ═══════════════════════════════════════════════ */}
          {/* 🔥 YEARLY BUNDLE CANCELLATION */}
          {/* ═══════════════════════════════════════════════ */}
          {profile?.bundle_interval === 'yearly' ? (
            <>
              {/* ═══ STEP 1: Options ═══ */}
              {bundleCancelStep === 'options' && (
                <>
                  {/* Premium Header with Enhanced Gradients */}
                  <div className="relative px-6 pt-8 pb-6 overflow-hidden">
                    {/* Animated gradient orbs */}
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -top-20 -left-20 w-48 h-48 bg-gradient-to-br from-red-500/15 via-orange-500/10 to-transparent rounded-full blur-3xl" />
                    <div className="absolute top-1/2 right-0 w-32 h-32 bg-gradient-to-l from-amber-400/10 to-transparent rounded-full blur-2xl" />
                    
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
                    
                    <div className="relative">
                      {/* Premium icon with glow */}
                      <div className="relative w-16 h-16 mb-5">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/40 to-red-500/40 rounded-2xl blur-xl" />
                        <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-red-500/30 border border-amber-500/50 flex items-center justify-center shadow-2xl shadow-amber-500/20">
                          <Crown className="w-8 h-8 text-amber-300" />
                        </div>
                      </div>
                      
                      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-white via-amber-100 to-white bg-clip-text text-transparent mb-2">
                        Cancel Yearly Bundle?
                      </DialogTitle>
                      <DialogDescription className="text-zinc-400 text-sm">
                        We're sorry to see you go. Choose how you'd like to proceed:
                      </DialogDescription>
                    </div>
                  </div>

                  {/* Options - Simplified for Yearly */}
                  <div className="px-6 pb-6 space-y-3">

                    {/* Info Notice: Must wait until period end for other plans */}
                    <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 border border-amber-500/20">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent rounded-xl" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <p className="text-sm font-medium text-amber-300">Important</p>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          Your yearly bundle is prepaid. If you'd like to switch to a different plan, 
                          you'll need to wait until your current subscription ends on{' '}
                          <span className="font-semibold text-amber-400">
                            {profile?.bundle_expires_at 
                              ? new Date(profile.bundle_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                              : 'your renewal date'}
                          </span>.
                        </p>
                      </div>
                    </div>

                    {/* Cancel Everything → Goes to Step 2 */}
                    <button
                      onClick={() => setBundleCancelStep('retention_offer')}
                      disabled={bundleCancelLoading}
                      className="w-full group relative p-4 rounded-xl border border-red-500/20 hover:border-red-500/40 bg-gradient-to-br from-red-950/20 to-zinc-900/50 hover:from-red-950/40 hover:to-zinc-900/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:bg-red-500/20 group-hover:border-red-500/30 transition-all">
                            <X className="w-5 h-5 text-red-400/80 group-hover:text-red-400 transition-colors" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-red-300/80 group-hover:text-red-300 transition-colors text-sm">
                              Cancel Everything
                            </p>
                            <p className="text-xs text-red-400/50">End all subscriptions at period end</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-red-500/30 group-hover:text-red-400/70 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>

                    {/* Keep Bundle Button - Premium Gold */}
                    <div className="pt-2">
                      <button
                        onClick={() => setShowBundleCancelDialog(false)}
                        disabled={bundleCancelLoading}
                        className="w-full relative py-4 px-6 rounded-2xl overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {/* Animated gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 bg-[length:200%_100%] group-hover:animate-shimmer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        
                        {/* Shine effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>
                        
                        <div className="relative flex items-center justify-center gap-2 font-semibold text-black">
                          <Crown className="w-5 h-5" />
                          <span>Keep My Premium Bundle</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ═══ STEP 2: Retention Offer (after clicking Cancel Everything) ═══ */}
              {bundleCancelStep === 'retention_offer' && (
                <>
                  {/* Premium Header with Gold/Amber Theme - Compact */}
                  <div className="relative px-5 pt-5 pb-4 overflow-hidden">
                    {/* Luxurious gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-950/60 via-yellow-950/40 to-zinc-900" />
                    
                    {/* Animated gradient orbs - smaller */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/25 via-yellow-500/15 to-transparent rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-yellow-400/20 via-amber-500/10 to-transparent rounded-full blur-3xl" />
                    
                    {/* Top accent line - golden */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/50 via-yellow-400 to-amber-500/50" />
                    
                    <div className="relative flex items-center gap-4">
                      {/* Premium icon with golden glow - smaller */}
                      <div className="relative w-11 h-11 shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/40 to-yellow-500/40 rounded-xl blur-lg" />
                        <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                          <Sparkles className="w-5 h-5 text-black" />
                        </div>
                      </div>
                      
                      <div>
                        <DialogTitle className="text-lg font-bold text-white">
                          Wait — <span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-300 bg-clip-text text-transparent">Special Offer</span>
                        </DialogTitle>
                        <DialogDescription className="text-amber-100/60 text-xs">
                          An exclusive discount, just for you
                        </DialogDescription>
                      </div>
                    </div>
                  </div>

                  {/* Offer Content - Compact */}
                  <div className="px-5 pb-5 space-y-3">
                    {/* Premium Offer Card */}
                    <div className="relative p-4 rounded-xl overflow-hidden">
                      {/* Card background with gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-amber-600/5" />
                      <div className="absolute inset-0 border border-amber-400/40 rounded-xl" />
                      
                      {/* Shine effect on card */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                      
                      {/* Exclusive offer badge */}
                      <div className="absolute -top-0.5 left-4">
                        <span className="px-2.5 py-1 rounded-b-md text-[10px] font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black shadow-md flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          EXCLUSIVE OFFER
                        </span>
                      </div>
                      
                      <div className="relative pt-5">
                        {/* Price Display - Compact */}
                        <div className="mb-3 p-3 rounded-lg bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/50">
                          <p className="text-xs text-zinc-400 mb-1.5">Your new yearly price:</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 bg-clip-text text-transparent">$926.50</span>
                            <span className="text-zinc-500 line-through text-sm">$1,090</span>
                            <span className="text-xs text-zinc-500">/year</span>
                          </div>
                          <Badge className="mt-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                            Save $163.50
                          </Badge>
                        </div>

                        {/* Coupon Code Display - Compact */}
                        <div className="mb-3 p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-dashed border-amber-400/30">
                          <p className="text-[10px] text-amber-300/60 mb-1.5 uppercase tracking-wide font-medium">Coupon code:</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-lg font-mono font-bold bg-gradient-to-r from-amber-300 to-yellow-300 bg-clip-text text-transparent tracking-wider">FINOTAUR15</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-amber-400/40 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                              onClick={() => {
                                navigator.clipboard.writeText('FINOTAUR15');
                                toast.success('Coupon code copied!');
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>

                        {/* Apply Discount Button - Compact */}
                        <button
                          onClick={() => {
                            setBundleCancelLoading(true);
                            const redirectUrl = encodeURIComponent(`${window.location.origin}/app/settings?tab=billing&upgrade=bundle_yearly_discount`);
                            window.location.href = `https://whop.com/checkout/plan_M2zS1EoNXJF10?email=${user?.email || ''}&d=FINOTAUR15&redirect_url=${redirectUrl}`;
                            setShowBundleCancelDialog(false);
                            setBundleCancelStep('options');
                          }}
                          disabled={bundleCancelLoading}
                          className="w-full relative py-2.5 px-4 rounded-lg overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                          
                          <div className="relative flex items-center justify-center gap-2 font-bold text-black text-sm">
                            {bundleCancelLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Apply 15% Discount & Stay
                              </>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="relative py-1">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-700/50"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 text-[10px] text-zinc-500 bg-zinc-900">or</span>
                      </div>
                    </div>

                    {/* Still Cancel Button */}
                    <button
                      onClick={async () => {
                        setBundleCancelLoading(true);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session?.access_token) throw new Error("Not authenticated");
                          
                          const response = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
                            {
                              method: "POST",
                              headers: {
                                "Authorization": `Bearer ${session.access_token}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                action: "cancel",
                                product: "bundle",
                                reason: "User declined retention offer",
                              }),
                            }
                          );
                          const data = await response.json();
                          if (data.success) {
                            toast.success('Bundle cancelled. Access continues until period end.');
                            refreshProfile();
                          } else {
                            toast.error(data.error || 'Failed to cancel');
                          }
                        } catch (error) {
                          toast.error('Failed to cancel bundle');
                        } finally {
                          setBundleCancelLoading(false);
                          setShowBundleCancelDialog(false);
                          setBundleCancelStep('options');
                        }
                      }}
                      disabled={bundleCancelLoading}
                      className="w-full py-2.5 px-3 rounded-lg border border-zinc-700/50 hover:border-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-300 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bundleCancelLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                      ) : (
                        "No thanks, cancel my subscription"
                      )}
                    </button>

                    {/* Back Button */}
                    <button
                      onClick={() => setBundleCancelStep('options')}
                      disabled={bundleCancelLoading}
                      className="w-full py-1.5 text-zinc-500 hover:text-amber-400 text-[11px] transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="w-2.5 h-2.5 rotate-180" />
                      Back to options
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            /* ═══════════════════════════════════════════════ */
            /* 🔥 MONTHLY BUNDLE - Same flow as Yearly but without discount */
            /* ═══════════════════════════════════════════════ */
            <>
              {/* ═══ STEP 1: Options ═══ */}
              {bundleCancelStep === 'options' && (
                <>
                  {/* Header */}
                  <div className="relative px-6 pt-6 pb-4">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
                    
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                      </div>
                      
                      <DialogTitle className="text-xl font-semibold text-white mb-1">
                        Cancel Monthly Bundle?
                      </DialogTitle>
                      <DialogDescription className="text-zinc-400 text-sm">
                        Choose what you'd like to do with your subscription
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="p-6 pt-2 space-y-3">
                    {/* Option 1: Keep Top Secret Monthly */}
                    <button
                      onClick={async () => {
                        setBundleCancelLoading(true);
                        try {
                          // Step 1: Cancel Bundle first
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session?.access_token) throw new Error("Not authenticated");
                          
                          const response = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
                            {
                              method: "POST",
                              headers: {
                                "Authorization": `Bearer ${session.access_token}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                action: "cancel",
                                product: "bundle",
                                reason: "User switching to Top Secret Monthly only",
                              }),
                            }
                          );
                          const data = await response.json();
                          
                          if (!data.success) {
                            throw new Error(data.error || 'Failed to cancel bundle');
                          }
                          
                          // Step 2: Redirect to Top Secret Monthly checkout
                          const redirectUrl = encodeURIComponent(`${window.location.origin}/app/settings?tab=billing&upgrade=top_secret_monthly_success`);
                          window.location.href = `https://whop.com/checkout/plan_tUvQbCrEQ4197?email=${user?.email || ''}&redirect_url=${redirectUrl}`;
                        } catch (error) {
                          console.error('Error:', error);
                          toast.error(error instanceof Error ? error.message : 'Failed to process. Please try again.');
                          setBundleCancelLoading(false);
                        }
                      }}
                      disabled={bundleCancelLoading}
                      className="w-full group p-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-zinc-800/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-700/50 disabled:hover:bg-zinc-800/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                            <Flame className="w-5 h-5 text-red-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-white group-hover:text-red-300 transition-colors">
                              Keep Top Secret Only
                            </p>
                            <p className="text-xs text-zinc-500">$89.99/month • Cancel War Zone</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>

                    {/* Option 2: Keep War Zone Monthly */}
                    <button
                      onClick={async () => {
                        setBundleCancelLoading(true);
                        try {
                          // Step 1: Cancel Bundle first
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session?.access_token) throw new Error("Not authenticated");
                          
                          const response = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
                            {
                              method: "POST",
                              headers: {
                                "Authorization": `Bearer ${session.access_token}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                action: "cancel",
                                product: "bundle",
                                reason: "User switching to War Zone Monthly only",
                              }),
                            }
                          );
                          const data = await response.json();
                          
                          if (!data.success) {
                            throw new Error(data.error || 'Failed to cancel bundle');
                          }
                          
                          // Step 2: Redirect to War Zone Monthly checkout
                          const redirectUrl = encodeURIComponent(`${window.location.origin}/app/settings?tab=billing&upgrade=newsletter_monthly_success`);
                          window.location.href = `https://whop.com/checkout/plan_U6lF2eO5y9469?email=${user?.email || ''}&redirect_url=${redirectUrl}`;
                        } catch (error) {
                          console.error('Error:', error);
                          toast.error(error instanceof Error ? error.message : 'Failed to process. Please try again.');
                          setBundleCancelLoading(false);
                        }
                      }}
                      disabled={bundleCancelLoading}
                      className="w-full group p-4 rounded-xl border border-zinc-700/50 hover:border-purple-500/40 bg-zinc-800/30 hover:bg-zinc-800/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-700/50 disabled:hover:bg-zinc-800/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                            <Mail className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-white group-hover:text-purple-300 transition-colors">
                              Keep War Zone Only
                            </p>
                            <p className="text-xs text-zinc-500">$69.99/month • Cancel Top Secret</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>

                    {/* Option 3: Cancel Everything */}
                    <button
                      onClick={async () => {
                        setBundleCancelLoading(true);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session?.access_token) throw new Error("Not authenticated");
                          
                          const response = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
                            {
                              method: "POST",
                              headers: {
                                "Authorization": `Bearer ${session.access_token}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                action: "cancel",
                                product: "bundle",
                                reason: "User cancelled monthly bundle",
                              }),
                            }
                          );
                          const data = await response.json();
                          if (data.success) {
                            toast.success('Bundle cancelled. Access continues until period end.');
                            refreshProfile();
                          } else {
                            toast.error(data.error || 'Failed to cancel');
                          }
                        } catch (error) {
                          toast.error('Failed to cancel bundle');
                        } finally {
                          setBundleCancelLoading(false);
                          setShowBundleCancelDialog(false);
                          setBundleCancelStep('options');
                        }
                      }}
                      disabled={bundleCancelLoading}
                      className="w-full group p-4 rounded-xl border border-red-500/30 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-red-500/30 disabled:hover:bg-red-500/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                            {bundleCancelLoading ? (
                              <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                            ) : (
                              <X className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-red-300 group-hover:text-red-200 transition-colors">
                              Cancel Everything
                            </p>
                            <p className="text-xs text-red-400/70">End all subscriptions at period end</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-red-500/50 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>

                    {/* Keep Bundle Button */}
                    <button
                      onClick={() => setShowBundleCancelDialog(false)}
                      disabled={bundleCancelLoading}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-medium transition-all duration-200 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Never Mind, Keep My Bundle
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>    </div>
  );
};

// ============================================
// TAB: CREDITS (Placeholder - needs credits table)
// ============================================

const CreditsTab = () => {
  const { profile } = useSettings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">AI Credits</h1>
          <p className="text-sm text-zinc-500">Manage your AI usage credits</p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="p-8 border-dashed border-2 border-zinc-700 bg-zinc-900/30">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#C9A646]/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-[#C9A646]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">AI Credits Coming Soon</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
            We're building a powerful AI credit system for advanced analysis, 
            automated insights, and intelligent trade suggestions.
          </p>
          <Badge variant="outline" className="bg-[#C9A646]/10 text-[#C9A646] border-[#C9A646]/30">
            <Clock className="w-3 h-3 mr-1" /> Coming Q2 2025
          </Badge>
        </div>
      </Card>

      {/* How It Will Work */}
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <p className="text-sm font-medium text-white mb-4">How Credits Will Work</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-emerald-400 text-sm font-medium">Light Actions</span>
              <p className="text-zinc-500 text-xs">FREE — View data, calendars, basic analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <span className="text-blue-400 text-sm font-medium">Medium Actions</span>
              <p className="text-zinc-500 text-xs">3-8 credits — AI trade analysis, pattern detection</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <span className="text-orange-400 text-sm font-medium">Heavy Actions</span>
              <p className="text-zinc-500 text-xs">10-20 credits — Deep reports, portfolio analysis</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// TAB: NOTIFICATIONS
// ============================================

const NotificationsTab = () => {
  const { user } = useAuth();
  const { profile, setProfile, saving, setSaving } = useSettings();
  
  // Local state for form fields - derived from DB structure
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketAlerts, setMarketAlerts] = useState(true);
  const [dailyNewsletter, setDailyNewsletter] = useState(true);
  const [tradeAlerts, setTradeAlerts] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState("weekly");
  const [updateCenterEmail, setUpdateCenterEmail] = useState(true);

  // Sync local state with profile data
  useEffect(() => {
    if (profile) {
      setEmailNotifications(profile.newsletter_enabled ?? true);
      setMarketAlerts(profile.newsletter_preferences?.market_alerts ?? true);
      setDailyNewsletter(profile.newsletter_preferences?.daily_newsletter ?? true);
      setTradeAlerts(profile.newsletter_preferences?.trade_alerts ?? true);
      setProductUpdates(profile.newsletter_preferences?.product_updates ?? true);
      setDigestFrequency(profile.newsletter_preferences?.digest_frequency || "weekly");
      setUpdateCenterEmail(profile.newsletter_preferences?.update_center_email ?? true);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const updatedPreferences: NewsletterPreferences = {
        market_alerts: marketAlerts,
        daily_newsletter: dailyNewsletter,
        trade_alerts: tradeAlerts,
        product_updates: productUpdates,
        digest_frequency: digestFrequency,
        update_center_email: updateCenterEmail,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          newsletter_enabled: emailNotifications,
          newsletter_preferences: updatedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { 
        ...prev, 
        newsletter_enabled: emailNotifications,
        newsletter_preferences: updatedPreferences,
      } : null);
      
      toast.success('Notification settings saved');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = !emailNotifications;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Notifications</h1>
          <p className="text-sm text-zinc-500">Control how you receive updates</p>
        </div>
      </div>

      {/* Master Toggle */}
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-white">Email Notifications</h2>
            <p className="text-sm text-zinc-500">Receive all notifications via email</p>
          </div>
          <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
        </div>
        {!emailNotifications && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-400">All email notifications are disabled</p>
          </div>
        )}
      </Card>

      {/* Trading Notifications */}
      <Card className={cn("p-5 bg-zinc-900/50 border-zinc-700/50 transition-opacity", isDisabled && 'opacity-50')}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h2 className="font-medium text-white">Trading</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-zinc-300">Trade alerts</Label>
              <p className="text-xs text-zinc-500">Important trade events and reminders</p>
            </div>
            <Switch checked={tradeAlerts} onCheckedChange={setTradeAlerts} disabled={isDisabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-zinc-300">Performance digest</Label>
              <p className="text-xs text-zinc-500">Summary of your trading performance</p>
            </div>
            <Switch checked={dailyNewsletter} onCheckedChange={setDailyNewsletter} disabled={isDisabled} />
          </div>

          {dailyNewsletter && !isDisabled && (
            <div className="pl-4 border-l-2 border-zinc-700">
              <Label className="text-xs text-zinc-500">Frequency</Label>
              <Select value={digestFrequency} onValueChange={setDigestFrequency}>
                <SelectTrigger className="h-9 bg-zinc-800/50 border-zinc-700 max-w-[180px] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {/* Market & News */}
      <Card className={cn("p-5 bg-zinc-900/50 border-zinc-700/50 transition-opacity", isDisabled && 'opacity-50')}>
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-4 h-4 text-blue-400" />
          <h2 className="font-medium text-white">Market & News</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-zinc-300">Market alerts</Label>
              <p className="text-xs text-zinc-500">Important market movements and news</p>
            </div>
            <Switch checked={marketAlerts} onCheckedChange={setMarketAlerts} disabled={isDisabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-zinc-300">Update Center notifications</Label>
              <p className="text-xs text-zinc-500">Get email alerts when new updates are posted</p>
            </div>
            <Switch checked={updateCenterEmail} onCheckedChange={setUpdateCenterEmail} disabled={isDisabled} />
          </div>
        </div>
      </Card>

      {/* Product Updates */}
      <Card className={cn("p-5 bg-zinc-900/50 border-zinc-700/50 transition-opacity", isDisabled && 'opacity-50')}>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-purple-400" />
          <h2 className="font-medium text-white">Product</h2>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-zinc-300">Product updates</Label>
            <p className="text-xs text-zinc-500">New features and improvements</p>
          </div>
          <Switch checked={productUpdates} onCheckedChange={setProductUpdates} disabled={isDisabled} />
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          size="sm" 
          className="bg-[#C9A646] hover:bg-[#B8963F] text-black"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Save changes</>
          )}
        </Button>
      </div>
    </div>
  );
};

// ============================================
// TAB: SECURITY (Simplified - only password)
// ============================================

const SecurityTab = () => {
  const { user } = useAuth();
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async () => {
    // Validation
    if (!currentPassword.trim()) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setSaving(true);
    try {
      // Step 1: Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }

      // Step 2: Update to new password
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (updateError) throw updateError;
      
      toast.success('Password updated successfully');
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Security</h1>
          <p className="text-sm text-zinc-500">Manage your account security</p>
        </div>
      </div>

      {/* Password Card */}
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-amber-400" />
          <h2 className="font-medium text-white">Password</h2>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-300">Change password</p>
            <p className="text-xs text-zinc-500">Update your account password</p>
          </div>
          
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Change</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change password</DialogTitle>
                <DialogDescription>Enter a new password for your account</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm">Current password</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                      className="h-9 pr-10" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">New password</Label>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="h-9" 
                  />
                  <p className="text-xs text-zinc-500">Minimum 8 characters</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Confirm password</Label>
                  <Input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="h-9" 
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={saving || !currentPassword || !newPassword || !confirmPassword} 
                  size="sm" 
                  className="bg-[#C9A646] hover:bg-[#B8963F] text-black"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// MAIN LAYOUT COMPONENT
// ============================================

export const SettingsLayout = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  
  // Get active tab from URL
  const pathTab = window.location.pathname.split('/settings/')[1] as TabId | undefined;
  const queryTab = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = pathTab || queryTab || 'general';
  
  const setActiveTab = (tab: TabId) => {
    if (tab === 'general') {
      navigate('/app/settings', { replace: true });
    } else {
      navigate(`/app/settings?tab=${tab}`, { replace: true });
    }
  };

  // 🔥 v4 FIXED: Fetch profile data WITH Top Secret fields
  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          display_name,
          email,
          avatar_url,
          preferred_timezone,
          platform_plan,
          platform_subscription_status,
          platform_billing_interval,
          platform_subscription_started_at,
          platform_subscription_expires_at,
          platform_is_in_trial,
          platform_trial_ends_at,
          platform_cancelled_at,
          platform_cancel_at_period_end,
          account_type,
          subscription_status,
          subscription_interval,
          subscription_expires_at,
          is_in_trial,
          trial_ends_at,
          newsletter_enabled,
          newsletter_preferences,
          newsletter_status,
          newsletter_paid,
          newsletter_paid_at,
          newsletter_whop_membership_id,
          newsletter_started_at,
          newsletter_expires_at,
          newsletter_trial_ends_at,
          newsletter_cancel_at_period_end,
          newsletter_unsubscribed_at,
          newsletter_interval,
          top_secret_enabled,
          top_secret_status,
          top_secret_whop_membership_id,
          top_secret_started_at,
          top_secret_expires_at,
          top_secret_interval,
          top_secret_cancel_at_period_end,
          top_secret_unsubscribed_at,
          top_secret_is_in_trial,
          top_secret_trial_ends_at,
          top_secret_trial_used,
          top_secret_paid,
          bundle_enabled,
          bundle_status,
          bundle_whop_membership_id,
          bundle_started_at,
          bundle_expires_at,
          bundle_interval,
          bundle_cancel_at_period_end,
          bundle_is_in_trial,
          bundle_trial_ends_at,
          bundle_trial_used,
          metadata,
          portfolio_size,
          risk_per_trade,
          risk_mode,
          role,
          is_lifetime,
          trade_count,
          max_trades,
          current_month_trades_count
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setProfile(data as ProfileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#C9A646]" />
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'general': return <GeneralTab />;
      case 'billing': return <BillingTab />;
      case 'credits': return <CreditsTab />;
      case 'notifications': return <NotificationsTab />;
      case 'security': return <SecurityTab />;
      default: return <GeneralTab />;
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      profile, 
      setProfile, 
      saving, 
      setSaving,
      refreshProfile: fetchProfile,
    }}>
      <div className="max-w-7xl mx-auto py-8 px-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-44 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                      isActive 
                        ? "bg-[#C9A646]/10 text-[#C9A646] font-medium" 
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-[#C9A646]" : "text-zinc-500")} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {renderTab()}
          </main>
        </div>
      </div>
    </SettingsContext.Provider>
  );
};

export default SettingsLayout;