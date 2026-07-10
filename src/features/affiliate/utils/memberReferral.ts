// src/features/affiliate/utils/memberReferral.ts
// =====================================================
// MEMBER-REFERS-FRIEND — shared client helpers
// =====================================================
// Every PAYING member gets a personal referral coupon code, provisioned
// lazily via the `create-whop-promo` Edge Function (body: { mode: 'member' },
// authenticated with the member's own JWT). Shared by ReferFriendCard
// (dashboard widget) and ReferFriendPage (/app/journal/refer) so both read
// the same `affiliates` row shape and the same edge-function contract.
//
// Row is looked up on the `affiliates` table, scoped to this member by
// `affiliate_type = 'member'` (distinct from the legacy influencer-affiliate
// rows, which use `affiliate_type = 'regular' | 'admin'`).
// =====================================================

import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

export interface MemberReferralRow {
  id: string;
  affiliate_code: string;
  coupon_code: string | null;
  whop_promo_id: string | null;
  status: string;
  affiliate_type: string;
  total_qualified_referrals: number;
  total_pending_usd: number;
  total_paid_usd: number;
  paypal_email: string | null;
}

export interface ProvisionMemberReferralData {
  coupon_code: string;
  whop_promo_id: string | null;
  discount_percent: number;
}

export type ProvisionMemberReferralError =
  | { kind: 'disabled' }
  | { kind: 'not_paying' }
  | { kind: 'unknown'; message: string };

// NOTE: discriminant is a string literal (`status`), not a boolean `ok`
// field — this repo's tsconfig runs with `strict: false`, and under that
// setting `tsc` does not narrow discriminated unions keyed on a boolean
// literal (`{ ok: true } | { ok: false }` fails to narrow via `if
// (!result.ok)` / `if (result.ok) {} else {}`, verified against this
// project's exact tsc invocation). A string-literal discriminant narrows
// correctly regardless of strict mode, so it's used here on purpose.
export type ProvisionMemberReferralResult =
  | { status: 'ok'; data: ProvisionMemberReferralData }
  | { status: 'error'; error: ProvisionMemberReferralError };

export type ReferralDisplayStatus = 'Pending verification' | 'Active' | 'Failed';

export interface MemberReferralListItem {
  id: string;
  referred_user_email: string | null;
  status: string;
  signup_date: string | null;
  first_payment_date: string | null;
}

// Default discount shown before the edge function confirms the real value.
export const DEFAULT_MEMBER_DISCOUNT_PERCENT = 20;

const REFERRAL_LINK_BASE = 'https://finotaur.com/ref';

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

export function buildReferralLink(code: string): string {
  return `${REFERRAL_LINK_BASE}/${code}`;
}

/**
 * Masks the local-part of an email for display in a referral list — never
 * show a friend's full email address to the referring member.
 * "johnsmith@example.com" -> "jo***@example.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '***';
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!domain) return '***';
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible || '*'}***@${domain}`;
}

export function toReferralDisplayStatus(status: string): ReferralDisplayStatus {
  switch (status) {
    case 'qualified':
      return 'Active';
    case 'pending':
    case 'verification_pending':
      return 'Pending verification';
    default:
      // verification_failed, churned, refunded
      return 'Failed';
  }
}

/**
 * Reads the structured `{ error, ... }` JSON body a Supabase Edge Function
 * returns for a non-2xx response. `supabase.functions.invoke` wraps these in
 * FunctionsHttpError, whose `.message` is a generic "non-2xx status code"
 * string — the real body lives on `error.context` (a Response). Mirrors the
 * pattern in `src/hooks/useTradovate.ts:extractEdgeError`.
 */
async function readEdgeErrorBody(err: any): Promise<{ status: number | null; error: string | null }> {
  try {
    const ctx = err?.context;
    const status = typeof ctx?.status === 'number' ? ctx.status : null;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.clone().json();
      const error = typeof body?.error === 'string' ? body.error : null;
      return { status, error };
    }
    return { status, error: null };
  } catch {
    return { status: null, error: null };
  }
}

/** Fetch this member's referral row (own row, RLS-scoped). Returns null if
 * not yet provisioned, or on a read error (fails closed — no row shown). */
export async function fetchMemberReferralRow(userId: string): Promise<MemberReferralRow | null> {
  const { data, error } = await supabase
    .from('affiliates')
    .select(
      'id, affiliate_code, coupon_code, whop_promo_id, status, affiliate_type, total_qualified_referrals, total_pending_usd, total_paid_usd, paypal_email',
    )
    .eq('user_id', userId)
    // No affiliate_type filter: pre-existing 'regular'/'admin' affiliates
    // (approved influencers, legacy rows) also have a shareable code — a
    // user has at most one affiliates row (user_id is unique).
    .maybeSingle();

  if (error) {
    console.error('[memberReferral] fetchMemberReferralRow error:', error);
    return null;
  }
  return (data as MemberReferralRow | null) ?? null;
}

/** Invokes `create-whop-promo` with `{ mode: 'member' }` using the caller's
 * own JWT (supabase-js attaches the current session automatically). */
export async function provisionMemberReferralCode(): Promise<ProvisionMemberReferralResult> {
  const { data, error } = await supabase.functions.invoke('create-whop-promo', {
    body: { mode: 'member' },
  });

  if (error) {
    const { status: httpStatus, error: bodyError } = await readEdgeErrorBody(error);
    if (httpStatus === 403 && bodyError === 'member_referral_disabled') {
      return { status: 'error', error: { kind: 'disabled' } };
    }
    if (httpStatus === 403 && bodyError === 'not_paying') {
      return { status: 'error', error: { kind: 'not_paying' } };
    }
    return {
      status: 'error',
      error: { kind: 'unknown', message: bodyError || error.message || 'Failed to create your referral code.' },
    };
  }

  if (!data?.ok || !data?.coupon_code) {
    return { status: 'error', error: { kind: 'unknown', message: 'Unexpected response — please try again.' } };
  }

  return {
    status: 'ok',
    data: {
      coupon_code: data.coupon_code as string,
      whop_promo_id: (data.whop_promo_id as string | undefined) ?? null,
      discount_percent:
        typeof data.discount_percent === 'number' ? data.discount_percent : DEFAULT_MEMBER_DISCOUNT_PERCENT,
    },
  };
}

/** Builds a minimal row from a fresh provision response, for immediate
 * display before the row is refetched from the DB. */
export function rowFromProvisionResult(data: ProvisionMemberReferralData): MemberReferralRow {
  return {
    id: '',
    affiliate_code: data.coupon_code,
    coupon_code: data.coupon_code,
    whop_promo_id: data.whop_promo_id,
    status: 'active',
    affiliate_type: 'member',
    total_qualified_referrals: 0,
    total_pending_usd: 0,
    total_paid_usd: 0,
    paypal_email: null,
  };
}
