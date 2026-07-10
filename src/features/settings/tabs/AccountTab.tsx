// src/features/settings/tabs/AccountTab.tsx
// Extracted from SettingsLayout.tsx — GeneralTab renamed to AccountTab.
// Pure move: no logic or UI changes.

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  Settings, Save, Crown, Zap,
  Pencil, X, Globe, User, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ds/Spinner";
import { ReferralCodeInline } from "@/features/affiliate/components/refer/ReferralCodeInline";
import {
  useSettings,
  timezones,
  getTimezoneLabel,
  getPlanInfo,
} from "../settings-shared";

export const AccountTab = () => {
  const { user } = useAuth();
  const { profile, setProfile, saving, setSaving } = useSettings();

  // ── Change 1: Split edit modes ──────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingRegional, setEditingRegional] = useState(false);

  // Local state for Profile card fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Local state for Regional card fields
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

  // ── Profile save / cancel ───────────────────────────────────────────────
  const saveProfile = async () => {
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        first_name: trimmedFirst || null,
        last_name: trimmedLast || null,
        display_name: composedDisplayName,
      } : null);

      setEditingProfile(false);
      toast.success('Profile saved');
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const cancelProfile = () => {
    const fallback = profile?.display_name || user?.email?.split('@')[0] || '';
    setFirstName(profile?.first_name ?? fallback.split(' ')[0] ?? '');
    setLastName(profile?.last_name ?? fallback.split(' ').slice(1).join(' ') ?? '');
    setEditingProfile(false);
  };

  // ── Regional save / cancel ──────────────────────────────────────────────
  const saveRegional = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_timezone: timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, preferred_timezone: timezone } : null);
      setEditingRegional(false);
      toast.success('Regional settings saved');
    } catch (err) {
      console.error('Error saving regional settings:', err);
      toast.error('Failed to save regional settings');
    } finally {
      setSaving(false);
    }
  };

  const cancelRegional = () => {
    setTimezone(profile?.preferred_timezone || "America/New_York");
    setEditingRegional(false);
  };

  // ── Change 2: Email change dialog state ────────────────────────────────
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2>(1);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState('');

  const resetEmailDialog = () => {
    setEmailStep(1);
    setCurrentPwd('');
    setNewEmail('');
    setEmailError('');
    setEmailBusy(false);
  };

  const openEmailDialog = () => {
    resetEmailDialog();
    setEmailDialogOpen(true);
  };

  const handleEmailStep1 = async () => {
    const email = user?.email ?? profile?.email ?? '';
    if (!email || !currentPwd) {
      setEmailError('Please enter your current password.');
      return;
    }
    setEmailBusy(true);
    setEmailError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: currentPwd });
      if (error) {
        setEmailError(error.message);
        return;
      }
      setEmailStep(2);
    } catch (err) {
      // err is unknown — narrow to Error for message extraction
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      setEmailError(msg);
    } finally {
      setEmailBusy(false);
    }
  };

  const handleEmailStep2 = async () => {
    const currentEmail = user?.email ?? profile?.email ?? '';
    if (!newEmail) {
      setEmailError('Please enter a new email address.');
      return;
    }
    if (!newEmail.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setEmailError('New email must be different from your current email.');
      return;
    }
    setEmailBusy(true);
    setEmailError('');
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        setEmailError(error.message);
        return;
      }
      setEmailDialogOpen(false);
      resetEmailDialog();
      toast.success(`Confirmation link sent to ${newEmail}. Your email will update once you confirm it.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update email.';
      setEmailError(msg);
    } finally {
      setEmailBusy(false);
    }
  };

  // ── Plan / upgrade helpers ──────────────────────────────────────────────
  const platformPlan = profile?.platform_plan || 'free';
  const platformIsFree = platformPlan === 'free' || !platformPlan;

  const currentEmail = user?.email || profile?.email || '';

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

      {/* Profile Card */}
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-semibold text-white">Profile</h2>
          </div>

          {!editingProfile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingProfile(true)}
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
                onClick={cancelProfile}
                className="gap-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveProfile}
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

        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="space-y-4 flex-1 min-w-0">
            {/* Name — separate First / Last name fields (both view + edit modes) */}
            <div className="grid gap-1.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                {/* First name */}
                <div className="grid gap-1.5">
                  <Label className="text-sm text-zinc-300">First name</Label>
                  {editingProfile ? (
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      autoComplete="given-name"
                      className="h-10 bg-zinc-800/80 border-zinc-600/50 text-white placeholder:text-zinc-500"
                    />
                  ) : (
                    <div className="h-10 px-3 flex items-center rounded-md bg-zinc-800/40 border border-zinc-700/30 text-white">
                      {firstName || 'Not set'}
                    </div>
                  )}
                </div>
                {/* Last name */}
                <div className="grid gap-1.5">
                  <Label className="text-sm text-zinc-300">Last name</Label>
                  {editingProfile ? (
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      autoComplete="family-name"
                      className="h-10 bg-zinc-800/80 border-zinc-600/50 text-white placeholder:text-zinc-500"
                    />
                  ) : (
                    <div className="h-10 px-3 flex items-center rounded-md bg-zinc-800/40 border border-zinc-700/30 text-white">
                      {lastName || 'Not set'}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-500">Shown in the app and community</p>
            </div>

            {/* Email — Change 2: now shows current email + Change button */}
            <div className="grid gap-1.5">
              <Label className="text-sm text-zinc-400">Email Address</Label>
              <div className="flex items-center gap-2 max-w-md">
                <div className="flex-1 h-10 px-3 flex items-center rounded-md bg-zinc-800/40 border border-zinc-700/30 text-zinc-300">
                  {currentEmail}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openEmailDialog}
                  className="shrink-0 gap-1.5 text-zinc-400 hover:text-[#C9A646] hover:bg-[#C9A646]/10"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Change
                </Button>
              </div>
            </div>
          </div>

          {/* Referral code — compact block, right side on desktop. Renders
              nothing while unresolved / feature-disabled, so no empty
              wrapper chrome (border/padding) is applied here. */}
          <div className="w-full lg:w-96 lg:shrink-0 lg:self-center">
            <ReferralCodeInline />
          </div>
        </div>
      </Card>

      {/* Regional / Timezone Card */}
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="font-semibold text-white">Regional</h2>
          </div>

          {!editingRegional ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingRegional(true)}
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
                onClick={cancelRegional}
                className="gap-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveRegional}
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

        <div className="grid gap-1.5">
          <Label className="text-sm text-zinc-300">Timezone</Label>
          {editingRegional ? (
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

      {/* ── Change 2: Email Change Dialog ──────────────────────────────────── */}
      <Dialog open={emailDialogOpen} onOpenChange={(open) => {
        if (!open) resetEmailDialog();
        setEmailDialogOpen(open);
      }}>
        <DialogContent className="bg-zinc-900 border-zinc-700/50 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-md bg-[#C9A646]/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-[#C9A646]" />
              </div>
              <DialogTitle className="text-white">
                {emailStep === 1 ? "Verify it's you" : "New email address"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400">
              {emailStep === 1
                ? "Enter your current password to continue."
                : "Enter the new email address for your account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {emailStep === 1 ? (
              <div className="grid gap-1.5">
                <Label className="text-sm text-zinc-300">Current password</Label>
                <Input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEmailStep1(); }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="h-10 bg-zinc-800/80 border-zinc-600/50 text-white placeholder:text-zinc-500"
                />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label className="text-sm text-zinc-300">New email address</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEmailStep2(); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-10 bg-zinc-800/80 border-zinc-600/50 text-white placeholder:text-zinc-500"
                />
                <p className="text-xs text-zinc-500">
                  A confirmation link will be sent to this address.
                </p>
              </div>
            )}

            {emailError && (
              <p className="text-sm text-red-400">{emailError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetEmailDialog();
                setEmailDialogOpen(false);
              }}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={emailStep === 1 ? handleEmailStep1 : handleEmailStep2}
              disabled={emailBusy}
              className="gap-2 bg-[#C9A646] hover:bg-[#B8963F] text-black"
            >
              {emailBusy ? (
                <Spinner size="sm" color="inherit" />
              ) : null}
              {emailStep === 1 ? 'Continue' : 'Update email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountTab;
