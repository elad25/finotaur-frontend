import { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Zap,
  Brain,
  Flame,
  Clock,
  Globe,
  ChevronRight,
  Eye,
  Sparkles,
  BarChart3,
  Activity,
  Volume2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileText,
  Star,
  Bell,
  Target,
  Shield,
  Newspaper,
  Building2,
  DollarSign,
  TrendingUp as Upgrade,
  ChevronDown,
  ExternalLink
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  status: 'up' | 'down' | 'flat';
}

interface FuturesData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  time: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  tickers: string[];
  importance: 'high' | 'medium' | 'low';
  aiTakeaway: string;
}

interface EarningsReport {
  symbol: string;
  name: string;
  time: 'BMO' | 'AMC';
  epsEstimate: number;
  revenueEstimate: string;
  importance: 'high' | 'medium' | 'low';
  previousEPS: number;
  whisperNumber?: number;
}

interface AnalystAction {
  symbol: string;
  firm: string;
  action: 'upgrade' | 'downgrade' | 'initiated' | 'reiterated';
  rating: string;
  priceTarget: number;
  previousTarget?: number;
  time: string;
}

interface EconomicEvent {
  time: string;
  event: string;
  actual?: string;
  forecast: string;
  previous: string;
  importance: 'high' | 'medium' | 'low';
}

// ============================================
// MOCK DATA - Replace with real API calls
// ============================================
const MARKET_INDICES: MarketIndex[] = [
  { symbol: 'SPX', name: 'S&P 500', price: 6012.45, change: 28.34, changePercent: 0.47, status: 'up' },
  { symbol: 'NDX', name: 'Nasdaq 100', price: 21456.78, change: 156.23, changePercent: 0.73, status: 'up' },
  { symbol: 'DJI', name: 'Dow Jones', price: 44235.67, change: -45.12, changePercent: -0.10, status: 'down' },
  { symbol: 'RUT', name: 'Russell 2000', price: 2287.45, change: 12.67, changePercent: 0.56, status: 'up' },
];

const VIX_DATA = {
  current: 14.23,
  change: -0.87,
  changePercent: -5.76,
  level: 'Low' as const,
  interpretation: 'Market complacency high. Historically, VIX below 15 often precedes volatility spikes.'
};

const FUTURES_DATA: FuturesData[] = [
  { symbol: 'ES', name: 'S&P 500 Futures', price: 6018.25, change: 12.50, changePercent: 0.21 },
  { symbol: 'NQ', name: 'Nasdaq Futures', price: 21512.00, change: 78.25, changePercent: 0.36 },
  { symbol: 'YM', name: 'Dow Futures', price: 44298.00, change: -28.00, changePercent: -0.06 },
  { symbol: 'RTY', name: 'Russell Futures', price: 2292.30, change: 8.40, changePercent: 0.37 },
];

const TOP_NEWS: NewsItem[] = [
  {
    id: '1',
    headline: 'Fed Officials Signal Patience on Rate Cuts Amid Sticky Inflation',
    summary: 'Multiple Fed governors indicated they need more evidence of cooling inflation before considering rate reductions, pushing back against market expectations for early 2026 cuts.',
    source: 'Reuters',
    time: '2h ago',
    sentiment: 'bearish',
    tickers: ['SPY', 'TLT', 'GLD'],
    importance: 'high',
    aiTakeaway: 'Hawkish Fed tone = headwind for rate-sensitive growth stocks. Consider defensive positioning. Bond yields likely to stay elevated near-term.'
  },
  {
    id: '2',
    headline: 'NVIDIA Announces Next-Gen Blackwell Ultra Chips at CES 2026',
    summary: 'NVIDIA unveiled its most powerful AI chips yet, claiming 4x performance improvement over current generation. Major cloud providers already placing orders.',
    source: 'Bloomberg',
    time: '4h ago',
    sentiment: 'bullish',
    tickers: ['NVDA', 'AMD', 'SMCI', 'AVGO'],
    importance: 'high',
    aiTakeaway: 'NVDA continues AI dominance. Positive for entire semiconductor ecosystem. Watch for AMD response and potential margin pressure concerns.'
  },
  {
    id: '3',
    headline: 'China Manufacturing PMI Returns to Expansion Territory',
    summary: 'Official manufacturing PMI rose to 50.3 in December, beating expectations of 49.8 and signaling stabilization in the world\'s second-largest economy.',
    source: 'CNBC',
    time: '6h ago',
    sentiment: 'bullish',
    tickers: ['FXI', 'BABA', 'PDD', 'JD'],
    importance: 'medium',
    aiTakeaway: 'China recovery signs could boost global growth sentiment. EM exposure may benefit. Watch copper and commodities for confirmation.'
  },
  {
    id: '4',
    headline: 'Tesla Recalls 200,000 Cybertrucks Over Accelerator Issue',
    summary: 'NHTSA investigation prompted recall affecting all Cybertrucks delivered since launch. Tesla says software update will resolve the issue.',
    source: 'WSJ',
    time: '8h ago',
    sentiment: 'bearish',
    tickers: ['TSLA', 'RIVN', 'LCID'],
    importance: 'medium',
    aiTakeaway: 'Short-term negative for TSLA sentiment but software fix limits damage. Watch for any production halt news. Could benefit RIVN relatively.'
  }
];

