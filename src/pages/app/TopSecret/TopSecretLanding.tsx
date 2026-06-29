// ================================================
// TOP SECRET LANDING PAGE — The FINOTAUR Intelligence Envelope v5.0
// File: src/pages/app/TopSecret/TopSecretLanding.tsx
// 🔥 v5.0: REDESIGNED presentation — "Intelligence Envelope" unified layout
// ================================================

import React, { useState, memo, useCallback } from 'react';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';
import {
  TrendingUp,
  Bitcoin,
  Building2,
  Calendar,
  Lock,
  Check,
  Shield,
  Target,
  BarChart3,
  Gift,
  Zap,
  Mail,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Button } from '@/components/ds/Button';
import { Spinner } from '@/components/ds/Spinner';

// ========================================
// TYPES
// ========================================

interface ReportType {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: React.ElementType;
  frequency: string;
  frequencyLabel: string;
  accentColor: string;
  glowColor: string;
  borderGradient: string;
  highlights: string[];
}

// ========================================
// CONSTANTS
// ========================================

// ⚠️ PRICING DISPLAY = $50/mo + $499/yr. These are NOT yet wired to Whop products.
// The 'top_secret' planName currently maps to $89.99/$899 in whop-config.ts.
// BEFORE PRODUCTION DEPLOY: Elad must create $50/$499 Whop products and their plan IDs
// must replace top_secret's IDs in whop-config.ts, or the checkout will charge the wrong amount.
const ENVELOPE_PRICES = {
  monthly: 50,
  yearly: 499,
  monthlyEquivalent: 41.58,
  savings: 101,
};

const REPORT_TYPES: ReportType[] = [
  {
    id: 'ism',
    name: 'ISM Macro Report',
    shortName: 'Macro Report',
    description: 'PMI breakdown, sector impact & trade ideas with R:R.',
    icon: TrendingUp,
    frequency: 'Monthly',
    frequencyLabel: 'Monthly',
    accentColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    borderGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #F59E0B 100%)',
    highlights: [
      'PMI Component Breakdown',
      'Sector Impact Analysis',
      'Trade Ideas with R:R',
    ],
  },
  {
    id: 'company',
    name: 'Company Deep Dive',
    shortName: 'Company Analysis',
    description: 'Fundamental research, thesis & price targets.',
    icon: Building2,
    frequency: '2× monthly · 5th & 20th',
    frequencyLabel: '2× monthly · 5th & 20th',
    accentColor: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    borderGradient: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 50%, #A855F7 100%)',
    highlights: [
      'Business Model Analysis',
      'Competitive Moat Assessment',
      'Price Targets & Catalysts',
    ],
  },
  {
    id: 'crypto',
    name: 'Crypto Intelligence',
    shortName: 'Crypto Report',
    description: 'Derivatives, on-chain metrics & key levels.',
    icon: Bitcoin,
    frequency: 'Bi-weekly · 10th & 25th',
    frequencyLabel: 'Bi-weekly · 10th & 25th',
    accentColor: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    borderGradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 50%, #06B6D4 100%)',
    highlights: [
      'Market Regime Analysis',
      'Derivatives & Funding',
      'Key Levels & Targets',
    ],
  },
];

// ========================================
// ANIMATION VARIANTS
// ========================================

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

// ========================================
// MEMOIZED SUB-COMPONENTS
// ========================================

// Background Effects Component
const BackgroundEffects = memo(function BackgroundEffects() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#12100D] to-[#0B0B0B]" />

      {/* Main Golden Glow - Top Center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(201,166,70,0.15) 0%, rgba(180,140,50,0.08) 30%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Secondary Golden Glow - Middle */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(201,166,70,0.1) 0%, rgba(150,120,40,0.05) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Subtle warm accent - Left */}
      <div
        className="absolute top-1/4 left-0 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(180,140,50,0.06) 0%, transparent 60%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Subtle warm accent - Right */}
      <div
        className="absolute bottom-1/4 right-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(201,166,70,0.05) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
      />
    </>
  );
});

