import { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Brain,
  Flame,
  ChevronDown,
  ChevronUp,
  Volume2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  BarChart3,
  PieChart,
  DollarSign,
  AlertTriangle,
  Eye,
  Filter,
  Clock,
  Target,
  Layers,
  TrendingUp as TrendUp,
  ArrowRight,
  Zap as Lightning,
  BarChart2
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface StockMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  avgVolume: string;
  volumeRatio: number;
  sector: string;
  marketCap: string;
  aiReason?: string;
  keyDrivers?: string[];
  risks?: string[];
  relatedTickers?: string[];
}

interface SectorData {
  name: string;
  change: number;
  volume: string;
  topGainer: string;
  topLoser: string;
  color: string;
  etf: string;
}

interface UnusualOptionsActivity {
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

interface VolumeAnomaly {
  symbol: string;
  name: string;
  price: number;
  change: number;
  currentVolume: string;
  avgVolume: string;
  volumeRatio: number;
  timeDetected: string;
  priceAction: 'breakout' | 'breakdown' | 'consolidation';
  aiNote: string;
}

// ============================================
// MOCK DATA
// ============================================
const SECTOR_DATA: SectorData[] = [
  { name: 'Technology', change: 1.24, volume: '2.8B', topGainer: 'NVDA +5.2%', topLoser: 'INTC -2.1%', color: '#3B82F6', etf: 'XLK' },
  { name: 'Healthcare', change: -0.67, volume: '890M', topGainer: 'LLY +1.8%', topLoser: 'PFE -3.2%', color: '#22C55E', etf: 'XLV' },
  { name: 'Financials', change: 0.45, volume: '1.2B', topGainer: 'JPM +1.5%', topLoser: 'C -0.8%', color: '#F59E0B', etf: 'XLF' },
  { name: 'Consumer Disc.', change: -0.32, volume: '1.5B', topGainer: 'AMZN +0.9%', topLoser: 'TSLA -2.8%', color: '#EC4899', etf: 'XLY' },
  { name: 'Energy', change: 1.89, volume: '650M', topGainer: 'XOM +2.1%', topLoser: 'OXY -0.5%', color: '#EF4444', etf: 'XLE' },
  { name: 'Industrials', change: 0.78, volume: '540M', topGainer: 'CAT +1.9%', topLoser: 'BA -1.2%', color: '#8B5CF6', etf: 'XLI' },
  { name: 'Materials', change: 0.34, volume: '320M', topGainer: 'FCX +2.4%', topLoser: 'NEM -1.8%', color: '#06B6D4', etf: 'XLB' },
  { name: 'Real Estate', change: -1.12, volume: '280M', topGainer: 'PLD +0.3%', topLoser: 'O -2.1%', color: '#84CC16', etf: 'XLRE' },
  { name: 'Utilities', change: -0.89, volume: '210M', topGainer: 'NEE +0.5%', topLoser: 'DUK -1.5%', color: '#A855F7', etf: 'XLU' },
  { name: 'Comm. Services', change: 0.56, volume: '980M', topGainer: 'META +1.8%', topLoser: 'DIS -1.3%', color: '#F97316', etf: 'XLC' },
  { name: 'Consumer Staples', change: -0.23, volume: '410M', topGainer: 'COST +0.8%', topLoser: 'WMT -0.9%', color: '#14B8A6', etf: 'XLP' },
];

const TOP_GAINERS: StockMover[] = [
  { 
    symbol: 'SMCI', name: 'Super Micro Computer', price: 1045.30, change: 89.45, changePercent: 9.36, 
    volume: '8.2M', avgVolume: '4.1M', volumeRatio: 2.0, sector: 'Technology', marketCap: '$61B',
    aiReason: "Super Micro rallies on reports of expanded AI server orders from major hyperscalers. Company also confirmed inclusion in S&P 500 index effective next week.",
    keyDrivers: ["S&P 500 inclusion confirmed", "AI server backlog up 40% QoQ", "New liquid cooling tech launch"],
    risks: ["Margin pressure from competition", "Customer concentration risk"],
    relatedTickers: ['NVDA', 'AMD', 'DELL']
  },
  { 
    symbol: 'NVDA', name: 'NVIDIA Corp', price: 892.45, change: 45.23, changePercent: 5.34, 
    volume: '52.3M', avgVolume: '38.2M', volumeRatio: 1.37, sector: 'Technology', marketCap: '$2.2T',
    aiReason: "NVIDIA surges after CES 2026 announcements. Blackwell Ultra chips show 4x performance gains. Morgan Stanley raises PT to $1,000.",
    keyDrivers: ["Blackwell Ultra announcement", "Price target upgrades", "Cloud provider orders"],
    risks: ["China export restrictions", "Valuation at 65x forward P/E"],
    relatedTickers: ['AMD', 'SMCI', 'AVGO']
  },
  { 
    symbol: 'MARA', name: 'Marathon Digital', price: 24.56, change: 3.12, changePercent: 14.55, 
    volume: '45.6M', avgVolume: '28.1M', volumeRatio: 1.62, sector: 'Technology', marketCap: '$6.8B',
    aiReason: "Bitcoin miners surge as BTC breaks above $98,000. Marathon announces expansion of mining capacity by 50% in Q1.",
    keyDrivers: ["Bitcoin price rally", "Mining capacity expansion", "Institutional BTC demand"],
    risks: ["Crypto volatility", "Energy costs", "Halving impact"],
    relatedTickers: ['RIOT', 'COIN', 'CLSK']
  },
  { 
    symbol: 'PLTR', name: 'Palantir', price: 24.56, change: 1.89, changePercent: 8.33, 
    volume: '45.6M', avgVolume: '32.1M', volumeRatio: 1.42, sector: 'Technology', marketCap: '$54B',
    aiReason: "Palantir gains on $250M Army contract win and positive analyst coverage initiation from Goldman with Buy rating.",
    keyDrivers: ["$250M Army contract", "Goldman initiates at Buy", "AIP platform momentum"],
    risks: ["Government revenue concentration", "Commercial growth proving out"],
    relatedTickers: ['SNOW', 'AI', 'PATH']
  },
  { 
    symbol: 'XOM', name: 'Exxon Mobil', price: 108.90, change: 4.45, changePercent: 4.26, 
    volume: '18.9M', avgVolume: '15.3M', volumeRatio: 1.24, sector: 'Energy', marketCap: '$435B',
    aiReason: "Energy stocks rally on Middle East tensions and OPEC+ reaffirming production cuts. Crude oil up 3% to $78/barrel.",
    keyDrivers: ["Geopolitical tensions", "OPEC+ cuts extended", "Strong refining margins"],
    risks: ["Demand concerns if recession", "Transition to renewables"],
    relatedTickers: ['CVX', 'OXY', 'SLB']
  },
];

const TOP_LOSERS: StockMover[] = [
  { 
    symbol: 'COIN', name: 'Coinbase', price: 142.30, change: -18.45, changePercent: -11.48, 
    volume: '28.4M', avgVolume: '15.2M', volumeRatio: 1.87, sector: 'Financials', marketCap: '$35B',
    aiReason: "Coinbase plunges after SEC files new enforcement action regarding staking services. Crypto market also facing ETF outflow concerns.",
    keyDrivers: ["SEC enforcement action on staking", "Bitcoin ETF outflows $200M", "Trading volume down 25% MoM"],
    risks: ["Regulatory overhang continues", "Revenue concentration"],
    relatedTickers: ['MARA', 'RIOT', 'HOOD']
  },
  { 
    symbol: 'MRNA', name: 'Moderna', price: 89.45, change: -8.90, changePercent: -9.05, 
    volume: '12.3M', avgVolume: '8.7M', volumeRatio: 1.41, sector: 'Healthcare', marketCap: '$34B',
    aiReason: "Moderna drops after disappointing flu vaccine trial results and reduced 2024 revenue guidance by 15%.",
    keyDrivers: ["Flu vaccine efficacy miss", "2024 guidance cut", "mRNA pipeline concerns"],
    risks: ["COVID revenue cliff", "Competition from Pfizer"],
    relatedTickers: ['PFE', 'BNTX', 'NVAX']
  },
  { 
    symbol: 'TSLA', name: 'Tesla', price: 385.67, change: -28.45, changePercent: -6.87, 
    volume: '85.2M', avgVolume: '62.1M', volumeRatio: 1.37, sector: 'Consumer Disc.', marketCap: '$1.2T',
    aiReason: "Tesla falls on Cybertruck recall affecting 200,000 units and reports of slowing China demand. Q4 delivery concerns mounting.",
    keyDrivers: ["Cybertruck recall", "China demand slowdown", "Price cuts impacting margins"],
    risks: ["Delivery miss risk", "Competition intensifying", "Valuation concerns"],
    relatedTickers: ['RIVN', 'LCID', 'F']
  },
  { 
    symbol: 'BA', name: 'Boeing', price: 198.45, change: -12.30, changePercent: -5.84, 
    volume: '14.8M', avgVolume: '9.2M', volumeRatio: 1.61, sector: 'Industrials', marketCap: '$120B',
    aiReason: "Boeing drops on FAA investigation into 737 MAX quality issues. Production delays announced for 787 Dreamliner program.",
    keyDrivers: ["FAA investigation", "Production delays", "Quality control concerns"],
    risks: ["Regulatory scrutiny", "Order cancellations", "Cash burn"],
    relatedTickers: ['AIR.PA', 'GE', 'RTX']
  },
  { 
    symbol: 'DIS', name: 'Walt Disney', price: 112.30, change: -5.67, changePercent: -4.81, 
    volume: '18.2M', avgVolume: '12.4M', volumeRatio: 1.47, sector: 'Comm. Services', marketCap: '$205B',
    aiReason: "Disney falls after streaming subscriber miss in Q4 report. Parks revenue growth slowing amid consumer pullback concerns.",
    keyDrivers: ["Streaming subs miss", "Parks slowdown", "ESPN uncertainty"],
    risks: ["Cord cutting acceleration", "Content costs", "Theme park demand"],
    relatedTickers: ['NFLX', 'WBD', 'PARA']
  },
];

const UNUSUAL_OPTIONS: UnusualOptionsActivity[] = [
  {
    symbol: 'NVDA',
    type: 'call',
    strike: 950,
    expiry: 'Jan 17',
    premium: '$4.2M',
    volume: 15420,
    openInterest: 3200,
    volOiRatio: 4.82,
    sentiment: 'bullish',
    aiInsight: 'Large block trade suggests institutional bet on continued AI momentum. Strike 6% above current price implies expected breakout.',
    unusualScore: 92
  },
  {
    symbol: 'TSLA',
    type: 'put',
    strike: 350,
    expiry: 'Jan 24',
    premium: '$8.1M',
    volume: 28500,
    openInterest: 5100,
    volOiRatio: 5.59,
    sentiment: 'bearish',
    aiInsight: 'Massive put volume ahead of Q4 deliveries. Could be hedge or directional bet on delivery miss.',
    unusualScore: 95
  },
  {
    symbol: 'AAPL',
    type: 'call',
    strike: 200,
    expiry: 'Feb 21',
    premium: '$3.8M',
    volume: 22100,
    openInterest: 8400,
    volOiRatio: 2.63,
    sentiment: 'bullish',
    aiInsight: 'Bullish positioning ahead of Q1 earnings. Vision Pro sales data expected to drive sentiment.',
    unusualScore: 78
  },
  {
    symbol: 'META',
    type: 'call',
    strike: 550,
    expiry: 'Jan 31',
    premium: '$5.6M',
    volume: 12800,
    openInterest: 2100,
    volOiRatio: 6.10,
    sentiment: 'bullish',
    aiInsight: 'Aggressive call buying suggesting expectations for positive ad revenue data. Vol/OI ratio extremely elevated.',
    unusualScore: 88
  },
  {
    symbol: 'XOM',
    type: 'call',
    strike: 115,
    expiry: 'Feb 14',
    premium: '$2.1M',
    volume: 18200,
    openInterest: 4500,
    volOiRatio: 4.04,
    sentiment: 'bullish',
    aiInsight: 'Energy sector call sweep amid geopolitical tensions. Betting on oil price continuation higher.',
    unusualScore: 75
  },
];

const VOLUME_ANOMALIES: VolumeAnomaly[] = [
  {
    symbol: 'SMCI',
    name: 'Super Micro Computer',
    price: 1045.30,
    change: 9.36,
    currentVolume: '8.2M',
    avgVolume: '4.1M',
    volumeRatio: 2.0,
    timeDetected: '9:45 AM',
    priceAction: 'breakout',
    aiNote: 'Volume surge at open with price breakout above $1,000 resistance. S&P 500 inclusion driving institutional accumulation.'
  },
  {
    symbol: 'COIN',
    name: 'Coinbase',
    price: 142.30,
    change: -11.48,
    currentVolume: '28.4M',
    avgVolume: '15.2M',
    volumeRatio: 1.87,
    timeDetected: '10:15 AM',
    priceAction: 'breakdown',
    aiNote: 'Heavy volume breakdown below $150 support. SEC news catalyst. Watch $140 as next support level.'
  },
  {
    symbol: 'MARA',
    name: 'Marathon Digital',
    price: 24.56,
    change: 14.55,
    currentVolume: '45.6M',
    avgVolume: '28.1M',
    volumeRatio: 1.62,
    timeDetected: '9:32 AM',
    priceAction: 'breakout',
    aiNote: 'Bitcoin correlation trade. Volume spike coincides with BTC breaking $98K. Momentum could extend if BTC holds.'
  },
  {
    symbol: 'BA',
    name: 'Boeing',
    price: 198.45,
    change: -5.84,
    currentVolume: '14.8M',
    avgVolume: '9.2M',
    volumeRatio: 1.61,
    timeDetected: '10:30 AM',
    priceAction: 'breakdown',
    aiNote: 'FAA investigation news causing heavy selling. Volume indicates institutional distribution. $195 key support.'
  },
];

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

// ============================================
// MAIN COMPONENT
// ============================================
export default function MarketPulse() {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');
  const [expandedStock, setExpandedStock] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleAskWhy = (symbol: string) => {
    if (expandedStock === symbol) {
      setExpandedStock(null);
    } else {
      setLoadingAI(symbol);
      setTimeout(() => {
        setLoadingAI(null);
        setExpandedStock(symbol);
      }, 800);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });
  };

