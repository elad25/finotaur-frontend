// src/features/settings/tabs/AccountTab.tsx
// Extracted from SettingsLayout.tsx — GeneralTab renamed to AccountTab.
// Pure move: no logic or UI changes.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Settings, Save, Crown, Zap, ArrowRight,
  Pencil, X, Globe, User,
} from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ds/Spinner";
import {
  useSettings,
  timezones,
  getTimezoneLabel,
  getPlanInfo,
} from "../settings-shared";

export const AccountTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile, setProfile, saving, setSaving } = useSettings();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);

  // Local state for form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [timezone, setTimezone] = useState("America/New_York");

  // Sync local state with profile data. Fall back to splitting display_name
  // for legacy rows that predate first_name/last_name.
  useEffect(() => {
    if (profile) {
      const fallback = profile.display_name || user?.email?.split('@')[0] || '';
      setFirstName(profile.first_name ?? fallback.split(' ')[0] ?? '');
      setLastName(profile.last_name ?? fallback.split(' ').slice(1).join(' ') ?? '');
      setTimezone(profile.preferred_timezone || "America/New_York");
    }
  }, [profile, user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const composedDisplayName = [trimmedFirst, trimmedLast].filter(Boolean).join(' ');

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: trimmedFirst || null,
          last_name: trimmedLast || null,
          display_name: composedDisplayName,
          preferred_timezone: timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        first_name: trimmedFirst || null,
        last_name: trimmedLast || null,
        display_name: composedDisplayName,
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
    const fallback = profile?.display_name || user?.email?.split('@')[0] || '';
    setFirstName(profile?.first_name ?? fallback.split(' ')[0] ?? '');
    setLastName(profile?.last_name ?? fallback.split(' ').slice(1).join(' ') ?? '');
    setTimezone(profile?.preferred_timezone || "America/New_York");
    setIsEditing(false);
  };

  const platformPlan = profile?.platform_plan || 'free';
  const isPro = ['platform_core', 'platform_finotaur', 'platform_enterprise'].includes(platformPlan);
  const platformIsFree = platformPlan === 'free' || !platformPlan;

  // Suppress unused variable warning — isPro is used for future feature gating
  void isPro;

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
                  <Spinner size="sm" color="inherit" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label className="text-sm text-zinc-300">Name</Label>
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  className="h-10 bg-zinc-800/80 border-zinc-600/50 text-white placeholder:text-zinc-500"
                />
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  className="h-10 bg-zinc-800/80 border-zinc-600/50 text-white placeholder:text-zinc-500"
                />
              </div>
            ) : (
              <div className="max-w-md h-10 px-3 flex items-center rounded-md bg-zinc-800/40 border border-zinc-700/30 text-white">
                {profile?.display_name ||
                  [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
                  user?.email?.split('@')[0] ||
                  'Not set'}
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
  size="sm"
  onClick={() => navigate('/app/all-markets/pricing')}
  className="bg-gradient-to-r from-[#C9A646] via-[#E5C76B] to-[#C9A646] hover:from-[#D4B04F] hover:via-[#F0D87A] hover:to-[#D4B04F] text-black font-semibold shadow-lg shadow-[#C9A646]/30 border border-[#C9A646]/50 transition-all duration-300 hover:shadow-[#C9A646]/50 hover:scale-[1.02]"
>
  Upgrade <ArrowRight className="w-4 h-4 ml-1" />
</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AccountTab;
