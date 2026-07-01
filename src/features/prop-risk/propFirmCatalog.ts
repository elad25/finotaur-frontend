/**
 * Prop-firm evaluation / funded-account rules catalog (2026).
 *
 * Tradovate does NOT expose a prop firm's drawdown / target rules — they live in the
 * firm's own risk system. This catalog is the source of truth for those rules; live
 * balance/equity comes from the account (agent snapshots + Tradovate cashBalance sync)
 * and is combined with these rules in `computePropStatus.ts`.
 *
 * ⚠️ Prop firms run frequent promos and rule tweaks. Numbers flagged `verify: true`
 * were not confirmed on a primary help-center at authoring time. Review against the
 * firm's live checkout before relying on them. Catalog is intentionally easy to extend.
 */

export type DrawdownType = 'intraday_trailing' | 'eod_trailing' | 'static';

/**
 * How the trailing drawdown floor stops rising:
 *  - 'none'       → floor keeps trailing the equity high-water-mark indefinitely
 *                   (e.g. Apex evaluation running on Tradovate never locks).
 *  - 'start'      → floor locks once it reaches the starting balance.
 *  - 'start_plus' → floor locks at (starting balance + lockValue), e.g. Apex PA / Tradeify +$100.
 */
export type LockType = 'none' | 'start' | 'start_plus';

export interface PropPlan {
  key: string;
  label: string;
  accountSize: number;
  profitTarget: number;
  trailingAmount: number;
  drawdownType: DrawdownType;
  dailyLossLimit: number | null; // null = firm has no daily loss limit on this plan
  lockType: LockType;
  lockValue: number; // offset for 'start_plus' (e.g. 100); 0 otherwise
  consistencyPct?: number | null;
  minTradingDays?: number | null;
  verify?: boolean;
}

export interface PropFirm {
  key: string;
  label: string;
  /** Keys returned by detectFirmGroup() that map to this firm, for auto-detection. */
  detectKeys: string[];
  tradovate: boolean;
  /** Set when the whole firm's numbers should be treated cautiously. */
  note?: string;
  plans: PropPlan[];
}

const p = (
  key: string,
  label: string,
  accountSize: number,
  profitTarget: number,
  trailingAmount: number,
  drawdownType: DrawdownType,
  dailyLossLimit: number | null,
  lockType: LockType,
  lockValue = 0,
  extra: Partial<PropPlan> = {},
): PropPlan => ({
  key,
  label,
  accountSize,
  profitTarget,
  trailingAmount,
  drawdownType,
  dailyLossLimit,
  lockType,
  lockValue,
  ...extra,
});

