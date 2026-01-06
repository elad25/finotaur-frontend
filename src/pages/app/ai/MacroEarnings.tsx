import { useState, useEffect } from 'react';
import {
  Activity, TrendingUp, TrendingDown, Zap, Brain, Flame,
  ChevronDown, ChevronUp, DollarSign, AlertTriangle, Sparkles, Shield,
  Target, Clock, Calendar, X, Filter, Eye, Search,
  ArrowUpRight, ArrowDownRight, BarChart3, FileText, Bell, Info,
  RefreshCw, ChevronRight, Download, Building, Globe, LineChart,
  CheckCircle, XCircle, AlertCircle, Percent, Users, Factory,
  TrendingUp as Trending, PieChart, Briefcase, BookOpen, ExternalLink,
  Play, Pause, Timer, ArrowRight, Layers, MessageSquare, Landmark
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface MacroReport {
  id: string;
  name: string;
  shortName: string;
  category: 'inflation' | 'employment' | 'fed' | 'growth' | 'manufacturing';
  releaseDate: string;
  releaseTime: string;
  released: boolean;
  actual?: string;
  forecast?: string;
  previous?: string;
  impact: 'high' | 'medium' | 'low';
  marketReaction?: 'bullish' | 'bearish' | 'neutral';
  nextRelease?: string;
  description: string;
}

interface EarningsReport {
  id: string;
  symbol: string;
  companyName: string;
  reportDate: string;
  reportTime: 'BMO' | 'AMC';
  epsActual?: number;
  epsEstimate: number;
  epsSurprise?: number;
  epsSurprisePercent?: number;
  revenueActual?: number;
  revenueEstimate: number;
  revenueSurprise?: number;
  revenueSurprisePercent?: number;
  guidance?: 'raised' | 'maintained' | 'lowered' | 'none';
  priceReaction?: number;
  sector: string;
  marketCap: string;
  hasAnalysis: boolean;
}

interface CompanyData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  peRatio: number;
  forwardPE: number;
  pegRatio: number;
  eps: number;
  revenue: string;
  revenueGrowth: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  debtToEquity: number;
  currentRatio: number;
  dividendYield: number;
  beta: number;
  week52High: number;
  week52Low: number;
  avgVolume: string;
  sector: string;
  industry: string;
  nextEarnings: string;
  analystRating: 'buy' | 'hold' | 'sell';
  priceTarget: number;
  description: string;
}

// ============================================
// MOCK DATA
// ============================================
const MACRO_REPORTS: MacroReport[] = [
  {
    id: '1',
    name: 'Consumer Price Index (CPI)',
    shortName: 'CPI',
    category: 'inflation',
    releaseDate: '2026-01-14',
    releaseTime: '08:30 ET',
    released: false,
    forecast: '2.9%',
    previous: '2.7%',
    impact: 'high',
    nextRelease: '2026-02-12',
    description: 'Measures the average change in prices paid by consumers for goods and services.'
  },
  {
    id: '2',
    name: 'Producer Price Index (PPI)',
    shortName: 'PPI',
    category: 'inflation',
    releaseDate: '2026-01-15',
    releaseTime: '08:30 ET',
    released: false,
    forecast: '3.0%',
    previous: '3.0%',
    impact: 'medium',
    nextRelease: '2026-02-13',
    description: 'Measures the average change in selling prices received by domestic producers.'
  },
  {
    id: '3',
    name: 'Non-Farm Payrolls (NFP)',
    shortName: 'NFP',
    category: 'employment',
    releaseDate: '2026-01-03',
    releaseTime: '08:30 ET',
    released: true,
    actual: '256K',
    forecast: '160K',
    previous: '212K',
    impact: 'high',
    marketReaction: 'bearish',
    nextRelease: '2026-02-07',
    description: 'Reports the number of jobs added or lost in the economy, excluding farm workers.'
  },
  {
    id: '4',
    name: 'Unemployment Rate',
    shortName: 'Unemployment',
    category: 'employment',
    releaseDate: '2026-01-03',
    releaseTime: '08:30 ET',
    released: true,
    actual: '4.1%',
    forecast: '4.2%',
    previous: '4.2%',
    impact: 'high',
    marketReaction: 'bullish',
    nextRelease: '2026-02-07',
    description: 'The percentage of the labor force that is unemployed and actively seeking work.'
  },
  {
    id: '5',
    name: 'FOMC Meeting Minutes',
    shortName: 'FOMC',
    category: 'fed',
    releaseDate: '2026-01-08',
    releaseTime: '14:00 ET',
    released: true,
    actual: 'Hold',
    forecast: 'Hold',
    previous: 'Cut 25bp',
    impact: 'high',
    marketReaction: 'neutral',
    nextRelease: '2026-01-29',
    description: 'Federal Reserve policy decision and economic outlook statement.'
  },
  {
    id: '6',
    name: 'ISM Manufacturing PMI',
    shortName: 'ISM Mfg',
    category: 'manufacturing',
    releaseDate: '2026-01-03',
    releaseTime: '10:00 ET',
    released: true,
    actual: '49.2',
    forecast: '48.5',
    previous: '48.4',
    impact: 'medium',
    marketReaction: 'bullish',
    nextRelease: '2026-02-03',
    description: 'Measures manufacturing activity. Above 50 indicates expansion.'
  },
  {
    id: '7',
    name: 'ISM Services PMI',
    shortName: 'ISM Svc',
    category: 'manufacturing',
    releaseDate: '2026-01-07',
    releaseTime: '10:00 ET',
    released: true,
    actual: '54.1',
    forecast: '53.5',
    previous: '52.1',
    impact: 'medium',
    marketReaction: 'bullish',
    nextRelease: '2026-02-05',
    description: 'Measures services sector activity. Above 50 indicates expansion.'
  },
  {
    id: '8',
    name: 'GDP (Q4 Advance)',
    shortName: 'GDP',
    category: 'growth',
    releaseDate: '2026-01-30',
    releaseTime: '08:30 ET',
    released: false,
    forecast: '2.5%',
    previous: '3.1%',
    impact: 'high',
    nextRelease: '2026-02-27',
    description: 'Gross Domestic Product - the total value of goods and services produced.'
  },
  {
    id: '9',
    name: 'Initial Jobless Claims',
    shortName: 'Jobless',
    category: 'employment',
    releaseDate: '2026-01-02',
    releaseTime: '08:30 ET',
    released: true,
    actual: '211K',
    forecast: '220K',
    previous: '219K',
    impact: 'medium',
    marketReaction: 'bullish',
    nextRelease: '2026-01-09',
    description: 'Weekly count of new unemployment insurance claims.'
  },
];

