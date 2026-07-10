// src/pages/app/journal/refer/ReferFriendPage.tsx
// =====================================================
// /app/journal/refer — Refer a Friend (member-refers-friend program)
// =====================================================
// Full-page view of the member's personal referral code, their referrals,
// earnings, and payout settings. Provisioning is identical to
// ReferFriendCard: paying members are auto-provisioned a code on first
// visit if they don't have one yet; the server's 403 responses
// (member_referral_disabled / not_paying) drive the empty/locked states.
// =====================================================

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Gift, Lock, Users } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { Card, Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { SectionSpinner, Spinner } from '@/components/ds/Spinner';
import {
  buildReferralLink,
  fetchMemberReferralRow,
  provisionMemberReferralCode,
  rowFromProvisionResult,
  maskEmail,
  toReferralDisplayStatus,
  DEFAULT_MEMBER_DISCOUNT_PERCENT,
  type MemberReferralRow,
  type MemberReferralListItem,
  type ReferralDisplayStatus,
} from '@/features/affiliate/utils/memberReferral';

type PageState =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'locked' }
  | { kind: 'provisioning' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; row: MemberReferralRow };

interface CommissionTotals {
  pending: number;
  confirmed: number;
  paid: number;
}

const PAYOUT_MINIMUM_USD = 50;

const STATUS_BADGE_CLASS: Record<ReferralDisplayStatus, string> = {
  'Pending verification': 'bg-gold-primary/10 text-gold-primary border-gold-border',
  Active: 'bg-white/8 text-ink-primary border-border-ds-default',
  Failed: 'bg-num-negative/10 text-num-negative border-num-negative/25',
};

