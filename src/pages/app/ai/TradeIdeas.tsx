import { useState } from 'react';
import {
  Crosshair,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Target,
  Zap,
  Brain,
  Shield,
  Clock,
  BarChart3,
  Sparkles,
  FileText,
  RefreshCw,
  ArrowRight,
  Check,
  X,
  HelpCircle,
  Gauge
} from 'lucide-react';
import {
  AIPageContainer,
  AIPageHeader,
  COLORS,
  UserMode
} from "./AIDesignSystem";

// ============================================
// TYPES
// ============================================
type MarketRegime = 'trend' | 'chop' | 'vol-spike';
type TacticStatus = 'works' | 'risky' | 'avoid';

interface RegimeData {
  type: MarketRegime;
  confidence: number;
  description: string;
  bestTactics: string[];
  worstTactics: string[];
  reason: string;
}

interface StrategyFit {
  name: string;
  status: TacticStatus;
  note: string;
}

interface ChecklistItem {
  id: string;
  question: string;
  checked: boolean;
  importance: 'critical' | 'important' | 'nice';
}

// ============================================
// MOCK DATA
// ============================================
const CURRENT_REGIME: RegimeData = {
  type: 'chop',
  confidence: 82,
  description: 'Markets in indecisive chop mode with elevated volatility. Range-bound action expected with frequent false breakouts.',
  bestTactics: ['Mean reversion', 'Sell premium', 'Fade extremes', 'Reduce size'],
  worstTactics: ['Breakout plays', 'Momentum chasing', 'Full position sizing', 'Holding overnight'],
  reason: 'VIX term structure inverted + ISM uncertainty + Fed speaker risk = expect whipsaw action'
};

