import { useState, useEffect } from 'react';
import {
  Briefcase, TrendingUp, TrendingDown, RefreshCw, Zap, Brain, Flame,
  ChevronDown, ChevronUp, PieChart, DollarSign, AlertTriangle, Sparkles, Shield,
  Target, Clock, Calendar, Layers, Settings, Check, X, ChevronRight,
  ChevronLeft, Lightbulb, Percent, Activity, AlertCircle, Wallet,
  CandlestickChart, Search, Building, Globe, LineChart, BarChart2, FileText, Bell, Info,
  Link, Upload, Plus, Edit3, Trash2, ExternalLink, Lock, Unlock, Eye, EyeOff,
  ArrowUpRight, ArrowDownRight, Filter, SortAsc, Download, Share2, MoreHorizontal,
  TrendingUp as Trending, BarChart3, Gauge, Award, BookOpen, MessageSquare
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface InvestorProfile {
  portfolioSize: string;
  monthlyContribution: string;
  expectedReturn: string;
  maxDrawdown: string;
  tradingStyle: { dayTrading: number; swingTrading: number; positionTrading: number; longTermInvesting: number; };
  maxPositionSize: string;
  defaultStopLoss: string;
  riskPerTrade: string;
  maxOpenPositions: string;
  useTrailingStops: boolean;
  assetPreferences: {
    stocks: { enabled: boolean; riskLevel: string };
    options: { enabled: boolean; riskLevel: string; experience: string };
    etfs: { enabled: boolean; riskLevel: string };
    crypto: { enabled: boolean; riskLevel: string };
  };
  preferredSectors: string[];
  excludedSectors: string[];
  prefersDividends: boolean;
  dividendMinYield: string;
  allowsShortSelling: boolean;
  macroOutlook: 'bullish' | 'bearish' | 'neutral' | 'uncertain';
  interestRateSensitivity: 'high' | 'medium' | 'low';
  inflationHedge: boolean;
  lossReaction: 'sell' | 'hold' | 'buy_more';
  profitTaking: 'quick' | 'let_run' | 'scale_out';
  primaryGoal: 'growth' | 'income' | 'preservation' | 'speculation';
}

interface Position {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  sector: string;
  weight: number;
  hasEarnings: boolean;
  earningsDate?: string;
  earningsDaysAway?: number;
  dividendYield?: number;
  peRatio?: number;
  beta?: number;
  analystRating?: 'buy' | 'hold' | 'sell';
  priceTarget?: number;
  alerts: PositionAlert[];
}

interface PositionAlert {
  type: 'warning' | 'opportunity' | 'info' | 'action' | 'deviation';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface SectorAllocation {
  name: string;
  value: number;
  percent: number;
  color: string;
  benchmark: number;
  positions: string[];
}

interface ConnectedBroker {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  lastSync?: string;
  accountType?: string;
  accountValue?: number;
}

interface PortfolioStats {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  cash: number;
  buyingPower: number;
  positions: number;
  riskScore: number;
  diversificationScore: number;
  dividendYield: number;
  beta: number;
}

// ============================================
// BROKERS DATA
// ============================================
const BROKERS: ConnectedBroker[] = [
  { id: 'robinhood', name: 'Robinhood', logo: '🪶', connected: false },
  { id: 'td_ameritrade', name: 'TD Ameritrade', logo: '🟢', connected: false },
  { id: 'interactive_brokers', name: 'Interactive Brokers', logo: '🔴', connected: false },
  { id: 'fidelity', name: 'Fidelity', logo: '🟩', connected: false },
  { id: 'schwab', name: 'Charles Schwab', logo: '🔵', connected: false },
  { id: 'etrade', name: 'E*TRADE', logo: '🟣', connected: false },
  { id: 'webull', name: 'Webull', logo: '🟠', connected: false },
  { id: 'tradier', name: 'Tradier', logo: '⚫', connected: false },
];

// ============================================
// MOCK PORTFOLIO DATA
// ============================================
const generateAlerts = (position: Omit<Position, 'alerts'>, profile: InvestorProfile | null): PositionAlert[] => {
  const alerts: PositionAlert[] = [];
  
  if (!profile) return alerts;
  
  // Position size check
  if (position.weight > parseInt(profile.maxPositionSize)) {
    alerts.push({
      type: 'deviation',
      title: 'Position Size Exceeded',
      description: `At ${position.weight.toFixed(1)}%, exceeds your ${profile.maxPositionSize}% max`,
      priority: 'high'
    });
  }
  
  // Stop-loss check
  if (position.totalGainPercent < -parseInt(profile.defaultStopLoss)) {
    alerts.push({
      type: 'warning',
      title: 'Stop-Loss Triggered',
      description: `Down ${Math.abs(position.totalGainPercent).toFixed(1)}%, below your ${profile.defaultStopLoss}% stop`,
      priority: 'high'
    });
  }
  
  // Earnings alert
  if (position.hasEarnings && position.earningsDaysAway && position.earningsDaysAway <= 7) {
    alerts.push({
      type: 'action',
      title: 'Earnings Soon',
      description: `Reports in ${position.earningsDaysAway} days on ${position.earningsDate}`,
      priority: 'high'
    });
  }
  
  // Dividend opportunity
  if (profile.prefersDividends && position.dividendYield && position.dividendYield >= parseFloat(profile.dividendMinYield)) {
    alerts.push({
      type: 'opportunity',
      title: 'Dividend Stock',
      description: `${position.dividendYield.toFixed(2)}% yield meets your ${profile.dividendMinYield}% target`,
      priority: 'low'
    });
  }
  
  // Big gainer - profit taking
  if (position.totalGainPercent > 50 && profile.profitTaking === 'scale_out') {
    alerts.push({
      type: 'info',
      title: 'Consider Scaling Out',
      description: `Up ${position.totalGainPercent.toFixed(0)}%, your profile suggests taking partial profits`,
      priority: 'medium'
    });
  }
  
  // Analyst rating mismatch
  if (position.analystRating === 'sell') {
    alerts.push({
      type: 'warning',
      title: 'Analyst Downgrade',
      description: 'Consensus rating is SELL - review position',
      priority: 'medium'
    });
  }
  
  // Beta risk
  if (position.beta && position.beta > 1.5 && profile.assetPreferences.stocks.riskLevel === 'conservative') {
    alerts.push({
      type: 'warning',
      title: 'High Beta',
      description: `Beta ${position.beta.toFixed(2)} may be too volatile for your conservative profile`,
      priority: 'medium'
    });
  }
  
  return alerts;
};

const MOCK_POSITIONS_RAW: Omit<Position, 'alerts'>[] = [
  { id: '1', symbol: 'NVDA', name: 'NVIDIA Corporation', shares: 50, avgCost: 450, currentPrice: 892.45, marketValue: 44622.50, totalGain: 22122.50, totalGainPercent: 98.28, dayChange: 45.23, dayChangePercent: 5.34, sector: 'Technology', weight: 28.5, hasEarnings: false, dividendYield: 0.03, peRatio: 65.2, beta: 1.72, analystRating: 'buy', priceTarget: 950 },
  { id: '2', symbol: 'AAPL', name: 'Apple Inc.', shares: 100, avgCost: 145, currentPrice: 185.50, marketValue: 18550, totalGain: 4050, totalGainPercent: 27.93, dayChange: -1.25, dayChangePercent: -0.67, sector: 'Technology', weight: 11.8, hasEarnings: true, earningsDate: 'Jan 25', earningsDaysAway: 5, dividendYield: 0.52, peRatio: 28.4, beta: 1.28, analystRating: 'buy', priceTarget: 210 },
  { id: '3', symbol: 'MSFT', name: 'Microsoft Corporation', shares: 40, avgCost: 280, currentPrice: 378.90, marketValue: 15156, totalGain: 3956, totalGainPercent: 35.32, dayChange: 2.45, dayChangePercent: 0.65, sector: 'Technology', weight: 9.7, hasEarnings: true, earningsDate: 'Jan 23', earningsDaysAway: 3, dividendYield: 0.74, peRatio: 35.8, beta: 0.92, analystRating: 'buy', priceTarget: 420 },
  { id: '4', symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 80, avgCost: 125, currentPrice: 142.30, marketValue: 11384, totalGain: 1384, totalGainPercent: 13.84, dayChange: -2.10, dayChangePercent: -1.45, sector: 'Technology', weight: 7.3, hasEarnings: false, dividendYield: 0, peRatio: 24.2, beta: 1.05, analystRating: 'buy', priceTarget: 165 },
  { id: '5', symbol: 'JPM', name: 'JPMorgan Chase & Co.', shares: 60, avgCost: 140, currentPrice: 172.45, marketValue: 10347, totalGain: 1947, totalGainPercent: 23.18, dayChange: 1.85, dayChangePercent: 1.08, sector: 'Financials', weight: 6.6, hasEarnings: true, earningsDate: 'Jan 12', earningsDaysAway: 2, dividendYield: 2.38, peRatio: 11.2, beta: 1.12, analystRating: 'buy', priceTarget: 195 },
  { id: '6', symbol: 'XOM', name: 'Exxon Mobil Corporation', shares: 80, avgCost: 95, currentPrice: 108.90, marketValue: 8712, totalGain: 1112, totalGainPercent: 14.63, dayChange: 4.45, dayChangePercent: 4.26, sector: 'Energy', weight: 5.6, hasEarnings: false, dividendYield: 3.42, peRatio: 12.8, beta: 0.98, analystRating: 'hold', priceTarget: 115 },
  { id: '7', symbol: 'JNJ', name: 'Johnson & Johnson', shares: 50, avgCost: 160, currentPrice: 156.20, marketValue: 7810, totalGain: -190, totalGainPercent: -2.38, dayChange: -0.80, dayChangePercent: -0.51, sector: 'Healthcare', weight: 5.0, hasEarnings: false, dividendYield: 3.05, peRatio: 15.6, beta: 0.52, analystRating: 'hold', priceTarget: 165 },
  { id: '8', symbol: 'V', name: 'Visa Inc.', shares: 30, avgCost: 220, currentPrice: 268.45, marketValue: 8053.50, totalGain: 1453.50, totalGainPercent: 22.02, dayChange: 1.20, dayChangePercent: 0.45, sector: 'Financials', weight: 5.1, hasEarnings: false, dividendYield: 0.78, peRatio: 29.4, beta: 0.96, analystRating: 'buy', priceTarget: 300 },
  { id: '9', symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 25, avgCost: 145, currentPrice: 178.25, marketValue: 4456.25, totalGain: 831.25, totalGainPercent: 22.93, dayChange: 3.45, dayChangePercent: 1.97, sector: 'Consumer Discretionary', weight: 2.8, hasEarnings: false, dividendYield: 0, peRatio: 62.5, beta: 1.18, analystRating: 'buy', priceTarget: 210 },
  { id: '10', symbol: 'META', name: 'Meta Platforms Inc.', shares: 20, avgCost: 310, currentPrice: 395.80, marketValue: 7916, totalGain: 1716, totalGainPercent: 27.68, dayChange: -5.20, dayChangePercent: -1.30, sector: 'Communication Services', weight: 5.0, hasEarnings: true, earningsDate: 'Jan 31', earningsDaysAway: 11, dividendYield: 0.40, peRatio: 28.9, beta: 1.24, analystRating: 'buy', priceTarget: 450 },
  { id: '11', symbol: 'TSLA', name: 'Tesla Inc.', shares: 15, avgCost: 225, currentPrice: 248.50, marketValue: 3727.50, totalGain: 352.50, totalGainPercent: 10.44, dayChange: -8.90, dayChangePercent: -3.46, sector: 'Consumer Discretionary', weight: 2.4, hasEarnings: true, earningsDate: 'Jan 22', earningsDaysAway: 2, dividendYield: 0, peRatio: 72.4, beta: 2.05, analystRating: 'hold', priceTarget: 265 },
  { id: '12', symbol: 'UNH', name: 'UnitedHealth Group', shares: 10, avgCost: 480, currentPrice: 528.90, marketValue: 5289, totalGain: 489, totalGainPercent: 10.19, dayChange: 2.30, dayChangePercent: 0.44, sector: 'Healthcare', weight: 3.4, hasEarnings: false, dividendYield: 1.42, peRatio: 22.1, beta: 0.68, analystRating: 'buy', priceTarget: 580 },
];

const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3B82F6',
  'Financials': '#F59E0B',
  'Healthcare': '#22C55E',
  'Energy': '#EF4444',
  'Consumer Discretionary': '#8B5CF6',
  'Communication Services': '#EC4899',
  'Cash': '#6B7280',
};

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

const AlertBadge = ({ count, priority }: { count: number; priority: 'high' | 'medium' | 'low' }) => {
  const colors = { high: '#EF4444', medium: '#F59E0B', low: '#3B82F6' };
  if (count === 0) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10,
      background: colors[priority], color: '#fff', fontSize: 11, fontWeight: 600
    }}>
      {count}
    </span>
  );
};

