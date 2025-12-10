import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  BarChart3,
  Flame,
  Shield,
  Globe,
  Zap,
  RefreshCw,
  AlertCircle,
  Database
} from 'lucide-react';

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

// Types
interface MarketAsset {
  symbol: string;
  name: string;
  price: number | null;
  dailyChange: number | null;
  dailyChangePercent: number | null;
  weeklyChange: number | null;
  weeklyChangePercent: number | null;
  volume: string;
  riskSentiment: 'Risk-On' | 'Risk-Off' | 'Neutral';
  category: 'index' | 'volatility' | 'bond' | 'currency' | 'commodity' | 'crypto';
  error?: boolean;
  cached?: boolean;
}

interface ApiResponse {
  timestamp: string;
  source: 'live' | 'cache';
  cachedAt?: string;
  marketStatus?: 'open' | 'closed';
  assets: MarketAsset[];
}

// Icon mapping
const getIcon = (symbol: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    SPX: <BarChart3 className="w-5 h-5" />,
    NDX: <Zap className="w-5 h-5" />,
    DJI: <Activity className="w-5 h-5" />,
    RUT: <Globe className="w-5 h-5" />,
    VIX: <Flame className="w-5 h-5" />,
    TNX: <Shield className="w-5 h-5" />,
    DXY: <DollarSign className="w-5 h-5" />,
    CL: <Flame className="w-5 h-5" />,
    GC: <div className="w-5 h-5 flex items-center justify-center font-bold text-sm">Au</div>,
    BTC: <div className="w-5 h-5 flex items-center justify-center font-bold text-sm">₿</div>,
  };
  return icons[symbol] || <BarChart3 className="w-5 h-5" />;
};

// Helper functions
const formatPrice = (price: number | null, symbol: string): string => {
  if (price === null) return '—';
  if (symbol === 'TNX') return price.toFixed(2) + '%';
  if (symbol === 'BTC') return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price > 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return '$' + price.toFixed(2);
};

const getRiskColor = (sentiment: string): string => {
  switch (sentiment) {
    case 'Risk-On': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'Risk-Off': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
  }
};

const getCategoryGradient = (category: string): string => {
  switch (category) {
    case 'index': return 'from-blue-500/20 to-blue-600/5';
    case 'volatility': return 'from-purple-500/20 to-purple-600/5';
    case 'bond': return 'from-cyan-500/20 to-cyan-600/5';
    case 'currency': return 'from-green-500/20 to-green-600/5';
    case 'commodity': return 'from-amber-500/20 to-amber-600/5';
    case 'crypto': return 'from-orange-500/20 to-orange-600/5';
    default: return 'from-slate-500/20 to-slate-600/5';
  }
};

const formatCacheTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m ago`;
  }
};

// Components
const ChangeIndicator = ({ value, percent, size = 'normal' }: { value: number | null; percent: number | null; size?: 'normal' | 'small' }) => {
  if (value === null || percent === null) {
    return <span className="text-slate-500 text-xs">—</span>;
  }
  
  const isPositive = value >= 0;
  const textSize = size === 'small' ? 'text-xs' : 'text-sm';
  
  return (
    <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span className={textSize}>
        {isPositive ? '+' : ''}{percent.toFixed(2)}%
      </span>
    </div>
  );
};

const MarketCard = ({ asset, index }: { asset: MarketAsset; index: number }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasError = asset.error || asset.price === null;
  
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border border-white/10 
        bg-gradient-to-br ${getCategoryGradient(asset.category)}
        backdrop-blur-sm transition-all duration-300 ease-out
        hover:border-[#D4AF37]/50 hover:shadow-lg hover:shadow-[#D4AF37]/10
        hover:scale-[1.02] cursor-pointer group
        ${hasError ? 'opacity-60' : ''}
      `}
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cached indicator */}
      {asset.cached && (
        <div className="absolute top-2 right-2 z-10">
          <div className="p-1 rounded bg-amber-500/20 border border-amber-500/30" title="Cached data">
            <Database className="w-3 h-3 text-amber-400" />
          </div>
        </div>
      )}
      
      {/* Glow effect */}
      <div className={`
        absolute inset-0 bg-gradient-to-r from-[#D4AF37]/0 via-[#D4AF37]/5 to-[#D4AF37]/0
        transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}
      `} />
      
      {/* Content */}
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`
              p-2 rounded-lg bg-white/5 border border-white/10
              group-hover:border-[#D4AF37]/30 group-hover:bg-[#D4AF37]/10
              transition-all duration-300
            `}>
              <span className="text-[#D4AF37]">{getIcon(asset.symbol)}</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{asset.symbol}</h3>
              <p className="text-xs text-slate-400">{asset.name}</p>
            </div>
          </div>
          {!asset.cached && (
            <span className={`
              px-2 py-0.5 rounded-full text-[10px] font-medium border
              ${getRiskColor(asset.riskSentiment)}
            `}>
              {asset.riskSentiment}
            </span>
          )}
        </div>
        
        {/* Price */}
        <div className="mb-3">
          {hasError ? (
            <div className="flex items-center gap-2 text-slate-500">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">No data</span>
            </div>
          ) : (
            <p className="text-2xl font-bold text-white tracking-tight">
              {formatPrice(asset.price, asset.symbol)}
            </p>
          )}
        </div>
        
        {/* Changes */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-black/20 rounded-lg p-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Daily</p>
            <ChangeIndicator value={asset.dailyChange} percent={asset.dailyChangePercent} size="small" />
          </div>
          <div className="bg-black/20 rounded-lg p-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Weekly</p>
            <ChangeIndicator value={asset.weeklyChange} percent={asset.weeklyChangePercent} size="small" />
          </div>
        </div>
        
        {/* Volume */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Volume</span>
          <span className="text-slate-300 font-medium">{asset.volume || '—'}</span>
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className={`
        absolute bottom-0 left-0 right-0 h-0.5 
        bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent
        transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}
      `} />
    </div>
  );
};

