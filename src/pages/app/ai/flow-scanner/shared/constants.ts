// =====================================================
// 🎨 FLOW SCANNER - Constants & Design System
// =====================================================

import type { ComponentType } from 'react';
import { Activity, Building, Users, Eye, BarChart3, PieChart, Zap } from 'lucide-react';
import type { TabType } from './types';

export const COLORS = {
  gold: '#C9A646',
  goldLight: '#F4D97B',
  goldDark: '#B8963F',
  bgDark: '#0a0a0a',
  bgCard: '#0d0b08',
  bgCardHover: '#151210',
  border: 'rgba(201,166,70,0.15)',
  borderHover: 'rgba(201,166,70,0.3)',
  textPrimary: '#ffffff',
  textSecondary: '#E8DCC4',
  textMuted: '#8B8B8B',
  bullish: '#22C55E',
  bearish: '#EF4444',
  warning: '#F59E0B',
  blue: '#3B82F6',
  purple: '#A855F7',
} as const;

// =====================================================
// Cache TTLs - optimized for 10k concurrent users
// =====================================================

export const CACHE_TTL = {
  FLOW_DATA: 30_000,      // 30s - live market flow data
  SECTOR_DATA: 60_000,    // 60s - sector flows change slower
  STATS_DATA: 30_000,     // 30s - quick stats
  STALE_WHILE_REVALIDATE: 5_000, // 5s grace period
} as const;

// =====================================================
// Flow Type Configurations
// =====================================================

export const FLOW_TYPE_CONFIG = {
  unusual_volume: { label: 'Unusual Volume', color: '#F59E0B', icon: Activity },
  institutional:  { label: 'Institutional',  color: '#3B82F6', icon: Building },
  insider:        { label: 'Insider',         color: '#A855F7', icon: Users    },
  dark_pool:      { label: 'Dark Pool',       color: '#8B8B8B', icon: Eye      },
  accumulation:   { label: 'Accumulation',    color: '#22C55E', icon: BarChart3},
} as const;

// =====================================================
// Tab Definitions
// =====================================================

export const TABS: { id: TabType; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'all-flow',       label: 'All Flow',      icon: Activity },
  { id: 'unusual-volume', label: 'Unusual',        icon: Zap      },
  { id: 'institutional',  label: 'Institutional',  icon: Building },
  { id: 'insider',        label: 'Insider',        icon: Users    },
  { id: 'dark-pool',      label: 'Dark Pool',      icon: Eye      },
  { id: 'sector-flow',    label: 'Sectors',        icon: PieChart },
];