// src/features/settings/tabs/SecurityTab.tsx
// Extracted from SettingsLayout.tsx — SecurityTab.
// Pure move: no logic or UI changes.

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Shield, Key, Eye, EyeOff, Check, AlertCircle, ArrowLeft, AlertTriangle, Download, Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { validatePassword, getPasswordStrength } from "@/lib/passwordValidation";
import { requestAccountDeletion, downloadGdprExport } from "@/services/accountLifecycleService";
import { Spinner } from "@/components/ds/Spinner";

export const SecurityTab = () => {
  const { user } = useAuth();

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const newValidation = validatePassword(newPassword);
  const isNewStrong = Object.values(newValidation).every(Boolean);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferent = currentPassword !== newPassword;
  const strength = getPasswordStrength(newPassword);
  const canSubmitStep2 = isNewStrong && passwordsMatch && isDifferent && !saving;

  const resetModal = () => {
    setShowPasswordDialog(false);
    setStep(1);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
  };

  // Step 1: verify identity by re-authenticating with current password.
  const handleVerifyCurrent = async () => {
    if (!currentPassword.trim()) {
      toast.error('Please enter your current password');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      if (error) {
        toast.error('Current password is incorrect');
        return;
      }
      setStep(2);
    } catch (error) {
      console.error('Verify current password failed:', error);
      toast.error('Failed to verify current password');
    } finally {
      setSaving(false);
    }
  };

  // Step 2: validate + update + revoke other sessions.
  const handleSetNewPassword = async () => {
    if (!isNewStrong) {
      toast.error('New password does not meet security requirements');
      return;
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }
    if (!isDifferent) {
      toast.error('New password must be different from current password');
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        console.error('updateUser failed:', updateError);
        toast.error(updateError.message || 'Failed to update password');
        return;
      }

      // NOTE: Supabase auto-revokes ALL other refresh tokens for this user
      // when the password changes. The current session is preserved.
      // Do NOT call signOut({ scope: 'others' }) — buggy in some SDK versions,
      // can kill the current session and surface "Refresh Token Not Found".
      toast.success('Password updated. Other devices have been signed out.');
      resetModal();
    } catch (error) {
      console.error('Update password failed:', error);
      toast.error('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const PasswordRule = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-1.5">
      {ok
        ? <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
        : <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
      <span className={`text-xs ${ok ? 'text-green-500' : 'text-zinc-400'}`}>{label}</span>
    </div>
  );

  // ── Data export + account deletion (GDPR / Danger Zone) ──
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteAck, setDeleteAck] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionResult, setDeletionResult] = useState<{ undo_deadline?: string } | null>(null);

  const emailMatches =
    !!user?.email &&
    deleteConfirmEmail.trim().toLowerCase() === user.email.toLowerCase();
  const canDelete = emailMatches && deleteAck && !deleting;

  const resetDeleteModal = () => {
    setShowDeleteDialog(false);
    setDeleteConfirmEmail("");
    setDeleteReason("");
    setDeleteAck(false);
    setDeletionResult(null);
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const result = await downloadGdprExport();
      if (result.success) {
        toast.success(`Your data has been exported${result.filename ? ` (${result.filename})` : ''}`);
      } else {
        toast.error(result.error || 'Failed to export your data');
      }
    } catch (error) {
      console.error('GDPR export failed:', error);
      toast.error('Failed to export your data');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      const result = await requestAccountDeletion({
        confirmEmail: deleteConfirmEmail.trim(),
        reason: deleteReason.trim() || undefined,
        acknowledgedPermanent: true,
      });
      if (result.success) {
        setDeletionResult({ undo_deadline: result.undo_deadline });
      } else {
        toast.error(result.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Account deletion failed:', error);
      toast.error('Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOutAfterDeletion = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = '/';
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

          <Dialog
            open={showPasswordDialog}
            onOpenChange={(open) => (open ? setShowPasswordDialog(true) : resetModal())}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Change</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {step === 1 ? "Verify it’s you" : 'Set new password'}
                </DialogTitle>
                <DialogDescription>
                  {step === 1
                    ? 'Enter your current password to continue.'
                    : 'Choose a strong password. Other signed-in devices will be logged out.'}
                </DialogDescription>
              </DialogHeader>

              {step === 1 ? (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Current password</Label>
                    <div className="relative">
                      <Input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && currentPassword && !saving) {
                            e.preventDefault();
                            handleVerifyCurrent();
                          }
                        }}
                        className="h-9 pr-10"
                        autoFocus
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">New password</Label>
                      {newPassword && (
                        <span className={`text-xs font-semibold ${strength.color}`}>
                          {strength.label}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-9 pr-10"
                        autoFocus
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.bgColor} transition-all duration-500`}
                          style={{ width: `${strength.progress}%` }}
                        />
                      </div>
                    )}
                    {newPassword && (
                      <div className="mt-2 p-2 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-1">
                        <p className="text-xs font-semibold text-zinc-300 mb-1">Requirements:</p>
                        <PasswordRule ok={newValidation.minLength} label="8+ characters" />
                        <PasswordRule ok={newValidation.hasUpperCase} label="Uppercase (A-Z)" />
                        <PasswordRule ok={newValidation.hasNumber} label="Number (0-9)" />
                        <PasswordRule ok={newValidation.hasSpecialChar} label="Special (@#$%...)" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Confirm new password</Label>
                    <Input
                      type={showNew ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canSubmitStep2) {
                          e.preventDefault();
                          handleSetNewPassword();
                        }
                      }}
                      className="h-9"
                      autoComplete="new-password"
                    />
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <X className="h-3 w-3" /> Passwords do not match
                      </p>
                    )}
                    {confirmPassword && passwordsMatch && (
                      <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                        <Check className="h-3 w-3" /> Passwords match
                      </p>
                    )}
                    {newPassword && !isDifferent && (
                      <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> Must be different from current password
                      </p>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                {step === 1 ? (
                  <>
                    <Button variant="outline" size="sm" onClick={resetModal}>Cancel</Button>
                    <Button
                      onClick={handleVerifyCurrent}
                      disabled={saving || !currentPassword}
                      size="sm"
                      className="bg-[#C9A646] hover:bg-[#B8963F] text-black"
                    >
                      {saving ? <Spinner size="sm" color="inherit" /> : 'Next'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStep(1);
                        setNewPassword("");
                        setConfirmPassword("");
                        setShowNew(false);
                      }}
                      disabled={saving}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button
                      onClick={handleSetNewPassword}
                      disabled={!canSubmitStep2}
                      size="sm"
                      className="bg-[#C9A646] hover:bg-[#B8963F] text-black"
                    >
                      {saving ? <Spinner size="sm" color="inherit" /> : 'Update'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Danger Zone — data export + account deletion */}
      <Card className="p-5 bg-zinc-900/50 border-red-900/40">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h2 className="font-medium text-white">Danger Zone</h2>
        </div>

        {/* Export my data */}
        <div className="flex items-center justify-between py-3 border-b border-zinc-800">
          <div className="pr-4">
            <p className="text-sm text-zinc-300">Export my data</p>
            <p className="text-xs text-zinc-500">Download a copy of your personal data (GDPR).</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportData} disabled={exporting}>
            {exporting
              ? <Spinner size="sm" />
              : <><Download className="w-4 h-4 mr-2" /> Export</>}
          </Button>
        </div>

        {/* Delete account */}
        <div className="flex items-center justify-between pt-3">
          <div className="pr-4">
            <p className="text-sm text-zinc-300">Delete account</p>
            <p className="text-xs text-zinc-500">
              Permanently delete your account and data. This cannot be undone after the grace period.
            </p>
          </div>

          <Dialog
            open={showDeleteDialog}
            onOpenChange={(open) => (open ? setShowDeleteDialog(true) : resetDeleteModal())}
          >
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              {!deletionResult ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Delete your account?</DialogTitle>
                    <DialogDescription>
                      This schedules your account for permanent deletion and cancels any active
                      subscriptions. You can undo it from the email we send you, before the grace
                      period ends.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label className="text-sm">Type your email to confirm</Label>
                      <Input
                        type="email"
                        value={deleteConfirmEmail}
                        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                        placeholder={user?.email || ''}
                        className="h-9"
                        autoComplete="off"
                      />
                      {deleteConfirmEmail && !emailMatches && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <X className="h-3 w-3" /> Email does not match your account
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Reason (optional)</Label>
                      <Input
                        type="text"
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Tell us why you're leaving"
                        className="h-9"
                      />
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deleteAck}
                        onChange={(e) => setDeleteAck(e.target.checked)}
                        className="mt-0.5 accent-red-500"
                      />
                      <span className="text-xs text-zinc-400">
                        I understand this will permanently delete my account and all associated
                        data after the grace period.
                      </span>
                    </label>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={resetDeleteModal} disabled={deleting}>
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={!canDelete}>
                      {deleting ? <Spinner size="sm" /> : 'Delete my account'}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Account scheduled for deletion</DialogTitle>
                    <DialogDescription>
                      Your account has been scheduled for deletion
                      {deletionResult.undo_deadline
                        ? ` and will be permanently removed on ${new Date(deletionResult.undo_deadline).toLocaleDateString()}`
                        : ''}
                      . We've emailed you a link to undo this if you change your mind.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      size="sm"
                      onClick={handleSignOutAfterDeletion}
                      className="bg-[#C9A646] hover:bg-[#B8963F] text-black"
                    >
                      Sign out
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </div>
  );
};

export default SecurityTab;
