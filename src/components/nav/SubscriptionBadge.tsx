// src/components/nav/SubscriptionBadge.tsx
// ============================================================
// Subscription-tier badge with legend popover for the TopNav.
// Shows the user's current tier as a glossy gradient pill; clicking
// opens a popover listing all six tiers with the current one highlighted.
// ============================================================

import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem, Crown, Sparkles, Award, Circle, ChevronRight, CircleCheck } from 'lucide-react';
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
  /** Legacy: kept for backward-compat; prefer labelColor for row text */
  color: string;
  icon: LucideIcon;
  description: string;
  group: 'Platform' | 'Journal' | 'Free';
  /** Short uppercase tag shown as a pill next to the tier name */
  tag: string;
  /** Gradient edge color (darkest stop, 0% and 100%) */
  edge: string;
  /** Gradient peak color (lightest stop, 48%) */
  peak: string;
  /** Icon/text color on top of the glossy chip */
  onColor: string;
  /** Label text color used in the legend row */
  labelColor: string;
  /** True = use bg-gradient-gold + shadow-btn-gold classes instead of inline gradient */
  useGoldClass: boolean;
}

// ── Glossy style helper ───────────────────────────────────────
//
// Returns either { className, style } for the gold tier (uses design-system
// Tailwind utilities) or { className: '', style } with a full inline gradient
// for every other tier.

interface GlossyResult {
  className: string;
  style: CSSProperties;
}

