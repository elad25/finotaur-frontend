import { useState, useEffect } from "react";
import PageTitle from "@/components/PageTitle";
import { Sun, Moon, Eye, Save, Sparkles, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, Brain } from "lucide-react";
import { getTrades } from "@/routes/journal";

interface Scenario {
  type: "bullish" | "bearish" | "neutral";
  entryCondition: string;
  plannedAction: string;
  mentalState: number; // 1-5 scale
  tags: string[];
}

interface DayScenario {
  id: string;
  date: string;
  title: string;
  description: string;
  scenarios: {
    bullish: Scenario;
    bearish: Scenario;
    neutral: Scenario;
  };
  gamePlanNotes: string;
}

interface Trade {
  id: string;
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  pnl?: number;
  exit_price?: number;
  side: "LONG" | "SHORT";
  close_at?: string;
}

interface RealStats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgR: number;
  wins: number;
  losses: number;
  negativeStreak: number;
  scenariosSavedThisWeek: number;
  executionRate: number;
}

export default function JournalScenarios() {
  const [activeTab, setActiveTab] = useState<"bullish" | "bearish" | "neutral">("bullish");
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showGamePlan, setShowGamePlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RealStats>({
    totalTrades: 0,
    winRate: 0,
    totalPnL: 0,
    avgR: 0,
    wins: 0,
    losses: 0,
    negativeStreak: 0,
    scenariosSavedThisWeek: 0,
    executionRate: 0,
  });

  // Available smart tags
  const availableTags = [
    { id: "news", label: "News Catalyst", icon: "📰" },
    { id: "liquidity", label: "Liquidity Zone", icon: "💧" },
    { id: "confirmation", label: "Extra Confirmation", icon: "✓" },
    { id: "high-conviction", label: "High Conviction", icon: "⭐" },
  ];

  // State for current scenario being built
  const [currentScenario, setCurrentScenario] = useState<DayScenario>({
    id: "",
    date: new Date().toISOString().split('T')[0],
    title: "Today's Market Plan",
    description: "",
    scenarios: {
      bullish: {
        type: "bullish",
        entryCondition: "",
        plannedAction: "",
        mentalState: 3,
        tags: []
      },
      bearish: {
        type: "bearish",
        entryCondition: "",
        plannedAction: "",
        mentalState: 3,
        tags: []
      },
      neutral: {
        type: "neutral",
        entryCondition: "",
        plannedAction: "",
        mentalState: 3,
        tags: []
      }
    },
    gamePlanNotes: ""
  });

  // Load real trade data
  useEffect(() => {
    loadTradeData();
  }, []);

  async function loadTradeData() {
    setLoading(true);
    const result = await getTrades();
    if (result.ok && result.data) {
      calculateRealStats(result.data);
    }
    setLoading(false);
  }

  // Calculate real statistics from trades
  function calculateRealStats(trades: Trade[]) {
    const closedTrades = trades.filter(t => t.exit_price !== null && t.exit_price !== undefined);
    const total = closedTrades.length;

    if (total === 0) {
      setStats({
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgR: 0,
        wins: 0,
        losses: 0,
        negativeStreak: 0,
        scenariosSavedThisWeek: 0,
        executionRate: 0,
      });
      return;
    }

    let wins = 0;
    let losses = 0;
    let totalPnL = 0;

    closedTrades.forEach(trade => {
      const pnl = trade.pnl ?? 0;
      totalPnL += pnl;

      if (pnl > 0) {
        wins++;
      } else if (pnl < 0) {
        losses++;
      }
    });

    const winRate = total > 0 ? (wins / total) * 100 : 0;

    // Calculate negative streak (consecutive losses)
    let currentStreak = 0;
    let maxNegativeStreak = 0;
    
    // Sort trades by date (most recent first)
    const sortedTrades = [...closedTrades].sort((a, b) => {
      const dateA = new Date(a.close_at || 0).getTime();
      const dateB = new Date(b.close_at || 0).getTime();
      return dateB - dateA;
    });

    // Count consecutive losses from most recent
    for (const trade of sortedTrades) {
      const pnl = trade.pnl ?? 0;
      if (pnl < 0) {
        currentStreak++;
      } else {
        break; // Stop at first non-loss
      }
    }

    maxNegativeStreak = currentStreak;

    // Calculate scenarios saved this week (from localStorage or API)
    // For now, using a placeholder - you can implement actual storage
    const scenariosSaved = parseInt(localStorage.getItem('scenariosSavedThisWeek') || '0');

    // Calculate execution rate (placeholder - would need scenario execution tracking)
    const executionRate = 67; // You'd calculate this from actual scenario vs execution data

    setStats({
      totalTrades: total,
      winRate: Math.round(winRate),
      totalPnL: totalPnL,
      avgR: 0, // Would need R calculation
      wins,
      losses,
      negativeStreak: maxNegativeStreak,
      scenariosSavedThisWeek: scenariosSaved,
      executionRate: executionRate,
    });
  }

  // AI Risk Assessment based on REAL data
  const getRiskAssessment = () => {
    if (stats.negativeStreak >= 3) {
      return {
        level: "high" as const,
        message: `⚠️ You're in a ${stats.negativeStreak}-trade losing streak. Consider reducing position size by 50% until you break the pattern.`,
        action: "REDUCE_RISK"
      };
    } else if (stats.negativeStreak >= 2) {
      return {
        level: "medium" as const,
        message: "⚡ Two consecutive losses detected. Stay disciplined with your plan and avoid revenge trading.",
        action: "MAINTAIN_DISCIPLINE"
      };
    } else if (stats.winRate < 40 && stats.totalTrades >= 10) {
      return {
        level: "medium" as const,
        message: `📊 Win rate at ${stats.winRate}%. Review your setups and consider trading less until you regain clarity.`,
        action: "REVIEW_STRATEGY"
      };
    }
    return null;
  };

  // AI Smart Insight based on REAL patterns
  const getSmartInsight = () => {
    if (stats.negativeStreak >= 2) {
      return `Currently on a ${stats.negativeStreak}-loss streak. Focus on plan adherence and risk management.`;
    }
    if (stats.winRate > 60 && stats.totalTrades >= 10) {
      return `Strong ${stats.winRate}% win rate. Maintain consistency and stick to your proven setups.`;
    }
    if (stats.winRate < 40 && stats.totalTrades >= 10) {
      return `Win rate at ${stats.winRate}%. Time to review and refine your strategy.`;
    }
    if (stats.totalTrades < 10) {
      return "Build your track record. Focus on quality setups and detailed journaling.";
    }
    return "You tend to skip valid bearish setups on volatile days.";
  };

  const riskAssessment = getRiskAssessment();
  const smartInsight = getSmartInsight();

  const updateScenario = (type: "bullish" | "bearish" | "neutral", field: string, value: any) => {
    setCurrentScenario(prev => ({
      ...prev,
      scenarios: {
        ...prev.scenarios,
        [type]: {
          ...prev.scenarios[type],
          [field]: value
        }
      }
    }));
  };

  const toggleTag = (type: "bullish" | "bearish" | "neutral", tagId: string) => {
    const currentTags = currentScenario.scenarios[type].tags;
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];
    updateScenario(type, "tags", newTags);
  };

  const saveScenario = () => {
    // Save to localStorage (or API)
    const scenarios = JSON.parse(localStorage.getItem('savedScenarios') || '[]');
    scenarios.push({
      ...currentScenario,
      id: Date.now().toString(),
      savedAt: new Date().toISOString()
    });
    localStorage.setItem('savedScenarios', JSON.stringify(scenarios));

    // Update weekly count
    const currentCount = parseInt(localStorage.getItem('scenariosSavedThisWeek') || '0');
    localStorage.setItem('scenariosSavedThisWeek', (currentCount + 1).toString());

    console.log("Saving scenario:", currentScenario);
    alert("Scenario saved successfully! 🎯");
    
    // Reload stats
    loadTradeData();
  };

  const generateAIInsights = () => {
    setShowAIInsights(true);
  };

  const getMentalStateEmoji = (value: number) => {
    const states = ["🛑", "😌", "⚖️", "🎯", "🔥"];
    return states[value - 1] || "⚖️";
  };

  const getMentalStateLabel = (value: number) => {
    const labels = ["No Trade", "Relaxed", "Balanced", "Focused", "Aggressive"];
    return labels[value - 1] || "Balanced";
  };

  const currentScenarioData = currentScenario.scenarios[activeTab];

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <PageTitle title="Scenarios & Plans" subtitle="Plan your trading day ahead" />
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500">Loading data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <PageTitle title="Scenarios & Plans" subtitle="Plan your trading day ahead" />
        <button
          onClick={saveScenario}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-zinc-900 font-medium hover:bg-[#B8941F] transition-all text-sm"
        >
          <Save className="w-4 h-4" />
          <span>Save</span>
        </button>
      </div>

      {/* Smart AI Insight Bar - Based on REAL data */}
      <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 to-indigo-950/40 p-3">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <p className="text-sm text-purple-200">{smartInsight}</p>
        </div>
      </div>

      {/* Risk Alert Banner - Based on REAL data */}
      {riskAssessment && (
        <div className={`rounded-xl border p-3 ${
          riskAssessment.level === "high" 
            ? "bg-red-950/20 border-red-900/50" 
            : "bg-yellow-950/20 border-yellow-900/50"
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              riskAssessment.level === "high" ? "text-red-500" : "text-yellow-500"
            }`} />
            <p className="text-sm font-medium text-zinc-200">{riskAssessment.message}</p>
          </div>
        </div>
      )}

      {/* Mini Dashboard - REAL data */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-xs text-zinc-500 mb-1">Scenarios This Week</div>
          <div className="text-xl font-bold text-[#D4AF37]">{stats.scenariosSavedThisWeek}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-xs text-zinc-500 mb-1">Win Rate</div>
          <div className="text-xl font-bold text-[#D4AF37]">{stats.winRate}%</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-xs text-zinc-500 mb-1">Current Streak</div>
          <div className={`text-xl font-bold ${
            stats.negativeStreak >= 3 ? "text-red-500" : 
            stats.negativeStreak >= 2 ? "text-yellow-500" : 
            stats.negativeStreak === 0 && stats.totalTrades > 0 ? "text-green-500" :
            "text-zinc-500"
          }`}>
            {stats.negativeStreak > 0 ? `-${stats.negativeStreak}` : stats.totalTrades > 0 ? "✓" : "—"}
          </div>
        </div>
      </div>

      {/* Scenario Overview - Cleaner */}
      <div className="rounded-xl border border-[#D4AF37]/20 bg-zinc-900/60 p-5 space-y-3">
        <input
          type="text"
          value={currentScenario.title}
          onChange={(e) => setCurrentScenario(prev => ({ ...prev, title: e.target.value }))}
          className="text-xl font-bold bg-transparent border-none outline-none text-[#D4AF37] w-full placeholder:text-[#D4AF37]/40"
          placeholder="Today's Market Plan"
        />
        <textarea
          value={currentScenario.description}
          onChange={(e) => setCurrentScenario(prev => ({ ...prev, description: e.target.value }))}
          className="w-full bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-zinc-300 text-sm resize-none outline-none focus:border-[#D4AF37]/50 transition-colors"
          rows={2}
          placeholder='e.g., "Nasdaq at key liquidity zone. Looking for short above 18300 if MSS appears..."'
        />
      </div>

      {/* Scenario Builder - Cleaner Tabs */}
      <div className="rounded-xl border border-[#D4AF37]/20 bg-zinc-900/60 overflow-hidden">
        {/* Tabs - More Minimal */}
        <div className="flex border-b border-zinc-800/50">
          <button
            onClick={() => setActiveTab("bullish")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 transition-all text-sm ${
              activeTab === "bullish"
                ? "bg-yellow-950/20 border-b-2 border-yellow-500 text-yellow-400"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
            }`}
          >
            <Sun className="w-4 h-4" />
            <span className="font-medium">Bullish</span>
          </button>
          <button
            onClick={() => setActiveTab("bearish")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 transition-all text-sm ${
              activeTab === "bearish"
                ? "bg-blue-950/20 border-b-2 border-blue-400 text-blue-400"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
            }`}
          >
            <Moon className="w-4 h-4" />
            <span className="font-medium">Bearish</span>
          </button>
          <button
            onClick={() => setActiveTab("neutral")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 transition-all text-sm ${
              activeTab === "neutral"
                ? "bg-zinc-800/30 border-b-2 border-zinc-400 text-zinc-300"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="font-medium">Neutral</span>
          </button>
        </div>

        {/* Tab Content - Unified Trade Logic */}
        <div className="p-5 space-y-5">
          {/* Unified Trade Logic Card */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-zinc-400 mb-2">🟢 Trade Logic</div>
            
            {/* If... */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase tracking-wide">If...</label>
              <textarea
                value={currentScenarioData.entryCondition}
                onChange={(e) => updateScenario(activeTab, "entryCondition", e.target.value)}
                className="w-full bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-zinc-300 text-sm resize-none outline-none focus:border-[#D4AF37]/50 transition-colors"
                rows={2}
                placeholder={activeTab === "neutral" 
                  ? "e.g., Choppy market with no clear direction, major news pending..."
                  : 'e.g., "Liquidity sweep below 18150 followed by MSS upward"'
                }
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent"></div>
            </div>

            {/* Then... */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Then...</label>
              <textarea
                value={currentScenarioData.plannedAction}
                onChange={(e) => updateScenario(activeTab, "plannedAction", e.target.value)}
                className="w-full bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-zinc-300 text-sm resize-none outline-none focus:border-[#D4AF37]/50 transition-colors"
                rows={2}
                placeholder={activeTab === "neutral"
                  ? "What to do instead? Observe, study, review past trades..."
                  : 'e.g., "Long entry from 18170, target 18300, stop 18140"'
                }
              />
            </div>
          </div>

          {/* Mental State - Slider with Emojis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-400">Mental State</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getMentalStateEmoji(currentScenarioData.mentalState)}</span>
                <span className="text-sm text-zinc-500">{getMentalStateLabel(currentScenarioData.mentalState)}</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={currentScenarioData.mentalState}
              onChange={(e) => updateScenario(activeTab, "mentalState", parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#D4AF37] [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>No Trade</span>
              <span>Balanced</span>
              <span>Aggressive</span>
            </div>
          </div>

          {/* Smart Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Smart Tags</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(activeTab, tag.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    currentScenarioData.tags.includes(tag.id)
                      ? "bg-[#D4AF37] text-zinc-900"
                      : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Game Plan Notes - Collapsible */}
      <div className="rounded-xl border border-[#D4AF37]/20 bg-zinc-900/60 overflow-hidden">
        <button
          onClick={() => setShowGamePlan(!showGamePlan)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <h3 className="text-sm font-semibold text-[#D4AF37]">Game Plan Notes</h3>
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showGamePlan ? "rotate-180" : ""}`} />
        </button>
        
        {showGamePlan && (
          <div className="p-4 pt-0 space-y-3">
            <textarea
              value={currentScenario.gamePlanNotes}
              onChange={(e) => setCurrentScenario(prev => ({ ...prev, gamePlanNotes: e.target.value }))}
              className="w-full bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-zinc-300 text-sm resize-none outline-none focus:border-[#D4AF37]/50 transition-colors"
              rows={5}
              placeholder="• What's my goal today?&#10;• What am I NOT doing today?&#10;• Yesterday's mistakes to avoid?&#10;• Key levels to watch..."
            />
            
            <button
              onClick={generateAIInsights}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-all text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Insights</span>
            </button>
          </div>
        )}
      </div>

      {/* AI Insights Panel - Based on REAL patterns */}
      {showAIInsights && (
        <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 to-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-semibold text-purple-300">AI Insights</h3>
          </div>
          
          <div className="space-y-3 text-sm text-zinc-300">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
              <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <p><strong>Performance Overview:</strong> {stats.totalTrades} closed trades with {stats.winRate}% win rate. {stats.wins} wins, {stats.losses} losses.</p>
            </div>
            
            {stats.negativeStreak >= 2 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-950/30 border border-red-900/50">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p><strong>Streak Alert:</strong> You're on a {stats.negativeStreak}-loss streak. Consider reducing position size and reviewing your entry criteria.</p>
              </div>
            )}

            {stats.winRate < 40 && stats.totalTrades >= 10 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-950/30 border border-yellow-900/50">
                <TrendingDown className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p><strong>Strategy Review:</strong> Win rate at {stats.winRate}%. Focus on high-probability setups and tighten your criteria.</p>
              </div>
            )}

            {stats.winRate >= 60 && stats.totalTrades >= 10 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-950/30 border border-green-900/50">
                <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong>Strong Performance:</strong> Excellent {stats.winRate}% win rate! Keep following your process and avoid overtrading.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}