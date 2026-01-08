import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Activity,
  Layers,
  Target,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DollarSign,
  Percent,
  Users,
  Factory,
  Eye,
  FileText,
  Download,
  History,
  Zap
} from 'lucide-react';
import {
  AIPageContainer,
  AIPageHeader,
  ImpactBadge,
  SentimentBadge,
  Drawer,
  COLORS,
  UserMode
} from "./AIDesignSystem";

// ============================================
// TYPES
// ============================================
interface MacroPrint {
  id: string;
  name: string;
  shortName: string;
  actual: string;
  forecast: string;
  previous: string;
  direction: 'improving' | 'deteriorating' | 'stable';
  aiVerdict: string;
  releaseDate: string;
  components: MacroComponent[];
}

interface MacroComponent {
  name: string;
  value: number;
  change: number;
  interpretation: string;
}

interface SectorImpact {
  name: string;
  impact: 'beneficiary' | 'loser' | 'neutral';
  reason: string;
  etf: string;
  expectedMove: string;
}

interface InvestorTakeaway {
  horizon: 'short' | 'medium' | 'long';
  label: string;
  insight: string;
}

interface SecondOrderEffect {
  title: string;
  ifThen: string;
  hiddenSensitivity: string;
}

interface CompanyRelevance {
  symbol: string;
  name: string;
  connection: string;
  relevanceScore: number;
}

interface HistoricalAnalog {
  period: string;
  similarity: number;
  whatHappened: string;
  sectorPerformance: { sector: string; return: string }[];
}

// ============================================
// MOCK DATA
// ============================================
const CURRENT_MACRO_PRINT: MacroPrint = {
  id: 'ism-services-jan',
  name: 'ISM Services PMI',
  shortName: 'ISM Services',
  actual: '54.1',
  forecast: '52.5',
  previous: '52.1',
  direction: 'improving',
  aiVerdict: 'Growth accelerating with sticky prices. Services inflation remains elevated, challenging Fed rate cut narrative.',
  releaseDate: '2026-01-09',
  components: [
    { name: 'Business Activity', value: 58.2, change: 4.5, interpretation: 'Strong expansion - demand robust' },
    { name: 'New Orders', value: 56.8, change: 2.3, interpretation: 'Forward momentum building' },
    { name: 'Employment', value: 51.4, change: -0.5, interpretation: 'Modest hiring, labor market cooling' },
    { name: 'Prices Paid', value: 64.2, change: 5.8, interpretation: '⚠️ Inflation sticky - Fed concern' },
    { name: 'Supplier Deliveries', value: 49.5, change: -1.2, interpretation: 'Supply chains normalized' }
  ]
};

const SECTOR_IMPACTS: SectorImpact[] = [
  { name: 'Energy', impact: 'beneficiary', reason: 'Strong demand + inflation hedge', etf: 'XLE', expectedMove: '+1.5-2.5%' },
  { name: 'Financials', impact: 'beneficiary', reason: 'Higher-for-longer rates = NII boost', etf: 'XLF', expectedMove: '+0.5-1.5%' },
  { name: 'Healthcare', impact: 'neutral', reason: 'Defensive with some inflation pass-through', etf: 'XLV', expectedMove: '±0.5%' },
  { name: 'Technology', impact: 'loser', reason: 'Duration sensitive, rate cut delays hurt', etf: 'XLK', expectedMove: '-1.0-2.0%' },
  { name: 'Real Estate', impact: 'loser', reason: 'Higher rates = cap rate pressure', etf: 'XLRE', expectedMove: '-1.5-2.5%' },
  { name: 'Utilities', impact: 'loser', reason: 'Bond proxy hit by yield backup', etf: 'XLU', expectedMove: '-0.8-1.5%' },
  { name: 'Consumer Disc.', impact: 'neutral', reason: 'Strong demand offset by rate concerns', etf: 'XLY', expectedMove: '±0.7%' },
  { name: 'Industrials', impact: 'beneficiary', reason: 'Activity expansion = capex cycle', etf: 'XLI', expectedMove: '+0.5-1.2%' }
];

