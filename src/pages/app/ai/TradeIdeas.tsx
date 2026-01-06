import { useState, useEffect } from 'react';
import {
  Lightbulb, TrendingUp, TrendingDown, Zap, Brain, Flame,
  ChevronDown, ChevronUp, DollarSign, AlertTriangle, Sparkles, Shield,
  Target, Clock, Calendar, X, Filter, Eye, Lock,
  ArrowUpRight, ArrowDownRight, BarChart3, Activity, Bell, Info,
  RefreshCw, ChevronRight, Bookmark, Share2, Calculator, AlertCircle,
  TrendingUp as Trending, FileText, Newspaper, PieChart, Layers,
  CheckCircle, XCircle, HelpCircle, Percent, Volume2
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface TradeIdea {
  id: string;
  symbol: string;
  companyName: string;
  direction: 'long' | 'short';
  catalyst: string;
  catalystType: 'earnings' | 'macro' | 'options_flow' | 'sector' | 'news';
  catalystDetail: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  timeHorizon: 'day' | 'swing' | 'position';
  riskLevel: 'low' | 'medium' | 'high';
  sector: string;
  relatedTickers: string[];
  aiConfidence: 'high' | 'medium' | 'low';
  timestamp: string;
  keyPoints: string[];
  optionsPlay?: OptionsStrategy;
}

interface OptionsStrategy {
  type: 'long_call' | 'long_put' | 'call_spread' | 'put_spread';
  description: string;
  maxRisk: string;
  suggestedExpiry: string;
}

interface UserProfile {
  accountSize: number;
  riskPerTrade: number;
  maxPositionSize: number;
  tradingStyle: {
    dayTrading: number;
    swingTrading: number;
    positionTrading: number;
    longTermInvesting: number;
  };
  optionsEnabled: boolean;
  optionsExperience: 'none' | 'basic' | 'intermediate' | 'advanced';
  nakedOptionsAllowed: boolean;
  preferredSectors: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

interface PositionCalculation {
  dollarRisk: number;
  suggestedShares: number;
  positionValue: number;
  portfolioPercent: number;
}

// ============================================
// MOCK DATA
// ============================================
const USER_PROFILE: UserProfile = {
  accountSize: 150000,
  riskPerTrade: 2,
  maxPositionSize: 15,
  tradingStyle: { dayTrading: 20, swingTrading: 40, positionTrading: 30, longTermInvesting: 10 },
  optionsEnabled: true,
  optionsExperience: 'intermediate',
  nakedOptionsAllowed: false,
  preferredSectors: ['Technology', 'Healthcare', 'Financials'],
  riskTolerance: 'moderate',
};

const TRADE_IDEAS: TradeIdea[] = [
  {
    id: '1',
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    direction: 'long',
    catalyst: 'Unusual Options Activity + AI Demand',
    catalystType: 'options_flow',
    catalystDetail: 'Large call sweeps detected at $920 strike for Feb expiry. Institutional buying ahead of data center revenue report. AI chip demand continues to exceed expectations.',
    currentPrice: 892.45,
    priceChange: 45.23,
    priceChangePercent: 5.34,
    volume: 48500000,
    avgVolume: 35000000,
    volumeRatio: 1.39,
    timeHorizon: 'swing',
    riskLevel: 'medium',
    sector: 'Technology',
    relatedTickers: ['AMD', 'SMCI', 'AVGO'],
    aiConfidence: 'high',
    timestamp: '2026-01-04 08:30',
    keyPoints: [
      'Options flow shows heavy call buying at $920 strike',
      'Volume 39% above average',
      'AI semiconductor demand remains strong',
      'Next earnings Feb 21 - potential run-up'
    ],
    optionsPlay: {
      type: 'call_spread',
      description: 'Bull Call Spread $890/$920',
      maxRisk: 'Defined (premium paid)',
      suggestedExpiry: 'Feb 21 (post-earnings)'
    }
  },
  {
    id: '2',
    symbol: 'XOM',
    companyName: 'Exxon Mobil Corporation',
    direction: 'long',
    catalyst: 'Crude Oil Surge + Geopolitical',
    catalystType: 'macro',
    catalystDetail: 'WTI crude above $78 following Middle East tensions. Energy sector benefiting from supply concerns. XOM trading at discount to peers on P/E basis.',
    currentPrice: 108.90,
    priceChange: 4.45,
    priceChangePercent: 4.26,
    volume: 22000000,
    avgVolume: 15000000,
    volumeRatio: 1.47,
    timeHorizon: 'position',
    riskLevel: 'low',
    sector: 'Energy',
    relatedTickers: ['CVX', 'COP', 'OXY'],
    aiConfidence: 'high',
    timestamp: '2026-01-04 07:45',
    keyPoints: [
      'Oil prices rising on supply concerns',
      'Strong dividend yield 3.4%',
      'Trading below sector average P/E',
      'Beneficiary of energy security focus'
    ],
    optionsPlay: {
      type: 'long_call',
      description: 'Long Call $110 strike',
      maxRisk: 'Premium paid only',
      suggestedExpiry: 'Mar 21'
    }
  },
  {
    id: '3',
    symbol: 'JPM',
    companyName: 'JPMorgan Chase & Co.',
    direction: 'long',
    catalyst: 'Earnings Beat Expected + Rate Environment',
    catalystType: 'earnings',
    catalystDetail: 'Earnings in 2 days. Analysts expect NII beat due to higher-for-longer rates. Credit quality remains strong. Trading desk revenue likely to surprise.',
    currentPrice: 172.45,
    priceChange: 1.85,
    priceChangePercent: 1.08,
    volume: 12000000,
    avgVolume: 9500000,
    volumeRatio: 1.26,
    timeHorizon: 'day',
    riskLevel: 'medium',
    sector: 'Financials',
    relatedTickers: ['BAC', 'GS', 'MS'],
    aiConfidence: 'medium',
    timestamp: '2026-01-04 08:15',
    keyPoints: [
      'Earnings Jan 12 - 2 days away',
      'Net Interest Income expected to beat',
      'Strong trading revenue likely',
      'Credit losses under control'
    ],
    optionsPlay: {
      type: 'call_spread',
      description: 'Bull Call Spread $170/$180',
      maxRisk: 'Defined (premium paid)',
      suggestedExpiry: 'Jan 17 (weekly)'
    }
  },
  {
    id: '4',
    symbol: 'TSLA',
    companyName: 'Tesla Inc.',
    direction: 'short',
    catalyst: 'Delivery Miss + Competition',
    catalystType: 'news',
    catalystDetail: 'Q4 deliveries missed estimates. Chinese EV competition intensifying. Price cuts eroding margins. Earnings Jan 22 may disappoint.',
    currentPrice: 248.50,
    priceChange: -8.90,
    priceChangePercent: -3.46,
    volume: 95000000,
    avgVolume: 80000000,
    volumeRatio: 1.19,
    timeHorizon: 'swing',
    riskLevel: 'high',
    sector: 'Consumer Discretionary',
    relatedTickers: ['RIVN', 'LCID', 'NIO'],
    aiConfidence: 'medium',
    timestamp: '2026-01-04 09:00',
    keyPoints: [
      'Q4 deliveries below consensus',
      'Margin pressure from price cuts',
      'China competition increasing',
      'High volatility expected into earnings'
    ],
    optionsPlay: {
      type: 'put_spread',
      description: 'Bear Put Spread $250/$230',
      maxRisk: 'Defined (premium paid)',
      suggestedExpiry: 'Jan 24 (post-earnings)'
    }
  },
  {
    id: '5',
    symbol: 'AMZN',
    companyName: 'Amazon.com Inc.',
    direction: 'long',
    catalyst: 'AWS Growth + Holiday Sales',
    catalystType: 'sector',
    catalystDetail: 'Cloud spending accelerating. AWS expected to show reacceleration. Holiday retail sales strong. Advertising business continues rapid growth.',
    currentPrice: 178.25,
    priceChange: 3.45,
    priceChangePercent: 1.97,
    volume: 45000000,
    avgVolume: 42000000,
    volumeRatio: 1.07,
    timeHorizon: 'position',
    riskLevel: 'medium',
    sector: 'Consumer Discretionary',
    relatedTickers: ['GOOGL', 'MSFT', 'META'],
    aiConfidence: 'high',
    timestamp: '2026-01-04 08:00',
    keyPoints: [
      'AWS growth reaccelerating',
      'Holiday sales exceeded expectations',
      'Ad revenue growing 25%+ YoY',
      'Cost optimization showing results'
    ],
    optionsPlay: {
      type: 'long_call',
      description: 'Long Call $180 strike',
      maxRisk: 'Premium paid only',
      suggestedExpiry: 'Feb 21'
    }
  },
];

// ============================================
// HELPER COMPONENTS
// ============================================
const CreditBadge = ({ cost, type }: { cost: number; type: 'light' | 'medium' | 'heavy' }) => {
  const config = {
    light: { icon: Zap, color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    medium: { icon: Brain, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    heavy: { icon: Flame, color: '#F97316', bg: 'rgba(249,115,22,0.1)' }
  };
  const { icon: Icon, color, bg } = config[type];
  if (cost === 0) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(34,197,94,0.15)', color: '#22C55E', fontSize: 11, fontWeight: 600, borderRadius: 6 }}><Zap size={12} />FREE</span>;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: bg, color, fontSize: 11, fontWeight: 600, borderRadius: 6 }}><Icon size={12} />{cost}</span>;
};

const CatalystBadge = ({ type }: { type: TradeIdea['catalystType'] }) => {
  const config = {
    earnings: { label: 'Earnings', color: '#F59E0B', icon: Calendar },
    macro: { label: 'Macro Event', color: '#8B5CF6', icon: Activity },
    options_flow: { label: 'Options Flow', color: '#3B82F6', icon: Layers },
    sector: { label: 'Sector', color: '#22C55E', icon: PieChart },
    news: { label: 'News', color: '#EC4899', icon: Newspaper },
  };
  const { label, color, icon: Icon } = config[type];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: `${color}15`, color, fontSize: 11, fontWeight: 600, borderRadius: 6 }}>
      <Icon size={12} />{label}
    </span>
  );
};

const DirectionBadge = ({ direction }: { direction: 'long' | 'short' }) => {
  const isLong = direction === 'long';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '6px 12px',
      background: isLong ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      color: isLong ? '#22C55E' : '#EF4444',
      fontSize: 13, fontWeight: 700, borderRadius: 8,
      textTransform: 'uppercase'
    }}>
      {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {direction}
    </span>
  );
};

