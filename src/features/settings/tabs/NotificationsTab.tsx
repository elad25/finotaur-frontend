// src/features/settings/tabs/NotificationsTab.tsx
// Reorganized: Email Notifications section (existing behavior preserved) +
// Push Notifications section (new, wired to webpush infrastructure).

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Save, Bell, Zap, TrendingUp, Newspaper, AlertTriangle, Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ds/Spinner";
import { useSettings } from "../settings-shared";
import type { NewsletterPreferences } from "../settings-shared";
import {
  getPushPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
} from "@/lib/webpush";
import type { PushPermissionState } from "@/lib/webpush";

export const NotificationsTab = () => {
  const { user } = useAuth();
  const { profile, setProfile, saving, setSaving } = useSettings();

  // ── Email notification state (DB-backed) ────────────────────────────────────
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketAlerts, setMarketAlerts] = useState(true);
  const [dailyNewsletter, setDailyNewsletter] = useState(true);
  const [tradeAlerts, setTradeAlerts] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState("weekly");
  const [updateCenterEmail, setUpdateCenterEmail] = useState(true);

  // ── Push notification state (local only — subscription lives in push_subscriptions) ─
  const [pushPermission, setPushPermission] = useState<PushPermissionState>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  // Sync email state with profile data
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

  // Detect current push subscription state on mount
  useEffect(() => {
    const permission = getPushPermissionState();
    setPushPermission(permission);

    if (permission === 'granted') {
      getCurrentSubscription().then((sub) => {
        setPushSubscribed(sub !== null);
      });
    }
  }, []);

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

  const handlePushToggle = async (checked: boolean) => {
    setPushBusy(true);
    try {
      if (checked) {
        const result = await subscribeToPush();
        if (result.ok) {
          setPushPermission('granted');
          setPushSubscribed(true);
          toast.success('Push notifications enabled');
        } else {
          // Permission was denied by the user in the browser prompt
          if (result.reason === 'denied') {
            setPushPermission('denied');
            toast.error('Permission denied — enable push notifications in your browser settings');
          } else {
            toast.error('Failed to enable push notifications');
          }
        }
      } else {
        await unsubscribeFromPush();
        setPushSubscribed(false);
        toast.success('Push notifications disabled');
      }
    } finally {
      setPushBusy(false);
    }
  };

  const isEmailDisabled = !emailNotifications;
  const isPushDenied = pushPermission === 'denied';
  const isPushUnsupported = pushPermission === 'unsupported';
  const isPushSwitchOn = pushPermission === 'granted' && pushSubscribed;

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

      {/* ── SECTION 1: Email Notifications ───────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3 px-1">
          Email notifications
        </h2>

        {/* Master Toggle */}
        <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Email Notifications</p>
              <p className="text-sm text-zinc-500 mt-0.5">
                Controls product &amp; activity emails.{" "}
                <span className="text-zinc-400">
                  Manage your paid newsletter subscription in the Subscription tab.
                </span>
              </p>
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
        <Card className={cn("p-5 bg-zinc-900/50 border-zinc-700/50 transition-opacity mt-3", isEmailDisabled && 'opacity-50')}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="font-medium text-white">Trading</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-zinc-300">Trade alerts</Label>
                <p className="text-xs text-zinc-500">Important trade events and reminders</p>
              </div>
              <Switch checked={tradeAlerts} onCheckedChange={setTradeAlerts} disabled={isEmailDisabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-zinc-300">Performance digest</Label>
                <p className="text-xs text-zinc-500">Summary of your trading performance</p>
              </div>
              <Switch checked={dailyNewsletter} onCheckedChange={setDailyNewsletter} disabled={isEmailDisabled} />
            </div>

            {dailyNewsletter && !isEmailDisabled && (
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
        <Card className={cn("p-5 bg-zinc-900/50 border-zinc-700/50 transition-opacity mt-3", isEmailDisabled && 'opacity-50')}>
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-4 h-4 text-blue-400" />
            <h3 className="font-medium text-white">Market &amp; News</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-zinc-300">Market alerts</Label>
                <p className="text-xs text-zinc-500">Important market movements and news</p>
              </div>
              <Switch checked={marketAlerts} onCheckedChange={setMarketAlerts} disabled={isEmailDisabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-zinc-300">Update Center notifications</Label>
                <p className="text-xs text-zinc-500">Get email alerts when new updates are posted</p>
              </div>
              <Switch checked={updateCenterEmail} onCheckedChange={setUpdateCenterEmail} disabled={isEmailDisabled} />
            </div>
          </div>
        </Card>

        {/* Product Updates */}
        <Card className={cn("p-5 bg-zinc-900/50 border-zinc-700/50 transition-opacity mt-3", isEmailDisabled && 'opacity-50')}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-purple-400" />
            <h3 className="font-medium text-white">Product</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-zinc-300">Product updates</Label>
              <p className="text-xs text-zinc-500">New features and improvements</p>
            </div>
            <Switch checked={productUpdates} onCheckedChange={setProductUpdates} disabled={isEmailDisabled} />
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end mt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-[#C9A646] hover:bg-[#B8963F] text-black"
          >
            {saving ? (
              <><Spinner size="sm" color="inherit" className="mr-2" />Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save changes</>
            )}
          </Button>
        </div>
      </div>

      {/* ── SECTION 2: Push Notifications ────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3 px-1">
          Push notifications
        </h2>

        <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-4 h-4 text-amber-400" />
            <h3 className="font-medium text-white">Browser Push</h3>
          </div>

          {isPushUnsupported ? (
            <div className="flex items-center justify-between opacity-50">
              <div>
                <Label className="text-sm text-zinc-300">Push notifications</Label>
                <p className="text-xs text-zinc-500">
                  Push notifications aren&apos;t supported in this browser.
                </p>
              </div>
              <Switch checked={false} disabled />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-zinc-300">Push notifications</Label>
                {isPushDenied ? (
                  <p className="text-xs text-amber-500 mt-0.5">
                    Blocked in browser settings — enable it there to receive push alerts.
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Receive real-time alerts directly in your browser.
                  </p>
                )}
              </div>
              <Switch
                checked={isPushSwitchOn}
                onCheckedChange={handlePushToggle}
                disabled={isPushDenied || pushBusy}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default NotificationsTab;
