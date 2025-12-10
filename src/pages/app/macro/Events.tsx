import React, { useState, useEffect } from 'react';

// Types
interface EventData {
  id: string;
  icon: React.ReactNode;
  name: string;
  shortName: string;
  description: string;
  impact: 'EXTREME' | 'HIGH' | 'MEDIUM' | 'LOW';
  impactDescription: string;
  nextDate: Date;
  time: string;
  previous: string;
  forecast: string;
  actual?: string;
  additionalInfo?: Record<string, string>;
  marketEffect: {
    bullish: string;
    bearish: string;
  };
  affectedAssets: string[];
}

// Icons as SVG components
const Icons = {
  chart: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  bolt: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  bank: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  ),
  document: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
  trendUp: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  trendDown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  )
};

// Event Data
const macroEvents: EventData[] = [
  {
    id: 'cpi',
    icon: Icons.chart,
    name: 'CPI – Consumer Price Index',
    shortName: 'CPI',
    description: 'The most important price index affecting interest rate expectations.',
    impact: 'HIGH',
    impactDescription: 'CPI Core is significantly more important – less affected by fuel/food volatility.',
    nextDate: new Date('2025-12-10T08:30:00-05:00'),
    time: '8:30 AM ET',
    previous: '3.2%',
    forecast: '3.1%',
    additionalInfo: {
      'YoY': '3.2%',
      'MoM': '0.2%',
      'Core CPI': '4.0%'
    },
    marketEffect: {
      bullish: 'Lower than expected → Rate cut hopes → Stocks rally',
      bearish: 'Higher than expected → Rate hike fears → Stocks drop'
    },
    affectedAssets: ['S&P 500', 'NASDAQ', 'USD', 'Gold', 'Bonds']
  },
  {
    id: 'nfp',
    icon: Icons.bolt,
    name: 'NFP – Non-Farm Payrolls',
    shortName: 'NFP',
    description: 'The most important employment indicator in the United States.',
    impact: 'HIGH',
    impactDescription: 'Measures job growth in the economy excluding farm workers.',
    nextDate: new Date('2026-01-03T08:30:00-05:00'),
    time: '8:30 AM ET',
    previous: '160K',
    forecast: '175K',
    additionalInfo: {
      'Unemployment Rate': '4.1%',
      'Avg Hourly Earnings': '0.3%'
    },
    marketEffect: {
      bullish: 'Strong jobs → Economy healthy → Stocks rise (short term)',
      bearish: 'Weak jobs → Recession fears → Flight to safety'
    },
    affectedAssets: ['S&P 500', 'USD', 'Gold', 'Treasury Yields']
  },
  {
    id: 'fomc',
    icon: Icons.bank,
    name: 'FOMC – Fed Interest Rate Decision',
    shortName: 'Fed Rate',
    description: 'Federal Reserve interest rate decision – the most impactful event on global markets.',
    impact: 'EXTREME',
    impactDescription: 'Determines the cost of borrowing for the entire economy.',
    nextDate: new Date('2025-12-17T14:00:00-05:00'),
    time: '2:00 PM ET',
    previous: '5.00%',
    forecast: 'No Change',
    additionalInfo: {
      'Current Rate': '4.50% - 4.75%',
      'Press Conference': '2:30 PM ET',
      'Dot Plot': 'Updated Quarterly'
    },
    marketEffect: {
      bullish: 'Dovish stance / Rate cut → Liquidity boost → Risk-on rally',
      bearish: 'Hawkish stance / Rate hike → Tighter conditions → Risk-off'
    },
    affectedAssets: ['All Global Markets', 'USD', 'Gold', 'Crypto', 'Bonds']
  },
  {
    id: 'fomc-minutes',
    icon: Icons.document,
    name: 'FOMC Minutes',
    shortName: 'Minutes',
    description: 'Document revealing how Fed members thought and why they voted as they did.',
    impact: 'MEDIUM',
    impactDescription: 'Released 3 weeks after each FOMC meeting.',
    nextDate: new Date('2026-01-07T14:00:00-05:00'),
    time: '2:00 PM ET',
    previous: '—',
    forecast: '—',
    marketEffect: {
      bullish: 'Dovish tone in discussions → Future cuts expected',
      bearish: 'Hawkish concerns raised → Prolonged high rates'
    },
    affectedAssets: ['S&P 500', 'USD', 'Bonds']
  }
];