function glossyStyle(tier: TierKey): GlossyResult {
  const cfg = TIER_CONFIG[tier];

  if (cfg.useGoldClass) {
    return {
      className: 'bg-gradient-gold shadow-btn-gold',
      style: {},
    };
  }

  const { edge, peak } = cfg;
  return {
    className: '',
    style: {
      background: `linear-gradient(135deg, ${edge} 0%, ${peak} 48%, ${edge} 100%)`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.22), 0 2px 8px ${edge}66`,
    },
  };
}

// ── Tier configuration (single source of truth) ──────────────

const TIER_CONFIG: Record<TierKey, TierConfig> = {
  elite: {
    label: 'ELITE',
    color: '#34D399',
    icon: Gem,
    description: 'Top platform tier — full access to everything',
    group: 'Platform',
    tag: 'TOP TIER',
    edge: '#10B981',
    peak: '#6EE7B7',
    onColor: '#053826',
    labelColor: '#34D399',
    useGoldClass: false,
  },
  finotaur: {
    label: 'FINOTAUR',
    color: '#C9A646',
    icon: Crown,
    description: 'Advanced platform plan with AI scanner & macro',
    group: 'Platform',
    tag: 'ADVANCED',
    edge: '#C9A646',
    peak: '#F4D97B',
    onColor: '#1A1A1A',
    labelColor: '#F4D97B',
    useGoldClass: true,
  },
  pro: {
    label: 'PRO',
    color: '#A855F7',
    icon: Sparkles,
    description: 'Core platform plan with the essentials',
    group: 'Platform',
    tag: 'CORE',
    edge: '#7C3AED',
    peak: '#C4A2FC',
    onColor: '#FFFFFF',
    labelColor: '#C084FC',
    useGoldClass: false,
  },
  premium: {
    label: 'PREMIUM',
    color: '#D4D4D8',
    icon: Gem,
    description: 'Unlimited Trade Journal access',
    group: 'Journal',
    tag: 'UNLIMITED ACCESS',
    edge: '#94A3B8',
    peak: '#F1F5F9',
    onColor: '#1F2937',
    labelColor: '#E2E8F0',
    useGoldClass: false,
  },
  basic: {
    label: 'BASIC',
    color: '#CD7F32',
    icon: Award,
    description: 'Trade Journal with monthly trade limit',
    group: 'Journal',
    tag: 'ESSENTIAL',
    edge: '#A85B1E',
    peak: '#E8A56B',
    onColor: '#2A1607',
    labelColor: '#D98E4F',
    useGoldClass: false,
  },
  free: {
    label: 'FREE',
    color: '#A1A1AA',
    icon: Circle,
    description: 'No active subscription yet',
    group: 'Free',
    tag: 'CURRENT PLAN',
    edge: '#4B5563',
    peak: '#9CA3AF',
    onColor: '#F9FAFB',
    labelColor: '#D1D5DB',
    useGoldClass: false,
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
  const { label, icon: Icon, onColor } = TIER_CONFIG[currentTier];
  const triggerGlossy = glossyStyle(currentTier);

  return (
    <Popover>
      {/* ── Trigger: glossy gradient pill ── */}
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Membership: ${label}. Click to see all tiers`}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold cursor-pointer hover:scale-[1.02] transition-transform${triggerGlossy.className ? ` ${triggerGlossy.className}` : ''}`}
          style={{
            color: onColor,
            ...triggerGlossy.style,
          }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: onColor }} />
          {label}
        </button>
      </PopoverTrigger>

      {/* ── Popover: tier legend ── */}
      <PopoverContent
        align="end"
        className="w-[400px] p-3 z-[200] border text-white max-h-[78vh] overflow-y-auto"
        style={{
          backgroundColor: '#0F0F0F',
          borderColor: 'rgba(201,166,70,0.2)',
        }}
      >
        {/* Header */}
        <p className="text-sm font-semibold text-white mb-3">
          FINOTAUR Membership Tiers
        </p>

        {/* Tier cards */}
        {TIER_DISPLAY_ORDER.map((key) => {
          const cfg = TIER_CONFIG[key];
          const TierIcon = cfg.icon;
          const isCurrent = key === currentTier;
          const rowGlossy = glossyStyle(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate('/app/plans')}
              className="relative w-full overflow-hidden flex items-center gap-3 rounded-[15px] px-3.5 py-3.5 mb-2.5 last:mb-0 cursor-pointer text-left hover:brightness-110 transition"
              style={{
                background: '#121214',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Glow layer */}
              <span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(100deg, transparent 42%, ${cfg.edge}26 100%)`,
                }}
              />

              {/* Left accent bar */}
              <span
                className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded"
                style={{ background: cfg.edge }}
              />

              {/* Watermark icon */}
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ opacity: 0.1, color: cfg.edge }}
              >
                <TierIcon className="w-16 h-16" />
              </span>

              {/* Glossy tile */}
              <span
                className={`relative z-[2] flex-shrink-0 w-12 h-12 rounded-[13px] flex items-center justify-center${rowGlossy.className ? ` ${rowGlossy.className}` : ''}`}
                style={rowGlossy.style}
              >
                <TierIcon className="w-[23px] h-[23px]" style={{ color: cfg.onColor }} />
              </span>

              {/* Body */}
              <span className="relative z-[2] flex-1 min-w-0">
                {/* Row 1: name + tag pill */}
                <span className="flex items-center gap-2">
                  <span
                    className="text-[15px] font-bold tracking-[0.01em]"
                    style={{ color: cfg.labelColor }}
                  >
                    {cfg.label}
                  </span>
                  <span
                    className="text-[10px] font-bold tracking-[0.05em] uppercase px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      background: `${cfg.edge}26`,
                      color: cfg.labelColor,
                    }}
                  >
                    {cfg.tag}
                  </span>
                </span>
                {/* Description */}
                <span className="block text-[12.5px] text-zinc-400 mt-1 leading-snug">
                  {cfg.description}
                </span>
              </span>

              {/* Right: chevron or CURRENT */}
              <span className="relative z-[2] flex-shrink-0">
                {isCurrent ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.05em]"
                    style={{ color: '#34D399' }}
                  >
                    <CircleCheck className="w-4 h-4" />
                    CURRENT
                  </span>
                ) : (
                  <span
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
                    style={{
                      border: `1px solid ${cfg.edge}66`,
                      color: cfg.labelColor,
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export default SubscriptionBadge;
