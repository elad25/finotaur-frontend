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
  type ProvisionMemberReferralError,
} from '@/features/affiliate/utils/memberReferral';

/** Maps a requested-code provision error to friendly, user-facing English
 * text. Switches on the typed `kind`, not the raw message string. */
function friendlyCodeError(error: ProvisionMemberReferralError): string {
  switch (error.kind) {
    case 'invalid_code':
      return 'Codes are 4-15 letters/numbers.';
    case 'reserved_code':
      return 'That code is reserved, try another.';
    case 'code_taken':
      return 'That code is already taken, try another.';
    case 'unknown':
      return error.message;
    default:
      return 'Failed to create your referral code.';
  }
}

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
  const [requestedCode, setRequestedCode] = useState('');

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
      // "ready" requires a LIVE Whop promo, not just a code. A row with a
      // coupon_code but no whop_promo_id (never minted, or the Whop coupon
      // was deleted) means the friend discount doesn't actually exist at
      // checkout — treat it as needing (re)provisioning.
      setState(row?.coupon_code && row?.whop_promo_id ? { kind: 'ready', row } : { kind: 'no-code' });
    })();

    return () => {
      cancelled = true;
    };
  }, [subLoading, isPaidUser, user?.id]);

  const handleRequestedCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRequestedCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15));
  };

  const handleProvision = useCallback(async () => {
    setState({ kind: 'provisioning' });
    const result = await provisionMemberReferralCode(requestedCode || undefined);

    if (result.status === 'error') {
      if (result.error.kind === 'disabled') {
        setState({ kind: 'hidden' });
        return;
      }
      if (result.error.kind === 'not_paying') {
        setState({ kind: 'locked' });
        return;
      }
      setState({ kind: 'error', message: friendlyCodeError(result.error) });
      return;
    }

    const freshRow = user?.id ? await fetchMemberReferralRow(user.id) : null;
    setState({ kind: 'ready', row: freshRow?.whop_promo_id ? freshRow : rowFromProvisionResult(result.data) });
  }, [user?.id, requestedCode]);

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
          <h3 className="text-h4 text-ink-primary">The Funded Friend Deal</h3>
        </div>
        <p className="text-small leading-relaxed text-ink-secondary">
          Upgrade to get your personal referral code — your friend gets {DEFAULT_MEMBER_DISCOUNT_PERCENT}% off
          their first 3 months, and you earn 20% of their payments for 12 months.
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
          <h3 className="text-h4 text-ink-primary">The Funded Friend Deal</h3>
        </div>
        <p className="text-small leading-relaxed text-ink-secondary">
          Your friend gets {DEFAULT_MEMBER_DISCOUNT_PERCENT}% off their first 3 months · You earn{' '}
          20% of their payments for 12 months.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="refer-friend-card-requested-code" className="text-small font-medium text-ink-secondary">
            Choose your code (optional)
          </label>
          <input
            id="refer-friend-card-requested-code"
            type="text"
            value={requestedCode}
            onChange={handleRequestedCodeChange}
            maxLength={15}
            pattern="[A-Z0-9]*"
            placeholder="YOURCODE"
            disabled={state.kind === 'provisioning'}
            className="rounded-[8px] border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 font-mono text-small uppercase tracking-wider text-ink-primary placeholder:text-ink-muted placeholder:normal-case focus:border-gold-primary focus:outline-none focus:ring-[3px] focus:ring-gold-primary/15 disabled:opacity-60"
          />
          <p className="text-small text-ink-tertiary">
            4-15 characters, letters and numbers. Leave empty to auto-generate. Cannot be changed later.
          </p>
        </div>
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
          <h3 className="text-h4 text-ink-primary">The Funded Friend Deal</h3>
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
        Your friend gets {DEFAULT_MEMBER_DISCOUNT_PERCENT}% off their first 3 months · You earn 20%
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