const EARNINGS_TODAY: EarningsReport[] = [
  { symbol: 'WBA', name: 'Walgreens Boots', time: 'BMO', epsEstimate: 0.37, revenueEstimate: '35.8B', importance: 'medium', previousEPS: 0.21 },
  { symbol: 'STZ', name: 'Constellation Brands', time: 'BMO', epsEstimate: 3.31, revenueEstimate: '2.53B', importance: 'medium', previousEPS: 3.25 },
  { symbol: 'RPM', name: 'RPM International', time: 'BMO', epsEstimate: 1.28, revenueEstimate: '1.78B', importance: 'low', previousEPS: 1.18 },
];

const ANALYST_ACTIONS: AnalystAction[] = [
  { symbol: 'AAPL', firm: 'Morgan Stanley', action: 'reiterated', rating: 'Overweight', priceTarget: 220, previousTarget: 210, time: '6:30 AM' },
  { symbol: 'MSFT', firm: 'Goldman Sachs', action: 'upgrade', rating: 'Buy', priceTarget: 480, previousTarget: 420, time: '6:15 AM' },
  { symbol: 'GOOGL', firm: 'JP Morgan', action: 'downgrade', rating: 'Neutral', priceTarget: 175, previousTarget: 200, time: '5:45 AM' },
  { symbol: 'META', firm: 'Barclays', action: 'initiated', rating: 'Overweight', priceTarget: 650, time: '7:00 AM' },
  { symbol: 'AMZN', firm: 'Citi', action: 'reiterated', rating: 'Buy', priceTarget: 235, time: '6:00 AM' },
];

const ECONOMIC_CALENDAR: EconomicEvent[] = [
  { time: '8:30 AM', event: 'Initial Jobless Claims', forecast: '218K', previous: '211K', importance: 'medium' },
  { time: '10:00 AM', event: 'ISM Services PMI', forecast: '52.5', previous: '52.1', importance: 'high' },
  { time: '10:00 AM', event: 'Factory Orders m/m', forecast: '-0.3%', previous: '0.2%', importance: 'medium' },
  { time: '10:30 AM', event: 'EIA Natural Gas Storage', forecast: '-89B', previous: '-93B', importance: 'low' },
  { time: '2:00 PM', event: 'FOMC Minutes', forecast: '-', previous: '-', importance: 'high' },
];

const AI_MARKET_SUMMARY = {
  overview: `Markets are set to open higher following strong Asia session and NVIDIA's CES announcements. However, Fed minutes release at 2 PM ET presents key risk event. The hawkish Fed commentary overnight has tempered rate cut expectations, with markets now pricing only 2 cuts in 2026 vs 4 previously.`,
  keyThemes: [
    'AI momentum continues with NVDA catalyst',
    'Fed hawkishness weighing on rate-sensitive sectors',
    'China stabilization supporting global sentiment',
    'VIX complacency warrants caution'
  ],
  riskFactors: [
    'FOMC Minutes could surprise hawkish',
    'ISM Services miss would raise recession fears',
    'Geopolitical tensions in Middle East'
  ],
  tradingBias: 'Cautiously Bullish',
  biasReasoning: 'Tech leadership intact, but stay nimble ahead of Fed minutes. Consider hedges if VIX spikes above 16.'
};

