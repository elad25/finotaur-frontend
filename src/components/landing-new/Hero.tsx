// src/components/landing-new/Hero.tsx
// ================================================
// HERO — AuthKit-inspired wordmark layout
// Inter Black (900) · volumetric gold light beam · star field · construction marks
// ================================================

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ds/Button";
import { LogIn, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";

// ===========================================
// 5 Preview components — show, don't tell
// ===========================================

// ============ 1. PlatformPreview — Mini-dashboard ============
function PlatformPreview() {
  return (
    <div className="w-full h-full flex flex-col gap-3 p-3 rounded-md border border-[#C9A646]/10 bg-black/40">
      {/* Top: tickers + AI status */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3 text-[9.5px] font-mono">
          <span className="text-white/60">SPX <span className="text-emerald-400/85">4892 <span className="text-emerald-400/85">+0.34%</span></span></span>
          <span className="text-white/60">NDX <span className="text-emerald-400/85">17421 <span className="text-emerald-400/85">+0.52%</span></span></span>
          <span className="text-white/60">VIX <span className="text-rose-400/85">13.42 <span className="text-rose-400/85">-2.1%</span></span></span>
        </div>
        <div className="flex items-center gap-1.5 text-[8.5px] font-sans uppercase tracking-[0.22em]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400/85 font-medium">AI Active</span>
        </div>
      </div>

      {/* Mini chart */}
      <div className="relative">
        <div className="flex items-baseline justify-between mb-1 text-[9.5px]">
          <span className="font-wordmark text-white/85 tracking-wider">QQQ</span>
          <span className="font-mono text-white/65">$421.34</span>
          <span className="font-mono text-emerald-400/90">+1.84%</span>
        </div>
        <svg viewBox="0 0 320 50" className="w-full h-12" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pp-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(100,220,130,0.35)" />
              <stop offset="100%" stopColor="rgba(100,220,130,0)" />
            </linearGradient>
          </defs>
          <path d="M0,40 L40,36 L80,30 L120,28 L160,22 L200,18 L240,14 L280,10 L320,6 L320,50 L0,50 Z" fill="url(#pp-grad)" />
          <path d="M0,40 L40,36 L80,30 L120,28 L160,22 L200,18 L240,14 L280,10 L320,6" stroke="rgba(100,220,130,0.85)" strokeWidth="1.2" fill="none" />
        </svg>
      </div>

      {/* 4 module tiles */}
      <div className="grid grid-cols-4 gap-1.5 mt-auto">
        {[
          { label: 'Copilot', glyph: '⚡' },
          { label: 'AI Engine', glyph: '◆' },
          { label: 'Top Secret', glyph: '✦' },
          { label: 'Journal', glyph: '◧' },
        ].map((m) => (
          <div key={m.label} className="rounded border border-[#C9A646]/15 bg-[#C9A646]/[0.04] flex flex-col items-center justify-center gap-1 py-2 hover:border-[#C9A646]/30 transition-colors">
            <span className="text-[#C9A646]/85 text-sm leading-none">{m.glyph}</span>
            <span className="font-sans text-[8px] uppercase tracking-[0.18em] text-white/55 font-medium">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 2. CopilotPreview — AI-managed trades ============
function CopilotPreview() {
  const setups = [
    { time: '09:30', sym: 'AAPL', dir: 'CALL', strike: '$238.50', up: true },
    { time: '10:15', sym: 'NVDA', dir: 'PUT',  strike: '$890.00', up: false },
    { time: '11:00', sym: 'TSLA', dir: 'CALL', strike: '$245.30', up: true },
  ];

  // Compute current date label like "Mon · Jun 09" — updates each render
  const now = new Date();
  const dayLabel = now.toLocaleDateString('en-US', { weekday: 'short' });
  const monthLabel = now.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = String(now.getDate()).padStart(2, '0');
  const todayLabel = `${dayLabel} · ${monthLabel} ${dayNum}`;

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
        <span className="font-sans text-[9.5px] uppercase tracking-[0.25em] text-white/60 font-medium">{todayLabel}</span>
        <span className="flex items-center gap-1 font-sans text-[9px] uppercase tracking-[0.22em] text-emerald-400/90 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Section label */}
      <p className="font-sans text-[9.5px] uppercase tracking-[0.28em] text-[#C9A646]/85 font-medium pt-1">Copilot · Live Trades</p>

      {/* Setups */}
      <div className="space-y-1.5 flex-1">
        {setups.map((s) => (
          <div key={s.sym} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 py-1.5 px-2.5 rounded border border-white/8 bg-black/30">
            <span className="font-mono text-[9px] text-white/45 tabular-nums">{s.time}</span>
            <span className="font-wordmark text-[12px] text-white/90 tracking-wider">{s.sym}</span>
            <span className={`font-sans text-[8.5px] uppercase tracking-[0.2em] font-semibold px-1.5 py-0.5 rounded-sm ${s.dir === 'CALL' ? 'text-emerald-400/95 bg-emerald-500/10' : 'text-rose-400/95 bg-rose-500/10'}`}>{s.dir}</span>
            <span className="font-mono text-[10px] text-white/65 tabular-nums">{s.strike}</span>
            <span className={`text-[12px] ${s.up ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>{s.up ? '↗' : '↘'}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-white/5 font-sans text-[8.5px] uppercase tracking-[0.22em] text-white/35 font-medium">
        <span>AI auto-managed</span>
        <span>P&L: <span className="text-emerald-400/75">+2.4%</span></span>
      </div>
    </div>
  );
}

// ============ 3. AIPreview — Chat exchange ============
function AIPreview() {
  return (
    <div className="w-full h-full flex flex-col gap-2.5">
      {/* User bubble */}
      <div className="self-end max-w-[80%] rounded-[14px] rounded-tr-[2px] bg-[#C9A646]/12 border border-[#C9A646]/20 px-3 py-2">
        <p className="text-[10.5px] text-white/90 leading-[1.4]">
          What's driving the semiconductor rally today?
        </p>
      </div>

      {/* AI bubble */}
      <div className="self-start max-w-[92%] rounded-[14px] rounded-tl-[2px] bg-black/45 border border-[#C9A646]/12 px-3 py-2.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[#C9A646] text-[10px]">◆</span>
          <span className="font-sans text-[8.5px] uppercase tracking-[0.22em] text-[#C9A646]/85 font-semibold">FINOTAUR AI</span>
        </div>
        <p className="text-[10px] text-white/80 leading-[1.45]">
          Strong sector rotation — SOXX <span className="text-emerald-400/90 font-mono">+2.1%</span> vs SPY <span className="text-emerald-400/90 font-mono">+0.4%</span>. <strong className="text-white/95">Three drivers:</strong> AVGO AI capex, NVDA holding 200DMA, TSMC orderbook surprise. Watch <span className="text-[#E5C875] font-mono font-semibold">SOXX 215</span> for breakout.
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="font-sans text-[8px] uppercase tracking-[0.2em] text-white/45 px-1.5 py-0.5 rounded border border-white/10 bg-white/5">Sector Analysis</span>
          <span className="font-sans text-[8px] uppercase tracking-[0.2em] text-white/45 px-1.5 py-0.5 rounded border border-white/10 bg-white/5">3 sources</span>
        </div>
      </div>

      {/* Input prompt */}
      <div className="mt-auto flex items-center gap-2 px-3 py-2 rounded border border-white/10 bg-black/45">
        <span className="text-white/35 text-[10px]">Ask about any ticker, sector, or theme...</span>
        <span className="ml-auto w-px h-3.5 bg-[#C9A646]/85" style={{ animation: 'blink 1s step-end infinite' }} />
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

// ============ 4. TopSecretPreview — Classified report cover ============
function TopSecretPreview() {
  return (
    <div className="w-full h-full flex flex-col gap-2 relative">
      {/* CLASSIFIED stamp */}
      <div className="border border-[#C9A646]/45 rounded-sm py-1 px-2.5 flex items-center justify-between bg-[#C9A646]/[0.04]">
        <span className="font-sans text-[8.5px] uppercase tracking-[0.32em] text-[#C9A646]/95 font-bold">Classified · Tier 1</span>
        <Lock className="w-2.5 h-2.5 text-[#C9A646]/85" />
      </div>

      {/* Cover */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-3">
        <div className="font-wordmark text-[34px] md:text-[40px] text-[#E5C875] tracking-[-0.02em] leading-none mb-1.5">PLTR</div>
        <div className="font-sans text-[8.5px] uppercase tracking-[0.28em] text-white/45 mb-3">Q2 2026 · Deep Dive</div>
        <div className="w-12 h-px bg-[#C9A646]/35 mb-3" />
        <p className="font-serif italic text-[10px] text-white/75 leading-[1.45] max-w-[95%]">
          "Multi-year defense tailwind meets commercial inflection. Re-rating thesis intact through 2027."
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 w-full mt-3">
          <div className="rounded border border-white/8 bg-black/35 px-2 py-1.5 text-center">
            <div className="font-sans text-[7.5px] uppercase tracking-[0.25em] text-white/40 mb-0.5">Price Target</div>
            <div className="font-mono text-[10px] text-emerald-400/90 font-semibold">$32 → $58</div>
          </div>
          <div className="rounded border border-white/8 bg-black/35 px-2 py-1.5 text-center">
            <div className="font-sans text-[7.5px] uppercase tracking-[0.25em] text-white/40 mb-0.5">Confidence</div>
            <div className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#C9A646]/95 font-semibold">High</div>
          </div>
        </div>
      </div>

      {/* Lock bar */}
      <div className="flex items-center justify-center gap-1.5 pt-1.5 border-t border-[#C9A646]/12 font-sans text-[8.5px] uppercase tracking-[0.22em] text-white/45 font-medium">
        <Lock className="w-2 h-2 text-[#C9A646]/70" />
        <span>42-page institutional report</span>
      </div>
    </div>
  );
}

// ============ 5. JournalPreview — Trade entry ============
function JournalPreview() {
  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
        <span className="font-sans text-[9.5px] uppercase tracking-[0.25em] text-white/55 font-medium">Trade #847</span>
        <span className="font-sans text-[9.5px] uppercase tracking-[0.18em] font-semibold px-2 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-400/95 border border-emerald-500/30">+12.4%</span>
      </div>

      {/* Symbol row */}
      <div className="flex items-baseline justify-between">
        <span className="font-wordmark text-[20px] text-white tracking-wider">AAPL</span>
        <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-white/45">LONG · 100 sh</span>
      </div>

      {/* Chart */}
      <svg viewBox="0 0 280 36" className="w-full h-9" preserveAspectRatio="none">
        <defs>
          <linearGradient id="jp-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(100,220,130,0.32)" />
            <stop offset="100%" stopColor="rgba(100,220,130,0)" />
          </linearGradient>
        </defs>
        <path d="M0,30 L30,28 L60,25 L90,22 L120,18 L150,15 L180,10 L210,7 L240,5 L280,3 L280,36 L0,36 Z" fill="url(#jp-grad)" />
        <path d="M0,30 L30,28 L60,25 L90,22 L120,18 L150,15 L180,10 L210,7 L240,5 L280,3" stroke="rgba(100,220,130,0.9)" strokeWidth="1.3" fill="none" />
      </svg>

      {/* Three price blocks */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded border border-white/8 bg-black/30 px-2 py-1.5 text-center">
          <div className="font-sans text-[7.5px] uppercase tracking-[0.22em] text-white/35 mb-0.5">Entry</div>
          <div className="font-mono text-[10px] text-white/85 tabular-nums">$212.40</div>
        </div>
        <div className="rounded border border-white/8 bg-black/30 px-2 py-1.5 text-center">
          <div className="font-sans text-[7.5px] uppercase tracking-[0.22em] text-white/35 mb-0.5">Exit</div>
          <div className="font-mono text-[10px] text-white/85 tabular-nums">$238.70</div>
        </div>
        <div className="rounded border border-white/8 bg-black/30 px-2 py-1.5 text-center">
          <div className="font-sans text-[7.5px] uppercase tracking-[0.22em] text-white/35 mb-0.5">Held</div>
          <div className="font-mono text-[10px] text-white/85 tabular-nums">14d</div>
        </div>
      </div>

      {/* Note */}
      <div className="flex gap-1.5 mt-auto pt-1.5 border-t border-white/5">
        <span className="text-[#C9A646]/60 font-serif text-[14px] leading-none">"</span>
        <p className="font-serif italic text-[9.5px] text-white/55 leading-[1.4]">
          Held through earnings — thesis intact. Trim 50% on next leg.
        </p>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-1.5">
        <span className="font-sans text-[8px] uppercase tracking-[0.2em] text-white/45 px-1.5 py-0.5 rounded border border-white/10 bg-white/5">Earnings</span>
        <span className="font-sans text-[8px] uppercase tracking-[0.2em] text-white/45 px-1.5 py-0.5 rounded border border-white/10 bg-white/5">Backtested</span>
      </div>
    </div>
  );
}

// ===========================================
// CarouselCard component
// ===========================================
type CardPosition = 'center' | 'left-1' | 'right-1' | 'left-2' | 'right-2';

type CarouselCardProps = {
  position: CardPosition;
  eyebrow: string;
  title: string;
  tagline: string;
  Preview: React.ComponentType;
  flagship?: boolean;
  stats?: string[];
  onClick?: () => void;
  mobile?: boolean;
};

function CarouselCard({ position, eyebrow, title, tagline, Preview, flagship, stats, onClick, mobile }: CarouselCardProps) {
  const isCenter = position === 'center';
  const isFeatured = isCenter && flagship;

  // Dimensions: all cards = 380×560 uniform
  const widthPx = 380;
  const heightPx = 560;

  // Side card spacing — fixed, no longer dependent on center card size
  const sideTranslate1 = 280;
  const sideTranslate2 = 500;
  const sideZ1 = -100;
  const sideZ2 = -200;
  const sideRot1 = 15;
  const sideRot2 = 25;

  const positionStyles: Record<CardPosition, React.CSSProperties> = {
    'center':   { transform: 'translateX(0) scale(1) translateZ(0)', zIndex: 10, opacity: 1, filter: 'blur(0)' },
    'right-1':  { transform: `translateX(${sideTranslate1}px) scale(0.85) rotateY(-${sideRot1}deg) translateZ(${sideZ1}px)`, zIndex: 4, opacity: 0.75, filter: 'blur(0.8px)' },
    'left-1':   { transform: `translateX(-${sideTranslate1}px) scale(0.85) rotateY(${sideRot1}deg) translateZ(${sideZ1}px)`, zIndex: 4, opacity: 0.75, filter: 'blur(0.8px)' },
    'right-2':  { transform: `translateX(${sideTranslate2}px) scale(0.72) rotateY(-${sideRot2}deg) translateZ(${sideZ2}px)`, zIndex: 3, opacity: 0.45, filter: 'blur(2px)' },
    'left-2':   { transform: `translateX(-${sideTranslate2}px) scale(0.72) rotateY(${sideRot2}deg) translateZ(${sideZ2}px)`, zIndex: 3, opacity: 0.45, filter: 'blur(2px)' },
  };

  // Featured center has gold-gradient border + stronger glow
  const featuredBorder = isFeatured
    ? '1.5px solid transparent'
    : `1px solid ${isCenter ? 'rgba(201, 166, 70, 0.30)' : 'rgba(201, 166, 70, 0.15)'}`;

  const featuredBg = isFeatured
    ? `linear-gradient(135deg, rgba(20, 20, 20, 0.85) 0%, rgba(12, 12, 12, 0.7) 100%) padding-box,
       linear-gradient(135deg, rgba(230, 195, 100, 0.4) 0%, rgba(201, 166, 70, 0.15) 50%, rgba(230, 195, 100, 0.3) 100%) border-box`
    : 'linear-gradient(135deg, rgba(20, 20, 20, 0.7) 0%, rgba(12, 12, 12, 0.5) 100%)';

  const featuredShadow = isFeatured
    ? '0 50px 120px rgba(0,0,0,0.75), 0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(201,166,70,0.18), 0 0 120px rgba(201,166,70,0.12), 0 0 200px rgba(201,166,70,0.06), inset 0 1px 0 rgba(255,230,160,0.12), inset 1px 0 0 rgba(255,220,140,0.04), inset -1px 0 0 rgba(255,220,140,0.04)'
    : isCenter
      ? '0 40px 100px rgba(0,0,0,0.7), 0 0 120px rgba(201,166,70,0.10), inset 0 1px 0 rgba(255,255,255,0.04)'
      : '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(201,166,70,0.04)';

  return (
    <div
      onClick={onClick}
      className={`${mobile ? 'relative w-full' : 'absolute'} rounded-2xl flex flex-col cursor-pointer group ${isFeatured ? 'animate-gold-border-shimmer' : ''}`}
      style={{
        width: mobile ? '100%' : `${widthPx}px`,
        height: mobile ? 'auto' : `${heightPx}px`,
        minHeight: mobile ? '440px' : `${heightPx}px`,
        padding: isFeatured ? '28px' : '22px',
        background: featuredBg,
        backdropFilter: isFeatured ? 'blur(32px) saturate(180%)' : 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: isFeatured ? 'blur(32px) saturate(180%)' : 'blur(24px) saturate(140%)',
        border: featuredBorder,
        boxShadow: featuredShadow,
        transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        ...(mobile ? {} : positionStyles[position]),
      }}
    >
      {/* Top-edge gold light bar — featured only */}
      {isFeatured && (
        <span
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            top: '-1px',
            width: '70%',
            height: '2px',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 220, 140, 0.3) 20%, rgba(255, 230, 160, 0.9) 50%, rgba(255, 220, 140, 0.3) 80%, transparent 100%)',
            filter: 'blur(0.5px)',
            zIndex: 2,
          }}
          aria-hidden="true"
        />
      )}

      {/* Corner brackets — featured card gets brighter, larger luxury accents */}
      {isFeatured ? (
        <>
          <span className="absolute pointer-events-none" style={{ top: '10px', left: '10px',  width: '14px', height: '14px', borderTop: '1px solid rgba(255,220,140,0.7)', borderLeft: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
          <span className="absolute pointer-events-none" style={{ top: '10px', right: '10px', width: '14px', height: '14px', borderTop: '1px solid rgba(255,220,140,0.7)', borderRight: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
          <span className="absolute pointer-events-none" style={{ bottom: '10px', left: '10px',  width: '14px', height: '14px', borderBottom: '1px solid rgba(255,220,140,0.7)', borderLeft: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
          <span className="absolute pointer-events-none" style={{ bottom: '10px', right: '10px', width: '14px', height: '14px', borderBottom: '1px solid rgba(255,220,140,0.7)', borderRight: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
        </>
      ) : (
        <>
          <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#C9A646]/40 pointer-events-none" />
          <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#C9A646]/40 pointer-events-none" />
          <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#C9A646]/40 pointer-events-none" />
          <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#C9A646]/40 pointer-events-none" />
        </>
      )}

      {/* FLAGSHIP tag — only on featured card */}
      {isFeatured && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 font-sans text-[9px] font-semibold uppercase tracking-[0.45em] text-[#FFE6A0] border border-[#FFE6A0]/30 px-3 py-1.5 rounded-sm"
            style={{
              background: 'linear-gradient(90deg, rgba(255,220,140,0.12) 0%, rgba(201,166,70,0.06) 100%)',
            }}
          >
            <span
              className="w-1 h-1 rounded-full"
              style={{
                background: 'rgba(255, 220, 140, 1)',
                boxShadow: '0 0 8px rgba(255, 220, 140, 0.8)',
              }}
              aria-hidden="true"
            />
            Flagship
          </span>
        </div>
      )}

      {/* Eyebrow */}
      <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#C9A646]/75 font-medium mb-3">
        {eyebrow}
      </p>

      {/* Title */}
      <h3 className={`font-wordmark font-normal text-white/95 mb-2 leading-[1.1] tracking-[-0.01em] ${isFeatured ? 'text-[28px] md:text-[32px]' : 'text-[22px] md:text-[26px]'}`}>
        {title}
      </h3>

      {/* Tagline */}
      <p className={`font-sans font-light text-white/60 leading-[1.5] ${isFeatured ? 'text-[13px] md:text-sm mb-5' : 'text-[12px] md:text-[13px] mb-4'}`}>
        {tagline}
      </p>

      {/* Preview */}
      <div className="flex-1 flex items-stretch min-h-[180px]">
        <Preview />
      </div>

      {/* Featured stats footer */}
      {isFeatured && stats && (
        <div className="flex items-center justify-center gap-3 pt-4 mt-4 border-t border-[#C9A646]/12">
          {stats.map((s, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#C9A646]/70 font-medium">{s}</span>
              {i < stats.length - 1 && <span className="text-[#C9A646]/30">·</span>}
            </span>
          ))}
        </div>
      )}

      {/* Non-featured "Learn more" affordance */}
      {!isFeatured && !mobile && (
        <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-[#C9A646]/10">
          <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#C9A646]/60 group-hover:text-[#E5C875]/95 transition-colors">
            Learn more
          </span>
          <span className="text-[#C9A646]/60 group-hover:text-[#E5C875]/95 group-hover:translate-x-1 transition-all">→</span>
        </div>
      )}
    </div>
  );
}

// ===========================================
// CrossMarker sub-component
// ===========================================
function CrossMarker() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60">
      <line x1="7" y1="2" x2="7" y2="12" stroke="rgba(201,166,70,0.6)" strokeWidth="0.8" />
      <line x1="2" y1="7" x2="12" y2="7" stroke="rgba(201,166,70,0.6)" strokeWidth="0.8" />
    </svg>
  );
}

// ===========================================
// Hero component
// ===========================================
const Hero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const handleStartFree = () => {
    if (user) navigate('/app');
    else navigate('/auth/register');
  };

  // Carousel state
  const [centerIndex, setCenterIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const cardCount = 5;

  const cards = [
    {
      key: 'platform',
      eyebrow: 'THE PLATFORM',
      title: 'FINOTAUR Terminal',
      tagline: 'The Bloomberg Terminal, reimagined for independent traders and investors. Every tool. Every signal. One unified intelligence layer.',
      Preview: PlatformPreview,
      flagship: true,
      stats: ['5 Modules', '24/7 Intelligence', 'Real-time Flow'],
    },
    {
      key: 'copilot',
      eyebrow: 'AI PORTFOLIO MANAGER',
      title: 'Copilot',
      tagline: 'Your AI portfolio manager — invests and trades alongside you, 24/7. Coming soon.',
      Preview: CopilotPreview,
    },
    {
      key: 'ai',
      eyebrow: 'AI CO-PILOT',
      title: 'Ask Anything About the Market',
      tagline: 'Your personal AI analyst. Trained on flow data, macro signals, and institutional research. Available 24/7.',
      Preview: AIPreview,
    },
    {
      key: 'topsecret',
      eyebrow: 'COMPANY ANALYSIS',
      title: 'Top Secret Reports',
      tagline: 'Institutional-grade deep-dives on individual names. The thesis. The numbers. The conviction.',
      Preview: TopSecretPreview,
    },
    {
      key: 'journal',
      eyebrow: 'TRADE JOURNAL',
      title: 'The Journal',
      tagline: 'Track every trade. Backtest every idea. Refine every edge.',
      Preview: JournalPreview,
    },
  ];

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCenterIndex(prev => (prev + 1) % cardCount);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const getPosition = (idx: number): 'center' | 'left-1' | 'right-1' | 'left-2' | 'right-2' | 'hidden' => {
    const offset = ((idx - centerIndex) + cardCount) % cardCount;
    if (offset === 0) return 'center';
    if (offset === 1) return 'right-1';
    if (offset === 2) return 'right-2';
    if (offset === cardCount - 1) return 'left-1';
    if (offset === cardCount - 2) return 'left-2';
    return 'hidden';
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden pt-28 md:pt-32 pb-32">

      {/* ========== DEEP DARK BASE ========== */}
      <div className="absolute inset-0 bg-[#080808]" aria-hidden="true" />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #0a0c10 0%, #050608 60%, #030406 100%)' }}
        aria-hidden="true"
      />

      {/* ========== BULL SILHOUETTE — atmospheric brand backdrop, anchored to upper viewport ========== */}
      <img
        src="/logo.webp"
        alt=""
        aria-hidden="true"
        decoding="async"
        className="absolute pointer-events-none select-none"
        style={{
          left: '-18%',
          top: '25%',
          width: '70vw',
          maxWidth: '1100px',
          height: 'auto',
          opacity: 0.11,
          filter: 'blur(2px) sepia(0.4) hue-rotate(5deg)',
          clipPath: 'inset(0 0 32% 0)',
          zIndex: 0,
        }}
      />

      {/* ========== STAR FIELD ========== */}
      <motion.div
        className="absolute inset-0 opacity-70 pointer-events-none"
        animate={
          prefersReducedMotion
            ? undefined
            : { x: [0, -14, 6, 0], y: [0, 8, -10, 0] }
        }
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.4, 0.7, 1],
        }}
        style={{
          backgroundImage: `radial-gradient(1.5px 1.5px at 17% 22%, rgba(255,255,255,0.85) 0%, transparent 50%),
                            radial-gradient(1px 1px at 33% 71%, rgba(255,255,255,0.6) 0%, transparent 50%),
                            radial-gradient(1px 1px at 51% 18%, rgba(255,255,255,0.5) 0%, transparent 50%),
                            radial-gradient(1.5px 1.5px at 73% 43%, rgba(255,255,255,0.75) 0%, transparent 50%),
                            radial-gradient(1px 1px at 89% 67%, rgba(255,255,255,0.65) 0%, transparent 50%),
                            radial-gradient(1px 1px at 12% 85%, rgba(255,255,255,0.5) 0%, transparent 50%),
                            radial-gradient(2px 2px at 67% 12%, rgba(255,255,255,0.9) 0%, transparent 50%),
                            radial-gradient(1px 1px at 28% 49%, rgba(255,255,255,0.55) 0%, transparent 50%),
                            radial-gradient(1.5px 1.5px at 85% 30%, rgba(255,255,255,0.7) 0%, transparent 50%),
                            radial-gradient(1px 1px at 6% 60%, rgba(255,255,255,0.5) 0%, transparent 50%),
                            radial-gradient(1px 1px at 41% 92%, rgba(255,255,255,0.6) 0%, transparent 50%),
                            radial-gradient(2px 2px at 95% 5%, rgba(255,255,255,0.85) 0%, transparent 50%),
                            radial-gradient(1px 1px at 8% 18%, rgba(255,255,255,0.55) 0%, transparent 50%),
                            radial-gradient(1px 1px at 22% 64%, rgba(255,255,255,0.5) 0%, transparent 50%),
                            radial-gradient(1.5px 1.5px at 91% 88%, rgba(255,255,255,0.7) 0%, transparent 50%),
                            radial-gradient(1px 1px at 56% 95%, rgba(255,255,255,0.55) 0%, transparent 50%)`,
          backgroundSize: '600px 600px, 700px 700px, 500px 500px, 800px 800px, 600px 600px, 700px 700px, 500px 500px, 600px 600px, 800px 800px, 700px 700px, 500px 500px, 600px 600px, 750px 750px, 650px 650px, 550px 550px, 720px 720px',
          backgroundPosition: '0 0, 200px 100px, 400px 50px, 100px 200px, 300px 300px, 50px 400px, 250px 150px, 350px 250px, 150px 350px, 450px 50px, 50px 250px, 250px 450px, 100px 50px, 350px 100px, 200px 300px, 400px 400px',
        }}
        aria-hidden="true"
      />

      {/* Twinkling overlay — sparser, animated */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          backgroundImage: `radial-gradient(2px 2px at 24% 14%, rgba(255,255,255,1) 0%, transparent 60%),
                            radial-gradient(2px 2px at 78% 38%, rgba(255,247,222,1) 0%, transparent 60%),
                            radial-gradient(1.5px 1.5px at 44% 76%, rgba(255,255,255,0.9) 0%, transparent 60%),
                            radial-gradient(2px 2px at 88% 82%, rgba(244,228,184,1) 0%, transparent 60%),
                            radial-gradient(1.5px 1.5px at 14% 58%, rgba(255,255,255,0.85) 0%, transparent 60%)`,
          backgroundSize: '900px 900px, 1100px 1100px, 800px 800px, 1000px 1000px, 850px 850px',
          backgroundPosition: '0 0, 200px 100px, 400px 50px, 100px 200px, 300px 300px',
        }}
        aria-hidden="true"
      />

      {/* Second twinkle layer with different timing */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        style={{
          backgroundImage: `radial-gradient(1.5px 1.5px at 60% 22%, rgba(255,247,222,0.95) 0%, transparent 60%),
                            radial-gradient(2px 2px at 18% 82%, rgba(255,255,255,1) 0%, transparent 60%),
                            radial-gradient(1px 1px at 92% 14%, rgba(244,228,184,0.9) 0%, transparent 60%),
                            radial-gradient(1.5px 1.5px at 36% 48%, rgba(255,255,255,0.85) 0%, transparent 60%)`,
          backgroundSize: '950px 950px, 1050px 1050px, 800px 800px, 900px 900px',
          backgroundPosition: '0 0, 250px 100px, 350px 200px, 150px 350px',
        }}
        aria-hidden="true"
      />

      {/* ========== SUBTLE GRID TEXTURE ========== */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
        }}
        aria-hidden="true"
      />

      {/* ========== ATMOSPHERIC LIGHT BEAM (3 soft layers) ========== */}
      {/* Layer 1 — Ambient glow (the "atmosphere") */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120%',
          height: '100%',
          background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(201, 166, 70, 0.18) 0%, rgba(201, 166, 70, 0.10) 25%, rgba(201, 166, 70, 0.04) 50%, transparent 75%)',
          filter: 'blur(40px)',
          zIndex: 1,
        }}
        aria-hidden="true"
      />

      {/* Layer 2 — Medium beam (the "light volume") */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          height: '90%',
          background: 'radial-gradient(ellipse 45% 70% at 50% 0%, rgba(230, 195, 100, 0.22) 0%, rgba(220, 180, 80, 0.12) 30%, rgba(201, 166, 70, 0.05) 60%, transparent 85%)',
          mixBlendMode: 'screen',
          filter: 'blur(20px)',
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      {/* Layer 3 — Core highlight (the "source") */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-5%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '30%',
          height: '70%',
          background: 'radial-gradient(ellipse 30% 50% at 50% 0%, rgba(255, 220, 140, 0.25) 0%, rgba(230, 195, 100, 0.10) 40%, transparent 80%)',
          mixBlendMode: 'screen',
          filter: 'blur(15px)',
          zIndex: 3,
        }}
        aria-hidden="true"
      />

      {/* Ceiling hairline — the "source line" at the very top */}
      <div className="absolute top-[78px] left-0 right-0 h-px pointer-events-none" aria-hidden="true">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-32 h-px bg-gradient-to-r from-transparent via-[#F4E4B8]/60 to-transparent blur-[0.5px]" />
      </div>

      {/* ========== ENHANCED ANIMATED SPOTLIGHT (SVG) ========== */}
      <svg
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[900px] pointer-events-none"
        viewBox="0 0 1200 900"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ mixBlendMode: 'screen', filter: 'blur(0.5px)' }}
      >
        <defs>
          {/* Soft cone of light gradient */}
          <linearGradient id="cone-light" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(244, 228, 184, 0.08)" />
            <stop offset="50%" stopColor="rgba(229, 200, 117, 0.04)" />
            <stop offset="100%" stopColor="rgba(201, 166, 70, 0)" />
          </linearGradient>

          {/* Particle gradient — golden dust */}
          <radialGradient id="dust-particle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 247, 222, 0.95)" />
            <stop offset="50%" stopColor="rgba(244, 228, 184, 0.5)" />
            <stop offset="100%" stopColor="rgba(229, 200, 117, 0)" />
          </radialGradient>
        </defs>

        {/* Cone path */}
        <path d="M 540,0 L 660,0 L 1000,900 L 200,900 Z" fill="url(#cone-light)" opacity="0.15" />

        {/* 30 floating dust particles */}
        {[
          { x: 480, y: 180, r: 1.2, dur: 6,   delay: 0,   driftX: 8 },
          { x: 720, y: 220, r: 1.5, dur: 7,   delay: 0.5, driftX: -10 },
          { x: 540, y: 320, r: 1.0, dur: 8,   delay: 1,   driftX: 12 },
          { x: 660, y: 380, r: 1.3, dur: 6.5, delay: 1.5, driftX: -8 },
          { x: 500, y: 440, r: 1.1, dur: 7.5, delay: 0.8, driftX: 9 },
          { x: 700, y: 500, r: 1.4, dur: 7,   delay: 0.3, driftX: -11 },
          { x: 580, y: 560, r: 1.0, dur: 8,   delay: 1.2, driftX: 7 },
          { x: 640, y: 620, r: 1.2, dur: 6.8, delay: 0.6, driftX: -9 },
          { x: 460, y: 240, r: 0.9, dur: 9,   delay: 0.4, driftX: 6 },
          { x: 740, y: 280, r: 1.0, dur: 8.5, delay: 1.3, driftX: -7 },
          { x: 520, y: 360, r: 1.3, dur: 7.2, delay: 0.9, driftX: 10 },
          { x: 680, y: 420, r: 1.1, dur: 6.4, delay: 1.7, driftX: -8 },
          { x: 600, y: 480, r: 1.5, dur: 8.2, delay: 0.2, driftX: 11 },
          { x: 560, y: 540, r: 1.0, dur: 7.6, delay: 1.4, driftX: -6 },
          { x: 630, y: 600, r: 1.2, dur: 6.7, delay: 0.7, driftX: 9 },
          { x: 510, y: 660, r: 0.9, dur: 9.2, delay: 1.1, driftX: -10 },
          { x: 720, y: 660, r: 1.4, dur: 7.8, delay: 0.5, driftX: 8 },
          { x: 470, y: 510, r: 1.0, dur: 8.4, delay: 1.6, driftX: -9 },
          { x: 730, y: 380, r: 1.2, dur: 7.3, delay: 0.4, driftX: 7 },
          { x: 550, y: 700, r: 1.1, dur: 8.7, delay: 1.0, driftX: -11 },
          { x: 650, y: 740, r: 1.3, dur: 6.9, delay: 0.6, driftX: 10 },
          { x: 590, y: 200, r: 0.8, dur: 9.5, delay: 1.5, driftX: -8 },
          { x: 615, y: 260, r: 1.0, dur: 7.4, delay: 0.3, driftX: 6 },
          { x: 670, y: 320, r: 1.2, dur: 8.1, delay: 1.8, driftX: -7 },
          { x: 530, y: 580, r: 1.4, dur: 6.6, delay: 0.9, driftX: 12 },
          { x: 700, y: 580, r: 1.0, dur: 7.9, delay: 1.2, driftX: -10 },
          { x: 580, y: 780, r: 1.1, dur: 8.3, delay: 0.5, driftX: 9 },
          { x: 620, y: 820, r: 0.9, dur: 9.1, delay: 1.6, driftX: -6 },
          { x: 540, y: 820, r: 1.2, dur: 7.7, delay: 0.8, driftX: 8 },
          { x: 660, y: 720, r: 1.0, dur: 8.6, delay: 1.3, driftX: -7 },
        ].map((p, i) => (
          <circle key={`p-${i}`} cx={p.x} cy={p.y} r={p.r} fill="url(#dust-particle)">
            {/* Vertical drift upward */}
            <animate attributeName="cy"
              values={`${p.y};${p.y - 80};${p.y}`}
              dur={`${p.dur}s`}
              begin={`${p.delay}s`}
              repeatCount="indefinite"
              keyTimes="0;0.5;1"
            />
            {/* Horizontal sway (sine-like via 3 keyframes) */}
            <animate attributeName="cx"
              values={`${p.x};${p.x + p.driftX};${p.x}`}
              dur={`${p.dur * 1.3}s`}
              begin={`${p.delay}s`}
              repeatCount="indefinite"
              keyTimes="0;0.5;1"
            />
            {/* Opacity pulse — twinkling effect */}
            <animate attributeName="opacity"
              values="0.3;1;0.3"
              dur={`${p.dur * 0.8}s`}
              begin={`${p.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      {/* ========== CONSTRUCTION MARKERS ========== */}
      {/* Top-center small diamond cap */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 bg-[#C9A646]/40 pointer-events-none" aria-hidden="true" />

      {/* Corner X cross-hair markers (4 corners of the wordmark area) */}
      <div className="absolute top-[180px] left-[18%] pointer-events-none" aria-hidden="true">
        <CrossMarker />
      </div>
      <div className="absolute top-[180px] right-[18%] pointer-events-none" aria-hidden="true">
        <CrossMarker />
      </div>
      <div className="absolute top-[460px] left-[18%] pointer-events-none" aria-hidden="true">
        <CrossMarker />
      </div>
      <div className="absolute top-[460px] right-[18%] pointer-events-none" aria-hidden="true">
        <CrossMarker />
      </div>

      {/* Faint vertical guide lines that frame the wordmark */}
      <div className="absolute top-0 left-[18%] w-px h-[460px] bg-gradient-to-b from-transparent via-[#C9A646]/15 to-[#C9A646]/5 pointer-events-none" aria-hidden="true" />
      <div className="absolute top-0 right-[18%] w-px h-[460px] bg-gradient-to-b from-transparent via-[#C9A646]/15 to-[#C9A646]/5 pointer-events-none" aria-hidden="true" />
      <div className="absolute top-[180px] left-[18%] right-[18%] h-px bg-gradient-to-r from-transparent via-[#C9A646]/12 to-transparent pointer-events-none" aria-hidden="true" />
      <div className="absolute top-[460px] left-[18%] right-[18%] h-px bg-gradient-to-r from-transparent via-[#C9A646]/12 to-transparent pointer-events-none" aria-hidden="true" />

      {/* ========== CONTENT ========== */}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 relative z-10 w-full flex flex-col items-center">

        {/* Tiny "Introducing" eyebrow with flanking hairlines */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 mb-8 md:mb-10"
        >
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-[#C9A646]/50" aria-hidden="true" />
          <p className="font-sans text-[11px] text-[#C9A646]/60 font-normal tracking-[0.3em] uppercase">
            Introducing
          </p>
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-[#C9A646]/50" aria-hidden="true" />
        </motion.div>

        {/* MASSIVE FINOTAUR — solid filled gradient, lit-from-above */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.1, ease: 'easeOut' }}
          className="font-wordmark font-medium text-center leading-[0.92] tracking-[-0.04em] mb-10 md:mb-14 select-none text-[clamp(40px,12vw,70px)] max-w-[90vw] md:text-[clamp(70px,10vw,160px)] md:max-w-[55vw]"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 230, 160, 1) 0%, rgba(230, 195, 100, 0.98) 25%, rgba(201, 166, 70, 0.92) 60%, rgba(150, 120, 50, 0.80) 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            textShadow: '0 0 30px rgba(255, 230, 160, 0.12), 0 0 60px rgba(230, 195, 100, 0.08), 0 0 120px rgba(201, 166, 70, 0.05)',
          }}
        >
          FINOTAUR
        </motion.h1>

        {/* Subhead — refined hero subtitle, light weight, breathing line-height */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="font-sans text-center font-light"
          style={{
            fontSize: 'clamp(18px, 1.4vw, 22px)',
            lineHeight: 1.5,
            color: 'rgba(255, 255, 255, 0.75)',
            maxWidth: '560px',
            marginTop: '24px',
            marginBottom: '4px',
          }}
        >
          The institutional-grade trading platform,
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="font-sans text-center font-light"
          style={{
            fontSize: 'clamp(18px, 1.4vw, 22px)',
            lineHeight: 1.5,
            color: 'rgba(255, 255, 255, 0.75)',
            maxWidth: '560px',
            marginBottom: '40px',
          }}
        >
          powered by AI &amp; institutional research.
        </motion.p>

        {/* Primary hero CTA — right under the subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="mb-20 md:mb-28"
        >
          <Button
            variant="gold"
            size="xl"
            onClick={handleStartFree}
          >
            Start free trial
          </Button>
        </motion.div>

        {/* ========== 5-CARD CAROUSEL STAGE ========== */}
        <div
          className="relative w-full mb-12 md:mb-16 hidden md:block"
          style={{ perspective: '2000px' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative flex items-center justify-center min-h-[640px] md:min-h-[700px]">
            {cards.map((card, i) => {
              const position = getPosition(i);
              if (position === 'hidden') return null;
              return (
                <CarouselCard
                  key={card.key}
                  position={position}
                  eyebrow={card.eyebrow}
                  title={card.title}
                  tagline={card.tagline}
                  Preview={card.Preview}
                  flagship={card.flagship}
                  stats={card.stats}
                  onClick={() => setCenterIndex(i)}
                />
              );
            })}
          </div>

          {/* Dot navigation */}
          <div className="flex items-center justify-center gap-3 mt-10 md:mt-14">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => setCenterIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`transition-all duration-500 ${
                  i === centerIndex ? 'w-12 bg-[#C9A646]/90' : 'w-8 bg-[#C9A646]/20 hover:bg-[#C9A646]/40'
                }`}
                style={{ height: '2px' }}
              />
            ))}
          </div>
        </div>

        {/* Mobile fallback — single column stacked list (no carousel on mobile) */}
        <div className="md:hidden w-full max-w-md mx-auto space-y-4 mb-16">
          {cards.map((card) => (
            <CarouselCard
              key={`mobile-${card.key}`}
              position="center"
              eyebrow={card.eyebrow}
              title={card.title}
              tagline={card.tagline}
              Preview={card.Preview}
              flagship={card.flagship}
              stats={card.stats}
              mobile
            />
          ))}
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Button
            variant="gold"
            size="xl"
            onClick={handleStartFree}
          >
            Start 14-day free trial
          </Button>
          <Button
            onClick={() => navigate('/auth/login')}
            variant="outline"
            size="lg"
            className="px-8 py-6 text-[11px] font-sans uppercase tracking-[0.22em] font-medium rounded-sm border border-[#C9A646]/40 text-[#C9A646] bg-transparent hover:bg-[#C9A646]/10 transition-all"
          >
            <LogIn className="mr-2 w-4 h-4" />
            Login
          </Button>
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;