const EARNINGS_REPORTS: EarningsReport[] = [
  {
    id: '1',
    symbol: 'JPM',
    companyName: 'JPMorgan Chase & Co.',
    reportDate: '2026-01-12',
    reportTime: 'BMO',
    epsEstimate: 4.03,
    revenueEstimate: 41.7,
    sector: 'Financials',
    marketCap: '$590B',
    hasAnalysis: false
  },
  {
    id: '2',
    symbol: 'WFC',
    companyName: 'Wells Fargo & Company',
    reportDate: '2026-01-12',
    reportTime: 'BMO',
    epsEstimate: 1.35,
    revenueEstimate: 20.4,
    sector: 'Financials',
    marketCap: '$225B',
    hasAnalysis: false
  },
  {
    id: '3',
    symbol: 'UNH',
    companyName: 'UnitedHealth Group',
    reportDate: '2026-01-15',
    reportTime: 'BMO',
    epsEstimate: 6.72,
    revenueEstimate: 101.2,
    sector: 'Healthcare',
    marketCap: '$485B',
    hasAnalysis: false
  },
  {
    id: '4',
    symbol: 'TSM',
    companyName: 'Taiwan Semiconductor',
    reportDate: '2026-01-16',
    reportTime: 'BMO',
    epsEstimate: 2.16,
    revenueEstimate: 26.1,
    sector: 'Technology',
    marketCap: '$780B',
    hasAnalysis: false
  },
  {
    id: '5',
    symbol: 'NFLX',
    companyName: 'Netflix Inc.',
    reportDate: '2026-01-21',
    reportTime: 'AMC',
    epsEstimate: 4.19,
    revenueEstimate: 10.1,
    sector: 'Communication Services',
    marketCap: '$295B',
    hasAnalysis: false
  },
  // Past week earnings (already reported)
  {
    id: '6',
    symbol: 'DAL',
    companyName: 'Delta Air Lines',
    reportDate: '2026-01-02',
    reportTime: 'BMO',
    epsActual: 1.85,
    epsEstimate: 1.75,
    epsSurprise: 0.10,
    epsSurprisePercent: 5.7,
    revenueActual: 14.4,
    revenueEstimate: 14.2,
    revenueSurprise: 0.2,
    revenueSurprisePercent: 1.4,
    guidance: 'raised',
    priceReaction: 8.5,
    sector: 'Industrials',
    marketCap: '$38B',
    hasAnalysis: true
  },
  {
    id: '7',
    symbol: 'WBA',
    companyName: 'Walgreens Boots Alliance',
    reportDate: '2026-01-02',
    reportTime: 'BMO',
    epsActual: 0.51,
    epsEstimate: 0.38,
    epsSurprise: 0.13,
    epsSurprisePercent: 34.2,
    revenueActual: 39.5,
    revenueEstimate: 37.4,
    revenueSurprise: 2.1,
    revenueSurprisePercent: 5.6,
    guidance: 'maintained',
    priceReaction: 15.2,
    sector: 'Healthcare',
    marketCap: '$11B',
    hasAnalysis: true
  },
  {
    id: '8',
    symbol: 'STZ',
    companyName: 'Constellation Brands',
    reportDate: '2026-01-03',
    reportTime: 'BMO',
    epsActual: 3.25,
    epsEstimate: 3.31,
    epsSurprise: -0.06,
    epsSurprisePercent: -1.8,
    revenueActual: 2.46,
    revenueEstimate: 2.53,
    revenueSurprise: -0.07,
    revenueSurprisePercent: -2.8,
    guidance: 'lowered',
    priceReaction: -12.4,
    sector: 'Consumer Staples',
    marketCap: '$42B',
    hasAnalysis: true
  },
];

