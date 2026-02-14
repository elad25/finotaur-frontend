// src/features/options-ai/components/tabs/SqueezeDetectorTab.tsx

import { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Sparkles, Info, TrendingUp, Activity, X } from 'lucide-react';
import type { OptionsData, SqueezeCandidate, SqueezeSignal } from '../../types/options-ai.types';
import { SQUEEZE_RISK_CONFIG, SQUEEZE_SIGNAL_CONFIG } from '../../constants/options-ai.constants';
import { Card, SectionHeader, AIInsight } from '../ui';


/* ═══════════════════════════════════════════════════════════
   SCORE RING — Premium circular gauge
   ═══════════════════════════════════════════════════════════ */
const ScoreRing = memo(function ScoreRing({ score }: { score: number }) {
  const color = score >= 95 ? '#EF4444' : score >= 80 ? '#F59E0B' : '#C9A646';
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-[68px] h-[68px] shrink-0">
      <svg width="68" height="68" viewBox="0 0 68 68" className="transform -rotate-90">
        <circle cx="34" cy="34" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="34" cy="34" r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{score}</span>
        <span className="text-[7px] font-semibold uppercase tracking-widest text-[#6B6B6B]">Score</span>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   METRIC RATIONALE — Premium flowing explanation tooltip
   ═══════════════════════════════════════════════════════════ */
const METRIC_RATIONALE: Record<string, string> = {
  callWallOI: 'Dense call OI creates a "wall." When price approaches, dealers must buy shares to hedge, creating self-reinforcing buying pressure.',
  gexValue: 'Negative GEX = dealers short gamma. They chase price directionally, amplifying any rally toward the call wall.',
  shortInterest: 'High SI adds fuel. Rising price forces shorts to cover (buy), pushing price higher — dual squeeze with gamma.',
  callVolSpike: 'Surging call volume forces dealers to delta-hedge by purchasing shares immediately.',
  putCallRatio: 'Low P/C = heavy call skew. Intensifies dealer hedging obligations and gamma exposure.',
  floatSize: 'Smaller float = fewer shares. Dealer hedging + short covering in limited supply = outsized price moves.',
};

/* ═══════════════════════════════════════════════════════════
   COMPACT METRIC — with premium flowing tooltip
   ═══════════════════════════════════════════════════════════ */
const CompactMetric = memo(function CompactMetric({ label, value, intensity, rationaleKey }: {
  label: string; value: string; intensity: 'high' | 'medium' | 'low'; rationaleKey?: string;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const color = intensity === 'high' ? '#C9A646' : intensity === 'medium' ? '#8B8B8B' : '#555';
  const rationale = rationaleKey ? METRIC_RATIONALE[rationaleKey] : null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          <span className="text-[11px] text-[#6B6B6B]">{label}</span>
          {rationale && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowWhy(!showWhy); }}
              className="group relative"
            >
              <div className="absolute inset-0 rounded-full transition-all duration-300"
                style={{
                  background: showWhy ? 'rgba(201,166,70,0.15)' : 'transparent',
                  boxShadow: showWhy ? '0 0 8px rgba(201,166,70,0.2)' : 'none',
                  transform: 'scale(2.2)',
                }}
              />
              <Info className="w-3 h-3 relative z-10 transition-all duration-300"
                style={{ color: showWhy ? '#C9A646' : '#555' }}
              />
            </button>
          )}
        </div>
        <span className="text-sm font-semibold" style={{ color: intensity === 'high' ? '#E8DCC4' : '#999' }}>{value}</span>
      </div>

      <AnimatePresence>
        {showWhy && rationale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <div className="pb-3 pl-1">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.07), rgba(201,166,70,0.02), rgba(13,11,8,0.6))',
                  border: '1px solid rgba(201,166,70,0.15)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Top gold shimmer line */}
                <div
                  className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.5), rgba(244,217,123,0.3), rgba(201,166,70,0.5), transparent)' }}
                />

                {/* Subtle corner glow */}
                <div
                  className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at top left, rgba(201,166,70,0.08), transparent 70%)',
                  }}
                />

                <div className="relative px-4 py-3 flex items-start gap-3">
                  {/* Gold accent bar */}
                  <div
                    className="w-[3px] shrink-0 rounded-full self-stretch"
                    style={{ background: 'linear-gradient(180deg, #C9A646, rgba(201,166,70,0.2))' }}
                  />

                  {/* Text */}
                  <p
                    className="text-[11px] leading-[1.7] flex-1"
                    style={{ color: '#B8A88A' }}
                  >
                    {rationale}
                  </p>

                  {/* Close button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowWhy(false); }}
                    className="shrink-0 mt-0.5 opacity-30 hover:opacity-80 transition-opacity"
                  >
                    <X className="w-3 h-3 text-[#C9A646]" />
                  </button>
                </div>

                {/* Bottom subtle gold fade */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[1px]"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.1), transparent)' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   CANDIDATE CARD — Premium expandable card
   ═══════════════════════════════════════════════════════════ */
const CandidateCard = memo(function CandidateCard({ candidate, index }: { candidate: SqueezeCandidate; index: number }) {
  const risk = SQUEEZE_RISK_CONFIG[candidate.riskLevel];

  const borderColor = candidate.squeezeScore >= 90
    ? 'rgba(201,166,70,0.4)'
    : candidate.squeezeScore >= 75
      ? 'rgba(201,166,70,0.25)'
      : 'rgba(255,255,255,0.06)';

  const gexIntensity = candidate.gexStatus === 'negative' ? 'high' as const : candidate.gexStatus === 'neutral' ? 'medium' as const : 'low' as const;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.4 }}>
      <div
        className="relative rounded-2xl overflow-hidden transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(13,11,8,0.98), rgba(21,18,16,0.95))',
          border: `1px solid ${borderColor}`,
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
          background: candidate.squeezeScore >= 90
            ? 'linear-gradient(90deg, transparent, #C9A646, #F4D97B, #C9A646, transparent)'
            : 'linear-gradient(90deg, transparent, rgba(201,166,70,0.5), transparent)',
        }} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-5">
            <ScoreRing score={candidate.squeezeScore} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-xl font-bold text-white tracking-tight">{candidate.symbol}</span>
                <span className="text-sm text-[#8B8B8B] font-medium">{'$'}{candidate.currentPrice}</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider" style={{
                  background: `${risk.color}12`,
                  border: `1px solid ${risk.color}25`,
                  color: risk.color,
                }}>{risk.label}</span>
              </div>
              <div className="flex items-center gap-5 text-xs text-[#6B6B6B]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
                  Wall: <span className="text-[#E8DCC4] font-medium">{'$'}{candidate.nearestCallWall}</span>
                  <span className="text-[#555]">({candidate.distanceToWall.toFixed(1)}%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: candidate.shortInterest > 15 ? '#F59E0B' : '#555' }} />
                  SI: <span className="font-medium" style={{ color: candidate.shortInterest > 15 ? '#F59E0B' : '#8B8B8B' }}>{candidate.shortInterest}%</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: candidate.gexStatus === 'negative' ? '#F59E0B' : '#555' }} />
                  GEX: <span className="font-medium" style={{ color: candidate.gexStatus === 'negative' ? '#E8DCC4' : '#8B8B8B' }}>{candidate.gexStatus}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Content — always visible */}
          <div className="mt-6 space-y-5">
              {/* Current Price — prominent */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.06), rgba(201,166,70,0.02))',
                border: '1px solid rgba(201,166,70,0.15)',
              }}>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold" style={{
                    background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>{'$'}{candidate.currentPrice.toFixed(2)}</span>
                  <span className="text-xs text-[#6B6B6B]">Current Price</span>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <div className="text-right">
                    <div className="text-[9px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Call Wall</div>
                    <span className="text-sm font-bold text-[#E8DCC4]">{'$'}{candidate.nearestCallWall}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Distance</div>
                    <span className="text-sm font-bold" style={{ color: candidate.distanceToWall < 3 ? '#F59E0B' : candidate.distanceToWall < 7 ? '#C9A646' : '#8B8B8B' }}>
                      {candidate.distanceToWall.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">GEX</div>
                    <span className="text-sm font-bold" style={{ color: candidate.gexStatus === 'negative' ? '#F59E0B' : '#8B8B8B' }}>
                      {candidate.gexValue}B
                    </span>
                  </div>
                </div>
              </div>
              {/* Compact metrics — two columns */}
              <div className="grid grid-cols-2 gap-x-8 divide-y divide-white/[0.04]" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="divide-y divide-white/[0.04]">
                  <CompactMetric rationaleKey="callWallOI" label="Call Wall OI" value={candidate.callWallOI.toLocaleString()}
                    intensity={candidate.callWallOI > 100000 ? 'high' : candidate.callWallOI > 50000 ? 'medium' : 'low'} />
                  <CompactMetric rationaleKey="gexValue" label="GEX Exposure" value={`${candidate.gexValue > 0 ? '+' : ''}${candidate.gexValue}B`}
                    intensity={gexIntensity} />
                  <CompactMetric rationaleKey="shortInterest" label="Short Interest" value={`${candidate.shortInterest}%`}
                    intensity={candidate.shortInterest > 15 ? 'high' : candidate.shortInterest > 8 ? 'medium' : 'low'} />
                </div>
                <div className="divide-y divide-white/[0.04]">
                  <CompactMetric rationaleKey="callVolSpike" label="Call Vol Spike" value={`${candidate.callVolumeSpike}x`}
                    intensity={candidate.callVolumeSpike > 3 ? 'high' : candidate.callVolumeSpike > 1.5 ? 'medium' : 'low'} />
                  <CompactMetric rationaleKey="putCallRatio" label="P/C Ratio" value={candidate.putCallRatio.toFixed(2)}
                    intensity={candidate.putCallRatio < 0.5 ? 'high' : candidate.putCallRatio < 0.7 ? 'medium' : 'low'} />
                  <CompactMetric rationaleKey="floatSize" label="Float" value={candidate.floatSize.charAt(0).toUpperCase() + candidate.floatSize.slice(1)}
                    intensity={candidate.floatSize === 'small' ? 'high' : candidate.floatSize === 'medium' ? 'medium' : 'low'} />
                </div>
              </div>

              {/* Distance to Wall — compact inline */}
              <div className="pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#6B6B6B] whitespace-nowrap">{'$'}{candidate.currentPrice}</span>
                  <div className="flex-1 relative h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-[#C9A646]" />
                    <div className="h-full rounded-full" style={{
                      width: `${Math.max(100 - candidate.distanceToWall * 5, 8)}%`,
                      background: 'linear-gradient(90deg, rgba(201,166,70,0.3), #C9A646)',
                    }} />
                  </div>
                  <span className="text-[10px] text-[#C9A646] font-semibold whitespace-nowrap">{'$'}{candidate.nearestCallWall}</span>
                  <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: candidate.distanceToWall < 5 ? '#F59E0B' : '#8B8B8B' }}>
                    {candidate.distanceToWall.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* ── Trigger Price Line ── */}
              <div className="relative p-4 rounded-xl overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.08), rgba(244,217,123,0.03))',
                border: '1px solid rgba(201,166,70,0.25)',
              }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #C9A646, #F4D97B, #C9A646, transparent)' }} />
                <div className="flex items-center gap-4">
                  <div className="shrink-0 flex flex-col items-center">
                    <span className="text-[9px] text-[#C9A646] font-bold uppercase tracking-widest mb-1">Trigger</span>
                    <span className="text-2xl font-bold" style={{
                      background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>{'$'}{candidate.triggerPrice}</span>
                  </div>
                  <div className="w-px h-10 bg-[#C9A646]/20" />
                  <p className="text-[12px] text-[#B8A88A] leading-relaxed flex-1">{candidate.triggerReason}</p>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="relative p-5 rounded-xl" style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.04), rgba(201,166,70,0.01))',
                border: '1px solid rgba(201,166,70,0.15)',
              }}>
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-gradient-to-b from-[#C9A646] to-transparent" />
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-[#C9A646]" />
                  <span className="text-[10px] text-[#C9A646] font-bold uppercase tracking-widest">What we're seeing</span>
                </div>
                <p className="text-[13px] text-[#E8DCC4] leading-[1.7]">{candidate.aiInsight}</p>
              </div>

              {/* What could trigger the move — premium chips */}
              <div>
                <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider font-semibold mb-3">What Could Trigger The Move</div>
                <div className="flex flex-wrap gap-2">
                  {candidate.bullishCatalysts.slice(0, 3).map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-medium" style={{
                      background: 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(244,217,123,0.04))',
                      border: '1px solid rgba(201,166,70,0.2)',
                      color: '#E8DCC4',
                      boxShadow: '0 0 12px rgba(201,166,70,0.06)',
                    }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />{c}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-medium" style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(244,217,123,0.04))',
                    border: '1px solid rgba(201,166,70,0.2)',
                    color: '#E8DCC4',
                    boxShadow: '0 0 12px rgba(201,166,70,0.06)',
                  }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />Positive news catalyst
                  </span>
                </div>
              </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════
   SIGNAL CARD
   ═══════════════════════════════════════════════════════════ */
