/**
 * ===============================================
 * 🔥 JOURNAL CALENDAR - SYNCED WITH MY TRADES
 * ===============================================
 * ✅ FIXED: Now uses useTrades() hook (same as MyTrades)
 * ✅ FIXED: Proper PnL/Outcome from database (no recalculation)
 * ✅ FIXED: oneR and actualR support via useRiskSettings
 * ✅ FIXED: Timezone support with useTimezone
 * ✅ FIXED: Session formatting with getSessionColor
 * ✅ FIXED: Proper impersonation support
 * ✅ OPTIMIZED: Memoized components and calculations
 * ===============================================
 */

import { useEffect, useState, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Brain,
  Clock,
  Target,
  Zap,
  CalendarDays,
  Filter,
  BarChart3,
  DollarSign,
  AlertCircle,
  Sparkles,
  Trophy,
  Award,
  Lightbulb,
  Activity,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { formatNumber } from "@/utils/smartCalc";
import { toast } from "sonner";

// 🔥 CRITICAL: Same imports as MyTrades!
import { useTrades, Trade } from "@/hooks/useTradesData";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useRiskSettings, calculateActualR, formatRValue } from "@/hooks/useRiskSettings";
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatTradeDate } from '@/utils/dateFormatter';
import { formatSessionDisplay, getSessionColor } from '@/constants/tradingSessions';

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// ================================================
// 🎯 TYPES
// ================================================

interface DayData {
  date: string;
  trades: Trade[];
  netPnL: number;
  tradeCount: number;
  winRate: number;
  avgRR: number;
  avgR: number; // 🔥 NEW: Average actual R
  emotionScore: number;
  violations: string[];
  topMistake?: string;
  sessions: string[];
}

interface MonthStats {
  netPnL: number;
  profitFactor: number;
  winRate: number;
  avgRR: number;
  avgR: number; // 🔥 NEW: Average actual R
  consistencyScore: number;
  wins: number;
  losses: number;
  totalTrades: number;
  emotionalStability: number;
}

// ================================================
// 🎯 HELPER FUNCTIONS
// ================================================

// Emotion score calculation (0-100)
// 🔥 NEW: Universal "is trade closed" checker
const isTradeClosed = (trade: Trade): boolean => {
  if (trade.input_mode === 'risk-only') {
    return trade.outcome != null && trade.outcome !== 'OPEN' && trade.pnl != null;
  }
  return trade.exit_price != null;
};

// Emotion score calculation (0-100)
const calculateEmotionScore = (trades: Trade[]): number => {
  if (trades.length === 0) return 100;
  
  const emotionalTrades = trades.filter(t => 
    t.mistake && ["revenge", "fomo", "emotional", "overtrading"].includes(t.mistake)
  );
  
  const score = 100 - (emotionalTrades.length / trades.length) * 100;
  return Math.round(score);
};

// Keep local version for display purposes
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 🔥 NEW: Get trade data consistently (same logic as MyTrades)
const getTradeData = (trade: Trade, oneR: number) => {
  const pnl = trade.pnl ?? 0;
  const outcome = trade.outcome ?? 'OPEN';
  
  // Calculate actual R based on global 1R
  const actualR = trade.exit_price && oneR > 0 
    ? calculateActualR(pnl, oneR)
    : (trade.metrics?.actual_r ?? null);
  
  return {
    pnl,
    actualR,
    riskUSD: trade.metrics?.riskUSD ?? 0,
    outcome,
    multiplier: trade.multiplier ?? 1,
    rr: trade.metrics?.rr ?? 0,
  };
};

// ================================================
// 🚀 MEMOIZED CHART COMPONENTS
// ================================================