  const activeData = activeTab === 'gainers' ? TOP_GAINERS : TOP_LOSERS;

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
          top: '20%',
          right: '10%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.05) 0%, transparent 70%)',
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
              background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(34, 197, 94, 0.3)'
            }}>
              <Activity size={28} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, marginBottom: 4 }}>
                Market Pulse
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6B7280', fontSize: 14 }}>
                <span>Real-time market movers & unusual activity</span>
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
              Live
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
                fontWeight: 500
              }}
            >
              <RefreshCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
              <CreditBadge cost={3} type="medium" />
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* SECTOR ROTATION HEATMAP */}
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
              <PieChart size={20} style={{ color: '#8B5CF6' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Sector Performance</h3>
            </div>
            <CreditBadge cost={0} type="light" />
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: 12 
          }}>
            {SECTOR_DATA.sort((a, b) => b.change - a.change).map((sector) => (
              <div 
                key={sector.name}
                style={{
                  background: sector.change >= 0 
                    ? `linear-gradient(135deg, rgba(34, 197, 94, ${Math.min(sector.change / 3, 0.15)}) 0%, #0A0A0A 100%)`
                    : `linear-gradient(135deg, rgba(239, 68, 68, ${Math.min(Math.abs(sector.change) / 3, 0.15)}) 0%, #0A0A0A 100%)`,
                  border: `1px solid ${sector.change >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: 12,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{sector.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{sector.etf}</div>
                  </div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: sector.change >= 0 ? '#22C55E' : '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {sector.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF' }}>
                  <span style={{ color: '#22C55E' }}>↑ {sector.topGainer}</span>
                  <span style={{ color: '#EF4444' }}>↓ {sector.topLoser}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================ */}
        {/* TOP MOVERS */}
        {/* ============================================ */}
        <div style={{
          background: '#0D1117',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', background: '#0A0A0A', borderRadius: 10, padding: 4 }}>
                <button
                  onClick={() => setActiveTab('gainers')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 20px',
                    background: activeTab === 'gainers' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: activeTab === 'gainers' ? '#22C55E' : '#6B7280',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <TrendingUp size={16} />
                  Top Gainers
                </button>
                <button
                  onClick={() => setActiveTab('losers')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 20px',
                    background: activeTab === 'losers' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: activeTab === 'losers' ? '#EF4444' : '#6B7280',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <TrendingDown size={16} />
                  Top Losers
                </button>
              </div>
            </div>
            <CreditBadge cost={0} type="light" />
          </div>

          {/* Stock List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeData.map((stock) => {
              const isUp = stock.change > 0;
              const isExpanded = expandedStock === stock.symbol;
              const isLoadingThis = loadingAI === stock.symbol;
              
              return (
                <div key={stock.symbol} style={{
                  background: '#0A0A0A',
                  border: isExpanded ? '1px solid rgba(199, 169, 61, 0.3)' : '1px solid #1A1A1A',
                  borderRadius: 12,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease'
                }}>
                  {/* Main Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                    alignItems: 'center',
                    padding: '16px 20px',
                    gap: 16
                  }}>
                    {/* Symbol & Name */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#C7A93D' }}>{stock.symbol}</span>
                        <span style={{
                          padding: '2px 6px',
                          background: 'rgba(107, 114, 128, 0.2)',
                          borderRadius: 4,
                          fontSize: 10,
                          color: '#9CA3AF'
                        }}>
                          {stock.sector}
                        </span>
                        {stock.volumeRatio >= 1.5 && (
                          <span style={{
                            padding: '2px 6px',
                            background: 'rgba(249, 115, 22, 0.15)',
                            borderRadius: 4,
                            fontSize: 10,
                            color: '#F97316',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            <Volume2 size={10} />
                            High Vol
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{stock.name}</div>
                    </div>
                    
                    {/* Price */}
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>${stock.price.toFixed(2)}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>MCap: {stock.marketCap}</div>
                    </div>
                    
                    {/* Change */}
                    <div style={{ color: isUp ? '#22C55E' : '#EF4444' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 16, fontWeight: 600 }}>
                        {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {isUp ? '+' : ''}{stock.change.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 13 }}>
                        ({isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                      </div>
                    </div>
                    
                    {/* Volume */}
                    <div>
                      <div style={{ fontSize: 14 }}>{stock.volume}</div>
                      <div style={{ fontSize: 12, color: stock.volumeRatio > 1.5 ? '#F59E0B' : '#6B7280' }}>
                        {stock.volumeRatio.toFixed(1)}x avg
                      </div>
                    </div>
                    
                    {/* Why Button */}
                    <button
                      onClick={() => handleAskWhy(stock.symbol)}
                      disabled={isLoadingThis}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 16px',
                        background: isExpanded ? 'rgba(199, 169, 61, 0.15)' : '#1A1A1A',
                        border: `1px solid ${isExpanded ? 'rgba(199, 169, 61, 0.3)' : '#2A2A2A'}`,
                        borderRadius: 8,
                        color: isExpanded ? '#C7A93D' : '#9CA3AF',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        minWidth: 120,
                        justifyContent: 'center'
                      }}
                    >
                      {isLoadingThis ? (
                        <>
                          <div style={{ 
                            width: 14, 
                            height: 14, 
                            border: '2px solid #C7A93D', 
                            borderTopColor: 'transparent', 
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Why?
                          <CreditBadge cost={3} type="medium" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Explanation Panel */}
                  {isExpanded && stock.aiReason && (
                    <div style={{
                      padding: 20,
                      background: 'rgba(199, 169, 61, 0.03)',
                      borderTop: '1px solid rgba(199, 169, 61, 0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Sparkles size={18} style={{ color: '#C7A93D' }} />
                        <span style={{ fontWeight: 600, color: '#C7A93D' }}>AI Analysis</span>
                      </div>
                      
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: '#D1D5DB', marginBottom: 16 }}>
                        {stock.aiReason}
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        {/* Key Drivers */}
                        <div style={{ padding: 14, background: '#0D1117', borderRadius: 10, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                          <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TrendingUp size={14} />
                            Key Drivers
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#9CA3AF' }}>
                            {stock.keyDrivers?.map((driver, idx) => (
                              <li key={idx} style={{ marginBottom: 6 }}>{driver}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Risks */}
                        <div style={{ padding: 14, background: '#0D1117', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={14} />
                            Risks to Watch
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#9CA3AF' }}>
                            {stock.risks?.map((risk, idx) => (
                              <li key={idx} style={{ marginBottom: 6 }}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {stock.relatedTickers && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>Related:</span>
                          {stock.relatedTickers.map((ticker) => (
                            <span 
                              key={ticker}
                              style={{
                                padding: '4px 10px',
                                background: '#1A1A1A',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#C7A93D'
                              }}
                            >
                              {ticker}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================ */}
        {/* UNUSUAL OPTIONS ACTIVITY */}
        {/* ============================================ */}
        <div style={{
          background: 'linear-gradient(135deg, #0D1117 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lightning size={20} style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Unusual Options Activity</h3>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>High volume money flow signals</p>
              </div>
            </div>
            <CreditBadge cost={5} type="medium" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {UNUSUAL_OPTIONS.map((option, idx) => (
              <div key={idx} style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: 12,
                padding: 16
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 2fr', gap: 16, alignItems: 'center' }}>
                  {/* Symbol & Type */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#C7A93D' }}>{option.symbol}</span>
                    <span style={{
                      padding: '4px 8px',
                      background: option.type === 'call' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: option.type === 'call' ? '#22C55E' : '#EF4444',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 4,
                      textTransform: 'uppercase'
                    }}>
                      {option.type}
                    </span>
                  </div>

                  {/* Strike & Expiry */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>${option.strike} Strike</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Exp: {option.expiry}</div>
                  </div>

                  {/* Premium & Volume */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#22C55E' }}>{option.premium}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Vol: {option.volume.toLocaleString()}</div>
                  </div>

                  {/* Vol/OI Ratio & Score */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: option.volOiRatio > 3 ? '#F59E0B' : '#9CA3AF' }}>
                      {option.volOiRatio.toFixed(2)}x Vol/OI
                    </div>
                    <div style={{ 
                      fontSize: 12, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6 
                    }}>
                      <span style={{ color: '#6B7280' }}>Score:</span>
                      <span style={{
                        padding: '2px 6px',
                        background: option.unusualScore >= 90 ? 'rgba(239, 68, 68, 0.15)' : 
                                   option.unusualScore >= 75 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                        color: option.unusualScore >= 90 ? '#EF4444' : 
                               option.unusualScore >= 75 ? '#F59E0B' : '#9CA3AF',
                        borderRadius: 4,
                        fontWeight: 600
                      }}>
                        {option.unusualScore}
                      </span>
                    </div>
                  </div>

                  {/* AI Insight */}
                  <div style={{
                    padding: 10,
                    background: 'rgba(199, 169, 61, 0.05)',
                    borderRadius: 8,
                    borderLeft: '3px solid #C7A93D'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Sparkles size={12} style={{ color: '#C7A93D' }} />
                      <span style={{ fontSize: 10, color: '#C7A93D', fontWeight: 600 }}>AI INSIGHT</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, lineHeight: 1.4 }}>
                      {option.aiInsight}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================ */}
        {/* VOLUME ANOMALIES */}
        {/* ============================================ */}
        <div style={{
          background: '#0D1117',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Volume2 size={20} style={{ color: '#F59E0B' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Volume Anomalies</h3>
              <span style={{ fontSize: 12, color: '#6B7280' }}>Unusual volume detected</span>
            </div>
            <CreditBadge cost={0} type="light" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {VOLUME_ANOMALIES.map((anomaly, idx) => (
              <div key={idx} style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: 12,
                padding: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#C7A93D' }}>{anomaly.symbol}</span>
                      <span style={{
                        padding: '3px 8px',
                        background: anomaly.priceAction === 'breakout' ? 'rgba(34, 197, 94, 0.15)' : 
                                   anomaly.priceAction === 'breakdown' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                        color: anomaly.priceAction === 'breakout' ? '#22C55E' : 
                               anomaly.priceAction === 'breakdown' ? '#EF4444' : '#9CA3AF',
                        fontSize: 10,
                        fontWeight: 600,
                        borderRadius: 4,
                        textTransform: 'uppercase'
                      }}>
                        {anomaly.priceAction}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{anomaly.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>${anomaly.price.toFixed(2)}</div>
                    <div style={{
                      fontSize: 13,
                      color: anomaly.change >= 0 ? '#22C55E' : '#EF4444'
                    }}>
                      {anomaly.change >= 0 ? '+' : ''}{anomaly.change.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>Current Vol</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{anomaly.currentVolume}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>Avg Vol</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{anomaly.avgVolume}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>Ratio</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#F59E0B' }}>{anomaly.volumeRatio.toFixed(1)}x</div>
                  </div>
                </div>

                <div style={{
                  padding: 10,
                  background: 'rgba(249, 115, 22, 0.05)',
                  borderRadius: 8,
                  borderLeft: '3px solid #F59E0B'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Sparkles size={12} style={{ color: '#F59E0B' }} />
                    <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>AI NOTE</span>
                    <span style={{ fontSize: 10, color: '#6B7280', marginLeft: 'auto' }}>Detected {anomaly.timeDetected}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, lineHeight: 1.4 }}>
                    {anomaly.aiNote}
                  </p>
                </div>
              </div>
            ))}
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