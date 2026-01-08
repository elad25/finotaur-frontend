import { useState } from 'react';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Bell
} from 'lucide-react';
import { AIPageContainer, AIPageHeader, COLORS, UserMode  } from "./AIDesignSystem";

// Types
interface LeaderLaggard {
  symbol: string;
  name: string;
  momentumScore: number;
  change1D: number;
  change1W: number;
  aiReasonTag: string;
  aiReason: string;
}

interface SectorStrength {
  name: string;
  etf: string;
  strength: 'strong' | 'neutral' | 'weak';
  change: number;
  note: string;
}

interface WakingUp {
  symbol: string;
  name: string;
  catalyst: string;
  whyNow: string;
  whatInvalidates: string;
}

interface RegimeShift {
  type: string;
  title: string;
  description: string;
  evidence: string[];
  actionImplication: string;
}

// Mock Data
const LEADERS: LeaderLaggard[] = [
  { symbol: 'XOM', name: 'Exxon Mobil', momentumScore: 92, change1D: 4.26, change1W: 8.2, aiReasonTag: 'Macro', aiReason: 'Oil rally + inflation hedge bid' },
  { symbol: 'CVX', name: 'Chevron', momentumScore: 89, change1D: 3.8, change1W: 7.5, aiReasonTag: 'Sector', aiReason: 'Energy sector rotation' },
  { symbol: 'LLY', name: 'Eli Lilly', momentumScore: 87, change1D: 2.1, change1W: 5.8, aiReasonTag: 'Earnings', aiReason: 'GLP-1 demand + pipeline' },
  { symbol: 'JPM', name: 'JPMorgan', momentumScore: 85, change1D: 1.5, change1W: 4.2, aiReasonTag: 'Macro', aiReason: 'Higher-for-longer NII boost' },
  { symbol: 'CAT', name: 'Caterpillar', momentumScore: 82, change1D: 1.9, change1W: 3.8, aiReasonTag: 'Rotation', aiReason: 'Cyclical rotation play' }
];

const LAGGARDS: LeaderLaggard[] = [
  { symbol: 'NVDA', name: 'NVIDIA', momentumScore: 28, change1D: -3.2, change1W: -5.8, aiReasonTag: 'Rotation', aiReason: 'Growth to value + rate sensitivity' },
  { symbol: 'TSLA', name: 'Tesla', momentumScore: 32, change1D: -2.8, change1W: -6.2, aiReasonTag: 'News', aiReason: 'Recall news + China concerns' },
  { symbol: 'COIN', name: 'Coinbase', momentumScore: 25, change1D: -5.2, change1W: -12.4, aiReasonTag: 'Macro', aiReason: 'Risk-off hitting crypto' },
  { symbol: 'O', name: 'Realty Income', momentumScore: 35, change1D: -2.1, change1W: -4.5, aiReasonTag: 'Macro', aiReason: 'Rate sensitivity + REIT pressure' },
  { symbol: 'MRNA', name: 'Moderna', momentumScore: 30, change1D: -4.5, change1W: -8.8, aiReasonTag: 'Earnings', aiReason: 'Flu vaccine miss + guidance cut' }
];

const SECTOR_GRID: SectorStrength[] = [
  { name: 'Energy', etf: 'XLE', strength: 'strong', change: 2.34, note: 'Geopolitics + inflation hedge' },
  { name: 'Financials', etf: 'XLF', strength: 'strong', change: 0.85, note: 'Rate repricing beneficiary' },
  { name: 'Healthcare', etf: 'XLV', strength: 'strong', change: 0.62, note: 'Defensive quality bid' },
  { name: 'Industrials', etf: 'XLI', strength: 'neutral', change: 0.28, note: 'Mixed signals' },
  { name: 'Materials', etf: 'XLB', strength: 'neutral', change: 0.15, note: 'Commodity dependent' },
  { name: 'Staples', etf: 'XLP', strength: 'neutral', change: -0.12, note: 'Defensive but rate sensitive' },
  { name: 'Comm Svcs', etf: 'XLC', strength: 'neutral', change: -0.35, note: 'Mixed megacap' },
  { name: 'Cons Disc', etf: 'XLY', strength: 'weak', change: -0.92, note: 'TSLA dragging' },
  { name: 'Technology', etf: 'XLK', strength: 'weak', change: -1.45, note: 'Rate sensitivity' },
  { name: 'Real Estate', etf: 'XLRE', strength: 'weak', change: -1.82, note: 'Rate backup' },
  { name: 'Utilities', etf: 'XLU', strength: 'weak', change: -0.65, note: 'Bond proxy' }
];

