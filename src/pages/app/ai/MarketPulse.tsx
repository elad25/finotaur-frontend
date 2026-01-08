import { useState } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Gauge,
  Zap,
  Send,
  Sparkles,
  Globe,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import {
  AIPageContainer,
  AIPageHeader,
  Drawer,
  COLORS,
  UserMode
} from "./AIDesignSystem";

// ============================================
// TYPES
// ============================================
interface LiveNarrative {
  id: string;
  title: string;
  description: string;
  evidence: string[];
  watchNext: string;
  strength: 'strong' | 'moderate' | 'emerging';
}

interface CrossAsset {
  name: string;
  symbol: string;
  change: number;
  aiNote: string;
}

interface UnusualMove {
  type: 'sector' | 'stock' | 'breadth';
  title: string;
  detail: string;
  significance: 'high' | 'medium';
}

interface ExplainResponse {
  symbol: string;
  primaryDriver: string;
  secondaryDriver: string;
  whatInvalidates: string;
}

// ============================================
// MOCK DATA
// ============================================
const PULSE_SCORE = {
  value: 35,
  label: 'Risk-Off',
  confidence: 78,
  change: -12
};

const LIVE_NARRATIVES: LiveNarrative[] = [
  {
    id: '1',
    title: 'Rates Driving Everything',
    description: '10Y yield backup is the primary driver today. Every asset class trading off rate expectations.',
    evidence: ['10Y yield +8bps to 4.42%', 'Growth vs Value ratio down 1.2%', 'TLT down 0.9%', 'Rate-sensitive sectors lagging'],
    watchNext: 'Fed Williams speech at 11AM - could accelerate or reverse move',
    strength: 'strong'
  },
  {
    id: '2',
    title: 'Megacaps Diverging from Indices',
    description: 'MAG7 showing unusual dispersion. AAPL/MSFT holding while NVDA/TSLA lag significantly.',
    evidence: ['NVDA -3.2% vs QQQ -1.1%', 'AAPL +0.3% (defensive bid)', 'Internal divergence widest since October'],
    watchNext: 'Watch if AAPL can hold gains - signals quality rotation',
    strength: 'moderate'
  },
  {
    id: '3',
    title: 'Energy Bid on Geopolitics',
    description: 'Oil above $78 providing tailwind to energy sector. Defensive + inflation hedge appeal.',
    evidence: ['WTI crude +2.1%', 'XLE +2.3%, best performing sector', 'Energy options skew bullish'],
    watchNext: 'Middle East headlines and inventory data tomorrow',
    strength: 'strong'
  }
];

const CROSS_ASSETS: CrossAsset[] = [
  { name: 'Equities', symbol: 'SPY', change: -0.82, aiNote: 'Risk-off on ISM inflation spike' },
  { name: 'Bonds', symbol: 'TLT', change: -0.95, aiNote: 'Rate backup hurting duration' },
  { name: 'Dollar', symbol: 'DXY', change: 0.45, aiNote: 'Hawkish Fed repricing supports USD' },
  { name: 'Oil', symbol: 'CL', change: 2.12, aiNote: 'Geopolitical premium building' },
  { name: 'Gold', symbol: 'GLD', change: 0.18, aiNote: 'Modest safe haven bid' },
  { name: 'Crypto', symbol: 'BTC', change: -2.45, aiNote: 'Risk-off hitting risk assets' }
];

