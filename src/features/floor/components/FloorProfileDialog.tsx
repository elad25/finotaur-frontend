// src/components/floor/FloorProfileDialog.tsx
// =====================================================
// THE FLOOR — profile setup / edit dialog
// Lets users set (or update) their Floor nickname and
// choose a preset avatar. Display name is the nickname.
// Nickname is locked for 3 months after first set.
// =====================================================

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useFloorProfile, useInvalidateFloorProfile } from '@/features/floor/hooks/useFloorProfile';
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
// Preset avatar gallery
// =====================================================

const FLOOR_AVATARS = Array.from(
  { length: 20 },
  (_, i) => `/avatars/floor/${String(i + 1).padStart(2, '0')}.webp`,
);

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
  nickname,
  avatarUrl,
}: {
  nickname: string;
  avatarUrl: string;
}) {
  const initials = nickname
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase() || '?';

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
          {initials}
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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Availability check state ─────────────────────
  type AvailState = 'idle' | 'checking' | 'available' | 'taken';
  const [availState, setAvailState] = useState<AvailState>('idle');

  // ── Lock state ───────────────────────────────────
  const isLocked =
    !!profile?.floor_username &&
    profile.floor_username_locked_until != null &&
    new Date(profile.floor_username_locked_until) > new Date();

  const lockedUntilLabel = isLocked && profile?.floor_username_locked_until
    ? new Date(profile.floor_username_locked_until).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // ── Prefill from existing profile ────────────────
  useEffect(() => {
    if (open && profile) {
      setUsername(profile.floor_username ?? '');
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
    // Skip availability check entirely when locked (name can't change)
    if (isLocked) return;
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
  }, [profile?.floor_username, isLocked]);

  useEffect(() => {
    checkAvailability(debouncedUsername);
  }, [debouncedUsername, checkAvailability]);

  // ── Derived validation state ─────────────────────
  const usernameFormatError = validateUsername(username);
  const usernameValid =
    !usernameFormatError && (availState === 'available');

  // When locked: avatar-only save is always allowed (no spinner required)
  const canSave = isLocked
    ? !saving
    : usernameValid && !saving;

  // ── Save handler ─────────────────────────────────
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const effectiveUsername = isLocked
        ? (profile?.floor_username ?? username.trim())
        : username.trim();
      const { error } = await supabase.rpc('set_floor_profile', {
        p_username: effectiveUsername,
        p_display_name: null,
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
    'w-full rounded-[10px] px-3 py-2 text-sm text-white outline-none transition-colors focus:ring-1 focus:ring-[#C9A646] placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed';
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
            Pick a unique nickname and an avatar. This is how you&apos;ll
            appear on The Floor. Your nickname is locked for 3 months.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* ── Avatar preview row ── */}
          <div className="flex items-center gap-4">
            <AvatarPreview nickname={username} avatarUrl={avatarUrl} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium mb-1" style={{ color: '#A0A0A0' }}>
                Preview
              </p>
              <p className="text-sm font-semibold text-white truncate">
                {username ? `@${username}` : <span style={{ color: '#555' }}>@your_handle</span>}
              </p>
            </div>
          </div>

          {/* ── Nickname ── */}
          <div>
            <label
              htmlFor="floor-username"
              className="block text-xs font-medium mb-1"
              style={{ color: '#A0A0A0' }}
            >
              Nickname{' '}
              {!isLocked && <span style={{ color: '#E8C766' }}>*</span>}
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
                disabled={saving || isLocked}
              />
            </div>
            <div className="mt-1 min-h-[18px]">
              {isLocked ? (
                <span
                  className="flex items-center gap-1 text-[11px]"
                  style={{ color: '#C9A646' }}
                >
                  <Lock className="h-3 w-3" />
                  Locked — you can change your nickname after {lockedUntilLabel}
                </span>
              ) : (
                <>
                  <UsernameStatus />
                  {!username && (
                    <span className="text-[11px]" style={{ color: '#555' }}>
                      3–20 chars · letters, numbers, underscore
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Avatar preset gallery ── */}
          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: '#A0A0A0' }}
            >
              Avatar{' '}
              <span className="font-normal" style={{ color: '#555' }}>
                (choose one)
              </span>
            </label>
            <div className="grid grid-cols-6 gap-2">
              {FLOOR_AVATARS.map((src) => {
                const selected = avatarUrl === src;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setAvatarUrl(src)}
                    disabled={saving}
                    className="rounded-[8px] p-0.5 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      border: selected
                        ? '2px solid #C9A646'
                        : '2px solid rgba(255,255,255,0.08)',
                      background: selected
                        ? 'rgba(201,166,70,0.08)'
                        : 'transparent',
                    }}
                    aria-label={src}
                    aria-pressed={selected}
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-[44px] w-[44px] rounded-[6px] object-cover"
                    />
                  </button>
                );
              })}
            </div>
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
