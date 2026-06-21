// src/features/settings/settings-shared.tsx
// =====================================================
// Shared types, context, constants, and helpers for the
// settings feature. Extracted from SettingsLayout.tsx.
// =====================================================

import { createContext, useContext } from "react";
import type React from "react";

// ============================================
// TYPES - Matches actual DB schema
// ============================================

// Newsletter preferences JSONB structure
export interface NewsletterPreferences {
  market_alerts?: boolean;
  daily_newsletter?: boolean;
  trade_alerts?: boolean;
  product_updates?: boolean;
  digest_frequency?: string;
  update_center_email?: boolean; // Push notifications for Update Center via email
}

// Profile data matching actual DB columns
export interface ProfileData {
  // Basic info
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  preferred_timezone: string | null;

  // Platform subscription (main website)
  platform_plan: string | null;
  platform_subscription_status: string | null;
  platform_billing_interval: string | null;
  platform_subscription_started_at: string | null;
  platform_subscription_expires_at: string | null;
  platform_is_in_trial: boolean;
  platform_trial_ends_at: string | null;
  platform_cancelled_at: string | null;
  platform_cancel_at_period_end: boolean;

  // Trading Journal subscription (account_type)
  account_type: string | null;
  subscription_status: string | null;
  subscription_interval: string | null;
  subscription_expires_at: string | null;
  is_in_trial: boolean;
  trial_ends_at: string | null;

  // Newsletter subscription (War Zone)
  newsletter_enabled: boolean;
  newsletter_status: string | null;
  newsletter_paid: boolean;
  newsletter_paid_at: string | null;
  newsletter_whop_membership_id: string | null;
  newsletter_started_at: string | null;
  newsletter_expires_at: string | null;
  newsletter_trial_ends_at: string | null;
  newsletter_cancel_at_period_end: boolean;
  newsletter_unsubscribed_at: string | null;
  newsletter_interval: string | null;
  newsletter_preferences: NewsletterPreferences | null;

  // 🔥 Top Secret subscription - v5 FIXED: matches actual DB columns
  top_secret_enabled: boolean;
  top_secret_status: string | null;
  top_secret_whop_membership_id: string | null;
  top_secret_started_at: string | null;
  top_secret_expires_at: string | null;
  top_secret_interval: string | null;
  top_secret_cancel_at_period_end: boolean;
  top_secret_unsubscribed_at: string | null;
  top_secret_is_in_trial: boolean;
  top_secret_trial_ends_at: string | null;
  top_secret_trial_used: boolean;

  // UI preferences (stored in metadata JSONB)
  metadata: {
    compact_mode?: boolean;
    [key: string]: unknown;
  } | null;

  // Risk settings
  portfolio_size: number | null;
  risk_per_trade: number | null;
  risk_mode: string | null;

  // Account info
  role: string | null;
  is_lifetime: boolean;

  // Trade limits
  trade_count: number;
  max_trades: number;
  current_month_trades_count: number;
}

export interface SettingsContextType {
  profile: ProfileData | null;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData | null>>;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  refreshProfile: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

export const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};

// ============================================
// CONSTANTS
// ============================================

export const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Jerusalem", label: "Israel (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

// ============================================
// PROFILE SELECT — exact column list for fetchProfile
// ============================================

export const PROFILE_SELECT = `
          display_name,
          first_name,
          last_name,
          email,
          avatar_url,
          preferred_timezone,
          platform_plan,
          platform_subscription_status,
          platform_billing_interval,
          platform_subscription_started_at,
          platform_subscription_expires_at,
          platform_is_in_trial,
          platform_trial_ends_at,
          platform_cancelled_at,
          platform_cancel_at_period_end,
          account_type,
          subscription_status,
          subscription_interval,
          subscription_expires_at,
          is_in_trial,
          trial_ends_at,
          newsletter_enabled,
          newsletter_preferences,
          newsletter_status,
          newsletter_paid,
          newsletter_paid_at,
          newsletter_whop_membership_id,
          newsletter_started_at,
          newsletter_expires_at,
          newsletter_trial_ends_at,
          newsletter_cancel_at_period_end,
          newsletter_unsubscribed_at,
          newsletter_interval,
          top_secret_enabled,
          top_secret_status,
          top_secret_whop_membership_id,
          top_secret_started_at,
          top_secret_expires_at,
          top_secret_interval,
          top_secret_cancel_at_period_end,
          top_secret_unsubscribed_at,
          top_secret_is_in_trial,
          top_secret_trial_ends_at,
          top_secret_trial_used,
          top_secret_paid,
          metadata,
          portfolio_size,
          risk_per_trade,
          risk_mode,
          role,
          is_lifetime,
          trade_count,
          max_trades,
          current_month_trades_count
        `;

// ============================================
// HELPERS
// ============================================

export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// Compute the next upcoming billing date by advancing the anchor date by the
// billing interval until it lands in the future. Returns null if no anchor.
export function computeNextBilling(anchorISO: string | null | undefined, interval: string | null | undefined): string | null {
  if (!anchorISO) return null;
  const anchor = new Date(anchorISO);
  if (isNaN(anchor.getTime())) return null;
  const now = new Date();
  const next = new Date(anchor.getTime());
  const stepMonths = interval === 'yearly' ? 12 : 1;
  // Advance until strictly in the future (cap iterations to avoid infinite loop)
  let guard = 0;
  while (next.getTime() <= now.getTime() && guard < 600) {
    next.setMonth(next.getMonth() + stepMonths);
    guard++;
  }
  return next.toISOString();
}

export function getPlanInfo(plan: string | null, type: 'platform' | 'journal' = 'platform') {
  if (type === 'journal') {
    const plans: Record<string, { name: string; price: string; color: string }> = {
      free: { name: 'Free', price: '$0', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
      basic: { name: 'Basic', price: '$24.99/mo', color: 'bg-[#A85B1E]/20 text-[#CD7F32] border-[#CD7F32]/30' },
      premium: { name: 'Premium', price: '$39.99/mo', color: 'bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/30' },
    };
    return plans[plan || 'free'] || plans.free;
  }

  // Normalize: strip "platform_" prefix if present (DB stores "platform_core", UI uses "core")
  const normalizedPlan = (plan || 'free').replace('platform_', '');

  const plans: Record<string, { name: string; price: string; color: string }> = {
    free: { name: 'Free', price: '$0', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
    core: { name: 'Core', price: '$59/mo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    finotaur: { name: 'Finotaur', price: '$109/mo', color: 'bg-gradient-to-r from-[#C9A646]/20 to-amber-500/20 text-[#C9A646] border-[#C9A646]/40' },
    enterprise: { name: 'Enterprise', price: '$500/mo', color: 'bg-gradient-to-r from-[#C9A646]/20 to-amber-500/20 text-[#C9A646] border-[#C9A646]/40' },
  };
  return plans[normalizedPlan] || plans.free;
}

export function getTimezoneLabel(value: string | null): string {
  const tz = timezones.find(t => t.value === value);
  return tz?.label || value || 'Not set';
}
