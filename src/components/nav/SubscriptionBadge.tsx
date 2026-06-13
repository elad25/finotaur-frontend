// src/components/nav/SubscriptionBadge.tsx
// ============================================================
// Subscription-tier badge with legend popover for the TopNav.
// Shows the user's current tier as a compact colored pill; clicking
// opens a popover listing all six tiers with the current one highlighted.
// ============================================================

import { useNavigate } from 'react-router-dom';
import { Gem, Crown, Sparkles, Award, Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';

// ── Types ────────────────────────────────────────────────────

export type TierKey = 'elite' | 'finotaur' | 'pro' | 'premium' | 'basic' | 'free';

interface TierConfig {
  label: string;
  color: string;
  icon: LucideIcon;
  description: string;
  group: 'Platform' | 'Journal' | 'Free';
}

// ── Tier configuration (single source of truth) ──────────────

const TIER_CONFIG: Record<TierKey, TierConfig> = {
  elite: {
    label: 'ELITE',
    color: '#34D399',
    icon: Gem,
    description: 'Top platform tier — full access to everything',
    group: 'Platform',
  },
  finotaur: {
    label: 'FINOTAUR',
    color: '#C9A646',
    icon: Crown,
    description: 'Advanced platform plan with AI scanner & macro',
    group: 'Platform',
  },
  pro: {
    label: 'PRO',
    color: '#A855F7',
    icon: Sparkles,
    description: 'Core platform plan with the essentials',
    group: 'Platform',
  },
  premium: {
    label: 'PREMIUM',
    color: '#D4D4D8',
    icon: Gem,
    description: 'Unlimited Trade Journal access',
    group: 'Journal',
  },
  basic: {
    label: 'BASIC',
    color: '#CD7F32',
    icon: Award,
    description: 'Trade Journal with monthly trade limit',
    group: 'Journal',
  },
  free: {
    label: 'FREE',
    color: '#A1A1AA',
    icon: Circle,
    description: 'No active subscription yet',
    group: 'Free',
  },
};

// Display order in the popover legend
const TIER_DISPLAY_ORDER: TierKey[] = [
  'elite',
  'finotaur',
  'pro',
  'premium',
  'basic',
  'free',
];

// ── Tier resolver ─────────────────────────────────────────────

export function resolveTier(
  platformPlan: string | null,
  accountType: string | null,
): TierKey {
  // Normalize: strip leading 'platform_' prefix
  const normalized = platformPlan?.replace(/^platform_/, '') ?? null;

  // Platform takes priority
  if (normalized === 'enterprise') return 'elite';
  if (normalized === 'finotaur') return 'finotaur';
  if (normalized === 'core') return 'pro';

  // Journal tier
  if (accountType === 'premium') return 'premium';
  if (accountType === 'basic') return 'basic';

  return 'free';
}

// ── Props ─────────────────────────────────────────────────────

export interface SubscriptionBadgeProps {
  platformPlan: string | null;
  accountType: string | null;
}

// ── Component ─────────────────────────────────────────────────

export function SubscriptionBadge({
  platformPlan,
  accountType,
}: SubscriptionBadgeProps) {
  const navigate = useNavigate();
  const currentTier = resolveTier(platformPlan, accountType);
  const { label, color, icon: Icon } = TIER_CONFIG[currentTier];

  return (
    <Popover>
      {/* ── Trigger: compact colored pill ── */}
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Membership: ${label}. Click to see all tiers`}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-opacity hover:opacity-80 cursor-pointer"
          style={{
            color,
            borderColor: `${color}66`,
            backgroundColor: `${color}1A`,
          }}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      </PopoverTrigger>

      {/* ── Popover: tier legend ── */}
      <PopoverContent
        align="end"
        className="w-72 p-0 z-[200] border text-white"
        style={{
          backgroundColor: '#0F0F0F',
          borderColor: 'rgba(201,166,70,0.2)',
        }}
      >
        {/* Header */}
        <div
          className="p-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <p className="text-sm font-semibold text-white">
            FINOTAUR Membership Tiers
          </p>
        </div>

        {/* Tier rows */}
        <ul>
          {TIER_DISPLAY_ORDER.map((key) => {
            const cfg = TIER_CONFIG[key];
            const TierIcon = cfg.icon;
            const isCurrent = key === currentTier;

            return (
              <li
                key={key}
                className={`flex items-center gap-2.5 px-3 py-2${isCurrent ? ' bg-white/5' : ''}`}
              >
                {/* Icon */}
                <TierIcon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: cfg.color }}
                />

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold leading-none"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    {cfg.description}
                  </p>
                </div>

                {/* "Current" pill */}
                {isCurrent && (
                  <span
                    className="flex-shrink-0 rounded px-1.5 text-[10px] font-medium"
                    style={{
                      color: cfg.color,
                      backgroundColor: `${cfg.color}1A`,
                    }}
                  >
                    Current
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div
          className="border-t"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <button
            type="button"
            onClick={() => navigate('/app/plans')}
            className="w-full p-3 text-xs font-medium text-center cursor-pointer transition-colors hover:bg-white/5"
            style={{ color: '#C9A646' }}
          >
            View all plans
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default SubscriptionBadge;
