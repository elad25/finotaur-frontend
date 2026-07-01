/**
 * Automatic plan resolution — NO user assignment required.
 *
 * For each connected prop account we derive its plan (firm + size + drawdown rules)
 * purely from data we already have:
 *   1. firm   — from the account name (detectFirmGroup, upstream)
 *   2. exact  — if we pulled the broker-enforced trailing drawdown from Tradovate's
 *               auto-liq engine, match it to the catalog plan (precise, no assumption)
 *   3. size   — otherwise infer the account size from the live balance (a fresh/eval
 *               account sits at ~its starting size) and pick the firm's default variant
 *
 * The profit target is then a deterministic catalog lookup for that firm+size — there
 * is no API anywhere that exposes a prop firm's profit target, so this is not a user
 * setting, it's a derived value.
 */

import { getFirmByKey, type PropFirm, type PropPlan } from './propFirmCatalog';

export interface BrokerRisk {
  trailing_amount: number | null;
  daily_loss_limit: number | null;
  parsed_ok: boolean;
}

export interface ResolvedPlan {
  plan: PropPlan;
  firm: PropFirm;
  /** How the plan was determined — drives the "auto-detected" hint in the UI. */
  source: 'broker' | 'balance' | 'default';
  /** Effective trailing drawdown $ (broker-pulled value wins over catalog). */
  trailingAmount: number;
  /** Effective daily loss limit $ (broker-pulled value wins over catalog). */
  dailyLossLimit: number | null;
}

const DD_TYPE_ORDER = ['eod_trailing', 'intraday_trailing', 'static'] as const;

/** Firm's preferred plan at a given account size — default to EOD trailing (2026 norm). */
function preferPlanForSize(firm: PropFirm, size: number): PropPlan | null {
  const atSize = firm.plans.filter((p) => p.accountSize === size);
  if (atSize.length === 0) return null;
  atSize.sort(
    (a, b) => DD_TYPE_ORDER.indexOf(a.drawdownType) - DD_TYPE_ORDER.indexOf(b.drawdownType),
  );
  return atSize[0];
}

function nearestSize(firm: PropFirm, balance: number): number | null {
  const sizes = [...new Set(firm.plans.map((p) => p.accountSize))];
  if (sizes.length === 0) return null;
  return sizes.reduce((best, s) => (Math.abs(s - balance) < Math.abs(best - balance) ? s : best), sizes[0]);
}

export function resolvePlan(
  firmKey: string,
  balance: number | null,
  brokerRisk: BrokerRisk | null,
): ResolvedPlan | null {
  const firm = getFirmByKey(firmKey);
  if (!firm) return null;

  // 1) EXACT — match the broker-enforced trailing drawdown to a catalog plan.
  if (brokerRisk?.parsed_ok && brokerRisk.trailing_amount != null) {
    const ta = brokerRisk.trailing_amount;
    const matches = firm.plans.filter((p) => Math.abs(p.trailingAmount - ta) <= 1);
    let plan: PropPlan | null = matches[0] ?? null;
    if (matches.length > 1 && brokerRisk.daily_loss_limit != null) {
      plan =
        matches.find(
          (p) => p.dailyLossLimit != null && Math.abs(p.dailyLossLimit - brokerRisk.daily_loss_limit!) <= 1,
        ) ?? matches[0];
    }
    if (plan) {
      return {
        plan,
        firm,
        source: 'broker',
        trailingAmount: ta,
        dailyLossLimit: brokerRisk.daily_loss_limit ?? plan.dailyLossLimit,
      };
    }
  }

  // 2) INFER size from live balance → firm's default-variant plan at that size.
  if (balance != null && balance > 0) {
    const size = nearestSize(firm, balance);
    const plan = size != null ? preferPlanForSize(firm, size) : null;
    if (plan) {
      return {
        plan,
        firm,
        source: 'balance',
        trailingAmount: brokerRisk?.trailing_amount ?? plan.trailingAmount,
        dailyLossLimit: brokerRisk?.daily_loss_limit ?? plan.dailyLossLimit,
      };
    }
  }

  // 3) FALLBACK — firm's first plan, so an account still renders something.
  const plan = firm.plans[0] ?? null;
  if (!plan) return null;
  return {
    plan,
    firm,
    source: 'default',
    trailingAmount: plan.trailingAmount,
    dailyLossLimit: plan.dailyLossLimit,
  };
}