const SignalCard = memo(function SignalCard({ signal, index }: { signal: SqueezeSignal; index: number }) {
  const cfg = SQUEEZE_SIGNAL_CONFIG[signal.type];
  const severity = signal.severity === 'critical'
    ? { color: '#F59E0B', bg: 'rgba(245,158,11,0.06)' }
    : signal.severity === 'high'
      ? { color: '#C9A646', bg: 'rgba(201,166,70,0.04)' }
      : { color: '#8B8B8B', bg: 'rgba(255,255,255,0.02)' };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
      <div className="relative p-5 rounded-xl transition-all" style={{
        background: severity.bg,
        border: `1px solid ${severity.color}15`,
      }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}20` }}>
            <Activity className="w-4 h-4" style={{ color: cfg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider" style={{ background: `${cfg.color}12`, color: cfg.color }}>{cfg.label}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase" style={{ background: `${severity.color}10`, color: severity.color }}>{signal.severity}</span>
              <span className="text-[10px] text-[#555]">{signal.timestamp}</span>
            </div>
            <h4 className="text-sm font-semibold text-white mb-2">{signal.title}</h4>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">{signal.description}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════
   GEX REGIME PANEL
   ═══════════════════════════════════════════════════════════ */
const GexRegimePanel = memo(function GexRegimePanel({ data }: { data: OptionsData }) {
  const gex = data.squeezeDetector.marketGexStatus;
  const isNeg = gex.regime === 'negative_gamma';
  const regimeColor = isNeg ? '#F59E0B' : gex.regime === 'positive_gamma' ? '#22C55E' : '#C9A646';

  return (
    <div className="space-y-6">
      <div className="text-center p-8 rounded-xl" style={{
        background: 'linear-gradient(135deg, rgba(201,166,70,0.06), rgba(201,166,70,0.02))',
        border: '1px solid rgba(201,166,70,0.15)',
      }}>
        <div className="text-[10px] text-[#6B6B6B] uppercase tracking-widest mb-3">Current Market Gamma Regime</div>
        <div className="text-3xl font-bold mb-2" style={{ color: regimeColor }}>
          {isNeg ? 'Negative Gamma' : gex.regime === 'positive_gamma' ? 'Positive Gamma' : 'Neutral'}
        </div>
        <p className="text-sm text-[#8B8B8B] max-w-lg mx-auto">
          {isNeg
            ? 'Dealers are net short gamma across the market. They must chase price in both directions, creating an environment where squeezes are more likely to sustain and accelerate.'
            : gex.regime === 'positive_gamma'
              ? 'Dealers are net long gamma. They naturally dampen moves by selling rallies and buying dips. Individual squeezes face headwinds from market structure.'
              : 'Balanced dealer positioning. Squeezes depend entirely on individual stock setups rather than macro gamma flows.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[{ label: 'SPY GEX', value: gex.spyGex }, { label: 'QQQ GEX', value: gex.qqyGex }].map(item => {
          const neg = item.value < 0;
          return (
            <Card key={item.label}>
              <div className="relative p-6">
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
                  background: neg
                    ? 'linear-gradient(90deg, transparent, #F59E0B, #C9A646, transparent)'
                    : 'linear-gradient(90deg, transparent, #22C55E, transparent)',
                }} />
                <div className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">{item.label}</div>
                <div className="text-3xl font-bold" style={{ color: neg ? '#F59E0B' : '#22C55E' }}>
                  {item.value > 0 ? '+' : ''}{item.value}B
                </div>
                <p className="text-xs text-[#6B6B6B] mt-2 leading-relaxed">
                  {neg
                    ? 'Short gamma — market makers amplify directional moves. Squeezes benefit from this structural tailwind.'
                    : 'Long gamma — market makers absorb directional moves. This dampens squeeze momentum.'}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="p-6">
          <h4 className="text-sm font-semibold text-white mb-4">How Gamma Exposure Affects Squeeze Probability</h4>
          <div className="space-y-3">
            {[
              {
                regime: 'Negative Gamma',
                icon: '⚡',
                color: '#F59E0B',
                summary: 'Amplifies moves — squeeze-friendly',
                detail: 'When dealers are short gamma, they must buy as price rises and sell as it falls. For gamma squeezes, this means every tick higher forces additional dealer buying, creating a self-reinforcing loop. Combined with short covering, this produces the most explosive moves.',
              },
              {
                regime: 'Neutral',
                icon: '⚖️',
                color: '#C9A646',
                summary: 'No macro bias — individual setups matter',
                detail: 'In neutral gamma, the broader market structure neither helps nor hinders squeezes. Success depends entirely on stock-specific factors: OI concentration, short interest, float, and volume dynamics. Focus on the highest-scoring individual candidates.',
              },
              {
                regime: 'Positive Gamma',
                icon: '🛡️',
                color: '#22C55E',
                summary: 'Dampens moves — squeeze headwinds',
                detail: 'Positive gamma means dealers sell rallies and buy dips, naturally dampening volatility. Gamma squeezes must overcome this structural resistance. Only the most extreme setups (very high OI concentration + high SI + tiny float) can generate enough force.',
              },
            ].map(item => (
              <div key={item.regime} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]" style={{ borderLeft: `3px solid ${item.color}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm font-semibold" style={{ color: item.color }}>{item.regime}</span>
                  <span className="text-[10px] text-[#555] ml-1">&mdash; {item.summary}</span>
                </div>
                <p className="text-xs text-[#A0A0A0] leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <AIInsight label="AI GEX Regime Analysis">{gex.interpretation}</AIInsight>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════ */
export const SqueezeDetectorTab = memo(function SqueezeDetectorTab({ data }: { data: OptionsData }) {
  const sq = data.squeezeDetector;

  const sortedCandidates = useMemo(() =>
    [...sq.candidates].sort((a, b) => b.squeezeScore - a.squeezeScore),
    [sq.candidates]
  );

  const highProb = useMemo(() => sq.candidates.filter(c => c.squeezeScore >= 85).length, [sq.candidates]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 md:p-8">
          <SectionHeader icon={Flame} title="Gamma Squeeze Detector" subtitle="Options mechanics identifying explosive move potential" iconBg="gold" />

          <div className="space-y-4 mt-6">
            {sortedCandidates.map((c, i) => <CandidateCard key={c.id} candidate={c} index={i} />)}
          </div>
        </div>
      </Card>

      <AIInsight label="Bottom Line">
        {[
          `We're tracking ${highProb} setups that look particularly interesting right now.`,
          sq.marketGexStatus.regime === 'negative_gamma'
            ? 'The broader market is in negative gamma, which means dealers are working against themselves — that\u2019s the kind of backdrop where squeezes actually have legs.'
            : 'The broader market gamma is neutral-to-positive, so any squeeze needs strong stock-specific mechanics to work.',
          sortedCandidates[0] ? `${sortedCandidates[0].symbol} stands out — score of ${sortedCandidates[0].squeezeScore} with a massive call wall at $${sortedCandidates[0].nearestCallWall} that\u2019s only ${sortedCandidates[0].distanceToWall.toFixed(1)}% away from current price.` : '',
          sortedCandidates[0]?.shortInterest > 15 ? `Add in ${sortedCandidates[0].shortInterest}% short interest and you\u2019ve got both gamma and short squeeze mechanics feeding each other.` : '',
          'The best setups are where everything lines up: big OI near price, negative GEX, rising call volume, and a wall that\u2019s within reach.',
        ].filter(Boolean).join(' ')}
      </AIInsight>
    </div>
  );
});