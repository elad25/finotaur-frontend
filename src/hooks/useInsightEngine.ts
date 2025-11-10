import { useState, useEffect } from "react";

interface TradeData {
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  stopPrice: number;
  takeProfitPrice: number;
  exitPrice?: number;
  quantity: number;
  fees: number;
  multiplier: number;
  rr: number;
  riskUSD: number;
  rewardUSD: number;
}

interface Insight {
  type: "success" | "warning" | "info";
  title: string;
  message: string;
  stats?: {
    rr: number;
    risk: number;
    reward: number;
  };
}

interface PreviousStats {
  avgRR: number;
  winRate: number;
  totalTrades: number;
  lastTradeDate: string;
}

export function useInsightEngine() {
  const [previousStats, setPreviousStats] = useState<PreviousStats | null>(null);

  // Load previous stats from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("tradeStats");
    if (stored) {
      setPreviousStats(JSON.parse(stored));
    }
  }, []);

  const generateInsight = (trade: TradeData): Insight | null => {
    // Don't generate insight for incomplete trades
    if (!trade.entryPrice || !trade.stopPrice || !trade.takeProfitPrice) {
      return null;
    }

    const insights: Insight[] = [];

    // 1. Excellent R:R Insight
    if (trade.rr >= 3) {
      insights.push({
        type: "success",
        title: "⚡️ Exceptional R:R!",
        message: `You risked $${Math.abs(trade.riskUSD).toFixed(0)} for $${trade.rewardUSD.toFixed(0)} — that's a ${trade.rr.toFixed(2)}:1 ratio. This aligns with professional edge building!`,
        stats: {
          rr: Number(trade.rr.toFixed(2)),
          risk: Math.abs(trade.riskUSD),
          reward: trade.rewardUSD
        }
      });
    } else if (trade.rr >= 2) {
      insights.push({
        type: "success",
        title: "✨ Great R:R!",
        message: `Solid risk management! You're risking $${Math.abs(trade.riskUSD).toFixed(0)} for $${trade.rewardUSD.toFixed(0)} potential. This is consistent with your edge.`,
        stats: {
          rr: Number(trade.rr.toFixed(2)),
          risk: Math.abs(trade.riskUSD),
          reward: trade.rewardUSD
        }
      });
    }

    // 2. R:R Warning
    if (trade.rr < 1.5 && trade.rr > 0) {
      insights.push({
        type: "warning",
        title: "⚠️ Low R:R Detected",
        message: `Your R:R is ${trade.rr.toFixed(2)}:1. Consider waiting for setups with at least 2:1 to improve long-term profitability.`,
        stats: {
          rr: Number(trade.rr.toFixed(2)),
          risk: Math.abs(trade.riskUSD),
          reward: trade.rewardUSD
        }
      });
    }

    // 3. Risk Size Feedback
    if (Math.abs(trade.riskUSD) > 1000) {
      insights.push({
        type: "warning",
        title: "🎯 Large Position Alert",
        message: `You're risking $${Math.abs(trade.riskUSD).toFixed(0)} on this trade. Make sure this aligns with your risk management rules.`
      });
    }

    // 4. Comparison with previous trades
    if (previousStats && trade.rr > previousStats.avgRR) {
      const improvement = ((trade.rr - previousStats.avgRR) / previousStats.avgRR * 100).toFixed(0);
      insights.push({
        type: "success",
        title: "📈 Improved Setup Quality!",
        message: `This R:R (${trade.rr.toFixed(2)}:1) is ${improvement}% better than your recent average of ${previousStats.avgRR.toFixed(2)}:1. You're selecting higher-quality setups!`
      });
    }

    // 5. Session consistency
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 9 && hour <= 11) {
      insights.push({
        type: "info",
        title: "🌅 Morning Session",
        message: "Trading during high volatility hours. Stay focused on your strategy and manage emotions."
      });
    }

    // 6. Fees awareness for high-frequency
    if (trade.fees > trade.riskUSD * 0.1) {
      insights.push({
        type: "warning",
        title: "💸 High Fees Impact",
        message: `Fees are ${((trade.fees / Math.abs(trade.riskUSD)) * 100).toFixed(0)}% of your risk. Consider this in your win rate calculation.`
      });
    }

    // Return the most relevant insight
    return insights.length > 0 ? insights[0] : null;
  };

  const generateExitInsight = (trade: TradeData, outcome: "WIN" | "LOSS" | "BE", pnl: number): Insight | null => {
    if (!trade.exitPrice) return null;

    // Calculate actual R achieved
    const actualR = trade.riskUSD !== 0 ? pnl / Math.abs(trade.riskUSD) : 0;

    if (outcome === "WIN") {
      if (actualR >= 2) {
        return {
          type: "success",
          title: "🎯 Winner! Great Execution",
          message: `You captured ${actualR.toFixed(2)}R on this trade! Your discipline paid off with $${pnl.toFixed(0)} profit.`
        };
      } else {
        return {
          type: "success",
          title: "✅ Winner!",
          message: `Profit: $${pnl.toFixed(0)}. You achieved ${actualR.toFixed(2)}R. Consider letting winners run longer next time.`
        };
      }
    }

    // 🔥 NEW: Encouraging loss messages
    if (outcome === "LOSS") {
      const messages = [
        {
          title: "💪 Part of the Journey",
          message: `Trading is a marathon, not a sprint. This ${Math.abs(actualR).toFixed(2)}R loss ($${Math.abs(pnl).toFixed(0)}) is part of the process. Every professional trader has losing trades—it's how you manage them that defines success. Stay disciplined.`
        },
        {
          title: "📊 Loss Managed Properly",
          message: `Your stop worked as planned: ${Math.abs(actualR).toFixed(2)}R loss ($${Math.abs(pnl).toFixed(0)}). This is exactly what risk management is for. Losses are the cost of doing business as a trader. Stick to your plan.`
        },
        {
          title: "🎯 Controlled Risk",
          message: `Loss: $${Math.abs(pnl).toFixed(0)} (${Math.abs(actualR).toFixed(2)}R). Your predetermined stop protected your capital. This is textbook risk management. The best traders respect their stops and move on to the next opportunity.`
        },
        {
          title: "🌱 Learning Opportunity",
          message: `This ${Math.abs(actualR).toFixed(2)}R loss is a data point, not a failure. Review what happened, update your journal, and prepare for the next high-probability setup. Consistency beats perfection.`
        }
      ];

      // Check if loss was larger than expected
      if (Math.abs(actualR) > 1.3) {
        return {
          type: "warning",
          title: "⚠️ Larger Loss Than Planned",
          message: `Loss: $${Math.abs(pnl).toFixed(0)} (${Math.abs(actualR).toFixed(2)}R). This exceeded your planned 1R risk. Review what caused the larger drawdown—slippage, late exit, or moving your stop? Learn and adapt.`
        };
      }

      // Rotate through encouraging messages
      const randomIndex = Math.floor(Math.random() * messages.length);
      return {
        type: "info", // Using "info" instead of "warning" to be more encouraging
        ...messages[randomIndex]
      };
    }

    return null;
  };

  return {
    generateInsight,
    generateExitInsight,
    previousStats
  };
}