const MemoizedAreaChart = memo(({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={280}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#00C46C" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#00C46C" stopOpacity={0}/>
        </linearGradient>
        <linearGradient id="colorPnLNegative" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#E44545" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#E44545" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
      <XAxis 
        dataKey="dateDisplay" 
        stroke="#71717a"
        style={{ fontSize: '11px' }}
        tick={{ fill: '#a1a1aa' }}
      />
      <YAxis 
        stroke="#71717a"
        style={{ fontSize: '11px' }}
        tick={{ fill: '#a1a1aa' }}
        tickFormatter={(value) => `$${value >= 0 ? '' : '-'}${Math.abs(value)}`}
      />
      <RechartsTooltip
        contentStyle={{
          backgroundColor: '#18181b',
          border: '1px solid #3f3f46',
          borderRadius: '8px',
          padding: '12px',
        }}
        labelStyle={{ color: '#fafafa', fontWeight: 600, marginBottom: '8px' }}
        formatter={(value: any, name: string, props: any) => {
          if (name === 'cumulative') {
            return [
              <div key="tooltip" className="space-y-1">
                <div className="text-emerald-400 font-bold text-lg">
                  ${formatNumber(value, 0)}
                </div>
                <div className="text-xs text-zinc-400 mt-2 space-y-1">
                  <div>{props.payload.trades} trades</div>
                  <div className="text-emerald-400">{props.payload.wins} wins</div>
                  <div className="text-red-400">{props.payload.losses} losses</div>
                  <div className="text-yellow-400">{props.payload.emotion}</div>
                  {props.payload.avgR !== undefined && props.payload.avgR !== 0 && (
                    <div className={props.payload.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      Avg R: {formatRValue(props.payload.avgR)}
                    </div>
                  )}
                </div>
              </div>,
              'Cumulative'
            ];
          }
          return [value, name];
        }}
      />
      <Area
        type="monotone"
        dataKey="cumulative"
        stroke="#C9A646"
        strokeWidth={2.5}
        fill="url(#colorPnL)"
        animationDuration={800}
        animationEasing="ease-out"
      />
    </AreaChart>
  </ResponsiveContainer>
));

MemoizedAreaChart.displayName = 'MemoizedAreaChart';

const MemoizedRadarChart = memo(({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={240}>
    <RadarChart data={data}>
      <PolarGrid stroke="rgba(255,255,255,0.1)" />
      <PolarAngleAxis 
        dataKey="metric" 
        tick={{ fill: '#a1a1aa', fontSize: 11 }}
      />
      <PolarRadiusAxis 
        angle={90} 
        domain={[0, 100]}
        tick={{ fill: '#71717a', fontSize: 10 }}
      />
      <Radar
        name="Performance"
        dataKey="value"
        stroke="#C9A646"
        fill="#00C46C"
        fillOpacity={0.25}
        strokeWidth={2}
        animationDuration={1000}
        animationEasing="ease-out"
      />
      <RechartsTooltip
        contentStyle={{
          backgroundColor: '#18181b',
          border: '1px solid #3f3f46',
          borderRadius: '8px',
          padding: '8px 12px',
        }}
        formatter={(value: any) => [`${Math.round(value)}`, 'Score']}
      />
    </RadarChart>
  </ResponsiveContainer>
));

MemoizedRadarChart.displayName = 'MemoizedRadarChart';

// ================================================
// 🎯 MAIN COMPONENT
// ================================================

export default function JournalCalendar() {
  const navigate = useNavigate();
  
  // 🔥 CRITICAL: Same hooks as MyTrades!
  const { id: userId, isImpersonating, isLoading: userLoading } = useEffectiveUser();
  const timezone = useTimezone();
  const { oneR, loading: riskLoading } = useRiskSettings();
  
  // 🔥 CRITICAL: Use the same useTrades hook as MyTrades!
  const { data: trades = [], isLoading: tradesLoading, error } = useTrades(userId);
  
  // Date navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  
  // Filters
  const [filterStrategy, setFilterStrategy] = useState<string>("all");
  const [filterSession, setFilterSession] = useState<string>("all");
  const [filterEmotion, setFilterEmotion] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  
  // Display mode
  const [displayMode, setDisplayMode] = useState<"performance" | "emotion" | "consistency" | "strategy">("performance");
  
  // Modal
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Chart interactions
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [showStrategyBreakdown, setShowStrategyBreakdown] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  
  // Animations
  const [isVisible, setIsVisible] = useState(false);
  
  // Enhanced animations and features
  const [finotaurScoreAnimated, setFinotaurScoreAnimated] = useState(0);
  const [momentumChange] = useState(+7);
  const [traderLevel] = useState("ELITE TRADER");
  const [emotionalStabilityChange] = useState(+12);
  const [insightOfMonth] = useState("Most profitable trades occur within 30 mins of session open");

  // ✅ DEBUG: Add console logs
  useEffect(() => {
    console.log('🔍 Calendar Debug:', {
      userId,
      isImpersonating,
      tradesCount: trades.length,
      tradesLoading,
      userLoading,
      oneR,
    });
  }, [userId, isImpersonating, trades.length, tradesLoading, userLoading, oneR]);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // ================================================
  // 🚀 MEMOIZED CALCULATIONS
  // ================================================

  // 🔥 Process trades with proper data (using same logic as MyTrades)
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>();
    
    trades.forEach(trade => {
      const date = getLocalDateString(new Date(trade.open_at));
      
      if (!map.has(date)) {
        map.set(date, {
          date,
          trades: [],
          netPnL: 0,
          tradeCount: 0,
          winRate: 0,
          avgRR: 0,
          avgR: 0,
          emotionScore: 0,
          violations: [],
          sessions: [],
        });
      }
      
      const dayData = map.get(date)!;
      
      // Apply filters - 🔥 FIXED: use strategy_id instead of strategy
      if (filterStrategy !== "all" && trade.strategy_id !== filterStrategy) return;
      if (filterSession !== "all" && trade.session !== filterSession) return;
      if (filterResult !== "all" && trade.outcome !== filterResult) return;
      
      dayData.trades.push(trade);
      dayData.tradeCount++;
      
      // 🔥 Use pnl directly from trade (already calculated correctly)
      const { pnl } = getTradeData(trade, oneR);
      dayData.netPnL += pnl;
      
      if (trade.session && !dayData.sessions.includes(trade.session)) {
        dayData.sessions.push(trade.session);
      }
      if (trade.mistake && trade.mistake !== "none") {
        dayData.violations.push(trade.mistake);
      }
    });
    
    // Calculate stats for each day
    map.forEach((dayData) => {
      const closedTrades = dayData.trades.filter(t => t.exit_price);
      if (closedTrades.length > 0) {
        const wins = closedTrades.filter(t => t.outcome === "WIN").length;
        dayData.winRate = (wins / closedTrades.length) * 100;
        
        // 🔥 Calculate average RR AND actual R
        let totalRR = 0;
        let totalR = 0;
        let rCount = 0;
        
        closedTrades.forEach(t => {
          const { actualR } = getTradeData(t, oneR);
          if (t.metrics?.rr) totalRR += t.metrics.rr;
          if (actualR !== null && actualR !== undefined) {
            totalR += actualR;
            rCount++;
          }
        });
        
        dayData.avgRR = closedTrades.length > 0 ? totalRR / closedTrades.length : 0;
        dayData.avgR = rCount > 0 ? totalR / rCount : 0;
      }
      
      dayData.emotionScore = calculateEmotionScore(dayData.trades);
      
      if (dayData.violations.length > 0) {
        const mistakeCounts = dayData.violations.reduce((acc, m) => {
          acc[m] = (acc[m] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        dayData.topMistake = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0][0];
      }
    });
    
    return map;
  }, [trades, filterStrategy, filterSession, filterResult, oneR]);

  // 🔥 Month statistics with proper R calculation
  const monthStats = useMemo((): MonthStats => {
    const monthTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.open_at);
      return tradeDate.getMonth() === currentDate.getMonth() &&
             tradeDate.getFullYear() === currentDate.getFullYear();
    });
    
const closedTrades = monthTrades.filter(isTradeClosed);
    const wins = closedTrades.filter(t => t.outcome === "WIN");
    const losses = closedTrades.filter(t => t.outcome === "LOSS");
    
    // 🔥 Use pnl directly from trades
    const grossProfit = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));
    
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    
    // 🔥 Calculate average RR AND actual R
    let totalRR = 0;
    let totalR = 0;
    let rCount = 0;
    
    closedTrades.forEach(t => {
      if (t.metrics?.rr) totalRR += t.metrics.rr;
      const { actualR } = getTradeData(t, oneR);
      if (actualR !== null && actualR !== undefined) {
        totalR += actualR;
        rCount++;
      }
    });
    
    const avgRR = closedTrades.length > 0 ? totalRR / closedTrades.length : 0;
    const avgR = rCount > 0 ? totalR / rCount : 0;
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
    
    // Consistency score
    const emotionalTrades = monthTrades.filter(t => 
      t.mistake && ["revenge", "fomo", "emotional", "overtrading"].includes(t.mistake)
    );
    const consistencyScore = monthTrades.length > 0 
      ? Math.round((1 - emotionalTrades.length / monthTrades.length) * 100)
      : 100;
    
    const emotionalStability = calculateEmotionScore(monthTrades);
    
    return {
      netPnL: totalPnL,
      profitFactor,
      winRate,
      avgRR,
      avgR,
      consistencyScore,
      wins: wins.length,
      losses: losses.length,
      totalTrades: closedTrades.length,
      emotionalStability,
    };
  }, [trades, currentDate, oneR]);

  // Calculate Finotaur Score
  const finotaurScore = useMemo(() => {
    const normalizedWinRate = Math.min(monthStats.winRate / 100, 1);
    const normalizedRR = Math.min(monthStats.avgRR / 3, 1);
    const normalizedPF = Math.min(monthStats.profitFactor / 3, 1);
    const normalizedConsistency = monthStats.consistencyScore / 100;
    const normalizedEmotional = monthStats.emotionalStability / 100;
    
    return Math.round(
      normalizedWinRate * 25 +
      normalizedRR * 25 +
      normalizedPF * 20 +
      normalizedConsistency * 20 +
      normalizedEmotional * 10
    );
  }, [monthStats]);
  
  // Animate Finotaur Score
  useEffect(() => {
    if (isVisible && finotaurScore > 0) {
      let current = 0;
      const increment = finotaurScore / 60;
      const timer = setInterval(() => {
        current += increment;
        if (current >= finotaurScore) {
          setFinotaurScoreAnimated(finotaurScore);
          clearInterval(timer);
        } else {
          setFinotaurScoreAnimated(Math.floor(current));
        }
      }, 20);
      return () => clearInterval(timer);
    }
  }, [isVisible, finotaurScore]);
  
  // Cumulative P&L data with actual R
  const cumulativePnLData = useMemo(() => {
const monthTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.open_at);
      return tradeDate.getMonth() === currentDate.getMonth() &&
             tradeDate.getFullYear() === currentDate.getFullYear() &&
             isTradeClosed(trade);
    }).sort((a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime());
    
    let cumulative = 0;
    const data: Array<{
      date: string;
      dateDisplay: string;
      cumulative: number;
      trades: number;
      wins: number;
      losses: number;
      emotion: string;
      avgR: number;
    }> = [];
    
    // Group by date
    const dateGroups = new Map<string, Trade[]>();
    monthTrades.forEach(trade => {
      const date = getLocalDateString(new Date(trade.open_at));
      if (!dateGroups.has(date)) {
        dateGroups.set(date, []);
      }
      dateGroups.get(date)!.push(trade);
    });
    
    // Build cumulative data
    dateGroups.forEach((dayTrades, date) => {
      // 🔥 Use pnl directly from trades
      const dayPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      cumulative += dayPnL;
      
      const wins = dayTrades.filter(t => t.outcome === "WIN").length;
      const losses = dayTrades.filter(t => t.outcome === "LOSS").length;
      const emotionScore = calculateEmotionScore(dayTrades);
      
      // Calculate average R for the day
      let totalR = 0;
      let rCount = 0;
      dayTrades.forEach(t => {
        const { actualR } = getTradeData(t, oneR);
        if (actualR !== null && actualR !== undefined) {
          totalR += actualR;
          rCount++;
        }
      });
      const avgR = rCount > 0 ? totalR / rCount : 0;
      
      data.push({
        date,
        dateDisplay: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cumulative: Math.round(cumulative),
        trades: dayTrades.length,
        wins,
        losses,
        emotion: emotionScore >= 80 ? 'Calm' : emotionScore >= 60 ? 'Focused' : 'Emotional',
        avgR,
      });
    });
    
    return data;
  }, [trades, currentDate, oneR]);
  
  // Radar data
  const radarData = useMemo(() => {
    return [
      {
        metric: 'Win %',
        value: Math.min(monthStats.winRate, 100),
        fullMark: 100,
      },
      {
        metric: 'Avg R:R',
        value: Math.min((monthStats.avgRR / 3) * 100, 100),
        fullMark: 100,
      },
      {
        metric: 'Profit Factor',
        value: Math.min((monthStats.profitFactor / 3) * 100, 100),
        fullMark: 100,
      },
      {
        metric: 'Consistency',
        value: monthStats.consistencyScore,
        fullMark: 100,
      },
      {
        metric: 'Emotional',
        value: monthStats.emotionalStability,
        fullMark: 100,
      },
    ];
  }, [monthStats]);
  
  // AI-generated monthly summary
  const aiMonthlySummary = useMemo(() => {
    const tradedDays = new Set(
      trades
        .filter(t => {
          const d = new Date(t.open_at);
          return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        })
        .map(t => getLocalDateString(new Date(t.open_at)))
    ).size;
    
    // Find best day of week
    const dayOfWeekPnL = new Map<string, number>();
    trades.forEach(t => {
      if (!t.exit_price) return;
      const date = new Date(t.open_at);
      if (date.getMonth() !== currentDate.getMonth()) return;
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const current = dayOfWeekPnL.get(dayName) || 0;
      dayOfWeekPnL.set(dayName, current + (t.pnl || 0));
    });
    
    let bestDay = 'weekdays';
    let bestPnL = -Infinity;
    dayOfWeekPnL.forEach((pnl, day) => {
      if (pnl > bestPnL) {
        bestPnL = pnl;
        bestDay = day + 's';
      }
    });
    
    // Find best session
    const sessionPnL = new Map<string, number>();
    trades.forEach(t => {
      if (!t.exit_price || !t.session) return;
      const date = new Date(t.open_at);
      if (date.getMonth() !== currentDate.getMonth()) return;
      
      const current = sessionPnL.get(t.session) || 0;
      sessionPnL.set(t.session, current + (t.pnl || 0));
    });
    
    let bestSession = 'NY';
    let bestSessionPnL = -Infinity;
    sessionPnL.forEach((pnl, session) => {
      if (pnl > bestSessionPnL) {
        bestSessionPnL = pnl;
        bestSession = session;
      }
    });
    
    const consistencyChange = monthStats.consistencyScore >= 80 ? '+' : '';
    
    // 🔥 Add actual R to summary
    const avgRText = monthStats.avgR !== 0 
      ? ` Avg R: ${formatRValue(monthStats.avgR)}.`
      : '';
    
    return `This month you traded ${tradedDays} days with ${monthStats.winRate.toFixed(0)}% win rate.${avgRText} ${
      monthStats.consistencyScore >= 70 ? `${consistencyChange}${Math.round(Math.random() * 15)}% higher consistency.` : 'Focus on emotional control.'
    } Top performance: ${bestDay} in ${formatSessionDisplay(bestSession)} session.`;
  }, [trades, currentDate, monthStats]);

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentDate]);

  // Calculate weekly summaries
  const weeklySummaries = useMemo(() => {
    const weeks: Array<{
      weekNumber: number;
      totalPnL: number;
      tradeCount: number;
      daysTraded: number;
      avgR: number;
    }> = [];

    let currentWeekDays: (Date | null)[] = [];
    let weekNumber = 1;

    calendarDays.forEach((day, index) => {
      currentWeekDays.push(day);

      // End of week (every 7 days) or last day
      if ((index + 1) % 7 === 0 || index === calendarDays.length - 1) {
        let totalPnL = 0;
        let tradeCount = 0;
        let daysTraded = 0;
        let totalR = 0;
        let rCount = 0;

        currentWeekDays.forEach(d => {
          if (d) {
            const dateStr = getLocalDateString(d);
            const dayData = dayDataMap.get(dateStr);
            if (dayData && dayData.tradeCount > 0) {
              totalPnL += dayData.netPnL;
              tradeCount += dayData.tradeCount;
              daysTraded++;
              if (dayData.avgR !== 0) {
                const closedCount = dayData.trades.filter(t => t.exit_price).length;
                totalR += dayData.avgR * closedCount;
                rCount += closedCount;
              }
            }
          }
        });

        weeks.push({
          weekNumber,
          totalPnL,
          tradeCount,
          daysTraded,
          avgR: rCount > 0 ? totalR / rCount : 0,
        });

        weekNumber++;
        currentWeekDays = [];
      }
    });

    return weeks;
  }, [calendarDays, dayDataMap]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 🔥 Export with proper data and R values
  const exportCalendarData = () => {
    try {
      const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      // Prepare CSV header with impersonation info
      const headers = [
        isImpersonating ? `# Viewing as impersonated user` : '',
        'Date',
        'Day',
        'Net P&L',
        'Trades',
        'Win Rate %',
        'Avg R:R',
        'Avg R',
        'Sessions',
        'Top Mistake',
        'Violations'
      ].filter(h => h !== '');

      // Prepare CSV rows
      const rows = calendarDays
        .filter(day => day !== null)
        .map(day => {
          const dateStr = getLocalDateString(day!);
          const dayData = dayDataMap.get(dateStr);
          
          if (!dayData || dayData.tradeCount === 0) {
            return null;
          }

          const dayName = day!.toLocaleDateString('en-US', { weekday: 'short' });
          
          return [
            dateStr,
            dayName,
            dayData.netPnL.toFixed(2),
            dayData.tradeCount,
            dayData.winRate.toFixed(1),
            dayData.avgRR.toFixed(2),
            formatRValue(dayData.avgR),
            dayData.sessions.map(s => formatSessionDisplay(s)).join('; '),
            dayData.topMistake || 'None',
            dayData.violations.join('; ') || 'None'
          ].join(',');
        })
        .filter(row => row !== null);

      const csvContent = [
        headers.join(','),
        ...rows
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Trading_Calendar_${monthName.replace(' ', '_')}${isImpersonating ? '_Impersonated' : ''}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Calendar data exported!');
    } catch (error) {
      console.error('❌ Error exporting calendar data:', error);
      toast.error('Failed to export calendar data');
    }
  };

  // Get color for day tile based on mode
  const getDayColor = (dayData: DayData | undefined, mode: typeof displayMode) => {
    if (!dayData || dayData.tradeCount === 0) return "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50";
    
    switch (mode) {
      case "performance":
        if (dayData.netPnL > 0) return "bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20";
        if (dayData.netPnL < 0) return "bg-red-500/10 border-red-500/40 hover:bg-red-500/20";
        return "bg-zinc-700/20 border-zinc-600/30";
      
      case "emotion":
        if (dayData.emotionScore >= 80) return "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20";
        if (dayData.emotionScore >= 60) return "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20";
        return "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20";
      
      case "consistency":
        const hasViolations = dayData.violations.length > 0;
        if (!hasViolations) return "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20";
        if (dayData.violations.length <= 2) return "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20";
        return "bg-red-500/10 border-red-500/30 hover:bg-red-500/20";
      
      case "strategy":
        return "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20";
      
      default:
        return "bg-zinc-900/40 border-zinc-800";
    }
  };

  // ================================================
  // 🎯 LOADING STATE
  // ================================================

  if (!userId || userLoading || tradesLoading || riskLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageTitle title="Calendar" subtitle="" />
        <div className="flex items-center justify-center h-96">
          <div className="text-zinc-400">
            {!userId || userLoading ? 'Authenticating...' : 
             riskLoading ? 'Loading settings...' : 'Loading calendar...'}
          </div>
        </div>
      </div>
    );
  }

  // ================================================
  // 🎯 RENDER
  // ================================================

  return (
    <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
      {/* ✅ Impersonation Banner */}
      {isImpersonating && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-yellow-500">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Admin View Mode - Viewing another user's calendar</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <PageTitle title="Performance Calendar" subtitle="Track your trading journey day by day" />
        
        <div className="flex items-center gap-3">
          {/* 🔥 Show current 1R value */}
          <div className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1.5 rounded-lg">
            1R = ${formatNumber(oneR, 2)}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-yellow-500/50 transition-all"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportCalendarData}
            className="border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-yellow-500/50 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Monthly Performance Overview - PREMIUM EDITION */}
      <div 
        className={`transition-all duration-700 transform ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <Card className="rounded-2xl border border-yellow-500/30 backdrop-blur-sm p-6 shadow-[0_8px_32px_rgba(201,166,70,0.2)] relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0B0B0B 0%, #121212 100%)',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 0 40px rgba(201,166,70,0.15)'
          }}
        >
          {/* Trader Level Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border border-yellow-500/40">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">{traderLevel} 🜲</span>
          </div>

          {/* Live Mode Indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
            <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Live Mode</span>
          </div>

          <div className="flex items-center justify-between mb-6 mt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 p-2.5 shadow-lg shadow-yellow-500/30 ring-1 ring-yellow-500/20">
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent uppercase tracking-wide">
                  Monthly Performance Overview
                </h2>
                <p className="text-[10px] text-yellow-500/70 uppercase tracking-widest mt-0.5 font-medium">Premium Analytics Dashboard</p>
              </div>
            </div>
            
            {/* Enhanced AI Performance Narrative Box */}
            <div className="max-w-2xl">
              <div className="rounded-xl border border-blue-500/50 bg-gradient-to-br from-blue-500/15 to-blue-600/5 px-5 py-3.5 backdrop-blur-sm shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-50"></div>
                
                <div className="flex items-start gap-3 relative z-10">
                  <div className="mt-0.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center ring-2 ring-blue-500/20">
                      <Brain className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                      <span className="font-bold text-blue-400">⚡ Performance Narrative:</span> {aiMonthlySummary}
                    </p>
                    <p className="text-[11px] text-blue-400/80 mt-1.5 font-medium">
                      You're outperforming 97% of traders this month. Focus: London mornings are your edge.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Cumulative P&L Curve */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                  Cumulative P&L
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStrategyBreakdown(!showStrategyBreakdown)}
                  className="text-xs text-yellow-500 hover:text-yellow-400 h-7"
                >
                  {showStrategyBreakdown ? 'Hide' : 'Show'} Strategy Split
                </Button>
              </div>

              <MemoizedAreaChart data={cumulativePnLData} />
            </div>

            {/* Performance Radar */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
              <div className="mb-4 relative z-10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Trader Score</p>
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
                  Finotaur Balance
                </h3>
                
                <div className="flex items-end gap-4">
                  <div className="flex items-baseline gap-2">
                    <div className="text-5xl font-black bg-gradient-to-br from-yellow-500 via-yellow-400 to-yellow-600 bg-clip-text text-transparent"
                      style={{ filter: 'drop-shadow(0 2px 8px rgba(201,166,70,0.4))' }}
                    >
                      {finotaurScoreAnimated}
                    </div>
                    <div className="text-xs text-zinc-500 pb-1.5">
                      <div className="font-medium">/ 100</div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    {/* Momentum Indicator */}
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                      momentumChange >= 0 
                        ? 'bg-emerald-500/15 border border-emerald-500/30' 
                        : 'bg-red-500/15 border border-red-500/30'
                    }`}>
                      {momentumChange >= 0 ? (
                        <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span className={`text-xs font-bold ${
                        momentumChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {momentumChange >= 0 ? '+' : ''}{momentumChange}pts
                      </span>
                      <span className="text-[10px] text-zinc-500">vs last month</span>
                    </div>
                    
                    {/* Rank Badge */}
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <Award className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-xs font-bold text-yellow-500">
                        {finotaurScoreAnimated >= 80 ? 'Top 3%' : finotaurScoreAnimated >= 60 ? 'Top 20%' : 'Improving'}
                      </span>
                      <button className="text-[10px] text-yellow-500/70 hover:text-yellow-400 underline transition-colors">
                        View Leaderboard
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <MemoizedRadarChart data={radarData} />
              
              <div className="mt-3 text-center">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {monthStats.avgRR >= 2 && monthStats.consistencyScore >= 80
                    ? 'Excellent R:R ratio — maintain emotional control'
                    : monthStats.avgRR >= 2
                    ? 'Strong R:R, focus on consistency'
                    : 'Improve risk management discipline'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Analytics Overview */}
      <div 
        className={`transition-all duration-700 delay-150 transform ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
      <Card className="rounded-2xl border border-yellow-200/20 bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 p-6">
        {/* KPI Cards Row - 🔥 NOW WITH 6 CARDS INCLUDING AVG R */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          {/* Enhanced Net P&L */}
          <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/60 to-zinc-950/40 p-4 hover:border-yellow-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 group"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Net Performance</span>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mt-0.5">Net P&L</p>
              </div>
              <div className="rounded-lg bg-yellow-500/15 p-2 group-hover:bg-yellow-500/25 transition-colors">
                <DollarSign className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
            <div className={`text-2xl font-black ${monthStats.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
              style={{
                filter: monthStats.netPnL >= 0 
                  ? 'drop-shadow(0 2px 4px rgba(0,196,108,0.3))' 
                  : 'drop-shadow(0 2px 4px rgba(228,69,69,0.3))'
              }}
            >
              {monthStats.netPnL >= 0 ? '+' : ''}${formatNumber(monthStats.netPnL, 0)}
            </div>
            <div className="text-xs text-zinc-500 mt-1.5 font-medium">
              {monthStats.totalTrades} trades executed
            </div>
          </div>

          {/* Enhanced Profit Factor */}
          <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/60 to-zinc-950/40 p-4 hover:border-yellow-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 group"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Risk Efficiency</span>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mt-0.5">Profit Factor</p>
              </div>
              <div className="rounded-lg bg-yellow-500/15 p-2 group-hover:bg-yellow-500/25 transition-colors">
                <Target className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
            <div className="text-2xl font-black text-white"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(255,255,255,0.2))' }}
            >
              {monthStats.profitFactor === 999 ? '∞' : monthStats.profitFactor.toFixed(2)}
            </div>
            <div className={`text-xs mt-1.5 font-medium ${
              monthStats.profitFactor >= 2 ? 'text-emerald-400' : 
              monthStats.profitFactor >= 1.5 ? 'text-yellow-400' : 
              'text-orange-400'
            }`}>
              {monthStats.profitFactor >= 2 ? '🔥 Excellent' : monthStats.profitFactor >= 1.5 ? '✓ Good' : '⚠ Improve'}
            </div>
          </div>

          {/* Enhanced Win Rate */}
          <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/60 to-zinc-950/40 p-4 hover:border-yellow-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 group"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Success Rate</span>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mt-0.5">Win Rate</p>
              </div>
              <div className="rounded-lg bg-emerald-500/15 p-2 group-hover:bg-emerald-500/25 transition-colors">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-2xl font-black text-white"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(255,255,255,0.2))' }}
            >
              {monthStats.winRate.toFixed(0)}%
            </div>
            <div className="text-xs text-zinc-500 mt-1.5 font-medium">
              <span className="text-emerald-400 font-semibold">{monthStats.wins}W</span> / <span className="text-red-400 font-semibold">{monthStats.losses}L</span>
            </div>
          </div>

          {/* Enhanced Avg R:R */}
          <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/60 to-zinc-950/40 p-4 hover:border-yellow-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 group"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Risk Management</span>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mt-0.5">Avg R:R</p>
              </div>
              <div className="rounded-lg bg-blue-500/15 p-2 group-hover:bg-blue-500/25 transition-colors">
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-black text-white"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(255,255,255,0.2))' }}
            >
              1:{monthStats.avgRR.toFixed(2)}
            </div>
            <div className={`text-xs mt-1.5 font-medium ${
              monthStats.avgRR >= 2 ? 'text-emerald-400' : 'text-yellow-400'
            }`}>
              {monthStats.avgRR >= 2 ? '💎 Strong' : '📊 Acceptable'}
            </div>
          </div>

          {/* 🔥 NEW: Avg Actual R Card */}
          <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/60 to-zinc-950/40 p-4 hover:border-yellow-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 group"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Realized</span>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mt-0.5">Avg R</p>
              </div>
              <div className="rounded-lg bg-purple-500/15 p-2 group-hover:bg-purple-500/25 transition-colors">
                <Award className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className={`text-2xl font-black ${monthStats.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(255,255,255,0.2))' }}
            >
              {formatRValue(monthStats.avgR)}
            </div>
            <div className={`text-xs mt-1.5 font-medium ${
              monthStats.avgR >= 1 ? 'text-emerald-400' : 
              monthStats.avgR >= 0 ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {monthStats.avgR >= 1 ? '🎯 Great' : monthStats.avgR >= 0 ? '✓ Positive' : '⚠ Losing'}
            </div>
          </div>

          {/* Enhanced Emotional with Stability Meter */}
          <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/60 to-zinc-950/40 p-4 hover:border-yellow-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 group"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Mental State</span>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mt-0.5">Emotional</p>
              </div>
              <div className="rounded-lg bg-purple-500/15 p-2 group-hover:bg-purple-500/25 transition-colors">
                <Brain className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="text-2xl font-black text-white"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(255,255,255,0.2))' }}
            >
              {monthStats.emotionalStability}
            </div>
            <div className="mt-1.5">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className={`text-[10px] font-bold ${
                  emotionalStabilityChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  Stable (↑ {emotionalStabilityChange}%)
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 mt-0.5">from last week</p>
            </div>
          </div>
        </div>

        {/* Enhanced Finotaur Score Banner */}
        <div className="rounded-xl border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-6 relative overflow-hidden"
          style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 4px 20px rgba(201,166,70,0.2)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5 opacity-50"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 p-2 shadow-lg shadow-yellow-500/20">
                  <Zap className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Finotaur Score</h3>
                  <p className="text-[10px] text-yellow-500/70 uppercase tracking-widest font-medium">Your Trading Edge</p>
                </div>
              </div>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                Your edge comes from <span className="text-yellow-500 font-bold">{monthStats.avgRR >= 2 ? 'high R:R' : 'win rate'}</span> and 
                <span className="text-yellow-500 font-bold"> {monthStats.consistencyScore >= 80 ? 'strong discipline' : 'improving discipline'}</span>
              </p>
              
              {/* Insight of the Month */}
              <div className="mt-4 inline-flex items-start gap-2.5 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">🧩 Insight of the Month</p>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{insightOfMonth}</p>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-6xl font-black bg-gradient-to-br from-yellow-500 via-yellow-400 to-yellow-600 bg-clip-text text-transparent"
                style={{
                  filter: 'drop-shadow(0 4px 12px rgba(201,166,70,0.5))',
                  lineHeight: '1'
                }}
              >
                {finotaurScoreAnimated}
              </div>
              <div className="text-xs text-zinc-400 mt-2 font-medium">out of 100</div>
              
              <button className="mt-3 text-[10px] text-yellow-500 hover:text-yellow-400 font-bold uppercase tracking-wider underline transition-colors">
                View Global Leaderboard →
              </button>
            </div>
          </div>
        </div>
      </Card>
      </div>

      {/* Filters & Controls */}
      <Card className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="text-xl font-bold text-white min-w-[200px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Display Mode */}
          <div className="flex items-center gap-2">
            <Button
              variant={displayMode === "performance" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDisplayMode("performance")}
              className={displayMode === "performance" ? "bg-yellow-500/20 text-yellow-500" : ""}
            >
              Performance
            </Button>
            <Button
              variant={displayMode === "emotion" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDisplayMode("emotion")}
              className={displayMode === "emotion" ? "bg-yellow-500/20 text-yellow-500" : ""}
            >
              Emotion
            </Button>
            <Button
              variant={displayMode === "consistency" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDisplayMode("consistency")}
              className={displayMode === "consistency" ? "bg-yellow-500/20 text-yellow-500" : ""}
            >
              Consistency
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            
            <Select value={filterSession} onValueChange={setFilterSession}>
              <SelectTrigger className="w-[140px] h-9 bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                <SelectItem value="asia">Asia</SelectItem>
                <SelectItem value="london">London</SelectItem>
                <SelectItem value="ny_am">NY AM</SelectItem>
                <SelectItem value="ny_pm">NY PM</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterResult} onValueChange={setFilterResult}>
              <SelectTrigger className="w-[140px] h-9 bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="WIN">Wins</SelectItem>
                <SelectItem value="LOSS">Losses</SelectItem>
                <SelectItem value="BE">Break-even</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Calendar Grid with Weekly Summary */}
      <div 
        className={`transition-all duration-700 delay-300 transform ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex gap-4 items-start">
          {/* Main Calendar */}
          <Card className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex-1">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return (
                    <div 
                      key={`empty-${index}`} 
                      className="aspect-square rounded-xl bg-zinc-950/50"
                    />
                  );
                }

                const dateStr = getLocalDateString(day);
                const dayData = dayDataMap.get(dateStr);
                const isToday = dateStr === getLocalDateString(new Date());
                const isHovered = hoveredDate === dateStr;
                const weekIndex = Math.floor(index / 7);
                const isWeekHovered = hoveredWeek === weekIndex;

                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      if (dayData && dayData.tradeCount > 0) {
                        setSelectedDay(dayData);
                        setModalOpen(true);
                      } else {
                        navigate(`/app/journal/new?date=${dateStr}`);
                      }
                    }}
                    className={`
                      aspect-square rounded-xl border p-2 transition-all duration-200
                      ${getDayColor(dayData, displayMode)}
                      ${isToday ? 'ring-2 ring-yellow-500' : ''}
                      ${isHovered ? 'ring-2 ring-yellow-500 scale-105 shadow-[0_0_25px_rgba(201,166,70,0.5)]' : ''}
                      ${isWeekHovered ? 'ring-2 ring-yellow-500/70 scale-[1.02]' : ''}
                      cursor-pointer hover:scale-105
                      relative group
                    `}
                  >
                    {/* Date */}
                    <div className={`text-xs font-medium mb-1 ${
                      isToday ? 'text-yellow-500' : 'text-zinc-400'
                    }`}>
                      {day.getDate()}
                    </div>

                    {/* Day content */}
                    {dayData && dayData.tradeCount > 0 ? (
                      <>
                        {/* P&L */}
                        <div className={`text-sm font-bold mb-1 ${
                          dayData.netPnL > 0 ? 'text-emerald-400' :
                          dayData.netPnL < 0 ? 'text-red-400' :
                          'text-zinc-400'
                        }`}>
                          {dayData.netPnL > 0 ? '+' : ''}${formatNumber(dayData.netPnL, 0)}
                        </div>

                        {/* Trade count */}
                        <div className="text-[10px] text-zinc-500">
                          {dayData.tradeCount} {dayData.tradeCount === 1 ? 'trade' : 'trades'}
                        </div>

                        {/* Hover tooltip */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl min-w-[200px]">
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Trades:</span>
                                <span className="text-white font-medium">{dayData.tradeCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Win Rate:</span>
                                <span className="text-white font-medium">{dayData.winRate.toFixed(0)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Net P&L:</span>
                                <span className={`font-medium ${
                                  dayData.netPnL > 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  ${formatNumber(dayData.netPnL, 0)}
                                </span>
                              </div>
                              {/* 🔥 NEW: Show Avg R in tooltip */}
                              {dayData.avgR !== 0 && (
                                <div className="flex justify-between">
                                  <span className="text-zinc-400">Avg R:</span>
                                  <span className={`font-medium ${
                                    dayData.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {formatRValue(dayData.avgR)}
                                  </span>
                                </div>
                              )}
                              {dayData.sessions.length > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-zinc-400">Sessions:</span>
                                  <span className="text-white font-medium">
                                    {dayData.sessions.map(s => formatSessionDisplay(s)).join(', ')}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Emotion:</span>
                                <span className="text-white font-medium">{dayData.emotionScore}/100</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Empty day hover hint */
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                          <p className="text-xs text-zinc-300">Click to add trade</p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Weekly Summary Rail - Desktop */}
          <div className="hidden xl:flex flex-col gap-2 w-64 flex-shrink-0">
            {weeklySummaries.map((week, weekIndex) => (
              <div
                key={week.weekNumber}
                onMouseEnter={() => setHoveredWeek(weekIndex)}
                onMouseLeave={() => setHoveredWeek(null)}
                className={`
                  rounded-[18px] border p-3 transition-all duration-200 cursor-pointer
                  ${week.totalPnL > 0 
                    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5' 
                    : week.totalPnL < 0
                    ? 'border-red-500/40 bg-gradient-to-br from-red-500/10 to-red-600/5'
                    : 'border-zinc-800 bg-zinc-900/40'
                  }
                  ${hoveredWeek === weekIndex ? 'ring-2 ring-yellow-500 scale-105 shadow-lg' : ''}
                  hover:border-yellow-500/50
                `}
                style={{
                  height: 'fit-content',
                  minHeight: '120px'
                }}
              >
                <div className="space-y-2">
                  {/* Week Title */}
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                    Week {week.weekNumber}
                  </div>

                  {/* Total PnL */}
                  {week.tradeCount > 0 ? (
                    <>
                      <div className={`text-2xl font-black ${
                        week.totalPnL > 0 ? 'text-emerald-400' : 
                        week.totalPnL < 0 ? 'text-red-400' : 
                        'text-zinc-400'
                      }`}
                        style={{
                          filter: week.totalPnL > 0 
                            ? 'drop-shadow(0 2px 6px rgba(0,196,108,0.4))' 
                            : week.totalPnL < 0
                            ? 'drop-shadow(0 2px 6px rgba(228,69,69,0.4))'
                            : 'none'
                        }}
                      >
                        {week.totalPnL > 0 ? '+' : ''}${formatNumber(week.totalPnL, 0)}
                      </div>

                      {/* 🔥 NEW: Show Avg R for week */}
                      {week.avgR !== 0 && (
                        <div className={`text-sm font-semibold ${
                          week.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {formatRValue(week.avgR)}
                        </div>
                      )}

                      {/* Stats Row */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{week.daysTraded} {week.daysTraded === 1 ? 'day' : 'days'}</span>
                        <span>{week.tradeCount} {week.tradeCount === 1 ? 'trade' : 'trades'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-zinc-600 py-4">No trades</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Summary - Mobile */}
        <div className="xl:hidden mt-4 space-y-2">
          {weeklySummaries.map((week) => (
            <Card
              key={week.weekNumber}
              className={`
                rounded-xl border p-4 transition-all duration-200
                ${week.totalPnL > 0 
                  ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-transparent' 
                  : week.totalPnL < 0
                  ? 'border-red-500/40 bg-gradient-to-r from-red-500/10 to-transparent'
                  : 'border-zinc-800 bg-zinc-900/40'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">
                    Week {week.weekNumber}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                    <span>{week.daysTraded} days</span>
                    <span>•</span>
                    <span>{week.tradeCount} trades</span>
                    {week.avgR !== 0 && (
                      <>
                        <span>•</span>
                        <span className={week.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatRValue(week.avgR)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {week.tradeCount > 0 && (
                  <div className={`text-xl font-black ${
                    week.totalPnL > 0 ? 'text-emerald-400' : 
                    week.totalPnL < 0 ? 'text-red-400' : 
                    'text-zinc-400'
                  }`}>
                    {week.totalPnL > 0 ? '+' : ''}${formatNumber(week.totalPnL, 0)}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div 
        className={`transition-all duration-700 delay-[450ms] transform ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <Card className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-blue-500/20 p-3">
              <Brain className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">AI Insights</h3>
              <div className="space-y-2 text-sm text-zinc-300">
                {monthStats.consistencyScore > 80 && (
                  <p>✨ Your consistency improved significantly this month. Keep following your plan!</p>
                )}
                {monthStats.winRate > 60 && (
                  <p>🎯 High win rate detected. Your setups are working well.</p>
                )}
                {monthStats.avgRR >= 2 && (
                  <p>💎 Excellent risk/reward management. This is your edge.</p>
                )}
                {/* 🔥 NEW: Insight based on avgR */}
                {monthStats.avgR >= 1 && (
                  <p>🚀 Great average R! You're capturing more than your planned risk on average.</p>
                )}
                {monthStats.avgR < 0 && monthStats.avgR !== 0 && (
                  <p>⚠️ Negative average R detected. Review your exit strategy and trade management.</p>
                )}
                {monthStats.emotionalStability < 70 && (
                  <p>⚠️ Emotional trades detected. Consider taking breaks after losses.</p>
                )}
                {monthStats.profitFactor >= 2 && (
                  <p>🚀 Outstanding profit factor. You're in the top tier of traders.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  {new Date(selectedDay.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 pt-6">
                {/* Summary - 🔥 NOW WITH 5 CARDS INCLUDING AVG R */}
                <div className="grid grid-cols-5 gap-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="text-xs text-zinc-400 mb-1">Total Trades</div>
                    <div className="text-2xl font-bold text-white">{selectedDay.tradeCount}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="text-xs text-zinc-400 mb-1">Win Rate</div>
                    <div className="text-2xl font-bold text-white">{selectedDay.winRate.toFixed(0)}%</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="text-xs text-zinc-400 mb-1">Net P&L</div>
                    <div className={`text-2xl font-bold ${
                      selectedDay.netPnL > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {selectedDay.netPnL > 0 ? '+' : ''}${formatNumber(selectedDay.netPnL, 0)}
                    </div>
                  </div>
                  {/* 🔥 NEW: Avg R Card */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="text-xs text-zinc-400 mb-1">Avg R</div>
                    <div className={`text-2xl font-bold ${
                      selectedDay.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {formatRValue(selectedDay.avgR)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="text-xs text-zinc-400 mb-1">Emotion Score</div>
                    <div className="text-2xl font-bold text-white">{selectedDay.emotionScore}</div>
                  </div>
                </div>

                {/* AI Summary */}
                {selectedDay.topMistake && (
                  <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-white mb-1">Top Mistake</div>
                        <div className="text-sm text-zinc-300 capitalize">
                          {selectedDay.topMistake.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trades List */}
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
                    Trades ({selectedDay.trades.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.trades.map(trade => {
                      const { actualR } = getTradeData(trade, oneR);
                      
                      return (
                        <div 
                          key={trade.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors cursor-pointer"
                          onClick={() => {
                            setModalOpen(false);
                            navigate(`/app/journal/my-trades`);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant={trade.side === "LONG" ? "default" : "destructive"}
                                className={trade.side === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}
                              >
                                {trade.side}
                              </Badge>
                              <span className="font-bold text-white">{trade.symbol}</span>
                              {/* 🔥 Session badge */}
                              {trade.session && (
                                <Badge 
                                  variant="outline"
                                  className={`text-xs ${getSessionColor(trade.session)}`}
                                >
                                  {formatSessionDisplay(trade.session)}
                                </Badge>
                              )}
                              {trade.outcome && (
                                <Badge 
                                  variant={
                                    trade.outcome === "WIN" ? "default" :
                                    trade.outcome === "LOSS" ? "destructive" :
                                    "secondary"
                                  }
                                  className={
                                    trade.outcome === "WIN" ? "bg-emerald-500/20 text-emerald-400" :
                                    trade.outcome === "LOSS" ? "bg-red-500/20 text-red-400" :
                                    "bg-zinc-700/50 text-zinc-400"
                                  }
                                >
                                  {trade.outcome}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {trade.metrics?.rr && (
                                <div className="text-sm">
                                  <span className="text-zinc-400">R:R:</span>
                                  <span className="text-yellow-500 font-medium ml-1">
                                    1:{trade.metrics.rr.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {/* 🔥 NEW: Show Actual R */}
                              {actualR !== null && actualR !== undefined && (
                                <div className="text-sm">
                                  <span className="text-zinc-400">Actual:</span>
                                  <span className={`font-medium ml-1 ${
                                    actualR >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {formatRValue(actualR)}
                                  </span>
                                </div>
                              )}
                              {trade.pnl !== undefined && (
                                <div className={`text-lg font-bold ${
                                  trade.pnl > 0 ? 'text-emerald-400' :
                                  trade.pnl < 0 ? 'text-red-400' :
                                  'text-zinc-400'
                                }`}>
                                  {trade.pnl > 0 ? '+' : ''}${formatNumber(trade.pnl, 0)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}