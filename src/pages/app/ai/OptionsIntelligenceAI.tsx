import { useState } from 'react';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  ChevronRight,
  Eye,
  Sparkles,
  BarChart3,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Filter,
  Zap,
  Shield,
  Gauge
} from 'lucide-react';
import {
  AIPageContainer,
  AIPageHeader,
  ImpactBadge,
  Drawer,
  COLORS,
  UserMode
} from "./AIDesignSystem";

// ============================================
// TYPES
// ============================================
interface DealerPositioning {
  metric: string;
  value: string;
  status: 'positive' | 'negative' | 'neutral';
  soWhat: string;
}

interface KeyLevel {
  price: number;
  type: 'support' | 'resistance' | 'gamma_flip';
  strength: 'strong' | 'moderate' | 'weak';
  note: string;
}

interface UnusualFlow {
  symbol: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  premium: string;
  volume: number;
  openInterest: number;
  volOiRatio: number;
  sentiment: 'bullish' | 'bearish';
  aiInsight: string;
  unusualScore: number;
}

interface VolRegime {
  ivRank: number;
  ivPercentile: number;
  skew: 'call' | 'put' | 'neutral';
  termStructure: 'contango' | 'backwardation' | 'flat';
  interpretation: string;
}

// ============================================
// MOCK DATA
// ============================================
const DEALER_POSITIONING: DealerPositioning[] = [
  {
    metric: 'Net Gamma',
    value: '-$2.1B',
    status: 'negative',
    soWhat: 'Dealers are short gamma. They must sell into weakness and buy into strength, amplifying moves.'
  },
  {
    metric: 'Key Gamma Level',
    value: '5980 / 6020',
    status: 'neutral',
    soWhat: 'SPX between major gamma levels. Expect choppy action until we break one side.'
  },
  {
    metric: '0DTE Intensity',
    value: 'HIGH (65%)',
    status: 'negative',
    soWhat: '0DTE volume at 65% of total. Expect amplified intraday volatility and pin risk at round numbers.'
  }
];

const KEY_LEVELS: KeyLevel[] = [
  { price: 6020, type: 'resistance', strength: 'strong', note: 'Major call wall. Heavy gamma here will cap upside.' },
  { price: 6000, type: 'gamma_flip', strength: 'strong', note: 'Gamma flip level. Above = stable, below = volatile.' },
  { price: 5980, type: 'support', strength: 'moderate', note: 'Put support building. Should provide bounce zone.' },
  { price: 5950, type: 'support', strength: 'strong', note: 'Major put wall. Break here triggers acceleration lower.' },
  { price: 5900, type: 'support', strength: 'weak', note: 'Psychological level with light positioning.' }
];

const UNUSUAL_FLOWS: UnusualFlow[] = [
  {
    symbol: 'NVDA',
    type: 'call',
    strike: 950,
    expiry: 'Feb 21',
    premium: '$4.2M',
    volume: 12500,
    openInterest: 3200,
    volOiRatio: 3.9,
    sentiment: 'bullish',
    aiInsight: 'Large institutional bet on earnings. Buyer paying up for Feb expiry post-earnings.',
    unusualScore: 94
  },
  {
    symbol: 'SPY',
    type: 'put',
    strike: 590,
    expiry: 'Jan 17',
    premium: '$8.1M',
    volume: 45000,
    openInterest: 12000,
    volOiRatio: 3.75,
    sentiment: 'bearish',
    aiInsight: 'Hedge or directional bet. Size suggests institutional protection ahead of CPI.',
    unusualScore: 91
  },
  {
    symbol: 'TSLA',
    type: 'put',
    strike: 380,
    expiry: 'Jan 24',
    premium: '$2.8M',
    volume: 8200,
    openInterest: 1500,
    volOiRatio: 5.47,
    sentiment: 'bearish',
    aiInsight: 'Heavy put buying after Cybertruck recall news. Could be continuation of downside.',
    unusualScore: 88
  },
  {
    symbol: 'XOM',
    type: 'call',
    strike: 115,
    expiry: 'Feb 21',
    premium: '$1.9M',
    volume: 15000,
    openInterest: 4200,
    volOiRatio: 3.57,
    sentiment: 'bullish',
    aiInsight: 'Energy sector momentum play. Geopolitical tailwind thesis.',
    unusualScore: 82
  }
];