// ─── Hero: left column ───────────────────────────────────────────────────────

const HeroLeft = memo(function HeroLeft({
  isLoading,
  onSubscribe,
}: {
  isLoading: boolean;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}) {
  return (
    <div className="text-left">
      {/* Eyebrow badge */}
      <div
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl mb-8"
        style={{
          background: 'linear-gradient(135deg, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.05) 100%)',
          border: '1px solid rgba(201,166,70,0.35)',
          boxShadow: '0 0 32px rgba(201,166,70,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <Mail className="w-4 h-4 text-[#C9A646]" />
        <span className="text-[#C9A646] text-xs font-semibold tracking-widest uppercase">
          The FINOTAUR Intelligence Envelope
        </span>
      </div>

      {/* Headline */}
      <h1
        className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
        style={{ letterSpacing: '-0.03em' }}
      >
        <span className="text-white italic">Institutional intelligence,</span>
        <br />
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
          }}
        >
          delivered every trading day.
        </span>
      </h1>

      {/* Subheadline */}
      <p className="text-lg text-slate-400 max-w-lg mb-8 leading-relaxed">
        One envelope.{' '}
        <span className="text-[#C9A646] font-semibold">WAR ZONE</span> hits your
        inbox every market morning — and{' '}
        <span className="text-[#C9A646] font-semibold">TOP SECRET</span> deep-dive
        research lands all month long.
      </p>

      {/* 14-Day Free Trial pill */}
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.05) 100%)',
          border: '1px solid rgba(16,185,129,0.3)',
          boxShadow: '0 0 24px rgba(16,185,129,0.08)',
        }}
      >
        <Gift className="w-4 h-4 text-emerald-400" />
        <span className="text-emerald-300 font-semibold text-sm">14-day free trial</span>
        <span className="text-emerald-600 text-xs">· Cancel anytime</span>
      </div>

      {/* Primary CTA — DS gold button */}
      <div className="mb-10">
        <Button
          variant="gold"
          size="xl"
          onClick={() => onSubscribe('monthly')}
          disabled={isLoading}
          showArrow={!isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" color="inherit" />
              Redirecting...
            </span>
          ) : (
            'Start your 14-day free trial'
          )}
        </Button>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#C9A646]" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Daily + monthly</p>
            <p className="text-xs text-slate-500">Continuous coverage</p>
          </div>
        </div>
        <div className="w-px h-8 bg-slate-700" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#C9A646]" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Institutional</p>
            <p className="text-xs text-slate-500">Research grade</p>
          </div>
        </div>
        <div className="w-px h-8 bg-slate-700" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-[#C9A646]" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Actionable</p>
            <p className="text-xs text-slate-500">Trade ideas</p>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Hero: right column — WAR ZONE "Morning Briefing" preview card ──────────

const WarZonePreviewCard = memo(function WarZonePreviewCard() {
  return (
    <div className="relative">
      {/* Glow behind */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-40"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(201,166,70,0.3) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 20, rotateY: -4 }}
        animate={{ opacity: 1, y: 0, rotateY: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #151515 0%, #0A0A0A 100%)',
            border: '1px solid rgba(201,166,70,0.3)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 60px rgba(201,166,70,0.1)',
          }}
        >
          {/* Card header */}
          <div
            className="p-5 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(201,166,70,0.2)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)' }}
              >
                <Zap className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-white font-bold text-xs tracking-widest uppercase">FINOTAUR / WAR ZONE · DAILY</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30">
              <div className="w-2 h-2 rounded-full bg-[#C9A646] animate-pulse" />
              <span className="text-[#C9A646] text-xs font-semibold">LIVE</span>
            </div>
          </div>

          {/* Card body */}
          <div className="p-6">
            <div className="mb-5">
              <p className="text-slate-500 text-xs mb-1 font-mono">9:00 AM ET</p>
              <h3 className="text-xl font-bold text-white">Today's Market Map</h3>
            </div>

            {/* Metric tiles */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div
                className="p-3 rounded-xl"
                style={{
                  background: 'rgba(201,166,70,0.08)',
                  border: '1px solid rgba(201,166,70,0.2)',
                }}
              >
                <p className="text-[#C9A646] text-xs font-semibold mb-1">Bias</p>
                <p className="text-white text-lg font-bold font-mono tabular-nums">RISK ON</p>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{
                  background: 'rgba(201,166,70,0.06)',
                  border: '1px solid rgba(201,166,70,0.15)',
                }}
              >
                <p className="text-[#C9A646] text-xs font-semibold mb-1">Setups</p>
                <p className="text-white text-lg font-bold font-mono tabular-nums">4 today</p>
              </div>
            </div>

            {/* Faint chart strip */}
            <div
              className="h-20 rounded-xl mb-4 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.02) 100%)',
              }}
            >
              <svg className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="warzoneChartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#C9A646" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#C9A646" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 Q60,40 120,45 T240,30 T360,35 T480,15"
                  fill="none"
                  stroke="#C9A646"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
                <path
                  d="M0,60 Q60,40 120,45 T240,30 T360,35 T480,15 L480,80 L0,80 Z"
                  fill="url(#warzoneChartGrad)"
                />
              </svg>
            </div>
          </div>

          {/* Blur / lock overlay */}
          <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-center pb-8">
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                  boxShadow: '0 0 32px rgba(201,166,70,0.5)',
                }}
              >
                <Lock className="w-7 h-7 text-black" />
              </div>
              <p className="text-white font-bold text-base mb-1">Unlock the envelope</p>
              <p className="text-slate-400 text-sm">Daily + all research</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

// ─── Inside the Envelope: WAR ZONE flagship card ─────────────────────────────

const WarZoneFlagshipCard = memo(function WarZoneFlagshipCard() {
  return (
    <div
      className="relative rounded-2xl p-7 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(201,166,70,0.10) 0%, rgba(201,166,70,0.04) 100%)',
        border: '1px solid rgba(201,166,70,0.3)',
      }}
    >
      {/* Gold top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #C9A646 40%, #F4D97B 50%, #C9A646 60%, transparent 100%)',
        }}
      />

      <div className="flex flex-wrap items-start gap-6">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.25) 0%, rgba(201,166,70,0.08) 100%)',
            border: '1px solid rgba(201,166,70,0.35)',
          }}
        >
          <Zap className="w-7 h-7 text-[#C9A646]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-white">WAR ZONE</h3>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold"
              style={{
                background: 'rgba(201,166,70,0.18)',
                border: '1px solid rgba(201,166,70,0.35)',
                color: '#C9A646',
              }}
            >
              <Calendar className="w-3 h-3" />
              DAILY · FLAGSHIP
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed max-w-xl">
            Your morning market briefing — global macro, sector rotation &amp; actionable setups.
            Every trading day, 9:00 AM ET.
          </p>
        </div>
      </div>
    </div>
  );
});

// ─── Inside the Envelope: report card (2×2 grid) ─────────────────────────────

const EnvelopeReportCard = memo(function EnvelopeReportCard({
  report,
}: {
  report: ReportType;
}) {
  const Icon = report.icon;
  return (
    <div
      className="relative rounded-2xl p-6 group"
      style={{
        background: 'linear-gradient(180deg, #111111 0%, #0A0A0A 100%)',
        border: `1px solid ${report.accentColor}25`,
        transition: 'border-color 200ms ease-out',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.borderColor = `${report.accentColor}60`)
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.borderColor = `${report.accentColor}25`)
      }
    >
      {/* Accent top line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{ background: report.borderGradient }}
      />

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            background: `${report.accentColor}15`,
            border: `1px solid ${report.accentColor}35`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: report.accentColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h4 className="text-base font-bold text-white">{report.name}</h4>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
              style={{
                background: `${report.accentColor}15`,
                border: `1px solid ${report.accentColor}30`,
                color: report.accentColor,
              }}
            >
              {report.frequencyLabel}
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{report.description}</p>
        </div>
      </div>
    </div>
  );
});

// ─── What Lands in Your Inbox ────────────────────────────────────────────────

const WeekStripSection = memo(function WeekStripSection() {
  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: 'linear-gradient(135deg, rgba(20,18,14,0.95) 0%, rgba(12,11,8,0.98) 100%)',
        border: '1px solid rgba(201,166,70,0.15)',
      }}
    >
      {/* Section label */}
      <div className="flex items-center gap-2 mb-6">
        <Mail className="w-4 h-4 text-[#C9A646]" />
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(201,166,70,0.75)' }}
        >
          What lands in your inbox
        </span>
      </div>

      {/* Cadence-grouped rows */}
      <div className="flex flex-col gap-[14px]">

        {/* ROW 1 — DAILY (gold flagship) */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{
            background: 'rgba(201,166,70,0.10)',
            border: '1px solid rgba(201,166,70,0.35)',
          }}
        >
          {/* Left label column */}
          <div
            className="flex flex-col items-center justify-center gap-1 px-4 py-4 flex-shrink-0"
            style={{
              width: '66px',
              borderRight: '1px solid rgba(201,166,70,0.25)',
            }}
          >
            <Zap className="w-4 h-4 text-[#C9A646]" />
            <span
              className="text-[9px] font-bold tracking-widest uppercase"
              style={{ color: 'rgba(201,166,70,0.75)' }}
            >
              DAILY
            </span>
          </div>
          {/* Content area */}
          <div className="flex flex-col justify-center px-5 py-4 gap-0.5">
            <p className="text-sm font-bold tracking-wide text-[#C9A646]">WAR ZONE</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Every trading day · Mon–Fri, before the U.S. open
            </p>
          </div>
        </div>

        {/* ROW 2 — WEEKLY */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Left label column */}
          <div
            className="flex flex-col items-center justify-center gap-1 px-4 py-4 flex-shrink-0"
            style={{
              width: '66px',
              borderRight: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <Calendar className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.45)' }} />
            <span
              className="text-[9px] font-bold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              WEEKLY
            </span>
          </div>
          {/* Content area — two stacked items */}
          <div className="flex flex-col justify-center px-5 py-4 gap-0 flex-1">
            {/* Item 1 */}
            <div className="flex flex-col gap-0.5 py-2.5">
              <p className="text-sm font-semibold" style={{ color: '#A855F7' }}>
                Weekly Tactical Review
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Every Sunday · the week ahead, mapped
              </p>
            </div>
            {/* Thin divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            {/* Item 2 */}
            <div className="flex flex-col gap-0.5 py-2.5">
              <p className="text-sm font-semibold text-white">Company Deep-Dive</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Sundays · a name worth watching
              </p>
            </div>
          </div>
        </div>

        {/* ROW 3 — MONTHLY */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Left label column */}
          <div
            className="flex flex-col items-center justify-center gap-1 px-4 py-4 flex-shrink-0"
            style={{
              width: '66px',
              borderRight: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.45)' }} />
            <span
              className="text-[9px] font-bold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              MONTHLY
            </span>
          </div>
          {/* Content area — 3-column mini-grid */}
          <div className="flex items-center px-5 py-4 flex-1">
            <div className="grid grid-cols-3 gap-4 w-full">
              {/* Crypto */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Bitcoin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#06B6D4' }} />
                  <span className="text-xs font-semibold" style={{ color: '#06B6D4' }}>
                    Crypto
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  10th &amp; 25th
                </p>
              </div>
              {/* ISM */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                  <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>
                    ISM
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  On release week
                </p>
              </div>
              {/* Earnings */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F43F5E' }} />
                  <span className="text-xs font-semibold" style={{ color: '#F43F5E' }}>
                    Earnings
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Month-end
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

// ─── Pricing cards (new unified layout) ──────────────────────────────────────

const UnifiedMonthlyCard = memo(function UnifiedMonthlyCard({
  isLoading,
  selectedPlan,
  onSubscribe,
}: {
  isLoading: boolean;
  selectedPlan: 'monthly' | 'yearly' | null;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}) {
  const checklist = [
    'WAR ZONE daily briefing',
    'TOP SECRET Weekly review',
    'ISM, Crypto & Company reports',
    'Cancel anytime',
  ];

  return (
    <div
      className="relative rounded-2xl p-8"
      style={{
        background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
        border: '1px solid rgba(201,166,70,0.3)',
      }}
    >
      {/* 14-DAY FREE TRIAL badge */}
      <div className="absolute -top-3 left-8">
        <div
          className="px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
          }}
        >
          14-DAY FREE TRIAL
        </div>
      </div>

      <div className="pt-4">
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-2"
          style={{ color: 'rgba(201,166,70,0.7)' }}
        >
          Monthly
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-5xl font-bold text-white font-mono tabular-nums">
            ${ENVELOPE_PRICES.monthly}
          </span>
          <span className="text-slate-400 text-lg">/month</span>
        </div>
        <p className="text-slate-500 text-sm mb-6">Daily + monthly intelligence</p>

        {/* Checklist */}
        <ul className="space-y-3 mb-8">
          {checklist.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(201,166,70,0.15)',
                  border: '1px solid rgba(201,166,70,0.35)',
                }}
              >
                <Check className="w-3 h-3 text-[#C9A646]" />
              </div>
              <span className="text-sm text-slate-300">{item}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          variant="gold"
          size="full"
          onClick={() => onSubscribe('monthly')}
          disabled={isLoading}
          showArrow={false}
        >
          {isLoading && selectedPlan === 'monthly' ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" color="inherit" />
              Redirecting...
            </span>
          ) : (
            'Start free trial'
          )}
        </Button>
      </div>
    </div>
  );
});

const UnifiedAnnualCard = memo(function UnifiedAnnualCard({
  isLoading,
  selectedPlan,
  onSubscribe,
}: {
  isLoading: boolean;
  selectedPlan: 'monthly' | 'yearly' | null;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}) {
  const checklist = [
    'Everything in Monthly',
    'Locked price for 12 months',
    'Founding Members badge',
    'Early access to new tools',
  ];

  return (
    <div
      className="relative rounded-2xl p-8"
      style={{
        background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
        border: '2px solid rgba(201,166,70,0.5)',
        boxShadow: '0 0 48px rgba(201,166,70,0.12)',
      }}
    >
      {/* BEST VALUE badge */}
      <div className="absolute -top-3 right-8">
        <div
          className="px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
            color: '#000',
            boxShadow: '0 4px 12px rgba(201,166,70,0.4)',
          }}
        >
          BEST VALUE
        </div>
      </div>

      <div className="pt-4">
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-2"
          style={{ color: 'rgba(201,166,70,0.7)' }}
        >
          Annual
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-5xl font-bold text-white font-mono tabular-nums">
            ${ENVELOPE_PRICES.yearly}
          </span>
          <span className="text-slate-400 text-lg">/year</span>
        </div>
        <p className="text-slate-500 text-sm mb-6">
          ${ENVELOPE_PRICES.monthlyEquivalent}/mo — save ${ENVELOPE_PRICES.savings} vs monthly
        </p>

        {/* Checklist */}
        <ul className="space-y-3 mb-8">
          {checklist.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(201,166,70,0.18)',
                  border: '1px solid rgba(201,166,70,0.4)',
                }}
              >
                <Check className="w-3 h-3 text-[#C9A646]" />
              </div>
              <span className="text-sm text-slate-300">{item}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          variant="gold"
          size="full"
          onClick={() => onSubscribe('yearly')}
          disabled={isLoading}
          showArrow={false}
        >
          {isLoading && selectedPlan === 'yearly' ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" color="inherit" />
              Redirecting...
            </span>
          ) : (
            'Get annual plan'
          )}
        </Button>
      </div>
    </div>
  );
});

