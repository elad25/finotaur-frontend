// src/features/settings/tabs/NotificationsTab.tsx
// Extracted from SettingsLayout.tsx — NotificationsTab.
// Pure move: no logic or UI changes.

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
  Save, Bell, Zap, TrendingUp, Newspaper, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ds/Spinner";
import { useSettings } from "../settings-shared";
import type { NewsletterPreferences } from "../settings-shared";

export const NotificationsTab = () => {
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
            <><Spinner size="sm" color="inherit" className="mr-2" />Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Save changes</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NotificationsTab;