const SAMPLE_COMPANY: CompanyData = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 185.50,
  change: -1.25,
  changePercent: -0.67,
  marketCap: '$2.87T',
  peRatio: 28.4,
  forwardPE: 26.2,
  pegRatio: 2.1,
  eps: 6.53,
  revenue: '$383.3B',
  revenueGrowth: 2.8,
  grossMargin: 45.9,
  operatingMargin: 30.7,
  netMargin: 26.3,
  roe: 157.4,
  debtToEquity: 1.87,
  currentRatio: 0.99,
  dividendYield: 0.52,
  beta: 1.28,
  week52High: 199.62,
  week52Low: 164.08,
  avgVolume: '58.2M',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  nextEarnings: 'Jan 25, 2026',
  analystRating: 'buy',
  priceTarget: 210,
  description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.'
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

const CategoryBadge = ({ category }: { category: MacroReport['category'] }) => {
  const config = {
    inflation: { label: 'Inflation', color: '#EF4444', icon: Percent },
    employment: { label: 'Employment', color: '#3B82F6', icon: Users },
    fed: { label: 'Fed', color: '#8B5CF6', icon: Landmark },
    growth: { label: 'Growth', color: '#22C55E', icon: TrendingUp },
    manufacturing: { label: 'Manufacturing', color: '#F59E0B', icon: Factory },
  };
  const { label, color, icon: Icon } = config[category];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: `${color}15`, color, fontSize: 11, fontWeight: 600, borderRadius: 6 }}>
      <Icon size={12} />{label}
    </span>
  );
};

const ImpactBadge = ({ impact }: { impact: 'high' | 'medium' | 'low' }) => {
  const config = {
    high: { label: 'High Impact', color: '#EF4444' },
    medium: { label: 'Medium', color: '#F59E0B' },
    low: { label: 'Low', color: '#22C55E' },
  };
  const { label, color } = config[impact];
  return (
    <span style={{ padding: '3px 8px', background: `${color}15`, color, fontSize: 10, fontWeight: 600, borderRadius: 4 }}>
      {label}
    </span>
  );
};

const MarketReactionBadge = ({ reaction }: { reaction: 'bullish' | 'bearish' | 'neutral' }) => {
  const config = {
    bullish: { label: 'Bullish', color: '#22C55E', icon: TrendingUp },
    bearish: { label: 'Bearish', color: '#EF4444', icon: TrendingDown },
    neutral: { label: 'Neutral', color: '#6B7280', icon: Activity },
  };
  const { label, color, icon: Icon } = config[reaction];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: `${color}15`, color, fontSize: 11, fontWeight: 600, borderRadius: 6 }}>
      <Icon size={12} />{label}
    </span>
  );
};