const WAKING_UP: WakingUp[] = [
  { symbol: 'GS', name: 'Goldman Sachs', catalyst: 'Earnings + rate repricing', whyNow: 'Trading revenue expected to beat', whatInvalidates: 'ISM weakness spreading' },
  { symbol: 'FCX', name: 'Freeport-McMoRan', catalyst: 'Copper + China PMI', whyNow: 'China recovery + EV demand', whatInvalidates: 'Dollar strength' },
  { symbol: 'UNH', name: 'UnitedHealth', catalyst: 'Healthcare rotation', whyNow: 'Quality rotation + oversold', whatInvalidates: 'Policy risk headlines' }
];

const REGIME_SHIFTS: RegimeShift[] = [
  { type: 'trend', title: 'Growth Trend Weakening', description: 'Multi-month growth leadership showing cracks.', evidence: ['QQQ/SPY at 20-day low', 'Growth -1.2% vs Value +0.8%', 'Semis breadth down'], actionImplication: 'Trim growth, rotate to quality value' },
  { type: 'vol', title: 'Vol Regime Shifting', description: 'VIX term structure inverted.', evidence: ['Term structure inverted', 'Realized vol up', '0DTE at highs'], actionImplication: 'Reduce size, expect wider ranges' },
  { type: 'rotation', title: 'Rotation Accelerating', description: 'Money flowing to rate beneficiaries.', evidence: ['Energy +2.3% vs Tech -1.5%', 'Financials outperforming', 'IWD/IWF breaking out'], actionImplication: 'OW energy, financials. UW tech' }
];

