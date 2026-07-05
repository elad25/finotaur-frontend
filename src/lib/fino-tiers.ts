// src/lib/fino-tiers.ts
// =====================================================
// FINO AI — tiered capability config (2026-07 pricing restructure)
// =====================================================
// FINO is open to EVERY tier — the experience scales with the plan:
//   FREE      → market Q&A taste (server cap 3/day), general questions
//   INVESTOR  → research analyst: TOP SECRET report RAG + research context
//   FINOTAUR  → full trade desk: premium-data context, actions, unlimited
//   ULTIMATE  → everything + portfolio awareness (Copilot)
//
// The frontend shapes the experience (prompts, teasers, upgrade targets);
// quotas and model/tool selection are enforced server-side (finotaur-server,
// /api/ai/usage + chat endpoint) — this config must stay in sync with it.
// =====================================================

import {
  Sun, TrendingUp, BarChart3, Bitcoin, Shield, Building2, LineChart,
  Newspaper, HelpCircle, Compass, FileText, Layers, Radar, Activity, Briefcase,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PlatformPlan } from '@/hooks/usePlatformAccess';

export type FinoTierKey = 'free' | 'investor' | 'finotaur' | 'ultimate';

export interface FinoPromptChip {
  icon: LucideIcon;
  question: string;
}

export interface FinoLockedCapability {
  icon: LucideIcon;
  label: string;
  /** Which tier unlocks it — shown as the pill tag */
  unlockedAt: 'Investor' | 'FINOTAUR' | 'Ultimate';
}

export interface FinoTierConfig {
  key: FinoTierKey;
  /** Short pill shown next to the FINO AI title */
  badge: string;
  /** One-line persona under the title — what FINO is at this tier */
  tagline: string;
  /** Empty-state suggestion chips, tuned to what this tier can actually do */
  promptRows: FinoPromptChip[][];
  /** Capabilities the NEXT tiers add — rendered as locked teaser pills */
  locked: FinoLockedCapability[];
  /** Where the upgrade CTA points and how it reads (null = top tier, no CTA) */
  upgrade: { label: string; sublabel: string } | null;
}

export function resolveFinoTier(plan: PlatformPlan): FinoTierKey {
  if (plan === 'platform_enterprise') return 'ultimate';
  if (plan === 'platform_finotaur') return 'finotaur';
  if (plan === 'platform_investor') return 'investor';
  return 'free';
}

// ---------------------------------------------------------------------------
// Home-page "Ask Fino" chips — tier-aware, plus journal-aware.
// The journal is orthogonal to the platform tier (a Trader subscriber can be
// platform-free), so chips compose from two dimensions:
//   * platform tier   → market / research / flow questions
//   * active journal  → personal coaching questions on the user's own trades
// ---------------------------------------------------------------------------

export interface FinoHomeChip {
  label: string;
  /** undefined → open the drawer with no preset query */
  query?: string;
}

const JOURNAL_HOME_CHIPS: FinoHomeChip[] = [
  { label: 'Show my best setups', query: 'Show my best setups' },
  { label: "Review yesterday's trades", query: "Review yesterday's trades" },
  { label: 'What mistakes am I repeating?', query: 'What mistakes am I repeating?' },
];

const HOME_CHIPS_BY_TIER: Record<FinoTierKey, FinoHomeChip[]> = {
  free: [
    { label: 'What moved the market today?', query: 'What moved the market today?' },
    { label: 'What events are coming this week?', query: 'What are the key economic events this week?' },
    { label: 'How do I get the most out of FINOTAUR?', query: 'How do I get the most out of FINOTAUR?' },
  ],
  investor: [
    { label: "Summarize today's report", query: "Summarize today's TOP SECRET report" },
    { label: 'Latest trade ideas', query: 'What are the latest trade ideas from the reports?' },
    { label: 'Which sectors look strong?', query: 'Which sectors should I favor this week?' },
  ],
  finotaur: [
    { label: "Today's Top 5 picks", query: "What are today's Top 5 AI Scanner picks?" },
    { label: 'Any unusual flow today?', query: 'Any unusual options flow worth watching today?' },
    { label: "Summarize today's report", query: "Summarize today's TOP SECRET report" },
    { label: 'Build my game plan', query: 'Build my game plan' },
  ],
  ultimate: [
    { label: 'How is my portfolio positioned?', query: 'How is my portfolio positioned for this week?' },
    { label: "Today's Top 5 picks", query: "What are today's Top 5 AI Scanner picks?" },
    { label: 'Any unusual flow today?', query: 'Any unusual options flow worth watching today?' },
    { label: 'Build my game plan', query: 'Build my game plan' },
  ],
};

/**
 * Chips for the home-page Ask Fino input. Journal coaching chips lead when the
 * user actually has a journal to coach on; tier chips follow; "Ask Fino
 * anything" always closes the row.
 */
