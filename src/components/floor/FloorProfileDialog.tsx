// src/components/floor/FloorProfileDialog.tsx
// =====================================================
// THE FLOOR — profile setup / edit dialog
// Lets users set (or update) their Floor username,
// display name, and optional avatar URL.
// =====================================================

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useFloorProfile, useInvalidateFloorProfile } from '@/hooks/useFloorProfile';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryClient } from '@tanstack/react-query';

// =====================================================
// Props
// =====================================================

interface FloorProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

// =====================================================
// Username validation (client-side, mirrors the RPC)
// =====================================================

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function validateUsername(raw: string): string | null {
  if (!raw) return null; // empty — don't show error yet
  if (!USERNAME_REGEX.test(raw))
    return '3–20 chars · lowercase letters, numbers, underscore only';
  return null; // valid format
}

// =====================================================
// Avatar preview — initials or image
// =====================================================

function AvatarPreview({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string;
}) {
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const [imgError, setImgError] = useState(false);

  // Reset error when URL changes
  useEffect(() => setImgError(false), [avatarUrl]);

  const showImage = !!avatarUrl && !imgError;

  return (
    <div
      className="flex-shrink-0 h-14 w-14 rounded-full flex items-center justify-center overflow-hidden"
      style={{
        background: showImage
          ? 'transparent'
          : 'linear-gradient(135deg, #C9A646 0%, #E8C766 100%)',
        border: '2px solid rgba(201,166,70,0.4)',
      }}
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt="Avatar preview"
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="text-lg font-bold select-none"
          style={{ color: '#0A0A0A' }}
        >
          {initials || '?'}
        </span>
      )}
    </div>
  );
}

// =====================================================
// Main dialog component
// =====================================================

