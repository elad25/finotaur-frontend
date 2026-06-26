// src/features/settings/tabs/TheFloorTab.tsx
// "The Floor" settings — compact profile card + edit dialog.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useLeaderboardOptIn } from '@/features/floor/hooks/useLeaderboardOptIn';
import {
  Activity, User, Eye, EyeOff, Pencil, Check, X, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FORMAT_REGEX = /^[a-z0-9_]{3,20}$/;
type AvailState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditProfileDialog({
  open,
  onClose,
  currentUsername,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  currentUsername: string;
  onSaved: (username: string) => void;
}) {
  const { user } = useAuth();
  const { optIn, isLoading: optInLoading, toggle, isSaving: optInSaving } = useLeaderboardOptIn();

  const [draft, setDraft]   = useState(currentUsername);
  const [avail, setAvail]   = useState<AvailState>('idle');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) { setDraft(currentUsername); setAvail('idle'); }
  }, [open, currentUsername]);

  const checkAvailability = useCallback(async (value: string) => {
    if (!value) { setAvail('idle'); return; }
    if (!FORMAT_REGEX.test(value)) { setAvail('invalid'); return; }
    if (value === currentUsername) { setAvail('available'); return; }
    setAvail('checking');
    const { data } = await supabase
      .from('profiles').select('id')
      .eq('floor_username', value).neq('id', user!.id).maybeSingle();
    setAvail(data ? 'taken' : 'available');
  }, [currentUsername, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setDraft(raw);
    setAvail('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkAvailability(raw), 400);
  };

  const handleSave = async () => {
    if (avail !== 'available' && draft !== '') return;
    if (draft === currentUsername) { onClose(); return; }
    setSaving(true);
    const { error } = await supabase
      .from('profiles').update({ floor_username: draft.trim() || null }).eq('id', user!.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save. Please try again.');
    } else {
      onSaved(draft);
      toast.success(draft ? `@${draft} saved` : 'Username removed');
      onClose();
    }
  };

  const isDirty  = draft !== currentUsername;
  const canSave  = !saving && (draft === '' || avail === 'available');

  const availIndicator = () => {
    if (avail === 'checking')  return <Loader2 size={13} className="animate-spin text-ink-tertiary" />;
    if (avail === 'available' && draft !== currentUsername) return <Check size={13} className="text-emerald-400" />;
    if (avail === 'taken')     return <X size={13} className="text-red-400" />;
    if (avail === 'invalid')   return <X size={13} className="text-amber-400" />;
    return null;
  };

  const availMsg = () => {
    if (avail === 'available' && isDirty) return <span className="text-emerald-400">Available</span>;
    if (avail === 'taken')  return <span className="text-red-400">Already taken</span>;
    if (avail === 'invalid') return <span className="text-amber-400">3–20 chars, lowercase a–z, 0–9, _</span>;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Activity size={16} className="text-[#C9A646]" />
            Floor Profile
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Choose how you appear on The Floor — feed, comments, and leaderboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="floor-username-dlg" className="text-xs text-zinc-400">Username</Label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-zinc-500 text-sm select-none">@</span>
              <Input
                id="floor-username-dlg"
                value={draft}
                onChange={handleChange}
                maxLength={20}
                placeholder="yourhandle"
                className={cn(
                  'pl-7 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600',
                  'focus-visible:ring-[#C9A646]/40',
                  avail === 'taken'    && 'border-red-500/60',
                  avail === 'invalid'  && 'border-amber-500/60',
                  avail === 'available' && isDirty && 'border-emerald-500/60',
                )}
              />
              {draft.length > 0 && (
                <span className="absolute right-3">{availIndicator()}</span>
              )}
            </div>
            <div className="h-4 text-xs">{availMsg()}</div>
          </div>

          {/* Leaderboard toggle */}
          <div className={cn(
            'flex items-center justify-between gap-3',
            'rounded-[10px] border-[0.5px] px-3.5 py-2.5',
            optIn
              ? 'bg-[rgba(201,166,70,0.06)] border-[rgba(201,166,70,0.20)]'
              : 'bg-zinc-800/50 border-zinc-700',
          )}>
            <div className="flex items-center gap-2 min-w-0">
              {optIn
                ? <Eye size={14} className="text-[#C9A646] shrink-0" />
                : <EyeOff size={14} className="text-zinc-500 shrink-0" />
              }
              <div className="min-w-0">
                <p className={cn(
                  'text-[13px] font-medium leading-snug',
                  optIn ? 'text-[#C9A646]' : 'text-zinc-300',
                )}>
                  {optIn ? 'Visible on leaderboard' : 'Hidden from leaderboard'}
                </p>
                <p className="text-[11px] text-zinc-500 mt-px leading-snug">
                  {optIn ? 'Broker-synced trades only.' : 'Join to appear in the rankings.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={optInLoading || optInSaving}
              onClick={toggle}
              className={cn(
                'shrink-0 px-3 py-1 rounded-[6px] text-[12px] font-medium transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                optIn
                  ? 'border-[0.5px] border-[rgba(201,166,70,0.30)] text-[#C9A646] hover:bg-[rgba(201,166,70,0.08)]'
                  : 'bg-[#C9A646] text-black hover:bg-[#C9A646]/90',
              )}
            >
              {optInSaving ? <Loader2 size={11} className="animate-spin" /> : optIn ? 'Leave' : 'Join'}
            </button>
          </div>

          {/* Save / Close */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-white">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canSave}
              onClick={handleSave}
              className={cn(
                'min-w-[80px] transition-all',
                canSave
                  ? 'bg-[#C9A646] text-black hover:bg-[#C9A646]/90'
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed',
              )}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export const TheFloorTab = () => {
  const { user } = useAuth();
  const { optIn, isLoading: optInLoading } = useLeaderboardOptIn();

  const [username, setUsername]     = useState<string>('');
  const [profileLoading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('floor_username').eq('id', user.id).maybeSingle()
      .then(({ data }) => { setUsername(data?.floor_username ?? ''); setLoading(false); });
  }, [user]);

  if (profileLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-ink-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#C9A646]" />
          The Floor
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Your presence on the community feed and leaderboard.
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-[12px] border-[0.5px] border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between gap-4">
          {/* Avatar placeholder + info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <User size={18} className="text-zinc-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-white leading-tight truncate">
                {username ? `@${username}` : <span className="text-zinc-500 font-normal italic">No username set</span>}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {!optInLoading && (
                  optIn
                    ? <><Eye size={11} className="text-[#C9A646]" /><span className="text-[11px] text-[#C9A646]">Visible on leaderboard</span></>
                    : <><EyeOff size={11} className="text-zinc-500" /><span className="text-[11px] text-zinc-500">Hidden from leaderboard</span></>
                )}
              </div>
            </div>
          </div>

          {/* Edit button */}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[8px]',
              'text-[13px] font-medium text-zinc-300 hover:text-white',
              'bg-zinc-800 hover:bg-zinc-700 border-[0.5px] border-zinc-700',
              'transition-colors duration-100',
            )}
          >
            <Pencil size={13} />
            Edit Profile
          </button>
        </div>

        <p className="mt-4 text-[12px] text-zinc-500 leading-relaxed">
          Your Floor username appears on shared trades, comments, and the leaderboard instead of your display name.
          Leaderboard visibility is <strong className="text-zinc-400">off by default</strong> — opt in to compete.
        </p>
      </div>

      <EditProfileDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        currentUsername={username}
        onSaved={setUsername}
      />
    </div>
  );
};

export default TheFloorTab;
