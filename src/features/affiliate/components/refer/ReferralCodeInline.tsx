// src/features/affiliate/components/refer/ReferralCodeInline.tsx
// =====================================================
// Compact "Your referral code" block — member-refers-friend program.
// Mirrors ReferFriendCard's state machine (checking/hidden/locked/no-code/
// provisioning/error/ready) and the same paying-member detection
// (`useSubscription().isPaidUser`), but renders as a compact inline block
// (no ds/Card chrome) meant to sit alongside other fields — e.g. the right
// side of Settings → Account → Profile card. Styled to match AccountTab's
// existing zinc/gold visual language rather than the dashboard ds/Card look.
//
// Additive component — ReferFriendCard is left untouched even though some
// logic is duplicated here on purpose (see task scope: compact standalone
// component, not a refactor of ReferFriendCard).
// =====================================================

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Gift, Lock } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { Spinner } from '@/components/ds/Spinner';
import {
  buildReferralLink,
  fetchMemberReferralRow,
  provisionMemberReferralCode,
  rowFromProvisionResult,
  DEFAULT_MEMBER_DISCOUNT_PERCENT,
  type MemberReferralRow,
} from '@/features/affiliate/utils/memberReferral';

type InlineState =
  | { kind: 'checking' }
  | { kind: 'hidden' }
  | { kind: 'locked' }
  | { kind: 'no-code' }
  | { kind: 'provisioning' }
  | { kind: 'ready'; row: MemberReferralRow }
  | { kind: 'error'; message: string };

export function ReferralCodeInline() {
  const { user } = useAuth();
  const { isPaidUser, isLoading: subLoading } = useSubscription();
  const [state, setState] = useState<InlineState>({ kind: 'checking' });
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  // Resolve initial state: hidden while subscription is still loading, then
  // locked for free members, then check for an already-provisioned row.
  useEffect(() => {
    let cancelled = false;
    if (subLoading) return;
    if (!isPaidUser) {
      setState({ kind: 'locked' });
      return;
    }
    if (!user?.id) return;

    (async () => {
      const row = await fetchMemberReferralRow(user.id);
      if (cancelled) return;
      setState(row?.coupon_code ? { kind: 'ready', row } : { kind: 'no-code' });
    })();

    return () => {
      cancelled = true;
    };
  }, [subLoading, isPaidUser, user?.id]);

  const handleProvision = useCallback(async () => {
    setState({ kind: 'provisioning' });
    const result = await provisionMemberReferralCode();

    if (result.status === 'error') {
      if (result.error.kind === 'disabled') {
        setState({ kind: 'hidden' });
        return;
      }
      if (result.error.kind === 'not_paying') {
        setState({ kind: 'locked' });
        return;
      }
      setState({ kind: 'error', message: result.error.message });
      return;
    }

    const freshRow = user?.id ? await fetchMemberReferralRow(user.id) : null;
    setState({ kind: 'ready', row: freshRow?.coupon_code ? freshRow : rowFromProvisionResult(result.data) });
  }, [user?.id]);

  const copy = useCallback(async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API unavailable — silently no-op, nothing to recover from.
    }
  }, []);

  // Kill-switch / unresolved status — never flash content.
  if (state.kind === 'checking' || state.kind === 'hidden') return null;

  if (state.kind === 'locked') {
    return (
      <div className="flex flex-col justify-center gap-3 rounded-lg border border-zinc-700/30 bg-zinc-800/30 p-5">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 shrink-0 text-[#C9A646]" aria-hidden="true" />
          <p className="text-base leading-relaxed text-zinc-400">
            <Link to="/app/upgrade" className="text-[#C9A646] hover:underline">
              Upgrade
            </Link>{' '}
            to unlock your referral code
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === 'no-code' || state.kind === 'provisioning' || state.kind === 'error') {
    return (
      <div className="flex flex-col justify-center gap-3 rounded-lg border border-zinc-700/30 bg-zinc-800/30 p-5">
        <div className="flex items-center gap-2.5">
          <Gift className="h-5 w-5 text-[#C9A646]" aria-hidden="true" />
          <span className="text-base font-medium text-white">The Funded Friend Deal</span>
        </div>
        {state.kind === 'error' && <p className="text-xs text-red-400">{state.message}</p>}
        <button
          type="button"
          onClick={handleProvision}
          disabled={state.kind === 'provisioning'}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-[#C9A646] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-[#B8963F] disabled:opacity-60"
        >
          {state.kind === 'provisioning' ? (
            <>
              <Spinner size="sm" color="inherit" />
              Creating…
            </>
          ) : (
            'Get your referral code'
          )}
        </button>
      </div>
    );
  }

  const { row } = state;
  const code = row.coupon_code as string;
  const link = buildReferralLink(code);

  return (
    <div className="flex flex-col justify-center gap-3 rounded-lg border border-zinc-700/30 bg-zinc-800/30 p-5">
      <span className="text-sm text-zinc-400">The Funded Friend Deal</span>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-zinc-600/50 bg-zinc-900/60 px-3 py-1.5 font-mono text-base font-semibold tracking-wider text-[#C9A646]">
          {code}
        </span>
        <button
          type="button"
          onClick={() => copy(code, 'code')}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-700/30 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-[#C9A646] hover:text-[#C9A646]"
        >
          {copied === 'code' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied === 'code' ? 'Copied' : 'Copy code'}
        </button>
        <button
          type="button"
          onClick={() => copy(link, 'link')}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-700/30 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-[#C9A646] hover:text-[#C9A646]"
        >
          {copied === 'link' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <p className="text-sm leading-relaxed text-zinc-500">
        Friend gets {DEFAULT_MEMBER_DISCOUNT_PERCENT}% off · You earn {DEFAULT_MEMBER_DISCOUNT_PERCENT}% for 12
        months
      </p>

      <Link to="/app/journal/refer" className="text-sm text-[#C9A646] hover:underline">
        Referral dashboard →
      </Link>
    </div>
  );
}

export default ReferralCodeInline;