export function getFinoHomeChips(tier: FinoTierKey, hasActiveJournal: boolean): FinoHomeChip[] {
  const tierChips = HOME_CHIPS_BY_TIER[tier];
  const chips = hasActiveJournal
    ? [...JOURNAL_HOME_CHIPS, ...tierChips]
    : [...tierChips];
  return [...chips.slice(0, 4), { label: 'Ask Fino anything' }];
}

const FREE_PROMPTS: FinoPromptChip[][] = [
  [
    { icon: HelpCircle, question: 'What moved the market today?' },
    { icon: TrendingUp, question: 'Explain what unusual options activity means' },
    { icon: Newspaper, question: 'What are the key economic events this week?' },
    { icon: Compass, question: 'How do I get the most out of FINOTAUR?' },
  ],
  [
    { icon: LineChart, question: 'What is the macro outlook?' },
    { icon: Bitcoin, question: 'What is the current crypto regime?' },
    { icon: Shield, question: 'What risks should I watch right now?' },
  ],
];

const INVESTOR_PROMPTS: FinoPromptChip[][] = [
  [
    { icon: Sun, question: "Give me today's morning briefing" },
    { icon: FileText, question: "Summarize today's TOP SECRET report" },
    { icon: TrendingUp, question: 'What are the latest trade ideas from the reports?' },
    { icon: BarChart3, question: 'Which sectors should I favor this week?' },
  ],
  [
    { icon: Building2, question: 'Summarize the latest company deep-dive' },
    { icon: LineChart, question: 'What is the macro outlook?' },
    { icon: Bitcoin, question: 'What did the latest crypto report say?' },
    { icon: Shield, question: 'What are the main risks in recent reports?' },
  ],
];

const FINOTAUR_PROMPTS: FinoPromptChip[][] = [
  [
    { icon: Sun, question: "Give me today's morning briefing" },
    { icon: Radar, question: "What are today's Top 5 AI Scanner picks?" },
    { icon: Activity, question: 'Any unusual options flow worth watching today?' },
    { icon: TrendingUp, question: 'What are the latest trade ideas?' },
  ],
  [
    { icon: FileText, question: "Summarize today's TOP SECRET report" },
    { icon: BarChart3, question: 'Which sectors should I favor this week?' },
    { icon: Shield, question: 'What could invalidate this setup?' },
    { icon: LineChart, question: 'Where is momentum improving?' },
  ],
];

const ULTIMATE_PROMPTS: FinoPromptChip[][] = [
  [
    { icon: Briefcase, question: 'How is my portfolio positioned for this week?' },
    { icon: Radar, question: "What are today's Top 5 AI Scanner picks?" },
    { icon: Activity, question: 'Any unusual options flow worth watching today?' },
    { icon: Shield, question: 'What risks do you see in my holdings?' },
  ],
  [
    { icon: Sun, question: "Give me today's morning briefing" },
    { icon: FileText, question: "Summarize today's TOP SECRET report" },
    { icon: BarChart3, question: 'Which sectors should I favor this week?' },
    { icon: LineChart, question: 'What is the macro outlook?' },
  ],
];

export const FINO_TIERS: Record<FinoTierKey, FinoTierConfig> = {
  free: {
    key: 'free',
    badge: 'FREE',
    tagline: 'Your market Q&A assistant',
    promptRows: FREE_PROMPTS,
    locked: [
      { icon: FileText, label: 'TOP SECRET report answers', unlockedAt: 'Investor' },
      { icon: Layers, label: 'Research-aware analysis', unlockedAt: 'Investor' },
      { icon: Activity, label: 'Options flow & Dark Pool context', unlockedAt: 'FINOTAUR' },
      { icon: Radar, label: 'AI Scanner picks', unlockedAt: 'FINOTAUR' },
    ],
    upgrade: {
      label: 'Upgrade to Investor',
      sublabel: 'More questions + report intelligence — $49/mo',
    },
  },
  investor: {
    key: 'investor',
    badge: 'INVESTOR',
    tagline: 'Your research analyst — reports, sectors & macro',
    promptRows: INVESTOR_PROMPTS,
    locked: [
      { icon: Activity, label: 'Options flow & Dark Pool context', unlockedAt: 'FINOTAUR' },
      { icon: Radar, label: 'AI Scanner picks', unlockedAt: 'FINOTAUR' },
      { icon: TrendingUp, label: 'Unlimited questions', unlockedAt: 'FINOTAUR' },
    ],
    upgrade: {
      label: 'Upgrade to FINOTAUR',
      sublabel: 'Unlimited FINO + the full data desk — $89/mo',
    },
  },
  finotaur: {
    key: 'finotaur',
    badge: 'PRO',
    tagline: 'Your full trade desk — flow, scanner & reports',
    promptRows: FINOTAUR_PROMPTS,
    locked: [
      { icon: Briefcase, label: 'Portfolio-aware answers', unlockedAt: 'Ultimate' },
    ],
    upgrade: null,
  },
  ultimate: {
    key: 'ultimate',
    badge: 'ULTIMATE',
    tagline: 'Your AI portfolio manager & trade desk',
    promptRows: ULTIMATE_PROMPTS,
    locked: [],
    upgrade: null,
  },
};