const ProgressSteps = ({ current, total }: { current: number; total: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: i < current ? '#C7A93D' : i === current ? 'rgba(199,169,61,0.3)' : '#1A1A1A', border: i === current ? '2px solid #C7A93D' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: i <= current ? '#fff' : '#6B7280' }}>
          {i < current ? <Check size={16} /> : i + 1}
        </div>
        {i < total - 1 && <div style={{ width: 40, height: 2, background: i < current ? '#C7A93D' : '#1A1A1A' }} />}
      </div>
    ))}
  </div>
);

const SliderInput = ({ label, value, onChange, min = 0, max = 100, suffix = '%' }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) => {
  const pct = ((value - min) / (max - min)) * 100;
  const color = pct < 33 ? '#22C55E' : pct < 66 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: '#9CA3AF' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(parseInt(e.target.value))} style={{ width: '100%', height: 6, borderRadius: 3, background: `linear-gradient(to right, ${color} ${pct}%, #1A1A1A ${pct}%)`, appearance: 'none', cursor: 'pointer' }} />
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function MyPortfolioComplete() {
  // State
  const [currentView, setCurrentView] = useState<'onboarding' | 'connect' | 'portfolio'>('onboarding');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [profileComplete, setProfileComplete] = useState(false);
  const [portfolioConnected, setPortfolioConnected] = useState(false);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showStockAnalysis, setShowStockAnalysis] = useState<string | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<'broker' | 'csv' | 'manual' | null>(null);
  const [sortBy, setSortBy] = useState<'value' | 'gain' | 'weight' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [filterAlerts, setFilterAlerts] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Profile state
  const [profile, setProfile] = useState<InvestorProfile>({
    portfolioSize: '', monthlyContribution: '', expectedReturn: '', maxDrawdown: '20',
    tradingStyle: { dayTrading: 10, swingTrading: 30, positionTrading: 30, longTermInvesting: 30 },
    maxPositionSize: '15', defaultStopLoss: '8', riskPerTrade: '2', maxOpenPositions: '10', useTrailingStops: true,
    assetPreferences: {
      stocks: { enabled: true, riskLevel: 'moderate' },
      options: { enabled: false, riskLevel: 'moderate', experience: 'none' },
      etfs: { enabled: true, riskLevel: 'conservative' },
      crypto: { enabled: false, riskLevel: 'aggressive' },
    },
    preferredSectors: ['technology', 'healthcare'], excludedSectors: [],
    prefersDividends: false, dividendMinYield: '2', allowsShortSelling: false,
    macroOutlook: 'neutral', interestRateSensitivity: 'medium', inflationHedge: false,
    lossReaction: 'hold', profitTaking: 'scale_out', primaryGoal: 'growth',
  });

  // Manual positions state
  const [manualPosition, setManualPosition] = useState({ symbol: '', shares: '', avgCost: '' });
  const [positions, setPositions] = useState<Position[]>([]);

  // Generate positions with alerts
  useEffect(() => {
    if (portfolioConnected) {
      const positionsWithAlerts = MOCK_POSITIONS_RAW.map(p => ({
        ...p,
        alerts: generateAlerts(p, profileComplete ? profile : null)
      }));
      setPositions(positionsWithAlerts);
    }
  }, [portfolioConnected, profileComplete, profile]);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Calculate portfolio stats
  const portfolioStats: PortfolioStats = {
    totalValue: positions.reduce((s, p) => s + p.marketValue, 0) + 32000,
    totalCost: positions.reduce((s, p) => s + (p.avgCost * p.shares), 0),
    totalGain: positions.reduce((s, p) => s + p.totalGain, 0),
    totalGainPercent: 0,
    dayChange: positions.reduce((s, p) => s + (p.dayChange * p.shares), 0),
    dayChangePercent: 0,
    cash: 32000,
    buyingPower: 64000,
    positions: positions.length,
    riskScore: 72,
    diversificationScore: 45,
    dividendYield: positions.reduce((s, p) => s + (p.dividendYield || 0) * (p.weight / 100), 0),
    beta: positions.reduce((s, p) => s + (p.beta || 1) * (p.weight / 100), 0),
  };
  portfolioStats.totalGainPercent = (portfolioStats.totalGain / portfolioStats.totalCost) * 100;
  portfolioStats.dayChangePercent = (portfolioStats.dayChange / portfolioStats.totalValue) * 100;

  // Calculate sector allocation
  const sectorAllocation: SectorAllocation[] = Object.entries(
    positions.reduce((acc, p) => {
      if (!acc[p.sector]) acc[p.sector] = { value: 0, positions: [] };
      acc[p.sector].value += p.marketValue;
      acc[p.sector].positions.push(p.symbol);
      return acc;
    }, {} as Record<string, { value: number; positions: string[] }>)
  ).map(([name, data]) => ({
    name,
    value: data.value,
    percent: (data.value / (portfolioStats.totalValue - portfolioStats.cash)) * 100,
    color: SECTOR_COLORS[name] || '#6B7280',
    benchmark: name === 'Technology' ? 28 : name === 'Financials' ? 13 : name === 'Healthcare' ? 13 : 10,
    positions: data.positions,
  })).sort((a, b) => b.percent - a.percent);

  // Add cash
  sectorAllocation.push({
    name: 'Cash',
    value: portfolioStats.cash,
    percent: (portfolioStats.cash / portfolioStats.totalValue) * 100,
    color: '#6B7280',
    benchmark: 5,
    positions: [],
  });

  // Filter and sort positions
  const filteredPositions = positions
    .filter(p => !filterSector || p.sector === filterSector)
    .filter(p => !filterAlerts || p.alerts.length > 0)
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'value': comparison = a.marketValue - b.marketValue; break;
        case 'gain': comparison = a.totalGainPercent - b.totalGainPercent; break;
        case 'weight': comparison = a.weight - b.weight; break;
        case 'name': comparison = a.symbol.localeCompare(b.symbol); break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Alert counts
  const alertCounts = {
    high: positions.reduce((s, p) => s + p.alerts.filter(a => a.priority === 'high').length, 0),
    medium: positions.reduce((s, p) => s + p.alerts.filter(a => a.priority === 'medium').length, 0),
    low: positions.reduce((s, p) => s + p.alerts.filter(a => a.priority === 'low').length, 0),
  };

  const totalSteps = 7;

  // ============================================
  // QUESTIONNAIRE OPTIONS
  // ============================================
  const PORTFOLIO_SIZES = [
    { value: 'under_10k', label: 'Under $10K' }, { value: '10k_50k', label: '$10K - $50K' },
    { value: '50k_100k', label: '$50K - $100K' }, { value: '100k_500k', label: '$100K - $500K' },
    { value: '500k_1m', label: '$500K - $1M' }, { value: 'over_1m', label: 'Over $1M' },
  ];
  const EXPECTED_RETURNS = [
    { value: '5_10', label: '5-10%' }, { value: '10_15', label: '10-15%' },
    { value: '15_25', label: '15-25%' }, { value: '25_50', label: '25-50%' }, { value: 'over_50', label: '50%+' },
  ];
  const MAX_DRAWDOWNS = [
    { value: '5', label: '5%', color: '#22C55E' }, { value: '10', label: '10%', color: '#84CC16' },
    { value: '20', label: '20%', color: '#F59E0B' }, { value: '30', label: '30%', color: '#F97316' },
    { value: '50', label: '50%+', color: '#EF4444' },
  ];
  const SECTORS = [
    { id: 'technology', name: 'Technology', icon: '💻' }, { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
    { id: 'financials', name: 'Financials', icon: '🏦' }, { id: 'energy', name: 'Energy', icon: '⚡' },
    { id: 'consumer', name: 'Consumer', icon: '🛍️' }, { id: 'industrials', name: 'Industrials', icon: '🏭' },
  ];

  // ============================================
  // RENDER QUESTIONNAIRE STEP
  // ============================================
  const renderQuestionnaireStep = () => {
    switch (onboardingStep) {
      case 0: return (
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}><Wallet size={24} style={{ color: '#C7A93D', marginRight: 8, verticalAlign: 'middle' }} />Portfolio Basics</h3>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>Portfolio Size</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {PORTFOLIO_SIZES.map(o => (
                <button key={o.value} onClick={() => setProfile(p => ({ ...p, portfolioSize: o.value }))} style={{ padding: 14, background: profile.portfolioSize === o.value ? 'rgba(199,169,61,0.15)' : '#0A0A0A', border: `1px solid ${profile.portfolioSize === o.value ? 'rgba(199,169,61,0.5)' : '#1A1A1A'}`, borderRadius: 10, cursor: 'pointer' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: profile.portfolioSize === o.value ? '#C7A93D' : '#fff' }}>{o.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>Expected Annual Return</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {EXPECTED_RETURNS.map(o => (
                <button key={o.value} onClick={() => setProfile(p => ({ ...p, expectedReturn: o.value }))} style={{ padding: 12, background: profile.expectedReturn === o.value ? 'rgba(199,169,61,0.15)' : '#0A0A0A', border: `1px solid ${profile.expectedReturn === o.value ? 'rgba(199,169,61,0.5)' : '#1A1A1A'}`, borderRadius: 10, cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: profile.expectedReturn === o.value ? '#C7A93D' : '#fff' }}>{o.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>Max Acceptable Drawdown</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {MAX_DRAWDOWNS.map(o => (
                <button key={o.value} onClick={() => setProfile(p => ({ ...p, maxDrawdown: o.value }))} style={{ padding: 14, background: profile.maxDrawdown === o.value ? `${o.color}20` : '#0A0A0A', border: `2px solid ${profile.maxDrawdown === o.value ? o.color : '#1A1A1A'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: profile.maxDrawdown === o.value ? o.color : '#fff' }}>-{o.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
      case 1: return (
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}><CandlestickChart size={24} style={{ color: '#C7A93D', marginRight: 8, verticalAlign: 'middle' }} />Trading Style</h3>
          <div style={{ background: '#0A0A0A', borderRadius: 16, padding: 24 }}>
            <SliderInput label="🚀 Day Trading" value={profile.tradingStyle.dayTrading} onChange={v => setProfile(p => ({ ...p, tradingStyle: { ...p.tradingStyle, dayTrading: v } }))} />
            <SliderInput label="📈 Swing Trading" value={profile.tradingStyle.swingTrading} onChange={v => setProfile(p => ({ ...p, tradingStyle: { ...p.tradingStyle, swingTrading: v } }))} />
            <SliderInput label="📊 Position Trading" value={profile.tradingStyle.positionTrading} onChange={v => setProfile(p => ({ ...p, tradingStyle: { ...p.tradingStyle, positionTrading: v } }))} />
            <SliderInput label="🏦 Long-Term" value={profile.tradingStyle.longTermInvesting} onChange={v => setProfile(p => ({ ...p, tradingStyle: { ...p.tradingStyle, longTermInvesting: v } }))} />
            <div style={{ marginTop: 16, padding: 12, background: Object.values(profile.tradingStyle).reduce((a, b) => a + b, 0) === 100 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 8, textAlign: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: Object.values(profile.tradingStyle).reduce((a, b) => a + b, 0) === 100 ? '#22C55E' : '#EF4444' }}>
                Total: {Object.values(profile.tradingStyle).reduce((a, b) => a + b, 0)}%
              </span>
            </div>
          </div>
        </div>
      );
      case 2: return (
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}><Shield size={24} style={{ color: '#C7A93D', marginRight: 8, verticalAlign: 'middle' }} />Risk Management</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            <div style={{ background: '#0A0A0A', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Max Position Size</div>
              <SliderInput label="Max % in one stock" value={parseInt(profile.maxPositionSize)} onChange={v => setProfile(p => ({ ...p, maxPositionSize: v.toString() }))} min={5} max={50} />
            </div>
            <div style={{ background: '#0A0A0A', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Stop-Loss</div>
              <SliderInput label="Exit if loss exceeds" value={parseInt(profile.defaultStopLoss)} onChange={v => setProfile(p => ({ ...p, defaultStopLoss: v.toString() }))} min={2} max={25} />
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>💎 Asset Preferences</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['stocks', 'options', 'etfs', 'crypto'].map(asset => {
              const k = asset as keyof typeof profile.assetPreferences;
              const d = profile.assetPreferences[k];
              return (
                <div key={k} style={{ background: d.enabled ? 'rgba(199,169,61,0.05)' : '#0A0A0A', border: `1px solid ${d.enabled ? 'rgba(199,169,61,0.3)' : '#1A1A1A'}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, textTransform: 'capitalize' }}>{asset}</span>
                  <button onClick={() => setProfile(p => ({ ...p, assetPreferences: { ...p.assetPreferences, [k]: { ...d, enabled: !d.enabled } } }))} style={{ width: 56, height: 32, borderRadius: 16, background: d.enabled ? '#C7A93D' : '#1A1A1A', border: 'none', cursor: 'pointer', position: 'relative' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', position: 'absolute', top: 4, left: d.enabled ? 28 : 4, transition: 'left 0.2s' }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
      case 4: return (
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}><Building size={24} style={{ color: '#C7A93D', marginRight: 8, verticalAlign: 'middle' }} />Sectors</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {SECTORS.map(s => (
              <button key={s.id} onClick={() => setProfile(p => ({ ...p, preferredSectors: p.preferredSectors.includes(s.id) ? p.preferredSectors.filter(x => x !== s.id) : [...p.preferredSectors, s.id] }))} style={{ padding: '10px 16px', background: profile.preferredSectors.includes(s.id) ? 'rgba(34,197,94,0.15)' : '#0A0A0A', border: `1px solid ${profile.preferredSectors.includes(s.id) ? '#22C55E' : '#1A1A1A'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{s.icon}</span>
                <span style={{ fontSize: 13, color: profile.preferredSectors.includes(s.id) ? '#22C55E' : '#9CA3AF' }}>{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      );
      case 5: return (
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}><Globe size={24} style={{ color: '#C7A93D', marginRight: 8, verticalAlign: 'middle' }} />Macro View</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[{ v: 'bullish', l: '🐂 Bullish', c: '#22C55E' }, { v: 'bearish', l: '🐻 Bearish', c: '#EF4444' }, { v: 'neutral', l: '⚖️ Neutral', c: '#F59E0B' }, { v: 'uncertain', l: '❓ Uncertain', c: '#6B7280' }].map(o => (
              <button key={o.v} onClick={() => setProfile(p => ({ ...p, macroOutlook: o.v as any }))} style={{ padding: 16, background: profile.macroOutlook === o.v ? `${o.c}20` : '#0A0A0A', border: `2px solid ${profile.macroOutlook === o.v ? o.c : '#1A1A1A'}`, borderRadius: 12, cursor: 'pointer' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: profile.macroOutlook === o.v ? o.c : '#fff' }}>{o.l}</div>
              </button>
            ))}
          </div>
        </div>
      );
      case 6: return (
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}><Target size={24} style={{ color: '#C7A93D', marginRight: 8, verticalAlign: 'middle' }} />Goals</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[{ v: 'growth', l: '📈 Growth' }, { v: 'income', l: '💵 Income' }, { v: 'preservation', l: '🛡️ Preservation' }, { v: 'speculation', l: '🎲 Speculation' }].map(o => (
              <button key={o.v} onClick={() => setProfile(p => ({ ...p, primaryGoal: o.v as any }))} style={{ padding: 16, background: profile.primaryGoal === o.v ? 'rgba(199,169,61,0.15)' : '#0A0A0A', border: `1px solid ${profile.primaryGoal === o.v ? 'rgba(199,169,61,0.5)' : '#1A1A1A'}`, borderRadius: 12, cursor: 'pointer' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: profile.primaryGoal === o.v ? '#C7A93D' : '#fff' }}>{o.l}</div>
              </button>
            ))}
          </div>
        </div>
      );
      default: return null;
    }
  };

  // ============================================
  // RENDER CONNECTION METHODS
  // ============================================
  const renderConnectionView = () => (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px rgba(199,169,61,0.3)' }}>
          <Link size={40} style={{ color: '#fff' }} />
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>Connect Your Portfolio</h1>
        <p style={{ fontSize: 18, color: '#9CA3AF' }}>Choose how you want to import your positions</p>
      </div>

      {/* Connection Method Selection */}
      {!connectionMethod && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <button onClick={() => setConnectionMethod('broker')} style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 20, padding: 32, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Link size={32} style={{ color: '#3B82F6' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Connect Broker</h3>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Auto-sync with Robinhood, TD, IBKR & more</p>
            <div style={{ marginTop: 16, padding: '8px 16px', background: 'rgba(34,197,94,0.1)', borderRadius: 8, fontSize: 12, color: '#22C55E' }}>Recommended</div>
          </button>

          <button onClick={() => setConnectionMethod('csv')} style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 20, padding: 32, cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Upload size={32} style={{ color: '#F59E0B' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Import CSV</h3>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Upload portfolio export from any broker</p>
          </button>

          <button onClick={() => setConnectionMethod('manual')} style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 20, padding: 32, cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Edit3 size={32} style={{ color: '#8B5CF6' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Manual Entry</h3>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Add positions one by one</p>
          </button>
        </div>
      )}

      {/* Broker Selection */}
      {connectionMethod === 'broker' && (
        <div>
          <button onClick={() => setConnectionMethod(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', marginBottom: 24 }}>
            <ChevronLeft size={18} /> Back
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Select Your Broker</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {BROKERS.map(broker => (
              <button key={broker.id} onClick={() => { setSelectedBroker(broker.id); setPortfolioConnected(true); setCurrentView('portfolio'); }} style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 16, padding: 24, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{broker.logo}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{broker.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CSV Upload */}
      {connectionMethod === 'csv' && (
        <div>
          <button onClick={() => setConnectionMethod(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', marginBottom: 24 }}>
            <ChevronLeft size={18} /> Back
          </button>
          <div style={{ background: '#0D1117', border: '2px dashed #2A2A2A', borderRadius: 20, padding: 60, textAlign: 'center' }}>
            <Upload size={48} style={{ color: '#6B7280', marginBottom: 16 }} />
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Drop CSV file here</h3>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>or click to browse</p>
            <button onClick={() => { setPortfolioConnected(true); setCurrentView('portfolio'); }} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Upload File (Demo)
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry */}
      {connectionMethod === 'manual' && (
        <div>
          <button onClick={() => setConnectionMethod(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', marginBottom: 24 }}>
            <ChevronLeft size={18} /> Back
          </button>
          <div style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 20, padding: 32 }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Add Position</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, display: 'block' }}>Symbol</label>
                <input type="text" placeholder="AAPL" value={manualPosition.symbol} onChange={e => setManualPosition(p => ({ ...p, symbol: e.target.value.toUpperCase() }))} style={{ width: '100%', padding: '12px 16px', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#fff', fontSize: 16 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, display: 'block' }}>Shares</label>
                <input type="number" placeholder="100" value={manualPosition.shares} onChange={e => setManualPosition(p => ({ ...p, shares: e.target.value }))} style={{ width: '100%', padding: '12px 16px', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#fff', fontSize: 16 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, display: 'block' }}>Avg Cost</label>
                <input type="number" placeholder="150.00" value={manualPosition.avgCost} onChange={e => setManualPosition(p => ({ ...p, avgCost: e.target.value }))} style={{ width: '100%', padding: '12px 16px', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#fff', fontSize: 16 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ padding: '12px 24px', background: 'rgba(199,169,61,0.15)', border: '1px solid rgba(199,169,61,0.3)', borderRadius: 10, color: '#C7A93D', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} /> Add Position
              </button>
              <button onClick={() => { setPortfolioConnected(true); setCurrentView('portfolio'); }} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Continue with Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER PORTFOLIO VIEW
  // ============================================
  const renderPortfolioView = () => (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(139,92,246,0.3)' }}>
            <Briefcase size={28} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>My Portfolio</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6B7280', fontSize: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />Connected</span>
              <span>•</span>
              <span>{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })} ET</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowAddPosition(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#0D1117', border: '1px solid #2A2A2A', borderRadius: 8, color: '#9CA3AF', cursor: 'pointer', fontSize: 14 }}>
            <Plus size={16} /> Add Position
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            <Sparkles size={16} /> Full AI Scan <CreditBadge cost={10} type="heavy" />
          </button>
        </div>
      </div>

      {/* Portfolio Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, gridColumn: 'span 2' }}>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Total Value</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>${portfolioStats.totalValue.toLocaleString()}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ color: portfolioStats.dayChange >= 0 ? '#22C55E' : '#EF4444', fontSize: 14, fontWeight: 600 }}>
              {portfolioStats.dayChange >= 0 ? '+' : ''}${portfolioStats.dayChange.toFixed(2)} ({portfolioStats.dayChangePercent.toFixed(2)}%)
            </span>
            <span style={{ fontSize: 12, color: '#6B7280' }}>today</span>
          </div>
        </div>
        <div style={{ background: portfolioStats.totalGain >= 0 ? 'linear-gradient(135deg, rgba(34,197,94,0.1), #0D1117)' : 'linear-gradient(135deg, rgba(239,68,68,0.1), #0D1117)', border: `1px solid ${portfolioStats.totalGain >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Total Gain</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: portfolioStats.totalGain >= 0 ? '#22C55E' : '#EF4444' }}>
            {portfolioStats.totalGain >= 0 ? '+' : ''}${portfolioStats.totalGain.toLocaleString()}
          </div>
          <div style={{ fontSize: 14, color: portfolioStats.totalGain >= 0 ? '#22C55E' : '#EF4444' }}>
            ({portfolioStats.totalGainPercent.toFixed(2)}%)
          </div>
        </div>
        <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Positions</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{portfolioStats.positions}</div>
          <div style={{ fontSize: 14, color: '#6B7280' }}>${portfolioStats.cash.toLocaleString()} cash</div>
        </div>
        <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Risk Score</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: portfolioStats.riskScore > 70 ? '#F59E0B' : '#22C55E' }}>{portfolioStats.riskScore}/100</div>
          <div style={{ fontSize: 14, color: '#F59E0B' }}>Moderate-High</div>
        </div>
        <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Alerts</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertBadge count={alertCounts.high} priority="high" />
            <AlertBadge count={alertCounts.medium} priority="medium" />
            <AlertBadge count={alertCounts.low} priority="low" />
          </div>
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>{alertCounts.high + alertCounts.medium + alertCounts.low} total</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        {/* Holdings List */}
        <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24 }}>
          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Holdings</h3>
              <span style={{ fontSize: 13, color: '#6B7280' }}>{filteredPositions.length} positions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setFilterAlerts(!filterAlerts)} style={{ padding: '6px 12px', background: filterAlerts ? 'rgba(249,115,22,0.15)' : '#0A0A0A', border: `1px solid ${filterAlerts ? '#F59E0B' : '#2A2A2A'}`, borderRadius: 6, color: filterAlerts ? '#F59E0B' : '#6B7280', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={14} /> Alerts Only
              </button>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ padding: '6px 12px', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 6, color: '#9CA3AF', fontSize: 12, cursor: 'pointer' }}>
                <option value="value">Sort by Value</option>
                <option value="gain">Sort by Gain</option>
                <option value="weight">Sort by Weight</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </div>

          {/* Holdings Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredPositions.map(p => (
              <div key={p.id} style={{ background: '#0A0A0A', border: p.alerts.some(a => a.priority === 'high') ? '1px solid rgba(239,68,68,0.3)' : '1px solid #1A1A1A', borderRadius: 12, overflow: 'hidden' }}>
                {/* Main Row */}
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#C7A93D' }}>{p.symbol}</span>
                      {p.alerts.length > 0 && <AlertBadge count={p.alerts.length} priority={p.alerts.some(a => a.priority === 'high') ? 'high' : 'medium'} />}
                      {p.hasEarnings && <span style={{ padding: '2px 6px', background: 'rgba(249,115,22,0.15)', borderRadius: 4, fontSize: 10, color: '#F59E0B' }}><Calendar size={10} style={{ marginRight: 2 }} />{p.earningsDate}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{p.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>${p.currentPrice.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: p.dayChange >= 0 ? '#22C55E' : '#EF4444' }}>{p.dayChange >= 0 ? '+' : ''}{p.dayChangePercent.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>${p.marketValue.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{p.shares} shares</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: p.totalGain >= 0 ? '#22C55E' : '#EF4444' }}>{p.totalGain >= 0 ? '+' : ''}${p.totalGain.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: p.totalGain >= 0 ? '#22C55E' : '#EF4444' }}>({p.totalGainPercent.toFixed(2)}%)</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: p.weight > parseInt(profile.maxPositionSize) ? '#EF4444' : '#9CA3AF' }}>{p.weight.toFixed(1)}%</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setExpandedPositions(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} style={{ padding: 8, background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                      {expandedPositions.has(p.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <button onClick={() => setShowStockAnalysis(p.symbol)} style={{ padding: '6px 12px', background: 'rgba(199,169,61,0.1)', border: '1px solid rgba(199,169,61,0.3)', borderRadius: 6, color: '#C7A93D', cursor: 'pointer', fontSize: 12 }}>
                      Analyze
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedPositions.has(p.id) && (
                  <div style={{ borderTop: '1px solid #1A1A1A', padding: 16, background: '#080B0F' }}>
                    {/* Alerts */}
                    {p.alerts.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>AI ALERTS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {p.alerts.map((alert, i) => {
                            const cfg = { warning: { color: '#EF4444' }, opportunity: { color: '#22C55E' }, info: { color: '#3B82F6' }, action: { color: '#F59E0B' }, deviation: { color: '#EC4899' } }[alert.type];
                            return (
                              <div key={i} style={{ padding: 12, background: '#0A0A0A', borderRadius: 8, borderLeft: `3px solid ${cfg.color}` }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{alert.title}</div>
                                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{alert.description}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Position Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
                      <div><div style={{ fontSize: 11, color: '#6B7280' }}>Avg Cost</div><div style={{ fontSize: 14, fontWeight: 600 }}>${p.avgCost.toFixed(2)}</div></div>
                      <div><div style={{ fontSize: 11, color: '#6B7280' }}>P/E Ratio</div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.peRatio?.toFixed(1) || '-'}</div></div>
                      <div><div style={{ fontSize: 11, color: '#6B7280' }}>Beta</div><div style={{ fontSize: 14, fontWeight: 600, color: (p.beta || 0) > 1.5 ? '#EF4444' : '#9CA3AF' }}>{p.beta?.toFixed(2) || '-'}</div></div>
                      <div><div style={{ fontSize: 11, color: '#6B7280' }}>Dividend</div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.dividendYield?.toFixed(2) || '0'}%</div></div>
                      <div><div style={{ fontSize: 11, color: '#6B7280' }}>Analyst</div><div style={{ fontSize: 14, fontWeight: 600, color: p.analystRating === 'buy' ? '#22C55E' : p.analystRating === 'sell' ? '#EF4444' : '#F59E0B', textTransform: 'uppercase' }}>{p.analystRating || '-'}</div></div>
                      <div><div style={{ fontSize: 11, color: '#6B7280' }}>Target</div><div style={{ fontSize: 14, fontWeight: 600 }}>${p.priceTarget || '-'}</div></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Sector Allocation */}
          <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <PieChart size={20} style={{ color: '#8B5CF6' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Allocation</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sectorAllocation.map(s => (
                <div key={s.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                      <span style={{ fontSize: 13 }}>{s.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{s.percent.toFixed(1)}%</span>
                      {s.percent - s.benchmark > 10 && <span style={{ fontSize: 10, color: '#EF4444' }}>⚠️</span>}
                    </div>
                  </div>
                  <div style={{ position: 'relative', height: 6, background: '#1A1A1A', borderRadius: 3 }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(s.percent, 100)}%`, background: s.color, borderRadius: 3 }} />
                    <div style={{ position: 'absolute', left: `${s.benchmark}%`, top: -2, width: 2, height: 10, background: '#fff', borderRadius: 1 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Portfolio Metrics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>Portfolio Beta</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: portfolioStats.beta > 1.2 ? '#F59E0B' : '#22C55E' }}>{portfolioStats.beta.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>Dividend Yield</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{portfolioStats.dividendYield.toFixed(2)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>Diversification</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: portfolioStats.diversificationScore < 50 ? '#EF4444' : '#22C55E' }}>{portfolioStats.diversificationScore}/100</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>Buying Power</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>${portfolioStats.buyingPower.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* AI Actions */}
          <div style={{ background: 'linear-gradient(135deg, #0D1117, rgba(199,169,61,0.05))', border: '1px solid rgba(199,169,61,0.15)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={20} style={{ color: '#C7A93D' }} />AI Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button style={{ width: '100%', padding: '12px 16px', background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14 }}><Gauge size={16} style={{ color: '#3B82F6' }} />Risk Analysis</span>
                <CreditBadge cost={5} type="medium" />
              </button>
              <button style={{ width: '100%', padding: '12px 16px', background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14 }}><BarChart3 size={16} style={{ color: '#8B5CF6' }} />Rebalance</span>
                <CreditBadge cost={10} type="heavy" />
              </button>
              <button style={{ width: '100%', padding: '12px 16px', background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14 }}><Shield size={16} style={{ color: '#22C55E' }} />Hedge Suggest</span>
                <CreditBadge cost={12} type="heavy" />
              </button>
              <button style={{ width: '100%', padding: '12px 16px', background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14 }}><FileText size={16} style={{ color: '#F59E0B' }} />Full Report</span>
                <CreditBadge cost={20} type="heavy" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', color: '#fff' }}>
      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Onboarding / Questionnaire */}
        {currentView === 'onboarding' && (
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
            {!profileComplete ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px rgba(199,169,61,0.3)' }}>
                    <Target size={40} style={{ color: '#fff' }} />
                  </div>
                  <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>Let's Build Your Profile</h1>
                  <p style={{ fontSize: 18, color: '#9CA3AF' }}>Step {onboardingStep + 1} of {totalSteps}</p>
                </div>
                <ProgressSteps current={onboardingStep} total={totalSteps} />
                <div style={{ background: '#0D1117', border: '1px solid rgba(199,169,61,0.2)', borderRadius: 20, padding: 32 }}>
                  {renderQuestionnaireStep()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button onClick={() => setOnboardingStep(s => Math.max(0, s - 1))} disabled={onboardingStep === 0} style={{ padding: '12px 24px', background: onboardingStep === 0 ? '#1A1A1A' : '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10, color: onboardingStep === 0 ? '#4A4A4A' : '#9CA3AF', cursor: onboardingStep === 0 ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                    <ChevronLeft size={18} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Previous
                  </button>
                  {onboardingStep < totalSteps - 1 ? (
                    <button onClick={() => setOnboardingStep(s => s + 1)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      Next <ChevronRight size={18} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                    </button>
                  ) : (
                    <button onClick={() => { setProfileComplete(true); setCurrentView('connect'); }} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #22C55E, #16A34A)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      <Check size={18} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Complete & Connect Portfolio
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Connection View */}
        {currentView === 'connect' && renderConnectionView()}

        {/* Portfolio View */}
        {currentView === 'portfolio' && renderPortfolioView()}
      </div>

      {/* Stock Analysis Modal */}
      {showStockAnalysis && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div style={{ background: '#0D1117', border: '1px solid rgba(199,169,61,0.3)', borderRadius: 20, padding: 32, maxWidth: 600, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#C7A93D' }}>{showStockAnalysis} Analysis</h2>
              <button onClick={() => setShowStockAnalysis(null)} style={{ width: 36, height: 36, borderRadius: 8, background: '#1A1A1A', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { label: 'Company Overview', icon: Building, credits: 0 },
                { label: 'Technical Analysis', icon: LineChart, credits: 5 },
                { label: 'Fundamentals', icon: BarChart2, credits: 8 },
                { label: 'Valuation', icon: DollarSign, credits: 12 },
                { label: 'Earnings Analysis', icon: Calendar, credits: 10 },
                { label: 'News Sentiment', icon: FileText, credits: 5 },
                { label: 'Risk Assessment', icon: AlertTriangle, credits: 8 },
                { label: 'Options Plays', icon: Layers, credits: 10 },
              ].map(o => (
                <button key={o.label} style={{ padding: 16, background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}><o.icon size={16} style={{ color: '#C7A93D' }} />{o.label}</span>
                  <CreditBadge cost={o.credits} type={o.credits === 0 ? 'light' : o.credits <= 5 ? 'medium' : 'heavy'} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        input[type="range"]::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #C7A93D; cursor: pointer; border: 2px solid #fff; }
        input:focus { outline: none; border-color: #C7A93D !important; }
        select { appearance: none; }
      `}</style>
    </div>
  );
}