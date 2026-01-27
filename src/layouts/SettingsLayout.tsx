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
      basic: { name: 'Basic', price: '$15/mo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      premium: { name: 'Premium', price: '$25/mo', color: 'bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/30' },
    };
    return plans[plan || 'free'] || plans.free;
  }
  
  const plans: Record<string, { name: string; price: string; color: string }> = {
    free: { name: 'Free', price: '$0', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
    core: { name: 'Core', price: '$19/mo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    pro: { name: 'Pro', price: '$49/mo', color: 'bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/30' },
  };
  return plans[plan || 'free'] || plans.free;
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
  const isPro = platformPlan === 'pro' || platformPlan === 'premium';

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
          {isPro ? <Crown className="w-3.5 h-3.5 mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
          {platformPlan.charAt(0).toUpperCase() + platformPlan.slice(1)}
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
  const [cancellingNewsletter, setCancellingNewsletter] = useState(false);
  const [cancellingTopSecret, setCancellingTopSecret] = useState(false);
  // 🔥 NEW: Separate loading states for reactivation
  const [reactivatingNewsletter, setReactivatingNewsletter] = useState(false);
  const [reactivatingTopSecret, setReactivatingTopSecret] = useState(false);

  // Platform subscription (main website)
  const platformPlan = profile?.platform_plan || 'free';
  const platformStatus = profile?.platform_subscription_status || 'inactive';
  const platformInfo = getPlanInfo(platformPlan, 'platform');
  const platformIsActive = ['active', 'trial'].includes(platformStatus);
  const platformIsFree = platformPlan === 'free' || !platformPlan;
  
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
        currentPrice: topSecretInterval === 'yearly' ? 500 : 89.99,
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
      // In intro period ($45/mo - 50% off)
      const monthsIntoIntro = Math.floor((now.getTime() - trialEndDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
      return { isInTrial: false, isInIntro: true, introMonthsRemaining: 2 - monthsIntoIntro, currentPrice: 45 };
    } else {
      // Regular pricing ($89.99/mo)
      return { isInTrial: false, isInIntro: false, introMonthsRemaining: 0, currentPrice: 89.99 };
    }
  };
  
  const topSecretPricing = getTopSecretPricingInfo();
  
  const isLifetime = profile?.is_lifetime ?? false;

  // Handle newsletter cancellation (War Zone)
  const handleCancelNewsletter = async () => {
    setCancellingNewsletter(true);
    try {
      const result = await manageProductSubscription("cancel", "newsletter", "User requested cancellation");
      
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel newsletter");
      }
      
      // Refresh profile to get updated state from DB
      await refreshProfile();
      
      setShowNewsletterCancelDialog(false);
      toast.success(result.message || 'Newsletter subscription will be cancelled at period end');
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
  const handleCancelTopSecret = async () => {
    setCancellingTopSecret(true);
    try {
      const result = await manageProductSubscription("cancel", "top_secret", "User requested cancellation");
      
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel Top Secret");
      }
      
      // Refresh profile to get updated state from DB
      await refreshProfile();
      
      setShowTopSecretCancelDialog(false);
      toast.success(result.message || 'Top Secret subscription will be cancelled at period end');
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
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {platformPlan === 'pro' ? (
              <Crown className="w-4 h-4 text-[#C9A646]" />
            ) : (
              <Zap className="w-4 h-4 text-zinc-400" />
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
              <Badge variant="outline" className={platformInfo.color}>
                {isLifetime ? (
                  <><Crown className="w-3 h-3 mr-1" />Lifetime</>
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

      {/* 🔥 WAR ZONE NEWSLETTER CARD */}
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
                  {newsletterStatus === 'trial' ? 'Free Trial' : newsletterIsActive ? 'Premium' : 'Free'}
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
              <span className="text-xl font-bold text-white">
                {newsletterStatus === 'trial' ? 'Free' : newsletterIsActive ? (newsletterInterval === 'yearly' ? '$699/yr' : '$69.99/mo') : 'Free'}
              </span>
            </div>
            
            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Daily market intelligence</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span>AI-powered analysis</span>
              </div>
              {newsletterIsActive && (
                <>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <Crown className="w-4 h-4 text-[#C9A646] shrink-0" />
                    <span>Institutional insights</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <Crown className="w-4 h-4 text-[#C9A646] shrink-0" />
                    <span>Exclusive alerts</span>
                  </div>
                </>
              )}
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
                      {newsletterStatus === 'trial' ? 'First charge' : 'Next billing'}
                    </p>
                    <p className="text-zinc-200 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {formatDate(profile?.newsletter_expires_at)}
                    </p>
                  </div>
                </div>
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
                      <span>Access until {formatDate(profile?.newsletter_expires_at)}</span>
                    ) : newsletterStatus === 'trial' ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        Trial expires {formatDate(profile?.newsletter_trial_ends_at)}
                      </span>
                    ) : (
                      <span>Full access active</span>
                    )}
                  </div>
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
                <Button disabled size="sm" className="w-full bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700">
                  Coming Soon
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 🔥 TOP SECRET CARD */}
      <Card className="p-6 bg-gradient-to-br from-red-950/40 via-zinc-900/80 to-zinc-900/90 border-red-600/30 relative overflow-hidden shadow-xl shadow-red-900/10">
        {/* Subtle animated glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-transparent to-orange-600/5" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/30 to-orange-500/20 flex items-center justify-center border border-red-500/40 shadow-lg shadow-red-500/20">
                <Flame className="w-5 h-5 text-red-300" />
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
                className="text-xs text-zinc-500 hover:text-red-300 flex items-center gap-1.5 transition-colors"
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
                    <span className="text-xl font-bold text-white">$500/yr</span>
                  ) : topSecretPricing.isInTrial ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">Free Trial</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5">
                        {topSecretPricing.trialDaysRemaining} days left
                      </Badge>
                    </div>
                  ) : topSecretPricing.isInIntro ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">$45/mo</span>
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
                    <span className="text-xl font-bold text-white">$45/mo</span>
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
              <div className="mb-5 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/40">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Billing cycle</p>
                    <p className="capitalize text-zinc-200 font-medium">{topSecretInterval}</p>
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
                        <span className="text-zinc-400">→ Then $45/mo for 2 months → $89.99/mo after</span>
                      </div>
                    ) : topSecretPricing.isInIntro ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Intro Pricing</Badge>
                        <span className="text-zinc-400">
                          {topSecretPricing.introMonthsRemaining === 2 
                            ? '$45 → $45 → Then $89.99/mo'
                            : '$45 → Then $89.99/mo'
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
                        Access until {formatDate(profile?.top_secret_expires_at)}
                      </span>
                    ) : (
                      <span>Full classified access</span>
                    )}
                  </div>
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
                      className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      Cancel
                    </Button>
                  )}
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
                    🔥 Limited: 14-day FREE trial → $45/mo for 2 months → $89.99/mo
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

      {/* Info Card */}
      <Card className="p-4 bg-zinc-900/30 border-zinc-800">
        <p className="text-sm text-zinc-500 flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          All subscriptions are managed through Whop. Click "Manage on Whop" to update your plan, billing, or cancel.
        </p>
      </Card>

      {/* Newsletter Cancel Confirmation Dialog */}
      <Dialog open={showNewsletterCancelDialog} onOpenChange={setShowNewsletterCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel War Zone Newsletter?</DialogTitle>
            <DialogDescription>
              You'll stop receiving our daily market intelligence reports and exclusive insights.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-200 leading-relaxed">
                <strong>What you'll miss:</strong>
                <br />• Daily AI-powered market analysis
                <br />• Exclusive war zone alerts
                <br />• {newsletterPaid ? 'Premium institutional insights' : 'Free market updates'}
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewsletterCancelDialog(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelNewsletter}
              disabled={cancellingNewsletter}
            >
              {cancellingNewsletter ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top Secret Cancel Confirmation Dialog */}
      <Dialog open={showTopSecretCancelDialog} onOpenChange={setShowTopSecretCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Top Secret Access?</DialogTitle>
            <DialogDescription>
              You'll lose access to exclusive intelligence and private community.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-200 leading-relaxed">
                <strong>What you'll miss:</strong>
                <br />• Exclusive market intelligence
                <br />• Private Discord community access
                <br />• Premium insider alerts
                <br />• Early access to new features
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTopSecretCancelDialog(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelTopSecret}
              disabled={cancellingTopSecret}
            >
              {cancellingTopSecret ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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