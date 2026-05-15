// src/constants/ai-arena-theme.ts
// ============================================================
// AI Arena Theme — thin re-export layer over DS tokens.
// DO NOT define new hex values here. Only alias existing tokens.
// Source of truth: globals.css + tailwind.config.ts + DESIGN_SYSTEM.md
// ============================================================

export const AI_GOLD = {
  primary: '#C9A646',
  bright: '#E8C766',
  deep: '#A88838',
  hover: '#D4B25A',
  muted: 'rgba(201,166,70,0.7)',
  border: 'rgba(201,166,70,0.2)',
  glow: 'rgba(201,166,70,0.45)',
  gradientCta: 'var(--gradient-gold)',
  gradientVertical: 'var(--gradient-gold-vertical)',
} as const;

export const AI_NUM = {
  neutral: '#ffffff',
  positive: '#ffffff',
  negative: '#E24B4A',
} as const;

export const AI_SURFACE = {
  pageBase: '#0a0a0a',
  sectionBase: '#080808',
  sectionDeep: '#050608',
  sectionRadialMid: '#0a0c10',
  cardRest: 'rgba(20,20,20,0.7)',
  cardDeep: 'rgba(12,12,12,0.5)',
} as const;

export const AI_INK = {
  primary: '#ffffff',
  secondary: 'rgba(255,255,255,0.65)',
  tertiary: 'rgba(255,255,255,0.45)',
  muted: 'rgba(255,255,255,0.30)',
} as const;

export const AI_BORDER = {
  subtle: 'rgba(255,255,255,0.08)',
  default: 'rgba(255,255,255,0.12)',
  strong: 'rgba(255,255,255,0.20)',
  gold: 'rgba(201,166,70,0.20)',
} as const;

export const AI_GLOW = {
  resting: '0 0 24px 4px rgba(201,166,70,0.25)',
  hover: '0 0 32px 6px rgba(201,166,70,0.40)',
  strong: '0 0 60px 8px rgba(201,166,70,0.35)',
} as const;
