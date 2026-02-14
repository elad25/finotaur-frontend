// =====================================================
// 🏆 BREAKOUT TAB - Alpha Opportunities
// =====================================================

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Award, Zap, CheckCircle2, Calendar, Info,
  TrendingUp, TrendingDown, Target, AlertCircle, XCircle, Eye
} from 'lucide-react';
import { Sector, BreakoutCandidate } from '../types';
import { Card, ScoreBar, SignalBadge, colors } from '../ui';
import { cn } from '../utils';

// =====================================================
// 📋 BREAKOUT CRITERIA
// =====================================================

const BreakoutCriteria = memo(() => (
  <Card>
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Target className="h-5 w-5 text-[#C9A646]" />
        <h3 className="text-lg font-bold text-white">Breakout Scanner Criteria</h3>
      </div>
      <p className="text-sm text-[#8B8B8B] mb-4">How we identify breakout candidates:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          'Low sector correlation (< 0.60) = independent mover',
          'FINOTAUR Score > 80',
          'Technical setup (consolidation, volume accumulation)',
          'Fundamental catalyst in next 90 days',
          'Positive insider activity or institutional accumulation',
        ].map((criteria, i) => (
          <div
            key={i}
            className="flex items-start gap-2 p-3 rounded-lg"
            style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}
          >
            <CheckCircle2 className="h-4 w-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#E8DCC4]">{criteria}</span>
          </div>
        ))}
      </div>
    </div>
  </Card>
));

BreakoutCriteria.displayName = 'BreakoutCriteria';

// =====================================================
// ⚡ SECTOR DIVERGER — Decoupled from sector, news-driven
// =====================================================

interface SectorDivergerProps {
  candidate: BreakoutCandidate;
  sectorName: string;
}

const SectorDiverger = memo<SectorDivergerProps>(({ candidate: c, sectorName }) => (
  <Card highlight>
    <div className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <Zap className="h-6 w-6 text-[#F59E0B]" />
        <h3 className="text-xl font-bold text-[#F59E0B]">Sector Diverger</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 ml-2">
          DECOUPLED
        </span>
      </div>

      <div
        className="rounded-xl p-5"
        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245,158,11,0.15)' }}
      >
        {/* Ticker Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl font-bold text-white">{c.ticker}</span>
              <span className="text-lg text-[#8B8B8B]">{c.name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span>
                <span className="text-[#6B6B6B]">Score: </span>
                <span className="font-bold text-[#22C55E]">{c.score}/100</span>
              </span>
              <span>
                <span className="text-[#6B6B6B]">Correlation: </span>
                <span className="font-bold text-[#F59E0B]">{c.correlation.toFixed(2)}</span>
              </span>
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <AlertCircle className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-sm font-bold text-[#F59E0B]">INDEPENDENT MOVER</span>
          </div>
        </div>

        {/* AI Diverger Analysis */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">AI Analysis — Why It's In A Different Sentiment</span>
          </div>
          <p className="text-sm text-[#E8DCC4] leading-relaxed whitespace-pre-line">
            {c.aiDivergerAnalysis || (c.fundamentalEdge && c.fundamentalEdge.length > 0
              ? c.fundamentalEdge.join('. ') + '.'
              : c.reasons.join('. ') + '.')}
          </p>
        </div>

        {/* Key Data Points */}
        {c.catalysts && c.catalysts.length > 0 && (
          <div className="space-y-2 mb-4">
            {c.catalysts.map((cat, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-[#C9A646]" />
                <span className="text-[#8B8B8B]">{cat.date}:</span>
                <span className="text-[#E8DCC4]">{cat.event}</span>
              </div>
            ))}
          </div>
        )}

        {/* Divergence Insight */}
        <div
          className="rounded-lg p-3"
          style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}
        >
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#E8DCC4]">
              <span className="font-semibold text-[#F59E0B]">Low Correlation ({c.correlation.toFixed(2)}): </span>
              {c.ticker} is moving independently of {sectorName} — company-specific catalysts are stronger than sector gravity.
            </span>
          </div>
        </div>
      </div>
    </div>
  </Card>
));

SectorDiverger.displayName = 'SectorDiverger';