const MarketSentimentBar = ({ assets }: { assets: MarketAsset[] }) => {
  const validAssets = assets.filter(a => !a.error && a.price !== null);
  const riskOnCount = validAssets.filter(a => a.riskSentiment === 'Risk-On').length;
  const riskOffCount = validAssets.filter(a => a.riskSentiment === 'Risk-Off').length;
  const neutralCount = validAssets.filter(a => a.riskSentiment === 'Neutral').length;
  const total = validAssets.length || 1;
  
  const riskOnPercent = (riskOnCount / total) * 100;
  const neutralPercent = (neutralCount / total) * 100;
  
  const overallSentiment = riskOnCount > riskOffCount ? 'Risk-On' : riskOnCount < riskOffCount ? 'Risk-Off' : 'Neutral';
  
  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-2xl border border-white/10 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Market Sentiment</h2>
          <p className="text-sm text-slate-400">Overall market risk assessment</p>
        </div>
        <div className={`
          px-4 py-2 rounded-xl text-sm font-bold border-2
          ${overallSentiment === 'Risk-On' 
            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/50' 
            : overallSentiment === 'Risk-Off'
            ? 'text-amber-400 bg-amber-400/10 border-amber-400/50'
            : 'text-slate-400 bg-slate-400/10 border-slate-400/50'
          }
        `}>
          {overallSentiment === 'Risk-On' && <span className="mr-2">🚀</span>}
          {overallSentiment === 'Risk-Off' && <span className="mr-2">🛡️</span>}
          {overallSentiment}
        </div>
      </div>
      
      <div className="h-3 rounded-full bg-black/30 overflow-hidden flex mb-3">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${riskOnPercent}%` }}
        />
        <div 
          className="h-full bg-gradient-to-r from-slate-500 to-slate-400 transition-all duration-500"
          style={{ width: `${neutralPercent}%` }}
        />
        <div 
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
          style={{ width: `${100 - riskOnPercent - neutralPercent}%` }}
        />
      </div>
      
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Risk-On ({riskOnCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-400" />
          <span className="text-slate-400">Neutral ({neutralCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-slate-400">Risk-Off ({riskOffCount})</span>
        </div>
      </div>
    </div>
  );
};

const MarketStatusBanner = ({ source, cachedAt }: { source: 'live' | 'cache'; cachedAt?: string }) => {
  if (source === 'live') return null;
  
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <Database className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-amber-400 font-semibold text-sm">Market Closed</h3>
          <p className="text-slate-400 text-xs">
            Showing last market close data
            {cachedAt && ` • Updated ${formatCacheTime(cachedAt)}`}
          </p>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function MacroOverview() {
  const [marketData, setMarketData] = useState<MarketAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'cache'>('live');
  const [cachedAt, setCachedAt] = useState<string | undefined>(undefined);
  const [marketStatus, setMarketStatus] = useState<string | undefined>(undefined);

  const fetchMarketData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/macro/snapshot`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      const assets: MarketAsset[] = data.assets.map(asset => ({
        ...asset,
        volume: asset.volume || '—',
      }));
      
      setMarketData(assets);
      setLastUpdate(new Date(data.timestamp));
      setDataSource(data.source || 'live');
      setCachedAt(data.cachedAt);
      setMarketStatus(data.marketStatus);
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      {/* Header Row - Title + Status */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">
          Market <span className="text-[#D4AF37]">Overview</span>
        </h1>
        
        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mr-4">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 border border-white/10">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isLoading ? 'bg-yellow-400' : 
                dataSource === 'cache' ? 'bg-amber-400' : 
                'bg-emerald-400'
              } animate-pulse`} />
              <span className="text-sm text-slate-300">
                {isLoading ? 'Loading...' : 
                 dataSource === 'cache' ? 'Cached' : 
                 'Live'}
              </span>
            </div>
            
            <div className="w-px h-4 bg-white/10" />
            
            <span className="text-sm text-slate-400">
              {dataSource === 'cache' && cachedAt 
                ? `Last close ${formatCacheTime(cachedAt)}`
                : `Updated ${lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}`
              }
            </span>
            
            <button
              onClick={fetchMarketData}
              className={`
                p-1.5 rounded-lg bg-white/5 border border-white/10 
                hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10
                transition-all duration-200 ml-1
              `}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Market Status Banner (when cache) */}
      <MarketStatusBanner source={dataSource} cachedAt={cachedAt} />
      
      {/* Market Sentiment Bar */}
      {marketData.length > 0 && <MarketSentimentBar assets={marketData} />}
      
      {/* Loading skeleton */}
      {isLoading && marketData.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      )}
      
      {/* Market Cards Grid */}
      {marketData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {marketData.map((asset, index) => (
            <MarketCard key={asset.symbol} asset={asset} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}