const TimeHorizonBadge = ({ horizon }: { horizon: TradeIdea['timeHorizon'] }) => {
  const config = {
    day: { label: 'Day Trade', color: '#EF4444' },
    swing: { label: 'Swing', color: '#F59E0B' },
    position: { label: 'Position', color: '#3B82F6' },
  };
  const { label, color } = config[horizon];
  return (
    <span style={{ padding: '4px 10px', background: `${color}15`, color, fontSize: 11, fontWeight: 600, borderRadius: 6 }}>
      {label}
    </span>
  );
};

const RiskLevelIndicator = ({ level }: { level: 'low' | 'medium' | 'high' }) => {
  const config = {
    low: { label: 'Low Risk', color: '#22C55E', bars: 1 },
    medium: { label: 'Medium Risk', color: '#F59E0B', bars: 2 },
    high: { label: 'High Risk', color: '#EF4444', bars: 3 },
  };
  const { label, color, bars } = config[level];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: 4, height: 12, borderRadius: 2, background: i <= bars ? color : '#2A2A2A' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color }}>{label}</span>
    </div>
  );
};

const ConfidenceBadge = ({ confidence }: { confidence: 'high' | 'medium' | 'low' }) => {
  const config = {
    high: { label: 'High Confidence', color: '#22C55E', icon: CheckCircle },
    medium: { label: 'Medium', color: '#F59E0B', icon: HelpCircle },
    low: { label: 'Low', color: '#EF4444', icon: AlertCircle },
  };
  const { label, color, icon: Icon } = config[confidence];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color }}>
      <Icon size={14} />{label}
    </span>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function TradeIdeas() {
  const [selectedIdea, setSelectedIdea] = useState<TradeIdea | null>(null);
  const [showPositionCalc, setShowPositionCalc] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showOutsideRiskWarning, setShowOutsideRiskWarning] = useState(false);
  const [customStopPrice, setCustomStopPrice] = useState('');
  const [todayCreditsUsed, setTodayCreditsUsed] = useState(false);
  const [viewedIdeas, setViewedIdeas] = useState<Set<string>>(new Set());
  const [filterHorizon, setFilterHorizon] = useState<string | null>(null);
  const [filterCatalyst, setFilterCatalyst] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Filter ideas based on profile
  const getMatchScore = (idea: TradeIdea): number => {
    let score = 0;
    
    // Time horizon match
    if (idea.timeHorizon === 'day' && USER_PROFILE.tradingStyle.dayTrading > 20) score += 30;
    if (idea.timeHorizon === 'swing' && USER_PROFILE.tradingStyle.swingTrading > 20) score += 30;
    if (idea.timeHorizon === 'position' && USER_PROFILE.tradingStyle.positionTrading > 20) score += 30;
    
    // Sector match
    if (USER_PROFILE.preferredSectors.includes(idea.sector)) score += 25;
    
    // Risk match
    if (idea.riskLevel === 'low' && USER_PROFILE.riskTolerance === 'conservative') score += 20;
    if (idea.riskLevel === 'medium' && USER_PROFILE.riskTolerance === 'moderate') score += 20;
    if (idea.riskLevel === 'high' && USER_PROFILE.riskTolerance === 'aggressive') score += 20;
    
    // Confidence
    if (idea.aiConfidence === 'high') score += 15;
    if (idea.aiConfidence === 'medium') score += 10;
    
    return score;
  };

  const isIdeaMatchingProfile = (idea: TradeIdea): boolean => {
    return getMatchScore(idea) >= 50;
  };

  // Filter and sort ideas
  const filteredIdeas = TRADE_IDEAS
    .filter(idea => !filterHorizon || idea.timeHorizon === filterHorizon)
    .filter(idea => !filterCatalyst || idea.catalystType === filterCatalyst)
    .sort((a, b) => getMatchScore(b) - getMatchScore(a))
    .slice(0, 3); // Only 3 per day

  // Position calculator
  const calculatePosition = (price: number, stopPrice: number): PositionCalculation => {
    const dollarRisk = USER_PROFILE.accountSize * (USER_PROFILE.riskPerTrade / 100);
    const riskPerShare = Math.abs(price - stopPrice);
    const suggestedShares = Math.floor(dollarRisk / riskPerShare);
    const positionValue = suggestedShares * price;
    const portfolioPercent = (positionValue / USER_PROFILE.accountSize) * 100;
    
    return { dollarRisk, suggestedShares, positionValue, portfolioPercent };
  };

  const handleViewIdea = (idea: TradeIdea) => {
    if (!viewedIdeas.has(idea.id) && viewedIdeas.size >= 3) {
      // Already viewed 3 ideas today
      return;
    }
    
    if (!viewedIdeas.has(idea.id)) {
      setViewedIdeas(prev => new Set([...prev, idea.id]));
    }
    
    // Check if idea matches profile
    if (!isIdeaMatchingProfile(idea)) {
      setShowOutsideRiskWarning(true);
    }
    
    setSelectedIdea(idea);
  };

  // ============================================
  // IDEA DETAIL MODAL
  // ============================================
  const renderIdeaModal = () => {
    if (!selectedIdea) return null;
    
    const matchesProfile = isIdeaMatchingProfile(selectedIdea);
    const stopPrice = customStopPrice ? parseFloat(customStopPrice) : selectedIdea.currentPrice * (selectedIdea.direction === 'long' ? 0.95 : 1.05);
    const positionCalc = calculatePosition(selectedIdea.currentPrice, stopPrice);
    
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
        <div style={{ background: '#0D1117', border: '1px solid rgba(199,169,61,0.3)', borderRadius: 24, maxWidth: 800, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ padding: 24, borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: '#C7A93D' }}>{selectedIdea.symbol}</span>
                <DirectionBadge direction={selectedIdea.direction} />
                {!matchesProfile && (
                  <span style={{ padding: '4px 10px', background: 'rgba(249,115,22,0.15)', color: '#F59E0B', fontSize: 11, fontWeight: 600, borderRadius: 6 }}>
                    ⚠️ Outside Your Profile
                  </span>
                )}
              </div>
              <p style={{ fontSize: 16, color: '#9CA3AF', margin: 0 }}>{selectedIdea.companyName}</p>
            </div>
            <button onClick={() => setSelectedIdea(null)} style={{ width: 40, height: 40, borderRadius: 10, background: '#1A1A1A', border: 'none', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>

          {/* Warning if outside profile */}
          {!matchesProfile && (
            <div style={{ margin: '0 24px', marginTop: 24, padding: 16, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#F59E0B' }}>This idea is outside your defined risk profile</span>
              </div>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                Based on your settings, this trade may not align with your risk tolerance or trading style. 
                Do you still want to proceed?
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button style={{ padding: '8px 16px', background: '#F59E0B', border: 'none', borderRadius: 8, color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Yes, Show Me Anyway
                </button>
                <button onClick={() => setSelectedIdea(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #F59E0B', borderRadius: 8, color: '#F59E0B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Find Better Match
                </button>
              </div>
            </div>
          )}

          {/* Price & Volume */}
          <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ background: '#0A0A0A', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Current Price</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>${selectedIdea.currentPrice.toFixed(2)}</div>
              <div style={{ fontSize: 14, color: selectedIdea.priceChange >= 0 ? '#22C55E' : '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                {selectedIdea.priceChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {selectedIdea.priceChange >= 0 ? '+' : ''}{selectedIdea.priceChangePercent.toFixed(2)}%
              </div>
            </div>
            <div style={{ background: '#0A0A0A', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Volume</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{(selectedIdea.volume / 1000000).toFixed(1)}M</div>
              <div style={{ fontSize: 14, color: selectedIdea.volumeRatio > 1 ? '#22C55E' : '#9CA3AF' }}>
                {selectedIdea.volumeRatio.toFixed(2)}x avg
              </div>
            </div>
            <div style={{ background: '#0A0A0A', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Time Horizon</div>
              <TimeHorizonBadge horizon={selectedIdea.timeHorizon} />
            </div>
            <div style={{ background: '#0A0A0A', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>AI Confidence</div>
              <ConfidenceBadge confidence={selectedIdea.aiConfidence} />
            </div>
          </div>

          {/* Catalyst */}
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ background: 'linear-gradient(135deg, #0A0A0A, rgba(199,169,61,0.05))', border: '1px solid rgba(199,169,61,0.2)', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Sparkles size={18} style={{ color: '#C7A93D' }} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>Catalyst</span>
                <CatalystBadge type={selectedIdea.catalystType} />
              </div>
              <p style={{ fontSize: 14, color: '#E5E7EB', lineHeight: 1.6, margin: 0, marginBottom: 16 }}>
                {selectedIdea.catalystDetail}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedIdea.keyPoints.map((point, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircle size={14} style={{ color: '#22C55E', marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#9CA3AF' }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Position Calculator */}
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ background: '#0A0A0A', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calculator size={18} style={{ color: '#3B82F6' }} />
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Position Calculator</span>
                </div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  Based on your {USER_PROFILE.riskPerTrade}% risk per trade
                </div>
              </div>

              {/* Risk Reminder */}
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={16} style={{ color: '#22C55E' }} />
                  <span style={{ fontSize: 13, color: '#22C55E', fontWeight: 500 }}>
                    Your max risk per trade: ${(USER_PROFILE.accountSize * USER_PROFILE.riskPerTrade / 100).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Stop Price Input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, display: 'block' }}>
                  Your Stop Price (you decide based on your analysis)
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="number"
                    placeholder={`e.g., ${(selectedIdea.currentPrice * 0.95).toFixed(2)}`}
                    value={customStopPrice}
                    onChange={e => setCustomStopPrice(e.target.value)}
                    style={{ flex: 1, padding: '12px 16px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#fff', fontSize: 16 }}
                  />
                  <button onClick={() => setCustomStopPrice((selectedIdea.currentPrice * 0.95).toFixed(2))} style={{ padding: '12px 16px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#9CA3AF', cursor: 'pointer', fontSize: 13 }}>
                    -5%
                  </button>
                  <button onClick={() => setCustomStopPrice((selectedIdea.currentPrice * 0.92).toFixed(2))} style={{ padding: '12px 16px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#9CA3AF', cursor: 'pointer', fontSize: 13 }}>
                    -8%
                  </button>
                </div>
              </div>

              {/* Calculation Results */}
              {customStopPrice && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Dollar Risk</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#EF4444' }}>${positionCalc.dollarRisk.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Shares</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{positionCalc.suggestedShares}</div>
                  </div>
                  <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Position Value</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>${positionCalc.positionValue.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>% of Portfolio</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: positionCalc.portfolioPercent > USER_PROFILE.maxPositionSize ? '#EF4444' : '#22C55E' }}>
                      {positionCalc.portfolioPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Position Size Warning */}
              {customStopPrice && positionCalc.portfolioPercent > USER_PROFILE.maxPositionSize && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={16} style={{ color: '#EF4444' }} />
                    <span style={{ fontSize: 13, color: '#EF4444' }}>
                      Position exceeds your {USER_PROFILE.maxPositionSize}% max. Consider reducing shares.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Options Strategy */}
          {USER_PROFILE.optionsEnabled && selectedIdea.optionsPlay && (
            <div style={{ padding: '0 24px 24px' }}>
              <div style={{ background: '#0A0A0A', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Layers size={18} style={{ color: '#8B5CF6' }} />
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Options Strategy</span>
                  <CreditBadge cost={5} type="medium" />
                </div>

                <div style={{ background: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{selectedIdea.optionsPlay.description}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>Max Risk</div>
                      <div style={{ fontSize: 13, color: '#22C55E' }}>{selectedIdea.optionsPlay.maxRisk}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>Suggested Expiry</div>
                      <div style={{ fontSize: 13 }}>{selectedIdea.optionsPlay.suggestedExpiry}</div>
                    </div>
                  </div>
                </div>

                {/* Options Selection */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Available Strategies:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {[
                      { type: 'long_call', label: 'Long Call', desc: 'Bullish, limited risk', risk: 'Premium only' },
                      { type: 'long_put', label: 'Long Put', desc: 'Bearish, limited risk', risk: 'Premium only' },
                      { type: 'call_spread', label: 'Bull Call Spread', desc: 'Bullish, defined risk', risk: 'Net debit' },
                      { type: 'put_spread', label: 'Bear Put Spread', desc: 'Bearish, defined risk', risk: 'Net debit' },
                    ].map(strat => (
                      <button key={strat.type} style={{
                        padding: 14,
                        background: selectedIdea.optionsPlay?.type === strat.type ? 'rgba(139,92,246,0.15)' : '#1A1A1A',
                        border: `1px solid ${selectedIdea.optionsPlay?.type === strat.type ? '#8B5CF6' : '#2A2A2A'}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: selectedIdea.optionsPlay?.type === strat.type ? '#8B5CF6' : '#fff' }}>{strat.label}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{strat.desc}</div>
                        <div style={{ fontSize: 11, color: '#22C55E', marginTop: 4 }}>Risk: {strat.risk}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spread Risk Reminder */}
                {(selectedIdea.optionsPlay.type === 'call_spread' || selectedIdea.optionsPlay.type === 'put_spread') && (
                  <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Info size={16} style={{ color: '#8B5CF6', marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, color: '#8B5CF6', fontWeight: 500 }}>Spread Risk Management</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                          With a spread, your max risk is the net debit paid. Make sure this doesn't exceed your ${(USER_PROFILE.accountSize * USER_PROFILE.riskPerTrade / 100).toLocaleString()} risk limit per trade.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Strategy Selection Note */}
                <div style={{ background: 'rgba(199,169,61,0.1)', border: '1px solid rgba(199,169,61,0.2)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Lightbulb size={16} style={{ color: '#C7A93D', marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 13, color: '#C7A93D', fontWeight: 500 }}>Use Your Judgment</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                        Choose between a single option (Call/Put) or a spread based on the price movement you expect. 
                        Spreads limit your profit but also limit risk. Single options have unlimited upside but cost more premium.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Naked Options Warning */}
                {!USER_PROFILE.nakedOptionsAllowed && (
                  <div style={{ marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Lock size={16} style={{ color: '#EF4444' }} />
                      <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 500 }}>
                        Naked options (selling uncovered calls/puts) are disabled in your profile
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, marginLeft: 24 }}>
                      These strategies carry VERY HIGH RISK with potentially unlimited losses. Enable in settings only if you fully understand the risks.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Related Tickers */}
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Related Tickers</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedIdea.relatedTickers.map(ticker => (
                <span key={ticker} style={{ padding: '6px 12px', background: '#1A1A1A', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#9CA3AF' }}>
                  {ticker}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: 24, borderTop: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              Generated: {selectedIdea.timestamp} • Sector: {selectedIdea.sector}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ padding: '10px 20px', background: '#1A1A1A', border: 'none', borderRadius: 8, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Bookmark size={14} /> Save
              </button>
              <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 8, color: '#000', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                I Understand the Risks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', color: '#fff' }}>
      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '20%', right: '20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(199,169,61,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(199,169,61,0.3)' }}>
              <Lightbulb size={28} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Trade Ideas</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6B7280', fontSize: 14 }}>
                <span>Catalyst-based opportunities</span>
                <span>•</span>
                <span>{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })} ET</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: '10px 16px', background: '#0D1117', border: '1px solid #2A2A2A', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={16} style={{ color: '#6B7280' }} />
              <span style={{ fontSize: 14 }}>{viewedIdeas.size}/3 viewed today</span>
            </div>
            <button disabled={todayCreditsUsed} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px',
              background: todayCreditsUsed ? '#1A1A1A' : 'linear-gradient(135deg, #C7A93D, #A68B2D)',
              border: 'none', borderRadius: 8,
              color: todayCreditsUsed ? '#4A4A4A' : '#000',
              cursor: todayCreditsUsed ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600
            }}>
              <RefreshCw size={16} />
              {todayCreditsUsed ? 'Refresh Tomorrow' : 'Refresh Ideas'}
              {!todayCreditsUsed && <CreditBadge cost={5} type="medium" />}
            </button>
          </div>
        </div>

        {/* Profile Match Info */}
        <div style={{ background: 'linear-gradient(135deg, #0D1117, rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Target size={20} style={{ color: '#22C55E' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Ideas Matched to Your Profile</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Risk: {USER_PROFILE.riskTolerance} • Style: {USER_PROFILE.tradingStyle.swingTrading > 30 ? 'Swing' : 'Day'} Focus • Sectors: {USER_PROFILE.preferredSectors.slice(0, 2).join(', ')}
              </div>
            </div>
          </div>
          <button style={{ padding: '8px 16px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: '#22C55E', cursor: 'pointer', fontSize: 13 }}>
            Edit Profile
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} style={{ color: '#6B7280' }} />
            <span style={{ fontSize: 13, color: '#6B7280' }}>Filter:</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'day', 'swing', 'position'].map(h => (
              <button
                key={h}
                onClick={() => setFilterHorizon(h === 'all' ? null : h)}
                style={{
                  padding: '6px 14px',
                  background: (filterHorizon === h || (h === 'all' && !filterHorizon)) ? 'rgba(199,169,61,0.15)' : '#0D1117',
                  border: `1px solid ${(filterHorizon === h || (h === 'all' && !filterHorizon)) ? 'rgba(199,169,61,0.3)' : '#2A2A2A'}`,
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: 500,
                  color: (filterHorizon === h || (h === 'all' && !filterHorizon)) ? '#C7A93D' : '#6B7280',
                  textTransform: 'capitalize'
                }}
              >
                {h === 'all' ? 'All' : h}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: '#2A2A2A' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'earnings', label: 'Earnings' },
              { key: 'macro', label: 'Macro' },
              { key: 'options_flow', label: 'Options' },
              { key: 'news', label: 'News' },
            ].map(c => (
              <button
                key={c.key}
                onClick={() => setFilterCatalyst(filterCatalyst === c.key ? null : c.key)}
                style={{
                  padding: '6px 14px',
                  background: filterCatalyst === c.key ? 'rgba(199,169,61,0.15)' : '#0D1117',
                  border: `1px solid ${filterCatalyst === c.key ? 'rgba(199,169,61,0.3)' : '#2A2A2A'}`,
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: 500,
                  color: filterCatalyst === c.key ? '#C7A93D' : '#6B7280'
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ideas Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {filteredIdeas.map((idea, index) => {
            const matchesProfile = isIdeaMatchingProfile(idea);
            const isViewed = viewedIdeas.has(idea.id);
            
            return (
              <div
                key={idea.id}
                style={{
                  background: '#0D1117',
                  border: `1px solid ${matchesProfile ? 'rgba(34,197,94,0.2)' : 'rgba(249,115,22,0.2)'}`,
                  borderRadius: 20,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Card Header */}
                <div style={{ padding: 20, borderBottom: '1px solid #1A1A1A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 24, fontWeight: 700, color: '#C7A93D' }}>{idea.symbol}</span>
                        <DirectionBadge direction={idea.direction} />
                      </div>
                      <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{idea.companyName}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {matchesProfile ? (
                        <span style={{ padding: '4px 8px', background: 'rgba(34,197,94,0.15)', borderRadius: 6, fontSize: 10, color: '#22C55E', fontWeight: 600 }}>
                          ✓ Matches Profile
                        </span>
                      ) : (
                        <span style={{ padding: '4px 8px', background: 'rgba(249,115,22,0.15)', borderRadius: 6, fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>
                          ⚠️ Outside Profile
                        </span>
                      )}
                      <RiskLevelIndicator level={idea.riskLevel} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <CatalystBadge type={idea.catalystType} />
                    <TimeHorizonBadge horizon={idea.timeHorizon} />
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: 20 }}>
                  {/* Catalyst Preview */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{idea.catalyst}</div>
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {idea.catalystDetail}
                    </p>
                  </div>

                  {/* Quick Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Price</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>${idea.currentPrice.toFixed(2)}</div>
                      <div style={{ fontSize: 12, color: idea.priceChange >= 0 ? '#22C55E' : '#EF4444' }}>
                        {idea.priceChange >= 0 ? '+' : ''}{idea.priceChangePercent.toFixed(2)}%
                      </div>
                    </div>
                    <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Volume</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{(idea.volume / 1000000).toFixed(1)}M</div>
                      <div style={{ fontSize: 12, color: idea.volumeRatio > 1 ? '#22C55E' : '#9CA3AF' }}>
                        {idea.volumeRatio.toFixed(1)}x avg
                      </div>
                    </div>
                  </div>

                  {/* AI Confidence */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <ConfidenceBadge confidence={idea.aiConfidence} />
                    {idea.optionsPlay && USER_PROFILE.optionsEnabled && (
                      <span style={{ fontSize: 11, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Layers size={12} /> Options Available
                      </span>
                    )}
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => handleViewIdea(idea)}
                    disabled={!isViewed && viewedIdeas.size >= 3}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: isViewed ? '#1A1A1A' : 'linear-gradient(135deg, #C7A93D, #A68B2D)',
                      border: 'none',
                      borderRadius: 12,
                      color: isViewed ? '#9CA3AF' : '#000',
                      cursor: (!isViewed && viewedIdeas.size >= 3) ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    {isViewed ? (
                      <>View Again</>
                    ) : viewedIdeas.size >= 3 ? (
                      <>Daily Limit Reached</>
                    ) : (
                      <>View Full Analysis <CreditBadge cost={3} type="medium" /></>
                    )}
                  </button>
                </div>

                {/* Card Footer */}
                <div style={{ padding: '12px 20px', background: '#0A0A0A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{idea.timestamp}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {idea.relatedTickers.slice(0, 3).map(t => (
                      <span key={t} style={{ fontSize: 10, color: '#6B7280', background: '#1A1A1A', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* More Ideas Teaser */}
        <div style={{ marginTop: 32, background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 16, padding: 24, textAlign: 'center' }}>
          <Lock size={32} style={{ color: '#6B7280', marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Want More Ideas?</h3>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            Upgrade to PRO for 10+ curated trade ideas weekly, unlimited views, and priority alerts.
          </p>
          <button style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Upgrade to PRO
          </button>
        </div>
      </div>

      {/* Idea Detail Modal */}
      {renderIdeaModal()}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        input:focus { outline: none; border-color: #C7A93D !important; }
      `}</style>
    </div>
  );
}