const INVESTOR_TAKEAWAYS: InvestorTakeaway[] = [
  {
    horizon: 'short',
    label: 'Days / 1 Week',
    insight: 'Expect choppy price action. Rate-sensitive names face pressure. Consider reducing duration exposure and trimming growth overweight.'
  },
  {
    horizon: 'medium',
    label: '1 Month',
    insight: 'Rotation from growth to value likely continues. Energy and financials may outperform. Watch for Fed speaker reactions this week.'
  },
  {
    horizon: 'long',
    label: '3-6 Months',
    insight: 'If inflation remains sticky, Fed may need to delay cuts further. This benefits quality and dividend stocks over speculative growth.'
  }
];

const SECOND_ORDER_EFFECTS: SecondOrderEffect[] = [
  {
    title: 'If prices paid stays elevated',
    ifThen: 'Fed will delay first cut from June to September → 10Y yields stay above 4.30%',
    hiddenSensitivity: 'Small caps more sensitive than large caps due to floating rate debt'
  },
  {
    title: 'If employment weakens further',
    ifThen: 'Growth concerns emerge → defensive rotation accelerates',
    hiddenSensitivity: 'Credit spreads may widen, hitting high yield bonds first'
  },
  {
    title: 'If new orders accelerate',
    ifThen: 'Capex cycle extends → industrials and materials rally',
    hiddenSensitivity: 'Commodity currencies (AUD, CAD) may strengthen vs USD'
  }
];

const COMPANY_RELEVANCE: CompanyRelevance[] = [
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase',
    connection: 'Higher-for-longer rates directly boost net interest income. Services strength = loan demand.',
    relevanceScore: 95
  },
  {
    symbol: 'XOM',
    name: 'Exxon Mobil',
    connection: 'Strong economic activity = oil demand. Inflation hedge quality in focus.',
    relevanceScore: 88
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    connection: 'Rate sensitivity creates near-term headwind. But AI demand secular, not cyclical.',
    relevanceScore: 75
  }
];

