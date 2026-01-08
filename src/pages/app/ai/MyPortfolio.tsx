import { useState } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  PieChart,
  Shield,
  AlertTriangle,
  Target,
  Sparkles,
  BarChart3,
  Layers,
  RefreshCw,
  MessageSquare,
  Send,
  Zap,
  Eye,
  ChevronRight,
  FileText,
  Globe,
  DollarSign,
  Percent,
  Info
} from 'lucide-react';
import { AIPageContainer, AIPageHeader, COLORS, UserMode, LockedContent } from "./AIDesignSystem";

// Types
interface PortfolioSnapshot {
  concentration: { score: number; status: 'low' | 'medium' | 'high'; detail: string };
  macroExposure: { score: number; bias: string; detail: string };
  volatility: { score: number; beta: number; detail: string };
}

interface HiddenRisk {
  title: string;
  severity: 'high' | 'medium' | 'low';
  evidence: string;
  conceptualFix: string;
}

interface SectorExposure {
  name: string;
  weight: number;
  benchmark: number;
  color: string;
}

interface ScenarioStress {
  name: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  affectedHoldings: string[];
  mitigation: string;
}

interface OverlapItem {
  holdings: string[];
  issue: string;
  riskIncrease: string;
}

interface BrainPrompt {
  label: string;
  prompt: string;
}

// Mock Data
const PORTFOLIO_SNAPSHOT: PortfolioSnapshot = {
  concentration: { score: 72, status: 'high', detail: 'Top 3 holdings = 45% of portfolio. Tech sector = 55%.' },
  macroExposure: { score: 65, bias: 'Growth-Heavy', detail: 'Portfolio tilted toward rate-sensitive growth. Vulnerable to higher-for-longer.' },
  volatility: { score: 58, beta: 1.35, detail: 'Beta 1.35 = higher than market. Expect 35% larger swings.' }
};

const HIDDEN_RISKS: HiddenRisk[] = [
  { title: "Overexposed to Rate Sensitivity", severity: 'high', evidence: "55% of portfolio in duration-sensitive assets (Tech, REITs, Growth). Today's ISM inflation spike directly impacts you.", conceptualFix: "Consider adding financials or energy which benefit from higher rates." },
  { title: "Duplicated Factor Exposure", severity: 'medium', evidence: "NVDA, AMD, SMCI all have 85%+ correlation. Essentially 3x position in AI semis.", conceptualFix: "Trim overlapping exposure. One position captures the theme." },
  { title: "Elevated Drawdown Risk in Bear Scenario", severity: 'medium', evidence: "In a 10% SPX correction, your portfolio would likely drop 13-15% based on beta.", conceptualFix: "Add defensive positions or reduce overall beta exposure." }
];

const SECTOR_EXPOSURE: SectorExposure[] = [
  { name: 'Technology', weight: 55, benchmark: 30, color: COLORS.technology },
  { name: 'Healthcare', weight: 15, benchmark: 13, color: COLORS.healthcare },
  { name: 'Financials', weight: 10, benchmark: 12, color: COLORS.financials },
  { name: 'Consumer Disc.', weight: 8, benchmark: 10, color: COLORS.consumer },
  { name: 'Energy', weight: 5, benchmark: 4, color: COLORS.energy },
  { name: 'Other', weight: 7, benchmark: 31, color: COLORS.textDim }
];

const SCENARIO_STRESS: ScenarioStress[] = [
  { name: 'Rates Stay Higher', description: 'Fed delays cuts to Q4. 10Y yield stays above 4.5%.', impact: 'high', affectedHoldings: ['NVDA', 'TSLA', 'O', 'VNQ'], mitigation: 'Add financials (XLF), reduce REITs. Consider short-duration value.' },
  { name: 'Growth Slows', description: 'ISM weakens further. Recession concerns emerge.', impact: 'medium', affectedHoldings: ['XLY positions', 'Cyclicals'], mitigation: 'Add staples (XLP), healthcare (XLV). Increase cash buffer.' },
  { name: 'Risk-Off Shock', description: 'VIX spikes above 30. Flight to safety.', impact: 'high', affectedHoldings: ['All high-beta positions'], mitigation: 'Consider 5-10% gold (GLD), add puts on QQQ. Reduce position sizes.' }
];

const OVERLAP_ITEMS: OverlapItem[] = [
  { holdings: ['NVDA', 'AMD', 'SMCI', 'AVGO'], issue: '4 holdings with 80%+ correlation (AI semis)', riskIncrease: '+35% drawdown risk vs diversified' },
  { holdings: ['QQQ', 'AAPL', 'MSFT', 'GOOGL'], issue: 'QQQ contains these stocks - double counting exposure', riskIncrease: '+20% concentration' }
];

