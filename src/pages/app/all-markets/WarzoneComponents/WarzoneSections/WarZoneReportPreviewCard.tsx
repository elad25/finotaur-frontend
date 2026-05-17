/**
 * WarZoneReportPreviewCard — locked-preview card mirroring TopSecret's DNA.
 *
 * Direct visual transplant of the TOP SECRET signature card (see
 * `src/pages/app/TopSecret/TopSecretLanding.tsx` ReportPreviewCard, lines
 * 283–428), adapted for WAR ZONE content:
 *   - Header: F monogram + FINOTAUR + WAR ZONE eyebrow + LIVE badge
 *   - Report title: Today's date + delivered tag
 *   - 3-tile metrics grid (Posture / SPX Level / Market Bias)
 *   - Chart placeholder with gold gradient SVG
 *   - Trade-ideas teaser with placeholder bars
 *   - Blur + lock overlay with "Unlock Today's Briefing"
 */

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Lock } from "lucide-react";

export default function WarZoneReportPreviewCard() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const issuedStr = `Issued ${today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="relative">
      {/* Glow Effect Behind */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(201,166,70,0.3) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Report Card */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 20, rotateY: -5 }}
        animate={{ opacity: 1, y: 0, rotateY: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #151515 0%, #0A0A0A 100%)",
            border: "1px solid rgba(201,166,70,0.3)",
            boxShadow:
              "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 60px rgba(201,166,70,0.1)",
          }}
        >
          {/* Report Header */}
          <div
            className="p-5 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(201,166,70,0.2)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)",
                }}
              >
                <span className="text-black font-bold text-sm">F</span>
              </div>
              <div>
                <p className="text-white font-bold leading-tight">FINOTAUR</p>
                <p className="text-[#C9A646] text-xs font-semibold tracking-wider">
                  WAR ZONE
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[#C9A646] text-xs font-semibold tracking-wider">
                LIVE
              </span>
            </div>
          </div>

          {/* Report Content Preview */}
          <div className="p-6">
            {/* Report Title */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400 text-sm font-semibold">
                  Daily Market Intelligence Briefing
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{dateStr}</h3>
              <p className="text-slate-500 text-sm">{issuedStr} · 9:00 AM ET</p>
            </div>

            {/* Key Metrics Preview */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-400 text-xs font-semibold mb-1">
                  Posture
                </p>
                <p className="text-white text-xl font-bold">BULLISH</p>
                <p className="text-emerald-400 text-xs">Conviction 72</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-400 text-xs font-semibold mb-1">
                  SPX Level
                </p>
                <p className="text-white text-xl font-bold">7,050</p>
                <p className="text-blue-400 text-xs">Breakout watch</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-400 text-xs font-semibold mb-1">
                  Market Bias
                </p>
                <p className="text-white text-xl font-bold">RISK ON</p>
                <p className="text-amber-400 text-xs">Tech leading</p>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div
              className="h-32 rounded-xl mb-4 relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.02) 100%)",
              }}
            >
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 128">
                <defs>
                  <linearGradient id="warzoneChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#C9A646" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#C9A646" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,90 Q50,80 100,75 T200,55 T300,40 T400,25"
                  fill="none"
                  stroke="#C9A646"
                  strokeWidth="2"
                />
                <path
                  d="M0,90 Q50,80 100,75 T200,55 T300,40 T400,25 L400,128 L0,128 Z"
                  fill="url(#warzoneChartGradient)"
                />
              </svg>
              <div className="absolute bottom-2 right-2 text-xs text-[#C9A646]/60">
                Conviction trend · last 14 days
              </div>
            </div>

            {/* Editorial sections teaser */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold text-sm">
                  Today's Sections
                </span>
                <span className="text-[#C9A646] text-xs">6 sections inside</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded bg-white/10" />
                <div className="h-2 w-4/5 rounded bg-white/10" />
                <div className="h-2 w-3/5 rounded bg-white/10" />
              </div>
            </div>
          </div>

          {/* Blur Overlay — locked preview */}
          <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-center pb-8">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background:
                    "linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)",
                  boxShadow: "0 0 40px rgba(201,166,70,0.5)",
                }}
              >
                <Lock className="w-8 h-8 text-black" />
              </div>
              <p className="text-white font-bold text-lg mb-1">
                Unlock Today's Briefing
              </p>
              <p className="text-slate-400 text-sm">
                7-day free trial · cancel anytime
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
