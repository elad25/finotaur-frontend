import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, TrendingUp, Calendar, Filter, BarChart3, Loader2, FileText, Target, AlertTriangle, TrendingDown, Brain, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTrades } from "@/routes/journal";
import { formatNumber } from "@/utils/smartCalc";
import { getStrategyName } from "@/utils/storage";

// Types remain the same...
interface Trade {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  stop_price: number;
  take_profit_price?: number;
  exit_price?: number;
  quantity: number;
  fees: number;
  open_at: string;
  close_at?: string;
  session?: string;
  strategy?: string;
  setup?: string;
  notes?: string;
  screenshot_url?: string;
  asset_class?: string;
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  pnl?: number;
  quality_tag?: string;
  metrics?: {
    rr?: number;
    riskUSD?: number;
    rewardUSD?: number;
    riskPts?: number;
    rewardPts?: number;
  };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isFullAnalysis?: boolean;
}

interface StatsData {
  totalTrades: number;
  winRate: number;
  avgRR: number;
  profitFactor: number;
  expectancy: number;
  netPnl: number;
  maxDrawdown: number;
  wins: number;
  losses: number;
  breakeven: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

interface PsychologicalInsight {
  type: "warning" | "positive" | "critical";
  title: string;
  description: string;
  recommendation: string;
}

interface TradingPattern {
  pattern: string;
  frequency: number;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

export default function JournalAIReviewEnhanced() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [timeRange, setTimeRange] = useState("30d");
  const [groupBy, setGroupBy] = useState("day");
  const [useMyTrades, setUseMyTrades] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTrades();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadTrades() {
    const result = await getTrades();
    if (result.ok && result.data) {
      setTrades(result.data);
    }
  }

  function calculatePnL(trade: Trade): number {
    if (!trade.exit_price) return 0;
    const priceDiff = trade.side === "LONG"
      ? trade.exit_price - trade.entry_price
      : trade.entry_price - trade.exit_price;
    return priceDiff * trade.quantity - trade.fees;
  }

  function getFilteredTrades(): Trade[] {
    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "all":
        return trades;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    return trades.filter(trade => {
      const tradeDate = new Date(trade.open_at);
      return tradeDate >= startDate;
    });
  }