const HISTORICAL_ANALOGS: HistoricalAnalog[] = [
  {
    period: 'Q4 2023 - Similar ISM surprise',
    similarity: 85,
    whatHappened: 'Markets sold off initially but rallied into year-end on soft landing hopes.',
    sectorPerformance: [
      { sector: 'Energy', return: '+8.2%' },
      { sector: 'Financials', return: '+5.4%' },
      { sector: 'Tech', return: '-2.1%' }
    ]
  },
  {
    period: 'Q1 2022 - Inflation scare',
    similarity: 72,
    whatHappened: 'Extended tech drawdown. Value significantly outperformed growth for 3 months.',
    sectorPerformance: [
      { sector: 'Energy', return: '+15.3%' },
      { sector: 'Value', return: '+4.2%' },
      { sector: 'Growth', return: '-8.7%' }
    ]
  },
  {
    period: 'Q2 2018 - Rate hiking cycle',
    similarity: 65,
    whatHappened: 'Gradual rotation to quality. Volatility elevated but no crash.',
    sectorPerformance: [
      { sector: 'Healthcare', return: '+3.8%' },
      { sector: 'Staples', return: '+2.1%' },
      { sector: 'REITs', return: '-5.4%' }
    ]
  }
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function MacroMarketTranslator() {
  const [userMode, setUserMode] = useState<UserMode>({
    type: 'investor',
    horizon: '1M',
    risk: 'balanced',
    universe: 'US'
  });
  const [selectedSector, setSelectedSector] = useState<SectorImpact | null>(null);

  // ============================================
  // SECTOR IMPACT VISUAL
  // ============================================
  const SectorImpactVisual = () => {
    const beneficiaries = SECTOR_IMPACTS.filter(s => s.impact === 'beneficiary');
    const losers = SECTOR_IMPACTS.filter(s => s.impact === 'loser');
    const neutral = SECTOR_IMPACTS.filter(s => s.impact === 'neutral');

    return (
      <div style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
        padding: 24
      }}>
        <h3 style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <PieChart size={20} style={{ color: COLORS.gold }} />
          Sector Impact Map
        </h3>

        {/* Visual Representation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          padding: 20
        }}>
          {/* Left - Losers */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 8,
            padding: 16,
            background: COLORS.bearishBg,
            borderRadius: 12,
            border: `1px solid ${COLORS.bearishBorder}`,
            minWidth: 140
          }}>
            <div style={{ fontSize: 11, color: COLORS.bearish, fontWeight: 600, textAlign: 'center' }}>
              LOSERS
            </div>
            {losers.map((s, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedSector(s)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: COLORS.textSecondary,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {s.name}
              </div>
            ))}
          </div>

          {/* Center - ISM */}
          <div style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${COLORS.gold}30, ${COLORS.gold}10)`,
            border: `3px solid ${COLORS.gold}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            margin: '0 32px',
            boxShadow: `0 0 30px ${COLORS.gold}30`
          }}>
            <span style={{ fontSize: 12, color: COLORS.gold }}>ISM</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary }}>
              {CURRENT_MACRO_PRINT.actual}
            </span>
          </div>

          {/* Right - Beneficiaries */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 8,
            padding: 16,
            background: COLORS.bullishBg,
            borderRadius: 12,
            border: `1px solid ${COLORS.bullishBorder}`,
            minWidth: 140
          }}>
            <div style={{ fontSize: 11, color: COLORS.bullish, fontWeight: 600, textAlign: 'center' }}>
              BENEFICIARIES
            </div>
            {beneficiaries.map((s, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedSector(s)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: COLORS.textSecondary,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {s.name}
              </div>
            ))}
          </div>
        </div>

        {/* Neutral Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          gap: 8
        }}>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginRight: 8 }}>NEUTRAL:</div>
          {neutral.map((s, idx) => (
            <span 
              key={idx}
              onClick={() => setSelectedSector(s)}
              style={{
                padding: '4px 12px',
                background: COLORS.bgInput,
                borderRadius: 6,
                fontSize: 12,
                color: COLORS.textMuted,
                cursor: 'pointer'
              }}
            >
              {s.name}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <AIPageContainer>
      {/* Page Header */}
      <AIPageHeader
        title="Macro → Market Translator"
        subtitle="Economic Data to Actionable Insights"
        icon={Globe}
        iconColor={COLORS.neutral}
        userMode={userMode}
        onUserModeChange={setUserMode}
        onExportPDF={() => console.log('Export PDF')}
        onSaveToJournal={() => console.log('Save to Journal')}
        onFeedback={() => console.log('Feedback')}
      />

      {/* ============================================ */}
      {/* MACRO PRINT SUMMARY */}
      {/* ============================================ */}
      <div style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.borderGold}`,
        borderRadius: 20,
        padding: 28,
        marginBottom: 32
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {/* Report Name & Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                padding: '6px 14px',
                background: 'rgba(199, 169, 61, 0.15)',
                borderRadius: 8,
                fontSize: 12,
                color: COLORS.gold,
                fontWeight: 600
              }}>
                LATEST REPORT
              </div>
              <span style={{ fontSize: 13, color: COLORS.textMuted }}>
                Released {CURRENT_MACRO_PRINT.releaseDate}
              </span>
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>
              {CURRENT_MACRO_PRINT.name}
            </h2>

            {/* Direction Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                background: CURRENT_MACRO_PRINT.direction === 'improving' ? COLORS.bullishBg : 
                           CURRENT_MACRO_PRINT.direction === 'deteriorating' ? COLORS.bearishBg : COLORS.noiseBg,
                border: `1px solid ${CURRENT_MACRO_PRINT.direction === 'improving' ? COLORS.bullishBorder : 
                                    CURRENT_MACRO_PRINT.direction === 'deteriorating' ? COLORS.bearishBorder : COLORS.noiseBorder}`,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: CURRENT_MACRO_PRINT.direction === 'improving' ? COLORS.bullish : 
                       CURRENT_MACRO_PRINT.direction === 'deteriorating' ? COLORS.bearish : COLORS.textMuted
              }}>
                {CURRENT_MACRO_PRINT.direction === 'improving' && <TrendingUp size={14} />}
                {CURRENT_MACRO_PRINT.direction === 'deteriorating' && <TrendingDown size={14} />}
                Direction: {CURRENT_MACRO_PRINT.direction.charAt(0).toUpperCase() + CURRENT_MACRO_PRINT.direction.slice(1)}
              </span>
            </div>

            {/* AI Verdict */}
            <div style={{
              padding: 16,
              background: 'rgba(199, 169, 61, 0.08)',
              borderRadius: 12,
              borderLeft: `4px solid ${COLORS.gold}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={14} style={{ color: COLORS.gold }} />
                <span style={{ fontSize: 12, color: COLORS.gold, fontWeight: 600 }}>AI VERDICT</span>
              </div>
              <p style={{ fontSize: 15, color: COLORS.textPrimary, margin: 0, lineHeight: 1.6 }}>
                {CURRENT_MACRO_PRINT.aiVerdict}
              </p>
            </div>
          </div>

          {/* Numbers Box */}
          <div style={{
            display: 'flex',
            gap: 20,
            padding: 24,
            background: COLORS.bgInput,
            borderRadius: 16,
            marginLeft: 32
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>ACTUAL</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.bullish }}>
                {CURRENT_MACRO_PRINT.actual}
              </div>
            </div>
            <div style={{ width: 1, background: COLORS.border }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>FORECAST</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.textMuted }}>
                {CURRENT_MACRO_PRINT.forecast}
              </div>
            </div>
            <div style={{ width: 1, background: COLORS.border }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>PREVIOUS</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.textMuted }}>
                {CURRENT_MACRO_PRINT.previous}
              </div>
            </div>
          </div>
        </div>

        {/* Components Breakdown */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 12 }}>KEY COMPONENTS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {CURRENT_MACRO_PRINT.components.map((comp, idx) => (
              <div key={idx} style={{
                padding: 14,
                background: comp.name === 'Prices Paid' ? 'rgba(239, 68, 68, 0.08)' : COLORS.bgInput,
                border: `1px solid ${comp.name === 'Prices Paid' ? COLORS.highImpactBorder : COLORS.border}`,
                borderRadius: 10
              }}>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>{comp.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{comp.value}</span>
                  <span style={{ 
                    fontSize: 12, 
                    color: comp.change > 0 ? COLORS.bullish : comp.change < 0 ? COLORS.bearish : COLORS.textMuted 
                  }}>
                    {comp.change > 0 ? '+' : ''}{comp.change}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>
                  {comp.interpretation}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTOR IMPACT MAP */}
      {/* ============================================ */}
      <div style={{ marginBottom: 32 }}>
        <SectorImpactVisual />
      </div>

      {/* ============================================ */}
      {/* INVESTOR TAKEAWAYS */}
      {/* ============================================ */}
      <div style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
        padding: 24,
        marginBottom: 32
      }}>
        <h3 style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Target size={20} style={{ color: COLORS.gold }} />
          Investor Takeaway by Horizon
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {INVESTOR_TAKEAWAYS.map((takeaway, idx) => {
            const horizonColors = {
              short: COLORS.highImpact,
              medium: COLORS.mediumImpact,
              long: COLORS.bullish
            };
            const color = horizonColors[takeaway.horizon];

            return (
              <div key={idx} style={{
                padding: 20,
                background: COLORS.bgInput,
                borderRadius: 12,
                borderTop: `3px solid ${color}`
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  marginBottom: 12 
                }}>
                  <Clock size={16} style={{ color }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color }}>{takeaway.label}</span>
                </div>
                <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  {takeaway.insight}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================ */}
      {/* SECOND ORDER EFFECTS + COMPANY RELEVANCE */}
      {/* ============================================ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Second Order Effects */}
        <div style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 24
        }}>
          <h3 style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Layers size={18} style={{ color: COLORS.mediumImpact }} />
            Second-Order Effects
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SECOND_ORDER_EFFECTS.map((effect, idx) => (
              <div key={idx} style={{
                padding: 16,
                background: COLORS.bgInput,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{effect.title}</div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  marginBottom: 8,
                  color: COLORS.gold
                }}>
                  <ArrowRight size={14} />
                  <span style={{ fontSize: 13 }}>{effect.ifThen}</span>
                </div>
                <div style={{
                  padding: 10,
                  background: 'rgba(249, 115, 22, 0.08)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: COLORS.mediumImpact
                }}>
                  <strong>Hidden sensitivity:</strong> {effect.hiddenSensitivity}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company Relevance */}
        <div style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderGold}`,
          borderRadius: 16,
          padding: 24
        }}>
          <h3 style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Building2 size={18} style={{ color: COLORS.gold }} />
            Company Relevance
          </h3>

          <div style={{ 
            padding: 12, 
            background: 'rgba(199, 169, 61, 0.05)', 
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 12,
            color: COLORS.textMuted
          }}>
            Companies from your deep-dive research aligned with this macro theme
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {COMPANY_RELEVANCE.map((company, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 14,
                background: COLORS.bgInput,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.gold }}>{company.symbol}</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>{company.name}</span>
                  </div>
                  <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>
                    {company.connection}
                  </p>
                </div>
                <div style={{
                  padding: '6px 10px',
                  background: company.relevanceScore >= 90 ? COLORS.bullishBg : 
                             company.relevanceScore >= 75 ? COLORS.mediumImpactBg : COLORS.noiseBg,
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: company.relevanceScore >= 90 ? COLORS.bullish : 
                         company.relevanceScore >= 75 ? COLORS.mediumImpact : COLORS.textMuted
                }}>
                  {company.relevanceScore}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* HISTORICAL ANALOGS */}
      {/* ============================================ */}
      <div style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
        padding: 24
      }}>
        <h3 style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <History size={20} style={{ color: COLORS.neutral }} />
          Historical Analogs
        </h3>

        <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>
          Similar setups in the past and what happened to sectors
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {HISTORICAL_ANALOGS.map((analog, idx) => (
            <div key={idx} style={{
              padding: 20,
              background: COLORS.bgInput,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{analog.period}</span>
                <span style={{
                  padding: '4px 8px',
                  background: COLORS.neutralBg,
                  borderRadius: 4,
                  fontSize: 11,
                  color: COLORS.neutral
                }}>
                  {analog.similarity}% similar
                </span>
              </div>

              <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>
                {analog.whatHappened}
              </p>

              <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 8 }}>SECTOR PERFORMANCE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analog.sectorPerformance.map((perf, pIdx) => (
                  <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: COLORS.textMuted }}>{perf.sector}</span>
                    <span style={{ 
                      fontWeight: 600,
                      color: perf.return.startsWith('+') ? COLORS.bullish : 
                             perf.return.startsWith('-') ? COLORS.bearish : COLORS.textMuted
                    }}>
                      {perf.return}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTOR DETAIL DRAWER */}
      {/* ============================================ */}
      <Drawer
        isOpen={!!selectedSector}
        onClose={() => setSelectedSector(null)}
        title={`${selectedSector?.name} Sector Analysis`}
        width={500}
      >
        {selectedSector && (
          <div>
            {/* Impact Badge */}
            <div style={{ marginBottom: 24 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: selectedSector.impact === 'beneficiary' ? COLORS.bullishBg : 
                           selectedSector.impact === 'loser' ? COLORS.bearishBg : COLORS.noiseBg,
                border: `1px solid ${selectedSector.impact === 'beneficiary' ? COLORS.bullishBorder : 
                                    selectedSector.impact === 'loser' ? COLORS.bearishBorder : COLORS.noiseBorder}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: selectedSector.impact === 'beneficiary' ? COLORS.bullish : 
                       selectedSector.impact === 'loser' ? COLORS.bearish : COLORS.textMuted
              }}>
                {selectedSector.impact === 'beneficiary' && <ArrowUpRight size={16} />}
                {selectedSector.impact === 'loser' && <ArrowDownRight size={16} />}
                {selectedSector.impact.charAt(0).toUpperCase() + selectedSector.impact.slice(1)}
              </span>
            </div>

            {/* Reason */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 8 }}>WHY</div>
              <p style={{ fontSize: 15, color: COLORS.textPrimary, margin: 0, lineHeight: 1.6 }}>
                {selectedSector.reason}
              </p>
            </div>

            {/* Expected Move */}
            <div style={{
              padding: 20,
              background: COLORS.bgInput,
              borderRadius: 12,
              marginBottom: 24
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 4 }}>EXPECTED MOVE</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{selectedSector.expectedMove}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 4 }}>ETF</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.gold }}>{selectedSector.etf}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{
                flex: 1,
                padding: '14px',
                background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                border: 'none',
                borderRadius: 10,
                color: '#000',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}>
                Add {selectedSector.etf} to Watchlist
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </AIPageContainer>
  );
}