export function FloorProfileDialog({
  open,
  onOpenChange,
  onSaved,
}: FloorProfileDialogProps) {
  const { profile } = useFloorProfile();
  const invalidateFloorProfile = useInvalidateFloorProfile();
  const queryClient = useQueryClient();

  // ── Form state ──────────────────────────────────
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Availability check state ─────────────────────
  type AvailState = 'idle' | 'checking' | 'available' | 'taken';
  const [availState, setAvailState] = useState<AvailState>('idle');

  // ── Prefill from existing profile ────────────────
  useEffect(() => {
    if (open && profile) {
      setUsername(profile.floor_username ?? '');
      setDisplayName(profile.display_name ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
    }
    if (!open) {
      setSaveError(null);
      setAvailState('idle');
    }
  }, [open, profile]);

  // ── Debounced username for availability check ────
  const debouncedUsername = useDebounce(username, 400);

  const checkAvailability = useCallback(async (value: string) => {
    const formatError = validateUsername(value);
    if (formatError || !value) {
      setAvailState('idle');
      return;
    }
    // Skip check if it's the user's own current username
    if (profile?.floor_username && value === profile.floor_username) {
      setAvailState('available');
      return;
    }
    setAvailState('checking');
    try {
      const { data, error } = await supabase.rpc('floor_username_available', {
        p_username: value,
      });
      if (error) { setAvailState('idle'); return; }
      setAvailState(data === true ? 'available' : 'taken');
    } catch {
      setAvailState('idle');
    }
  }, [profile?.floor_username]);

  useEffect(() => {
    checkAvailability(debouncedUsername);
  }, [debouncedUsername, checkAvailability]);

  // ── Derived validation state ─────────────────────
  const usernameFormatError = validateUsername(username);
  const usernameValid =
    !usernameFormatError && (availState === 'available');
  const displayNameValid = displayName.trim().length >= 1;
  const canSave =
    usernameValid &&
    displayNameValid &&
    !saving;

  // ── Save handler ─────────────────────────────────
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.rpc('set_floor_profile', {
        p_username: username.trim(),
        p_display_name: displayName.trim(),
        p_avatar_url: avatarUrl.trim() || null,
      });
      if (error) {
        setSaveError(error.message);
        return;
      }
      // Invalidate floor-profile and any generic 'profile' queries
      await invalidateFloorProfile();
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      onSaved?.();
      onOpenChange(false);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Rendered availability indicator ─────────────
  function UsernameStatus() {
    if (!username) return null;
    if (usernameFormatError)
      return (
        <span className="text-[11px]" style={{ color: '#f87171' }}>
          {usernameFormatError}
        </span>
      );
    if (availState === 'checking')
      return (
        <span className="text-[11px]" style={{ color: '#888' }}>
          Checking…
        </span>
      );
    if (availState === 'available')
      return (
        <span className="flex items-center gap-1 text-[11px]" style={{ color: '#4ade80' }}>
          <CheckCircle className="h-3 w-3" /> Available
        </span>
      );
    if (availState === 'taken')
      return (
        <span className="flex items-center gap-1 text-[11px]" style={{ color: '#f87171' }}>
          <XCircle className="h-3 w-3" /> Already taken
        </span>
      );
    return null;
  }

  // ── Shared input style ───────────────────────────
  const inputClass =
    'w-full rounded-[10px] px-3 py-2 text-sm text-white outline-none transition-colors focus:ring-1 focus:ring-[#C9A646] placeholder:text-zinc-600';
  const inputStyle = {
    background: '#141414',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px]"
        style={{
          background: '#0A0A0A',
          border: '1px solid rgba(201,166,70,0.25)',
          color: '#fff',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">
            Set up your Floor profile
          </DialogTitle>
          <DialogDescription style={{ color: '#888' }}>
            Pick a public username and display name. This is how you&apos;ll
            appear on The Floor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* ── Avatar preview + display name row ── */}
          <div className="flex items-center gap-4">
            <AvatarPreview displayName={displayName} avatarUrl={avatarUrl} />
            <div className="flex-1 min-w-0">
              <label
                htmlFor="floor-display-name"
                className="block text-xs font-medium mb-1"
                style={{ color: '#A0A0A0' }}
              >
                Display name <span style={{ color: '#E8C766' }}>*</span>
              </label>
              <input
                id="floor-display-name"
                type="text"
                className={inputClass}
                style={inputStyle}
                placeholder="Your name on The Floor"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                disabled={saving}
              />
            </div>
          </div>

          {/* ── Username ── */}
          <div>
            <label
              htmlFor="floor-username"
              className="block text-xs font-medium mb-1"
              style={{ color: '#A0A0A0' }}
            >
              Floor username <span style={{ color: '#E8C766' }}>*</span>
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none"
                style={{ color: '#C9A646' }}
              >
                @
              </span>
              <input
                id="floor-username"
                type="text"
                className={inputClass}
                style={{ ...inputStyle, paddingLeft: '1.75rem' }}
                placeholder="your_handle"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                }
                maxLength={20}
                autoComplete="off"
                disabled={saving}
              />
            </div>
            <div className="mt-1 min-h-[18px]">
              <UsernameStatus />
              {!username && (
                <span className="text-[11px]" style={{ color: '#555' }}>
                  3–20 chars · letters, numbers, underscore
                </span>
              )}
            </div>
          </div>

          {/* ── Avatar URL (optional) ── */}
          <div>
            <label
              htmlFor="floor-avatar-url"
              className="block text-xs font-medium mb-1"
              style={{ color: '#A0A0A0' }}
            >
              Avatar image URL{' '}
              <span className="font-normal" style={{ color: '#555' }}>
                (optional)
              </span>
            </label>
            <input
              id="floor-avatar-url"
              type="url"
              className={inputClass}
              style={inputStyle}
              placeholder="https://…"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* ── Save error ── */}
          {saveError && (
            <p
              className="text-[12px] rounded-lg px-3 py-2"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              {saveError}
            </p>
          )}

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-[10px] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
              style={{ color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-[10px] px-5 py-2 text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #E8C766 100%)',
                color: '#0A0A0A',
              }}
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
