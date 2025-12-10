'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SparklineData {
  values: number[];
  trend: 'up' | 'down' | 'flat';
}

interface SentimentData {
  value: number;
  change: number;
  percentile: number;
  trend: 'up' | 'down' | 'neutral';
  summary: string;
  historicalRange?: { min: number; max: number };
  sparkline?: SparklineData;
}

interface ClusterRegime {
  status: 'positive' | 'neutral' | 'negative' | 'warning';
  label: string;
}

interface FearGreedFactors {
  vix: number;
  putCallRatio: number;
  momentum: number;
  breadth: number;
  hySpread: number;
  safeHaven: number;
  liquidity: number;
}

interface RiskScenario {
  probability: number;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface AIInsights {
  todayFocus: string;
  actionableInsight: string;
  watchIndicators: string[];
  riskScenarios: RiskScenario[];
  clusterInsights: Record<string, string>;
}

interface MarketData {
  // AI Layer
  aiInsights: AIInsights;
  
  // Hero
  regime: 'risk-on' | 'risk-off' | 'mixed';
  regimeConfidence: number;
  regimeReason: string;
  
  masterScore: {
    value: number;
    change: number;
    sparkline: SparklineData;
    components: {
      volatility: number;
      credit: number;
      breadth: number;
      positioning: number;
      macro: number;
      crossAsset: number;
    };
  };
  fearGreed: {
    composite: number;
    factors: FearGreedFactors;
    regime: 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed';
  };
  volatility: {
    vix: SentimentData;
    move: SentimentData;
    regime: ClusterRegime;
  };
  breadth: {
    above50MA: SentimentData;
    above200MA: SentimentData;
    advanceDecline: SentimentData;
    newHighsLows: SentimentData;
    megaCapConcentration: SentimentData;
    regime: ClusterRegime;
  };
  positioning: {
    putCallRatio: SentimentData;
    retailVsInstitutional: SentimentData;
    etfFlows: SentimentData;
    dealerGamma: SentimentData;
    regime: ClusterRegime;
  };
  credit: {
    hySpread: SentimentData;
    igSpread: SentimentData;
    cds: SentimentData;
    liquidityIndex: SentimentData;
    repoStress: SentimentData;
    regime: ClusterRegime;
  };
  macro: {
    cesi: SentimentData;
    inflationSurprise: SentimentData;
    pmi: SentimentData;
    recessionProb: SentimentData;
    regime: ClusterRegime;
  };
  crossAsset: {
    safeHavens: { gold: SentimentData; dollar: SentimentData; jpy: SentimentData };
    bonds: { yield10y: SentimentData; yield2y: SentimentData; spread: SentimentData };
    riskAssets: { crypto: SentimentData; tech: SentimentData; smallCap: SentimentData };
    regime: ClusterRegime;
  };
  narrative: {
    flow: string[];
    overallConclusion: string;
    riskBias: 'risk-on' | 'risk-off' | 'mixed';
  };
  lastUpdated: string;
}

type ViewMode = 'retail' | 'institutional' | 'trader' | 'recession';

// ============================================================================
// TOOLTIP DEFINITIONS - Educational content for each metric
// ============================================================================

const METRIC_TOOLTIPS: Record<string, { title: string; description: string; interpretation: string }> = {
  fearGreed: {
    title: 'Fear & Greed Index',
    description: 'Composite index measuring market sentiment across 7 key factors.',
    interpretation: '0-25: Extreme Fear (buy signal), 75-100: Extreme Greed (caution).'
  },
  vix: {
    title: 'VIX (Volatility Index)',
    description: 'Measures expected 30-day S&P 500 volatility derived from options prices.',
    interpretation: 'Below 15: Complacent. 15-25: Normal. Above 25: Elevated fear.'
  },
  move: {
    title: 'MOVE Index',
    description: 'Measures bond market volatility. Often leads equity volatility.',
    interpretation: 'Rising MOVE often precedes equity stress. Watch divergence with VIX.'
  },
  above50MA: {
    title: '% Above 50-Day MA',
    description: 'Percentage of S&P 500 stocks trading above their 50-day moving average.',
    interpretation: 'Above 70%: Healthy rally. Below 30%: Oversold. Watch for divergences.'
  },
  above200MA: {
    title: '% Above 200-Day MA',
    description: 'Long-term trend indicator showing stocks above 200-day moving average.',
    interpretation: 'Above 60%: Bull market. Below 40%: Bear market conditions.'
  },
  advanceDecline: {
    title: 'Advance/Decline Ratio',
    description: 'Ratio of advancing stocks to declining stocks.',
    interpretation: 'Above 1.5: Strong breadth. Below 0.7: Weak internals.'
  },
  megaCapConcentration: {
    title: 'MegaCap Concentration',
    description: 'Percentage of market gains coming from top 7 stocks (Mag7).',
    interpretation: 'Above 50%: Narrow rally (fragile). Below 30%: Healthy breadth.'
  },
  putCallRatio: {
    title: 'Put/Call Ratio',
    description: 'Ratio of put options to call options traded.',
    interpretation: 'Below 0.7: Excessive optimism. Above 1.0: Fear (contrarian bullish).'
  },
  etfFlows: {
    title: 'ETF Flows',
    description: 'Weekly net flows into/out of equity ETFs.',
    interpretation: 'Large inflows: Risk appetite high. Large outflows: Risk aversion.'
  },
  dealerGamma: {
    title: 'Dealer Gamma Exposure',
    description: 'Net gamma exposure of options dealers.',
    interpretation: 'Positive gamma: Dealers suppress volatility. Negative: Amplify moves.'
  },
  hySpread: {
    title: 'High Yield Spread',
    description: 'Yield difference between junk bonds and Treasuries.',
    interpretation: 'Below 350bps: Calm. 350-500: Caution. Above 500: Stress.'
  },
  igSpread: {
    title: 'Investment Grade Spread',
    description: 'Yield spread of investment-grade corporate bonds.',
    interpretation: 'Widening spreads signal credit stress and risk aversion.'
  },
  cds: {
    title: 'Bank CDS Spreads',
    description: 'Cost to insure against default of major banks.',
    interpretation: 'Rising CDS indicates banking system stress concerns.'
  },
  repoStress: {
    title: 'Repo Stress Indicator',
    description: 'Measures stress in overnight funding markets.',
    interpretation: 'Spikes indicate liquidity problems in the financial system.'
  },
  cesi: {
    title: 'Economic Surprise Index',
    description: 'Measures whether economic data beats or misses expectations.',
    interpretation: 'Positive: Economy beating forecasts. Negative: Disappointing.'
  },
  inflationSurprise: {
    title: 'Inflation Surprise Index',
    description: 'Measures whether inflation data beats or misses forecasts.',
    interpretation: 'Negative: Inflation lower than expected (usually bullish).'
  },
  pmi: {
    title: 'Manufacturing PMI',
    description: 'Purchasing Managers Index measuring manufacturing activity.',
    interpretation: 'Above 50: Expansion. Below 50: Contraction.'
  },
  recessionProb: {
    title: 'Recession Probability',
    description: 'Model-based probability of recession in next 12 months.',
    interpretation: 'Below 20%: Low risk. 20-40%: Elevated. Above 40%: High risk.'
  },
  gold: {
    title: 'Gold (Safe Haven)',
    description: 'Traditional safe-haven asset.',
    interpretation: 'Rising gold + falling yields = flight to safety.'
  },
  dollar: {
    title: 'US Dollar Index (DXY)',
    description: 'Measures USD strength against basket of currencies.',
    interpretation: 'Rising in crisis = safe-haven demand. Rising with yields = growth.'
  },
  yield10y: {
    title: '10-Year Treasury Yield',
    description: 'Benchmark long-term interest rate.',
    interpretation: 'Rising: Growth optimism or inflation fears. Falling: Safety bid.'
  },
  crypto: {
    title: 'Bitcoin (Risk Asset)',
    description: 'Leading cryptocurrency, high-beta risk asset.',
    interpretation: 'Strong BTC performance confirms risk-on sentiment.'
  },
};

// ============================================================================
// MOCK DATA
// ============================================================================

const mockMarketData: MarketData = {
  // AI Insights Layer
  aiInsights: {
    todayFocus: 'Credit stress is the key risk to monitor today. While equity volatility stays suppressed and macro data improves, the quiet widening in HY spreads deserves attention. This divergence historically precedes regime shifts.',
    actionableInsight: 'Lean risk-on but with hedges. The setup favors equities short-term, but the credit signal suggests maintaining 5-10% in tail hedges or reducing high-beta credit exposure.',
    watchIndicators: [
      'HY spreads: Break above 380bps = reduce risk',
      'VIX term structure: Inversion = vol regime shift',
      'PMI: Drop below 50 = growth scare',
      'Bank CDS: Spike above 70bps = systemic concern'
    ],
    riskScenarios: [
      { probability: 15, title: 'Credit Contagion', description: 'HY stress spreads to IG → equity selloff → vol spike', impact: 'high' },
      { probability: 25, title: 'Fed Hawkish Surprise', description: 'Stronger data leads to higher-for-longer rates', impact: 'medium' },
      { probability: 60, title: 'Goldilocks Continues', description: 'Soft landing plays out → gradual grind higher', impact: 'low' }
    ],
    clusterInsights: {
      volatility: 'Equity volatility suppressed while bond volatility quietly rises. This divergence often precedes equity vol catch-up. Complacency building.',
      credit: 'HY showing early stress signals while IG remains calm. Bank funding stable. Watch the HY-IG spread differential for contagion risk.',
      breadth: 'Healthy breadth improving. Rally broadening beyond megacaps. This is the type of internal strength that supports sustained moves.',
      positioning: 'Positioning leaning bullish but not extreme. Positive dealer gamma = volatility suppression. No crowded trades detected.',
      macro: 'Goldilocks data: growth surprising to the upside while inflation surprises to the downside. Optimal for risk assets but watch Fed rhetoric.',
      crossAsset: 'Cross-asset confirming risk-on: safe havens retreating, risk assets rallying, yields stable. Coherent picture supports equity upside.'
    }
  },
  
  // Hero Section
  regime: 'risk-on',
  regimeConfidence: 72,
  regimeReason: 'Volatility suppressed + breadth improving + macro accelerating. Credit showing early stress signals worth monitoring.',
  
  masterScore: {
    value: 62,
    change: 3.5,
    sparkline: { values: [55, 54, 56, 58, 59, 61, 62], trend: 'up' },
    components: {
      volatility: 72,
      credit: 58,
      breadth: 68,
      positioning: 55,
      macro: 65,
      crossAsset: 60,
    },
  },
  fearGreed: {
    composite: 58,
    factors: {
      vix: 65,
      putCallRatio: 52,
      momentum: 71,
      breadth: 45,
      hySpread: 60,
      safeHaven: 48,
      liquidity: 63,
    },
    regime: 'greed',
  },
  volatility: {
    vix: { 
      value: 15.2, 
      change: -3.2, 
      percentile: 28, 
      trend: 'down', 
      summary: 'VIX at 3-month lows, complacency building.',
      sparkline: { values: [22, 20, 18, 16, 15, 15, 15], trend: 'down' }
    },
    move: { 
      value: 98.5, 
      change: 2.1, 
      percentile: 45, 
      trend: 'up', 
      summary: 'Bond volatility stable but creeping higher.',
      sparkline: { values: [92, 94, 95, 96, 97, 98, 99], trend: 'up' }
    },
    regime: { status: 'positive', label: 'Low Volatility' },
  },
  breadth: {
    above50MA: { 
      value: 68, 
      change: 3.5, 
      percentile: 65, 
      trend: 'up', 
      summary: '68% of S&P above 50MA - healthy participation.',
      sparkline: { values: [58, 60, 62, 64, 65, 67, 68], trend: 'up' }
    },
    above200MA: { 
      value: 72, 
      change: 1.2, 
      percentile: 70, 
      trend: 'up', 
      summary: 'Long-term trend remains constructive.',
      sparkline: { values: [68, 69, 70, 70, 71, 71, 72], trend: 'up' }
    },
    advanceDecline: { 
      value: 1.45, 
      change: 8.2, 
      percentile: 72, 
      trend: 'up', 
      summary: 'A/D line confirming rally strength.',
      sparkline: { values: [1.20, 1.25, 1.30, 1.35, 1.40, 1.42, 1.45], trend: 'up' }
    },
    newHighsLows: { 
      value: 2.8, 
      change: 15, 
      percentile: 68, 
      trend: 'up', 
      summary: '2.8:1 new highs ratio - bullish expansion.',
      sparkline: { values: [1.8, 2.0, 2.2, 2.4, 2.5, 2.6, 2.8], trend: 'up' }
    },
    megaCapConcentration: { 
      value: 38, 
      change: -5.2, 
      percentile: 55, 
      trend: 'down', 
      summary: 'Rally broadening beyond Mag7.',
      sparkline: { values: [48, 45, 43, 41, 40, 39, 38], trend: 'down' }
    },
    regime: { status: 'positive', label: 'Healthy Breadth' },
  },
  positioning: {
    putCallRatio: { 
      value: 0.72, 
      change: -10, 
      percentile: 35, 
      trend: 'down', 
      summary: 'Put/Call dropping - risk appetite rising.',
      sparkline: { values: [0.85, 0.82, 0.80, 0.78, 0.75, 0.73, 0.72], trend: 'down' }
    },
    retailVsInstitutional: { 
      value: 1.15, 
      change: 4.5, 
      percentile: 62, 
      trend: 'up', 
      summary: 'Retail slightly more aggressive than institutions.',
      sparkline: { values: [1.05, 1.08, 1.10, 1.12, 1.13, 1.14, 1.15], trend: 'up' }
    },
    etfFlows: { 
      value: 4.2, 
      change: 75, 
      percentile: 78, 
      trend: 'up', 
      summary: '$4.2B weekly inflows to equity ETFs.',
      sparkline: { values: [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.2], trend: 'up' }
    },
    dealerGamma: { 
      value: 2.8, 
      change: 12, 
      percentile: 70, 
      trend: 'up', 
      summary: 'Positive gamma - dealers suppressing vol.',
      sparkline: { values: [1.8, 2.0, 2.2, 2.4, 2.5, 2.7, 2.8], trend: 'up' }
    },
    regime: { status: 'neutral', label: 'Balanced Positioning' },
  },
  credit: {
    hySpread: { 
      value: 342, 
      change: 2.4, 
      percentile: 42, 
      trend: 'up', 
      summary: 'HY spreads widening slightly - watch closely.',
      sparkline: { values: [320, 325, 330, 335, 338, 340, 342], trend: 'up' }
    },
    igSpread: { 
      value: 98, 
      change: 2.1, 
      percentile: 38, 
      trend: 'up', 
      summary: 'IG stable, no stress signals.',
      sparkline: { values: [90, 92, 94, 95, 96, 97, 98], trend: 'up' }
    },
    cds: { 
      value: 52, 
      change: -5.5, 
      percentile: 32, 
      trend: 'down', 
      summary: 'Bank CDS tightening - confidence intact.',
      sparkline: { values: [58, 56, 55, 54, 53, 52, 52], trend: 'down' }
    },
    liquidityIndex: { 
      value: 78, 
      change: 2.0, 
      percentile: 72, 
      trend: 'up', 
      summary: 'Liquidity conditions supportive.',
      sparkline: { values: [70, 72, 74, 75, 76, 77, 78], trend: 'up' }
    },
    repoStress: { 
      value: 12, 
      change: -14, 
      percentile: 18, 
      trend: 'down', 
      summary: 'No repo stress detected.',
      sparkline: { values: [18, 16, 15, 14, 13, 12, 12], trend: 'down' }
    },
    regime: { status: 'warning', label: 'Mild Credit Stress' },
  },
  macro: {
    cesi: { 
      value: 28.5, 
      change: 17.3, 
      percentile: 72, 
      trend: 'up', 
      summary: 'Economic data beating expectations.',
      sparkline: { values: [15, 18, 20, 22, 25, 27, 29], trend: 'up' }
    },
    inflationSurprise: { 
      value: -12.3, 
      change: -29, 
      percentile: 35, 
      trend: 'down', 
      summary: 'Inflation coming in below forecasts.',
      sparkline: { values: [5, 2, -2, -5, -8, -10, -12], trend: 'down' }
    },
    pmi: { 
      value: 52.8, 
      change: 1.1, 
      percentile: 58, 
      trend: 'up', 
      summary: 'Manufacturing PMI back in expansion.',
      sparkline: { values: [49, 50, 50, 51, 52, 52, 53], trend: 'up' }
    },
    recessionProb: { 
      value: 18, 
      change: -14.3, 
      percentile: 25, 
      trend: 'down', 
      summary: 'Recession odds declining to 18%.',
      sparkline: { values: [28, 25, 23, 21, 20, 19, 18], trend: 'down' }
    },
    regime: { status: 'positive', label: 'Macro Improving' },
  },
  crossAsset: {
    safeHavens: {
      gold: { 
        value: 2345, 
        change: -0.8, 
        percentile: 85, 
        trend: 'down', 
        summary: 'Gold retreating on risk appetite.',
        sparkline: { values: [2380, 2370, 2365, 2358, 2352, 2348, 2345], trend: 'down' }
      },
      dollar: { 
        value: 104.2, 
        change: 0.3, 
        percentile: 62, 
        trend: 'up', 
        summary: 'DXY stable, slight strength.',
        sparkline: { values: [103.5, 103.7, 103.9, 104.0, 104.1, 104.1, 104.2], trend: 'up' }
      },
      jpy: { 
        value: 149.5, 
        change: 0.5, 
        percentile: 88, 
        trend: 'up', 
        summary: 'Yen weakness continues.',
        sparkline: { values: [147, 148, 148.5, 149, 149.2, 149.4, 149.5], trend: 'up' }
      },
    },
    bonds: {
      yield10y: { 
        value: 4.42, 
        change: 1.1, 
        percentile: 82, 
        trend: 'up', 
        summary: '10Y yield rising - growth optimism.',
        sparkline: { values: [4.30, 4.32, 4.35, 4.38, 4.40, 4.41, 4.42], trend: 'up' }
      },
      yield2y: { 
        value: 4.28, 
        change: 0.7, 
        percentile: 78, 
        trend: 'up', 
        summary: '2Y reflecting Fed path expectations.',
        sparkline: { values: [4.20, 4.22, 4.24, 4.25, 4.26, 4.27, 4.28], trend: 'up' }
      },
      spread: { 
        value: 14, 
        change: 27, 
        percentile: 45, 
        trend: 'up', 
        summary: 'Curve steepening slightly.',
        sparkline: { values: [8, 9, 10, 11, 12, 13, 14], trend: 'up' }
      },
    },
    riskAssets: {
      crypto: { 
        value: 98500, 
        change: 2.1, 
        percentile: 95, 
        trend: 'up', 
        summary: 'BTC at highs - risk-on confirmed.',
        sparkline: { values: [92000, 94000, 95000, 96000, 97000, 98000, 98500], trend: 'up' }
      },
      tech: { 
        value: 21850, 
        change: 1.4, 
        percentile: 92, 
        trend: 'up', 
        summary: 'QQQ leading - growth trade alive.',
        sparkline: { values: [20800, 21000, 21200, 21400, 21600, 21750, 21850], trend: 'up' }
      },
      smallCap: { 
        value: 2280, 
        change: 0.8, 
        percentile: 55, 
        trend: 'up', 
        summary: 'Small caps lagging but participating.',
        sparkline: { values: [2200, 2220, 2240, 2250, 2260, 2270, 2280], trend: 'up' }
      },
    },
    regime: { status: 'positive', label: 'Risk-On' },
  },
  narrative: {
    flow: [
      'Volatility calm',
      'Breadth improving',
      'Credit mildly stressed',
      'Macro accelerating',
      'Risk assets leading'
    ],
    overallConclusion: 'Overall Sentiment: Mixed → slight Risk-On tilt driven by improving breadth and stable volatility, but credit markets show mild stress worth monitoring. Watch HY spreads for deterioration.',
    riskBias: 'risk-on',
  },
  lastUpdated: '2 min ago',
};

// ============================================================================
// API HOOK
// ============================================================================

const useMarketData = () => {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/macro-sentiment`);
      await new Promise(resolve => setTimeout(resolve, 500));
      setData(mockMarketData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getRegimeColors = (regime: 'risk-on' | 'risk-off' | 'mixed') => {
  switch (regime) {
    case 'risk-on': return { bg: '#0A2F1F', border: '#2D5A3D', text: '#4ADE80', glow: 'rgba(74, 222, 128, 0.2)' };
    case 'risk-off': return { bg: '#2F0A0A', border: '#5A2D2D', text: '#F87171', glow: 'rgba(248, 113, 113, 0.2)' };
    case 'mixed': return { bg: '#2F2A0A', border: '#5A4D2D', text: '#FBBF24', glow: 'rgba(251, 191, 36, 0.2)' };
  }
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'positive': '#4ADE80',
    'neutral': '#94A3B8',
    'warning': '#FBBF24',
    'negative': '#F87171',
  };
  return colors[status] || '#94A3B8';
};

const getScoreColor = (score: number): string => {
  if (score >= 70) return '#4ADE80';
  if (score >= 55) return '#FBBF24';
  if (score >= 40) return '#94A3B8';
  return '#F87171';
};

const getSentimentColor = (regime: string): string => {
  const colors: Record<string, string> = {
    'extreme-fear': '#F87171',
    'fear': '#FB923C',
    'neutral': '#94A3B8',
    'greed': '#FBBF24',
    'extreme-greed': '#4ADE80',
  };
  return colors[regime] || '#94A3B8';
};

const getTrendIcon = (trend: 'up' | 'down' | 'neutral'): string => {
  return trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
};

const getTrendColor = (trend: 'up' | 'down' | 'neutral', inverted = false): string => {
  if (inverted) {
    return trend === 'up' ? '#F87171' : trend === 'down' ? '#4ADE80' : '#94A3B8';
  }
  return trend === 'up' ? '#4ADE80' : trend === 'down' ? '#F87171' : '#94A3B8';
};

const getPercentileLabel = (percentile: number): string => {
  if (percentile <= 20) return 'Very Low';
  if (percentile <= 40) return 'Low';
  if (percentile <= 60) return 'Normal';
  if (percentile <= 80) return 'High';
  return 'Very High';
};

const formatValue = (value: number, type: 'percent' | 'number' | 'currency' | 'ratio' | 'bps' | 'yield' = 'number'): string => {
  switch (type) {
    case 'percent': return `${value.toFixed(1)}%`;
    case 'currency': return value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value.toFixed(0)}`;
    case 'ratio': return value.toFixed(2);
    case 'bps': return `${value.toFixed(0)}bps`;
    case 'yield': return `${value.toFixed(2)}%`;
    default: return value >= 1000 ? value.toLocaleString() : value.toFixed(1);
  }
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Sparkline Component
const Sparkline: React.FC<{ data?: SparklineData; width?: number; height?: number; color?: string }> = ({ 
  data, width = 50, height = 20, color 
}) => {
  if (!data) return null;
  
  const { values, trend } = data;
  const lineColor = color || (trend === 'up' ? '#4ADE80' : trend === 'down' ? '#F87171' : '#94A3B8');
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle 
        cx={width}
        cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2}
        r="2"
        fill={lineColor}
      />
    </svg>
  );
};

