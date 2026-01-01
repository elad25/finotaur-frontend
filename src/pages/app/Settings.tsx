// src/pages/Settings.tsx
// =====================================================
// FINOTAUR SETTINGS PAGE - v2.0.0
// =====================================================
// 
// 🔥 v2.0.0 CHANGES:
// - Added Subscription section with current plan display
// - Shows Platform + Journal subscription status
// - Upgrade CTA for free users
// - Manage subscription link for paid users
// =====================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { 
  Moon, Sun, Check, Crown, CreditCard, Sparkles, 
  ArrowRight, Gift, Clock, Zap, ExternalLink, Loader2
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface SubscriptionInfo {
  // Platform
  platform_plan: string | null;
  platform_subscription_status: string | null;
  platform_billing_interval: string | null;
  platform_subscription_expires_at: string | null;
  platform_is_in_trial: boolean;
  platform_trial_ends_at: string | null;
  platform_bundle_journal_granted: boolean;
  platform_bundle_newsletter_granted: boolean;
  // Journal (direct)
  account_type: string | null;
  subscription_status: string | null;
  subscription_interval: string | null;
  subscription_expires_at: string | null;
  is_in_trial: boolean;
  trial_ends_at: string | null;
  // Newsletter
  newsletter_status: string | null;
}

// ============================================
// HELPER: Format date
// ============================================

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// ============================================
// HELPER: Get plan display info
// ============================================