export const PROP_FIRM_CATALOG: PropFirm[] = [
  // ── Apex Trader Funding ───────────────────────────────────────────────────
  // Apex 4.0. On Tradovate, evaluation intraday DD trails indefinitely (no lock).
  // EOD variant recalcs the threshold once/day at close. Daily loss = EOD accounts only.
  {
    key: 'apex',
    label: 'Apex Trader Funding',
    detectKeys: ['pf_apex'],
    tradovate: true,
    note: 'Apex 4.0. On Tradovate the eval trailing DD does not lock. Consistency 50% applies to payouts, not passing.',
    plans: [
      p('apex_25k_eod', '25K (EOD)', 25000, 1500, 1500, 'eod_trailing', 500, 'none', 0, { consistencyPct: 50, minTradingDays: 0 }),
      p('apex_50k_eod', '50K (EOD)', 50000, 3000, 2500, 'eod_trailing', 1000, 'none', 0, { consistencyPct: 50, minTradingDays: 0 }),
      p('apex_75k_eod', '75K (EOD)', 75000, 4500, 2750, 'eod_trailing', null, 'none', 0, { consistencyPct: 50, minTradingDays: 0, verify: true }),
      p('apex_100k_eod', '100K (EOD)', 100000, 6000, 3000, 'eod_trailing', 1500, 'none', 0, { consistencyPct: 50, minTradingDays: 0 }),
      p('apex_150k_eod', '150K (EOD)', 150000, 9000, 5000, 'eod_trailing', 2000, 'none', 0, { consistencyPct: 50, minTradingDays: 0 }),
      p('apex_250k_eod', '250K (EOD)', 250000, 15000, 6500, 'eod_trailing', null, 'none', 0, { consistencyPct: 50, minTradingDays: 0, verify: true }),
      p('apex_300k_eod', '300K (EOD)', 300000, 20000, 7500, 'eod_trailing', null, 'none', 0, { consistencyPct: 50, minTradingDays: 0, verify: true }),
      p('apex_50k_intra', '50K (Intraday)', 50000, 3000, 2500, 'intraday_trailing', null, 'none', 0, { consistencyPct: 50, minTradingDays: 0 }),
      p('apex_100k_intra', '100K (Intraday)', 100000, 6000, 3000, 'intraday_trailing', null, 'none', 0, { consistencyPct: 50, minTradingDays: 0 }),
      p('apex_100k_static', '100K (Static)', 100000, 2000, 625, 'static', null, 'none', 0, { minTradingDays: 0 }),
    ],
  },

  // ── Topstep ───────────────────────────────────────────────────────────────
  {
    key: 'topstep',
    label: 'Topstep',
    detectKeys: ['pf_topstep'],
    tradovate: true,
    plans: [
      p('topstep_50k', '50K', 50000, 3000, 2000, 'eod_trailing', 1000, 'start', 0, { consistencyPct: 50, minTradingDays: 2 }),
      p('topstep_100k', '100K', 100000, 6000, 3000, 'eod_trailing', 2000, 'start', 0, { consistencyPct: 50, minTradingDays: 2 }),
      p('topstep_150k', '150K', 150000, 9000, 4500, 'eod_trailing', 3000, 'start', 0, { consistencyPct: 50, minTradingDays: 2 }),
    ],
  },

  // ── Take Profit Trader ────────────────────────────────────────────────────
  // Test = EOD-trailing, locks at starting balance. No daily loss.
  {
    key: 'tpt',
    label: 'Take Profit Trader',
    detectKeys: [],
    tradovate: true,
    plans: [
      p('tpt_25k', '25K', 25000, 1500, 1500, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, minTradingDays: 5 }),
      p('tpt_50k', '50K', 50000, 3000, 2000, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, minTradingDays: 5 }),
      p('tpt_75k', '75K', 75000, 4500, 2500, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, minTradingDays: 5 }),
      p('tpt_100k', '100K', 100000, 6000, 3500, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, minTradingDays: 5 }),
      p('tpt_150k', '150K', 150000, 9000, 4500, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, minTradingDays: 5 }),
    ],
  },

  // ── MyFundedFutures ───────────────────────────────────────────────────────
  // Core (EOD) / Rapid (intraday) / Pro (EOD). No daily loss on any plan.
  {
    key: 'mffu',
    label: 'MyFundedFutures',
    detectKeys: ['pf_mffu'],
    tradovate: true,
    note: 'Rapid = intraday trailing; Pro/Core = EOD trailing. Per-size DD flagged verify.',
    plans: [
      p('mffu_core_50k', 'Core 50K', 50000, 3000, 2000, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, verify: true }),
      p('mffu_rapid_50k', 'Rapid 50K', 50000, 3000, 2000, 'intraday_trailing', null, 'none', 0, {}),
      p('mffu_rapid_100k', 'Rapid 100K', 100000, 6000, 4000, 'intraday_trailing', null, 'none', 0, { verify: true }),
      p('mffu_rapid_150k', 'Rapid 150K', 150000, 9000, 6000, 'intraday_trailing', null, 'none', 0, { verify: true }),
      p('mffu_pro_50k', 'Pro 50K', 50000, 3000, 2000, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, verify: true }),
      p('mffu_pro_100k', 'Pro 100K', 100000, 6000, 3000, 'eod_trailing', null, 'start', 0, { consistencyPct: 50 }),
      p('mffu_pro_150k', 'Pro 150K', 150000, 9000, 4500, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, verify: true }),
    ],
  },

  // ── Tradeify ──────────────────────────────────────────────────────────────
  // All families EOD-trailing, floor = start + $100.
  {
    key: 'tradeify',
    label: 'Tradeify',
    detectKeys: [],
    tradovate: true,
    plans: [
      p('tradeify_growth_25k', 'Growth 25K', 25000, 1500, 1000, 'eod_trailing', 600, 'start_plus', 100, { minTradingDays: 1 }),
      p('tradeify_growth_50k', 'Growth 50K', 50000, 3000, 2000, 'eod_trailing', 1250, 'start_plus', 100, { minTradingDays: 1 }),
      p('tradeify_growth_100k', 'Growth 100K', 100000, 6000, 3500, 'eod_trailing', 2500, 'start_plus', 100, { minTradingDays: 1 }),
      p('tradeify_growth_150k', 'Growth 150K', 150000, 9000, 5000, 'eod_trailing', 3750, 'start_plus', 100, { minTradingDays: 1 }),
      p('tradeify_select_25k', 'Select 25K', 25000, 1500, 1000, 'eod_trailing', null, 'start_plus', 100, { consistencyPct: 40, minTradingDays: 3 }),
      p('tradeify_select_50k', 'Select 50K', 50000, 3000, 2000, 'eod_trailing', null, 'start_plus', 100, { consistencyPct: 40, minTradingDays: 3 }),
      p('tradeify_select_100k', 'Select 100K', 100000, 6000, 3000, 'eod_trailing', null, 'start_plus', 100, { consistencyPct: 40, minTradingDays: 3 }),
      p('tradeify_select_150k', 'Select 150K', 150000, 9000, 4500, 'eod_trailing', null, 'start_plus', 100, { consistencyPct: 40, minTradingDays: 3 }),
    ],
  },

  // ── TradeDay ──────────────────────────────────────────────────────────────
  {
    key: 'tradeday',
    label: 'TradeDay',
    detectKeys: ['pf_tradeday'],
    tradovate: true,
    plans: [
      p('tradeday_50k', '50K', 50000, 3000, 2000, 'intraday_trailing', null, 'start', 0, { consistencyPct: 30, minTradingDays: 5, verify: true }),
      p('tradeday_100k', '100K', 100000, 6000, 3000, 'intraday_trailing', null, 'start', 0, { consistencyPct: 30, minTradingDays: 5, verify: true }),
      p('tradeday_150k', '150K', 150000, 9000, 4500, 'intraday_trailing', null, 'start', 0, { consistencyPct: 30, minTradingDays: 5, verify: true }),
    ],
  },

  // ── Alpha Futures ─────────────────────────────────────────────────────────
  // EOD-trailing on all accounts, MLL locks at starting balance.
  {
    key: 'alpha',
    label: 'Alpha Futures',
    detectKeys: [],
    tradovate: true,
    plans: [
      p('alpha_zero_25k', 'Zero 25K', 25000, 1500, 1000, 'eod_trailing', 500, 'start', 0, { minTradingDays: 1 }),
      p('alpha_zero_50k', 'Zero 50K', 50000, 3000, 2000, 'eod_trailing', 1000, 'start', 0, { minTradingDays: 1 }),
      p('alpha_zero_100k', 'Zero 100K', 100000, 6000, 3000, 'eod_trailing', 2000, 'start', 0, { minTradingDays: 1 }),
      p('alpha_std_50k', 'Standard 50K', 50000, 4000, 1750, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, minTradingDays: 2 }),
      p('alpha_std_100k', 'Standard 100K', 100000, 8000, 3500, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, minTradingDays: 2 }),
      p('alpha_std_150k', 'Standard 150K', 150000, 12000, 5250, 'eod_trailing', null, 'start', 0, { consistencyPct: 50, minTradingDays: 2 }),
    ],
  },

  // ── Elite Trader Funding ──────────────────────────────────────────────────
  {
    key: 'etf',
    label: 'Elite Trader Funding',
    detectKeys: [],
    tradovate: true,
    note: 'Promo-volatile; verify exact family at checkout.',
    plans: [
      p('etf_1step_50k', '1-Step 50K', 50000, 3000, 2000, 'intraday_trailing', null, 'start', 0, { minTradingDays: 5 }),
      p('etf_1step_100k', '1-Step 100K', 100000, 6000, 3000, 'intraday_trailing', null, 'start', 0, { minTradingDays: 5 }),
      p('etf_1step_150k', '1-Step 150K', 150000, 9000, 5000, 'intraday_trailing', null, 'start', 0, { minTradingDays: 5 }),
      p('etf_1step_250k', '1-Step 250K', 250000, 15000, 6500, 'intraday_trailing', null, 'start', 0, { minTradingDays: 5, verify: true }),
      p('etf_static_25k', 'Static 25K', 25000, 2000, 1000, 'static', null, 'none', 0, {}),
      p('etf_static_50k', 'Static 50K', 50000, 4000, 2000, 'static', null, 'none', 0, {}),
      p('etf_eod_50k', 'EOD 50K', 50000, 3000, 2000, 'eod_trailing', 1100, 'start', 0, {}),
      p('etf_eod_100k', 'EOD 100K', 100000, 6000, 3500, 'eod_trailing', 2200, 'start', 0, {}),
      p('etf_eod_150k', 'EOD 150K', 150000, 9000, 4500, 'eod_trailing', 3300, 'start', 0, {}),
    ],
  },

  // ── Earn2Trade ────────────────────────────────────────────────────────────
  {
    key: 'earn2trade',
    label: 'Earn2Trade',
    detectKeys: ['pf_e2t'],
    tradovate: true,
    plans: [
      p('e2t_tcp_25k', 'TCP 25K', 25000, 1750, 1500, 'eod_trailing', 550, 'start', 0, { consistencyPct: 30, minTradingDays: 10 }),
      p('e2t_tcp_50k', 'TCP 50K', 50000, 3000, 2000, 'eod_trailing', 1100, 'start', 0, { consistencyPct: 30, minTradingDays: 10 }),
      p('e2t_tcp_100k', 'TCP 100K', 100000, 6000, 3500, 'eod_trailing', 2200, 'start', 0, { consistencyPct: 30, minTradingDays: 10 }),
      p('e2t_gm_50k', 'Gauntlet Mini 50K', 50000, 3000, 2000, 'eod_trailing', 1100, 'start', 0, { consistencyPct: 30, minTradingDays: 10 }),
      p('e2t_gm_100k', 'Gauntlet Mini 100K', 100000, 6000, 3500, 'eod_trailing', 2200, 'start', 0, { consistencyPct: 30, minTradingDays: 10 }),
      p('e2t_gm_150k', 'Gauntlet Mini 150K', 150000, 9000, 4500, 'eod_trailing', 3300, 'start', 0, { consistencyPct: 30, minTradingDays: 10 }),
    ],
  },

  // ── Uprofit ───────────────────────────────────────────────────────────────
  {
    key: 'uprofit',
    label: 'Uprofit',
    detectKeys: ['pf_uprofit'],
    tradovate: true,
    plans: [
      p('uprofit_50k', '50K', 50000, 3000, 2000, 'eod_trailing', 1100, 'start', 0, { consistencyPct: 30, minTradingDays: 5 }),
      p('uprofit_100k', '100K', 100000, 6000, 3000, 'eod_trailing', 2200, 'start', 0, { consistencyPct: 30, minTradingDays: 5, verify: true }),
      p('uprofit_150k', '150K', 150000, 9000, 4500, 'eod_trailing', 3000, 'start', 0, { consistencyPct: 30, minTradingDays: 5 }),
    ],
  },

  // ── Legends Trading ───────────────────────────────────────────────────────
  {
    key: 'legends',
    label: 'Legends Trading',
    detectKeys: [],
    tradovate: true,
    plans: [
      p('legends_25k', 'Elite 25K', 25000, 1500, 1250, 'eod_trailing', null, 'start_plus', 100, { consistencyPct: 40, minTradingDays: 5 }),
      p('legends_50k', 'Elite 50K', 50000, 3000, 2000, 'eod_trailing', null, 'start_plus', 100, { consistencyPct: 40, minTradingDays: 5, verify: true }),
      p('legends_100k', 'Elite 100K', 100000, 6000, 3000, 'eod_trailing', null, 'start_plus', 100, { consistencyPct: 40, minTradingDays: 5 }),
      p('legends_150k', 'Elite 150K', 150000, 9000, 4500, 'eod_trailing', null, 'start_plus', 100, { consistencyPct: 40, minTradingDays: 5 }),
    ],
  },

  // ── Lucid Trading ─────────────────────────────────────────────────────────
  {
    key: 'lucid',
    label: 'Lucid Trading',
    detectKeys: [],
    tradovate: true,
    plans: [
      p('lucid_pro_25k', 'Pro 25K', 25000, 1500, 1500, 'eod_trailing', 300, 'start', 0, { verify: true }),
      p('lucid_pro_50k', 'Pro 50K', 50000, 3000, 2000, 'eod_trailing', 600, 'start', 0, { verify: true }),
      p('lucid_pro_100k', 'Pro 100K', 100000, 6000, 3000, 'eod_trailing', 1200, 'start', 0, { verify: true }),
      p('lucid_pro_150k', 'Pro 150K', 150000, 9000, 4500, 'eod_trailing', 1800, 'start', 0, { verify: true }),
    ],
  },

  // ── Bulenox (Rithmic-only — not native Tradovate) ─────────────────────────
  {
    key: 'bulenox',
    label: 'Bulenox',
    detectKeys: ['pf_bulenox'],
    tradovate: false,
    note: 'Rithmic-only; not native Tradovate. Included for completeness.',
    plans: [
      p('bulenox_25k', '25K', 25000, 1500, 1500, 'intraday_trailing', 500, 'start_plus', 100, {}),
      p('bulenox_50k', '50K', 50000, 3000, 2500, 'intraday_trailing', 1100, 'start_plus', 100, {}),
      p('bulenox_100k', '100K', 100000, 6000, 3000, 'intraday_trailing', 2200, 'start_plus', 100, {}),
      p('bulenox_150k', '150K', 150000, 9000, 4500, 'intraday_trailing', 3300, 'start_plus', 100, {}),
      p('bulenox_250k', '250K', 250000, 15000, 5500, 'intraday_trailing', 4500, 'start_plus', 100, { verify: true }),
    ],
  },
];

/** Flat lookup: plan key → { firm, plan }. */
export const PLAN_INDEX: Record<string, { firm: PropFirm; plan: PropPlan }> = (() => {
  const idx: Record<string, { firm: PropFirm; plan: PropPlan }> = {};
  for (const firm of PROP_FIRM_CATALOG) {
    for (const plan of firm.plans) idx[plan.key] = { firm, plan };
  }
  return idx;
})();

export function getFirmByKey(firmKey: string): PropFirm | undefined {
  return PROP_FIRM_CATALOG.find((f) => f.key === firmKey);
}

export function getPlanByKey(planKey: string): { firm: PropFirm; plan: PropPlan } | undefined {
  return PLAN_INDEX[planKey];
}

/** Map a detectFirmGroup() key (e.g. 'pf_apex') to a catalog firm, if any. */
export function firmFromDetectKey(detectKey: string): PropFirm | undefined {
  return PROP_FIRM_CATALOG.find((f) => f.detectKeys.includes(detectKey));
}