function ReferralStatusBadge({ status }: { status: string }) {
  const display = toReferralDisplayStatus(status);
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border-[0.5px] px-2 py-0.5 text-small font-medium ${STATUS_BADGE_CLASS[display]}`}
    >
      {display}
    </span>
  );
}

export default function ReferFriendPage() {
  const { user } = useAuth();
  const { isPaidUser, isLoading: subLoading } = useSubscription();

  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [referrals, setReferrals] = useState<MemberReferralListItem[]>([]);
  const [commissions, setCommissions] = useState<CommissionTotals>({ pending: 0, confirmed: 0, paid: 0 });
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [savingPaypal, setSavingPaypal] = useState(false);
  const [paypalSaved, setPaypalSaved] = useState(false);

  const retry = useCallback(() => {
    setState({ kind: 'loading' });
    setRefreshKey((k) => k + 1);
  }, []);

  // Resolve access + lazily provision a code for paying members who don't
  // have one yet.
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

      if (row?.coupon_code) {
        setState({ kind: 'ready', row });
        return;
      }

      setState({ kind: 'provisioning' });
      const result = await provisionMemberReferralCode();
      if (cancelled) return;

      if (result.status === 'error') {
        if (result.error.kind === 'disabled') {
          setState({ kind: 'disabled' });
          return;
        }
        if (result.error.kind === 'not_paying') {
          setState({ kind: 'locked' });
          return;
        }
        setState({ kind: 'error', message: result.error.message });
        return;
      }

      const freshRow = await fetchMemberReferralRow(user.id);
      if (cancelled) return;
      setState({ kind: 'ready', row: freshRow?.coupon_code ? freshRow : rowFromProvisionResult(result.data) });
    })();

    return () => {
      cancelled = true;
    };
  }, [subLoading, isPaidUser, user?.id, refreshKey]);

  // Load referrals + commission totals once a row with a real id is ready.
  useEffect(() => {
    if (state.kind !== 'ready' || !state.row.id) return;
    let cancelled = false;

    (async () => {
      const [referralsRes, commissionsRes] = await Promise.all([
        supabase
          .from('affiliate_referrals')
          .select('id, referred_user_email, status, signup_date, first_payment_date')
          .eq('affiliate_id', state.row.id)
          .order('signup_date', { ascending: false }),
        supabase.from('affiliate_commissions').select('commission_amount_usd, status').eq('affiliate_id', state.row.id),
      ]);

      if (cancelled) return;

      setReferrals((referralsRes.data || []) as MemberReferralListItem[]);

      const totals: CommissionTotals = { pending: 0, confirmed: 0, paid: 0 };
      for (const row of commissionsRes.data || []) {
        const amount = Number((row as any).commission_amount_usd) || 0;
        const status = (row as any).status as string;
        if (status === 'pending') totals.pending += amount;
        else if (status === 'confirmed') totals.confirmed += amount;
        else if (status === 'paid') totals.paid += amount;
      }
      setCommissions(totals);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind === 'ready' ? state.row.id : null]);

  // Prime the PayPal email field once the row is loaded.
  useEffect(() => {
    if (state.kind === 'ready') setPaypalEmail(state.row.paypal_email || '');
  }, [state]);

  const copy = useCallback(async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API unavailable — nothing to recover from.
    }
  }, []);

  const handleSavePaypal = useCallback(async () => {
    if (state.kind !== 'ready' || !state.row.id) return;
    setSavingPaypal(true);
    const { error } = await supabase
      .from('affiliates')
      .update({ paypal_email: paypalEmail.trim() || null })
      .eq('id', state.row.id);
    setSavingPaypal(false);
    if (!error) {
      setPaypalSaved(true);
      setTimeout(() => setPaypalSaved(false), 2500);
    }
  }, [state, paypalEmail]);

  // ── Loading (initial subscription + row check) ──
  if (state.kind === 'loading') {
    return <RouteSkeleton />;
  }

  // ── Provisioning (first-time code creation) ──
  if (state.kind === 'provisioning') {
    return (
      <div className="p-4 lg:p-6">
        <h1 className="mb-6 text-h1 text-ink-primary">The Funded Friend Deal</h1>
        <SectionSpinner label="Setting up your referral code…" />
      </div>
    );
  }

  // ── Disabled (kill-switch off) ──
  if (state.kind === 'disabled') {
    return (
      <div className="p-4 lg:p-6 max-w-3xl mx-auto">
        <h1 className="mb-6 text-h1 text-ink-primary">The Funded Friend Deal</h1>
        <Card padding="spacious" className="text-center">
          <p className="text-body text-ink-secondary">Referral program is not available right now.</p>
        </Card>
      </div>
    );
  }

  // ── Locked (free member) ──
  if (state.kind === 'locked') {
    return (
      <div className="p-4 lg:p-6 max-w-3xl mx-auto">
        <h1 className="mb-6 text-h1 text-ink-primary">The Funded Friend Deal</h1>
        <Card padding="spacious" className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-[0.5px] border-gold-border bg-gold-primary/10">
            <Lock className="h-6 w-6 text-gold-primary" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <p className="text-h4 text-ink-primary">Referral codes are a paid member benefit</p>
            <p className="text-small leading-relaxed text-ink-secondary">
              Upgrade to get your personal referral code — your friend gets{' '}
              {DEFAULT_MEMBER_DISCOUNT_PERCENT}% off their first payment, and you earn{' '}
              {DEFAULT_MEMBER_DISCOUNT_PERCENT}% of every payment they make for their first 12 months.
            </p>
          </div>
          <Button asChild variant="gold" size="default">
            <Link to="/app/upgrade">Upgrade to unlock</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // ── Error ──
  if (state.kind === 'error') {
    return (
      <div className="p-4 lg:p-6 max-w-3xl mx-auto">
        <h1 className="mb-6 text-h1 text-ink-primary">The Funded Friend Deal</h1>
        <Card padding="spacious" className="flex flex-col items-center gap-4 text-center">
          <p className="text-body text-num-negative">{state.message}</p>
          <Button variant="goldOutline" size="sm" showArrow={false} onClick={retry}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  // ── Ready ──
  const { row } = state;
  const code = row.coupon_code as string;
  const link = buildReferralLink(code);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-h1 text-ink-primary">The Funded Friend Deal</h1>
        <p className="mt-1 text-small text-ink-secondary">Give 20%, Get 20% for 12 months</p>
      </div>

      {/* Hero — code + share link + terms */}
      <Card padding="spacious" className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-gold-primary" aria-hidden="true" />
          <h2 className="text-h3 text-ink-primary">Your referral code</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[8px] border-[0.5px] border-border-ds-default bg-surface-2 px-4 py-2 font-mono text-h4 font-semibold tracking-wider text-gold-primary">
            {code}
          </span>
          <button
            type="button"
            onClick={() => copy(code, 'code')}
            className="inline-flex items-center gap-1.5 rounded-[8px] border-[0.5px] border-border-ds-subtle px-3 py-2 text-small text-ink-secondary transition-colors duration-base ease-out hover:border-gold-primary hover:text-gold-primary"
          >
            {copied === 'code' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1 px-3 py-2 text-small text-ink-secondary">
            {link}
          </span>
          <button
            type="button"
            onClick={() => copy(link, 'link')}
            className="inline-flex items-center gap-1.5 rounded-[8px] border-[0.5px] border-border-ds-subtle px-3 py-2 text-small text-ink-secondary transition-colors duration-base ease-out hover:border-gold-primary hover:text-gold-primary"
          >
            {copied === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <p className="text-small leading-relaxed text-ink-tertiary">
          Your friend gets {DEFAULT_MEMBER_DISCOUNT_PERCENT}% off their first payment. You earn{' '}
          {DEFAULT_MEMBER_DISCOUNT_PERCENT}% of every payment they make for their first 12 months.
        </p>
      </Card>

      {/* Referrals */}
      <Card padding="default" className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gold-primary" aria-hidden="true" />
          <h2 className="text-h4 text-ink-primary">Your referrals</h2>
          <span className="text-small text-ink-tertiary">({referrals.length})</span>
        </div>

        {referrals.length === 0 ? (
          <p className="py-6 text-center text-small text-ink-tertiary">
            No referrals yet — share your code to start earning.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[8px] border-[0.5px] border-border-ds-subtle">
            <div className="grid grid-cols-3 gap-3 border-b border-border-ds-subtle bg-surface-2 px-4 py-2.5 text-eyebrow text-ink-tertiary">
              <span className="normal-case">Referral</span>
              <span className="normal-case">Status</span>
              <span className="text-right normal-case">Date</span>
            </div>
            {referrals.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-3 items-center gap-3 border-b border-border-ds-subtle px-4 py-2.5 text-small last:border-b-0"
              >
                <span className="truncate text-ink-primary">{maskEmail(r.referred_user_email)}</span>
                <ReferralStatusBadge status={r.status} />
                <span className="text-right text-ink-tertiary tabular-nums">
                  {r.first_payment_date
                    ? new Date(r.first_payment_date).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : r.signup_date
                      ? new Date(r.signup_date).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Earnings */}
      <Card padding="default" className="flex flex-col gap-4">
        <h2 className="text-h4 text-ink-primary">Earnings</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Eyebrow className="normal-case">Pending</Eyebrow>
            <p className="mt-1 text-h4 font-semibold tabular-nums text-ink-primary">
              ${commissions.pending.toFixed(2)}
            </p>
          </div>
          <div>
            <Eyebrow className="normal-case">Confirmed</Eyebrow>
            <p className="mt-1 text-h4 font-semibold tabular-nums text-ink-primary">
              ${commissions.confirmed.toFixed(2)}
            </p>
          </div>
          <div>
            <Eyebrow className="normal-case">Paid</Eyebrow>
            <p className="mt-1 text-h4 font-semibold tabular-nums text-ink-primary">
              ${commissions.paid.toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {/* Payout settings */}
      <Card padding="default" className="flex flex-col gap-4">
        <h2 className="text-h4 text-ink-primary">Payout settings</h2>
        <p className="text-small leading-relaxed text-ink-tertiary">
          Payouts are sent via PayPal once your confirmed earnings reach $50.
        </p>

        {/* Progress toward next payout */}
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gold-primary transition-all duration-base ease-out"
              style={{ width: `${Math.min(100, (commissions.confirmed / PAYOUT_MINIMUM_USD) * 100)}%` }}
            />
          </div>
          <p className="text-small text-ink-tertiary">
            {commissions.confirmed >= PAYOUT_MINIMUM_USD
              ? 'Payout unlocked — sent to your PayPal on the next payout run (5th of the month).'
              : `$${commissions.confirmed.toFixed(2)} of $${PAYOUT_MINIMUM_USD} until your next payout`}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="referral-paypal-email" className="sr-only">
            PayPal email for payouts
          </label>
          <input
            id="referral-paypal-email"
            type="email"
            value={paypalEmail}
            onChange={(e) => setPaypalEmail(e.target.value)}
            placeholder="PayPal email for payouts"
            className="flex-1 rounded-[8px] border-[0.5px] border-border-ds-default bg-surface-1 px-4 py-2.5 text-body text-ink-primary placeholder:text-ink-muted focus:border-gold-primary focus:outline-none focus:ring-[3px] focus:ring-gold-primary/15"
          />
          <Button
            variant="gold"
            size="sm"
            showArrow={false}
            disabled={savingPaypal}
            onClick={handleSavePaypal}
            className="shrink-0"
          >
            {savingPaypal ? <Spinner size="sm" color="inherit" /> : paypalSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
