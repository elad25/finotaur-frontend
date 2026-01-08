import { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Droplets,
  Globe,
  Calendar,
  ChevronRight,
  Target,
  Ban,
  Sparkles,
  FileText,
  Crosshair,
  Info
} from 'lucide-react';
import {
  AIPageContainer,
  AIPageHeader,
  ImpactBadge,
  ScenarioCard,
  Drawer,
  COLORS,
  UserMode,
  ImpactLevel
} from './AIDesignSystem';

// ============================================
// TYPES
// ============================================
interface RiskDashboardItem {
  id: string;
  label: string;
  status: 'rising' | 'falling' | 'stable' | 'high' | 'normal' | 'tight';
  value: string;
  reason: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
}

interface MistakeToAvoid {
  title: string;
  description: string;
  whyToday: string;
}

interface ScenarioData {
  type: 'base' | 'bull' | 'bear';
  title: string;
  probability: number;
  trigger: string;
  watchItems: string[];
  affected: { beneficiaries: string[]; losers: string[] };
}

interface EarningsCatalyst {
  symbol: string;
  name: string;
  time: 'BMO' | 'AMC';
  expectedMove: string;
  impact: ImpactLevel;
  aiNote: string;
}

interface EconomicEvent {
  time: string;
  event: string;
  forecast: string;
  previous: string;
  impact: ImpactLevel;
}

interface MorningRiskBriefData {
  riskDashboard: RiskDashboardItem[];
  mistakesToAvoid: MistakeToAvoid[];
  oneThing: string;
  scenarios: ScenarioData[];
  earningsToday: EarningsCatalyst[];
  economicEvents: EconomicEvent[];
  riskLevel: 'low' | 'elevated' | 'high';
  lastUpdated: Date;
}

// ============================================
// API HOOK - Replace with your actual API call
// ============================================
const useMorningBriefData = () => {
  const [data, setData] = useState<MorningRiskBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // TODO: Replace with actual API call
        // const response = await fetch('/api/ai/morning-brief');
        // const result = await response.json();
        // setData(result);
        
        // Simulated API response
        const mockData: MorningRiskBriefData = {
          riskLevel: 'elevated',
          lastUpdated: new Date(),
          riskDashboard: [
            {
              id: 'volatility',
              label: 'Volatility',
              status: 'rising',
              value: 'Rising',
              reason: 'VIX term structure inverted. Near-term premium elevated.',
              icon: Activity,
              color: COLORS.mediumImpact
            },
            {
              id: 'liquidity',
              label: 'Liquidity',
              status: 'tight',
              value: 'Tight',
              reason: 'Bid-ask spreads widening. Large orders facing slippage.',
              icon: Droplets,
              color: COLORS.highImpact
            },
            {
              id: 'macro',
              label: 'Macro Sensitivity',
              status: 'high',
              value: 'High',
              reason: 'Fed speaker on deck. Markets hyper-focused on rate path.',
              icon: Globe,
              color: COLORS.highImpact
            },
            {
              id: 'event',
              label: 'Event Risk',
              status: 'high',
              value: 'High',
              reason: 'ISM, Fed speakers, 10Y auction today.',
              icon: Calendar,
              color: COLORS.highImpact
            }
          ],
          mistakesToAvoid: [
            {
              title: 'Chasing breakouts during chop',
              description: 'VIX elevated and term structure inverted = false breakouts more likely',
              whyToday: 'Yesterday saw 3 failed breakouts in SPY above 600. Vol regime suggests mean reversion plays work better.'
            },
            {
              title: 'Over-sizing ahead of macro event',
              description: 'ISM at 10AM and Fed speaker at 11AM create binary risk',
              whyToday: 'Position sizing should be 50-75% of normal until after 11AM ET.'
            },
            {
              title: 'Ignoring sector rotation',
              description: 'Growth → Value rotation accelerating. Old winners becoming losers.',
              whyToday: 'Tech names that worked yesterday may underperform today. Defensive sectors showing strength.'
            }
          ],
          oneThing: 'Wait for ISM reaction before initiating new positions. High probability of whipsaw price action between 10-11 AM.',
          scenarios: [
            {
              type: 'base',
              title: 'Base Case (55%)',
              probability: 55,
              trigger: 'ISM comes in near expectations (52-53). Fed speaker stays on script.',
              watchItems: ['SPY 595-605 range', 'VIX stays 17-19', '10Y yield 4.30-4.40%'],
              affected: {
                beneficiaries: ['Range-bound strategies', 'Premium sellers'],
                losers: ['Momentum plays', 'Breakout traders']
              }
            },
            {
              type: 'bull',
              title: 'Bull Case (20%)',
              probability: 20,
              trigger: 'ISM misses badly (below 50). Market prices in more cuts.',
              watchItems: ['10Y yield drops below 4.25%', 'Growth stocks rally', 'Dollar weakens'],
              affected: {
                beneficiaries: ['Tech', 'Growth', 'REITs'],
                losers: ['Banks', 'Dollar bulls', 'Short duration']
              }
            },
            {
              type: 'bear',
              title: 'Bear Case (25%)',
              probability: 25,
              trigger: 'ISM prices paid component spikes. Fed speaker turns hawkish.',
              watchItems: ['10Y yield above 4.45%', 'VIX spikes above 20', 'Dollar strengthens'],
              affected: {
                beneficiaries: ['Energy', 'Value', 'Dollar longs'],
                losers: ['Growth', 'High duration', 'EM']
              }
            }
          ],
          earningsToday: [
            {
              symbol: 'WBA',
              name: 'Walgreens Boots',
              time: 'BMO',
              expectedMove: '±5.2%',
              impact: 'medium',
              aiNote: 'Retail pharmacy under pressure. Watch for store closure updates and guidance.'
            },
            {
              symbol: 'STZ',
              name: 'Constellation Brands',
              time: 'BMO',
              expectedMove: '±4.1%',
              impact: 'medium',
              aiNote: 'Beer sales trends key. Modelo momentum vs premium wine weakness.'
            }
          ],
          economicEvents: [
            { time: '08:30', event: 'Initial Claims', forecast: '218K', previous: '211K', impact: 'medium' },
            { time: '10:00', event: 'ISM Services PMI', forecast: '52.5', previous: '52.1', impact: 'high' },
            { time: '11:00', event: 'Fed Williams Speaks', forecast: '-', previous: '-', impact: 'high' },
            { time: '13:00', event: '10Y Treasury Auction', forecast: '$42B', previous: '-', impact: 'medium' },
            { time: '14:00', event: 'Fed Beige Book', forecast: '-', previous: '-', impact: 'medium' }
          ]
        };

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setData(mockData);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, refetch: () => {} };
};