// Tooltip Component
const Tooltip: React.FC<{ tooltipKey: string; children: React.ReactNode }> = ({ tooltipKey, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltip = METRIC_TOOLTIPS[tooltipKey];

  if (!tooltip) return <>{children}</>;

  return (
    <div 
      className="tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <span className="tooltip-icon">ⓘ</span>
      {isVisible && (
        <div className="tooltip-content">
          <div className="tooltip-title">{tooltip.title}</div>
          <div className="tooltip-description">{tooltip.description}</div>
          <div className="tooltip-interpretation">{tooltip.interpretation}</div>
        </div>
      )}
    </div>
  );
};

// Mode Selector
const ModeSelector: React.FC<{ mode: ViewMode; onChange: (mode: ViewMode) => void }> = ({ mode, onChange }) => {
  const modes: { value: ViewMode; label: string; icon: string }[] = [
    { value: 'retail', label: 'Retail', icon: '👤' },
    { value: 'institutional', label: 'Institutional', icon: '🏛' },
    { value: 'trader', label: 'Trader', icon: '📊' },
    { value: 'recession', label: 'Recession Watch', icon: '⚠️' },
  ];
  
  return (
    <div className="mode-selector">
      {modes.map(m => (
        <button 
          key={m.value}
          className={`mode-btn ${mode === m.value ? 'active' : ''}`}
          onClick={() => onChange(m.value)}
        >
          <span className="mode-icon">{m.icon}</span>
          <span className="mode-label">{m.label}</span>
        </button>
      ))}
    </div>
  );
};

// Hero Section - The Conclusion
const HeroSection: React.FC<{ data: MarketData }> = ({ data }) => {
  const colors = getRegimeColors(data.regime);
  const regimeLabel = data.regime === 'risk-on' ? 'RISK-ON' : data.regime === 'risk-off' ? 'RISK-OFF' : 'MIXED';
  
  const circumference = 2 * Math.PI * 45;
  const progress = (data.masterScore.value / 100) * circumference;
  const scoreColor = getScoreColor(data.masterScore.value);
  
  return (
    <div className="hero-section" style={{ 
      borderColor: colors.border,
      boxShadow: `0 0 60px ${colors.glow}`
    }}>
      <div className="hero-top">
        <div className="regime-badge" style={{ background: colors.bg, borderColor: colors.border }}>
          <span className="regime-label" style={{ color: colors.text }}>{regimeLabel}</span>
          <span className="regime-confidence">{data.regimeConfidence}% confidence</span>
        </div>
        
        <div className="master-score-ring">
          <svg viewBox="0 0 100 100" className="score-ring-svg">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a1a" strokeWidth="6" />
            <circle 
              cx="50" cy="50" r="45" 
              fill="none" 
              stroke={scoreColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              transform="rotate(-90 50 50)"
              style={{ filter: `drop-shadow(0 0 8px ${scoreColor}40)`, transition: 'stroke-dashoffset 1s' }}
            />
          </svg>
          <div className="score-inner">
            <span className="score-number">{data.masterScore.value}</span>
            <span className="score-change" style={{ color: data.masterScore.change >= 0 ? '#4ADE80' : '#F87171' }}>
              {data.masterScore.change >= 0 ? '↑' : '↓'} {Math.abs(data.masterScore.change).toFixed(1)}
            </span>
          </div>
          <div className="score-sparkline">
            <Sparkline data={data.masterScore.sparkline} width={70} height={24} />
          </div>
        </div>
      </div>
      
      <p className="hero-reason">{data.regimeReason}</p>
    </div>
  );
};

// AI Insights Panel
const AIInsightsPanel: React.FC<{ insights: AIInsights }> = ({ insights }) => (
  <div className="ai-insights-section">
    <div className="section-title">
      <span className="title-icon">🧠</span>
      AI Intelligence
    </div>
    
    <div className="insights-grid">
      <div className="insight-card focus">
        <span className="insight-label">🎯 What Matters Today</span>
        <p className="insight-text">{insights.todayFocus}</p>
      </div>
      
      <div className="insight-card action">
        <span className="insight-label">💡 Actionable Insight</span>
        <p className="actionable-text">{insights.actionableInsight}</p>
      </div>
      
      <div className="insight-card watch">
        <span className="insight-label">👁 Watch Indicators</span>
        <div className="watch-list">
          {insights.watchIndicators.map((indicator, i) => (
            <div key={i} className="watch-item">
              <span className="watch-bullet">→</span>
              <span>{indicator}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="insight-card scenarios">
        <span className="insight-label">⚡ Risk Scenarios</span>
        <div className="scenarios-list">
          {insights.riskScenarios.map((scenario, i) => (
            <div key={i} className="scenario-item">
              <div className="scenario-header">
                <span className="scenario-prob">{scenario.probability}%</span>
                <span className={`scenario-impact ${scenario.impact}`}>{scenario.impact.toUpperCase()}</span>
              </div>
              <div className="scenario-title">{scenario.title}</div>
              <div className="scenario-desc">{scenario.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Narrative Flow
const NarrativeFlow: React.FC<{ flow: string[]; riskBias: string }> = ({ flow, riskBias }) => (
  <div className="narrative-flow">
    <div className="narrative-header">
      <span className="narrative-label">Market Narrative</span>
      <span className={`narrative-bias ${riskBias}`}>
        {riskBias.replace('-', ' ').toUpperCase()}
      </span>
    </div>
    <div className="narrative-steps">
      {flow.map((step, idx) => (
        <React.Fragment key={idx}>
          <span className="narrative-step">{step}</span>
          {idx < flow.length - 1 && <span className="narrative-arrow">→</span>}
        </React.Fragment>
      ))}
    </div>
  </div>
);

// Fear & Greed Gauge
const FearGreedGauge: React.FC<{ value: number; regime: string }> = ({ value, regime }) => {
  const rotation = (value / 100) * 180 - 90;
  const regimeLabels: Record<string, string> = {
    'extreme-fear': 'Extreme Fear', 'fear': 'Fear', 'neutral': 'Neutral',
    'greed': 'Greed', 'extreme-greed': 'Extreme Greed',
  };

  return (
    <Tooltip tooltipKey="fearGreed">
      <div className="fear-greed-gauge">
        <svg viewBox="0 0 200 120" className="gauge-svg">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F87171" />
              <stop offset="25%" stopColor="#FB923C" />
              <stop offset="50%" stopColor="#94A3B8" />
              <stop offset="75%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#4ADE80" />
            </linearGradient>
          </defs>
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGradient)" strokeWidth="10" strokeLinecap="round" />
          <g transform={`rotate(${rotation}, 100, 100)`}>
            <line x1="100" y1="100" x2="100" y2="35" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="100" r="8" fill="#D4AF37" />
          </g>
        </svg>
        <div className="gauge-value">
          <span className="value-number">{value}</span>
          <span className="value-regime" style={{ color: getSentimentColor(regime) }}>{regimeLabels[regime]}</span>
        </div>
      </div>
    </Tooltip>
  );
};

// Factor Bar
const FactorBar: React.FC<{ label: string; value: number; tooltipKey?: string }> = ({ label, value, tooltipKey }) => {
  const content = (
    <div className="factor-bar">
      <div className="factor-label">{label}</div>
      <div className="factor-track">
        <div className="factor-fill" style={{ width: `${value}%`, backgroundColor: value < 35 ? '#F87171' : value > 65 ? '#FBBF24' : '#94A3B8' }} />
      </div>
      <div className="factor-value">{value}</div>
    </div>
  );
  return tooltipKey ? <Tooltip tooltipKey={tooltipKey}>{content}</Tooltip> : content;
};

// Cluster Header
const ClusterHeader: React.FC<{ 
  title: string; 
  regime: ClusterRegime;
  aiInsight?: string;
  onExpand?: () => void;
  isExpanded?: boolean;
}> = ({ title, regime, aiInsight, onExpand, isExpanded }) => (
  <div className="panel-header">
    <div className="header-left">
      <span className="regime-dot" style={{ backgroundColor: getStatusColor(regime.status) }} />
      <h3 className="panel-title">{title}</h3>
    </div>
    <div className="header-right">
      <span className="regime-label-badge" style={{ 
        backgroundColor: `${getStatusColor(regime.status)}15`,
        color: getStatusColor(regime.status),
        borderColor: `${getStatusColor(regime.status)}40`
      }}>
        {regime.label}
      </span>
      {onExpand && (
        <button className="expand-btn" onClick={onExpand}>{isExpanded ? '−' : '+'}</button>
      )}
    </div>
  </div>
);

// Enhanced Metric Card with Sparkline
const MetricCard: React.FC<{
  title: string;
  tooltipKey: string;
  value: string;
  change?: number;
  percentile: number;
  trend: 'up' | 'down' | 'neutral';
  summary: string;
  sparkline?: SparklineData;
  invertedTrend?: boolean;
  subtitle?: string;
}> = ({ title, tooltipKey, value, change, percentile, trend, summary, sparkline, invertedTrend = false, subtitle }) => (
  <div className="metric-card">
    <Tooltip tooltipKey={tooltipKey}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {sparkline && <Sparkline data={sparkline} width={40} height={16} />}
      </div>
    </Tooltip>
    {subtitle && <span className="metric-subtitle">{subtitle}</span>}
    <div className="metric-body">
      <span className="metric-value">{value}</span>
      <span className="metric-trend" style={{ color: getTrendColor(trend, invertedTrend) }}>
        {getTrendIcon(trend)}
        {change !== undefined && ` ${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
      </span>
    </div>
    <div className="percentile-bar">
      <div className="percentile-track">
        <div className="percentile-fill" style={{ width: `${percentile}%` }} />
        <div className="percentile-marker" style={{ left: `${percentile}%` }} />
      </div>
      <span className="percentile-label">{getPercentileLabel(percentile)} ({percentile}th)</span>
    </div>
    <p className="metric-summary">{summary}</p>
  </div>
);

// AI Cluster Insight
const AIClusterInsight: React.FC<{ insight: string }> = ({ insight }) => (
  <div className="ai-cluster-insight">
    <span className="insight-icon">🧠</span>
    <span className="insight-text">{insight}</span>
  </div>
);

// Cross-Asset Card
const CrossAssetCard: React.FC<{
  title: string;
  items: Array<{ label: string; value: string; trend: 'up' | 'down' | 'neutral'; change: number; tooltipKey: string; sparkline?: SparklineData }>;
  conclusion: string;
  conclusionType: 'risk-on' | 'risk-off' | 'mixed';
}> = ({ title, items, conclusion, conclusionType }) => (
  <div className="cross-asset-card">
    <h3 className="cross-asset-title">{title}</h3>
    <div className="cross-asset-items">
      {items.map((item, idx) => (
        <Tooltip key={idx} tooltipKey={item.tooltipKey}>
          <div className="cross-asset-item">
            <span className="item-label">{item.label}</span>
            <div className="item-right">
              {item.sparkline && <Sparkline data={item.sparkline} width={35} height={14} />}
              <span className="item-value">{item.value}</span>
              <span className="item-trend" style={{ color: getTrendColor(item.trend) }}>
                {getTrendIcon(item.trend)} {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
              </span>
            </div>
          </div>
        </Tooltip>
      ))}
    </div>
    <div className={`cross-asset-conclusion ${conclusionType}`}>{conclusion}</div>
  </div>
);

// Loading Skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="loading-skeleton">
    <div className="skeleton-hero" />
    <div className="skeleton-grid">
      {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)}
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MacroSentiment() {
  const { data, loading, error, refetch } = useMarketData();
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('retail');

  const togglePanel = (panelId: string) => {
    setExpandedPanels(prev => ({ ...prev, [panelId]: !prev[panelId] }));
  };

  if (loading) return <div className="macro-sentiment-page"><LoadingSkeleton /></div>;
  if (error || !data) return (
    <div className="macro-sentiment-page">
      <div className="error-state">
        <h2>Unable to load market data</h2>
        <p>{error || 'Unknown error'}</p>
        <button onClick={refetch} className="retry-btn">Retry</button>
      </div>
    </div>
  );

  const regimeColors = getRegimeColors(data.regime);

  return (
    <>
      <style>{`
        /* ====== BASE ====== */
        .macro-sentiment-page {
          min-height: 100vh;
          background: #050505;
          color: #e5e5e5;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 20px 24px;
          position: relative;
        }
        
        .macro-sentiment-page::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 500px;
          background: radial-gradient(ellipse at 50% 0%, ${regimeColors.glow} 0%, transparent 70%);
          pointer-events: none;
        }

        /* ====== HEADER ====== */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          position: relative;
          z-index: 1;
        }
        
        .header-left h1 {
          font-size: 22px;
          font-weight: 600;
          color: #D4AF37;
          margin: 0 0 4px 0;
        }
        
        .header-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 11px;
          color: #666;
        }
        
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .live-dot {
          width: 6px;
          height: 6px;
          background: #4ADE80;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        /* ====== MODE SELECTOR ====== */
        .mode-selector {
          display: flex;
          gap: 4px;
          background: #0a0a0a;
          padding: 4px;
          border-radius: 10px;
          border: 1px solid #1a1a1a;
        }
        
        .mode-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: none;
          background: transparent;
          color: #666;
          font-size: 11px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .mode-btn:hover { color: #999; }
        
        .mode-btn.active {
          background: linear-gradient(135deg, #D4AF37 0%, #B8960B 100%);
          color: #000;
          font-weight: 500;
        }
        
        .mode-icon { font-size: 12px; }

        /* ====== HERO SECTION ====== */
        .hero-section {
          background: linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 100%);
          border: 1px solid;
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 24px;
          position: relative;
          z-index: 1;
        }
        
        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .regime-badge {
          padding: 14px 28px;
          border: 2px solid;
          border-radius: 14px;
          text-align: center;
        }
        
        .regime-label {
          display: block;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 2px;
        }
        
        .regime-confidence {
          font-size: 11px;
          color: #888;
          margin-top: 4px;
          display: block;
        }
        
        .master-score-ring {
          text-align: center;
        }
        
        .score-ring-svg {
          width: 100px;
          height: 100px;
        }
        
        .score-inner {
          margin-top: -85px;
          margin-bottom: 20px;
        }
        
        .score-number {
          font-size: 32px;
          font-weight: 700;
          color: #fff;
          display: block;
        }
        
        .score-change {
          font-size: 12px;
          font-weight: 500;
        }
        
        .score-sparkline {
          margin-top: 8px;
        }
        
        .hero-reason {
          font-size: 15px;
          color: #bbb;
          line-height: 1.6;
          margin: 0;
        }

        /* ====== AI INSIGHTS ====== */
        .ai-insights-section {
          margin-bottom: 24px;
        }
        
        .section-title {
          font-size: 12px;
          color: #D4AF37;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .title-icon { font-size: 14px; }
        
        .insights-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .insight-card {
          background: linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 100%);
          border: 1px solid #1a1a1a;
          border-radius: 14px;
          padding: 18px;
        }
        
        .insight-card.focus {
          border-color: rgba(212, 175, 55, 0.3);
          background: linear-gradient(135deg, #0a0a0a 0%, #12100a 100%);
        }
        
        .insight-card.action {
          border-color: rgba(74, 222, 128, 0.2);
        }
        
        .insight-card.watch {
          border-color: rgba(251, 191, 36, 0.2);
        }
        
        .insight-label {
          font-size: 10px;
          color: #D4AF37;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          display: block;
        }
        
        .insight-text {
          font-size: 13px;
          color: #ccc;
          line-height: 1.6;
          margin: 0;
        }
        
        .actionable-text {
          font-size: 14px;
          color: #fff;
          line-height: 1.6;
          font-weight: 500;
          margin: 0;
        }
        
        .watch-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .watch-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: #999;
          padding: 8px 10px;
          background: rgba(0,0,0,0.3);
          border-radius: 6px;
        }
        
        .watch-bullet {
          color: #FBBF24;
          font-weight: 600;
        }
        
        .scenarios-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .scenario-item {
          padding: 10px 12px;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          border: 1px solid #1a1a1a;
        }
        
        .scenario-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        
        .scenario-prob {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
        }
        
        .scenario-impact {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        
        .scenario-impact.high { color: #F87171; }
        .scenario-impact.medium { color: #FBBF24; }
        .scenario-impact.low { color: #4ADE80; }
        
        .scenario-title {
          font-size: 12px;
          font-weight: 600;
          color: #ddd;
          margin-bottom: 4px;
        }
        
        .scenario-desc {
          font-size: 11px;
          color: #777;
        }

        /* ====== NARRATIVE FLOW ====== */
        .narrative-flow {
          background: linear-gradient(90deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.02) 100%);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }
        
        .narrative-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .narrative-label {
          font-size: 11px;
          color: #D4AF37;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .narrative-bias {
          font-size: 10px;
          padding: 4px 12px;
          border-radius: 10px;
          font-weight: 600;
        }
        
        .narrative-bias.risk-on { background: #2D5A3D; color: #4ADE80; }
        .narrative-bias.risk-off { background: #5A2D2D; color: #F87171; }
        .narrative-bias.mixed { background: #5A4D2D; color: #FBBF24; }
        
        .narrative-steps {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .narrative-step {
          font-size: 13px;
          color: #ccc;
          padding: 6px 14px;
          background: rgba(0,0,0,0.4);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        
        .narrative-arrow {
          color: #D4AF37;
          font-size: 14px;
        }

        /* ====== PANELS ====== */
        .sentiment-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .panel-row {
          display: grid;
          gap: 20px;
        }
        
        .headline-row { grid-template-columns: 1.4fr 1fr 1fr; }
        .health-row { grid-template-columns: 1fr 1fr 1fr; }
        .cross-asset-row { grid-template-columns: 1fr; }
        
        .panel {
          background: linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 100%);
          border: 1px solid #1a1a1a;
          border-radius: 14px;
          padding: 18px;
          transition: all 0.3s ease;
        }
        
        .panel:hover {
          border-color: rgba(212, 175, 55, 0.25);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .regime-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
        }
        
        .panel-title {
          font-size: 13px;
          font-weight: 600;
          color: #D4AF37;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin: 0;
        }
        
        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .regime-label-badge {
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 8px;
          font-weight: 500;
          border: 1px solid;
        }
        
        .expand-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #888;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .expand-btn:hover {
          border-color: #D4AF37;
          color: #D4AF37;
        }

        /* ====== AI CLUSTER INSIGHT ====== */
        .ai-cluster-insight {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 14px;
          padding: 12px;
          background: rgba(212, 175, 55, 0.05);
          border-left: 2px solid #D4AF37;
          border-radius: 0 8px 8px 0;
          font-size: 11px;
          color: #999;
          line-height: 1.5;
        }
        
        .ai-cluster-insight .insight-icon {
          font-size: 12px;
          flex-shrink: 0;
        }

        /* ====== TOOLTIP ====== */
        .tooltip-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .tooltip-icon {
          font-size: 10px;
          color: #444;
          cursor: help;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .tooltip-wrapper:hover .tooltip-icon { opacity: 1; }
        
        .tooltip-content {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          width: 280px;
          background: #141414;
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 10px;
          padding: 14px;
          z-index: 1000;
          box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        }
        
        .tooltip-title {
          font-size: 13px;
          font-weight: 600;
          color: #D4AF37;
          margin-bottom: 6px;
        }
        
        .tooltip-description {
          font-size: 12px;
          color: #ccc;
          line-height: 1.4;
          margin-bottom: 8px;
        }
        
        .tooltip-interpretation {
          font-size: 11px;
          color: #888;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
          font-style: italic;
        }

        /* ====== FEAR & GREED GAUGE ====== */
        .fear-greed-gauge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 0;
        }
        
        .gauge-svg { width: 160px; height: 100px; }
        
        .gauge-value { text-align: center; margin-top: 4px; }
        
        .value-number {
          font-size: 38px;
          font-weight: 700;
          color: #D4AF37;
          display: block;
          line-height: 1;
        }
        
        .value-regime {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 2px;
          display: block;
        }

        /* ====== FACTOR BARS ====== */
        .factors-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .factor-bar {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .factor-label {
          font-size: 10px;
          color: #666;
          width: 70px;
        }
        
        .factor-track {
          flex: 1;
          height: 4px;
          background: #1a1a1a;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .factor-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease;
        }
        
        .factor-value {
          font-size: 10px;
          color: #666;
          width: 22px;
          text-align: right;
        }

        /* ====== METRIC CARDS ====== */
        .metrics-grid {
          display: grid;
          gap: 10px;
        }
        
        .metrics-2col { grid-template-columns: 1fr 1fr; }
        .metrics-1col { grid-template-columns: 1fr; }
        
        .metric-card {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.2s;
        }
        
        .metric-card:hover {
          border-color: rgba(212, 175, 55, 0.2);
          transform: translateY(-1px);
        }
        
        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        
        .metric-title {
          font-size: 10px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .metric-subtitle {
          font-size: 9px;
          color: #555;
          display: block;
          margin-bottom: 6px;
        }
        
        .metric-body {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 8px;
        }
        
        .metric-value {
          font-size: 24px;
          font-weight: 600;
          color: #fff;
        }
        
        .metric-trend {
          font-size: 12px;
          font-weight: 500;
        }
        
        .percentile-bar { margin: 8px 0; }
        
        .percentile-track {
          height: 4px;
          background: linear-gradient(90deg, #F87171 0%, #FBBF24 50%, #4ADE80 100%);
          border-radius: 2px;
          position: relative;
          opacity: 0.25;
        }
        
        .percentile-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: transparent;
        }
        
        .percentile-marker {
          width: 3px;
          height: 10px;
          background: #fff;
          border-radius: 2px;
          position: absolute;
          top: -3px;
          transform: translateX(-50%);
          box-shadow: 0 0 8px rgba(255,255,255,0.4);
        }
        
        .percentile-label {
          font-size: 10px;
          color: #666;
          margin-top: 4px;
          display: block;
        }
        
        .metric-summary {
          font-size: 11px;
          color: #666;
          margin: 8px 0 0 0;
          line-height: 1.4;
        }

        /* ====== CROSS-ASSET ====== */
        .cross-asset-panel {
          background: linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 100%);
          border: 1px solid #1a1a1a;
          border-radius: 14px;
          padding: 18px;
        }
        
        .cross-asset-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        
        .cross-asset-card {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        
        .cross-asset-title {
          font-size: 12px;
          color: #D4AF37;
          margin: 0 0 14px 0;
          font-weight: 600;
        }
        
        .cross-asset-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 14px;
        }
        
        .cross-asset-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .item-label {
          font-size: 11px;
          color: #888;
        }
        
        .item-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .item-value {
          font-size: 13px;
          color: #fff;
          font-weight: 500;
        }
        
        .item-trend {
          font-size: 11px;
          font-weight: 500;
        }
        
        .cross-asset-conclusion {
          font-size: 11px;
          font-weight: 500;
          padding: 10px 12px;
          border-radius: 8px;
          text-align: center;
        }
        
        .cross-asset-conclusion.risk-on { background: rgba(74, 222, 128, 0.1); color: #4ADE80; }
        .cross-asset-conclusion.risk-off { background: rgba(248, 113, 113, 0.1); color: #F87171; }
        .cross-asset-conclusion.mixed { background: rgba(148, 163, 184, 0.1); color: #94A3B8; }

        /* ====== OVERALL CONCLUSION ====== */
        .overall-conclusion {
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 14px;
          padding: 22px 26px;
          margin-top: 24px;
        }
        
        .conclusion-label {
          font-size: 10px;
          color: #D4AF37;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
          display: block;
        }
        
        .conclusion-text {
          font-size: 15px;
          color: #ccc;
          line-height: 1.7;
          margin: 0;
        }

        /* ====== LOADING & ERROR ====== */
        .loading-skeleton { padding: 24px; }
        
        .skeleton-hero {
          height: 180px;
          background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 20px;
          margin-bottom: 24px;
        }
        
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        
        .skeleton-card {
          height: 220px;
          background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 14px;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .error-state {
          text-align: center;
          padding: 80px 40px;
        }
        
        .error-state h2 {
          color: #F87171;
          margin-bottom: 10px;
        }
        
        .error-state p {
          color: #888;
          margin-bottom: 20px;
        }
        
        .retry-btn {
          padding: 12px 28px;
          background: #D4AF37;
          border: none;
          border-radius: 10px;
          color: #0a0a0a;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .retry-btn:hover { transform: scale(1.05); }

        /* ====== ANIMATIONS ====== */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .panel { animation: fadeIn 0.4s ease-out forwards; opacity: 0; }
        .headline-row .panel:nth-child(1) { animation-delay: 0.1s; }
        .headline-row .panel:nth-child(2) { animation-delay: 0.15s; }
        .headline-row .panel:nth-child(3) { animation-delay: 0.2s; }
        .health-row .panel:nth-child(1) { animation-delay: 0.25s; }
        .health-row .panel:nth-child(2) { animation-delay: 0.3s; }
        .health-row .panel:nth-child(3) { animation-delay: 0.35s; }

        /* ====== RESPONSIVE ====== */
        @media (max-width: 1200px) {
          .headline-row { grid-template-columns: 1fr 1fr; }
          .health-row { grid-template-columns: 1fr 1fr; }
          .insights-grid { grid-template-columns: 1fr; }
        }
        
        @media (max-width: 768px) {
          .headline-row, .health-row { grid-template-columns: 1fr; }
          .cross-asset-grid { grid-template-columns: 1fr; }
          .metrics-2col { grid-template-columns: 1fr; }
          .page-header { flex-direction: column; gap: 16px; }
          .hero-top { flex-direction: column; align-items: center; gap: 20px; }
          .mode-selector { flex-wrap: wrap; justify-content: center; }
        }
      `}</style>

      <div className="macro-sentiment-page">
        {/* HEADER */}
        <header className="page-header">
          <div className="header-left">
            <h1>Market Intelligence</h1>
            <div className="header-meta">
              <div className="live-indicator">
                <span className="live-dot" />
                <span>Live</span>
              </div>
              <span>Updated {data.lastUpdated}</span>
            </div>
          </div>
          <ModeSelector mode={viewMode} onChange={setViewMode} />
        </header>

        {/* HERO - THE CONCLUSION */}
        <HeroSection data={data} />

        {/* AI INSIGHTS */}
        <AIInsightsPanel insights={data.aiInsights} />

        {/* NARRATIVE FLOW */}
        <NarrativeFlow flow={data.narrative.flow} riskBias={data.narrative.riskBias} />

        <div className="sentiment-grid">
          {/* ROW 1: HEADLINE */}
          <div className="panel-row headline-row">
            {/* Fear & Greed */}
            <div className="panel">
              <ClusterHeader 
                title="Fear & Greed Index"
                regime={{ 
                  status: data.fearGreed.regime.includes('fear') ? 'negative' : data.fearGreed.regime.includes('greed') ? 'positive' : 'neutral',
                  label: data.fearGreed.regime.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
                }}
              />
              <FearGreedGauge value={data.fearGreed.composite} regime={data.fearGreed.regime} />
              <div className="factors-grid">
                <FactorBar label="VIX" value={data.fearGreed.factors.vix} tooltipKey="vix" />
                <FactorBar label="Put/Call" value={data.fearGreed.factors.putCallRatio} tooltipKey="putCallRatio" />
                <FactorBar label="Momentum" value={data.fearGreed.factors.momentum} />
                <FactorBar label="Breadth" value={data.fearGreed.factors.breadth} />
                <FactorBar label="HY Spread" value={data.fearGreed.factors.hySpread} tooltipKey="hySpread" />
                <FactorBar label="Safe Haven" value={data.fearGreed.factors.safeHaven} />
                <FactorBar label="Liquidity" value={data.fearGreed.factors.liquidity} />
              </div>
            </div>

            {/* Volatility */}
            <div className="panel">
              <ClusterHeader title="Volatility & Risk" regime={data.volatility.regime} onExpand={() => togglePanel('volatility')} isExpanded={expandedPanels.volatility} />
              <div className="metrics-grid metrics-1col">
                <MetricCard title="VIX" tooltipKey="vix" value={formatValue(data.volatility.vix.value)} change={data.volatility.vix.change} percentile={data.volatility.vix.percentile} trend={data.volatility.vix.trend} summary={data.volatility.vix.summary} sparkline={data.volatility.vix.sparkline} invertedTrend />
                <MetricCard title="MOVE Index" tooltipKey="move" value={formatValue(data.volatility.move.value)} change={data.volatility.move.change} percentile={data.volatility.move.percentile} trend={data.volatility.move.trend} summary={data.volatility.move.summary} sparkline={data.volatility.move.sparkline} subtitle="Bond Vol" invertedTrend />
              </div>
              <AIClusterInsight insight={data.aiInsights.clusterInsights.volatility} />
            </div>

            {/* Positioning */}
            <div className="panel">
              <ClusterHeader title="Positioning & Flows" regime={data.positioning.regime} onExpand={() => togglePanel('positioning')} isExpanded={expandedPanels.positioning} />
              <div className="metrics-grid metrics-1col">
                <MetricCard title="Put/Call Ratio" tooltipKey="putCallRatio" value={formatValue(data.positioning.putCallRatio.value, 'ratio')} change={data.positioning.putCallRatio.change} percentile={data.positioning.putCallRatio.percentile} trend={data.positioning.putCallRatio.trend} summary={data.positioning.putCallRatio.summary} sparkline={data.positioning.putCallRatio.sparkline} />
                <MetricCard title="ETF Flows" tooltipKey="etfFlows" value={`$${data.positioning.etfFlows.value}B`} change={data.positioning.etfFlows.change} percentile={data.positioning.etfFlows.percentile} trend={data.positioning.etfFlows.trend} summary={data.positioning.etfFlows.summary} sparkline={data.positioning.etfFlows.sparkline} subtitle="Weekly" />
              </div>
              {expandedPanels.positioning && (
                <div className="metrics-grid metrics-1col" style={{ marginTop: 10 }}>
                  <MetricCard title="Dealer Gamma" tooltipKey="dealerGamma" value={`${data.positioning.dealerGamma.value}B`} change={data.positioning.dealerGamma.change} percentile={data.positioning.dealerGamma.percentile} trend={data.positioning.dealerGamma.trend} summary={data.positioning.dealerGamma.summary} sparkline={data.positioning.dealerGamma.sparkline} />
                </div>
              )}
              <AIClusterInsight insight={data.aiInsights.clusterInsights.positioning} />
            </div>
          </div>

          {/* ROW 2: HEALTH */}
          <div className="panel-row health-row">
            {/* Breadth */}
            <div className="panel">
              <ClusterHeader title="Market Breadth" regime={data.breadth.regime} onExpand={() => togglePanel('breadth')} isExpanded={expandedPanels.breadth} />
              <div className="metrics-grid metrics-2col">
                <MetricCard title="Above 50MA" tooltipKey="above50MA" value={formatValue(data.breadth.above50MA.value, 'percent')} change={data.breadth.above50MA.change} percentile={data.breadth.above50MA.percentile} trend={data.breadth.above50MA.trend} summary={data.breadth.above50MA.summary} sparkline={data.breadth.above50MA.sparkline} />
                <MetricCard title="Above 200MA" tooltipKey="above200MA" value={formatValue(data.breadth.above200MA.value, 'percent')} change={data.breadth.above200MA.change} percentile={data.breadth.above200MA.percentile} trend={data.breadth.above200MA.trend} summary={data.breadth.above200MA.summary} sparkline={data.breadth.above200MA.sparkline} />
                <MetricCard title="A/D Ratio" tooltipKey="advanceDecline" value={formatValue(data.breadth.advanceDecline.value, 'ratio')} change={data.breadth.advanceDecline.change} percentile={data.breadth.advanceDecline.percentile} trend={data.breadth.advanceDecline.trend} summary={data.breadth.advanceDecline.summary} sparkline={data.breadth.advanceDecline.sparkline} />
                <MetricCard title="MegaCap %" tooltipKey="megaCapConcentration" value={formatValue(data.breadth.megaCapConcentration.value, 'percent')} change={data.breadth.megaCapConcentration.change} percentile={data.breadth.megaCapConcentration.percentile} trend={data.breadth.megaCapConcentration.trend} summary={data.breadth.megaCapConcentration.summary} sparkline={data.breadth.megaCapConcentration.sparkline} invertedTrend />
              </div>
              <AIClusterInsight insight={data.aiInsights.clusterInsights.breadth} />
            </div>

            {/* Credit */}
            <div className="panel">
              <ClusterHeader title="Credit & Liquidity" regime={data.credit.regime} onExpand={() => togglePanel('credit')} isExpanded={expandedPanels.credit} />
              <div className="metrics-grid metrics-2col">
                <MetricCard title="HY Spread" tooltipKey="hySpread" value={formatValue(data.credit.hySpread.value, 'bps')} change={data.credit.hySpread.change} percentile={data.credit.hySpread.percentile} trend={data.credit.hySpread.trend} summary={data.credit.hySpread.summary} sparkline={data.credit.hySpread.sparkline} invertedTrend />
                <MetricCard title="IG Spread" tooltipKey="igSpread" value={formatValue(data.credit.igSpread.value, 'bps')} change={data.credit.igSpread.change} percentile={data.credit.igSpread.percentile} trend={data.credit.igSpread.trend} summary={data.credit.igSpread.summary} sparkline={data.credit.igSpread.sparkline} invertedTrend />
                <MetricCard title="Bank CDS" tooltipKey="cds" value={formatValue(data.credit.cds.value, 'bps')} change={data.credit.cds.change} percentile={data.credit.cds.percentile} trend={data.credit.cds.trend} summary={data.credit.cds.summary} sparkline={data.credit.cds.sparkline} invertedTrend />
                <MetricCard title="Liquidity" tooltipKey="repoStress" value={formatValue(data.credit.liquidityIndex.value)} change={data.credit.liquidityIndex.change} percentile={data.credit.liquidityIndex.percentile} trend={data.credit.liquidityIndex.trend} summary={data.credit.liquidityIndex.summary} sparkline={data.credit.liquidityIndex.sparkline} />
              </div>
              <AIClusterInsight insight={data.aiInsights.clusterInsights.credit} />
            </div>

            {/* Macro */}
            <div className="panel">
              <ClusterHeader title="Macro Sentiment" regime={data.macro.regime} onExpand={() => togglePanel('macro')} isExpanded={expandedPanels.macro} />
              <div className="metrics-grid metrics-2col">
                <MetricCard title="CESI" tooltipKey="cesi" value={formatValue(data.macro.cesi.value)} change={data.macro.cesi.change} percentile={data.macro.cesi.percentile} trend={data.macro.cesi.trend} summary={data.macro.cesi.summary} sparkline={data.macro.cesi.sparkline} subtitle="Econ Surprise" />
                <MetricCard title="Inflation" tooltipKey="inflationSurprise" value={formatValue(data.macro.inflationSurprise.value)} change={data.macro.inflationSurprise.change} percentile={data.macro.inflationSurprise.percentile} trend={data.macro.inflationSurprise.trend} summary={data.macro.inflationSurprise.summary} sparkline={data.macro.inflationSurprise.sparkline} subtitle="Surprise" invertedTrend />
                <MetricCard title="PMI" tooltipKey="pmi" value={formatValue(data.macro.pmi.value)} change={data.macro.pmi.change} percentile={data.macro.pmi.percentile} trend={data.macro.pmi.trend} summary={data.macro.pmi.summary} sparkline={data.macro.pmi.sparkline} />
                <MetricCard title="Recession" tooltipKey="recessionProb" value={formatValue(data.macro.recessionProb.value, 'percent')} change={data.macro.recessionProb.change} percentile={data.macro.recessionProb.percentile} trend={data.macro.recessionProb.trend} summary={data.macro.recessionProb.summary} sparkline={data.macro.recessionProb.sparkline} subtitle="Probability" invertedTrend />
              </div>
              <AIClusterInsight insight={data.aiInsights.clusterInsights.macro} />
            </div>
          </div>

          {/* ROW 3: CROSS-ASSET */}
          <div className="panel-row cross-asset-row">
            <div className="cross-asset-panel">
              <ClusterHeader title="Cross-Asset Risk Sentiment" regime={data.crossAsset.regime} />
              <div className="cross-asset-grid">
                <CrossAssetCard
                  title="Safe Havens"
                  items={[
                    { label: 'Gold', value: `$${data.crossAsset.safeHavens.gold.value}`, trend: data.crossAsset.safeHavens.gold.trend, change: data.crossAsset.safeHavens.gold.change, tooltipKey: 'gold', sparkline: data.crossAsset.safeHavens.gold.sparkline },
                    { label: 'DXY', value: data.crossAsset.safeHavens.dollar.value.toFixed(1), trend: data.crossAsset.safeHavens.dollar.trend, change: data.crossAsset.safeHavens.dollar.change, tooltipKey: 'dollar', sparkline: data.crossAsset.safeHavens.dollar.sparkline },
                    { label: 'USD/JPY', value: data.crossAsset.safeHavens.jpy.value.toFixed(1), trend: data.crossAsset.safeHavens.jpy.trend, change: data.crossAsset.safeHavens.jpy.change, tooltipKey: 'dollar', sparkline: data.crossAsset.safeHavens.jpy.sparkline },
                  ]}
                  conclusion={data.crossAsset.safeHavens.gold.trend === 'down' ? 'Safe havens retreating → Risk appetite intact' : data.crossAsset.safeHavens.gold.trend === 'up' ? 'Safe havens bid → Caution increasing' : 'Safe havens mixed → No clear signal'}
                  conclusionType={data.crossAsset.safeHavens.gold.trend === 'down' ? 'risk-on' : data.crossAsset.safeHavens.gold.trend === 'up' ? 'risk-off' : 'mixed'}
                />
                <CrossAssetCard
                  title="Bonds & Rates"
                  items={[
                    { label: '10Y Yield', value: `${data.crossAsset.bonds.yield10y.value}%`, trend: data.crossAsset.bonds.yield10y.trend, change: data.crossAsset.bonds.yield10y.change, tooltipKey: 'yield10y', sparkline: data.crossAsset.bonds.yield10y.sparkline },
                    { label: '2Y Yield', value: `${data.crossAsset.bonds.yield2y.value}%`, trend: data.crossAsset.bonds.yield2y.trend, change: data.crossAsset.bonds.yield2y.change, tooltipKey: 'yield10y', sparkline: data.crossAsset.bonds.yield2y.sparkline },
                    { label: '2s10s Spread', value: `${data.crossAsset.bonds.spread.value}bps`, trend: data.crossAsset.bonds.spread.trend, change: data.crossAsset.bonds.spread.change, tooltipKey: 'yield10y', sparkline: data.crossAsset.bonds.spread.sparkline },
                  ]}
                  conclusion={data.crossAsset.bonds.yield10y.trend === 'up' ? 'Yields rising → Growth optimism' : data.crossAsset.bonds.yield10y.trend === 'down' ? 'Yields falling → Flight to safety' : 'Yields stable → Awaiting catalyst'}
                  conclusionType={data.crossAsset.bonds.yield10y.trend === 'up' ? 'risk-on' : 'risk-off'}
                />
                <CrossAssetCard
                  title="Risk Assets"
                  items={[
                    { label: 'BTC', value: `$${(data.crossAsset.riskAssets.crypto.value / 1000).toFixed(1)}K`, trend: data.crossAsset.riskAssets.crypto.trend, change: data.crossAsset.riskAssets.crypto.change, tooltipKey: 'crypto', sparkline: data.crossAsset.riskAssets.crypto.sparkline },
                    { label: 'QQQ', value: data.crossAsset.riskAssets.tech.value.toLocaleString(), trend: data.crossAsset.riskAssets.tech.trend, change: data.crossAsset.riskAssets.tech.change, tooltipKey: 'crypto', sparkline: data.crossAsset.riskAssets.tech.sparkline },
                    { label: 'IWM', value: data.crossAsset.riskAssets.smallCap.value.toLocaleString(), trend: data.crossAsset.riskAssets.smallCap.trend, change: data.crossAsset.riskAssets.smallCap.change, tooltipKey: 'crypto', sparkline: data.crossAsset.riskAssets.smallCap.sparkline },
                  ]}
                  conclusion={data.crossAsset.riskAssets.crypto.trend === 'up' && data.crossAsset.riskAssets.tech.trend === 'up' ? 'Risk assets rallying → Full Risk-On' : data.crossAsset.riskAssets.crypto.trend === 'down' ? 'Risk assets selling → Risk-Off' : 'Risk assets mixed → Selective'}
                  conclusionType={data.crossAsset.riskAssets.crypto.trend === 'up' ? 'risk-on' : data.crossAsset.riskAssets.crypto.trend === 'down' ? 'risk-off' : 'mixed'}
                />
              </div>
              <AIClusterInsight insight={data.aiInsights.clusterInsights.crossAsset} />
            </div>
          </div>

          {/* OVERALL CONCLUSION */}
          <div className="overall-conclusion">
            <span className="conclusion-label">Finotaur System Analysis</span>
            <p className="conclusion-text">{data.narrative.overallConclusion}</p>
          </div>
        </div>
      </div>
    </>
  );
}