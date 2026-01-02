import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Filter,
  ChevronDown,
  Star,
  Globe,
  TrendingUp,
  DollarSign,
  BarChart3,
  Timer,
  Mic,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  Building2,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type TabType = 'economic' | 'holidays' | 'earnings' | 'dividends' | 'splits' | 'ipo' | 'expiration';
type TimeFilter = 'yesterday' | 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek';
type Importance = 1 | 2 | 3;

interface EconomicEvent {
  id: string;
  time: string;
  date: string;
  currency: string;
  countryCode: string;
  countryFlag?: string;
  country?: string;
  importance: Importance;
  event: string;
  actual?: string | null;
  forecast?: string | null;
  previous?: string | null;
  isHoliday?: boolean;
  isSpeech?: boolean;
  isPreliminary?: boolean;
  isRevised?: boolean;
  isReleased?: boolean;
  source?: string;
}

interface HolidayEvent {
  id: string;
  date: string;
  country: string;
  countryCode: string;
  countryFlag?: string;
  holiday: string;
  marketsClosed?: string[];
}

interface EarningsEvent {
  id: string;
  symbol: string;
  company: string;
  date: string;
  time: string;
  when: 'BMO' | 'AMC' | 'DMH';
  epsEstimate?: number | null;
  epsActual?: number | null;
  revenueEstimate?: number | null;
  revenueActual?: number | null;
  surprise?: number | null;
  quarter: string;
}

interface DividendEvent {
  id: string;
  symbol: string;
  company?: string;
  exDate: string;
  date?: string;
  payDate?: string;
  amount: number;
  frequency: string;
}

interface SplitEvent {
  id: string;
  symbol: string;
  company?: string;
  date: string;
  ratio: string;
  type: 'Forward' | 'Reverse';
}

interface IPOEvent {
  id: string;
  symbol: string;
  company: string;
  date: string;
  exchange?: string;
  priceRange?: string;
  status?: string;
}

interface ExpirationEvent {
  id: string;
  type: string;
  category?: string;
  symbol?: string;
  contractCode?: string;
  name?: string;
  date: string;
  description: string;
  exchange?: string;
  isMonthly?: boolean;
  isQuarterly?: boolean;
}

interface CalendarData {
  economic?: { count: number; events: EconomicEvent[]; lastUpdated?: number; source?: string };
  holidays?: { count: number; events: HolidayEvent[]; source?: string };
  earnings?: { count: number; events: EarningsEvent[]; source?: string };
  dividends?: { count: number; events: DividendEvent[]; source?: string };
  splits?: { count: number; events: SplitEvent[]; source?: string };
  expirations?: { count: number; events: ExpirationEvent[]; source?: string };
  ipos?: { count: number; events: IPOEvent[]; source?: string };
}

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const CALENDAR_ENDPOINT = '/api/all-markets/calendar';
const POLLING_INTERVAL = 60000;
const TODAY_POLLING_INTERVAL = 30000;

// ============================================
// COUNTRY FLAGS - Unicode Emoji Flags
// ============================================

