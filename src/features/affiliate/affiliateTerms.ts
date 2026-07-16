/**
 * affiliateTerms.ts — SINGLE SOURCE OF TRUTH for affiliate-program offer terms shown in the UI.
 *
 * These values MIRROR the production `affiliate_config` table (Supabase ref xsgbtptkueabylkxibly),
 * verified live 2026-07-13. The authoritative commission math runs server-side in the Whop webhook,
 * which reads `affiliate_config` directly — this module exists ONLY so that every user-facing surface
 * (public /affiliate page, Settings › Affiliates tab, dashboard tier cards, affiliate emails) displays
 * ONE consistent set of numbers instead of the drifted hardcoded strings that previously existed
 * (10%+10% on the public page, 10/15/20 tier ladder in the dashboard, "10% for 12 months" in emails).
 *
 * 🔴 If `affiliate_config` changes in production, update THIS file in the same change. Do not re-hardcode
 * these numbers anywhere else — import from here.
 *
 * Live config mapping:
 *   commission_rates.tier_{1,2,3}.rate = 0.15 (flat)  -> COMMISSION_RATE_PCT
 *   commission_duration_months.months = 12            -> COMMISSION_DURATION_MONTHS
 *   member_referral.friend_discount_percent = 25      -> FRIEND_DISCOUNT_PCT
 *   member_referral.friend_discount_cycles = 3        -> FRIEND_DISCOUNT_MONTHS
 *   payout_settings.min_payout_usd = 50               -> MIN_PAYOUT_USD
 *   payout_settings.payment_methods = [paypal, bank]  -> PAYOUT_METHODS
 *   payout_settings.payout_day = 15                   -> PAYOUT_DAY_OF_MONTH
 *   attribution_window_days.days = 30                 -> ATTRIBUTION_WINDOW_DAYS
 *   sub_affiliate_rate.rate = 0.05                    -> SUB_AFFILIATE_RATE_PCT
 */

/** Flat commission the affiliate earns on every referred subscription payment. */
export const COMMISSION_RATE_PCT = 15;

/** Number of months an affiliate keeps earning commission per referred customer. */
export const COMMISSION_DURATION_MONTHS = 12;

/** Discount the referred friend receives (this is the "25% for 3 months" figure). */
export const FRIEND_DISCOUNT_PCT = 25;

/** Number of billing cycles (months) the referred friend's discount applies. */
export const FRIEND_DISCOUNT_MONTHS = 3;

/** Minimum accrued balance (USD) required before a payout is issued. */
export const MIN_PAYOUT_USD = 50;

/** Day of the month payouts are processed. */
export const PAYOUT_DAY_OF_MONTH = 15;

/** Attribution cookie window: a click is credited if signup happens within this many days. */
export const ATTRIBUTION_WINDOW_DAYS = 30;

/** Override commission earned on a sub-affiliate's referrals (tier_2+). */
export const SUB_AFFILIATE_RATE_PCT = 5;

/** Supported payout methods, in display order. PayPal is the default/primary. */
export const PAYOUT_METHODS = ['PayPal', 'Bank transfer'] as const;

/**
 * Aggregate object for convenient single-import consumption.
 * Prefer the named constants above where you only need one value.
 */
export const AFFILIATE_TERMS = {
  commissionRatePct: COMMISSION_RATE_PCT,
  commissionDurationMonths: COMMISSION_DURATION_MONTHS,
  friendDiscountPct: FRIEND_DISCOUNT_PCT,
  friendDiscountMonths: FRIEND_DISCOUNT_MONTHS,
  minPayoutUsd: MIN_PAYOUT_USD,
  payoutDayOfMonth: PAYOUT_DAY_OF_MONTH,
  attributionWindowDays: ATTRIBUTION_WINDOW_DAYS,
  subAffiliateRatePct: SUB_AFFILIATE_RATE_PCT,
  payoutMethods: PAYOUT_METHODS,
} as const;

export type AffiliateTerms = typeof AFFILIATE_TERMS;