// ========================================
// MAIN COMPONENT
// ========================================

export default function TopSecretLanding() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);

  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => {
      console.log('✅ Top Secret checkout initiated');
    },
    onError: (error) => {
      console.error('❌ Top Secret checkout error:', error);
    },
  });

  // Memoized subscribe handler — both monthly and yearly go direct to top_secret
  const handleSubscribe = useCallback(
    async (billingInterval: 'monthly' | 'yearly') => {
      setSelectedPlan(billingInterval);
      initiateCheckout({ planName: 'top_secret', billingInterval });
    },
    [initiateCheckout],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="min-h-screen py-8 px-4 relative overflow-hidden bg-[#0A0A0A]">
      {/* Background */}
      <BackgroundEffects />

      <motion.div
        className="max-w-7xl mx-auto relative z-10 pt-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="grid lg:grid-cols-2 gap-12 items-center mb-24 px-4"
        >
          <HeroLeft isLoading={isLoading} onSubscribe={handleSubscribe} />
          <WarZonePreviewCard />
        </motion.div>

        {/* ── 2. INSIDE THE ENVELOPE ──────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="mb-24 px-4">
          {/* Eyebrow + heading */}
          <div className="text-center mb-12">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: 'rgba(201,166,70,0.75)' }}
            >
              INSIDE THE ENVELOPE
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Five intelligence streams, one subscription
            </h2>
          </div>

          {/* Flagship card */}
          <div className="mb-6">
            <WarZoneFlagshipCard />
          </div>

          {/* 2×2 grid of report cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Weekly added inline since it's not in REPORT_TYPES */}
            <EnvelopeReportCard
              report={{
                id: 'weekly',
                name: 'TOP SECRET Weekly',
                shortName: 'Weekly Review',
                description: 'Tactical week review, event calendar & positioning framework.',
                icon: BarChart3,
                frequency: 'Every Friday',
                frequencyLabel: 'Every Friday',
                accentColor: '#C9A646',
                glowColor: 'rgba(201,166,70,0.4)',
                borderGradient: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                highlights: [],
              }}
            />
            {REPORT_TYPES.map((report) => (
              <EnvelopeReportCard key={report.id} report={report} />
            ))}
          </div>
        </motion.div>

        {/* ── 3. WEEK-IN-YOUR-INBOX STRIP ─────────────────────────────────── */}
        <motion.div variants={itemVariants} className="mb-24 px-4">
          <WeekStripSection />
        </motion.div>

        {/* ── 4. PRICING ──────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="mb-20 px-4">
          <div className="text-center mb-12">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: 'rgba(201,166,70,0.75)' }}
            >
              ONE PRICE, THE WHOLE ENVELOPE
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Daily briefing + all research, included
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-[560px] md:max-w-3xl mx-auto">
            <UnifiedMonthlyCard
              isLoading={isLoading}
              selectedPlan={selectedPlan}
              onSubscribe={handleSubscribe}
            />
            <UnifiedAnnualCard
              isLoading={isLoading}
              selectedPlan={selectedPlan}
              onSubscribe={handleSubscribe}
            />
          </div>
        </motion.div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="text-center pb-8">
          <p className="text-slate-600">
            Questions?{' '}
            <a href="mailto:support@finotaur.com" className="text-[#C9A646] hover:underline">
              support@finotaur.com
            </a>
          </p>
        </motion.div>
      </motion.div>

    </section>
  );
}
