// ================================================
// DASHBOARD CONSTANTS - SINGLE SOURCE OF TRUTH
// File: src/constants/dashboard.ts
// ================================================

export const DAYS_MAP = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
  'ALL': 36500,
} as const;

export type DaysRange = keyof typeof DAYS_MAP;

// ✅ Pre-calculated styles (never recreated)
export const BORDER_STYLE = {
  borderColor: 'rgba(255, 215, 0, 0.08)',
} as const;

export const CARD_STYLE = {
  background: '#141414',
  boxShadow: '0 0 30px rgba(201,166,70,0.05), inset 0 1px 0 rgba(255,255,255,0.03)',
} as const;

export const CHART_COLORS = {
  profit: '#4AD295',
  profitGradientStart: '#4ADE80',
  profitGradientEnd: '#22C55E',
  loss: '#E36363',
  lossGradientStart: '#EF4444',
  lossGradientEnd: '#DC2626',
  gold: '#C9A646',
  goldLight: '#E5C158',
  goldDark: '#B39540',
  background: '#141414',
  backgroundDark: '#0A0A0A',
  grid: 'rgba(255,255,255,0.04)',
  gridDark: 'rgba(255,255,255,0.06)',
  text: '#F4F4F4',
  textMuted: '#A0A0A0',
} as const;

export const ANIMATION_STYLES = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
  }
  @keyframes pulse-gold {
    0%, 100% { box-shadow: 0 0 10px rgba(201,166,70,0.3); }
    50% { box-shadow: 0 0 20px rgba(201,166,70,0.6); }
  }
  .animate-pulse-gold {
    animation: pulse-gold 2s ease-in-out infinite;
  }
  @keyframes shimmer {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  .animate-shimmer {
    animation: shimmer 2s ease-in-out infinite;
  }
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .animate-scaleIn {
    animation: scaleIn 0.2s ease-out forwards;
  }
`;