function getPlanDisplayInfo(plan: string | null) {
  const planInfo: Record<string, { name: string; color: string; icon: typeof Crown }> = {
    free: { name: 'Free', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40', icon: Zap },
    core: { name: 'Core', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', icon: Sparkles },
    pro: { name: 'Pro', color: 'bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/40', icon: Crown },
    enterprise: { name: 'Enterprise', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', icon: Crown },
    basic: { name: 'Basic', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', icon: Sparkles },
    premium: { name: 'Premium', color: 'bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/40', icon: Crown },
    trial: { name: 'Trial', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: Clock },
  };
  return planInfo[plan || 'free'] || planInfo.free;
}

// ============================================
// COMPONENT
// ============================================

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // ============================================
  // FETCH SUBSCRIPTION INFO
  // ============================================

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setLoadingSubscription(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            platform_plan,
            platform_subscription_status,
            platform_billing_interval,
            platform_subscription_expires_at,
            platform_is_in_trial,
            platform_trial_ends_at,
            platform_bundle_journal_granted,
            platform_bundle_newsletter_granted,
            account_type,
            subscription_status,
            subscription_interval,
            subscription_expires_at,
            is_in_trial,
            trial_ends_at,
            newsletter_status
          `)
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          setSubscriptionInfo(data);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, [user]);

  // ============================================
  // THEME OPTIONS
  // ============================================

  const themeOptions = [
    {
      id: "dark" as const,
      label: "Dark Mode",
      description: "Premium dark theme with gold accents",
      icon: Moon,
      preview: "bg-[#0a0f1a]",
      accentPreview: "bg-[#FFD700]",
    },
    {
      id: "light" as const,
      label: "Light Mode", 
      description: "Clean professional look with navy accents",
      icon: Sun,
      preview: "bg-white border border-gray-200",
      accentPreview: "bg-[#1e3a8a]",
    },
  ];

  // ============================================
  // DERIVED STATE
  // ============================================

  const platformPlan = subscriptionInfo?.platform_plan || 'free';
  const platformStatus = subscriptionInfo?.platform_subscription_status || 'active';
  const platformInfo = getPlanDisplayInfo(platformPlan);
  const isPlatformActive = ['active', 'trial'].includes(platformStatus);
  const isPlatformFree = platformPlan === 'free' || !platformPlan;
  const isPlatformPro = platformPlan === 'pro' || platformPlan === 'enterprise';

  // Journal access (direct or via bundle)
  const hasDirectJournal = subscriptionInfo?.account_type && 
    ['basic', 'premium', 'trial'].includes(subscriptionInfo.account_type) &&
    ['active', 'trial'].includes(subscriptionInfo.subscription_status || '');
  const hasJournalFromBundle = isPlatformPro && subscriptionInfo?.platform_bundle_journal_granted;
  const hasJournalAccess = hasDirectJournal || hasJournalFromBundle;
  const journalPlan = hasJournalFromBundle ? 'premium' : subscriptionInfo?.account_type;
  const journalInfo = getPlanDisplayInfo(journalPlan || null);

  // Newsletter
  const hasNewsletter = subscriptionInfo?.newsletter_status === 'active' || 
                        subscriptionInfo?.newsletter_status === 'trial' ||
                        subscriptionInfo?.platform_bundle_newsletter_granted;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and customize your workspace
        </p>
      </div>

      <div className="space-y-6">
        {/* ═══════════════════════════════════════════
            🔥 SUBSCRIPTION SECTION (NEW)
        ═══════════════════════════════════════════ */}
        <Card className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-[#C9A646]" />
                  Subscription
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage your Platform and Journal subscriptions
                </p>
              </div>
              {!isPlatformFree && (
                <Badge className={platformInfo.color + " border"}>
                  <platformInfo.icon className="w-3 h-3 mr-1" />
                  {platformInfo.name}
                </Badge>
              )}
            </div>
          </div>

          <Separator className="mb-6" />

          {loadingSubscription ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#C9A646]" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Platform Subscription */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Label className="text-base font-semibold flex items-center gap-2">
                      Platform
                      <Badge variant="outline" className={platformInfo.color + " border text-xs"}>
                        {platformInfo.name}
                      </Badge>
                      {subscriptionInfo?.platform_is_in_trial && (
                        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Trial
                        </Badge>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isPlatformFree 
                        ? 'Basic market access' 
                        : isPlatformPro 
                          ? 'Full access + Journal Premium + Newsletter'
                          : 'Full market intelligence dashboard'
                      }
                    </p>
                  </div>
                  
                  {isPlatformFree ? (
                    <Button 
                      onClick={() => navigate('/app/all-markets/pricing')}
                      className="bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black font-semibold hover:opacity-90"
                    >
                      Upgrade <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm">
                      Manage <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>

                {/* Platform Details */}
                {!isPlatformFree && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">Billing:</span>
                      <span className="ml-2 text-white capitalize">
                        {subscriptionInfo?.platform_billing_interval || 'Monthly'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Status:</span>
                      <span className={`ml-2 ${isPlatformActive ? 'text-green-400' : 'text-red-400'}`}>
                        {subscriptionInfo?.platform_is_in_trial ? 'Trial' : platformStatus}
                      </span>
                    </div>
                    {subscriptionInfo?.platform_is_in_trial && subscriptionInfo?.platform_trial_ends_at && (
                      <div className="col-span-2">
                        <span className="text-zinc-500">Trial ends:</span>
                        <span className="ml-2 text-amber-400">
                          {formatDate(subscriptionInfo.platform_trial_ends_at)}
                        </span>
                      </div>
                    )}
                    {!subscriptionInfo?.platform_is_in_trial && subscriptionInfo?.platform_subscription_expires_at && (
                      <div className="col-span-2">
                        <span className="text-zinc-500">Renews:</span>
                        <span className="ml-2 text-white">
                          {formatDate(subscriptionInfo.platform_subscription_expires_at)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bundle Indicators */}
                {isPlatformPro && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-2">Included in your Pro plan:</p>
                    <div className="flex flex-wrap gap-2">
                      {subscriptionInfo?.platform_bundle_journal_granted && (
                        <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400">
                          <Gift className="w-3 h-3 mr-1" />
                          Journal Premium
                        </Badge>
                      )}
                      {subscriptionInfo?.platform_bundle_newsletter_granted && (
                        <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                          <Gift className="w-3 h-3 mr-1" />
                          Newsletter
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Journal Subscription (if direct, not via bundle) */}
              {hasDirectJournal && !hasJournalFromBundle && (
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <Label className="text-base font-semibold flex items-center gap-2">
                        Journal
                        <Badge variant="outline" className={journalInfo.color + " border text-xs"}>
                          {journalInfo.name}
                        </Badge>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Trade journaling & analytics
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                </div>
              )}

              {/* No Journal Access - Show CTA */}
              {!hasJournalAccess && (
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 border-dashed">
                  <div className="flex items-start justify-between">
                    <div>
                      <Label className="text-base font-semibold text-zinc-400">Journal</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Track your trades with our professional journal
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/pricing-selection')}
                      className="border-[#C9A646]/40 text-[#C9A646] hover:bg-[#C9A646]/10"
                    >
                      Get Journal
                    </Button>
                  </div>
                </div>
              )}

              {/* Upgrade CTA for Free Users */}
              {isPlatformFree && (
                <div className="p-6 rounded-xl bg-gradient-to-r from-[#C9A646]/10 to-[#C9A646]/5 border border-[#C9A646]/30">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#C9A646]/20 flex items-center justify-center shrink-0">
                      <Crown className="w-6 h-6 text-[#C9A646]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">Upgrade to Pro</h3>
                      <p className="text-sm text-zinc-400 mb-3">
                        Get full market access, Journal Premium, and Newsletter choice - 
                        save over $30/month with the bundle!
                      </p>
                      <Button 
                        onClick={() => navigate('/app/all-markets/pricing')}
                        className="bg-[#C9A646] hover:bg-[#B8963F] text-black font-semibold"
                      >
                        View Plans <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ═══════════════════════════════════════════
            APPEARANCE SECTION
        ═══════════════════════════════════════════ */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Appearance</h2>
            <p className="text-sm text-muted-foreground">
              Customize how Finotaur looks on your device
            </p>
          </div>

          <Separator className="mb-6" />

          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-4 block">Theme</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose between dark and light mode. Your preference will be saved automatically.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = theme === option.id;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => setTheme(option.id)}
                      className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary shadow-lg scale-105"
                          : "border-border hover:border-primary/50 hover:scale-102"
                      }`}
                    >
                      {isSelected && (
                        <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                          <Check size={14} className="mr-1" />
                          Active
                        </Badge>
                      )}

                      <div className={`${option.preview} rounded-lg p-4 mb-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`h-2 w-16 ${option.accentPreview} rounded`} />
                          <div className={`h-2 w-12 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'} rounded`} />
                        </div>
                        <div className="space-y-2">
                          <div className={`h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'} rounded w-full`} />
                          <div className={`h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'} rounded w-4/5`} />
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Icon size={24} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                        <div className="flex-1">
                          <h3 className="font-bold mb-1">{option.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════
            ACCOUNT SECTION
        ═══════════════════════════════════════════ */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Account</h2>
            <p className="text-sm text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <Separator className="mb-6" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive alerts and updates via email</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Timezone</Label>
                <p className="text-sm text-muted-foreground">Eastern Time (ET)</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Language</Label>
                <p className="text-sm text-muted-foreground">English (US)</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════
            PRIVACY & SECURITY SECTION
        ═══════════════════════════════════════════ */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Privacy & Security</h2>
            <p className="text-sm text-muted-foreground">
              Manage your data and security settings
            </p>
          </div>

          <Separator className="mb-6" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Change Password</Label>
                <p className="text-sm text-muted-foreground">Update your password regularly</p>
              </div>
              <Button variant="outline" size="sm">Update</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Data Export</Label>
                <p className="text-sm text-muted-foreground">Download your data</p>
              </div>
              <Button variant="outline" size="sm">Request</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;