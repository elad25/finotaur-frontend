// =====================================================
// 🎨 FLOW SCANNER — Constants v2
// =====================================================

import type { ComponentType } from 'react';
import {
  Activity, Eye, Users, Zap, PieChart, GitMerge,
} from 'lucide-react';
import type { TabType, FlowType } from './types';

// ─────────────────────────────────────────────────────
// Design Tokens
// ─────────────────────────────────────────────────────

export const COLORS = {
  gold:           '#C9A646',
  goldLight:      '#F4D97B',
  goldDark:       '#B8963F',
  bgDark:         '#0a0a0a',
  bgCard:         '#0d0b08',
  bgCardHover:    '#151210',
  border:         'rgba(201,166,70,0.15)',
  borderHover:    'rgba(201,166,70,0.3)',
  textPrimary:    '#ffffff',
  textSecondary:  '#E8DCC4',
  textMuted:      '#8B8B8B',
  bullish:        '#22C55E',
  bearish:        '#EF4444',
  neutral:        '#8B8B8B',
  warning:        '#F59E0B',
  blue:           '#3B82F6',
  purple:         '#A855F7',
  cyan:           '#06B6D4',
  teal:           '#14B8A6',
  // Tab accent colors
  tabUnusual:     '#F59E0B',   // amber  — volume
  tabDarkPool:    '#6366F1',   // indigo — dark pool
  tabInsider:     '#A855F7',   // purple — insider/institutional
  tabConfluence:  '#EF4444',   // red    — confluence / high alert
  tabSector:      '#14B8A6',   // teal   — sectors
} as const;

// ─────────────────────────────────────────────────────
// Cache TTLs  (optimised for 10k concurrent users)
// ─────────────────────────────────────────────────────

export const CACHE_TTL = {
  FLOW_DATA:              30_000,   // 30s  — live flow
  DARK_POOL_DATA:         30_000,   // 30s
  INSIDER_DATA:          120_000,   // 2min — Form 4 less frequent
  INSTITUTIONAL_DATA:    300_000,   // 5min — 13F data
  SECTOR_DATA:            60_000,   // 60s
  STATS_DATA:             30_000,
  STALE_WHILE_REVALIDATE:  5_000,   // 5s grace
} as const;

// ─────────────────────────────────────────────────────
// Flow Type Config  (label, color, icon per type)
// ─────────────────────────────────────────────────────

export const FLOW_TYPE_CONFIG: Record<FlowType, {
  label: string;
  color: string;
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  category: 'volume' | 'darkpool' | 'insider' | 'institutional' | 'confluence';
}> = {
  unusual_volume:       { label: 'Unusual Volume',      color: '#F59E0B', icon: Activity,  category: 'volume'        },
  block_trade:          { label: 'Block Trade',          color: '#FB923C', icon: Activity,  category: 'volume'        },
  sweep:                { label: 'Sweep Order',          color: '#FBBF24', icon: Zap,       category: 'volume'        },
  dark_pool:            { label: 'Dark Pool',            color: '#6366F1', icon: Eye,       category: 'darkpool'      },
  dark_pool_sweep:      { label: 'Dark Pool Sweep',      color: '#818CF8', icon: Eye,       category: 'darkpool'      },
  insider_buy:          { label: 'Insider Buy',          color: '#22C55E', icon: Users,     category: 'insider'       },
  insider_sell:         { label: 'Insider Sell',         color: '#EF4444', icon: Users,     category: 'insider'       },
  cluster_insider:      { label: 'Cluster Buying',       color: '#A855F7', icon: Users,     category: 'insider'       },
  institutional_new:    { label: 'New Position',         color: '#3B82F6', icon: Activity,  category: 'institutional' },
  institutional_increase:{ label: 'Position Increase',  color: '#60A5FA', icon: Activity,  category: 'institutional' },
  institutional_exit:   { label: 'Institution Exit',     color: '#F87171', icon: Activity,  category: 'institutional' },
  short_squeeze:        { label: 'Short Squeeze Setup',  color: '#F59E0B', icon: Zap,       category: 'volume'        },
  confluence:           { label: 'Confluence Alert',     color: '#EF4444', icon: GitMerge,  category: 'confluence'    },
};

// ─────────────────────────────────────────────────────
// Tab Definitions
// ─────────────────────────────────────────────────────

export const TABS: {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  description: string;
}[] = [
  {
    id: 'unusual-volume',
    label: 'Unusual Volume',
    shortLabel: 'Volume',
    icon: Zap,
    accentColor: COLORS.tabUnusual,
    description: 'Block trades, sweeps & volume spikes',
  },
  {
    id: 'dark-pool',
    label: 'Dark Pool',
    shortLabel: 'Dark Pool',
    icon: Eye,
    accentColor: COLORS.tabDarkPool,
    description: 'Off-exchange institutional prints',
  },
  {
    id: 'insider-institutional',
    label: 'Insider & Institutional',
    shortLabel: 'Insider',
    icon: Users,
    accentColor: COLORS.tabInsider,
    description: 'Form 4 filings + 13F moves',
  },
  {
    id: 'confluence',
    label: 'Confluence',
    shortLabel: 'Confluence',
    icon: GitMerge,
    accentColor: COLORS.tabConfluence,
    description: '3+ signals firing simultaneously',
  },
  {
    id: 'sector-flow',
    label: 'Sectors',
    shortLabel: 'Sectors',
    icon: PieChart,
    accentColor: COLORS.tabSector,
    description: 'Sector-level money flow',
  },
];

// ─────────────────────────────────────────────────────
// Confluence Scoring Weights
// ─────────────────────────────────────────────────────

export const CONFLUENCE_WEIGHTS: Partial<Record<FlowType, number>> = {
  dark_pool:              25,
  dark_pool_sweep:        30,
  unusual_volume:         20,
  sweep:                  20,
  block_trade:            15,
  insider_buy:            30,
  cluster_insider:        40,
  institutional_new:      25,
  institutional_increase: 15,
  short_squeeze:          20,
};

export const CONFLUENCE_THRESHOLD = 3; // min signals to show in confluence tab