// ============================================
// HELPER COMPONENTS
// ============================================
const CreditBadge = ({ cost, type }: { cost: number; type: 'light' | 'medium' | 'heavy' }) => {
  const config = {
    light: { icon: Zap, color: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)' },
    medium: { icon: Brain, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
    heavy: { icon: Flame, color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)' }
  };
  
  const { icon: Icon, color, bg } = config[type];
  
  if (cost === 0) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        background: 'rgba(34, 197, 94, 0.15)',
        color: '#22C55E',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 6
      }}>
        <Zap size={12} />
        FREE
      </span>
    );
  }
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 10px',
      background: bg,
      color: color,
      fontSize: 11,
      fontWeight: 600,
      borderRadius: 6
    }}>
      <Icon size={12} />
      {cost} credits
    </span>
  );
};

const SentimentBadge = ({ sentiment }: { sentiment: 'bullish' | 'bearish' | 'neutral' }) => {
  const config = {
    bullish: { color: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)', icon: TrendingUp },
    bearish: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', icon: TrendingDown },
    neutral: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', icon: Minus }
  };
  
  const { color, bg, icon: Icon } = config[sentiment];
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 8px',
      background: bg,
      color: color,
      fontSize: 11,
      fontWeight: 600,
      borderRadius: 4,
      textTransform: 'capitalize'
    }}>
      <Icon size={12} />
      {sentiment}
    </span>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function MorningBrief() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [expandedNews, setExpandedNews] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLastRefresh(new Date());
    setIsLoading(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#080B0F',
      color: '#fff'
    }}>
      {/* Ambient Background */}
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        overflow: 'hidden', 
        pointerEvents: 'none',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: '30%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }} />
      </div>

      <div style={{ 
        position: 'relative', 
        zIndex: 1,
        maxWidth: 1400, 
        margin: '0 auto', 
        padding: '32px 24px'
      }}>
        
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(249, 115, 22, 0.3)'
            }}>
              <Sun size={28} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, marginBottom: 4 }}>
                Morning Brief
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6B7280', fontSize: 14 }}>
                <span>{today}</span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={14} />
                  {formatTime(currentTime)} ET
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: 8,
              fontSize: 13,
              color: '#22C55E'
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
              Live Data
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: '#1A1A1A',
                border: '1px solid #2A2A2A',
                borderRadius: 8,
                color: '#fff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} style={{ 
                animation: isLoading ? 'spin 1s linear infinite' : 'none' 
              }} />
              Refresh
              <CreditBadge cost={3} type="medium" />
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* AI MARKET SUMMARY */}
        {/* ============================================ */}
        <div style={{
          background: 'linear-gradient(135deg, #0D1117 0%, #1A1A2E 100%)',
          border: '1px solid rgba(199, 169, 61, 0.2)',
          borderRadius: 20,
          padding: 32,
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: 'radial-gradient(circle, rgba(199, 169, 61, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(199, 169, 61, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={22} style={{ color: '#C7A93D' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>AI Market Summary</h2>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Generated at {formatTime(lastRefresh)} ET</p>
                </div>
              </div>
              <CreditBadge cost={0} type="light" />
            </div>

            <p style={{ fontSize: 16, color: '#D1D5DB', lineHeight: 1.7, marginBottom: 24 }}>
              {AI_MARKET_SUMMARY.overview}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
              {/* Key Themes */}
              <div style={{
                background: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.15)',
                borderRadius: 12,
                padding: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <TrendingUp size={16} style={{ color: '#22C55E' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#22C55E' }}>Key Themes</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#9CA3AF' }}>
                  {AI_MARKET_SUMMARY.keyThemes.map((theme, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>{theme}</li>
                  ))}
                </ul>
              </div>

              {/* Risk Factors */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: 12,
                padding: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={16} style={{ color: '#EF4444' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444' }}>Risk Factors</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#9CA3AF' }}>
                  {AI_MARKET_SUMMARY.riskFactors.map((risk, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>{risk}</li>
                  ))}
                </ul>
              </div>

              {/* Trading Bias */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: 12,
                padding: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Target size={16} style={{ color: '#3B82F6' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#3B82F6' }}>AI Trading Bias</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#22C55E', marginBottom: 8 }}>
                  {AI_MARKET_SUMMARY.tradingBias}
                </div>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
                  {AI_MARKET_SUMMARY.biasReasoning}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* MARKET INDICES & VIX ROW */}
        {/* ============================================ */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Market Indices */}
          <div style={{
            background: '#0D1117',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BarChart3 size={20} style={{ color: '#3B82F6' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Market Indices</h3>
              </div>
              <CreditBadge cost={0} type="light" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {MARKET_INDICES.map((index) => (
                <div key={index.symbol} style={{
                  background: '#0A0A0A',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid #1A1A1A'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{index.symbol}</span>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>{index.name}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                    {index.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: index.status === 'up' ? '#22C55E' : index.status === 'down' ? '#EF4444' : '#6B7280'
                  }}>
                    {index.status === 'up' ? <ArrowUpRight size={14} /> : index.status === 'down' ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VIX Card */}
          <div style={{
            background: VIX_DATA.current < 15 
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, #0D1117 100%)'
              : VIX_DATA.current < 20 
                ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, #0D1117 100%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, #0D1117 100%)',
            border: `1px solid ${VIX_DATA.current < 15 ? 'rgba(34, 197, 94, 0.2)' : VIX_DATA.current < 20 ? 'rgba(249, 115, 22, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            borderRadius: 16,
            padding: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={20} style={{ color: VIX_DATA.current < 15 ? '#22C55E' : VIX_DATA.current < 20 ? '#F59E0B' : '#EF4444' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>VIX Index</h3>
              </div>
              <span style={{
                padding: '4px 10px',
                background: VIX_DATA.current < 15 ? 'rgba(34, 197, 94, 0.15)' : VIX_DATA.current < 20 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: VIX_DATA.current < 15 ? '#22C55E' : VIX_DATA.current < 20 ? '#F59E0B' : '#EF4444',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6
              }}>
                {VIX_DATA.level}
              </span>
            </div>

            <div style={{ fontSize: 42, fontWeight: 700, marginBottom: 4 }}>
              {VIX_DATA.current.toFixed(2)}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: VIX_DATA.change < 0 ? '#22C55E' : '#EF4444',
              marginBottom: 16
            }}>
              {VIX_DATA.change < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              <span style={{ fontSize: 14 }}>
                {VIX_DATA.change >= 0 ? '+' : ''}{VIX_DATA.change.toFixed(2)} ({VIX_DATA.changePercent >= 0 ? '+' : ''}{VIX_DATA.changePercent.toFixed(2)}%)
              </span>
            </div>

            <div style={{
              padding: 12,
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              fontSize: 13,
              color: '#9CA3AF',
              lineHeight: 1.5
            }}>
              <Sparkles size={12} style={{ color: '#C7A93D', marginRight: 6, display: 'inline' }} />
              {VIX_DATA.interpretation}
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* FUTURES PRE-MARKET */}
        {/* ============================================ */}
        <div style={{
          background: '#0D1117',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Globe size={20} style={{ color: '#8B5CF6' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Futures Pre-Market</h3>
              <span style={{ fontSize: 12, color: '#6B7280' }}>as of {formatTime(currentTime)} ET</span>
            </div>
            <CreditBadge cost={0} type="light" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {FUTURES_DATA.map((future) => (
              <div key={future.symbol} style={{
                background: '#0A0A0A',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #1A1A1A',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{future.symbol}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{future.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{future.price.toLocaleString()}</div>
                  <div style={{
                    fontSize: 13,
                    color: future.change >= 0 ? '#22C55E' : '#EF4444'
                  }}>
                    {future.change >= 0 ? '+' : ''}{future.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================ */}
        {/* NEWS & EARNINGS ROW */}
        {/* ============================================ */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Top News */}
          <div style={{
            background: '#0D1117',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Newspaper size={20} style={{ color: '#EC4899' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Top Stories</h3>
              </div>
              <CreditBadge cost={0} type="light" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {TOP_NEWS.map((news) => (
                <div 
                  key={news.id}
                  style={{
                    background: '#0A0A0A',
                    borderRadius: 12,
                    padding: 16,
                    border: expandedNews === news.id ? '1px solid rgba(199, 169, 61, 0.3)' : '1px solid #1A1A1A',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setExpandedNews(expandedNews === news.id ? null : news.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {news.importance === 'high' && (
                          <span style={{
                            padding: '2px 6px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#EF4444',
                            fontSize: 10,
                            fontWeight: 600,
                            borderRadius: 4
                          }}>
                            HIGH IMPACT
                          </span>
                        )}
                        <SentimentBadge sentiment={news.sentiment} />
                        <span style={{ fontSize: 11, color: '#6B7280' }}>{news.source} • {news.time}</span>
                      </div>
                      <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
                        {news.headline}
                      </h4>
                    </div>
                    <ChevronDown 
                      size={18} 
                      style={{ 
                        color: '#6B7280', 
                        transform: expandedNews === news.id ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0,
                        marginLeft: 12
                      }} 
                    />
                  </div>

                  {expandedNews === news.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1A1A1A' }}>
                      <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 16 }}>
                        {news.summary}
                      </p>
                      
                      <div style={{
                        background: 'rgba(199, 169, 61, 0.08)',
                        border: '1px solid rgba(199, 169, 61, 0.15)',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 12
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Sparkles size={14} style={{ color: '#C7A93D' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#C7A93D' }}>AI Takeaway</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#D1D5DB', margin: 0, lineHeight: 1.5 }}>
                          {news.aiTakeaway}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>Related:</span>
                        {news.tickers.map((ticker) => (
                          <span 
                            key={ticker}
                            style={{
                              padding: '3px 8px',
                              background: '#1A1A1A',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 500,
                              color: '#C7A93D'
                            }}
                          >
                            {ticker}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Earnings Today */}
          <div style={{
            background: '#0D1117',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={20} style={{ color: '#F59E0B' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Earnings Today</h3>
              </div>
              <CreditBadge cost={0} type="light" />
            </div>

            {EARNINGS_TODAY.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {EARNINGS_TODAY.map((earning) => (
                  <div key={earning.symbol} style={{
                    background: '#0A0A0A',
                    borderRadius: 10,
                    padding: 14,
                    border: '1px solid #1A1A1A'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#C7A93D' }}>{earning.symbol}</span>
                        <span style={{ fontSize: 13, color: '#9CA3AF' }}>{earning.name}</span>
                      </div>
                      <span style={{
                        padding: '3px 8px',
                        background: earning.time === 'BMO' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                        color: earning.time === 'BMO' ? '#F59E0B' : '#8B5CF6',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 4
                      }}>
                        {earning.time === 'BMO' ? '🌅 Before Open' : '🌙 After Close'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>EPS Est.</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>${earning.epsEstimate.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Revenue Est.</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{earning.revenueEstimate}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
                No major earnings today
              </div>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* ANALYST ACTIONS & ECONOMIC CALENDAR ROW */}
        {/* ============================================ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Analyst Actions */}
          <div style={{
            background: '#0D1117',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Star size={20} style={{ color: '#22C55E' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Analyst Actions</h3>
              </div>
              <CreditBadge cost={0} type="light" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ANALYST_ACTIONS.map((action, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: '#0A0A0A',
                  borderRadius: 8,
                  border: '1px solid #1A1A1A'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#C7A93D', minWidth: 50 }}>{action.symbol}</span>
                    <div>
                      <div style={{ fontSize: 13, color: '#D1D5DB' }}>{action.firm}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{action.time}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      padding: '3px 8px',
                      background: action.action === 'upgrade' ? 'rgba(34, 197, 94, 0.15)' : 
                                 action.action === 'downgrade' ? 'rgba(239, 68, 68, 0.15)' : 
                                 'rgba(107, 114, 128, 0.15)',
                      color: action.action === 'upgrade' ? '#22C55E' : 
                             action.action === 'downgrade' ? '#EF4444' : '#9CA3AF',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 4,
                      textTransform: 'capitalize'
                    }}>
                      {action.action}
                    </span>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                      PT: ${action.priceTarget}
                      {action.previousTarget && (
                        <span style={{ color: '#6B7280', fontWeight: 400 }}> (from ${action.previousTarget})</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Economic Calendar */}
          <div style={{
            background: '#0D1117',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building2 size={20} style={{ color: '#3B82F6' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Economic Calendar</h3>
              </div>
              <CreditBadge cost={0} type="light" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ECONOMIC_CALENDAR.map((event, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: event.importance === 'high' ? 'rgba(239, 68, 68, 0.05)' : '#0A0A0A',
                  borderRadius: 8,
                  border: event.importance === 'high' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid #1A1A1A'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace', minWidth: 70 }}>{event.time}</span>
                    <div>
                      <div style={{ 
                        fontSize: 13, 
                        color: '#D1D5DB',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {event.event}
                        {event.importance === 'high' && (
                          <AlertTriangle size={12} style={{ color: '#EF4444' }} />
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <div>
                      <div style={{ color: '#6B7280' }}>Forecast</div>
                      <div style={{ fontWeight: 600 }}>{event.forecast}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280' }}>Previous</div>
                      <div style={{ fontWeight: 600 }}>{event.previous}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}