// src/features/settings/tabs/TheFloorTab.tsx
// "The Floor" settings — Floor username + leaderboard visibility.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useLeaderboardOptIn } from '@/hooks/useLeaderboardOptIn';
import { Activity, Check, X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FORMAT_REGEX = /^[a-z0-9_]{3,20}$/;

type AvailState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export const TheFloorTab = () => {
  const { user } = useAuth();
  const { optIn, isLoading: optInLoading, toggle, isSaving: optInSaving } = useLeaderboardOptIn();

  const [current, setCurrent]     = useState<string>('');
  const [draft, setDraft]         = useState<string>('');
  const [avail, setAvail]         = useState<AvailState>('idle');
  const [saving, setSaving]       = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing floor_username
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('floor_username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const val = data?.floor_username ?? '';
        setCurrent(val);
        setDraft(val);
        setProfileLoading(false);
      });
  }, [user]);

  const checkAvailability = useCallback(async (value: string) => {
    if (!value) { setAvail('idle'); return; }
    if (!FORMAT_REGEX.test(value)) { setAvail('invalid'); return; }
    if (value === current) { setAvail('available'); return; }

    setAvail('checking');
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('floor_username', value)
      .neq('id', user!.id)
      .maybeSingle();
    setAvail(data ? 'taken' : 'available');
  }, [current, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setDraft(raw);
    setAvail('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkAvailability(raw), 400);
  };

  const handleSave = async () => {
    if (avail !== 'available' && draft !== '') return;
    if (draft === current) return;
    setSaving(true);
    const val = draft.trim() || null;
    const { error } = await supabase
      .from('profiles')
      .update({ floor_username: val })
      .eq('id', user!.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save username. Please try again.');
    } else {
      setCurrent(draft);
      toast.success(draft ? `@${draft} is now your Floor username` : 'Floor username removed');
    }
  };

  const isDirty = draft !== current;
  const canSave = isDirty && !saving && (draft === '' || avail === 'available');

  const availIcon = () => {
    if (avail === 'checking') return <Loader2 size={14} className="animate-spin text-ink-tertiary" />;
    if (avail === 'available') return <Check size={14} className="text-emerald-400" />;
    if (avail === 'taken')    return <X size={14} className="text-red-400" />;
    if (avail === 'invalid')  return <X size={14} className="text-amber-400" />;
    return null;
  };

  const availText = () => {
    if (avail === 'available' && draft !== current) return <span className="text-emerald-400">Available</span>;
    if (avail === 'taken')   return <span className="text-red-400">Already taken</span>;
    if (avail === 'invalid') return <span className="text-amber-400">3–20 chars, lowercase letters, numbers, _</span>;
    return null;
  };

  if (profileLoading) {
    return <div className="py-16 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-ink-tertiary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#C9A646]" />
          The Floor
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Control how you appear to other members on the community feed and leaderboard.</p>
      </div>

      {/* Username card */}
      <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-white">Floor Username</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Your unique handle on The Floor. Shown instead of your display name on shared trades and comments.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="floor-username" className="text-xs text-zinc-400">Username</Label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-zinc-500 text-sm select-none">@</span>
            <Input
              id="floor-username"
              value={draft}
              onChange={handleChange}
              maxLength={20}
              placeholder="yourhandle"
              className={cn(
                'pl-7 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-[#C9A646]/40',
                avail === 'taken'    && 'border-red-500/60',
                avail === 'invalid'  && 'border-amber-500/60',
                avail === 'available' && draft !== current && 'border-emerald-500/60',
              )}
            />
            {draft.length > 0 && (
              <span className="absolute right-3">{availIcon()}</span>
            )}
          </div>
          <div className="h-4 text-xs">{availText()}</div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-zinc-500">Lowercase letters, numbers, and underscores. 3–20 characters.</p>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={handleSave}
            className={cn(
              'min-w-[80px] transition-all',
              canSave ? 'bg-[#C9A646] text-black hover:bg-[#C9A646]/90' : 'bg-zinc-700 text-zinc-400 cursor-not-allowed',
            )}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </Button>
        </div>

        {current && !isDirty && (
          <p className="text-xs text-zinc-500 -mt-1">
            Current: <span className="text-zinc-300 font-medium">@{current}</span>
          </p>
        )}
      </Card>

      {/* Leaderboard visibility card */}
      <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-white">Leaderboard Visibility</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Decide whether your stats appear on the community leaderboard. Only broker-synced trades count — no manual entries.
          </p>
        </div>

        <div className={cn(
          'flex items-center justify-between gap-4',
          'rounded-[10px] border-[0.5px] px-4 py-3',
          optIn ? 'bg-[rgba(201,166,70,0.06)] border-[rgba(201,166,70,0.20)]' : 'bg-zinc-800/50 border-zinc-700',
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            {optIn
              ? <Eye size={15} className="text-[#C9A646] shrink-0" />
              : <EyeOff size={15} className="text-zinc-500 shrink-0" />
            }
            <div className="min-w-0">
              <p className={cn('text-sm font-medium', optIn ? 'text-[#C9A646]' : 'text-zinc-300')}>
                {optIn ? "You're visible on the leaderboard" : "You're hidden from the leaderboard"}
              </p>
              {!optIn && (
                <p className="text-xs text-zinc-500 mt-0.5">Join to compete with other traders.</p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={optInLoading || optInSaving}
            onClick={toggle}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              optIn
                ? 'border-[0.5px] border-[rgba(201,166,70,0.30)] text-[#C9A646] hover:bg-[rgba(201,166,70,0.08)]'
                : 'bg-[#C9A646] text-black hover:bg-[#C9A646]/90',
            )}
          >
            {optInSaving ? <Loader2 size={12} className="animate-spin" /> : optIn ? 'Leave' : 'Join'}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default TheFloorTab;
