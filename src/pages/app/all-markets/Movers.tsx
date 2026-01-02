import { api } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ChevronRight, RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ TYPES ============
interface Mover {
  symbol: string;
  name?: string;
  price: number | null;
  chp: number | null;
  change?: number | null;
  volume?: number | null;
  high?: number | null;
  low?: number | null;
}

interface MarketStatus {
  status: 'open' | 'pre-market' | 'after-hours' | 'closed';
  message: string;
  isOpen?: boolean;
}

interface AssetMovers {
  gainers: Mover[];
  losers: Mover[];
  source?: string;
  marketStatus?: MarketStatus;
  ts?: number;
  error?: string;
}

interface AllMoversData {
  stocks?: AssetMovers;
  crypto?: AssetMovers;
  commodities?: AssetMovers;
  forex?: AssetMovers;
  timestamp?: string;
}

// ============ CONFIG ============
const ASSET_CONFIG = {
  stocks: { 
    limit: 8, 
    title: 'Stocks',
    route: '/markets/stocks',
  },
  crypto: { 
    limit: 4, 
    title: 'Crypto',
    route: '/markets/crypto',
  },
  commodities: { 
    limit: 4, 
    title: 'Commodities',
    route: '/markets/commodities',
  },
  forex: { 
    limit: 3, 
    title: 'Forex',
    route: '/markets/forex',
  },
} as const;

type AssetType = keyof typeof ASSET_CONFIG;
const ASSET_ORDER: AssetType[] = ['stocks', 'crypto', 'commodities', 'forex'];

// Forex country codes for flag images
const FOREX_DATA: Record<string, { code: string; name: string }> = {
  'EURUSD': { code: 'eu', name: 'EUR/USD' },
  'USDJPY': { code: 'jp', name: 'USD/JPY' },
  'GBPUSD': { code: 'gb', name: 'GBP/USD' },
  'USDCHF': { code: 'ch', name: 'USD/CHF' },
  'AUDUSD': { code: 'au', name: 'AUD/USD' },
  'USDCAD': { code: 'ca', name: 'USD/CAD' },
  'NZDUSD': { code: 'nz', name: 'NZD/USD' },
  'EURGBP': { code: 'eu', name: 'EUR/GBP' },
  'EURJPY': { code: 'eu', name: 'EUR/JPY' },
  'GBPJPY': { code: 'gb', name: 'GBP/JPY' },
};

// Crypto colors
const CRYPTO_COLORS: Record<string, string> = {
  'BTC': '#F7931A', 'ETH': '#627EEA', 'BNB': '#F3BA2F', 'SOL': '#9945FF',
  'XRP': '#23292F', 'ADA': '#0033AD', 'DOGE': '#C2A633', 'AVAX': '#E84142',
  'DOT': '#E6007A', 'LINK': '#2A5ADA', 'MATIC': '#8247E5', 'UNI': '#FF007A',
  'LTC': '#BFBBBB', 'ATOM': '#2E3148', 'NEAR': '#00C08B', 'APT': '#4CC9F0',
  'ARB': '#28A0F0', 'OP': '#FF0420', 'ICP': '#29ABE2', 'FIL': '#0090FF',
  'INJ': '#00F2FE', 'SAND': '#00ADEF', 'MANA': '#FF2D55', 'COMP': '#00D395',
  'FLR': '#E62058',
};

// Commodity colors
const COMMODITY_COLORS: Record<string, string> = {
  'GLD': '#FFD700', 'SLV': '#C0C0C0', 'USO': '#1a1a1a', 'UNG': '#FF6B35',
  'CPER': '#B87333', 'WEAT': '#DEB887', 'CORN': '#FBEC5D', 'SOYB': '#228B22',
  'DBA': '#8B4513', 'PALL': '#CED0DD', 'PPLT': '#E5E4E2', 'URA': '#7FFF00',
  'WOOD': '#8B4513', 'JO': '#6F4E37',
};