const UNUSUAL_MOVES: UnusualMove[] = [
  { type: 'sector', title: 'Utilities unusually strong (+1.1%)', detail: 'Defensive rotation despite rising rates. Suggests fear > rate sensitivity today.', significance: 'high' },
  { type: 'stock', title: 'SMCI gaps up 8% without clear news', detail: 'Options flow heavy. Possible leak or positioning ahead of announcement.', significance: 'high' },
  { type: 'breadth', title: 'Breadth divergence: SPY down but A/D positive', detail: 'Large caps selling while small caps catching bid. Rotation, not liquidation.', significance: 'medium' },
  { type: 'stock', title: 'BA down 4% on volume 3x average', detail: 'Institutional selling detected. No headline but heavy block trades.', significance: 'medium' }
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function MarketPulseAI() {
  const [userMode, setUserMode] = useState<UserMode>({
    type: 'trader',
    horizon: '1D',
    risk: 'balanced',
    universe: 'US'
  });
  const [explainQuery, setExplainQuery] = useState('');
  const [explainResponse, setExplainResponse] = useState<ExplainResponse | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [selectedNarrative, setSelectedNarrative] = useState<LiveNarrative | null>(null);

  const handleExplain = () => {
    if (!explainQuery.trim()) return;
    setIsExplaining(true);
    setTimeout(() => {
      setExplainResponse({
        symbol: explainQuery.toUpperCase(),
        primaryDriver: 'ISM Services data came in hot (54.1 vs 52.5 expected). The prices paid component spiked to 64.2, highest since February. This reprices Fed rate cut expectations.',
        secondaryDriver: 'Sector rotation from growth to value. As a high-duration tech name, it is particularly sensitive to rate expectations.',
        whatInvalidates: 'If Fed Williams (11AM) signals concern about growth over inflation, rates could reverse and support growth stocks.'
      });
      setIsExplaining(false);
    }, 1500);
  };

  const PulseScoreGauge = () => {
    const rotation = (PULSE_SCORE.value / 100) * 180 - 90;
    return (
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 24, textAlign: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Gauge size={20} style={{ color: COLORS.gold }} />Market Pulse Score
        </h3>
        <div style={{ position: 'relative', width: 200, height: 120, margin: '0 auto 20px' }}>
          <svg width="200" height="120" viewBox="0 0 200 120">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={COLORS.bearish} />
                <stop offset="50%" stopColor={COLORS.mediumImpact} />
                <stop offset="100%" stopColor={COLORS.bullish} />
              </linearGradient>
            </defs>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGradient)" strokeWidth="12" strokeLinecap="round" />
            <line x1="100" y1="100" x2="100" y2="30" stroke={COLORS.textPrimary} strokeWidth="3" strokeLinecap="round" transform={`rotate(${rotation} 100 100)`} />
            <circle cx="100" cy="100" r="8" fill={COLORS.gold} />
          </svg>
          <div style={{ position: 'absolute', bottom: 0, left: 10, fontSize: 10, color: COLORS.bearish }}>Risk-Off</div>
          <div style={{ position: 'absolute', bottom: 0, right: 10, fontSize: 10, color: COLORS.bullish }}>Risk-On</div>
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, color: PULSE_SCORE.value < 40 ? COLORS.bearish : PULSE_SCORE.value > 60 ? COLORS.bullish : COLORS.mediumImpact }}>{PULSE_SCORE.value}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: PULSE_SCORE.value < 40 ? COLORS.bearishBg : COLORS.bullishBg, borderRadius: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: PULSE_SCORE.value < 40 ? COLORS.bearish : COLORS.bullish }}>{PULSE_SCORE.label}</span>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>({PULSE_SCORE.confidence}% confidence)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13, color: PULSE_SCORE.change < 0 ? COLORS.bearish : COLORS.bullish }}>
          {PULSE_SCORE.change < 0 ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
          {PULSE_SCORE.change > 0 ? '+' : ''}{PULSE_SCORE.change} from yesterday
        </div>
      </div>
    );
  };

  const NarrativeCard = ({ narrative }: { narrative: LiveNarrative }) => {
    const strengthColors = { strong: COLORS.highImpact, moderate: COLORS.mediumImpact, emerging: COLORS.neutral };
    return (
      <div onClick={() => setSelectedNarrative(narrative)} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{narrative.title}</h4>
          <span style={{ padding: '3px 8px', background: `${strengthColors[narrative.strength]}15`, borderRadius: 4, fontSize: 10, fontWeight: 600, color: strengthColors[narrative.strength], textTransform: 'uppercase' }}>{narrative.strength}</span>
        </div>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>{narrative.description}</p>
        <div style={{ marginBottom: 16 }}>
          {narrative.evidence.slice(0, 2).map((ev, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>
              <span style={{ color: COLORS.gold }}>•</span>{ev}
            </div>
          ))}
        </div>
        <div style={{ padding: 10, background: COLORS.bgInput, borderRadius: 8, fontSize: 11, color: COLORS.textMuted }}>
          <span style={{ color: COLORS.gold, fontWeight: 600 }}>Watch: </span>{narrative.watchNext}
        </div>
      </div>
    );
  };

  return (
    <AIPageContainer>
      <AIPageHeader title="Market Pulse AI" subtitle="What's Moving and Why — Right Now" icon={Activity} iconColor={COLORS.bullish} userMode={userMode} onUserModeChange={setUserMode} onExportPDF={() => {}} onFeedback={() => {}} />

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, marginBottom: 32 }}>
        <PulseScoreGauge />
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={20} style={{ color: COLORS.mediumImpact }} />Live Narratives
            <span style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 400, marginLeft: 8 }}>What's driving the market right now</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {LIVE_NARRATIVES.map((narrative) => <NarrativeCard key={narrative.id} narrative={narrative} />)}
          </div>
        </div>
      </div>

      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20, marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={18} style={{ color: COLORS.neutral }} />Cross-Asset Glance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {CROSS_ASSETS.map((asset, idx) => (
            <div key={idx} style={{ padding: 14, background: COLORS.bgInput, borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>{asset.name}</div>
              <div style={{ fontSize: 12, color: COLORS.gold, fontWeight: 600, marginBottom: 6 }}>{asset.symbol}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: asset.change >= 0 ? COLORS.bullish : COLORS.bearish, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {asset.change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 6, lineHeight: 1.3 }}>{asset.aiNote}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ color: COLORS.mediumImpact }} />Unusual Moves
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {UNUSUAL_MOVES.map((move, idx) => (
              <div key={idx} style={{ padding: 14, background: move.significance === 'high' ? COLORS.highImpactBg : COLORS.bgInput, border: `1px solid ${move.significance === 'high' ? COLORS.highImpactBorder : COLORS.border}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ padding: '2px 6px', background: COLORS.bgCard, borderRadius: 4, fontSize: 9, color: COLORS.textDim, textTransform: 'uppercase' }}>{move.type}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{move.title}</span>
                  </div>
                  {move.significance === 'high' && <AlertTriangle size={14} style={{ color: COLORS.highImpact }} />}
                </div>
                <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>{move.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: `linear-gradient(135deg, ${COLORS.bgCard}, rgba(199, 169, 61, 0.03))`, border: `1px solid ${COLORS.borderGold}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={18} style={{ color: COLORS.gold }} />Explain This Move
          </h3>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>Enter any ticker to understand why it's moving today</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input type="text" value={explainQuery} onChange={(e) => setExplainQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleExplain()} placeholder="e.g., NVDA, TSLA, SPY..." style={{ flex: 1, padding: '14px 16px', background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.textPrimary, fontSize: 14 }} />
            <button onClick={handleExplain} disabled={!explainQuery.trim() || isExplaining} style={{ padding: '14px 20px', background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 600, cursor: explainQuery.trim() && !isExplaining ? 'pointer' : 'not-allowed', opacity: explainQuery.trim() && !isExplaining ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              {isExplaining ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}Explain
            </button>
          </div>
          {explainResponse && (
            <div style={{ padding: 20, background: COLORS.bgInput, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Sparkles size={16} style={{ color: COLORS.gold }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.gold }}>{explainResponse.symbol}</span>
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>Analysis</span>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>PRIMARY DRIVER</div>
                <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>{explainResponse.primaryDriver}</p>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>SECONDARY DRIVER</div>
                <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>{explainResponse.secondaryDriver}</p>
              </div>
              <div style={{ padding: 12, background: 'rgba(249, 115, 22, 0.08)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: COLORS.mediumImpact, marginBottom: 4 }}>WHAT INVALIDATES THIS</div>
                <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>{explainResponse.whatInvalidates}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Drawer isOpen={!!selectedNarrative} onClose={() => setSelectedNarrative(null)} title={selectedNarrative?.title || ''} width={500}>
        {selectedNarrative && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 8 }}>FULL ANALYSIS</div>
              <p style={{ fontSize: 15, color: COLORS.textPrimary, margin: 0, lineHeight: 1.7 }}>{selectedNarrative.description}</p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 12 }}>EVIDENCE</div>
              {selectedNarrative.evidence.map((ev, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: COLORS.bgInput, borderRadius: 8, marginBottom: 8 }}>
                  <span style={{ color: COLORS.gold }}>•</span>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{ev}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: 16, background: 'rgba(199, 169, 61, 0.1)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: COLORS.gold }}>
                <Sparkles size={14} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>WHAT TO WATCH NEXT</span>
              </div>
              <p style={{ fontSize: 14, color: COLORS.textPrimary, margin: 0, lineHeight: 1.6 }}>{selectedNarrative.watchNext}</p>
            </div>
          </div>
        )}
      </Drawer>
    </AIPageContainer>
  );
}