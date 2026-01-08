import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  ChevronRight,
  Activity,
  Globe,
  Building2,
  Layers,
  Flame,
  Eye,
  Target,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  BarChart3,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Calendar,
  Bell,
  LineChart
} from 'lucide-react';
import {
  AIPageContainer,
  AIPageHeader,
  ImpactBadge,
  AIInsightCard,
  MetricBox,
  ScenarioCard,
  TimelineEvent,
  SectorHeatCard,
  Drawer,
  COLORS,
  UserMode,
  ImpactLevel
} from "./AIDesignSystem";

// ============================================
// TYPES
// ============================================
interface TopDriver {
  id: string;
  type: 'macro' | 'market' | 'sector';
  title: string;
  whyItMatters: string;
  whatHappened: string;
  soWhat: string;
  affectedSectors: string[];
  affectedStyles: string[];
  impact: ImpactLevel;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface ActionMapItem {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

interface MarketTimelineEvent {
  time: string;
  title: string;
  description: string;
  impact: ImpactLevel;
}

interface SectorHeat {
  name: string;
  change: number;
  reason: string;
  topGainer?: string;
  topLoser?: string;
}

interface DeltaItem {
  text: string;
  isChanged: boolean;
}

// ============================================
// MOCK DATA - Replace with real data later
// ============================================
const TOP_3_DRIVERS: TopDriver[] = [
  {
    id: '1',
    type: 'macro',
    title: 'ISM Services Shock → Rate Sensitivity Rising',
    whyItMatters: 'Services inflation sticky = Fed stays hawkish longer than expected',
    whatHappened: 'ISM Services PMI came in at 54.1 vs 52.5 expected. Prices paid component jumped to 64.2, highest since February.',
    soWhat: 'Markets repricing rate cut expectations. June cut probability dropped from 65% to 45% overnight.',
    affectedSectors: ['Tech Growth', 'REITs', 'Utilities'],
    affectedStyles: ['Growth', 'Duration-Sensitive'],
    impact: 'high',
    sentiment: 'bearish'
  },
  {
    id: '2',
    type: 'market',
    title: 'Vol Regime Shifted to Risk-Off',
    whyItMatters: 'VIX structure inverted - near-term fear exceeding long-term',
    whatHappened: 'VIX term structure inverted for first time since October. Spot VIX at 18.5, 3-month at 17.2.',
    soWhat: 'Expect choppy price action with elevated downside risk. Breakout plays less reliable.',
    affectedSectors: ['High Beta', 'Small Caps'],
    affectedStyles: ['Momentum', 'Breakout'],
    impact: 'high',
    sentiment: 'bearish'
  },
  {
    id: '3',
    type: 'sector',
    title: 'Semis Leadership Rotating to Defensives',
    whyItMatters: 'AI trade taking a breather as money flows to quality',
    whatHappened: 'SOX index underperforming SPX by 2.3% over 5 days. Relative strength breaking down.',
    soWhat: 'Consider trimming semis overweight. Staples and Healthcare showing relative strength.',
    affectedSectors: ['Semiconductors', 'Consumer Staples', 'Healthcare'],
    affectedStyles: ['Quality', 'Low Vol'],
    impact: 'medium',
    sentiment: 'neutral'
  }
];

const ACTION_MAP: ActionMapItem[] = [
  { label: 'Risk Today', value: 'ELEVATED', color: COLORS.mediumImpact, icon: Shield },
  { label: 'Best Style', value: 'Mean Reversion', color: COLORS.bullish, icon: Target },
  { label: 'Key Watch', value: 'TLT, XLU, GLD', color: COLORS.gold, icon: Eye },
  { label: 'Avoid', value: 'Chasing breakouts', color: COLORS.bearish, icon: XCircle }
];

const MARKET_TIMELINE: MarketTimelineEvent[] = [
  { time: '06:00', title: 'Asia Close', description: 'Nikkei -1.2%, Hang Seng flat', impact: 'medium' },
  { time: '08:30', title: 'Initial Claims', description: '218K vs 215K exp', impact: 'medium' },
  { time: '10:00', title: 'ISM Services', description: '54.1 vs 52.5 exp - BIG MISS', impact: 'high' },
  { time: '11:00', title: 'Fed Williams Speaks', description: 'May comment on inflation', impact: 'high' },
  { time: '13:00', title: '10Y Auction', description: '$42B - watch bid-to-cover', impact: 'medium' },
  { time: '14:00', title: 'Fed Beige Book', description: 'Economic conditions update', impact: 'medium' },
  { time: '16:00', title: 'Market Close', description: 'Watch for after-hours moves', impact: 'noise' }
];

const HOT_SECTORS: SectorHeat[] = [
  { name: 'Energy', change: 2.34, reason: 'Oil above $78 on Middle East tensions', topGainer: 'XOM +3.1%' },
  { name: 'Utilities', change: 1.12, reason: 'Defensive rotation as vol spikes', topGainer: 'NEE +1.8%' },
  { name: 'Healthcare', change: 0.89, reason: 'Quality bid, pharma earnings strong', topGainer: 'LLY +2.1%' }
];

const WEAK_SECTORS: SectorHeat[] = [
  { name: 'Technology', change: -1.87, reason: 'Rate sensitivity + profit taking', topLoser: 'NVDA -3.2%' },
  { name: 'Real Estate', change: -1.45, reason: 'Higher for longer rates hurt REITs', topLoser: 'O -2.8%' },
  { name: 'Consumer Disc.', change: -0.92, reason: 'Consumer spending concerns', topLoser: 'TSLA -1.9%' }
];

const ROTATION_WATCH = {
  from: 'Growth → Value',
  description: 'Money flowing from high-duration growth to dividend payers',
  evidence: ['IWF/IWD ratio breaking down', 'Staples outperforming Tech 5th day', 'Quality factor +1.2% vs Momentum -0.8%']
};

const DELTA_ITEMS: DeltaItem[] = [
  { text: 'VIX regime shifted to elevated (was calm)', isChanged: true },
  { text: 'Fed cut expectations dropped to 45% (was 65%)', isChanged: true },
  { text: 'Semis leadership weakening (was strong)', isChanged: true },
  { text: 'Earnings season sentiment still positive', isChanged: false },
  { text: 'China stimulus expectations unchanged', isChanged: false }
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function AIDailyIntelligence() {
  const [userMode, setUserMode] = useState<UserMode>({
    type: 'trader',
    horizon: '1D',
    risk: 'balanced',
    universe: 'US'
  });
  const [selectedDriver, setSelectedDriver] = useState<TopDriver | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ============================================
  // DRIVER CARD COMPONENT
  // ============================================
  const DriverCard = ({ driver, index }: { driver: TopDriver; index: number }) => {
    const typeConfig = {
      macro: { icon: Globe, label: 'Macro Driver', color: COLORS.neutral },
      market: { icon: Activity, label: 'Market Driver', color: COLORS.mediumImpact },
      sector: { icon: Layers, label: 'Sector Driver', color: COLORS.technology }
    };

    const { icon: Icon, label, color } = typeConfig[driver.type];
    const sentimentColor = driver.sentiment === 'bullish' ? COLORS.bullish : 
                          driver.sentiment === 'bearish' ? COLORS.bearish : COLORS.neutral;

    return (
      <div 
        onClick={() => setSelectedDriver(driver)}
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${driver.impact === 'high' ? COLORS.highImpactBorder : COLORS.border}`,
          borderRadius: 20,
          padding: 24,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Impact Glow for High Impact */}
        {driver.impact === 'high' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${COLORS.highImpact}, transparent)`
          }} />
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={20} style={{ color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <ImpactBadge level={driver.impact} size="sm" />
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                background: `${sentimentColor}15`,
                borderRadius: 4,
                fontSize: 10,
                color: sentimentColor,
                fontWeight: 600
              }}>
                {driver.sentiment === 'bullish' && <TrendingUp size={10} />}
                {driver.sentiment === 'bearish' && <TrendingDown size={10} />}
                {driver.sentiment === 'neutral' && <MinusCircle size={10} />}
                {driver.sentiment.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          margin: '0 0 12px',
          lineHeight: 1.3
        }}>
          {driver.title}
        </h3>

        {/* What Happened */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>WHAT HAPPENED</div>
          <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>
            {driver.whatHappened}
          </p>
        </div>

        {/* So What */}
        <div style={{
          padding: 12,
          background: 'rgba(199, 169, 61, 0.05)',
          borderRadius: 10,
          borderLeft: `3px solid ${COLORS.gold}`,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Sparkles size={12} style={{ color: COLORS.gold }} />
            <span style={{ fontSize: 11, color: COLORS.gold, fontWeight: 600 }}>SO WHAT</span>
          </div>
          <p style={{ fontSize: 13, color: COLORS.textPrimary, margin: 0, lineHeight: 1.5 }}>
            {driver.soWhat}
          </p>
        </div>

        {/* Affected */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 4 }}>SECTORS AFFECTED</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {driver.affectedSectors.map((sector, idx) => (
                <span key={idx} style={{
                  padding: '3px 8px',
                  background: COLORS.bgInput,
                  borderRadius: 4,
                  fontSize: 11,
                  color: COLORS.textMuted
                }}>
                  {sector}
                </span>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 4 }}>STYLES AFFECTED</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {driver.affectedStyles.map((style, idx) => (
                <span key={idx} style={{
                  padding: '3px 8px',
                  background: COLORS.bgInput,
                  borderRadius: 4,
                  fontSize: 11,
                  color: COLORS.textMuted
                }}>
                  {style}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Click to Expand Hint */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${COLORS.border}`
        }}>
          <span style={{ fontSize: 12, color: COLORS.textDim }}>Click to expand</span>
          <ChevronRight size={14} style={{ color: COLORS.textDim }} />
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
        title="Today's Intelligence"
        subtitle="What Really Matters Today"
        icon={Brain}
        iconColor={COLORS.gold}
        userMode={userMode}
        onUserModeChange={setUserMode}
        onExportPDF={() => console.log('Export PDF')}
        onSaveToJournal={() => console.log('Save to Journal')}
        onFeedback={() => console.log('Feedback')}
      />

      {/* ============================================ */}
      {/* HERO SECTION - Top 3 Drivers */}
      {/* ============================================ */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          marginBottom: 20 
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            3 Things Matter Today
          </h2>
          <span style={{ 
            padding: '4px 12px', 
            background: COLORS.bgCard, 
            borderRadius: 20,
            fontSize: 13,
            color: COLORS.textMuted 
          }}>
            Everything else is noise
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {TOP_3_DRIVERS.map((driver, idx) => (
            <DriverCard key={driver.id} driver={driver} index={idx} />
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* ACTION MAP + TIMELINE ROW */}
      {/* ============================================ */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, marginBottom: 40 }}>
        {/* Action Map */}
        <div style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderGold}`,
          borderRadius: 20,
          padding: 24
        }}>
          <h3 style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            margin: '0 0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Target size={18} style={{ color: COLORS.gold }} />
            Action Map
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ACTION_MAP.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  background: COLORS.bgInput,
                  borderRadius: 12
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${item.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={18} style={{ color: item.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: COLORS.textDim, textTransform: 'uppercase' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: item.color }}>
                      {item.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Market Timeline */}
        <div style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 20,
          padding: 24
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 20 
          }}>
            <h3 style={{ 
              fontSize: 16, 
              fontWeight: 600, 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Clock size={18} style={{ color: COLORS.neutral }} />
              Market Timeline
            </h3>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: 300,
            overflowY: 'auto'
          }}>
            {MARKET_TIMELINE.map((event, idx) => (
              <TimelineEvent
                key={idx}
                time={event.time}
                title={event.title}
                description={event.description}
                impact={event.impact}
                isActive={idx === 2} // ISM is the active event
              />
            ))}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* HEAT OF THE DAY */}
      {/* ============================================ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Flame size={20} style={{ color: COLORS.mediumImpact }} />
          Heat of the Day
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {/* Hot Sectors */}
          <div style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.bullishBorder}`,
            borderRadius: 16,
            padding: 20
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              marginBottom: 16 
            }}>
              <TrendingUp size={18} style={{ color: COLORS.bullish }} />
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: COLORS.bullish }}>
                Hot Sectors
              </h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {HOT_SECTORS.map((sector, idx) => (
                <SectorHeatCard key={idx} {...sector} />
              ))}
            </div>
          </div>

          {/* Weak Sectors */}
          <div style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.bearishBorder}`,
            borderRadius: 16,
            padding: 20
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              marginBottom: 16 
            }}>
              <TrendingDown size={18} style={{ color: COLORS.bearish }} />
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: COLORS.bearish }}>
                Weak Sectors
              </h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {WEAK_SECTORS.map((sector, idx) => (
                <SectorHeatCard key={idx} {...sector} />
              ))}
            </div>
          </div>

          {/* Rotation Watch */}
          <div style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.borderGold}`,
            borderRadius: 16,
            padding: 20
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              marginBottom: 16 
            }}>
              <RefreshCw size={18} style={{ color: COLORS.gold }} />
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: COLORS.gold }}>
                Rotation Watch
              </h4>
            </div>
            
            <div style={{
              padding: 16,
              background: 'rgba(199, 169, 61, 0.05)',
              borderRadius: 12,
              marginBottom: 16
            }}>
              <div style={{ 
                fontSize: 20, 
                fontWeight: 700, 
                marginBottom: 8,
                background: `linear-gradient(90deg, ${COLORS.bearish}, ${COLORS.bullish})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {ROTATION_WATCH.from}
              </div>
              <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
                {ROTATION_WATCH.description}
              </p>
            </div>

            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 8 }}>EVIDENCE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ROTATION_WATCH.evidence.map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  fontSize: 12,
                  color: COLORS.textSecondary
                }}>
                  <CheckCircle2 size={12} style={{ color: COLORS.gold }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* WHAT CHANGED SINCE YESTERDAY */}
      {/* ============================================ */}
      <div style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
        padding: 24,
        marginBottom: 40
      }}>
        <h3 style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Calendar size={20} style={{ color: COLORS.neutral }} />
          What Changed Since Yesterday?
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Changed */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              marginBottom: 12,
              color: COLORS.mediumImpact,
              fontSize: 12,
              fontWeight: 600
            }}>
              <AlertTriangle size={14} />
              CHANGED
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DELTA_ITEMS.filter(d => d.isChanged).map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  background: COLORS.mediumImpactBg,
                  borderRadius: 8,
                  border: `1px solid ${COLORS.mediumImpactBorder}`
                }}>
                  <ArrowUpRight size={16} style={{ color: COLORS.mediumImpact }} />
                  <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Unchanged */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              marginBottom: 12,
              color: COLORS.textDim,
              fontSize: 12,
              fontWeight: 600
            }}>
              <MinusCircle size={14} />
              UNCHANGED
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DELTA_ITEMS.filter(d => !d.isChanged).map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  background: COLORS.bgInput,
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`
                }}>
                  <CheckCircle2 size={16} style={{ color: COLORS.bullish }} />
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* QUICK NAV TO OTHER AI PAGES */}
      {/* ============================================ */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.bgCard}, rgba(199, 169, 61, 0.03))`,
        border: `1px solid ${COLORS.borderGold}`,
        borderRadius: 20,
        padding: 24
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
          Explore More Intelligence
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { icon: Shield, title: 'Morning Risk Brief', desc: 'Avoid costly mistakes', path: '/app/ai/morning-brief', color: COLORS.mediumImpact },
            { icon: Globe, title: 'Macro Translator', desc: 'ISM → Market impact', path: '/app/ai/macro-earnings', color: COLORS.neutral },
            { icon: Activity, title: 'Market Pulse', desc: 'Why things are moving', path: '/app/ai/market-pulse', color: COLORS.bullish },
            { icon: LineChart, title: 'Momentum Lab', desc: 'Who\'s strong/weak', path: '/app/ai/momentum-lab', color: COLORS.technology }
          ].map((item, idx) => (
            <Link
              key={idx}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 16,
                background: COLORS.bgInput,
                borderRadius: 12,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${item.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <item.icon size={20} style={{ color: item.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>{item.desc}</div>
              </div>
              <ChevronRight size={18} style={{ color: COLORS.textDim }} />
            </Link>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* DRIVER DETAIL DRAWER */}
      {/* ============================================ */}
      <Drawer
        isOpen={!!selectedDriver}
        onClose={() => setSelectedDriver(null)}
        title={selectedDriver?.title || ''}
        width={560}
      >
        {selectedDriver && (
          <div>
            {/* Impact & Sentiment */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <ImpactBadge level={selectedDriver.impact} size="lg" />
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 14px',
                background: selectedDriver.sentiment === 'bullish' ? COLORS.bullishBg :
                            selectedDriver.sentiment === 'bearish' ? COLORS.bearishBg : COLORS.neutralBg,
                border: `1px solid ${selectedDriver.sentiment === 'bullish' ? COLORS.bullishBorder :
                                     selectedDriver.sentiment === 'bearish' ? COLORS.bearishBorder : COLORS.neutralBorder}`,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: selectedDriver.sentiment === 'bullish' ? COLORS.bullish :
                       selectedDriver.sentiment === 'bearish' ? COLORS.bearish : COLORS.neutral
              }}>
                {selectedDriver.sentiment === 'bullish' && <TrendingUp size={14} />}
                {selectedDriver.sentiment === 'bearish' && <TrendingDown size={14} />}
                {selectedDriver.sentiment.charAt(0).toUpperCase() + selectedDriver.sentiment.slice(1)} Bias
              </span>
            </div>

            {/* Why It Matters */}
            <div style={{
              padding: 16,
              background: 'rgba(199, 169, 61, 0.1)',
              borderRadius: 12,
              marginBottom: 24
            }}>
              <div style={{ fontSize: 12, color: COLORS.gold, fontWeight: 600, marginBottom: 8 }}>
                WHY IT MATTERS
              </div>
              <p style={{ fontSize: 15, color: COLORS.textPrimary, margin: 0, lineHeight: 1.6 }}>
                {selectedDriver.whyItMatters}
              </p>
            </div>

            {/* What Happened */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600, marginBottom: 8 }}>
                WHAT HAPPENED
              </div>
              <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0, lineHeight: 1.6 }}>
                {selectedDriver.whatHappened}
              </p>
            </div>

            {/* So What */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600, marginBottom: 8 }}>
                SO WHAT
              </div>
              <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0, lineHeight: 1.6 }}>
                {selectedDriver.soWhat}
              </p>
            </div>

            {/* Affected Sectors */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600, marginBottom: 8 }}>
                AFFECTED SECTORS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedDriver.affectedSectors.map((sector, idx) => (
                  <span key={idx} style={{
                    padding: '8px 14px',
                    background: COLORS.bgInput,
                    borderRadius: 8,
                    fontSize: 13,
                    color: COLORS.textSecondary,
                    border: `1px solid ${COLORS.border}`
                  }}>
                    {sector}
                  </span>
                ))}
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
                Add to Today's Focus
              </button>
              <button style={{
                padding: '14px 24px',
                background: COLORS.bgInput,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                color: COLORS.textMuted,
                fontSize: 14,
                cursor: 'pointer'
              }}>
                Share
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </AIPageContainer>
  );
}