const VOL_REGIME: VolRegime = {
  ivRank: 68,
  ivPercentile: 72,
  skew: 'put',
  termStructure: 'backwardation',
  interpretation: 'Options are pricing elevated near-term risk. Put skew suggests hedging demand. Selling premium attractive but size appropriately.'
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function OptionsIntelligenceAI() {
  const [userMode, setUserMode] = useState<UserMode>({
    type: 'trader',
    horizon: '1D',
    risk: 'balanced',
    universe: 'US'
  });
  const [selectedFlow, setSelectedFlow] = useState<UnusualFlow | null>(null);
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'call' | 'put'>('all');

  const filteredFlows = UNUSUAL_FLOWS.filter(flow => {
    if (typeFilter !== 'all' && flow.type !== typeFilter) return false;
    return true;
  });

  return (
    <AIPageContainer>
      <AIPageHeader
        title="Options Intelligence AI"
        subtitle="Dealer Positioning & Flow Analysis"
        icon={Layers}
        iconColor="#8B5CF6"
        userMode={userMode}
        onUserModeChange={setUserMode}
        onExportPDF={() => {}}
        onFeedback={() => {}}
      />

      {/* ============================================ */}
      {/* DEALER POSITIONING SUMMARY */}
      {/* ============================================ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        {DEALER_POSITIONING.map((item, idx) => {
          const statusColors = {
            positive: { color: COLORS.bullish, bg: COLORS.bullishBg },
            negative: { color: COLORS.bearish, bg: COLORS.bearishBg },
            neutral: { color: COLORS.textMuted, bg: COLORS.bgInput }
          };

          return (
            <div key={idx} style={{
              background: COLORS.bgCard,
              border: `1px solid ${statusColors[item.status].color}30`,
              borderRadius: 16,
              padding: 20,
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: statusColors[item.status].color
              }} />
              
              <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 8 }}>{item.metric}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: statusColors[item.status].color, marginBottom: 12 }}>
                {item.value}
              </div>
              <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>
                {item.soWhat}
              </p>
            </div>
          );
        })}
      </div>

      {/* ============================================ */}
      {/* KEY LEVELS MAP */}
      {/* ============================================ */}
      <div style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
        padding: 24,
        marginBottom: 32
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={20} style={{ color: '#8B5CF6' }} />
          Key Levels Map
          <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 400, marginLeft: 8 }}>
            SPX Options-Based Levels
          </span>
        </h3>

        {/* Visual Level Display */}
        <div style={{ position: 'relative', padding: '20px 0' }}>
          {/* Vertical Line */}
          <div style={{
            position: 'absolute',
            left: 80,
            top: 0,
            bottom: 0,
            width: 4,
            background: `linear-gradient(180deg, ${COLORS.bullish}, ${COLORS.mediumImpact}, ${COLORS.bearish})`
          }} />

          {/* Levels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {KEY_LEVELS.map((level, idx) => {
              const typeConfig = {
                resistance: { color: COLORS.bearish, label: 'RESISTANCE', icon: TrendingDown },
                support: { color: COLORS.bullish, label: 'SUPPORT', icon: TrendingUp },
                gamma_flip: { color: COLORS.mediumImpact, label: 'GAMMA FLIP', icon: Activity }
              };
              
              const strengthConfig = {
                strong: { width: '100%', label: 'Strong' },
                moderate: { width: '66%', label: 'Moderate' },
                weak: { width: '33%', label: 'Weak' }
              };

              const config = typeConfig[level.type];
              const Icon = config.icon;

              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  paddingLeft: 100
                }}>
                  {/* Price */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    width: 70,
                    textAlign: 'right',
                    fontSize: 16,
                    fontWeight: 700,
                    color: config.color
                  }}>
                    {level.price}
                  </div>

                  {/* Dot on line */}
                  <div style={{
                    position: 'absolute',
                    left: 74,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: config.color,
                    border: '3px solid #0D1117'
                  }} />

                  {/* Level Info */}
                  <div style={{
                    flex: 1,
                    padding: 14,
                    background: `${config.color}10`,
                    border: `1px solid ${config.color}30`,
                    borderRadius: 10
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={16} style={{ color: config.color }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: config.color }}>{config.label}</span>
                      </div>
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 4,
                        fontSize: 10,
                        color: COLORS.textMuted
                      }}>
                        {strengthConfig[level.strength].label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: 0, lineHeight: 1.4 }}>
                      {level.note}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
          {[
            { label: 'Resistance', color: COLORS.bearish },
            { label: 'Gamma Flip', color: COLORS.mediumImpact },
            { label: 'Support', color: COLORS.bullish }
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color }} />
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* UNUSUAL OPTIONS FLOW */}
      {/* ============================================ */}
      <div style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
        padding: 24,
        marginBottom: 32
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={20} style={{ color: COLORS.mediumImpact }} />
            Unusual Options Flow
          </h3>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'call', 'put'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                style={{
                  padding: '6px 14px',
                  background: typeFilter === type ? 'rgba(199, 169, 61, 0.15)' : 'transparent',
                  border: `1px solid ${typeFilter === type ? COLORS.borderGold : COLORS.border}`,
                  borderRadius: 6,
                  color: typeFilter === type ? COLORS.gold : COLORS.textMuted,
                  fontSize: 12,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {type === 'all' ? 'All' : type + 's'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredFlows.map((flow, idx) => (
            <div 
              key={idx}
              onClick={() => setSelectedFlow(flow)}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 100px 120px 100px 80px 1fr',
                gap: 16,
                alignItems: 'center',
                padding: 16,
                background: COLORS.bgInput,
                border: `1px solid ${flow.sentiment === 'bullish' ? COLORS.bullishBorder : COLORS.bearishBorder}`,
                borderRadius: 12,
                cursor: 'pointer'
              }}
            >
              {/* Symbol & Type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.gold }}>{flow.symbol}</span>
                <span style={{
                  padding: '3px 8px',
                  background: flow.type === 'call' ? COLORS.bullishBg : COLORS.bearishBg,
                  color: flow.type === 'call' ? COLORS.bullish : COLORS.bearish,
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}>
                  {flow.type}
                </span>
              </div>

              {/* Strike & Expiry */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>${flow.strike}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{flow.expiry}</div>
              </div>

              {/* Premium & Volume */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.bullish }}>{flow.premium}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>Vol: {flow.volume.toLocaleString()}</div>
              </div>

              {/* Vol/OI */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: flow.volOiRatio > 3 ? COLORS.mediumImpact : COLORS.textMuted }}>
                  {flow.volOiRatio.toFixed(2)}x
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>Vol/OI</div>
              </div>

              {/* Score */}
              <div style={{
                padding: '6px 12px',
                background: flow.unusualScore >= 90 ? COLORS.highImpactBg : flow.unusualScore >= 80 ? COLORS.mediumImpactBg : COLORS.noiseBg,
                color: flow.unusualScore >= 90 ? COLORS.highImpact : flow.unusualScore >= 80 ? COLORS.mediumImpact : COLORS.textMuted,
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'center'
              }}>
                {flow.unusualScore}
              </div>

              {/* AI Insight Preview */}
              <div style={{
                padding: 10,
                background: 'rgba(199, 169, 61, 0.05)',
                borderRadius: 8,
                borderLeft: `3px solid ${COLORS.gold}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Sparkles size={10} style={{ color: COLORS.gold }} />
                  <span style={{ fontSize: 9, color: COLORS.gold, fontWeight: 600 }}>AI INSIGHT</span>
                </div>
                <p style={{ fontSize: 11, color: COLORS.textMuted, margin: 0, lineHeight: 1.3 }}>
                  {flow.aiInsight}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* VOL REGIME */}
      {/* ============================================ */}
      <div style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
        padding: 24
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gauge size={20} style={{ color: COLORS.neutral }} />
          Volatility Regime
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20 }}>
          {/* IV Rank */}
          <div style={{ padding: 16, background: COLORS.bgInput, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>IV Rank</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: VOL_REGIME.ivRank > 50 ? COLORS.mediumImpact : COLORS.textMuted }}>
              {VOL_REGIME.ivRank}
            </div>
            <div style={{ height: 4, background: COLORS.border, borderRadius: 2, marginTop: 8 }}>
              <div style={{ height: '100%', width: `${VOL_REGIME.ivRank}%`, background: VOL_REGIME.ivRank > 50 ? COLORS.mediumImpact : COLORS.bullish, borderRadius: 2 }} />
            </div>
          </div>

          {/* IV Percentile */}
          <div style={{ padding: 16, background: COLORS.bgInput, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>IV Percentile</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: VOL_REGIME.ivPercentile > 50 ? COLORS.mediumImpact : COLORS.textMuted }}>
              {VOL_REGIME.ivPercentile}%
            </div>
          </div>

          {/* Skew */}
          <div style={{ padding: 16, background: COLORS.bgInput, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>Skew</div>
            <div style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              color: VOL_REGIME.skew === 'put' ? COLORS.bearish : VOL_REGIME.skew === 'call' ? COLORS.bullish : COLORS.textMuted,
              textTransform: 'capitalize'
            }}>
              {VOL_REGIME.skew} Heavy
            </div>
          </div>

          {/* Term Structure */}
          <div style={{ padding: 16, background: COLORS.bgInput, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>Term Structure</div>
            <div style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              color: VOL_REGIME.termStructure === 'backwardation' ? COLORS.bearish : COLORS.textMuted,
              textTransform: 'capitalize'
            }}>
              {VOL_REGIME.termStructure}
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div style={{
          padding: 16,
          background: 'rgba(199, 169, 61, 0.05)',
          borderRadius: 12,
          borderLeft: `4px solid ${COLORS.gold}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Sparkles size={14} style={{ color: COLORS.gold }} />
            <span style={{ fontSize: 12, color: COLORS.gold, fontWeight: 600 }}>AI INTERPRETATION</span>
          </div>
          <p style={{ fontSize: 14, color: COLORS.textPrimary, margin: 0, lineHeight: 1.6 }}>
            {VOL_REGIME.interpretation}
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* FLOW DETAIL DRAWER */}
      {/* ============================================ */}
      <Drawer isOpen={!!selectedFlow} onClose={() => setSelectedFlow(null)} title={`${selectedFlow?.symbol} Flow Analysis`} width={480}>
        {selectedFlow && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <span style={{
                padding: '6px 14px',
                background: selectedFlow.type === 'call' ? COLORS.bullishBg : COLORS.bearishBg,
                border: `1px solid ${selectedFlow.type === 'call' ? COLORS.bullishBorder : COLORS.bearishBorder}`,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: selectedFlow.type === 'call' ? COLORS.bullish : COLORS.bearish,
                textTransform: 'uppercase'
              }}>
                {selectedFlow.type}
              </span>
              <span style={{
                padding: '6px 14px',
                background: selectedFlow.sentiment === 'bullish' ? COLORS.bullishBg : COLORS.bearishBg,
                border: `1px solid ${selectedFlow.sentiment === 'bullish' ? COLORS.bullishBorder : COLORS.bearishBorder}`,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: selectedFlow.sentiment === 'bullish' ? COLORS.bullish : COLORS.bearish,
                textTransform: 'capitalize'
              }}>
                {selectedFlow.sentiment} Sentiment
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 14, background: COLORS.bgInput, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>Strike</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>${selectedFlow.strike}</div>
              </div>
              <div style={{ padding: 14, background: COLORS.bgInput, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>Expiry</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedFlow.expiry}</div>
              </div>
              <div style={{ padding: 14, background: COLORS.bgInput, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>Premium</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.bullish }}>{selectedFlow.premium}</div>
              </div>
              <div style={{ padding: 14, background: COLORS.bgInput, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>Vol/OI Ratio</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.mediumImpact }}>{selectedFlow.volOiRatio.toFixed(2)}x</div>
              </div>
            </div>

            <div style={{ padding: 16, background: 'rgba(199, 169, 61, 0.1)', borderRadius: 12, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={14} style={{ color: COLORS.gold }} />
                <span style={{ fontSize: 12, color: COLORS.gold, fontWeight: 600 }}>AI INSIGHT</span>
              </div>
              <p style={{ fontSize: 14, color: COLORS.textPrimary, margin: 0, lineHeight: 1.6 }}>
                {selectedFlow.aiInsight}
              </p>
            </div>

            <button style={{
              width: '100%',
              padding: '14px',
              background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
              border: 'none',
              borderRadius: 10,
              color: '#000',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              Add to Watchlist
            </button>
          </div>
        )}
      </Drawer>
    </AIPageContainer>
  );
}