const STRATEGY_FIT_BOARD: StrategyFit[] = [
  { name: 'Mean Reversion', status: 'works', note: 'Range-bound markets favor fading extremes' },
  { name: 'Selling Premium', status: 'works', note: 'Elevated IV makes premium attractive' },
  { name: 'Support/Resistance Plays', status: 'works', note: 'Clear levels holding - trade the range' },
  { name: 'Pullback Buying', status: 'risky', note: 'Pullbacks less reliable in chop' },
  { name: 'Breakout Trading', status: 'avoid', note: '3 failed breakouts yesterday - high failure rate' },
  { name: 'Momentum/Trend Following', status: 'avoid', note: 'No clear trend to follow - will get chopped' },
  { name: 'Gap Fills', status: 'risky', note: 'Gaps filling but timing difficult' },
  { name: 'Overnight Holds', status: 'avoid', note: 'Event risk too high - gap risk elevated' }
];

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: '1', question: 'Is volatility expanding or contracting?', checked: false, importance: 'critical' },
  { id: '2', question: 'Does breadth confirm index direction?', checked: false, importance: 'critical' },
  { id: '3', question: 'Is there a macro event within 2 hours?', checked: false, importance: 'critical' },
  { id: '4', question: 'Is volume above average?', checked: false, importance: 'important' },
  { id: '5', question: 'Are sectors rotating or moving together?', checked: false, importance: 'important' },
  { id: '6', question: 'Is the VIX term structure normal?', checked: false, importance: 'important' },
  { id: '7', question: 'Is my setup at a key technical level?', checked: false, importance: 'nice' },
  { id: '8', question: 'Is sentiment extremely bullish or bearish?', checked: false, importance: 'nice' }
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function TradeContextEngine() {
  const [userMode, setUserMode] = useState<UserMode>({
    type: 'trader',
    horizon: '1D',
    risk: 'balanced',
    universe: 'US'
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const getChecklistScore = () => {
    const critical = checklist.filter(c => c.importance === 'critical');
    const criticalChecked = critical.filter(c => c.checked).length;
    const important = checklist.filter(c => c.importance === 'important');
    const importantChecked = important.filter(c => c.checked).length;
    
    return { criticalChecked, criticalTotal: critical.length, importantChecked, importantTotal: important.length };
  };

  const regimeColors = {
    trend: { color: COLORS.bullish, bg: COLORS.bullishBg, border: COLORS.bullishBorder },
    chop: { color: COLORS.mediumImpact, bg: COLORS.mediumImpactBg, border: COLORS.mediumImpactBorder },
    'vol-spike': { color: COLORS.highImpact, bg: COLORS.highImpactBg, border: COLORS.highImpactBorder }
  };

  const regimeLabels = {
    trend: 'Trending',
    chop: 'Choppy / Range-Bound',
    'vol-spike': 'Volatility Spike'
  };

  const statusConfig = {
    works: { icon: CheckCircle2, color: COLORS.bullish, bg: COLORS.bullishBg, label: 'Works Now ✅' },
    risky: { icon: AlertTriangle, color: COLORS.mediumImpact, bg: COLORS.mediumImpactBg, label: 'Risky ⚠️' },
    avoid: { icon: XCircle, color: COLORS.highImpact, bg: COLORS.highImpactBg, label: 'Avoid ❌' }
  };

  return (
    <AIPageContainer>
      <AIPageHeader
        title="Trade Context Engine"
        subtitle="Know What Game to Play Today"
        icon={Crosshair}
        iconColor={COLORS.technology}
        userMode={userMode}
        onUserModeChange={setUserMode}
        onExportPDF={() => {}}
        onSaveToJournal={() => {}}
        onFeedback={() => {}}
      />

      {/* ============================================ */}
      {/* MARKET REGIME TODAY - HERO CARD */}
      {/* ============================================ */}
      <div style={{
        background: regimeColors[CURRENT_REGIME.type].bg,
        border: `2px solid ${regimeColors[CURRENT_REGIME.type].border}`,
        borderRadius: 24,
        padding: 32,
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 300,
          height: 300,
          background: `radial-gradient(circle, ${regimeColors[CURRENT_REGIME.type].color}15 0%, transparent 70%)`,
          borderRadius: '50%'
        }} />

        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {/* Left - Regime Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: `${regimeColors[CURRENT_REGIME.type].color}20`,
                border: `2px solid ${regimeColors[CURRENT_REGIME.type].color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {CURRENT_REGIME.type === 'trend' && <TrendingUp size={28} style={{ color: regimeColors[CURRENT_REGIME.type].color }} />}
                {CURRENT_REGIME.type === 'chop' && <Activity size={28} style={{ color: regimeColors[CURRENT_REGIME.type].color }} />}
                {CURRENT_REGIME.type === 'vol-spike' && <Zap size={28} style={{ color: regimeColors[CURRENT_REGIME.type].color }} />}
              </div>
              <div>
                <div style={{ fontSize: 12, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Market Regime Today
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: regimeColors[CURRENT_REGIME.type].color }}>
                  {regimeLabels[CURRENT_REGIME.type]}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Gauge size={16} style={{ color: COLORS.textMuted }} />
              <span style={{ fontSize: 13, color: COLORS.textMuted }}>Confidence:</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: regimeColors[CURRENT_REGIME.type].color }}>
                {CURRENT_REGIME.confidence}%
              </span>
            </div>

            <p style={{ fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.7, margin: '0 0 24px' }}>
              {CURRENT_REGIME.description}
            </p>

            <div style={{
              padding: 16,
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 12,
              borderLeft: `4px solid ${regimeColors[CURRENT_REGIME.type].color}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Brain size={14} style={{ color: COLORS.gold }} />
                <span style={{ fontSize: 12, color: COLORS.gold, fontWeight: 600 }}>WHY THIS REGIME</span>
              </div>
              <p style={{ fontSize: 13, color: COLORS.textPrimary, margin: 0, lineHeight: 1.5 }}>
                {CURRENT_REGIME.reason}
              </p>
            </div>
          </div>

          {/* Right - Best/Worst Tactics */}
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 20 }}>
            {/* Best Tactics */}
            <div style={{
              padding: 20,
              background: COLORS.bullishBg,
              borderRadius: 16,
              border: `1px solid ${COLORS.bullishBorder}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <CheckCircle2 size={18} style={{ color: COLORS.bullish }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.bullish }}>Best Tactics</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CURRENT_REGIME.bestTactics.map((tactic, idx) => (
                  <span key={idx} style={{
                    padding: '8px 14px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    borderRadius: 8,
                    fontSize: 13,
                    color: COLORS.textPrimary,
                    fontWeight: 500
                  }}>
                    {tactic}
                  </span>
                ))}
              </div>
            </div>

            {/* Worst Tactics */}
            <div style={{
              padding: 20,
              background: COLORS.bearishBg,
              borderRadius: 16,
              border: `1px solid ${COLORS.bearishBorder}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <XCircle size={18} style={{ color: COLORS.bearish }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.bearish }}>Worst Tactics</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CURRENT_REGIME.worstTactics.map((tactic, idx) => (
                  <span key={idx} style={{
                    padding: '8px 14px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    borderRadius: 8,
                    fontSize: 13,
                    color: COLORS.textPrimary,
                    fontWeight: 500
                  }}>
                    {tactic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* STRATEGY FIT BOARD */}
      {/* ============================================ */}
      <div style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
        padding: 24,
        marginBottom: 32
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={20} style={{ color: COLORS.gold }} />
          Strategy Fit Board
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {/* Works Now */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle2 size={18} style={{ color: COLORS.bullish }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.bullish }}>Works Now ✅</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STRATEGY_FIT_BOARD.filter(s => s.status === 'works').map((strategy, idx) => (
                <div key={idx} style={{
                  padding: 14,
                  background: COLORS.bullishBg,
                  border: `1px solid ${COLORS.bullishBorder}`,
                  borderRadius: 10
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{strategy.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>{strategy.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Risky */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AlertTriangle size={18} style={{ color: COLORS.mediumImpact }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.mediumImpact }}>Risky ⚠️</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STRATEGY_FIT_BOARD.filter(s => s.status === 'risky').map((strategy, idx) => (
                <div key={idx} style={{
                  padding: 14,
                  background: COLORS.mediumImpactBg,
                  border: `1px solid ${COLORS.mediumImpactBorder}`,
                  borderRadius: 10
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{strategy.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>{strategy.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Avoid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <XCircle size={18} style={{ color: COLORS.highImpact }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.highImpact }}>Avoid ❌</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STRATEGY_FIT_BOARD.filter(s => s.status === 'avoid').map((strategy, idx) => (
                <div key={idx} style={{
                  padding: 14,
                  background: COLORS.highImpactBg,
                  border: `1px solid ${COLORS.highImpactBorder}`,
                  borderRadius: 10
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{strategy.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>{strategy.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SETUP CHECKLIST + POST-TRADE REFLECTION */}
      {/* ============================================ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Setup Checklist */}
        <div style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderGold}`,
          borderRadius: 20,
          padding: 24
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} style={{ color: COLORS.gold }} />
            Setup Checklist
          </h3>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>
            Check conditions before entering a trade
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {checklist.map((item) => {
              const importanceColors = {
                critical: COLORS.highImpact,
                important: COLORS.mediumImpact,
                nice: COLORS.textDim
              };

              return (
                <div 
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    background: item.checked ? 'rgba(34, 197, 94, 0.08)' : COLORS.bgInput,
                    border: `1px solid ${item.checked ? COLORS.bullishBorder : COLORS.border}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: item.checked ? COLORS.bullish : 'transparent',
                    border: `2px solid ${item.checked ? COLORS.bullish : COLORS.textDim}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.checked && <Check size={14} style={{ color: '#fff' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 13, 
                      color: item.checked ? COLORS.textSecondary : COLORS.textPrimary,
                      textDecoration: item.checked ? 'line-through' : 'none'
                    }}>
                      {item.question}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 6px',
                    background: `${importanceColors[item.importance]}15`,
                    borderRadius: 4,
                    fontSize: 9,
                    color: importanceColors[item.importance],
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    {item.importance}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Analysis Button */}
          <button
            onClick={() => setShowAnalysis(true)}
            style={{
              width: '100%',
              padding: '14px',
              background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
              border: 'none',
              borderRadius: 10,
              color: '#000',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Brain size={18} />
            Analyze My Setup
          </button>

          {/* Checklist Analysis */}
          {showAnalysis && (
            <div style={{
              marginTop: 20,
              padding: 16,
              background: COLORS.bgInput,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Sparkles size={16} style={{ color: COLORS.gold }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.gold }}>AI Analysis</span>
              </div>
              {(() => {
                const score = getChecklistScore();
                const missing = score.criticalTotal - score.criticalChecked;
                
                if (missing > 0) {
                  return (
                    <div style={{ padding: 12, background: COLORS.highImpactBg, borderRadius: 8 }}>
                      <p style={{ fontSize: 13, color: COLORS.highImpact, margin: 0, lineHeight: 1.5 }}>
                        ⚠️ Your setup is missing {missing} critical confirmation{missing > 1 ? 's' : ''}. 
                        Consider waiting for better conditions or reducing position size.
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div style={{ padding: 12, background: COLORS.bullishBg, borderRadius: 8 }}>
                      <p style={{ fontSize: 13, color: COLORS.bullish, margin: 0, lineHeight: 1.5 }}>
                        ✅ All critical conditions met. Your setup aligns with current market regime. 
                        Proceed with normal position sizing.
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </div>

        {/* Post-Trade Reflection */}
        <div style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 20,
          padding: 24
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} style={{ color: COLORS.neutral }} />
            Post-Trade Reflection
          </h3>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>
            Log today's market lesson for your journal
          </p>

          <div style={{
            padding: 20,
            background: COLORS.bgInput,
            borderRadius: 12,
            marginBottom: 20
          }}>
            <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 12 }}>TODAY'S KEY LESSON</div>
            <textarea
              placeholder="What did the market teach you today? What worked? What didn't?"
              style={{
                width: '100%',
                minHeight: 120,
                padding: 14,
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                color: COLORS.textPrimary,
                fontSize: 14,
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{
              flex: 1,
              padding: '14px',
              background: COLORS.bgInput,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              color: COLORS.textMuted,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
              <Clock size={16} />
              Save as Draft
            </button>
            <button style={{
              flex: 1,
              padding: '14px',
              background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
              border: 'none',
              borderRadius: 10,
              color: '#000',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
              <FileText size={16} />
              Log to Journal
            </button>
          </div>
        </div>
      </div>
    </AIPageContainer>
  );
}