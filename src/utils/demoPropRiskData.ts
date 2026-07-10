// src/utils/demoPropRiskData.ts
// =====================================================
// Deterministic sample data for the Prop Risk preview surface
// (free-tier JournalFeatureGate, feature="risk-management").
//
// No Math.random() / Date.now() — every number is a static constant so the
// preview renders identically on every reload/session, matching the
// Journal/Copier demo-data convention (see demoJournalData.ts).
//
// Rows are built through the SAME computePropStatus()/ruleSetFromPlan()
// pipeline the real feature uses, seeded with real catalog plans, so the
// preview's math (drawdown buffer %, target progress, recommendation) is
// exactly what a real account in that situation would show.
// =====================================================

import { getPlanByKey } from '@/features/prop-risk/propFirmCatalog';
import { computePropStatus, ruleSetFromPlan } from '@/features/prop-risk/computePropStatus';
import type { PropRiskRow } from '@/features/prop-risk/usePropRisk';

interface DemoAccountSeed {
  accountName: string;
  planKey: string;
  phase: 'evaluation' | 'funded';
  balance: number;
  openPnl: number;
  hwmEquity: number;
  dayPnl: number;
  online: boolean;
  resolvedSource: 'broker' | 'balance';
}

function buildRow(seed: DemoAccountSeed): PropRiskRow {
  const entry = getPlanByKey(seed.planKey);
  if (!entry) {
    throw new Error(`demoPropRiskData: unknown plan key "${seed.planKey}"`);
  }
  const { firm, plan } = entry;
  const rules = ruleSetFromPlan(plan, seed.phase);
  const computed = computePropStatus(rules, {
    balance: seed.balance,
    openPnl: seed.openPnl,
    dayPnl: seed.dayPnl,
    hwmEquity: seed.hwmEquity,
    dayStartEquity: null,
  });

  return {
    accountName: seed.accountName,
    portfolioId: null,
    env: 'live',
    detectedFirmLabel: firm.label,
    detectedFirmKey: firm.key,
    planLabel: plan.label,
    config: null,
    computed,
    online: seed.online,
    hasLive: true,
    lastSource: 'agent',
    resolvedSource: seed.resolvedSource,
  };
}

const DEMO_SEEDS: DemoAccountSeed[] = [
  // Apex 50K evaluation — 62% of the trailing drawdown buffer used, still on track.
  {
    accountName: 'APEX-50K-EVAL-8821',
    planKey: 'apex_50k_eod',
    phase: 'evaluation',
    balance: 51000,
    openPnl: 200,
    hwmEquity: 52750,
    dayPnl: -150,
    online: true,
    resolvedSource: 'broker',
  },
  // Topstep 100K funded — healthy, only 18% of the trailing drawdown buffer used.
  {
    accountName: 'TOPSTEP-100K-FUNDED-4402',
    planKey: 'topstep_100k',
    phase: 'funded',
    balance: 102000,
    openPnl: 460,
    hwmEquity: 106000,
    dayPnl: 150,
    online: true,
    resolvedSource: 'broker',
  },
  // Apex 100K evaluation — close to breach, 91% of the trailing drawdown buffer used.
  {
    accountName: 'APEX-100K-EVAL-1173',
    planKey: 'apex_100k_eod',
    phase: 'evaluation',
    balance: 98000,
    openPnl: 70,
    hwmEquity: 100800,
    dayPnl: -300,
    online: false,
    resolvedSource: 'balance',
  },
];

let _cache: PropRiskRow[] | null = null;

export function getDemoPropRiskRows(): PropRiskRow[] {
  if (!_cache) {
    _cache = DEMO_SEEDS.map(buildRow);
  }
  return _cache;
}