export default function MomentumRegimeLab() {
  const [userMode, setUserMode] = useState<UserMode>({ type: 'trader', horizon: '1W', risk: 'balanced', universe: 'US' });

  const LeaderLaggardTable = ({ data, type }: { data: LeaderLaggard[]; type: 'leader' | 'laggard' }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((item, idx) => (
        <div key={idx} style={{
          display: 'grid', gridTemplateColumns: '130px 70px 70px 70px 1fr', gap: 12, alignItems: 'center', padding: 12,
          background: COLORS.bgInput, borderRadius: 10, border: `1px solid ${type === 'leader' ? COLORS.bullishBorder : COLORS.bearishBorder}`
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.gold }}>{item.symbol}</div>
            <div style={{ fontSize: 10, color: COLORS.textMuted }}>{item.name}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: item.momentumScore > 50 ? COLORS.bullish : COLORS.bearish }}>{item.momentumScore}</div>
            <div style={{ fontSize: 9, color: COLORS.textDim }}>Score</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: item.change1D >= 0 ? COLORS.bullish : COLORS.bearish }}>
              {item.change1D >= 0 ? '+' : ''}{item.change1D.toFixed(1)}%
            </div>
            <div style={{ fontSize: 9, color: COLORS.textDim }}>1D</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: item.change1W >= 0 ? COLORS.bullish : COLORS.bearish }}>
              {item.change1W >= 0 ? '+' : ''}{item.change1W.toFixed(1)}%
            </div>
            <div style={{ fontSize: 9, color: COLORS.textDim }}>1W</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '3px 8px', background: COLORS.bgCard, borderRadius: 4, fontSize: 10, color: COLORS.gold }}>{item.aiReasonTag}</span>
            <span style={{ fontSize: 11, color: COLORS.textMuted }}>{item.aiReason}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <AIPageContainer>
      <AIPageHeader title="Momentum & Regime Lab" subtitle="Who's Strong, Who's Weak — Before Everyone Else" icon={LineChart} iconColor={COLORS.technology} userMode={userMode} onUserModeChange={setUserMode} onExportPDF={() => {}} onFeedback={() => {}} />

      {/* Leaders & Laggards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.bullishBorder}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={20} style={{ color: COLORS.bullish }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: COLORS.bullish }}>Leaders</h3>
          </div>
          <LeaderLaggardTable data={LEADERS} type="leader" />
        </div>
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.bearishBorder}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingDown size={20} style={{ color: COLORS.bearish }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: COLORS.bearish }}>Laggards</h3>
          </div>
          <LeaderLaggardTable data={LAGGARDS} type="laggard" />
        </div>
      </div>

      {/* Sector Strength Grid */}
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={20} style={{ color: COLORS.gold }} />Sector Strength Grid
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {SECTOR_GRID.map((sector, idx) => {
            const strengthConfig = {
              strong: { bg: COLORS.bullishBg, border: COLORS.bullishBorder, color: COLORS.bullish, icon: ArrowUpRight },
              neutral: { bg: COLORS.bgInput, border: COLORS.border, color: COLORS.textMuted, icon: Activity },
              weak: { bg: COLORS.bearishBg, border: COLORS.bearishBorder, color: COLORS.bearish, icon: ArrowDownRight }
            };
            const config = strengthConfig[sector.strength];
            const Icon = config.icon;
            return (
              <div key={idx} style={{ padding: 14, background: config.bg, border: `1px solid ${config.border}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{sector.name}</span>
                  <span style={{ fontSize: 11, color: COLORS.gold }}>{sector.etf}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Icon size={16} style={{ color: config.color }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: config.color }}>
                    {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%
                  </span>
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted }}>{sector.note}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wake-Up List + Regime Shifts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Wake-Up */}
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.borderGold}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} style={{ color: COLORS.gold }} />Assets Waking Up
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {WAKING_UP.map((item, idx) => (
              <div key={idx} style={{ padding: 16, background: COLORS.bgInput, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.gold }}>{item.symbol}</span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>{item.name}</span>
                </div>
                <div style={{ fontSize: 12, color: COLORS.bullish, marginBottom: 8 }}>{item.catalyst}</div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: COLORS.textDim }}>WHY NOW</div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{item.whyNow}</div>
                </div>
                <div style={{ padding: 8, background: COLORS.highImpactBg, borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: COLORS.highImpact }}>INVALIDATES</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{item.whatInvalidates}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regime Shifts */}
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={18} style={{ color: COLORS.mediumImpact }} />Regime Shift Detector
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {REGIME_SHIFTS.map((shift, idx) => (
              <div key={idx} style={{ padding: 16, background: COLORS.mediumImpactBg, borderRadius: 12, border: `1px solid ${COLORS.mediumImpactBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertTriangle size={16} style={{ color: COLORS.mediumImpact }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.mediumImpact }}>{shift.title}</span>
                </div>
                <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: '0 0 12px', lineHeight: 1.5 }}>{shift.description}</p>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 4 }}>EVIDENCE</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {shift.evidence.map((ev, i) => (
                      <span key={i} style={{ padding: '3px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, fontSize: 10, color: COLORS.textMuted }}>{ev}</span>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 10, background: 'rgba(199, 169, 61, 0.1)', borderRadius: 8, borderLeft: `3px solid ${COLORS.gold}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Sparkles size={10} style={{ color: COLORS.gold }} />
                    <span style={{ fontSize: 9, color: COLORS.gold, fontWeight: 600 }}>ACTION</span>
                  </div>
                  <p style={{ fontSize: 11, color: COLORS.textPrimary, margin: 0 }}>{shift.actionImplication}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AIPageContainer>
  );
}