const CountdownTimer = ({ targetDate, label }: { targetDate: string; label: string }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const calculate = () => {
      const target = new Date(targetDate + 'T08:30:00-05:00');
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        });
      }
    };
    calculate();
    const interval = setInterval(calculate, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(199,169,61,0.1), rgba(199,169,61,0.05))', border: '1px solid rgba(199,169,61,0.2)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
        <Timer size={20} style={{ color: '#C7A93D' }} />
        <span style={{ fontSize: 14, color: '#C7A93D', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{timeLeft.days}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>DAYS</div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#C7A93D' }}>:</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{timeLeft.hours}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>HOURS</div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#C7A93D' }}>:</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{timeLeft.minutes}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>MIN</div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function MacroEarnings() {
  const [activeTab, setActiveTab] = useState<'macro' | 'earnings' | 'research' | 'reports'>('macro');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<string | null>(null);
  const [showMacroAnalysis, setShowMacroAnalysis] = useState<MacroReport | null>(null);
  const [showEarningsAnalysis, setShowEarningsAnalysis] = useState<EarningsReport | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Sort reports
  const releasedReports = MACRO_REPORTS.filter(r => r.released).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  const upcomingReports = MACRO_REPORTS.filter(r => !r.released).sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
  const nextReport = upcomingReports[0];

  // Sort earnings
  const pastEarnings = EARNINGS_REPORTS.filter(e => e.epsActual !== undefined).sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  const upcomingEarnings = EARNINGS_REPORTS.filter(e => e.epsActual === undefined).sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());

  const handleSearch = () => {
    if (searchQuery.toUpperCase() === 'AAPL') {
      setSelectedCompany(SAMPLE_COMPANY);
    }
  };

  // ============================================
  // MACRO TAB
  // ============================================
  const renderMacroTab = () => (
    <div>
      {/* Next Report Countdown */}
      {nextReport && (
        <div style={{ marginBottom: 32 }}>
          <CountdownTimer targetDate={nextReport.releaseDate} label={`Next: ${nextReport.shortName} - ${nextReport.releaseDate}`} />
        </div>
      )}

      {/* Released Reports */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={22} style={{ color: '#22C55E' }} />
            Released This Month
          </h3>
          <span style={{ fontSize: 13, color: '#6B7280' }}>{releasedReports.length} reports</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {releasedReports.map(report => (
            <div key={report.id} style={{ background: '#0D1117', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{report.name}</span>
                    <CategoryBadge category={report.category} />
                    <ImpactBadge impact={report.impact} />
                  </div>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{report.description}</p>
                </div>
                {report.marketReaction && <MarketReactionBadge reaction={report.marketReaction} />}
              </div>

              {/* Results */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Actual</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#22C55E' }}>{report.actual}</div>
                </div>
                <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Forecast</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{report.forecast}</div>
                </div>
                <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Previous</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#9CA3AF' }}>{report.previous}</div>
                </div>
                <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Released</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{report.releaseDate}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{report.releaseTime}</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowMacroAnalysis(report)} style={{ flex: 1, padding: '12px 20px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Sparkles size={16} /> Full AI Analysis <CreditBadge cost={5} type="medium" />
                </button>
                <button style={{ padding: '12px 20px', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#9CA3AF', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} /> Next: {report.nextRelease}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Reports */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={22} style={{ color: '#F59E0B' }} />
            Coming This Month
          </h3>
          <span style={{ fontSize: 13, color: '#6B7280' }}>{upcomingReports.length} reports</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {upcomingReports.map(report => (
            <div key={report.id} style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{report.shortName}</span>
                    <ImpactBadge impact={report.impact} />
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{report.name}</p>
                </div>
                <CategoryBadge category={report.category} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Forecast</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{report.forecast}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Previous</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#9CA3AF' }}>{report.previous}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(249,115,22,0.1)', borderRadius: 8 }}>
                <Calendar size={14} style={{ color: '#F59E0B' }} />
                <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500 }}>{report.releaseDate} at {report.releaseTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // EARNINGS TAB
  // ============================================
  const renderEarningsTab = () => (
    <div>
      {/* Past Week Earnings */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={22} style={{ color: '#22C55E' }} />
            Reported This Week
          </h3>
          <span style={{ fontSize: 13, color: '#6B7280' }}>{pastEarnings.length} companies</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pastEarnings.map(earning => (
            <div key={earning.id} style={{ background: '#0D1117', border: `1px solid ${(earning.epsSurprisePercent || 0) >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#C7A93D' }}>{earning.symbol}</span>
                    <span style={{ fontSize: 14, color: '#6B7280' }}>{earning.companyName}</span>
                    {earning.guidance && (
                      <span style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: earning.guidance === 'raised' ? 'rgba(34,197,94,0.15)' : earning.guidance === 'lowered' ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)',
                        color: earning.guidance === 'raised' ? '#22C55E' : earning.guidance === 'lowered' ? '#EF4444' : '#6B7280'
                      }}>
                        Guidance {earning.guidance}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#6B7280' }}>
                    <span>{earning.sector}</span>
                    <span>•</span>
                    <span>{earning.marketCap}</span>
                    <span>•</span>
                    <span>{earning.reportDate} {earning.reportTime}</span>
                  </div>
                </div>
                {earning.priceReaction !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Price Reaction</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: earning.priceReaction >= 0 ? '#22C55E' : '#EF4444' }}>
                      {earning.priceReaction >= 0 ? '+' : ''}{earning.priceReaction.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Results Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>EPS Actual</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>${earning.epsActual?.toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: (earning.epsSurprisePercent || 0) >= 0 ? '#22C55E' : '#EF4444' }}>
                    {(earning.epsSurprisePercent || 0) >= 0 ? '▲' : '▼'} {Math.abs(earning.epsSurprisePercent || 0).toFixed(1)}% vs est
                  </div>
                </div>
                <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Revenue Actual</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>${earning.revenueActual}B</div>
                  <div style={{ fontSize: 12, color: (earning.revenueSurprisePercent || 0) >= 0 ? '#22C55E' : '#EF4444' }}>
                    {(earning.revenueSurprisePercent || 0) >= 0 ? '▲' : '▼'} {Math.abs(earning.revenueSurprisePercent || 0).toFixed(1)}% vs est
                  </div>
                </div>
                <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>EPS Estimate</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#9CA3AF' }}>${earning.epsEstimate.toFixed(2)}</div>
                </div>
                <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Rev Estimate</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#9CA3AF' }}>${earning.revenueEstimate}B</div>
                </div>
              </div>

              {/* Action Button */}
              <button onClick={() => setShowEarningsAnalysis(earning)} style={{ width: '100%', padding: '14px 20px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Sparkles size={16} /> Full Earnings Analysis <CreditBadge cost={10} type="heavy" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Earnings */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={22} style={{ color: '#F59E0B' }} />
            Coming Up
          </h3>
          <span style={{ fontSize: 13, color: '#6B7280' }}>{upcomingEarnings.length} companies</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {upcomingEarnings.map(earning => (
            <div key={earning.id} style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#C7A93D' }}>{earning.symbol}</span>
                    <span style={{ padding: '2px 6px', background: earning.reportTime === 'BMO' ? 'rgba(249,115,22,0.15)' : 'rgba(139,92,246,0.15)', borderRadius: 4, fontSize: 10, color: earning.reportTime === 'BMO' ? '#F59E0B' : '#8B5CF6' }}>
                      {earning.reportTime === 'BMO' ? '🌅 Pre-Market' : '🌙 After Close'}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{earning.companyName}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#F59E0B' }}>{earning.reportDate}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>EPS Est</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>${earning.epsEstimate.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Rev Est</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>${earning.revenueEstimate}B</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // RESEARCH TAB
  // ============================================
  const renderResearchTab = () => (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input
              type="text"
              placeholder="Search by ticker (e.g., AAPL, NVDA, MSFT)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{ width: '100%', padding: '16px 16px 16px 52px', background: '#0D1117', border: '1px solid #2A2A2A', borderRadius: 12, color: '#fff', fontSize: 16 }}
            />
          </div>
          <button onClick={handleSearch} style={{ padding: '16px 32px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 12, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Search
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Try: AAPL, NVDA, MSFT, GOOGL, AMZN, META, TSLA</p>
      </div>

      {/* Company Data */}
      {selectedCompany && (
        <div>
          {/* Header */}
          <div style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 20, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: '#C7A93D' }}>{selectedCompany.symbol}</span>
                  <span style={{ padding: '4px 12px', background: selectedCompany.analystRating === 'buy' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: selectedCompany.analystRating === 'buy' ? '#22C55E' : '#F59E0B', textTransform: 'uppercase' }}>
                    {selectedCompany.analystRating}
                  </span>
                </div>
                <p style={{ fontSize: 18, color: '#9CA3AF', margin: 0 }}>{selectedCompany.name}</p>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '8px 0 0' }}>{selectedCompany.sector} • {selectedCompany.industry}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 700 }}>${selectedCompany.price.toFixed(2)}</div>
                <div style={{ fontSize: 16, color: selectedCompany.change >= 0 ? '#22C55E' : '#EF4444' }}>
                  {selectedCompany.change >= 0 ? '+' : ''}{selectedCompany.change.toFixed(2)} ({selectedCompany.changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 20 }}>{selectedCompany.description}</p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ padding: '8px 16px', background: 'rgba(249,115,22,0.1)', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: '#F59E0B' }}>📅 Next Earnings: {selectedCompany.nextEarnings}</span>
              </div>
              <div style={{ padding: '8px 16px', background: 'rgba(34,197,94,0.1)', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: '#22C55E' }}>🎯 Price Target: ${selectedCompany.priceTarget}</span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Market Cap', value: selectedCompany.marketCap },
              { label: 'P/E Ratio', value: selectedCompany.peRatio.toFixed(1) },
              { label: 'Forward P/E', value: selectedCompany.forwardPE.toFixed(1) },
              { label: 'PEG Ratio', value: selectedCompany.pegRatio.toFixed(2) },
              { label: 'EPS (TTM)', value: `$${selectedCompany.eps.toFixed(2)}` },
              { label: 'Revenue', value: selectedCompany.revenue },
              { label: 'Rev Growth', value: `${selectedCompany.revenueGrowth}%`, color: selectedCompany.revenueGrowth >= 0 ? '#22C55E' : '#EF4444' },
              { label: 'Dividend', value: `${selectedCompany.dividendYield}%` },
            ].map(item => (
              <div key={item.label} style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: item.color || '#fff' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Profitability Metrics */}
          <div style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={18} style={{ color: '#3B82F6' }} /> Profitability
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
              {[
                { label: 'Gross Margin', value: selectedCompany.grossMargin },
                { label: 'Operating Margin', value: selectedCompany.operatingMargin },
                { label: 'Net Margin', value: selectedCompany.netMargin },
                { label: 'ROE', value: selectedCompany.roe },
                { label: 'Beta', value: selectedCompany.beta, isBeta: true },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: item.isBeta ? (item.value > 1.5 ? '#EF4444' : '#22C55E') : '#fff' }}>
                    {item.isBeta ? item.value.toFixed(2) : `${item.value}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Options */}
          <div style={{ background: 'linear-gradient(135deg, #0D1117, rgba(199,169,61,0.05))', border: '1px solid rgba(199,169,61,0.2)', borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={22} style={{ color: '#C7A93D' }} />
              AI Analysis
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { id: 'overview', label: 'Company Overview', desc: 'Basic summary', credits: 0, icon: Building },
                { id: 'earnings', label: 'Earnings Analysis', desc: 'Recent reports & trends', credits: 8, icon: FileText },
                { id: 'financials', label: 'Financial Trends', desc: 'Revenue, margins, growth', credits: 10, icon: LineChart },
                { id: 'valuation', label: 'Valuation Deep Dive', desc: 'DCF, multiples, fair value', credits: 12, icon: DollarSign },
                { id: 'bull_bear', label: 'Bull / Bear Case', desc: 'Both sides of the trade', credits: 8, icon: Target },
                { id: 'red_flags', label: 'Red Flags Detection', desc: 'Warning signs & risks', credits: 10, icon: AlertTriangle },
                { id: '10k', label: '10-K Summary', desc: 'Annual report highlights', credits: 12, icon: BookOpen },
                { id: '10q', label: '10-Q Summary', desc: 'Quarterly report', credits: 10, icon: FileText },
                { id: 'call', label: 'Earnings Call', desc: 'Key quotes & tone', credits: 10, icon: MessageSquare },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => { setAnalysisType(item.id); setShowAnalysisModal(selectedCompany.symbol); }}
                  style={{ padding: 16, background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <item.icon size={16} style={{ color: '#C7A93D' }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                    </div>
                    <CreditBadge cost={item.credits} type={item.credits === 0 ? 'light' : item.credits <= 8 ? 'medium' : 'heavy'} />
                  </div>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedCompany && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Search size={48} style={{ color: '#2A2A2A', marginBottom: 16 }} />
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Search for a Company</h3>
          <p style={{ fontSize: 14, color: '#6B7280' }}>Enter a ticker symbol to view fundamentals and AI analysis</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // REPORTS TAB
  // ============================================
  const renderReportsTab = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {[
          { id: 'morning', label: 'Morning Report', desc: 'Daily market overview & key events', icon: '🌅', credits: 0, frequency: 'Daily at 8:30 AM ET' },
          { id: 'weekly', label: 'Weekly Digest', desc: 'Week in review & what\'s ahead', icon: '📊', credits: 5, frequency: 'Every Sunday' },
          { id: 'sector', label: 'Sector Report', desc: 'Deep dive into any sector', icon: '🏭', credits: 10, frequency: 'On demand' },
          { id: 'macro', label: 'Macro Monthly', desc: 'Economic trends & Fed outlook', icon: '🌍', credits: 12, frequency: 'Monthly' },
          { id: 'earnings', label: 'Earnings Season', desc: 'Key earnings & surprises', icon: '📈', credits: 8, frequency: 'Quarterly' },
          { id: 'custom', label: 'Custom Report', desc: 'Request any topic', icon: '✨', credits: 15, frequency: 'On demand' },
        ].map(report => (
          <div key={report.id} style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 32 }}>{report.icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{report.label}</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>{report.desc}</div>
                </div>
              </div>
              <CreditBadge cost={report.credits} type={report.credits === 0 ? 'light' : report.credits <= 8 ? 'medium' : 'heavy'} />
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
              📅 {report.frequency}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ flex: 1, padding: '12px 16px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Eye size={14} /> View
              </button>
              <button style={{ padding: '12px 16px', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#9CA3AF', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // MACRO ANALYSIS MODAL
  // ============================================
  const renderMacroAnalysisModal = () => {
    if (!showMacroAnalysis) return null;
    
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
        <div style={{ background: '#0D1117', border: '1px solid rgba(199,169,61,0.3)', borderRadius: 24, maxWidth: 800, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ padding: 24, borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Sparkles size={24} style={{ color: '#C7A93D' }} />
              <span style={{ fontSize: 20, fontWeight: 700 }}>{showMacroAnalysis.name} Analysis</span>
            </div>
            <button onClick={() => setShowMacroAnalysis(null)} style={{ width: 40, height: 40, borderRadius: 10, background: '#1A1A1A', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
          </div>

          <div style={{ padding: 24 }}>
            {/* Summary */}
            <div style={{ background: 'rgba(199,169,61,0.1)', border: '1px solid rgba(199,169,61,0.2)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#C7A93D' }}>📊 Key Takeaways</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#E5E7EB', lineHeight: 1.8 }}>
                <li>Actual result of {showMacroAnalysis.actual} came in {showMacroAnalysis.actual! > showMacroAnalysis.forecast! ? 'above' : 'below'} forecast of {showMacroAnalysis.forecast}</li>
                <li>This suggests {showMacroAnalysis.category === 'inflation' ? 'inflationary pressures are ' + (showMacroAnalysis.actual! > showMacroAnalysis.previous! ? 'increasing' : 'easing') : 'economic activity is ' + (showMacroAnalysis.actual! > showMacroAnalysis.previous! ? 'strengthening' : 'weakening')}</li>
                <li>Market reacted {showMacroAnalysis.marketReaction} as traders adjusted rate cut expectations</li>
                <li>Next release on {showMacroAnalysis.nextRelease} will be crucial for confirming the trend</li>
              </ul>
            </div>

            {/* Market Impact */}
            <div style={{ background: '#0A0A0A', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>📈 Market Impact</h4>
              <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7 }}>
                Following the release, equity futures moved {showMacroAnalysis.marketReaction === 'bullish' ? 'higher' : 'lower'} as the data {showMacroAnalysis.marketReaction === 'bullish' ? 'supported' : 'challenged'} the current market narrative. 
                Treasury yields {showMacroAnalysis.category === 'inflation' ? 'rose on sticky inflation concerns' : 'stabilized as employment data came in line'}. 
                The dollar {showMacroAnalysis.marketReaction === 'bullish' ? 'weakened slightly' : 'strengthened'} against major currencies.
              </p>
            </div>

            {/* Sector Impact */}
            <div style={{ background: '#0A0A0A', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>🏭 Sector Implications</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { sector: 'Technology', impact: showMacroAnalysis.marketReaction === 'bullish' ? 'positive' : 'negative', reason: 'Rate sensitivity' },
                  { sector: 'Financials', impact: showMacroAnalysis.category === 'fed' ? 'positive' : 'neutral', reason: 'NII expectations' },
                  { sector: 'Real Estate', impact: showMacroAnalysis.marketReaction === 'bullish' ? 'positive' : 'negative', reason: 'Rate impact' },
                ].map(s => (
                  <div key={s.sector} style={{ padding: 12, background: '#1A1A1A', borderRadius: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{s.sector}</div>
                    <div style={{ fontSize: 12, color: s.impact === 'positive' ? '#22C55E' : s.impact === 'negative' ? '#EF4444' : '#F59E0B' }}>
                      {s.impact.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{s.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Download */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                View Full Report
              </button>
              <button style={{ padding: '14px 24px', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={16} /> PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // EARNINGS ANALYSIS MODAL
  // ============================================
  const renderEarningsAnalysisModal = () => {
    if (!showEarningsAnalysis) return null;
    
    const beat = (showEarningsAnalysis.epsSurprisePercent || 0) >= 0;
    
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
        <div style={{ background: '#0D1117', border: '1px solid rgba(199,169,61,0.3)', borderRadius: 24, maxWidth: 900, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ padding: 24, borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#C7A93D' }}>{showEarningsAnalysis.symbol}</span>
              <span style={{ fontSize: 16, color: '#6B7280' }}>Earnings Analysis</span>
            </div>
            <button onClick={() => setShowEarningsAnalysis(null)} style={{ width: 40, height: 40, borderRadius: 10, background: '#1A1A1A', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
          </div>

          <div style={{ padding: 24 }}>
            {/* Summary */}
            <div style={{ background: beat ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${beat ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: beat ? '#22C55E' : '#EF4444' }}>
                {beat ? '✅ Beat Expectations' : '❌ Missed Expectations'}
              </h4>
              <p style={{ fontSize: 14, color: '#E5E7EB', lineHeight: 1.7, margin: 0 }}>
                {showEarningsAnalysis.companyName} reported EPS of ${showEarningsAnalysis.epsActual?.toFixed(2)}, {beat ? 'beating' : 'missing'} estimates by {Math.abs(showEarningsAnalysis.epsSurprisePercent || 0).toFixed(1)}%. 
                Revenue came in at ${showEarningsAnalysis.revenueActual}B, {(showEarningsAnalysis.revenueSurprisePercent || 0) >= 0 ? 'above' : 'below'} the ${showEarningsAnalysis.revenueEstimate}B consensus. 
                The stock {showEarningsAnalysis.priceReaction! >= 0 ? 'jumped' : 'dropped'} {Math.abs(showEarningsAnalysis.priceReaction!).toFixed(1)}% following the release.
              </p>
            </div>

            {/* Key Highlights */}
            <div style={{ background: '#0A0A0A', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>💡 Opportunities from Report</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#E5E7EB', lineHeight: 1.8 }}>
                <li>Management {showEarningsAnalysis.guidance === 'raised' ? 'raised guidance, signaling confidence in demand trends' : showEarningsAnalysis.guidance === 'lowered' ? 'lowered guidance, citing macro headwinds' : 'maintained guidance, suggesting stability'}</li>
                <li>Gross margins {beat ? 'expanded' : 'contracted'} year-over-year, {beat ? 'showing pricing power' : 'indicating cost pressures'}</li>
                <li>Key growth drivers: {showEarningsAnalysis.sector === 'Technology' ? 'AI-related demand, cloud growth' : showEarningsAnalysis.sector === 'Financials' ? 'Net interest income, trading revenue' : 'Market share gains, operational efficiency'}</li>
                <li>Watch for: {beat ? 'Continuation of positive trends next quarter' : 'Signs of stabilization in upcoming quarters'}</li>
              </ul>
            </div>

            {/* Financial Trends */}
            <div style={{ background: '#0A0A0A', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📈 Financial Trends</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: 'Revenue Growth', value: beat ? '+8%' : '-2%', trend: beat ? 'up' : 'down' },
                  { label: 'Margin Trend', value: beat ? 'Expanding' : 'Contracting', trend: beat ? 'up' : 'down' },
                  { label: 'Cash Flow', value: beat ? 'Strong' : 'Weak', trend: beat ? 'up' : 'down' },
                  { label: 'Guidance', value: showEarningsAnalysis.guidance || 'None', trend: showEarningsAnalysis.guidance === 'raised' ? 'up' : showEarningsAnalysis.guidance === 'lowered' ? 'down' : 'flat' },
                ].map(item => (
                  <div key={item.label} style={{ padding: 14, background: '#1A1A1A', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: item.trend === 'up' ? '#22C55E' : item.trend === 'down' ? '#EF4444' : '#F59E0B' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors */}
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#EF4444' }}>⚠️ Warning Signs</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#E5E7EB', lineHeight: 1.8 }}>
                {!beat && <li>Consecutive misses could indicate structural issues</li>}
                <li>Inventory levels {beat ? 'normalizing' : 'elevated - watch for write-downs'}</li>
                <li>Competitive pressures in {showEarningsAnalysis.sector}</li>
                <li>Macro sensitivity to {showEarningsAnalysis.sector === 'Technology' ? 'IT spending cycles' : 'consumer demand'}</li>
              </ul>
            </div>

            {/* Download */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                View Full Report
              </button>
              <button style={{ padding: '14px 24px', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={16} /> PDF
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
        <div style={{ position: 'absolute', top: '10%', left: '50%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(139,92,246,0.3)' }}>
              <Globe size={28} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Macro & Earnings</h1>
              <div style={{ color: '#6B7280', fontSize: 14 }}>
                Economic data & company research
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#6B7280' }}>
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, background: '#0D1117', padding: 6, borderRadius: 12, width: 'fit-content' }}>
          {[
            { id: 'macro', label: 'Macro Reports', icon: Activity },
            { id: 'earnings', label: 'Earnings', icon: Calendar },
            { id: 'research', label: 'Company Research', icon: Search },
            { id: 'reports', label: 'AI Reports', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 20px',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #C7A93D, #A68B2D)' : 'transparent',
                border: 'none', borderRadius: 8,
                color: activeTab === tab.id ? '#000' : '#9CA3AF',
                cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 500
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'macro' && renderMacroTab()}
        {activeTab === 'earnings' && renderEarningsTab()}
        {activeTab === 'research' && renderResearchTab()}
        {activeTab === 'reports' && renderReportsTab()}
      </div>

      {/* Modals */}
      {renderMacroAnalysisModal()}
      {renderEarningsAnalysisModal()}

      <style>{`
        input:focus { outline: none; border-color: #C7A93D !important; }
      `}</style>
    </div>
  );
}