// Countdown Calculator
const calculateCountdown = (targetDate: Date): string => {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'LIVE NOW';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Format Date
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Impact Badge Component
const ImpactBadge: React.FC<{ impact: EventData['impact'] }> = ({ impact }) => {
  const styles: Record<EventData['impact'], { bg: string; text: string; glow: string }> = {
    EXTREME: { bg: 'bg-red-500/20', text: 'text-red-400', glow: 'shadow-red-500/30' },
    HIGH: { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/30' },
    MEDIUM: { bg: 'bg-blue-500/20', text: 'text-blue-400', glow: 'shadow-blue-500/30' },
    LOW: { bg: 'bg-gray-500/20', text: 'text-gray-400', glow: 'shadow-gray-500/30' }
  };
  
  const style = styles[impact];
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${style.bg} ${style.text} shadow-lg ${style.glow}`}>
      {impact}
    </span>
  );
};

// Event Card Component
const EventCard: React.FC<{ event: EventData; isNext: boolean }> = ({ event, isNext }) => {
  const [countdown, setCountdown] = useState(calculateCountdown(event.nextDate));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(calculateCountdown(event.nextDate));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [event.nextDate]);
  
  return (
    <div 
      className={`relative group rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
        isNext 
          ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent shadow-lg shadow-amber-500/10' 
          : 'border-gray-700/50 bg-gray-900/50 hover:border-gray-600'
      }`}
    >
      {/* Next Event Badge */}
      {isNext && (
        <div className="absolute -top-3 left-4">
          <span className="px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full uppercase tracking-wider animate-pulse">
            Next Event
          </span>
        </div>
      )}
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isNext ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-400'}`}>
              {event.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{event.name}</h3>
              <p className="text-gray-400 text-sm">{event.description}</p>
            </div>
          </div>
          <ImpactBadge impact={event.impact} />
        </div>
        
        {/* Date & Countdown */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Next Release</span>
            <p className="text-white font-mono font-bold">{formatDate(event.nextDate)}</p>
            <p className="text-gray-400 text-sm">{event.time}</p>
          </div>
          <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Countdown</span>
            <p className={`font-mono font-bold text-xl ${isNext ? 'text-amber-400' : 'text-white'}`}>
              {countdown}
            </p>
          </div>
        </div>
        
        {/* Data Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-black/30 rounded-lg p-3 text-center border border-gray-800/50">
            <span className="text-gray-500 text-xs uppercase">Previous</span>
            <p className="text-white font-mono font-bold">{event.previous}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center border border-gray-800/50">
            <span className="text-gray-500 text-xs uppercase">Forecast</span>
            <p className="text-amber-400 font-mono font-bold">{event.forecast}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center border border-gray-800/50">
            <span className="text-gray-500 text-xs uppercase">Actual</span>
            <p className="text-gray-500 font-mono font-bold">{event.actual || '—'}</p>
          </div>
        </div>
        
        {/* Additional Info */}
        {event.additionalInfo && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(event.additionalInfo).map(([key, value]) => (
              <span key={key} className="px-2 py-1 bg-gray-800/50 rounded text-xs text-gray-400 border border-gray-700/50">
                <span className="text-gray-500">{key}:</span> <span className="text-white">{value}</span>
              </span>
            ))}
          </div>
        )}
        
        {/* Market Effect - Expandable */}
        <details className="group/details">
          <summary className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors text-sm">
            <span className="transform group-open/details:rotate-90 transition-transform">▶</span>
            Market Impact Analysis
          </summary>
          <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">{Icons.trendUp}</span>
              <p className="text-gray-400 text-sm">{event.marketEffect.bullish}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">{Icons.trendDown}</span>
              <p className="text-gray-400 text-sm">{event.marketEffect.bearish}</p>
            </div>
          </div>
        </details>
        
        {/* Affected Assets */}
        <div className="mt-4 pt-4 border-t border-gray-800">
          <span className="text-gray-500 text-xs uppercase tracking-wider">Typically Moves:</span>
          <div className="flex flex-wrap gap-1 mt-2">
            {event.affectedAssets.map(asset => (
              <span key={asset} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs border border-amber-500/20">
                {asset}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Summary Table Component
const SummaryTable: React.FC<{ events: EventData[] }> = ({ events }) => {
  const sortedEvents = [...events].sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  
  return (
    <div className="overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900/50">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-black/40 border-b border-gray-700">
              <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm uppercase tracking-wider">Event</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm uppercase tracking-wider">Date</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm uppercase tracking-wider">Time (ET)</th>
              <th className="text-center py-4 px-6 text-gray-400 font-medium text-sm uppercase tracking-wider">Forecast</th>
              <th className="text-center py-4 px-6 text-gray-400 font-medium text-sm uppercase tracking-wider">Previous</th>
              <th className="text-center py-4 px-6 text-gray-400 font-medium text-sm uppercase tracking-wider">Impact</th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map((event, index) => (
              <tr 
                key={event.id} 
                className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                  index === 0 ? 'bg-amber-500/5' : ''
                }`}
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${index === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-400'}`}>
                      {event.icon}
                    </div>
                    <div>
                      <p className="text-white font-medium">{event.shortName}</p>
                      {index === 0 && (
                        <span className="text-amber-400 text-xs">Next up</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-white font-mono">{formatDate(event.nextDate)}</td>
                <td className="py-4 px-6 text-gray-400 font-mono">{event.time}</td>
                <td className="py-4 px-6 text-center">
                  <span className="text-amber-400 font-mono font-bold">{event.forecast}</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="text-white font-mono">{event.previous}</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <ImpactBadge impact={event.impact} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main Page Component
export default function MajorEvents() {
  const sortedEvents = [...macroEvents].sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Background Grid Effect */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
      
      {/* Gradient Orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-amber-500 rounded-full" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Macro Drivers Dashboard
            </h1>
          </div>
          <p className="text-gray-400 text-lg ml-5">
            Track the events that move global markets. Know what's coming, when it hits, and how it typically impacts prices.
          </p>
          
          {/* Live Indicator */}
          <div className="mt-4 ml-5 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-sm font-medium">Live • Auto-updating</span>
          </div>
        </div>
        
        {/* Summary Table */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-gray-400">{Icons.calendar}</span>
            Upcoming Events Calendar
          </h2>
          <SummaryTable events={macroEvents} />
        </div>
        
        {/* Event Cards Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-gray-400">{Icons.target}</span>
            Event Deep Dive
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedEvents.map((event, index) => (
            <EventCard 
              key={event.id} 
              event={event} 
              isNext={index === 0}
            />
          ))}
        </div>
        
        {/* Legend / Info Box */}
        <div className="mt-12 p-6 rounded-xl border border-gray-700/50 bg-gray-900/30">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-gray-400">{Icons.info}</span>
            Understanding Impact Levels
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <ImpactBadge impact="EXTREME" />
              <span className="text-gray-400 text-sm">Market-moving event</span>
            </div>
            <div className="flex items-center gap-3">
              <ImpactBadge impact="HIGH" />
              <span className="text-gray-400 text-sm">Significant volatility</span>
            </div>
            <div className="flex items-center gap-3">
              <ImpactBadge impact="MEDIUM" />
              <span className="text-gray-400 text-sm">Moderate reaction</span>
            </div>
            <div className="flex items-center gap-3">
              <ImpactBadge impact="LOW" />
              <span className="text-gray-400 text-sm">Minimal impact</span>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <p className="text-gray-500 text-sm">
              <strong className="text-gray-400">Pro Tip:</strong> The Fed's interest rate decisions (FOMC) have the highest market impact. 
              CPI releases are the key driver for rate expectations. Always check the countdown and prepare your positions before major releases.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Data updates automatically • All times in Eastern Time (ET)</p>
        </div>
      </div>
    </div>
  );
}