// ============ COMPONENT ============
export default function Movers() {
  const [data, setData] = useState<AllMoversData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(api('/api/top-movers?type=all&limit=10'));
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      const json: AllMoversData = await response.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ============ HELPERS ============
  const getCombinedMovers = (assetData: AssetMovers | undefined, limit: number): Mover[] => {
    if (!assetData) return [];
    
    const combined = [
      ...(assetData.gainers || []),
      ...(assetData.losers || []),
    ];
    
    return combined
      .filter(m => m.chp !== null && m.chp !== undefined)
      .sort((a, b) => Math.abs(b.chp || 0) - Math.abs(a.chp || 0))
      .slice(0, limit);
  };

  const renderIcon = (symbol: string, assetType: AssetType) => {
    if (assetType === 'forex') {
      const forexInfo = FOREX_DATA[symbol];
      if (forexInfo) {
        return (
          <img 
            src={`https://flagcdn.com/w40/${forexInfo.code}.png`}
            alt={forexInfo.code}
            className="w-6 h-6 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        );
      }
    }
    
    if (assetType === 'crypto') {
      const color = CRYPTO_COLORS[symbol] || '#848E9C';
      return (
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {symbol.charAt(0)}
        </div>
      );
    }
    
    if (assetType === 'commodities') {
      const color = COMMODITY_COLORS[symbol] || '#848E9C';
      const textColor = ['#FFD700', '#FBEC5D', '#CED0DD', '#E5E4E2', '#C0C0C0'].includes(color) ? '#1E2329' : '#fff';
      return (
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
          style={{ backgroundColor: color, color: textColor }}
        >
          {symbol.charAt(0)}
        </div>
      );
    }
    
    return (
      <div className="w-6 h-6 rounded-full bg-[#2B3139] flex items-center justify-center">
        <img 
          src="https://flagcdn.com/w40/us.png"
          alt="US"
          className="w-4 h-4 rounded-full object-cover"
        />
      </div>
    );
  };

  const getDisplayName = (mover: Mover, assetType: AssetType): { primary: string; secondary?: string } => {
    if (assetType === 'forex') {
      const forexInfo = FOREX_DATA[mover.symbol];
      return { primary: mover.symbol, secondary: forexInfo?.name || mover.name };
    }
    
    return { 
      primary: mover.symbol, 
      secondary: mover.name && mover.name !== mover.symbol ? mover.name : undefined 
    };
  };

  const formatPrice = (price: number | null, assetType?: AssetType): string => {
    if (price === null || price === undefined) return '-';
    
    if (assetType === 'forex') return price.toFixed(4);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatChange = (change: number | null | undefined): string => {
    if (change === null || change === undefined) return '-';
    const isPositive = change >= 0;
    return `${isPositive ? '+' : ''}${change.toFixed(2)}`;
  };

  const formatChangePercent = (chp: number | null): string => {
    if (chp === null || chp === undefined) return '-';
    const isPositive = chp >= 0;
    return `${isPositive ? '+' : ''}${chp.toFixed(2)}%`;
  };

  const formatVolume = (volume: number | null | undefined): string => {
    if (!volume) return '-';
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(0)}K`;
    return volume.toFixed(0);
  };

  const formatUpdateTime = (ts?: number): string => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'open': return 'text-[#0ECB81]';
      case 'pre-market': return 'text-[#FCD535]';
      case 'after-hours': return 'text-[#F0B90B]';
      case 'closed': return 'text-[#F6465D]';
      default: return 'text-[#848E9C]';
    }
  };

  // ============ RENDER SECTION ============
  const renderAssetSection = (assetType: AssetType) => {
    const config = ASSET_CONFIG[assetType];
    const assetData = data?.[assetType];
    const movers = getCombinedMovers(assetData, config.limit);
    const showVolume = assetType === 'stocks' || assetType === 'crypto';
    const marketStatus = assetData?.marketStatus;
    const updateTime = formatUpdateTime(assetData?.ts);

    return (
      <section key={assetType} className="mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-medium text-[#EAECEF]">{config.title}</h2>
            {marketStatus && (
              <span className={cn("text-xs", getStatusColor(marketStatus.status))}>
                {marketStatus.message}
              </span>
            )}
          </div>
          <Link to={config.route}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#F0B90B] hover:text-[#F0B90B]/80 hover:bg-transparent text-xs font-normal h-auto p-0"
            >
              See More
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </Link>
        </div>

        {/* Table */}
        <div className="bg-[#181A20] rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-[#848E9C]" />
            </div>
          ) : error ? (
            <div className="text-[#F6465D] text-sm py-8 text-center">{error}</div>
          ) : movers.length === 0 ? (
            <div className="text-[#848E9C] text-sm py-8 text-center">
              {marketStatus?.status === 'closed' 
                ? `Market closed - ${marketStatus.message}` 
                : 'No data available'}
            </div>
          ) : (
            <>
              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-2 px-6 py-3 text-xs text-[#848E9C] border-b border-[#2B3139]">
                <div className="col-span-3">Coin</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-2 text-right">High</div>
                <div className="col-span-2 text-right">Low</div>
                <div className="col-span-1 text-right">Chg.</div>
                <div className="col-span-2 text-right">{showVolume ? 'Vol.' : 'Chg. %'}</div>
              </div>

              {/* Rows */}
              {movers.map((mover, index) => {
                const isPositive = (mover.chp || 0) >= 0;
                const textColor = isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]';
                const displayName = getDisplayName(mover, assetType);
                
                return (
                  <div 
                    key={`${mover.symbol}-${index}`}
                    className="grid grid-cols-12 gap-2 px-6 py-4 items-center hover:bg-[#1E2329] transition-colors cursor-pointer border-b border-[#2B3139] last:border-0"
                  >
                    {/* Coin/Asset */}
                    <div className="col-span-3 flex items-center gap-3">
                      {renderIcon(mover.symbol, assetType)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#EAECEF] truncate">{displayName.primary}</p>
                        {displayName.secondary && (
                          <p className="text-xs text-[#848E9C] truncate">{displayName.secondary}</p>
                        )}
                      </div>
                    </div>

                    {/* Price/Amount */}
                    <div className="col-span-2 text-right">
                      <p className="text-sm text-[#EAECEF] tabular-nums">
                        {formatPrice(mover.price, assetType)}
                      </p>
                      {mover.price && (
                        <p className="text-xs text-[#848E9C]">
                          ${(mover.price * 1).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* High */}
                    <div className="col-span-2 text-right">
                      <span className="text-sm text-[#EAECEF] tabular-nums">
                        {mover.high ? formatPrice(mover.high, assetType) : '-'}
                      </span>
                    </div>

                    {/* Low */}
                    <div className="col-span-2 text-right">
                      <span className="text-sm text-[#EAECEF] tabular-nums">
                        {mover.low ? formatPrice(mover.low, assetType) : '-'}
                      </span>
                    </div>

                    {/* Change */}
                    <div className="col-span-1 text-right">
                      <span className={cn("text-sm tabular-nums", textColor)}>
                        {formatChangePercent(mover.chp)}
                      </span>
                    </div>

                    {/* Volume or Action */}
                    <div className="col-span-2 text-right">
                      {showVolume ? (
                        <span className="text-sm text-[#848E9C] tabular-nums">
                          {formatVolume(mover.volume)}
                        </span>
                      ) : (
                        <span className={cn("text-sm tabular-nums", textColor)}>
                          {formatChange(mover.change)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Footer */}
              {updateTime && (
                <div className="px-6 py-2 flex justify-end border-t border-[#2B3139]">
                  <span className="text-[10px] text-[#5E6673]">
                    Updated: {updateTime}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  };

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen bg-[#0B0E11]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#2B3139]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#EAECEF]">Top Movers</h1>
          <button 
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-[#2B3139] transition-colors"
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 text-[#848E9C]", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="py-4">
        {ASSET_ORDER.map(assetType => renderAssetSection(assetType))}
      </div>
    </div>
  );
}