// =====================================================
// 👑 SECTOR LEADER — Pulling the sector, fundamental story
// =====================================================

interface SectorLeaderProps {
  sector: Sector;
  aiLeaderAnalysis?: string;
}

const SectorLeader = memo<SectorLeaderProps>(({ sector, aiLeaderAnalysis }) => {
  // Find highest-score holding as the sector leader — exclude the Diverger
  const divergerTicker = sector.breakoutCandidate?.ticker;
  const leader = [...sector.topHoldings]
    .filter(h => h.ticker !== divergerTicker)
    .sort((a, b) => b.score - a.score)[0];
  if (!leader) return null;

  // Build fundamental story from sector context
  const positivesTrends = sector.industryTrends?.filter(t => t.impact === 'Positive') || [];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="h-6 w-6 text-[#22C55E]" />
          <h3 className="text-xl font-bold text-[#22C55E]">Sector Leader</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 ml-2">
            PULLING THE SECTOR
          </span>
        </div>

        <div
          className="rounded-xl p-5"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,197,94,0.15)' }}
        >
          {/* Ticker Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-white">{leader.ticker}</span>
                <span className="text-lg text-[#8B8B8B]">{leader.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>
                  <span className="text-[#6B6B6B]">Score: </span>
                  <span className="font-bold text-[#22C55E]">{leader.score}/100</span>
                </span>
                <span>
                  <span className="text-[#6B6B6B]">Weight: </span>
                  <span className="font-bold text-[#C9A646]">{leader.weight}%</span>
                </span>
                <span>
                  <span className="text-[#6B6B6B]">Change: </span>
                  <span className={cn('font-bold', leader.change >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
                    {leader.change >= 0 ? '+' : ''}{leader.change}%
                  </span>
                </span>
              </div>
            </div>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <Award className="h-4 w-4 text-[#22C55E]" />
              <span className="text-sm font-bold text-[#22C55E]">SECTOR DRIVER</span>
            </div>
          </div>

          {/* AI Fundamental Story */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-[#22C55E]" />
              <span className="text-xs font-bold text-[#22C55E] uppercase tracking-wider">AI Analysis — Why This Stock Leads</span>
            </div>
            <p className="text-sm text-[#E8DCC4] leading-relaxed whitespace-pre-line">
              {aiLeaderAnalysis || (
                `${leader.ticker} commands ${leader.weight}% of ${sector.name} with a FINOTAUR score of ${leader.score}/100.` +
                (positivesTrends.length > 0
                  ? ` The key driver: ${positivesTrends[0].description}. ${positivesTrends.length > 1 ? positivesTrends[1].description + '.' : ''}`
                  : ` Dominant positioning and execution advantage within ${sector.name} makes this the stock to ride when the sector moves.`)
              )}
            </p>
          </div>

          {/* Sector Tailwinds */}
          {positivesTrends.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#C9A646] uppercase tracking-wider mb-2">Sector Tailwinds Benefiting {leader.ticker}</h4>
              {positivesTrends.map((trend, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#22C55E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-[#E8DCC4]">
                    <span className="font-semibold text-white">{trend.trend}: </span>
                    {trend.description}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Why Ride This Stock */}
          <div
            className="rounded-lg p-3 mt-4"
            style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}
          >
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-[#E8DCC4]">
                <span className="font-semibold text-[#22C55E]">Why Ride It: </span>
                At {leader.weight}% sector weight, {leader.ticker} IS the sector. When {sector.name} rallies, this stock leads the charge.
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

SectorLeader.displayName = 'SectorLeader';

// =====================================================
// 📋 SECONDARY CANDIDATES (WATCHLIST)
// =====================================================

interface SecondaryCandidatesProps {
  candidates?: { ticker: string; name: string; score: number; correlation: number; reason: string; status: string }[];
}

const SecondaryCandidates = memo<SecondaryCandidatesProps>(({ candidates }) => {
  // Default watchlist if none provided
  const watchlist = candidates || [
    { ticker: 'PANW', name: 'Palo Alto Networks', score: 82, correlation: 0.58, reason: 'Cybersec peer, not yet breaking out', status: '⏳ WATCH' },
    { ticker: 'NOW', name: 'ServiceNow', score: 79, correlation: 0.61, reason: 'AI workflow play, needs earnings confirm', status: '⏳ WATCH' },
    { ticker: 'PLTR', name: 'Palantir', score: 75, correlation: 0.48, reason: 'Very low correlation, gov contracts growing', status: '⏳ WATCH' },
  ];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Eye className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Secondary Candidates (Watchlist)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-[#6B6B6B] uppercase border-b border-[#C9A646]/10">
                <th className="text-left py-2 px-3">Ticker</th>
                <th className="text-center py-2 px-3">Score</th>
                <th className="text-center py-2 px-3">Corr.</th>
                <th className="text-left py-2 px-3">Why on Watchlist</th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((c, i) => (
                <motion.tr
                  key={c.ticker}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="border-b border-white/5"
                >
                  <td className="py-3 px-3">
                    <span className="font-bold text-[#C9A646]">{c.ticker}</span>
                    <span className="text-xs text-[#6B6B6B] block">{c.name}</span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span className="font-bold text-white">{c.score}</span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span className="font-bold text-[#F59E0B]">{c.correlation.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-3 text-sm text-[#8B8B8B]">{c.reason}</td>
                  <td className="text-center py-3 px-3">
                    <span className="text-sm">{c.status}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
});

SecondaryCandidates.displayName = 'SecondaryCandidates';

// =====================================================
// 🚫 ANTI-BREAKOUT (STOCKS TO AVOID)
// =====================================================

interface AntiBreakoutProps {
  stocks?: { ticker: string; name: string; score: number; correlation: number; reason: string }[];
}

const AntiBreakout = memo<AntiBreakoutProps>(({ stocks }) => {
  // Default avoid list if none provided
  const avoidList = stocks || [
    { ticker: 'INTC', name: 'Intel', score: 45, correlation: 0.41, reason: 'Negative divergence, market share loss' },
    { ticker: 'IBM', name: 'IBM', score: 52, correlation: 0.55, reason: 'Legacy business drag, slow AI transition' },
  ];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <XCircle className="h-5 w-5 text-[#EF4444]" />
          <h3 className="text-lg font-bold text-white">Anti-Breakout: Stocks to Avoid</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-[#6B6B6B] uppercase border-b border-[#C9A646]/10">
                <th className="text-left py-2 px-3">Ticker</th>
                <th className="text-center py-2 px-3">Score</th>
                <th className="text-center py-2 px-3">Corr.</th>
                <th className="text-left py-2 px-3">Why Avoid</th>
                <th className="text-center py-2 px-3">Signal</th>
              </tr>
            </thead>
            <tbody>
              {avoidList.map((s, i) => (
                <motion.tr
                  key={s.ticker}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="border-b border-white/5"
                >
                  <td className="py-3 px-3">
                    <span className="font-bold text-[#EF4444]">{s.ticker}</span>
                    <span className="text-xs text-[#6B6B6B] block">{s.name}</span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span className="font-bold text-[#EF4444]">{s.score}</span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span className="font-bold text-[#F59E0B]">{s.correlation.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-3 text-sm text-[#8B8B8B]">{s.reason}</td>
                  <td className="text-center py-3 px-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ background: 'rgba(239,68,68,0.15)', color: colors.negative }}
                    >
                      🔴 AVOID
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
});

AntiBreakout.displayName = 'AntiBreakout';

// =====================================================
// 📊 MAIN BREAKOUT TAB
// =====================================================

interface BreakoutTabProps {
  sector: Sector;
  cachedAnalysis?: any;
}

export const BreakoutTab = memo<BreakoutTabProps>(({ sector, cachedAnalysis }) => {
  const enrichedCandidate = {
    ...sector.breakoutCandidate,
    aiDivergerAnalysis: cachedAnalysis?.ai_diverger_analysis || sector.breakoutCandidate.aiDivergerAnalysis,
  };

  return (
    <div className="space-y-6">
      <SectorDiverger candidate={enrichedCandidate} sectorName={sector.name} />
      <SectorLeader sector={sector} aiLeaderAnalysis={cachedAnalysis?.ai_leader_analysis} />
    </div>
  );
});

BreakoutTab.displayName = 'BreakoutTab';

export default BreakoutTab;