// src/pages/app/all-markets/Heatmap.tsx
// Simple heatmap page - placeholder until full implementation

import { useState } from 'react';
import { Map, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type MarketKey = 'stocks' | 'crypto' | 'futures' | 'forex' | 'commodities' | 'indices';

const MARKETS: { key: MarketKey; label: string }[] = [
  { key: 'indices', label: 'Indices' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'futures', label: 'Futures' },
  { key: 'forex', label: 'Forex' },
  { key: 'commodities', label: 'Commodities' },
];

// Mock data for the heatmap
const MOCK_DATA: Record<MarketKey, { name: string; symbol: string; change: number }[]> = {
  indices: [
    { name: 'S&P 500', symbol: 'SPX', change: 0.85 },
    { name: 'Nasdaq', symbol: 'NDX', change: 1.2 },
    { name: 'Dow Jones', symbol: 'DJI', change: 0.45 },
    { name: 'Russell 2000', symbol: 'RUT', change: -0.3 },
    { name: 'VIX', symbol: 'VIX', change: -2.5 },
    { name: 'DAX', symbol: 'DAX', change: 0.6 },
    { name: 'FTSE 100', symbol: 'FTSE', change: 0.25 },
    { name: 'Nikkei 225', symbol: 'N225', change: 1.1 },
  ],
  stocks: [
    { name: 'Apple', symbol: 'AAPL', change: 2.3 },
    { name: 'Microsoft', symbol: 'MSFT', change: 1.5 },
    { name: 'Google', symbol: 'GOOGL', change: -0.8 },
    { name: 'Amazon', symbol: 'AMZN', change: 0.9 },
    { name: 'Tesla', symbol: 'TSLA', change: -2.1 },
    { name: 'NVIDIA', symbol: 'NVDA', change: 3.5 },
    { name: 'Meta', symbol: 'META', change: 1.2 },
    { name: 'Netflix', symbol: 'NFLX', change: -0.5 },
  ],
  crypto: [
    { name: 'Bitcoin', symbol: 'BTC', change: 2.8 },
    { name: 'Ethereum', symbol: 'ETH', change: 3.2 },
    { name: 'Solana', symbol: 'SOL', change: 5.1 },
    { name: 'XRP', symbol: 'XRP', change: -1.2 },
    { name: 'Cardano', symbol: 'ADA', change: 0.8 },
    { name: 'Dogecoin', symbol: 'DOGE', change: -3.5 },
    { name: 'Polygon', symbol: 'MATIC', change: 1.9 },
    { name: 'Chainlink', symbol: 'LINK', change: 2.1 },
  ],
  futures: [
    { name: 'ES (S&P)', symbol: 'ES', change: 0.75 },
    { name: 'NQ (Nasdaq)', symbol: 'NQ', change: 1.1 },
    { name: 'YM (Dow)', symbol: 'YM', change: 0.4 },
    { name: 'RTY (Russell)', symbol: 'RTY', change: -0.2 },
    { name: 'CL (Crude)', symbol: 'CL', change: -1.5 },
    { name: 'GC (Gold)', symbol: 'GC', change: 0.3 },
    { name: 'SI (Silver)', symbol: 'SI', change: 0.8 },
    { name: 'ZB (Bonds)', symbol: 'ZB', change: -0.1 },
  ],
  forex: [
    { name: 'EUR/USD', symbol: 'EURUSD', change: 0.15 },
    { name: 'GBP/USD', symbol: 'GBPUSD', change: -0.22 },
    { name: 'USD/JPY', symbol: 'USDJPY', change: 0.35 },
    { name: 'AUD/USD', symbol: 'AUDUSD', change: 0.18 },
    { name: 'USD/CAD', symbol: 'USDCAD', change: -0.12 },
    { name: 'USD/CHF', symbol: 'USDCHF', change: 0.08 },
    { name: 'NZD/USD', symbol: 'NZDUSD', change: 0.25 },
    { name: 'EUR/GBP', symbol: 'EURGBP', change: -0.05 },
  ],
  commodities: [
    { name: 'Gold', symbol: 'XAU', change: 0.45 },
    { name: 'Silver', symbol: 'XAG', change: 1.2 },
    { name: 'Crude Oil', symbol: 'WTI', change: -2.3 },
    { name: 'Natural Gas', symbol: 'NG', change: -1.8 },
    { name: 'Copper', symbol: 'HG', change: 0.9 },
    { name: 'Wheat', symbol: 'ZW', change: 0.3 },
    { name: 'Corn', symbol: 'ZC', change: -0.5 },
    { name: 'Soybeans', symbol: 'ZS', change: 0.7 },
  ],
};

const getChangeColor = (change: number): string => {
  if (change > 2) return 'bg-green-500';
  if (change > 1) return 'bg-green-400';
  if (change > 0) return 'bg-green-300/80';
  if (change > -1) return 'bg-red-300/80';
  if (change > -2) return 'bg-red-400';
  return 'bg-red-500';
};

const getTextColor = (change: number): string => {
  if (Math.abs(change) > 1) return 'text-white';
  return 'text-gray-900';
};

export default function HeatmapPage() {
  const [selectedMarket, setSelectedMarket] = useState<MarketKey>('indices');
  const data = MOCK_DATA[selectedMarket];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div 
          className="p-3 rounded-xl"
          style={{ 
            background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.1) 100%)',
            border: '1px solid rgba(201,166,70,0.3)'
          }}
        >
          <Map className="h-6 w-6 text-[#C9A646]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Market Heatmap</h1>
          <p className="text-sm text-gray-400">Visual overview of market performance</p>
        </div>
      </div>

      {/* Market Selector */}
      <div className="flex flex-wrap gap-2">
        {MARKETS.map((market) => (
          <button
            key={market.key}
            onClick={() => setSelectedMarket(market.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedMarket === market.key
                ? 'bg-[#C9A646] text-black'
                : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#252525] hover:text-white border border-gray-700'
            }`}
          >
            {market.label}
          </button>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.map((item) => (
          <div
            key={item.symbol}
            className={`${getChangeColor(item.change)} rounded-xl p-4 transition-transform hover:scale-105 cursor-pointer`}
          >
            <div className={`${getTextColor(item.change)} space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">{item.symbol}</span>
                {item.change > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : item.change < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </div>
              <p className="text-xs opacity-80 truncate">{item.name}</p>
              <p className="font-semibold">
                {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-xs text-gray-400">{"< -2%"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-300" />
          <span className="text-xs text-gray-400">-2% to 0%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-300" />
          <span className="text-xs text-gray-400">0% to 2%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-xs text-gray-400">{"> 2%"}</span>
        </div>
      </div>

      {/* Note */}
      <div 
        className="p-4 rounded-xl text-center"
        style={{ 
          background: 'rgba(201,166,70,0.05)',
          border: '1px solid rgba(201,166,70,0.2)'
        }}
      >
        <p className="text-sm text-gray-400">
          📊 This is a demo heatmap with sample data. Real-time market data coming soon!
        </p>
      </div>
    </div>
  );
}