// ============================================
// SUB-COMPONENTS
// ============================================
const RiskCard = ({ item }: { item: RiskDashboardItem }) => {
  const Icon = item.icon;

  return (
    <div style={{
      background: COLORS.bgCard,
      border: `1px solid ${item.color}30`,
      borderRadius: 16,
      padding: 20,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: item.color
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${item.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={22} style={{ color: item.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 4 }}>{item.label}</div>
          <div style={{ 
            fontSize: 24, 
            fontWeight: 700, 
            color: item.color,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {item.value}
            {item.status === 'rising' && <TrendingUp size={18} />}
            {item.status === 'falling' && <TrendingDown size={18} />}
          </div>
        </div>
      </div>

      <p style={{ 
        fontSize: 12, 
        color: COLORS.textMuted, 
        margin: 0, 
        lineHeight: 1.5,
        paddingTop: 12,
        borderTop: `1px solid ${COLORS.border}`
      }}>
        {item.reason}
      </p>

      <button style={{
        marginTop: 12,
        padding: '6px 12px',
        background: 'transparent',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        color: COLORS.textMuted,
        fontSize: 11,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}>
        <Info size={12} />
        Explain
      </button>
    </div>
  );
};

const MistakeCard = ({ 
  mistake, 
  index, 
  onClick 
}: { 
  mistake: MistakeToAvoid; 
  index: number; 
  onClick: () => void;
}) => (
  <div 
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
      padding: 16,
      background: COLORS.bgInput,
      borderRadius: 12,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: `1px solid ${COLORS.border}`
    }}
  >
    <div style={{
      width: 32,
      height: 32,
      borderRadius: 8,
      background: COLORS.highImpactBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 700,
      color: COLORS.highImpact
    }}>
      {index + 1}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: COLORS.textPrimary }}>
        {mistake.title}
      </div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
        {mistake.description}
      </div>
    </div>
    <ChevronRight size={18} style={{ color: COLORS.textDim }} />
  </div>
);

const EarningsCard = ({ earning }: { earning: EarningsCatalyst }) => (
  <div style={{
    background: COLORS.bgInput,
    borderRadius: 12,
    padding: 16,
    border: `1px solid ${COLORS.border}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.gold }}>{earning.symbol}</span>
        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{earning.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          padding: '3px 8px',
          background: earning.time === 'BMO' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(139, 92, 246, 0.15)',
          color: earning.time === 'BMO' ? '#F59E0B' : '#8B5CF6',
          fontSize: 10,
          fontWeight: 600,
          borderRadius: 4
        }}>
          {earning.time === 'BMO' ? '🌅 Pre-Market' : '🌙 After Hours'}
        </span>
        <ImpactBadge level={earning.impact} size="sm" />
      </div>
    </div>
    
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 10, color: COLORS.textDim }}>Expected Move</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{earning.expectedMove}</div>
      </div>
    </div>

    <div style={{
      padding: 10,
      background: 'rgba(199, 169, 61, 0.05)',
      borderRadius: 8,
      borderLeft: `3px solid ${COLORS.gold}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <Sparkles size={10} style={{ color: COLORS.gold }} />
        <span style={{ fontSize: 9, color: COLORS.gold, fontWeight: 600 }}>AI NOTE</span>
      </div>
      <p style={{ fontSize: 11, color: COLORS.textMuted, margin: 0, lineHeight: 1.4 }}>
        {earning.aiNote}
      </p>
    </div>
  </div>
);

const EconomicEventRow = ({ event }: { event: EconomicEvent }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    background: event.impact === 'high' ? COLORS.highImpactBg : COLORS.bgInput,
    borderRadius: 10,
    border: `1px solid ${event.impact === 'high' ? COLORS.highImpactBorder : COLORS.border}`
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ 
        fontSize: 12, 
        color: COLORS.textDim, 
        fontFamily: 'monospace',
        minWidth: 60 
      }}>
        {event.time}
      </span>
      <div>
        <div style={{ 
          fontSize: 13, 
          color: COLORS.textPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          {event.event}
          {event.impact === 'high' && (
            <AlertTriangle size={12} style={{ color: COLORS.highImpact }} />
          )}
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
      <div>
        <div style={{ color: COLORS.textDim, fontSize: 10 }}>Forecast</div>
        <div style={{ fontWeight: 600 }}>{event.forecast}</div>
      </div>
      <div>
        <div style={{ color: COLORS.textDim, fontSize: 10 }}>Previous</div>
        <div style={{ fontWeight: 600 }}>{event.previous}</div>
      </div>
    </div>
  </div>
);

// ============================================
// LOADING SKELETON
// ============================================
const LoadingSkeleton = () => (
  <div style={{ padding: 24 }}>
    <div style={{ 
      height: 32, 
      width: 300, 
      background: COLORS.bgInput, 
      borderRadius: 8, 
      marginBottom: 24,
      animation: 'pulse 2s infinite'
    }} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ 
          height: 180, 
          background: COLORS.bgCard, 
          borderRadius: 16,
          animation: 'pulse 2s infinite'
        }} />
      ))}
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
export default function MorningRiskBrief() {
  const { data, loading, error } = useMorningBriefData();
  
  const [userMode, setUserMode] = useState<UserMode>({
    type: 'trader',
    horizon: '1D',
    risk: 'balanced',
    universe: 'US'
  });
  const [selectedMistake, setSelectedMistake] = useState<MistakeToAvoid | null>(null);

  // Handlers
  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log('Export PDF');
  };

  const handleSaveToJournal = () => {
    // TODO: Implement save to journal
    console.log('Save to Journal');
  };

  const handleSavePreMarketPlan = () => {
    // TODO: Implement save pre-market plan
    console.log('Save Pre-Market Plan');
  };

  // Loading state
  if (loading) {
    return (
      <AIPageContainer>
        <LoadingSkeleton />
      </AIPageContainer>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <AIPageContainer>
        <div style={{ 
          padding: 40, 
          textAlign: 'center', 
          color: COLORS.highImpact 
        }}>
          <AlertTriangle size={48} style={{ marginBottom: 16 }} />
          <h3>Failed to load Morning Brief</h3>
          <p>{error || 'Unknown error'}</p>
        </div>
      </AIPageContainer>
    );
  }

  const riskLevelConfig = {
    low: { label: 'LOW RISK DAY', bg: COLORS.bullishBg, border: COLORS.bullishBorder, color: COLORS.bullish },
    elevated: { label: 'ELEVATED RISK DAY', bg: COLORS.highImpactBg, border: COLORS.highImpactBorder, color: COLORS.highImpact },
    high: { label: 'HIGH RISK DAY', bg: COLORS.bearishBg, border: COLORS.bearishBorder, color: COLORS.bearish }
  };

  const riskConfig = riskLevelConfig[data.riskLevel];

  return (
    <AIPageContainer>
      {/* Page Header */}
      <AIPageHeader
        title="Morning Risk Brief"
        subtitle="Start Your Day Without Costly Mistakes"
        icon={Shield}
        iconColor={COLORS.mediumImpact}
        userMode={userMode}
        onUserModeChange={setUserMode}
        onExportPDF={handleExportPDF}
        onSaveToJournal={handleSaveToJournal}
        onFeedback={() => console.log('Feedback')}
      />

      {/* RISK DASHBOARD */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          marginBottom: 20 
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Risk Dashboard</h2>
          <span style={{ 
            padding: '4px 10px', 
            background: riskConfig.bg,
            border: `1px solid ${riskConfig.border}`,
            borderRadius: 6,
            fontSize: 11,
            color: riskConfig.color,
            fontWeight: 600
          }}>
            {riskConfig.label}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {data.riskDashboard.map((item) => (
            <RiskCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* MISTAKES TO AVOID + ONE THING */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* 3 Mistakes */}
        <div style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.highImpactBorder}`,
          borderRadius: 20,
          padding: 24
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            marginBottom: 20 
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: COLORS.highImpactBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Ban size={20} style={{ color: COLORS.highImpact }} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                {data.mistakesToAvoid.length} Mistakes to Avoid Today
              </h3>
              <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>
                Based on current market conditions
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.mistakesToAvoid.map((mistake, idx) => (
              <MistakeCard 
                key={idx} 
                mistake={mistake} 
                index={idx}
                onClick={() => setSelectedMistake(mistake)}
              />
            ))}
          </div>
        </div>

        {/* One Thing */}
        <div style={{
          background: `linear-gradient(135deg, ${COLORS.gold}15, ${COLORS.bgCard})`,
          border: `1px solid ${COLORS.borderGold}`,
          borderRadius: 20,
          padding: 24,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            marginBottom: 20 
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(199, 169, 61, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Target size={20} style={{ color: COLORS.gold }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: COLORS.gold }}>
              If You Do ONE Thing
            </h3>
          </div>

          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}>
            <p style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              color: COLORS.textPrimary, 
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.6
            }}>
              "{data.oneThing}"
            </p>
          </div>

          <button 
            onClick={handleSavePreMarketPlan}
            style={{
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
            <FileText size={16} />
            Save as Pre-Market Plan
          </button>
        </div>
      </div>

      {/* SCENARIO BOX */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Crosshair size={20} style={{ color: COLORS.neutral }} />
          Scenario Box
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {data.scenarios.map((scenario, idx) => (
            <ScenarioCard
              key={idx}
              type={scenario.type}
              title={scenario.title}
              trigger={scenario.trigger}
              watchItems={scenario.watchItems}
              affected={scenario.affected}
            />
          ))}
        </div>
      </div>

      {/* EARNINGS & ECONOMIC CALENDAR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Earnings */}
        <div style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 24
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            marginBottom: 20 
          }}>
            <Calendar size={20} style={{ color: COLORS.mediumImpact }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Earnings / Catalysts</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.earningsToday.length > 0 ? (
              data.earningsToday.map((earning, idx) => (
                <EarningsCard key={idx} earning={earning} />
              ))
            ) : (
              <div style={{ 
                padding: 24, 
                textAlign: 'center', 
                color: COLORS.textMuted,
                background: COLORS.bgInput,
                borderRadius: 12
              }}>
                No major earnings today
              </div>
            )}
          </div>
        </div>

        {/* Economic Calendar */}
        <div style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 24
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            marginBottom: 20 
          }}>
            <Globe size={20} style={{ color: COLORS.neutral }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Economic Calendar</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.economicEvents.length > 0 ? (
              data.economicEvents.map((event, idx) => (
                <EconomicEventRow key={idx} event={event} />
              ))
            ) : (
              <div style={{ 
                padding: 24, 
                textAlign: 'center', 
                color: COLORS.textMuted,
                background: COLORS.bgInput,
                borderRadius: 12
              }}>
                No economic events today
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MISTAKE DETAIL DRAWER */}
      <Drawer
        isOpen={!!selectedMistake}
        onClose={() => setSelectedMistake(null)}
        title={selectedMistake?.title || ''}
        width={480}
      >
        {selectedMistake && (
          <div>
            <div style={{
              padding: 20,
              background: COLORS.highImpactBg,
              border: `1px solid ${COLORS.highImpactBorder}`,
              borderRadius: 12,
              marginBottom: 24
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginBottom: 12,
                color: COLORS.highImpact 
              }}>
                <AlertTriangle size={18} />
                <span style={{ fontWeight: 600 }}>Why This Matters Today</span>
              </div>
              <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0, lineHeight: 1.6 }}>
                {selectedMistake.whyToday}
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 8 }}>GENERAL PRINCIPLE</div>
              <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0, lineHeight: 1.6 }}>
                {selectedMistake.description}
              </p>
            </div>

            <div style={{
              padding: 16,
              background: 'rgba(199, 169, 61, 0.05)',
              borderRadius: 12,
              marginBottom: 24
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                marginBottom: 12,
                color: COLORS.gold 
              }}>
                <Sparkles size={14} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>AI RECOMMENDATION</span>
              </div>
              <p style={{ fontSize: 14, color: COLORS.textPrimary, margin: 0, lineHeight: 1.6 }}>
                Consider reducing position sizes or waiting for clearer signals. 
                Today's conditions favor patience over aggression.
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
              Add to Trading Rules
            </button>
          </div>
        )}
      </Drawer>
    </AIPageContainer>
  );
}