const COUNTRIES = [
  { code: 'ALL', name: 'All Countries', flag: '🌍' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'EU', name: 'Eurozone', flag: '🇪🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
];

// ============================================
// CUSTOM HOOK
// ============================================

function useCalendarData(
  tab: TabType,
  timeFilter: TimeFilter,
  country: string,
  importance: Importance[],
  search: string
) {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        tab,
        dateFilter: timeFilter,
        country,
        importance: importance.join(','),
        search,
      });

      const response = await fetch(`${API_BASE_URL}${CALENDAR_ENDPOINT}?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [tab, timeFilter, country, importance, search]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = timeFilter === 'today' ? TODAY_POLLING_INTERVAL : POLLING_INTERVAL;
    const timer = setInterval(fetchData, interval);
    return () => clearInterval(timer);
  }, [fetchData, timeFilter]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00'); // Ensure consistent parsing
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};

const getTimezone = (): string => {
  const offset = new Date().getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const sign = offset <= 0 ? '+' : '-';
  return `GMT${sign}${hours}`;
};

// Normalize date to YYYY-MM-DD format
const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  // Handle both "2026-01-02" and "2026-01-02 10:00:00" formats
  return dateStr.split(' ')[0].split('T')[0];
};

// Check if event is in the past
const isEventPast = (date: string, time: string): boolean => {
  const now = new Date();
  const eventDate = new Date(normalizeDate(date) + 'T00:00:00');
  
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    eventDate.setHours(hours || 0, minutes || 0, 0, 0);
  }
  
  return eventDate < now;
};

// Check if we should show NOW indicator after this event
const shouldShowNowAfter = (
  currentEvent: { date: string; time: string },
  nextEvent: { date: string; time: string } | null,
  isToday: boolean
): boolean => {
  if (!isToday) return false;
  
  const now = new Date();
  const currentEventTime = new Date(normalizeDate(currentEvent.date) + 'T00:00:00');
  const [currHours, currMinutes] = (currentEvent.time || '00:00').split(':').map(Number);
  currentEventTime.setHours(currHours || 0, currMinutes || 0, 0, 0);
  
  if (currentEventTime > now) return false;
  
  if (!nextEvent) return true;
  
  const nextEventTime = new Date(normalizeDate(nextEvent.date) + 'T00:00:00');
  const [nextHours, nextMinutes] = (nextEvent.time || '00:00').split(':').map(Number);
  nextEventTime.setHours(nextHours || 0, nextMinutes || 0, 0, 0);
  
  return now >= currentEventTime && now < nextEventTime;
};

// ============================================
// COMPONENTS
// ============================================

const ImportanceStars: React.FC<{ level: Importance }> = ({ level }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3].map((i) => (
      <Star
        key={i}
        size={12}
        className={i <= level ? 'fill-amber-500 text-amber-500' : 'text-neutral-700'}
      />
    ))}
  </div>
);

// 🔥 NOW INDICATOR LINE
const NowIndicator: React.FC = () => (
  <tr>
    <td colSpan={7} className="px-0 py-0">
      <div className="relative py-1">
        <div className="w-full h-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 shadow-lg shadow-amber-500/50" />
      </div>
    </td>
  </tr>
);

// Flag Component with emoji
const CountryFlag: React.FC<{ countryCode: string; size?: 'sm' | 'md' | 'lg' }> = ({ 
  countryCode, 
  size = 'md' 
}) => {
  const flags: Record<string, string> = {
    US: '🇺🇸', USA: '🇺🇸',
    GB: '🇬🇧', UK: '🇬🇧',
    EU: '🇪🇺', EA: '🇪🇺',
    DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸',
    JP: '🇯🇵', CN: '🇨🇳', AU: '🇦🇺', CA: '🇨🇦',
    CH: '🇨🇭', NZ: '🇳🇿', IL: '🇮🇱', KR: '🇰🇷',
    IN: '🇮🇳', HK: '🇭🇰', BR: '🇧🇷', MX: '🇲🇽',
    RU: '🇷🇺', ZA: '🇿🇦', SG: '🇸🇬', SE: '🇸🇪',
    NO: '🇳🇴', PL: '🇵🇱', TR: '🇹🇷', ALL: '🌍',
  };
  
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  };
  
  const flag = flags[countryCode?.toUpperCase()] || '🏳️';
  
  return (
    <span className={`${sizeClasses[size]} leading-none`}>
      {flag}
    </span>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}> = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg
      transition-all duration-300 whitespace-nowrap border
      ${active
        ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/50 shadow-lg shadow-amber-500/10'
        : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/50 border-transparent hover:border-neutral-700'
      }
    `}
  >
    {icon}
    <span>{label}</span>
    {count !== undefined && count > 0 && (
      <span className={`
        ml-1 px-2 py-0.5 text-xs rounded-full font-semibold
        ${active ? 'bg-amber-500/30 text-amber-300' : 'bg-neutral-800 text-neutral-500'}
      `}>
        {count}
      </span>
    )}
  </button>
);

const TimeFilterButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
      ${active
        ? 'bg-amber-500 text-black font-semibold'
        : 'text-neutral-400 hover:text-amber-400 hover:bg-neutral-800/50'
      }
    `}
  >
    {label}
  </button>
);

const TableSkeleton: React.FC = () => (
  <div className="animate-pulse">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex gap-4 px-4 py-4 border-b border-neutral-800/50">
        <div className="w-16 h-4 bg-neutral-800 rounded" />
        <div className="w-12 h-4 bg-neutral-800 rounded" />
        <div className="w-16 h-4 bg-neutral-800 rounded" />
        <div className="flex-1 h-4 bg-neutral-800 rounded" />
        <div className="w-20 h-4 bg-neutral-800 rounded" />
      </div>
    ))}
  </div>
);

// Data Value Display with coloring
const DataValue: React.FC<{ 
  value?: string | number | null; 
  compareWith?: string | number | null;
  type?: 'actual' | 'forecast' | 'previous';
}> = ({ value, compareWith, type = 'actual' }) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-neutral-600">—</span>;
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const numCompare = compareWith ? (typeof compareWith === 'string' ? parseFloat(compareWith) : compareWith) : null;
  
  let colorClass = 'text-neutral-200';
  
  if (type === 'actual' && numCompare !== null && !isNaN(numValue) && !isNaN(numCompare)) {
    if (numValue > numCompare) colorClass = 'text-emerald-400';
    else if (numValue < numCompare) colorClass = 'text-red-400';
  }
  
  if (type === 'forecast') colorClass = 'text-neutral-400';
  if (type === 'previous') colorClass = 'text-neutral-500';
  
  return (
    <span className={`${colorClass} ${type === 'actual' ? 'font-semibold' : ''}`}>
      {value}
    </span>
  );
};

// ✅ FIXED: Economic Calendar Table - Proper date grouping
const EconomicCalendarTable: React.FC<{
  events: EconomicEvent[];
  loading: boolean;
  timeFilter: TimeFilter;
}> = ({ events, loading, timeFilter }) => {
  if (loading) return <TableSkeleton />;

  const today = new Date().toISOString().split('T')[0];
  const isShowingToday = timeFilter === 'today' || timeFilter === 'thisWeek';

  // ✅ FIXED: Properly group events by normalized date
  const groupedEvents: Record<string, EconomicEvent[]> = {};
  
  events.forEach(event => {
    const date = normalizeDate(event.date);
    if (!date) return;
    
    if (!groupedEvents[date]) {
      groupedEvents[date] = [];
    }
    groupedEvents[date].push(event);
  });

  // Sort events within each day by time
  Object.keys(groupedEvents).forEach(date => {
    groupedEvents[date].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  });

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
        <Calendar size={48} className="mb-4 text-neutral-700" />
        <p className="text-lg text-neutral-400">No economic events found</p>
        <p className="text-sm">Try adjusting your filters or selecting a different time period</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {sortedDates.map((date) => {
        const dateEvents = groupedEvents[date];
        const isToday = date === today;
        
        return (
          <div key={date}>
            {/* ✅ Single date header per date */}
            <div className={`
              px-4 py-3 border-b sticky top-0 backdrop-blur-sm flex items-center justify-between
              ${isToday 
                ? 'bg-amber-500/10 border-amber-500/30' 
                : 'bg-neutral-900/80 border-amber-500/20'
              }
            `}>
              <div className="flex items-center gap-3">
                <h3 className={`text-sm font-semibold ${isToday ? 'text-amber-300' : 'text-amber-400'}`}>
                  {formatDate(date)}
                </h3>
                {isToday && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-black rounded-full">
                    TODAY
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-500">{dateEvents.length} events</span>
            </div>
            
            {/* Events table */}
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-800/50">
                  <th className="px-4 py-3 w-20">Time</th>
                  <th className="px-4 py-3 w-24">Country</th>
                  <th className="px-4 py-3 w-24">Impact</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3 w-24 text-right">Actual</th>
                  <th className="px-4 py-3 w-24 text-right">Forecast</th>
                  <th className="px-4 py-3 w-24 text-right">Previous</th>
                </tr>
              </thead>
              <tbody>
                {dateEvents.map((event, index) => {
                  const nextEvent = dateEvents[index + 1] || null;
                  const showNowAfter = isToday && isShowingToday && shouldShowNowAfter(
                    { date: event.date, time: event.time },
                    nextEvent ? { date: nextEvent.date, time: nextEvent.time } : null,
                    isToday
                  );
                  const isPast = isEventPast(event.date, event.time);
                  
                  return (
                    <React.Fragment key={event.id}>
                      <tr
                        className={`
                          border-b border-neutral-800/30 transition-colors
                          ${event.isReleased || isPast
                            ? 'bg-neutral-900/50 opacity-75' 
                            : 'hover:bg-neutral-800/30'
                          }
                        `}
                      >
                        <td className="px-4 py-3 text-sm font-mono">
                          <div className="flex items-center gap-2">
                            <span className={isPast ? 'text-neutral-500' : 'text-neutral-300'}>
                              {event.time || '—'}
                            </span>
                            {event.isReleased && (
                              <CheckCircle2 size={12} className="text-emerald-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CountryFlag countryCode={event.countryCode} size="md" />
                            <span className="text-xs text-neutral-500">{event.currency}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {event.isHoliday ? (
                            <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                              Holiday
                            </span>
                          ) : (
                            <ImportanceStars level={event.importance} />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm ${isPast ? 'text-neutral-400' : 'text-neutral-200'}`}>
                              {event.event}
                            </span>
                            {event.isSpeech && (
                              <Mic size={14} className="text-purple-400" />
                            )}
                            {event.isPreliminary && (
                              <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">P</span>
                            )}
                            {event.isRevised && (
                              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">R</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <DataValue value={event.actual} compareWith={event.forecast} type="actual" />
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <DataValue value={event.forecast} type="forecast" />
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <DataValue value={event.previous} type="previous" />
                        </td>
                      </tr>
                      {showNowAfter && <NowIndicator />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

// Holidays Table
const HolidaysTable: React.FC<{ holidays: HolidayEvent[]; loading: boolean }> = ({ holidays, loading }) => {
  if (loading) return <TableSkeleton />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-800/50">
            <th className="px-4 py-3 w-20">Flag</th>
            <th className="px-4 py-3">Country</th>
            <th className="px-4 py-3">Holiday</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Markets Closed</th>
          </tr>
        </thead>
        <tbody>
          {holidays.map((holiday) => (
            <tr key={holiday.id} className="border-b border-neutral-800/30 hover:bg-neutral-800/30 transition-colors">
              <td className="px-4 py-3">
                <CountryFlag countryCode={holiday.countryCode} size="lg" />
              </td>
              <td className="px-4 py-3 text-sm text-neutral-200 font-medium">{holiday.country}</td>
              <td className="px-4 py-3 text-sm text-amber-400 font-medium">{holiday.holiday}</td>
              <td className="px-4 py-3 text-sm text-neutral-400">{formatShortDate(holiday.date)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {holiday.marketsClosed?.map((market) => (
                    <span key={market} className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                      {market}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Earnings Table
const EarningsTable: React.FC<{ earnings: EarningsEvent[]; loading: boolean }> = ({ earnings, loading }) => {
  if (loading) return <TableSkeleton />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-800/50">
            <th className="px-4 py-3 w-20">Time</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Quarter</th>
            <th className="px-4 py-3 text-right">EPS Est.</th>
            <th className="px-4 py-3 text-right">EPS Act.</th>
            <th className="px-4 py-3 text-right">Surprise</th>
          </tr>
        </thead>
        <tbody>
          {earnings.map((earning) => (
            <tr key={earning.id} className="border-b border-neutral-800/30 hover:bg-neutral-800/30 transition-colors">
              <td className="px-4 py-3">
                <span className={`
                  text-xs font-semibold px-2 py-1 rounded border
                  ${earning.when === 'BMO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                  ${earning.when === 'AMC' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : ''}
                  ${earning.when === 'DMH' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                `}>
                  {earning.when}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-mono font-bold text-amber-400">{earning.symbol}</span>
                  <span className="text-xs text-neutral-500 truncate max-w-[200px]">
                    {earning.company !== earning.symbol ? earning.company : ''}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-neutral-400">{formatShortDate(earning.date)}</td>
              <td className="px-4 py-3 text-sm text-neutral-500">{earning.quarter}</td>
              <td className="px-4 py-3 text-right text-sm text-neutral-400">
                {earning.epsEstimate ? `$${earning.epsEstimate}` : '—'}
              </td>
              <td className="px-4 py-3 text-right text-sm text-neutral-200 font-medium">
                {earning.epsActual ? `$${earning.epsActual}` : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                {earning.surprise !== null && earning.surprise !== undefined ? (
                  <span className={`text-sm font-semibold ${
                    Number(earning.surprise) > 0 ? 'text-emerald-400' : Number(earning.surprise) < 0 ? 'text-red-400' : 'text-neutral-400'
                  }`}>
                    {Number(earning.surprise) > 0 ? '+' : ''}{earning.surprise}%
                  </span>
                ) : (
                  <span className="text-neutral-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Dividends Table
const DividendsTable: React.FC<{ dividends: DividendEvent[]; loading: boolean }> = ({ dividends, loading }) => {
  if (loading) return <TableSkeleton />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-800/50">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Ex-Date</th>
            <th className="px-4 py-3">Pay Date</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3">Frequency</th>
          </tr>
        </thead>
        <tbody>
          {dividends.map((dividend) => (
            <tr key={dividend.id} className="border-b border-neutral-800/30 hover:bg-neutral-800/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-mono font-bold text-emerald-400">{dividend.symbol}</span>
                  <span className="text-xs text-neutral-500 truncate max-w-[200px]">
                    {dividend.company && dividend.company !== dividend.symbol ? dividend.company : ''}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-neutral-300">{formatShortDate(dividend.exDate)}</td>
              <td className="px-4 py-3 text-sm text-neutral-400">{dividend.payDate ? formatShortDate(dividend.payDate) : '—'}</td>
              <td className="px-4 py-3 text-right text-sm text-amber-400 font-semibold">
                ${typeof dividend.amount === 'number' ? dividend.amount.toFixed(4) : dividend.amount}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">
                  {dividend.frequency}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Splits Table
const SplitsTable: React.FC<{ splits: SplitEvent[]; loading: boolean }> = ({ splits, loading }) => {
  if (loading) return <TableSkeleton />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-800/50">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Ratio</th>
            <th className="px-4 py-3">Type</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((split) => (
            <tr key={split.id} className="border-b border-neutral-800/30 hover:bg-neutral-800/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-mono font-bold text-cyan-400">{split.symbol}</span>
                  <span className="text-xs text-neutral-500 truncate max-w-[200px]">
                    {split.company && split.company !== split.symbol ? split.company : ''}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-neutral-300">{formatShortDate(split.date)}</td>
              <td className="px-4 py-3 text-sm font-semibold text-neutral-200">{split.ratio}</td>
              <td className="px-4 py-3">
                <span className={`
                  text-xs font-semibold px-2 py-1 rounded border
                  ${split.type === 'Forward' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }
                `}>
                  {split.type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// IPO Table
const IPOTable: React.FC<{ ipos: IPOEvent[]; loading: boolean }> = ({ ipos, loading }) => {
  if (loading) return <TableSkeleton />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-800/50">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Exchange</th>
            <th className="px-4 py-3">Price Range</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {ipos.map((ipo) => (
            <tr key={ipo.id} className="border-b border-neutral-800/30 hover:bg-neutral-800/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-mono font-bold text-purple-400">{ipo.symbol}</span>
                  <span className="text-xs text-neutral-400 truncate max-w-[250px]">{ipo.company}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-neutral-300">{ipo.date ? formatShortDate(ipo.date) : 'TBD'}</td>
              <td className="px-4 py-3 text-sm text-neutral-400">{ipo.exchange || '—'}</td>
              <td className="px-4 py-3 text-sm text-amber-400 font-medium">{ipo.priceRange || '—'}</td>
              <td className="px-4 py-3">
                <span className={`
                  text-xs font-semibold px-2 py-1 rounded border
                  ${ipo.status === 'listed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                  ${ipo.status === 'expected' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                  ${ipo.status === 'filed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                  ${!ipo.status ? 'bg-neutral-700 text-neutral-400 border-neutral-600' : ''}
                `}>
                  {ipo.status || 'Unknown'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Expiration Table
const ExpirationTable: React.FC<{ expirations: ExpirationEvent[]; loading: boolean }> = ({ expirations, loading }) => {
  if (loading) return <TableSkeleton />;

  // Group by date
  const groupedExpirations: Record<string, ExpirationEvent[]> = {};
  expirations.forEach(exp => {
    const date = normalizeDate(exp.date);
    if (!groupedExpirations[date]) groupedExpirations[date] = [];
    groupedExpirations[date].push(exp);
  });

  const sortedDates = Object.keys(groupedExpirations).sort();

  const getTypeColor = (type: string, category?: string) => {
    if (type === 'Futures') {
      switch (category) {
        case 'Index': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'Energy': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        case 'Metals': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        case 'Agriculture': return 'bg-green-500/10 text-green-400 border-green-500/20';
        case 'Currency': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        case 'Rates': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
        case 'Volatility': return 'bg-red-500/10 text-red-400 border-red-500/20';
        default: return 'bg-neutral-700 text-neutral-300 border-neutral-600';
      }
    }
    if (type === 'Index Options') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (type === 'Options') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-neutral-700 text-neutral-300 border-neutral-600';
  };

  return (
    <div className="overflow-x-auto">
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="bg-neutral-900/80 px-4 py-3 border-b border-amber-500/20 sticky top-0 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-amber-400">{formatDate(date)}</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-800/50">
                <th className="px-4 py-3 w-32">Type</th>
                <th className="px-4 py-3 w-24">Symbol</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 w-24">Exchange</th>
              </tr>
            </thead>
            <tbody>
              {groupedExpirations[date].map((expiration) => (
                <tr
                  key={expiration.id}
                  className={`
                    border-b border-neutral-800/30 transition-colors
                    ${expiration.isMonthly ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-neutral-800/30'}
                  `}
                >
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded border ${getTypeColor(expiration.type, expiration.category)}`}>
                      {expiration.type}
                    </span>
                    {expiration.category && expiration.type === 'Futures' && (
                      <span className="ml-2 text-xs text-neutral-500">{expiration.category}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {expiration.symbol ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-mono font-bold text-amber-400">{expiration.symbol}</span>
                        {expiration.contractCode && (
                          <span className="text-xs text-neutral-500">{expiration.contractCode}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      {expiration.name && <span className="text-sm text-neutral-200">{expiration.name}</span>}
                      <span className="text-xs text-neutral-500">{expiration.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-400">{expiration.exchange || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

// Legend Component
const Legend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-6 px-4 py-3 bg-neutral-900/50 border-t border-amber-500/10 text-xs text-neutral-500">
    <div className="flex items-center gap-2">
      <Mic size={12} className="text-purple-400" />
      <span>Speech</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">P</span>
      <span>Preliminary</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">R</span>
      <span>Revised</span>
    </div>
    <div className="flex items-center gap-2">
      <CheckCircle2 size={12} className="text-emerald-500" />
      <span>Released</span>
    </div>
    <div className="h-4 w-px bg-neutral-700" />
    <div className="flex items-center gap-2">
      <Star size={12} className="text-neutral-600" />
      <span>Low</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex">
        <Star size={12} className="fill-amber-500 text-amber-500" />
        <Star size={12} className="fill-amber-500 text-amber-500" />
      </div>
      <span>Medium</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex">
        <Star size={12} className="fill-amber-500 text-amber-500" />
        <Star size={12} className="fill-amber-500 text-amber-500" />
        <Star size={12} className="fill-amber-500 text-amber-500" />
      </div>
      <span>High</span>
    </div>
    <div className="h-4 w-px bg-neutral-700" />
    <div className="flex items-center gap-2">
      <div className="w-4 h-0.5 bg-amber-500 rounded" />
      <span>Current Time</span>
    </div>
  </div>
);

// Empty State
const EmptyState: React.FC<{ message?: string }> = ({ message = 'No events found' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
    <Calendar size={48} className="mb-4 text-neutral-700" />
    <p className="text-lg text-neutral-400">{message}</p>
    <p className="text-sm">Try adjusting your filters or selecting a different time period</p>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export default function AllMarketsCalendar() {
  const [activeTab, setActiveTab] = useState<TabType>('economic');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [importanceFilter, setImportanceFilter] = useState<Importance[]>([1, 2, 3]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data, loading, error, refetch } = useCalendarData(
    activeTab,
    timeFilter,
    selectedCountry,
    importanceFilter,
    searchQuery
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { id: 'economic' as TabType, label: 'Economic Calendar', icon: <Calendar size={16} />, count: data?.economic?.count },
    { id: 'holidays' as TabType, label: 'Holidays', icon: <Globe size={16} />, count: data?.holidays?.count },
    { id: 'earnings' as TabType, label: 'Earnings', icon: <TrendingUp size={16} />, count: data?.earnings?.count },
    { id: 'dividends' as TabType, label: 'Dividends', icon: <DollarSign size={16} />, count: data?.dividends?.count },
    { id: 'splits' as TabType, label: 'Splits', icon: <BarChart3 size={16} />, count: data?.splits?.count },
    { id: 'ipo' as TabType, label: 'IPO', icon: <Building2 size={16} />, count: data?.ipos?.count },
    { id: 'expiration' as TabType, label: 'Expiration', icon: <Timer size={16} />, count: data?.expirations?.count },
  ];

  const timeFilters = [
    { id: 'yesterday' as TimeFilter, label: 'Yesterday' },
    { id: 'today' as TimeFilter, label: 'Today' },
    { id: 'tomorrow' as TimeFilter, label: 'Tomorrow' },
    { id: 'thisWeek' as TimeFilter, label: 'This Week' },
    { id: 'nextWeek' as TimeFilter, label: 'Next Week' },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-amber-950/20 via-black to-black pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                  <Calendar className="text-black" size={24} />
                </div>
                <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                  Markets Calendar
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-amber-500/10 overflow-x-auto">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
              label={tab.label}
              count={tab.count}
            />
          ))}
        </div>

        {/* Time Filters & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 bg-neutral-900/80 rounded-lg p-1 border border-neutral-800">
            {timeFilters.map((filter) => (
              <TimeFilterButton
                key={filter.id}
                active={timeFilter === filter.id}
                onClick={() => setTimeFilter(filter.id)}
                label={filter.label}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-neutral-400 bg-neutral-900/80 px-3 py-2 rounded-lg border border-neutral-800">
              <Clock size={14} className="text-amber-500" />
              <span className="text-amber-400 font-mono font-semibold">
                {formatTime(currentTime)}
              </span>
              <span className="text-neutral-500">({getTimezone()})</span>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-neutral-900/80 border border-neutral-800 rounded-lg text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 w-48"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none">
                <CountryFlag countryCode={selectedCountry} size="sm" />
              </div>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="appearance-none pl-10 pr-10 py-2 bg-neutral-900/80 border border-neutral-800 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            </div>

            <button
              onClick={() => refetch()}
              disabled={loading}
              className="p-2 text-neutral-400 hover:text-amber-400 bg-neutral-900/80 border border-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border
                ${showFilters 
                  ? 'bg-amber-500 text-black border-amber-500' 
                  : 'bg-neutral-900/80 text-neutral-400 hover:text-amber-400 border-neutral-800 hover:border-amber-500/50'
                }
              `}
            >
              <Filter size={16} />
              Filters
            </button>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-neutral-900/80 border border-amber-500/20 rounded-lg">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <label className="block text-xs text-amber-400/80 uppercase tracking-wider mb-2 font-semibold">
                  Impact Level
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        if (importanceFilter.includes(level as Importance)) {
                          setImportanceFilter(importanceFilter.filter(i => i !== level));
                        } else {
                          setImportanceFilter([...importanceFilter, level as Importance]);
                        }
                      }}
                      className={`
                        flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all border
                        ${importanceFilter.includes(level as Importance)
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                          : 'bg-neutral-800/50 text-neutral-500 border-neutral-700'
                        }
                      `}
                    >
                      {[...Array(level)].map((_, i) => (
                        <Star key={i} size={12} className="fill-current" />
                      ))}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="bg-neutral-900/50 border border-amber-500/10 rounded-xl overflow-hidden shadow-2xl shadow-amber-900/5">
          {activeTab === 'economic' && (
            <>
              {data?.economic?.events?.length ? (
                <EconomicCalendarTable 
                  events={data.economic.events} 
                  loading={loading}
                  timeFilter={timeFilter}
                />
              ) : loading ? (
                <TableSkeleton />
              ) : (
                <EmptyState />
              )}
              <Legend />
            </>
          )}
          
          {activeTab === 'holidays' && (
            <>
              <div className="bg-neutral-900/80 px-4 py-3 border-b border-amber-500/10">
                <h3 className="text-sm font-semibold text-amber-400">Market Holidays</h3>
              </div>
              {data?.holidays?.events?.length ? (
                <HolidaysTable holidays={data.holidays.events} loading={loading} />
              ) : loading ? (
                <TableSkeleton />
              ) : (
                <EmptyState message="No holidays for selected period" />
              )}
            </>
          )}
          
          {activeTab === 'earnings' && (
            <>
              <div className="bg-neutral-900/80 px-4 py-3 border-b border-amber-500/10">
                <h3 className="text-sm font-semibold text-amber-400">Earnings Reports</h3>
              </div>
              {data?.earnings?.events?.length ? (
                <EarningsTable earnings={data.earnings.events} loading={loading} />
              ) : loading ? (
                <TableSkeleton />
              ) : (
                <EmptyState message="No earnings for selected period" />
              )}
              <div className="px-4 py-3 bg-neutral-900/30 border-t border-neutral-800/50 text-xs text-neutral-500">
                <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 mr-3">BMO</span> Before Market Open
                <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 mx-3">AMC</span> After Market Close
                <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 mx-3">DMH</span> During Market Hours
              </div>
            </>
          )}
          
          {activeTab === 'dividends' && (
            <>
              <div className="bg-neutral-900/80 px-4 py-3 border-b border-amber-500/10">
                <h3 className="text-sm font-semibold text-amber-400">Dividend Events</h3>
              </div>
              {data?.dividends?.events?.length ? (
                <DividendsTable dividends={data.dividends.events} loading={loading} />
              ) : loading ? (
                <TableSkeleton />
              ) : (
                <EmptyState message="No dividends for selected period" />
              )}
            </>
          )}
          
          {activeTab === 'splits' && (
            <>
              <div className="bg-neutral-900/80 px-4 py-3 border-b border-amber-500/10">
                <h3 className="text-sm font-semibold text-amber-400">Stock Splits</h3>
              </div>
              {data?.splits?.events?.length ? (
                <SplitsTable splits={data.splits.events} loading={loading} />
              ) : loading ? (
                <TableSkeleton />
              ) : (
                <EmptyState message="No splits for selected period" />
              )}
            </>
          )}
          
          {activeTab === 'ipo' && (
            <>
              <div className="bg-neutral-900/80 px-4 py-3 border-b border-amber-500/10">
                <h3 className="text-sm font-semibold text-amber-400">IPO Calendar</h3>
              </div>
              {data?.ipos?.events?.length ? (
                <IPOTable ipos={data.ipos.events} loading={loading} />
              ) : loading ? (
                <TableSkeleton />
              ) : (
                <EmptyState message="No IPOs for selected period" />
              )}
            </>
          )}
          
          {activeTab === 'expiration' && (
            <>
              <div className="bg-neutral-900/80 px-4 py-3 border-b border-amber-500/10">
                <h3 className="text-sm font-semibold text-amber-400">Options & Futures Expirations</h3>
              </div>
              {data?.expirations?.events?.length ? (
                <ExpirationTable expirations={data.expirations.events} loading={loading} />
              ) : loading ? (
                <TableSkeleton />
              ) : (
                <EmptyState message="No expirations for selected period" />
              )}
              <div className="px-4 py-3 bg-neutral-900/30 border-t border-neutral-800/50 text-xs text-neutral-500 flex flex-wrap gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span> Index
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Energy
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span> Metals
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span> Agriculture
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span> Currency
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Rates
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span> Volatility
                </span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}