  function calculateStats(tradesData: Trade[]): StatsData {
    const closedTrades = tradesData.filter(t => t.exit_price);
    const total = closedTrades.length;

    if (total === 0) {
      return {
        totalTrades: 0, winRate: 0, avgRR: 0, profitFactor: 0, expectancy: 0, netPnl: 0,
        maxDrawdown: 0, wins: 0, losses: 0, breakeven: 0, avgWin: 0, avgLoss: 0,
        largestWin: 0, largestLoss: 0, consecutiveWins: 0, consecutiveLosses: 0,
      };
    }

    let wins = 0, losses = 0, breakeven = 0, totalPnL = 0, totalWinPnL = 0, totalLossPnL = 0;
    let totalRR = 0, rrCount = 0, runningPnL = 0, maxDrawdown = 0, peak = 0;
    let largestWin = 0, largestLoss = 0, currentWinStreak = 0, currentLossStreak = 0;
    let maxWinStreak = 0, maxLossStreak = 0;

    closedTrades.forEach(trade => {
      const pnl = trade.pnl ?? calculatePnL(trade);
      totalPnL += pnl;
      runningPnL += pnl;

      if (runningPnL > peak) peak = runningPnL;
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      if (pnl > 0) {
        wins++;
        totalWinPnL += pnl;
        if (pnl > largestWin) largestWin = pnl;
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else if (pnl < 0) {
        losses++;
        totalLossPnL += Math.abs(pnl);
        if (Math.abs(pnl) > Math.abs(largestLoss)) largestLoss = pnl;
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      } else {
        breakeven++;
        currentWinStreak = 0;
        currentLossStreak = 0;
      }

      if (trade.metrics?.rr) {
        totalRR += trade.metrics.rr;
        rrCount++;
      }
    });

    const winRate = (wins / total) * 100;
    const avgRR = rrCount > 0 ? totalRR / rrCount : 0;
    const profitFactor = totalLossPnL > 0 ? totalWinPnL / totalLossPnL : 0;
    const expectancy = totalPnL / total;
    const avgWin = wins > 0 ? totalWinPnL / wins : 0;
    const avgLoss = losses > 0 ? totalLossPnL / losses : 0;

    return {
      totalTrades: total, winRate, avgRR, profitFactor, expectancy, netPnl: totalPnL,
      maxDrawdown, wins, losses, breakeven, avgWin, avgLoss, largestWin, largestLoss,
      consecutiveWins: maxWinStreak, consecutiveLosses: maxLossStreak,
    };
  }

  function analyzePsychology(tradesData: Trade[], stats: StatsData): PsychologicalInsight[] {
    const insights: PsychologicalInsight[] = [];

    if (stats.consecutiveLosses >= 3) {
      insights.push({
        type: "critical",
        title: "DANGER: Revenge Trading Pattern",
        description: `Detected ${stats.consecutiveLosses} consecutive losses. This often indicates emotional trading and attempts to "win back" losses.`,
        recommendation: "STOP trading after 2 consecutive losses. Take a 24-hour break before returning."
      });
    }

    if (stats.totalTrades > 50 && timeRange === "7d") {
      insights.push({
        type: "warning",
        title: "WARNING: Overtrading Detected",
        description: `${stats.totalTrades} trades in 7 days is excessive. Quality beats quantity.`,
        recommendation: "Limit to 2-3 high-quality trades per day. Focus only on A+ setups."
      });
    }

    if (stats.avgRR < 1.5 && stats.totalTrades > 10) {
      insights.push({
        type: "warning",
        title: "Suboptimal Risk Management",
        description: `Average R:R of 1:${stats.avgRR.toFixed(2)} is too low. You're risking more than you're gaining.`,
        recommendation: "Never enter a trade with less than 1:2 R:R. Skip it if it doesn't offer at least 1:2."
      });
    }

    if (stats.winRate < 40 && stats.totalTrades > 15) {
      insights.push({
        type: "warning",
        title: "Low Win Rate - Setup Quality Issue",
        description: `${stats.winRate.toFixed(0)}% win rate indicates problems with setup identification or execution.`,
        recommendation: "Review your last 10 losing trades and find the common denominator."
      });
    }

    if (Math.abs(stats.largestLoss) > stats.avgLoss * 3) {
      insights.push({
        type: "critical",
        title: "CRITICAL: Abnormal Loss Detected",
        description: `Loss of $${formatNumber(Math.abs(stats.largestLoss), 2)} is ${(Math.abs(stats.largestLoss) / stats.avgLoss).toFixed(1)}x your average loss.`,
        recommendation: "NEVER move your stop-loss against your position. This is the #1 rule."
      });
    }

    if (stats.consecutiveWins >= 5) {
      insights.push({
        type: "positive",
        title: "🔥 Strong Momentum - In The Zone",
        description: `${stats.consecutiveWins} consecutive wins! You're trading with clarity and discipline.`,
        recommendation: "Keep doing EXACTLY what you've been doing. Don't change anything or get cocky."
      });
    }

    if (stats.profitFactor > 2 && stats.winRate > 55) {
      insights.push({
        type: "positive",
        title: "⭐ Excellent Performance",
        description: "High Profit Factor with solid win rate indicates disciplined, high-quality trading.",
        recommendation: "Consider gradually scaling position sizes by 10-20%. Your system is working."
      });
    }

    return insights;
  }

  function detectPatterns(tradesData: Trade[]): TradingPattern[] {
    const patterns: TradingPattern[] = [];
    const closedTrades = tradesData.filter(t => t.exit_price);
    if (closedTrades.length < 10) return patterns;

    // Time patterns
    const hourlyPerf: Record<string, {wins: number; losses: number; pnl: number}> = {};
    closedTrades.forEach(trade => {
      const hour = new Date(trade.open_at).getHours();
      const key = `${hour}:00`;
      if (!hourlyPerf[key]) hourlyPerf[key] = {wins: 0, losses: 0, pnl: 0};
      const pnl = trade.pnl ?? calculatePnL(trade);
      hourlyPerf[key].pnl += pnl;
      if (pnl > 0) hourlyPerf[key].wins++;
      else if (pnl < 0) hourlyPerf[key].losses++;
    });

    const sortedHours = Object.entries(hourlyPerf).sort((a, b) => b[1].pnl - a[1].pnl);
    if (sortedHours.length > 0) {
      const [hour, data] = sortedHours[0];
      if (data.pnl > 0 && (data.wins + data.losses) >= 3) {
        patterns.push({
          pattern: `Golden Hour: ${hour}`,
          frequency: data.wins + data.losses,
          impact: "positive",
          description: `$${formatNumber(data.pnl, 2)} profit. This is your sweet spot.`
        });
      }
    }

    return patterns;
  }

  function getStatsBySession(tradesData: Trade[]): Array<{session: string; stats: StatsData}> {
    const sessions = ["London", "NY", "Asia", "Other"];
    return sessions.map(session => ({
      session,
      stats: calculateStats(tradesData.filter(t => t.session === session || (session === "Other" && !t.session))),
    })).filter(s => s.stats.totalTrades > 0);
  }

  function getStatsByStrategy(tradesData: Trade[]): Array<{strategy: string; stats: StatsData}> {
    const strategies = new Set(tradesData.map(t => t.strategy).filter(Boolean));
    return Array.from(strategies).map(strategy => ({
      strategy: strategy || "Unknown",
      stats: calculateStats(tradesData.filter(t => t.strategy === strategy)),
    }));
  }

  async function generateFullAnalysis(): Promise<string> {
    const filteredTrades = getFilteredTrades();
    if (filteredTrades.length === 0) {
      return "⚠️ **No trading data available** in selected time range.";
    }

    const stats = calculateStats(filteredTrades);
    const sessionStats = getStatsBySession(filteredTrades);
    const strategyStats = getStatsByStrategy(filteredTrades);
    const psychInsights = analyzePsychology(filteredTrades, stats);
    const patterns = detectPatterns(filteredTrades);
    const timeRangeText = timeRange === "all" ? "All Time" : `Last ${timeRange}`;

    const bestSession = sessionStats.length > 0 
      ? sessionStats.reduce((best, curr) => curr.stats.netPnl > best.stats.netPnl ? curr : best)
      : null;
    
    const bestStrategy = strategyStats.length > 0
      ? strategyStats.reduce((best, curr) => curr.stats.expectancy > best.stats.expectancy ? curr : best)
      : null;

    const drainingStrategies = strategyStats.filter(s => s.stats.netPnl < 0);

    let report = `# 📊 COMPREHENSIVE TRADING ANALYSIS\n`;
    report += `**Period:** ${timeRangeText} | **Generated:** ${new Date().toLocaleString()}\n\n`;
    report += `---\n\n## 🎯 EXECUTIVE SUMMARY\n\n`;
    report += `**Overall:** ${stats.netPnl >= 0 ? '✅ PROFITABLE' : '❌ UNPROFITABLE'}\n\n`;
    report += `**Core Metrics:**\n`;
    report += `• **Net P&L:** ${stats.netPnl >= 0 ? '+' : ''}$${formatNumber(stats.netPnl, 2)}\n`;
    report += `• **Total Trades:** ${stats.totalTrades} (${stats.wins}W/${stats.losses}L/${stats.breakeven}BE)\n`;
    report += `• **Win Rate:** ${stats.winRate.toFixed(1)}%\n`;
    report += `• **Profit Factor:** ${stats.profitFactor.toFixed(2)}\n`;
    report += `• **Expectancy:** $${stats.expectancy.toFixed(2)}/trade\n`;
    report += `• **Avg R:R:** 1:${stats.avgRR.toFixed(2)}\n`;
    report += `• **Max Drawdown:** $${formatNumber(stats.maxDrawdown, 2)}\n`;
    report += `• **Win Streak:** ${stats.consecutiveWins} | **Loss Streak:** ${stats.consecutiveLosses}\n\n`;

    let grade = "F", gradeEmoji = "❌", gradeDesc = "";
    if (stats.profitFactor > 2.5 && stats.winRate > 60) {
      grade = "A+"; gradeEmoji = "🏆"; gradeDesc = "Exceptional - Professional level!";
    } else if (stats.profitFactor > 2 && stats.winRate > 55) {
      grade = "A"; gradeEmoji = "⭐"; gradeDesc = "Excellent - Keep it up!";
    } else if (stats.profitFactor > 1.5 && stats.winRate > 50) {
      grade = "B"; gradeEmoji = "✅"; gradeDesc = "Good with room for improvement.";
    } else if (stats.profitFactor > 1) {
      grade = "C-D"; gradeEmoji = "⚠️"; gradeDesc = "Profitable but needs work.";
    } else {
      grade = "F"; gradeEmoji = "❌"; gradeDesc = "Losing - needs drastic changes.";
    }

    report += `**Grade:** ${gradeEmoji} **${grade}** - ${gradeDesc}\n\n---\n\n`;

    if (psychInsights.length > 0) {
      report += `## 🧠 PSYCHOLOGICAL ANALYSIS\n\n`;
      report += `Identified ${psychInsights.length} behavioral patterns:\n\n`;
      psychInsights.forEach(insight => {
        const icon = insight.type === "critical" ? "🚨" : insight.type === "warning" ? "⚠️" : "✅";
        report += `### ${icon} ${insight.title}\n${insight.description}\n**Action:** ${insight.recommendation}\n\n`;
      });
      report += `---\n\n`;
    }

    if (patterns.length > 0) {
      report += `## 🔍 PATTERN RECOGNITION\n\n`;
      patterns.forEach(p => {
        const icon = p.impact === "positive" ? "✅" : "❌";
        report += `${icon} **${p.pattern}** - ${p.description} (${p.frequency} trades)\n`;
      });
      report += `\n---\n\n`;
    }

    report += `## ⏰ SESSION PERFORMANCE\n\n`;
    if (bestSession) {
      report += `**🏆 BEST: ${bestSession.session}** - $${formatNumber(bestSession.stats.netPnl, 2)} | `;
      report += `${bestSession.stats.winRate.toFixed(0)}% WR | ${bestSession.stats.totalTrades} trades\n\n`;
      sessionStats.forEach(s => {
        const icon = s.stats.netPnl > 0 ? '✅' : '❌';
        report += `${icon} **${s.session}:** $${formatNumber(s.stats.netPnl, 2)} | ${s.stats.winRate.toFixed(0)}% WR\n`;
      });
    } else {
      report += `*No session data. Start tagging trades!*\n`;
    }
    report += `\n---\n\n`;

    report += `## 🎯 STRATEGY PERFORMANCE\n\n`;
    if (bestStrategy) {
      report += `**🏆 TOP: ${getStrategyName(bestStrategy.strategy)}** - `;
      report += `$${bestStrategy.stats.expectancy.toFixed(2)} expectancy | `;
      report += `$${formatNumber(bestStrategy.stats.netPnl, 2)} P&L\n\n`;
      
      if (drainingStrategies.length > 0) {
        report += `**🔴 DRAINING:**\n`;
        drainingStrategies.forEach(s => {
          report += `• ${getStrategyName(s.strategy)}: $${formatNumber(s.stats.netPnl, 2)}\n`;
        });
        report += `\n`;
      }
    }
    report += `---\n\n`;

    report += `## 💡 AI RECOMMENDATIONS\n\n`;
    let priority = 1;
    
    if (stats.profitFactor < 1) {
      report += `**${priority++}. 🚨 STOP & FIX** - You're losing money. Take 3-day break, analyze losses, demo trade before returning.\n\n`;
    }

    if (psychInsights.filter(i => i.type === "critical").length > 0) {
      report += `**${priority++}. 🧠 FIX PSYCHOLOGY** - Stop after 2 losses. Never trade emotionally.\n\n`;
    }

    if (bestSession) {
      report += `**${priority++}. ⏰ FOCUS ON ${bestSession.session}** - Your best session. Trade here exclusively for 2 weeks.\n\n`;
    }

    if (bestStrategy && drainingStrategies.length > 0) {
      report += `**${priority++}. 🎯 MASTER ${getStrategyName(bestStrategy.strategy)}** - STOP trading ${drainingStrategies.map(s => getStrategyName(s.strategy)).join(', ')}.\n\n`;
    }

    if (stats.avgRR < 1.5) {
      report += `**${priority++}. 💰 IMPROVE R:R** - Target minimum 1:2 on every trade. Let winners run.\n\n`;
    }

    report += `## 📋 7-DAY ACTION PLAN\n\n`;
    report += `1. Trade ONLY ${bestSession?.session || 'your best session'}\n`;
    report += `2. Focus on ${bestStrategy ? getStrategyName(bestStrategy.strategy) : 'your best strategy'}\n`;
    report += `3. Maximum ${stats.winRate < 45 ? '2' : '3'} trades/day\n`;
    report += `4. Stop after 2 consecutive losses\n`;
    report += `5. Document every trade with notes\n\n`;

    report += `*Educational purposes only. Always manage risk.*`;
    return report;
  }

  async function generateAIResponse(userMessage: string): Promise<string> {
    const filteredTrades = useMyTrades ? getFilteredTrades() : [];
    const lowerMessage = userMessage.toLowerCase();

    const isDataQuery = 
      ["win rate", "pnl", "profit", "loss", "session", "strategy", "trades", "performance",
       "best", "worst", "average", "expectancy", "drawdown", "psychology", "pattern", "risk"].some(term => lowerMessage.includes(term));

    if (!isDataQuery) {
      return "I'm your AI trading coach. Ask about your trades, risk, sessions, strategies, and performance!";
    }

    if (!useMyTrades || filteredTrades.length === 0) {
      return "Please enable 'Use my trades' and ensure you have data in the selected range.";
    }

    const stats = calculateStats(filteredTrades);
    const timeText = timeRange === "all" ? "all time" : `last ${timeRange}`;

    // Win rate query
    if (lowerMessage.includes("win rate") || lowerMessage.includes("winrate")) {
      return `**Win Rate Analysis** (${timeText})\n\n` +
        `• Win Rate: ${stats.winRate.toFixed(1)}% (${stats.wins}W/${stats.losses}L)\n` +
        `• Profit Factor: ${stats.profitFactor.toFixed(2)}\n` +
        `• Expectancy: $${stats.expectancy.toFixed(2)}/trade\n` +
        `• Net P&L: $${formatNumber(stats.netPnl, 2)}\n\n` +
        `**Action:** ${stats.winRate < 45 ? 'Focus on trade quality. Review losing trades.' : 'Solid! Maintain consistency.'}`;
    }

    // Session query
    if (lowerMessage.includes("session")) {
      const sessionStats = getStatsBySession(filteredTrades);
      if (sessionStats.length === 0) return "No session data. Tag your trades with sessions!";
      
      const best = sessionStats.reduce((b, c) => c.stats.netPnl > b.stats.netPnl ? c : b);
      return `**Session Performance** (${timeText})\n\n` +
        `🏆 **Best: ${best.session}**\n` +
        `• P&L: $${formatNumber(best.stats.netPnl, 2)}\n` +
        `• Win Rate: ${best.stats.winRate.toFixed(1)}%\n` +
        `• Trades: ${best.stats.totalTrades}\n\n` +
        `**Action:** Focus on ${best.session}. Reduce size in weaker sessions.`;
    }

    // Strategy query
    if (lowerMessage.includes("strategy")) {
      const strategyStats = getStatsByStrategy(filteredTrades);
      if (strategyStats.length === 0) return "No strategy data. Tag your trades!";
      
      const best = strategyStats.reduce((b, c) => c.stats.expectancy > b.stats.expectancy ? c : b);
      return `**Strategy Analysis** (${timeText})\n\n` +
        `🏆 **Top: ${getStrategyName(best.strategy)}**\n` +
        `• Expectancy: $${best.stats.expectancy.toFixed(2)}/trade\n` +
        `• P&L: $${formatNumber(best.stats.netPnl, 2)}\n` +
        `• Win Rate: ${best.stats.winRate.toFixed(1)}%\n\n` +
        `**Action:** Master this strategy. Review underperforming ones.`;
    }

    // Default overview
    return `**Trading Insights** (${timeText})\n\n` +
      `${stats.totalTrades} trades analyzed:\n` +
      `• Win Rate: ${stats.winRate.toFixed(1)}%\n` +
      `• Net P&L: $${formatNumber(stats.netPnl, 2)}\n` +
      `• Expectancy: $${stats.expectancy.toFixed(2)}/trade\n\n` +
      `Ask: "What's my best session?" or "Which strategy performs best?"`;
  }

  async function handleFullAnalysis() {
    if (!useMyTrades || getFilteredTrades().length === 0) return;
    setLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Generate full analysis",
      timestamp: new Date(),
      isFullAnalysis: true,
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const report = await generateFullAnalysis();
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: report,
        timestamp: new Date(),
        isFullAnalysis: true,
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await generateAIResponse(input.trim());
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Premium Header */}
      <div className="px-6 py-6 border-b border-zinc-800/50 bg-gradient-to-r from-zinc-900/60 via-zinc-900/40 to-zinc-900/60 backdrop-blur-sm">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
          Your Personal Finotaur AI Coach
        </h1>
        <p className="text-sm text-zinc-400">
          Advanced AI with psychology insights, pattern recognition, risk analysis & personalized recommendations.
        </p>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800/50 bg-gradient-to-r from-zinc-900/60 via-zinc-900/40 to-zinc-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Calendar className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36 h-9 text-xs bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600 transition-colors backdrop-blur-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Filter className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-36 h-9 text-xs bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600 transition-colors backdrop-blur-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">By Day</SelectItem>
              <SelectItem value="week">By Week</SelectItem>
              <SelectItem value="session">By Session</SelectItem>
              <SelectItem value="strategy">By Strategy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant={useMyTrades ? "default" : "outline"}
          size="sm"
          onClick={() => setUseMyTrades(!useMyTrades)}
          className={`h-9 text-xs font-medium transition-all ${
            useMyTrades 
              ? "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black shadow-lg shadow-yellow-500/20" 
              : "bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-900"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
          {useMyTrades ? "Using My Trades" : "Use My Trades"}
        </Button>

        <div className="ml-auto flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/50 backdrop-blur-sm">
            <span className="text-xs text-zinc-400">
              {useMyTrades && `${getFilteredTrades().length} trades loaded`}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 flex items-center justify-center mb-6 shadow-xl border border-yellow-500/30">
              <Sparkles className="w-10 h-10 text-yellow-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Your Personal Finotaur AI Coach
            </h3>
            <p className="text-zinc-400 mb-8 max-w-md text-sm leading-relaxed">
              Advanced AI with psychological insights, pattern recognition, and personalized recommendations.
            </p>
            
            <div className="grid grid-cols-2 gap-3 max-w-2xl mb-6">
              <button
                onClick={() => setInput("What's my win rate and psychology?")}
                className="group px-5 py-3.5 text-sm text-left bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 hover:from-zinc-800 hover:to-zinc-900 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-all backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold text-white">Win Rate & Psychology</span>
                </div>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  Deep dive into mindset
                </span>
              </button>
              <button
                onClick={() => setInput("Which session performs best?")}
                className="group px-5 py-3.5 text-sm text-left bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 hover:from-zinc-800 hover:to-zinc-900 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-all backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-white">Best Session</span>
                </div>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  Find your golden hour
                </span>
              </button>
              <button
                onClick={() => setInput("Analyze my risk and drawdown")}
                className="group px-5 py-3.5 text-sm text-left bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 hover:from-zinc-800 hover:to-zinc-900 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-all backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-white">Risk Analysis</span>
                </div>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  Assess risk exposure
                </span>
              </button>
              <button
                onClick={() => setInput("What patterns do you see?")}
                className="group px-5 py-3.5 text-sm text-left bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 hover:from-zinc-800 hover:to-zinc-900 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-all backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <span className="font-semibold text-white">Pattern Detection</span>
                </div>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  Discover hidden behaviors
                </span>
              </button>
            </div>

            <div className="mt-4">
              <Button
                onClick={handleFullAnalysis}
                disabled={loading || !useMyTrades || getFilteredTrades().length === 0}
                className="h-12 px-8 text-sm font-semibold bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black shadow-2xl shadow-yellow-500/30 transition-all transform hover:scale-105"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Full Comprehensive Analysis
              </Button>
              <p className="text-xs text-zinc-600 mt-3">
                Get an in-depth professional report with AI recommendations
              </p>
            </div>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-4xl rounded-2xl px-5 py-4 shadow-xl ${
                message.role === "user"
                  ? "bg-gradient-to-br from-yellow-500/15 to-yellow-600/10 border border-yellow-500/30 text-white backdrop-blur-sm"
                  : message.isFullAnalysis
                  ? "bg-gradient-to-br from-zinc-900/95 to-zinc-900/80 border border-zinc-700/50 text-zinc-100 backdrop-blur-lg w-full"
                  : "bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 border border-zinc-700/50 text-zinc-100 backdrop-blur-sm"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                  </div>
                  <span className="text-xs font-semibold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                    AI Coach {message.isFullAnalysis && "• Full Analysis"}
                  </span>
                </div>
              )}
              <div className={`text-sm whitespace-pre-wrap leading-relaxed ${message.isFullAnalysis ? 'space-y-2' : ''}`}>
                {message.content}
              </div>
              <div className="text-[10px] text-zinc-500 mt-3 flex items-center gap-2">
                <span>{message.timestamp.toLocaleTimeString()}</span>
                {message.isFullAnalysis && (
                  <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-semibold">
                    COMPREHENSIVE
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-3xl rounded-2xl px-5 py-4 bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 border border-zinc-700/50 backdrop-blur-sm shadow-xl">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                <span className="text-sm text-zinc-300 font-medium">AI is analyzing your data...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-5 border-t border-zinc-800/50 bg-gradient-to-r from-zinc-900/60 via-zinc-900/40 to-zinc-900/60 backdrop-blur-sm">
        <div className="flex gap-3 max-w-5xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your trading: 'What psychological patterns do I have?' or 'Analyze my risk'"
            className="flex-1 h-12 bg-zinc-900/80 border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500/50 rounded-xl backdrop-blur-sm transition-all"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="h-12 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold shadow-lg shadow-yellow-500/20 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Send className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleFullAnalysis}
            disabled={loading || !useMyTrades || getFilteredTrades().length === 0}
            variant="outline"
            className="h-12 px-6 bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 text-white font-semibold backdrop-blur-sm transition-all"
          >
            <FileText className="w-4 h-4 mr-2" />
            Full Analysis
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-3">
          <AlertTriangle className="w-3 h-3 text-zinc-600" />
          <p className="text-[10px] text-zinc-600 text-center">
            Insights are educational; not financial advice. Always manage risk appropriately.
          </p>
        </div>
      </div>
    </div>
  );
}