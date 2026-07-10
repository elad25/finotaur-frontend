// src/features/affiliate/components/refer/ReferFriendCard.tsx
// =====================================================
// Refer a Friend — compact dashboard widget (member-refers-friend program)
// =====================================================
// Every PAYING member gets a personal referral coupon code, provisioned
// lazily via the `create-whop-promo` Edge Function ({ mode: 'member' }).
// Renders nothing while status is unresolved, and nothing once the server
// reports the feature is disabled — this widget must never flash content
// for a kill-switched program.
// =====================================================

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Gift, Lock } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Spinner } from '@/components/ds/Spinner';
import {
  buildReferralLink,
  fetchMemberReferralRow,
  provisionMemberReferralCode,
  rowFromProvisionResult,
  DEFAULT_MEMBER_DISCOUNT_PERCENT,
  type MemberReferralRow,
} from '@/features/affiliate/utils/memberReferral';

type CardState =
  | { kind: 'checking' }
  | { kind: 'hidden' }
  | { kind: 'locked' }
  | { kind: 'no-code' }
  | { kind: 'provisioning' }
  | { kind: 'ready'; row: MemberReferralRow }
  | { kind: 'error'; message: string };

export function ReferFriendCard() {
  const { user } = useAuth();
  const { isPaidUser, isLoading: subLoading } = useSubscription();
  const [state, setState] = useState<CardState>({ kind: 'checking' });
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
      <Card padding="default" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-gold-primary" aria-hidden="true" />
          <h3 className="text-h4 text-ink-primary">Refer a Friend</h3>
        </div>
        <p className="text-small leading-relaxed text-ink-secondary">
          Upgrade to get your personal referral code — your friend gets{' '}
          {DEFAULT_MEMBER_DISCOUNT_PERCENT}% off, and you earn {DEFAULT_MEMBER_DISCOUNT_PERCENT}% of
          their payments for 12 months.
        </p>
        <Button asChild variant="gold" size="sm" className="self-start">
          <Link to="/app/upgrade">Upgrade to unlock</Link>
        </Button>
      </Card>
    );
  }

  if (state.kind === 'no-code' || state.kind === 'provisioning' || state.kind === 'error') {
    return (
      <Card padding="default" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-gold-primary" aria-hidden="true" />
          <h3 className="text-h4 text-ink-primary">Refer a Friend</h3>
        </div>
        <p className="text-small leading-relaxed text-ink-secondary">
          Your friend gets {DEFAULT_MEMBER_DISCOUNT_PERCENT}% off · You earn{' '}
          {DEFAULT_MEMBER_DISCOUNT_PERCENT}% of their payments for 12 months.
        </p>
        {state.kind === 'error' && <p className="text-small text-num-negative">{state.message}</p>}
        <Button
          variant="gold"
          size="sm"
          showArrow={false}
          className="self-start"
          disabled={state.kind === 'provisioning'}
          onClick={handleProvision}
        >
          {state.kind === 'provisioning' ? (
            <>
              <Spinner size="sm" color="inherit" />
              Creating your code…
            </>
          ) : (
            'Get your referral code'
          )}
        </Button>
      </Card>
    );
  }

  const { row } = state;
  const code = row.coupon_code as string;
  const link = buildReferralLink(code);

  return (
    <Card padding="default" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-gold-primary" aria-hidden="true" />
          <h3 className="text-h4 text-ink-primary">Refer a Friend</h3>
        </div>
        <Link to="/app/journal/refer" className="text-small text-gold-primary hover:underline">
          View details
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-[8px] border-[0.5px] border-border-ds-default bg-surface-2 px-3 py-1.5 font-mono text-body font-semibold tracking-wider text-gold-primary">
          {code}
        </span>
        <button
          type="button"
          onClick={() => copy(code, 'code')}
          className="inline-flex items-center gap-1.5 rounded-[8px] border-[0.5px] border-border-ds-subtle px-2.5 py-1.5 text-small text-ink-secondary transition-colors duration-base ease-out hover:border-gold-primary hover:text-gold-primary"
        >
          {copied === 'code' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === 'code' ? 'Copied' : 'Copy code'}
        </button>
        <button
          type="button"
          onClick={() => copy(link, 'link')}
          className="inline-flex items-center gap-1.5 rounded-[8px] border-[0.5px] border-border-ds-subtle px-2.5 py-1.5 text-small text-ink-secondary transition-colors duration-base ease-out hover:border-gold-primary hover:text-gold-primary"
        >
          {copied === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <p className="text-small text-ink-tertiary">
        Your friend gets {DEFAULT_MEMBER_DISCOUNT_PERCENT}% off · You earn {DEFAULT_MEMBER_DISCOUNT_PERCENT}%
        of their payments for 12 months
      </p>

      <div className="grid grid-cols-3 gap-3 border-t border-border-ds-subtle pt-3">
        <div>
          <Eyebrow className="normal-case">Referrals</Eyebrow>
          <p className="mt-1 text-body font-semibold tabular-nums text-ink-primary">
            {row.total_qualified_referrals}
          </p>
        </div>
        <div>
          <Eyebrow className="normal-case">Pending</Eyebrow>
          <p className="mt-1 text-body font-semibold tabular-nums text-ink-primary">
            ${Number(row.total_pending_usd || 0).toFixed(2)}
          </p>
        </div>
        <div>
          <Eyebrow className="normal-case">Paid</Eyebrow>
          <p className="mt-1 text-body font-semibold tabular-nums text-ink-primary">
            ${Number(row.total_paid_usd || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default ReferFriendCard;