const BRAIN_PROMPTS: BrainPrompt[] = [
  { label: "Explain my biggest risk", prompt: "What is my biggest portfolio risk right now and why?" },
  { label: "My macro bias", prompt: "What is my portfolio's macro bias right now?" },
  { label: "ISM impact on me", prompt: "How does today's ISM theme map to my holdings?" },
  { label: "Rebalance ideas", prompt: "What conceptual changes would improve my portfolio?" }
];

export default function PortfolioBrain() {
  const [userMode, setUserMode] = useState<UserMode>({ type: 'investor', horizon: '1M', risk: 'balanced', universe: 'US' });
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [hasAccess] = useState(true); // Toggle for paywall demo

  const handleSendChat = (prompt?: string) => {
    const message = prompt || chatInput;
    if (!message.trim()) return;
    
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setChatInput('');
    setIsThinking(true);

    setTimeout(() => {
      const response = "Based on your portfolio analysis, your biggest risk right now is **rate sensitivity**. With 55% in tech and today's ISM showing sticky inflation, you're positioned against the current macro theme. Consider: (1) Trimming NVDA/AMD overlap, (2) Adding XLF for rate beneficiary exposure, (3) Reducing overall beta with some XLV or cash.";
      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
      setIsThinking(false);
    }, 2000);
  };

  if (!hasAccess) {
    return (
      <AIPageContainer>
        <AIPageHeader title="Portfolio Brain" subtitle="Your Personal AI Risk Manager" icon={Brain} iconColor={COLORS.gold} showFilters={false} />
        <LockedContent
          title="Portfolio Brain is a Premium Feature"
          description="Connect your portfolio and get personalized AI insights, risk analysis, and rebalancing suggestions."
          requiredTier="PREMIUM"
          onUpgrade={() => console.log('Upgrade')}
        />
      </AIPageContainer>
    );
  }

  const MetricCard = ({ title, score, status, detail, color }: { title: string; score: number; status: string; detail: string; color: string }) => (
    <div style={{ background: COLORS.bgCard, border: `1px solid ${color}30`, borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 36, fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: 14, color, fontWeight: 600 }}>{status}</span>
      </div>
      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>{detail}</p>
    </div>
  );

  return (
    <AIPageContainer>
      <AIPageHeader title="Portfolio Brain" subtitle="Your Personal AI Risk Manager" icon={Brain} iconColor={COLORS.gold} userMode={userMode} onUserModeChange={setUserMode} onExportPDF={() => {}} onSaveToJournal={() => {}} onFeedback={() => {}} />

      {/* Run Diagnosis CTA */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.gold}15, ${COLORS.bgCard})`, border: `2px solid ${COLORS.borderGold}`, borderRadius: 20, padding: 24, marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Portfolio Diagnosis</h2>
          <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0 }}>AI-powered analysis of your holdings, risks, and opportunities</p>
        </div>
        <button style={{ padding: '16px 32px', background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, border: 'none', borderRadius: 12, color: '#000', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={20} />Run Full Diagnosis
        </button>
      </div>

      {/* Snapshot - 3 Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        <MetricCard title="Concentration Risk" score={PORTFOLIO_SNAPSHOT.concentration.score} status={PORTFOLIO_SNAPSHOT.concentration.status.toUpperCase()} detail={PORTFOLIO_SNAPSHOT.concentration.detail} color={COLORS.highImpact} />
        <MetricCard title="Macro Exposure" score={PORTFOLIO_SNAPSHOT.macroExposure.score} status={PORTFOLIO_SNAPSHOT.macroExposure.bias} detail={PORTFOLIO_SNAPSHOT.macroExposure.detail} color={COLORS.mediumImpact} />
        <MetricCard title="Volatility Profile" score={PORTFOLIO_SNAPSHOT.volatility.score} status={`β ${PORTFOLIO_SNAPSHOT.volatility.beta}`} detail={PORTFOLIO_SNAPSHOT.volatility.detail} color={COLORS.neutral} />
      </div>

      {/* Hidden Risks */}
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.highImpactBorder}`, borderRadius: 20, padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={20} style={{ color: COLORS.highImpact }} />Top 3 Hidden Risks
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {HIDDEN_RISKS.map((risk, idx) => {
            const severityConfig = { high: { color: COLORS.highImpact, bg: COLORS.highImpactBg }, medium: { color: COLORS.mediumImpact, bg: COLORS.mediumImpactBg }, low: { color: COLORS.textMuted, bg: COLORS.bgInput } };
            const config = severityConfig[risk.severity];
            return (
              <div key={idx} style={{ padding: 20, background: config.bg, borderRadius: 12, border: `1px solid ${config.color}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: config.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{idx + 1}</span>
                  <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: config.color }}>{risk.title}</h4>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>EVIDENCE</div>
                  <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>{risk.evidence}</p>
                </div>
                <div style={{ padding: 12, background: 'rgba(199, 169, 61, 0.08)', borderRadius: 8, borderLeft: `3px solid ${COLORS.gold}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Sparkles size={12} style={{ color: COLORS.gold }} />
                    <span style={{ fontSize: 10, color: COLORS.gold, fontWeight: 600 }}>WHAT TO CONSIDER</span>
                  </div>
                  <p style={{ fontSize: 12, color: COLORS.textPrimary, margin: 0 }}>{risk.conceptualFix}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exposure Map + Scenario Stress */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Sector Exposure */}
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PieChart size={18} style={{ color: COLORS.gold }} />Sector Exposure vs Benchmark
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SECTOR_EXPOSURE.map((sector, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{sector.name}</span>
                  <span style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: sector.weight > sector.benchmark ? COLORS.mediumImpact : COLORS.textMuted }}>{sector.weight}%</span>
                    <span style={{ color: COLORS.textDim, marginLeft: 8 }}>vs {sector.benchmark}%</span>
                  </span>
                </div>
                <div style={{ position: 'relative', height: 8, background: COLORS.bgInput, borderRadius: 4 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(sector.weight, 100)}%`, background: sector.color, borderRadius: 4 }} />
                  <div style={{ position: 'absolute', left: `${sector.benchmark}%`, top: -2, width: 2, height: 12, background: '#fff', borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 12, background: COLORS.bgInput, borderRadius: 8, fontSize: 11, color: COLORS.textMuted }}>
            White line = S&P 500 benchmark weight
          </div>
        </div>

        {/* Scenario Stress */}
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} style={{ color: COLORS.neutral }} />Scenario Stress Test
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SCENARIO_STRESS.map((scenario, idx) => {
              const impactConfig = { high: COLORS.highImpact, medium: COLORS.mediumImpact, low: COLORS.textMuted };
              return (
                <div key={idx} style={{ padding: 14, background: COLORS.bgInput, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{scenario.name}</span>
                    <span style={{ padding: '2px 8px', background: `${impactConfig[scenario.impact]}15`, borderRadius: 4, fontSize: 10, color: impactConfig[scenario.impact], fontWeight: 600 }}>
                      {scenario.impact.toUpperCase()} IMPACT
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 8px' }}>{scenario.description}</p>
                  <div style={{ fontSize: 11, color: COLORS.textDim }}>
                    Affected: <span style={{ color: COLORS.bearish }}>{scenario.affectedHoldings.join(', ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overlap + Ask the Brain */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Overlap */}
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.mediumImpactBorder}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} style={{ color: COLORS.mediumImpact }} />Overlap & Redundancy
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {OVERLAP_ITEMS.map((item, idx) => (
              <div key={idx} style={{ padding: 16, background: COLORS.mediumImpactBg, borderRadius: 10, border: `1px solid ${COLORS.mediumImpactBorder}` }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {item.holdings.map((h, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: COLORS.bgCard, borderRadius: 4, fontSize: 12, fontWeight: 600, color: COLORS.gold }}>{h}</span>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: '0 0 8px' }}>{item.issue}</p>
                <div style={{ fontSize: 11, color: COLORS.highImpact }}>⚠️ {item.riskIncrease}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ask the Brain */}
        <div style={{ background: `linear-gradient(135deg, ${COLORS.bgCard}, rgba(199, 169, 61, 0.05))`, border: `1px solid ${COLORS.borderGold}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={18} style={{ color: COLORS.gold }} />Ask the Brain
          </h3>

          {/* Quick Prompts */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {BRAIN_PROMPTS.map((p, idx) => (
              <button key={idx} onClick={() => handleSendChat(p.prompt)} style={{ padding: '8px 14px', background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontSize: 12, cursor: 'pointer' }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Chat Area */}
          <div style={{ height: 200, overflowY: 'auto', marginBottom: 12, padding: 12, background: COLORS.bgInput, borderRadius: 10 }}>
            {chatHistory.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: COLORS.textDim, fontSize: 13 }}>
                Ask anything about your portfolio...
              </div>
            )}
            {chatHistory.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: msg.role === 'user' ? COLORS.textMuted : COLORS.gold, marginBottom: 4 }}>
                  {msg.role === 'user' ? 'YOU' : 'PORTFOLIO BRAIN'}
                </div>
                <div style={{ padding: 10, background: msg.role === 'user' ? COLORS.bgCard : 'rgba(199, 169, 61, 0.1)', borderRadius: 8, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.5 }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isThinking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.gold }}>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12 }}>Thinking...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} placeholder="Ask about your portfolio..." style={{ flex: 1, padding: '12px 16px', background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.textPrimary, fontSize: 13 }} />
            <button onClick={() => handleSendChat()} style={{ padding: '12px 16px', background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer' }}>
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </AIPageContainer>
  );
}