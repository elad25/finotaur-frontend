import { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  RefreshCw,
  AlertCircle,
  Database,
  AlertTriangle,
  Waves,
  Info,
  BookOpen,
  Layers,
  PieChart,
  Droplets,
  Scale,
  ChevronRight,
  Gauge,
  GitBranch,
  Radio,
  Star,
  ThermometerSun,
  TrendingUp,
  TrendingDown,
  Zap,
  Link2,
  ArrowRightLeft,
  Divide,
  BarChart2,
  Percent,
  Calculator,
  Sparkles
} from 'lucide-react';

// ==================== CONFIG ====================

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

// ==================== TYPES ====================

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
  assets: MarketAsset[];
}

interface AssetRelationship {
  asset1: string;
  asset2: string;
  relationship: 'positive' | 'negative' | 'neutral';
  correlation: number; // -1 to 1
  status: 'Normal' | 'Unusual' | 'Broken';
  strength: number;
  insight: string;
  impact: string;
  active: boolean;
}

interface RegimeIndicator {
  name: string;
  value: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
}

interface RatioAnalysis {
  ratio: number;
  ratioChange1D: number;
  ratioChange1W: number;
  trend: 'Uptrend' | 'Downtrend' | 'Range' | 'Breakout';
  trendStrength: number;
  status: string;
  zScore: number;
  rateOfChange: number;
  correlation: number;
  interpretation: string;
}

// ==================== HELPER FUNCTIONS ====================

const formatPrice = (price: number | null, symbol: string): string => {
  if (price === null) return '—';
  if (symbol === 'TNX') return price.toFixed(2) + '%';
  if (symbol === 'BTC') return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price > 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return '$' + price.toFixed(2);
};

const formatCacheTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return `${Math.floor(diffMs / (1000 * 60))}m ago`;
};

const getSignalColor = (signal: string): string => {
  switch (signal) {
    case 'bullish': case 'positive': return 'text-emerald-400';
    case 'bearish': case 'negative': return 'text-red-400';
    default: return 'text-slate-400';
  }
};

const getSignalBg = (signal: string): string => {
  switch (signal) {
    case 'bullish': case 'positive': return 'bg-emerald-500/10 border-emerald-500/30';
    case 'bearish': case 'negative': return 'bg-red-500/10 border-red-500/30';
    default: return 'bg-slate-500/10 border-slate-500/30';
  }
};

// Asset metadata for sensitivity tags and roles
const ASSET_META: Record<string, { sensitivity: string; role: string; betaToSPX: number }> = {
  'SPX': { sensitivity: 'Core', role: 'Risk barometer', betaToSPX: 1.0 },
  'NDX': { sensitivity: 'Rate-sensitive', role: 'Growth proxy', betaToSPX: 1.2 },
  'DJI': { sensitivity: 'Cyclical', role: 'Value proxy', betaToSPX: 0.9 },
  'RUT': { sensitivity: 'Rate-sensitive', role: 'Small-cap risk', betaToSPX: 1.3 },
  'VIX': { sensitivity: 'Fear gauge', role: 'Hedge indicator', betaToSPX: -0.8 },
  'TNX': { sensitivity: 'Inflation', role: 'Rate benchmark', betaToSPX: 0.2 },
  'DXY': { sensitivity: 'Liquidity', role: 'FX benchmark', betaToSPX: -0.3 },
  'GC': { sensitivity: 'Inflation hedge', role: 'Safe haven', betaToSPX: -0.1 },
  'CL': { sensitivity: 'Inflation driver', role: 'Growth proxy', betaToSPX: 0.4 },
  'BTC': { sensitivity: 'Risk appetite', role: 'Speculation gauge', betaToSPX: 1.5 },
};

// ==================== ANALYSIS FUNCTIONS ====================

// 1. Asset Relationships with Correlation & Status
const analyzeAssetRelationships = (assets: MarketAsset[]): { relationships: AssetRelationship[]; summary: string } => {
  if (!assets || assets.length === 0) return { relationships: [], summary: '' };
  
  const relationships: AssetRelationship[] = [];
  const getAsset = (symbol: string) => assets.find(a => a.symbol === symbol);
  
  const spx = getAsset('SPX');
  const ndx = getAsset('NDX');
  const vix = getAsset('VIX');
  const tnx = getAsset('TNX');
  const dxy = getAsset('DXY');
  const gold = getAsset('GC');
  const oil = getAsset('CL');
  const btc = getAsset('BTC');

  // Helper to determine relationship status
  const getStatus = (expected: 'positive' | 'negative', actual: 'positive' | 'negative' | 'neutral', strength: number): 'Normal' | 'Unusual' | 'Broken' => {
    if (strength < 20) return 'Normal';
    if (expected === actual) return 'Normal';
    if (actual === 'neutral') return 'Normal';
    return strength > 50 ? 'Broken' : 'Unusual';
  };

  // 1. Yields ↔ Tech (Expected: Inverse)
  const tnxChange = tnx?.dailyChangePercent ?? 0;
  const ndxChange = ndx?.dailyChangePercent ?? 0;
  const yieldsUp = tnxChange > 0.5;
  const yieldsDown = tnxChange < -0.5;
  const techUp = ndxChange > 0.3;
  const techDown = ndxChange < -0.3;
  const yieldTechRel = (yieldsUp && techDown) || (yieldsDown && techUp) ? 'negative' : 
                       (yieldsUp && techUp) || (yieldsDown && techDown) ? 'positive' : 'neutral';
  const yieldTechStrength = Math.min(Math.abs(tnxChange) * 20 + Math.abs(ndxChange) * 15, 100);
  
  relationships.push({
    asset1: '10Y Yield',
    asset2: 'Nasdaq',
    relationship: yieldTechRel,
    correlation: -0.65, // Historical average
    status: getStatus('negative', yieldTechRel, yieldTechStrength),
    strength: yieldTechStrength,
    insight: yieldsUp && techDown 
      ? '⚠️ Rising yields crushing growth — classic rate shock'
      : yieldsDown && techUp 
      ? '✅ Falling yields = growth tailwind'
      : yieldsUp && techUp
      ? '🔥 Growth optimism overriding rate fears — UNUSUAL'
      : '➡️ Yields and tech decoupled',
    impact: yieldsUp && techDown ? 'UW Growth/Tech' : yieldsDown && techUp ? 'OW Tech' : 'Monitor',
    active: Math.abs(tnxChange) > 0.3 || Math.abs(ndxChange) > 0.2
  });

  // 2. Dollar ↔ Gold (Expected: Inverse)
  const dxyChange = dxy?.dailyChangePercent ?? 0;
  const goldChange = gold?.dailyChangePercent ?? 0;
  const dollarUp = dxyChange > 0.2;
  const dollarDown = dxyChange < -0.2;
  const goldUp = goldChange > 0.3;
  const goldDown = goldChange < -0.3;
  const dxyGoldRel = (dollarUp && goldDown) || (dollarDown && goldUp) ? 'negative' : 
                     (dollarUp && goldUp) ? 'positive' : 'neutral';
  const dxyGoldStrength = Math.min(Math.abs(dxyChange) * 30 + Math.abs(goldChange) * 20, 100);
  
  relationships.push({
    asset1: 'Dollar',
    asset2: 'Gold',
    relationship: dxyGoldRel,
    correlation: -0.45,
    status: getStatus('negative', dxyGoldRel, dxyGoldStrength),
    strength: dxyGoldStrength,
    insight: dollarUp && goldDown 
      ? '📉 Strong dollar pushing gold lower — classic inverse'
      : dollarDown && goldUp
      ? '🥇 Weak dollar = gold bid'
      : dollarUp && goldUp
      ? '🛡️ Both rising = flight to safety — UNUSUAL'
      : '➡️ Dollar-gold quiet',
    impact: dollarUp && goldDown ? 'Bearish metals' : dollarDown && goldUp ? 'Bullish metals' : 'Neutral',
    active: Math.abs(dxyChange) > 0.15 || Math.abs(goldChange) > 0.2
  });

  // 3. Oil ↔ Yields (Expected: Positive - inflation link)
  const oilChange = oil?.dailyChangePercent ?? 0;
  const oilSurge = oilChange > 1.5;
  const oilCrash = oilChange < -1.5;
  const oilYieldRel = (oilSurge && yieldsUp) || (oilCrash && yieldsDown) ? 'positive' : 'neutral';
  const oilYieldStrength = Math.min(Math.abs(oilChange) * 15, 100);
  
  relationships.push({
    asset1: 'Oil',
    asset2: 'Yields',
    relationship: oilYieldRel,
    correlation: 0.35,
    status: getStatus('positive', oilYieldRel, oilYieldStrength),
    strength: oilYieldStrength,
    insight: oilSurge && yieldsUp 
      ? '🔥 Oil surge + yields up = INFLATION ALARM'
      : oilSurge
      ? '⛽ Energy rally — watch inflation'
      : oilCrash
      ? '📊 Oil crash — disinflation'
      : '➡️ Energy-yield link quiet',
    impact: oilSurge ? 'Add TIPS, commodities' : 'Monitor',
    active: Math.abs(oilChange) > 1
  });

  // 4. VIX ↔ SPX (Expected: Strong Inverse)
  const vixChange = vix?.dailyChangePercent ?? 0;
  const vixLevel = vix?.price ?? 15;
  const spxChange = spx?.dailyChangePercent ?? 0;
  const vixSpike = vixChange > 8;
  const vixCrush = vixChange < -5;
  const vixSpxRel = (vixSpike && spxChange < 0) || (vixCrush && spxChange > 0) ? 'negative' : 
                   (vixSpike && spxChange > 0) ? 'positive' : 'neutral';
  const vixSpxStrength = Math.min(Math.abs(vixChange) * 5, 100);
  
  // Check for anomaly: VIX up AND SPX up
  const isAnomaly = vixChange > 5 && spxChange > 0.3;
  
  relationships.push({
    asset1: 'VIX',
    asset2: 'S&P 500',
    relationship: vixSpxRel,
    correlation: -0.82,
    status: isAnomaly ? 'Broken' : getStatus('negative', vixSpxRel, vixSpxStrength),
    strength: vixSpxStrength,
    insight: isAnomaly
      ? '🚨 VIX up + SPX up = ANOMALY — hedging into strength'
      : vixSpike 
      ? '🚨 VIX SPIKE — risk-off event'
      : vixCrush && spxChange > 0
      ? '✅ Vol crush + rally = bullish'
      : vixLevel > 25
      ? '⚠️ Elevated fear'
      : vixLevel < 14
      ? '😴 Complacency zone'
      : '➡️ Normal vol',
    impact: isAnomaly ? 'CAUTION - unusual' : vixSpike ? 'REDUCE RISK' : vixLevel < 14 ? 'Buy hedges' : 'Standard',
    active: Math.abs(vixChange) > 5 || vixLevel > 25 || isAnomaly
  });

  // 5. BTC ↔ Risk (Expected: Positive correlation to SPX)
  const btcChange = btc?.dailyChangePercent ?? 0;
  const btcRally = btcChange > 3;
  const btcCrash = btcChange < -4;
  const btcRiskRel = btcRally ? 'positive' : btcCrash ? 'negative' : 'neutral';
  const btcStrength = Math.min(Math.abs(btcChange) * 8, 100);
  
  relationships.push({
    asset1: 'Bitcoin',
    asset2: 'Risk',
    relationship: btcRiskRel,
    correlation: 0.55,
    status: getStatus('positive', btcRiskRel, btcStrength),
    strength: btcStrength,
    insight: btcRally 
      ? '🚀 BTC leading = max risk appetite'
      : btcCrash
      ? '❄️ Crypto dump = risk souring'
      : btcChange > 0
      ? '📈 Crypto positive'
      : '➡️ Crypto neutral',
    impact: btcRally ? 'Full risk' : btcCrash ? 'Reduce spec' : 'Normal',
    active: Math.abs(btcChange) > 2
  });

  // 6. Dollar ↔ Equities (Expected: Inverse)
  const dxySpxRel = (dollarUp && spxChange < 0) || (dollarDown && spxChange > 0) ? 'negative' : 
                    (dollarUp && spxChange > 0) ? 'positive' : 'neutral';
  const dxySpxStrength = Math.min(Math.abs(dxyChange) * 25 + Math.abs(spxChange) * 15, 100);
  
  relationships.push({
    asset1: 'Dollar',
    asset2: 'Equities',
    relationship: dxySpxRel,
    correlation: -0.25,
    status: getStatus('negative', dxySpxRel, dxySpxStrength),
    strength: dxySpxStrength,
    insight: dollarUp && spxChange < 0 
      ? '💪 Strong dollar weighing on stocks'
      : dollarDown && spxChange > 0
      ? '📈 Weak dollar = equity tailwind'
      : '➡️ FX-equity muted',
    impact: dollarUp ? 'UW multinationals' : dollarDown ? 'Add intl' : 'Neutral',
    active: Math.abs(dxyChange) > 0.2
  });

  // Sort by active + strength
  const sorted = relationships.sort((a, b) => {
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    if (a.status === 'Broken' && b.status !== 'Broken') return -1;
    if (b.status === 'Broken' && a.status !== 'Broken') return 1;
    return b.strength - a.strength;
  });

  // Generate summary
  let summary = '';
  const activeRels = sorted.filter(r => r.active);
  if (activeRels.length === 0) {
    summary = 'Quiet session — no strong cross-asset signals.';
  } else {
    const themes: string[] = [];
    if (yieldsUp && techDown) themes.push('rates pressuring growth');
    if (dollarUp && spxChange < 0) themes.push('dollar headwind for equities');
    if (oilSurge) themes.push('energy inflation');
    if (vixSpike) themes.push('vol spike');
    if (dollarDown && goldUp) themes.push('weak dollar gold bid');
    if (btcRally) themes.push('crypto risk-on');
    
    if (themes.length > 0) {
      summary = `Key dynamics: ${themes.join(' → ')}.`;
    } else {
      summary = 'Mixed signals across asset classes.';
    }
  }

  return { relationships: sorted, summary };
};

// 2. Risk Score
const calculateRiskScore = (assets: MarketAsset[]): {
  score: number;
  regime: 'Risk-On' | 'Risk-Off' | 'Mixed' | 'Panic' | 'Euphoria';
  indicators: RegimeIndicator[];
  summary: string;
} => {
  if (!assets || assets.length === 0) {
    return { score: 0, regime: 'Mixed', indicators: [], summary: 'Waiting for data...' };
  }

  const indicators: RegimeIndicator[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  const getAsset = (symbol: string) => assets.find(a => a.symbol === symbol);
  
  const spx = getAsset('SPX');
  const ndx = getAsset('NDX');
  const vix = getAsset('VIX');
  const dxy = getAsset('DXY');
  const gold = getAsset('GC');
  const btc = getAsset('BTC');

  if (spx?.dailyChangePercent != null) {
    const signal: 'bullish' | 'bearish' | 'neutral' = 
      spx.dailyChangePercent > 0.3 ? 'bullish' : spx.dailyChangePercent < -0.3 ? 'bearish' : 'neutral';
    indicators.push({ name: 'Equities', value: `SPX ${spx.dailyChangePercent > 0 ? '+' : ''}${spx.dailyChangePercent.toFixed(2)}%`, signal, weight: 25 });
    totalScore += signal === 'bullish' ? 25 : signal === 'bearish' ? -25 : 0;
    totalWeight += 25;
  }

  if (vix?.price != null) {
    const signal: 'bullish' | 'bearish' | 'neutral' = vix.price < 15 ? 'bullish' : vix.price > 25 ? 'bearish' : 'neutral';
    indicators.push({ name: 'VIX Level', value: vix.price.toFixed(1), signal, weight: 20 });
    totalScore += signal === 'bullish' ? 20 : signal === 'bearish' ? -20 : 0;
    totalWeight += 20;
  }

  if (dxy?.dailyChangePercent != null) {
    const signal: 'bullish' | 'bearish' | 'neutral' = dxy.dailyChangePercent < -0.2 ? 'bullish' : dxy.dailyChangePercent > 0.2 ? 'bearish' : 'neutral';
    indicators.push({ name: 'Dollar', value: `${dxy.dailyChangePercent > 0 ? '+' : ''}${dxy.dailyChangePercent.toFixed(2)}%`, signal, weight: 15 });
    totalScore += signal === 'bullish' ? 15 : signal === 'bearish' ? -15 : 0;
    totalWeight += 15;
  }

  if (gold?.dailyChangePercent != null && spx?.dailyChangePercent != null) {
    const goldOutperform = gold.dailyChangePercent > (spx.dailyChangePercent ?? 0) + 0.3;
    const signal: 'bullish' | 'bearish' | 'neutral' = goldOutperform ? 'bearish' : gold.dailyChangePercent < -0.3 ? 'bullish' : 'neutral';
    indicators.push({ name: 'Safe Haven', value: `Gold ${gold.dailyChangePercent > 0 ? '+' : ''}${gold.dailyChangePercent.toFixed(2)}%`, signal, weight: 15 });
    totalScore += signal === 'bullish' ? 15 : signal === 'bearish' ? -15 : 0;
    totalWeight += 15;
  }

  if (btc?.dailyChangePercent != null) {
    const signal: 'bullish' | 'bearish' | 'neutral' = btc.dailyChangePercent > 2 ? 'bullish' : btc.dailyChangePercent < -3 ? 'bearish' : 'neutral';
    indicators.push({ name: 'Crypto', value: `BTC ${btc.dailyChangePercent > 0 ? '+' : ''}${btc.dailyChangePercent.toFixed(1)}%`, signal, weight: 15 });
    totalScore += signal === 'bullish' ? 15 : signal === 'bearish' ? -15 : 0;
    totalWeight += 15;
  }

  if (ndx?.dailyChangePercent != null) {
    const signal: 'bullish' | 'bearish' | 'neutral' = ndx.dailyChangePercent > 0.4 ? 'bullish' : ndx.dailyChangePercent < -0.4 ? 'bearish' : 'neutral';
    indicators.push({ name: 'Tech', value: `NDX ${ndx.dailyChangePercent > 0 ? '+' : ''}${ndx.dailyChangePercent.toFixed(2)}%`, signal, weight: 10 });
    totalScore += signal === 'bullish' ? 10 : signal === 'bearish' ? -10 : 0;
    totalWeight += 10;
  }

  const normalizedScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;

  let regime: 'Risk-On' | 'Risk-Off' | 'Mixed' | 'Panic' | 'Euphoria' = 'Mixed';
  let summary = '';

  if (normalizedScore >= 70) { regime = 'Euphoria'; summary = 'Extreme greed — reversal watch'; }
  else if (normalizedScore >= 30) { regime = 'Risk-On'; summary = 'Risk appetite healthy — favor beta'; }
  else if (normalizedScore <= -70) { regime = 'Panic'; summary = 'Extreme fear — capitulation likely'; }
  else if (normalizedScore <= -30) { regime = 'Risk-Off'; summary = 'Defensive mode — quality first'; }
  else { regime = 'Mixed'; summary = 'No clear direction — stay selective'; }

  return { score: normalizedScore, regime, indicators, summary };
};

// 3. Market Regime Detection
const detectMarketRegime = (assets: MarketAsset[]): {
  regime: string;
  subRegime: string;
  description: string;
  color: string;
  drivers: string[];
  playbook: string[];
} => {
  if (!assets || assets.length === 0) {
    return { regime: 'Unknown', subRegime: '', description: 'Waiting for data...', color: 'slate', drivers: [], playbook: [] };
  }

  const getAsset = (symbol: string) => assets.find(a => a.symbol === symbol);
  
  const spxChange = getAsset('SPX')?.dailyChangePercent ?? 0;
  const ndxChange = getAsset('NDX')?.dailyChangePercent ?? 0;
  const tnxChange = getAsset('TNX')?.dailyChangePercent ?? 0;
  const dxyChange = getAsset('DXY')?.dailyChangePercent ?? 0;
  const goldChange = getAsset('GC')?.dailyChangePercent ?? 0;
  const oilChange = getAsset('CL')?.dailyChangePercent ?? 0;
  const vixLevel = getAsset('VIX')?.price ?? 18;

  const equitiesStrong = spxChange > 0.5;
  const equitiesWeak = spxChange < -0.5;
  const yieldsRising = tnxChange > 1;
  const yieldsFalling = tnxChange < -1;
  const dollarStrong = dxyChange > 0.3;
  const dollarWeak = dxyChange < -0.3;
  const oilSurging = oilChange > 2;
  const goldBid = goldChange > 0.5;
  const vixPanic = vixLevel > 30;
  const vixComplacent = vixLevel < 14;
  const techLeading = ndxChange > spxChange + 0.3;

  if (equitiesStrong && yieldsRising && oilSurging) {
    return { regime: 'Inflationary Growth', subRegime: 'Commodity-led expansion', description: 'Strong growth with rising inflation', color: 'amber', drivers: ['Rising yields', 'Oil surge', 'Equity strength'], playbook: ['✓ OW Energy, Financials, Materials', '✗ Avoid long-duration, Growth', '→ Hedge: TIPS, Commodities'] };
  }
  if (equitiesStrong && (yieldsFalling || tnxChange < 0.5) && vixComplacent) {
    return { regime: 'Disinflationary Growth', subRegime: 'Goldilocks', description: 'Growth without inflation — ideal', color: 'emerald', drivers: ['Stable/falling yields', 'Low vol', 'Equity bid'], playbook: ['✓ OW Growth, Tech, Quality', '✓ Full equity allocation', '✗ Reduce hedges — expensive'] };
  }
  if (equitiesWeak && yieldsRising && oilSurging) {
    return { regime: 'Stagflation', subRegime: 'Worst of both', description: 'Rising prices with weakness', color: 'red', drivers: ['Rising yields', 'Energy inflation', 'Equity selloff'], playbook: ['✓ OW Cash, Gold, Commodities', '✗ Avoid Equities and Bonds', '→ Maximum hedge exposure'] };
  }
  if (equitiesWeak && yieldsFalling && goldBid && dollarStrong) {
    return { regime: 'Deflationary Recession', subRegime: 'Flight to safety', description: 'Risk-off — bonds and gold up', color: 'blue', drivers: ['Plunging yields', 'Safe haven bid', 'Dollar strength'], playbook: ['✓ OW Long bonds, Gold, USD', '✗ Avoid Equities, Commodities', '→ Defensive positioning'] };
  }
  if (equitiesStrong && goldBid && dollarWeak) {
    return { regime: 'Liquidity Expansion', subRegime: 'All boats rising', description: 'Weak dollar lifting all assets', color: 'emerald', drivers: ['Dollar weakness', 'Broad strength'], playbook: ['✓ OW Risk assets, EM, Commodities', '✓ Full allocation', '✗ Avoid USD cash drag'] };
  }
  if (equitiesWeak && dollarStrong) {
    return { regime: 'Liquidity Contraction', subRegime: 'Tightening', description: 'Dollar strength draining risk', color: 'red', drivers: ['Dollar surge', 'Risk-off flows'], playbook: ['✓ OW USD, Quality', '✗ Avoid EM, High-beta', '→ Raise cash'] };
  }
  if (techLeading && vixComplacent && dollarWeak) {
    return { regime: 'Tech-Led Rally', subRegime: 'Growth momentum', description: 'Mega-cap tech driving', color: 'emerald', drivers: ['Tech outperformance', 'Weak dollar', 'Low vol'], playbook: ['✓ OW Mega-cap tech, NDX', '✗ Avoid Defensives, Value', '→ Add growth exposure'] };
  }
  if (vixPanic && equitiesWeak) {
    return { regime: 'Risk-Off Panic', subRegime: 'Volatility event', description: 'Fear spiking', color: 'red', drivers: ['VIX spike', 'Equity selloff'], playbook: ['✓ Raise cash immediately', '✓ Add tail hedges', '→ Wait for capitulation'] };
  }
  if (equitiesStrong && !yieldsRising) {
    return { regime: 'Earnings Expansion', subRegime: 'Broad strength', description: 'Healthy participation', color: 'emerald', drivers: ['Equity strength', 'Stable rates'], playbook: ['✓ Full equity allocation', '✓ Equal-weight approach', '→ Stay invested'] };
  }

  return { regime: 'Transitional', subRegime: 'Mixed signals', description: 'Markets searching', color: 'slate', drivers: ['Conflicting signals'], playbook: ['→ Balanced allocation', '→ Stay nimble', '→ Wait for clarity'] };
};

// 4. Volatility Analysis
const analyzeVolatility = (assets: MarketAsset[]) => {
  const vix = assets.find(a => a.symbol === 'VIX');
  const vixLevel = vix?.price ?? null;
  const vixChange = vix?.dailyChangePercent ?? null;
  
  let overall: 'Low' | 'Moderate' | 'High' | 'Extreme' = 'Moderate';
  let percentile = '50th';
  let interpretation = '';
  let action = '';
  
  if (vixLevel !== null) {
    if (vixLevel < 12) { overall = 'Low'; percentile = '5th'; interpretation = 'Extreme complacency'; action = 'Buy cheap hedges'; }
    else if (vixLevel < 15) { overall = 'Low'; percentile = '20th'; interpretation = 'Low fear — carry works'; action = 'Sell premium cautiously'; }
    else if (vixLevel < 20) { overall = 'Moderate'; percentile = '50th'; interpretation = 'Normal vol regime'; action = 'Standard positioning'; }
    else if (vixLevel < 30) { overall = 'High'; percentile = '75th'; interpretation = 'Elevated fear'; action = 'Reduce risk exposure'; }
    else { overall = 'Extreme'; percentile = '95th'; interpretation = 'Panic conditions'; action = 'Maximum caution'; }
  }

  return { overall, vix: { level: vixLevel, change: vixChange, percentile }, interpretation, action };
};

// 5. What Matters Today - CAUSAL CHAIN
const getWhatMattersToday = (assets: MarketAsset[]): { chain: string; events: Array<{ text: string; importance: 'high' | 'medium' | 'low' }> } => {
  if (!assets || assets.length === 0) return { chain: '', events: [] };
  
  const events: Array<{ text: string; importance: 'high' | 'medium' | 'low' }> = [];
  const chainParts: string[] = [];
  
  const vix = assets.find(a => a.symbol === 'VIX');
  const tnx = assets.find(a => a.symbol === 'TNX');
  const oil = assets.find(a => a.symbol === 'CL');
  const dxy = assets.find(a => a.symbol === 'DXY');
  const spx = assets.find(a => a.symbol === 'SPX');
  const ndx = assets.find(a => a.symbol === 'NDX');
  const gold = assets.find(a => a.symbol === 'GC');
  const btc = assets.find(a => a.symbol === 'BTC');

  // Build causal chain based on what's moving
  const tnxChange = tnx?.dailyChangePercent ?? 0;
  const dxyChange = dxy?.dailyChangePercent ?? 0;
  const oilChange = oil?.dailyChangePercent ?? 0;
  const vixChange = vix?.dailyChangePercent ?? 0;
  const spxChange = spx?.dailyChangePercent ?? 0;
  const ndxChange = ndx?.dailyChangePercent ?? 0;
  const goldChange = gold?.dailyChangePercent ?? 0;
  const btcChange = btc?.dailyChangePercent ?? 0;

  // Primary driver detection
  if (Math.abs(tnxChange) > 2) {
    chainParts.push(`10Y ${tnxChange > 0 ? '+' : ''}${tnxChange.toFixed(1)}%`);
    events.push({ text: `Yields ${tnxChange > 0 ? 'surging' : 'plunging'} — major bond move`, importance: 'high' });
    
    // Cascading effects
    if (tnxChange > 2 && ndxChange < -0.3) {
      chainParts.push(`Tech ${ndxChange.toFixed(1)}%`);
    }
    if (tnxChange < -2 && ndxChange > 0.3) {
      chainParts.push(`Tech +${ndxChange.toFixed(1)}%`);
    }
  }

  if (Math.abs(dxyChange) > 0.4) {
    chainParts.push(`Dollar ${dxyChange > 0 ? '+' : ''}${dxyChange.toFixed(2)}%`);
    events.push({ text: `Dollar ${dxyChange > 0 ? 'strengthening' : 'weakening'} sharply`, importance: 'high' });
    
    if (dxyChange > 0.4 && goldChange < -0.3) {
      chainParts.push(`Gold ${goldChange.toFixed(1)}%`);
    }
  }

  if (Math.abs(oilChange) > 2) {
    chainParts.push(`Oil ${oilChange > 0 ? '+' : ''}${oilChange.toFixed(1)}%`);
    events.push({ text: `Oil ${oilChange > 0 ? 'rallying' : 'crashing'} — ${oilChange > 0 ? 'inflation watch' : 'disinflation'}`, importance: 'medium' });
  }

  if (Math.abs(vixChange) > 10) {
    chainParts.push(`VIX ${vixChange > 0 ? '+' : ''}${vixChange.toFixed(0)}%`);
    events.push({ text: `VIX ${vixChange > 0 ? 'spike' : 'crush'} — ${vixChange > 0 ? 'fear rising' : 'fear collapsing'}`, importance: 'high' });
  }

  if (Math.abs(btcChange) > 4) {
    chainParts.push(`BTC ${btcChange > 0 ? '+' : ''}${btcChange.toFixed(1)}%`);
    events.push({ text: `Bitcoin ${btcChange > 0 ? 'surging' : 'dumping'} — risk sentiment`, importance: 'medium' });
  }

  // Add SPX if significant and not already implied
  if (Math.abs(spxChange) > 1 && chainParts.length > 0) {
    chainParts.push(`SPX ${spxChange > 0 ? '+' : ''}${spxChange.toFixed(1)}%`);
  }

  // Build chain string
  let chain = '';
  if (chainParts.length > 0) {
    chain = chainParts.join(' → ');
  } else {
    chain = 'Quiet session — no strong macro drivers';
    events.push({ text: 'Markets consolidating', importance: 'low' });
  }

  return { chain, events: events.slice(0, 3) };
};

// 6. Macro Risk Heatmap with Drivers and Impact
const getMacroRisks = (assets: MarketAsset[]) => {
  const vix = assets.find(a => a.symbol === 'VIX');
  const tnx = assets.find(a => a.symbol === 'TNX');
  const oil = assets.find(a => a.symbol === 'CL');
  const dxy = assets.find(a => a.symbol === 'DXY');
  const spx = assets.find(a => a.symbol === 'SPX');
  
  const vixLevel = vix?.price ?? 18;
  const oilChange = oil?.dailyChangePercent ?? 0;
  const tnxChange = tnx?.dailyChangePercent ?? 0;
  const dxyChange = dxy?.dailyChangePercent ?? 0;
  const spxChange = spx?.dailyChangePercent ?? 0;
  
  return [
    { 
      risk: 'Volatility', 
      level: vixLevel > 30 ? 'high' : vixLevel > 25 ? 'elevated' : vixLevel > 18 ? 'moderate' : 'low' as const, 
      indicator: `VIX: ${vixLevel.toFixed(1)}`,
      driver: vixLevel > 25 ? 'Fear spike' : 'Market calm',
      impact: vixLevel > 25 ? 'Equities, Credit' : 'N/A'
    },
    { 
      risk: 'Inflation', 
      level: (oilChange > 2 || tnxChange > 2) ? 'elevated' : (oilChange > 0 && tnxChange > 0) ? 'moderate' : 'low' as const, 
      indicator: `Oil: ${oilChange > 0 ? '+' : ''}${oilChange.toFixed(1)}%`,
      driver: oilChange > 2 ? 'Energy prices' : tnxChange > 2 ? 'Rate expectations' : 'Stable',
      impact: oilChange > 2 ? 'Growth, Bonds' : 'N/A'
    },
    { 
      risk: 'Liquidity', 
      level: dxyChange > 0.5 ? 'elevated' : dxyChange > 0.2 ? 'moderate' : 'low' as const, 
      indicator: `DXY: ${dxyChange > 0 ? '+' : ''}${dxyChange.toFixed(2)}%`,
      driver: dxyChange > 0.3 ? 'Dollar strength' : dxyChange < -0.3 ? 'Dollar weakness' : 'FX stable',
      impact: dxyChange > 0.3 ? 'EM, Commodities' : 'N/A'
    },
    { 
      risk: 'Growth', 
      level: spxChange < -1 ? 'elevated' : spxChange < -0.5 ? 'moderate' : 'low' as const, 
      indicator: `SPX: ${spxChange > 0 ? '+' : ''}${spxChange.toFixed(2)}%`,
      driver: spxChange < -1 ? 'Equity selloff' : spxChange > 1 ? 'Strong rally' : 'Normal',
      impact: spxChange < -1 ? 'Credit, Cyclicals' : 'N/A'
    }
  ];
};

// 7. Capital Flows with Rotation and Regime Confirmation
const simulateCapitalFlows = (assets: MarketAsset[], regime: string) => {
  const spxChange = assets.find(a => a.symbol === 'SPX')?.dailyChangePercent ?? 0;
  const tnxChange = assets.find(a => a.symbol === 'TNX')?.dailyChangePercent ?? 0;
  const goldChange = assets.find(a => a.symbol === 'GC')?.dailyChangePercent ?? 0;
  const btcChange = assets.find(a => a.symbol === 'BTC')?.dailyChangePercent ?? 0;
  const dxyChange = assets.find(a => a.symbol === 'DXY')?.dailyChangePercent ?? 0;
  
  // Determine net rotation
  let rotation = '';
  let rotationDirection: 'risk-on' | 'risk-off' | 'neutral' = 'neutral';
  
  if (spxChange > 0.3 && btcChange > 1 && dxyChange < 0) {
    rotation = 'Cash → Risk Assets';
    rotationDirection = 'risk-on';
  } else if (spxChange < -0.3 && goldChange > 0.3 && dxyChange > 0) {
    rotation = 'Equities → Safe Haven';
    rotationDirection = 'risk-off';
  } else if (tnxChange < -1 && spxChange > 0) {
    rotation = 'Bonds → Equities (duration trade)';
    rotationDirection = 'risk-on';
  } else if (tnxChange > 1 && spxChange < 0) {
    rotation = 'Equities → Cash (rate shock)';
    rotationDirection = 'risk-off';
  } else {
    rotation = 'No clear rotation';
  }

  // Check regime confirmation
  const regimeRiskOn = regime.includes('Growth') || regime.includes('Rally') || regime.includes('Expansion');
  const flowsConfirm = (regimeRiskOn && rotationDirection === 'risk-on') || (!regimeRiskOn && rotationDirection === 'risk-off');
  
  const flows = [
    { category: 'Equity Funds', flow: spxChange > 0.3 ? '+$2.1B' : spxChange < -0.3 ? '-$1.8B' : '~Flat', direction: spxChange > 0.3 ? 'inflow' : spxChange < -0.3 ? 'outflow' : 'neutral' as const, vsAvg: spxChange > 0.5 ? '↑ above avg' : spxChange < -0.5 ? '↓ below avg' : 'at avg' },
    { category: 'Bond Funds', flow: tnxChange < -1 ? '+$1.5B' : tnxChange > 1 ? '-$1.2B' : '~Flat', direction: tnxChange < -1 ? 'inflow' : tnxChange > 1 ? 'outflow' : 'neutral' as const, vsAvg: 'at avg' },
    { category: 'Gold/Safe Haven', flow: goldChange > 0.5 ? '+$0.8B' : goldChange < -0.5 ? '-$0.5B' : '~Flat', direction: goldChange > 0.5 ? 'inflow' : goldChange < -0.5 ? 'outflow' : 'neutral' as const, vsAvg: goldChange > 1 ? '↑ above avg' : 'at avg' },
    { category: 'Crypto', flow: btcChange > 2 ? '+$0.5B' : btcChange < -2 ? '-$0.4B' : '~Flat', direction: btcChange > 2 ? 'inflow' : btcChange < -2 ? 'outflow' : 'neutral' as const, vsAvg: btcChange > 3 ? '↑ above avg' : 'at avg' },
    { category: 'Money Markets', flow: dxyChange > 0.3 ? '+$3.2B' : dxyChange < -0.3 ? '-$2.5B' : '~Flat', direction: dxyChange > 0.3 ? 'inflow' : dxyChange < -0.3 ? 'outflow' : 'neutral' as const, vsAvg: 'at avg' }
  ];

  return { rotation, rotationDirection, flowsConfirm, flows };
};

// 8. Playbook - More Decisive
const generatePlaybook = (assets: MarketAsset[], regime: string) => {
  const tnxChange = assets.find(a => a.symbol === 'TNX')?.dailyChangePercent ?? 0;
  const dxyChange = assets.find(a => a.symbol === 'DXY')?.dailyChangePercent ?? 0;
  const oilChange = assets.find(a => a.symbol === 'CL')?.dailyChangePercent ?? 0;
  const vixLevel = assets.find(a => a.symbol === 'VIX')?.price ?? 18;

  return [
    { category: 'Tech / Growth', recommendation: tnxChange > 1.5 ? 'Underweight' : tnxChange < -1 ? 'Overweight' : 'Neutral' as const, reason: tnxChange > 1.5 ? 'Rate shock active' : tnxChange < -1 ? 'Yield tailwind' : 'Rates stable', conviction: tnxChange > 1.5 || tnxChange < -1 ? 'High' : 'Low' },
    { category: 'Value / Cyclicals', recommendation: oilChange > 2 || tnxChange > 1 ? 'Overweight' : regime.includes('Deflation') ? 'Underweight' : 'Neutral' as const, reason: oilChange > 2 ? 'Energy strength' : tnxChange > 1 ? 'Rate rotation' : 'No catalyst', conviction: oilChange > 2 ? 'High' : 'Low' },
    { category: 'International / EM', recommendation: dxyChange < -0.3 ? 'Overweight' : dxyChange > 0.3 ? 'Underweight' : 'Neutral' as const, reason: dxyChange < -0.3 ? 'Weak dollar tailwind' : dxyChange > 0.3 ? 'Dollar headwind' : 'FX neutral', conviction: Math.abs(dxyChange) > 0.3 ? 'High' : 'Low' },
    { category: 'Fixed Income', recommendation: vixLevel > 25 ? 'Overweight' : regime.includes('Inflation') ? 'Underweight' : 'Neutral' as const, reason: vixLevel > 25 ? 'Risk-off bid' : regime.includes('Inflation') ? 'Real rate risk' : 'Normal', conviction: vixLevel > 25 ? 'High' : 'Low' },
    { category: 'Commodities', recommendation: oilChange > 2 ? 'Overweight' : regime.includes('Deflation') ? 'Underweight' : 'Neutral' as const, reason: oilChange > 2 ? 'Energy momentum' : 'Mixed', conviction: oilChange > 2 ? 'High' : 'Low' },
    { category: 'Gold / Precious', recommendation: vixLevel > 25 || regime.includes('Stagflation') ? 'Overweight' : dxyChange > 0.5 ? 'Underweight' : 'Neutral' as const, reason: vixLevel > 25 ? 'Fear hedge' : dxyChange > 0.5 ? 'Dollar headwind' : 'Neutral', conviction: vixLevel > 25 ? 'High' : 'Low' }
  ];
};

// 9. Breadth
const calculateBreadth = (assets: MarketAsset[]) => {
  const valid = assets.filter(a => a.dailyChangePercent !== null && !a.error);
  const bullish = valid.filter(a => a.dailyChangePercent! > 0.1);
  const bearish = valid.filter(a => a.dailyChangePercent! < -0.1);
  
  return {
    bullish: bullish.length,
    bearish: bearish.length,
    total: valid.length,
    bullishPct: Math.round((bullish.length / (valid.length || 1)) * 100),
    bearishPct: Math.round((bearish.length / (valid.length || 1)) * 100),
    interpretation: bullish.length > bearish.length + 2 ? 'Broad risk-on' : bearish.length > bullish.length + 2 ? 'Broad risk-off' : 'Mixed breadth'
  };
};

// 10. Asset Ratio Analysis
const analyzeAssetRatio = (assetX: MarketAsset | undefined, assetY: MarketAsset | undefined): RatioAnalysis | null => {
  if (!assetX || !assetY || assetX.price === null || assetY.price === null || assetY.price === 0) {
    return null;
  }

  const ratio = assetX.price / assetY.price;
  
  // Calculate ratio changes based on individual asset changes
  // If X went up 2% and Y went up 1%, ratio change ≈ 2% - 1% = 1%
  const xChange1D = assetX.dailyChangePercent ?? 0;
  const yChange1D = assetY.dailyChangePercent ?? 0;
  const xChange1W = assetX.weeklyChangePercent ?? 0;
  const yChange1W = assetY.weeklyChangePercent ?? 0;
  
  // Ratio change is approximately the difference in percentage changes
  const ratioChange1D = xChange1D - yChange1D;
  const ratioChange1W = xChange1W - yChange1W;
  
  // Determine trend based on 1D and 1W consistency
  let trend: 'Uptrend' | 'Downtrend' | 'Range' | 'Breakout' = 'Range';
  let trendStrength = 0;
  
  if (ratioChange1D > 0.5 && ratioChange1W > 1) {
    trend = 'Uptrend';
    trendStrength = Math.min((ratioChange1D + ratioChange1W / 5) * 20, 100);
  } else if (ratioChange1D < -0.5 && ratioChange1W < -1) {
    trend = 'Downtrend';
    trendStrength = Math.min((Math.abs(ratioChange1D) + Math.abs(ratioChange1W) / 5) * 20, 100);
  } else if (Math.abs(ratioChange1D) > 2 || Math.abs(ratioChange1W) > 5) {
    trend = 'Breakout';
    trendStrength = Math.min(Math.abs(ratioChange1D) * 25, 100);
  } else {
    trend = 'Range';
    trendStrength = 50 - Math.abs(ratioChange1D) * 10;
  }
  
  // Determine status
  let status = '';
  if (Math.abs(ratioChange1D) > 1.5) {
    status = ratioChange1D > 0 
      ? `${assetX.symbol} outperforming ${assetY.symbol}`
      : `${assetY.symbol} outperforming ${assetX.symbol}`;
  } else if (Math.sign(xChange1D) !== Math.sign(yChange1D) && Math.abs(xChange1D) > 0.3 && Math.abs(yChange1D) > 0.3) {
    status = `${assetX.symbol} decoupling from ${assetY.symbol}`;
  } else if (Math.abs(ratioChange1W) < 0.5 && Math.abs(ratioChange1D) < 0.3) {
    status = 'Correlation stable';
  } else {
    status = 'Normal relationship';
  }
  
  // Simulated Z-score (would need historical data for real calculation)
  // Using a simplified version based on magnitude of moves
  const zScore = ratioChange1D / 0.8; // Assuming 0.8% daily std dev for ratios
  
  // Rate of Change (momentum)
  const rateOfChange = ratioChange1W !== 0 ? (ratioChange1D / (ratioChange1W / 5)) : 0;
  
  // Simulated correlation (based on whether assets move together)
  const sameDirection = Math.sign(xChange1D) === Math.sign(yChange1D);
  const correlation = sameDirection 
    ? 0.5 + Math.min(Math.abs(xChange1D + yChange1D) * 0.1, 0.4)
    : -0.3 - Math.min(Math.abs(xChange1D - yChange1D) * 0.1, 0.5);
  
  // Generate AI interpretation
  let interpretation = '';
  const xName = assetX.name || assetX.symbol;
  const yName = assetY.name || assetY.symbol;
  
  if (trend === 'Uptrend' && ratioChange1W > 2) {
    interpretation = `${xName} has been consistently outperforming ${yName} — `;
    if (assetX.symbol === 'CL' || assetX.symbol === 'GC') {
      interpretation += 'potential inflation/safe-haven pressure building.';
    } else if (assetX.symbol === 'BTC') {
      interpretation += 'risk appetite expanding into speculative assets.';
    } else if (assetX.symbol === 'NDX') {
      interpretation += 'growth momentum accelerating vs broader market.';
    } else {
      interpretation += 'consider tactical overweight.';
    }
  } else if (trend === 'Downtrend' && ratioChange1W < -2) {
    interpretation = `${yName} taking leadership from ${xName} — `;
    if (assetY.symbol === 'DXY') {
      interpretation += 'dollar strength signaling risk-off.';
    } else if (assetY.symbol === 'GC') {
      interpretation += 'safe-haven bid emerging.';
    } else {
      interpretation += 'rotation underway.';
    }
  } else if (trend === 'Breakout') {
    interpretation = `Significant move in ${xName}/${yName} ratio — breakout from recent range. Watch for follow-through.`;
  } else if (Math.abs(zScore) > 2) {
    interpretation = `Ratio at ${zScore > 0 ? 'elevated' : 'depressed'} levels (${zScore.toFixed(1)}σ) — potential mean reversion opportunity.`;
  } else if (status.includes('decoupling')) {
    interpretation = `${xName} and ${yName} moving in opposite directions — correlation breakdown, watch for regime shift.`;
  } else {
    interpretation = `${xName}/${yName} ratio within normal bounds. No clear directional signal.`;
  }
  
  return {
    ratio,
    ratioChange1D,
    ratioChange1W,
    trend,
    trendStrength,
    status,
    zScore,
    rateOfChange: Math.max(-100, Math.min(100, rateOfChange * 100)),
    correlation,
    interpretation
  };
};

// ==================== COMPONENTS ====================

const SectionCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-2xl border border-white/10 p-5 ${className}`}>{children}</div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30"><Icon className="w-5 h-5 text-[#D4AF37]" /></div>
    <div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  </div>
);

const RiskGauge = ({ score, regime }: { score: number; regime: string }) => {
  const position = ((score + 100) / 200) * 100;
  const color = score >= 30 ? 'emerald' : score <= -30 ? 'red' : 'amber';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-red-400">Risk-Off</span>
        <span className={`text-lg font-bold ${color === 'emerald' ? 'text-emerald-400' : color === 'red' ? 'text-red-400' : 'text-amber-400'}`}>{regime}</span>
        <span className="text-emerald-400">Risk-On</span>
      </div>
      <div className="relative h-3 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full">
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-slate-900 shadow-lg transition-all" style={{ left: `calc(${position}% - 8px)` }} />
      </div>
      <div className="text-center">
        <span className={`text-3xl font-bold ${color === 'emerald' ? 'text-emerald-400' : color === 'red' ? 'text-red-400' : 'text-amber-400'}`}>{score > 0 ? '+' : ''}{score}</span>
        <span className="text-slate-500 text-sm ml-1">/ 100</span>
      </div>
    </div>
  );
};

// Custom Asset Ratio Component
const CustomAssetRatio = ({ assets }: { assets: MarketAsset[] }) => {
  const [assetX, setAssetX] = useState<string>('BTC');
  const [assetY, setAssetY] = useState<string>('SPX');
  const [calcMode, setCalcMode] = useState<'ratio' | 'normalized' | 'zScore' | 'roc' | 'correlation'>('ratio');
  const [searchX, setSearchX] = useState('');
  const [searchY, setSearchY] = useState('');
  const [showDropdownX, setShowDropdownX] = useState(false);
  const [showDropdownY, setShowDropdownY] = useState(false);
  
  const assetXData = assets.find(a => a.symbol === assetX);
  const assetYData = assets.find(a => a.symbol === assetY);
  
  const analysis = useMemo(() => {
    return analyzeAssetRatio(assetXData, assetYData);
  }, [assetXData, assetYData]);
  
  // Filter assets based on search
  const filteredAssetsX = assets.filter(a => 
    a.symbol.toLowerCase().includes(searchX.toLowerCase()) ||
    a.name.toLowerCase().includes(searchX.toLowerCase())
  );
  const filteredAssetsY = assets.filter(a => 
    a.symbol.toLowerCase().includes(searchY.toLowerCase()) ||
    a.name.toLowerCase().includes(searchY.toLowerCase())
  );
  
  const formatRatio = (ratio: number): string => {
    if (ratio >= 100) return ratio.toFixed(1);
    if (ratio >= 10) return ratio.toFixed(2);
    if (ratio >= 1) return ratio.toFixed(3);
    if (ratio >= 0.01) return ratio.toFixed(4);
    return ratio.toExponential(2);
  };
  
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'Uptrend': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Downtrend': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'Breakout': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'Uptrend': return <TrendingUp className="w-4 h-4" />;
      case 'Downtrend': return <TrendingDown className="w-4 h-4" />;
      case 'Breakout': return <Zap className="w-4 h-4" />;
      default: return <ArrowRightLeft className="w-4 h-4" />;
    }
  };
  
  // Generate mini sparkline data (simulated based on daily/weekly changes)
  const generateSparklinePoints = () => {
    if (!analysis) return '';
    const points: number[] = [];
    const weeklyTrend = analysis.ratioChange1W;
    const dailyTrend = analysis.ratioChange1D;
    
    // Generate 10 points simulating the week's movement
    for (let i = 0; i < 10; i++) {
      const progress = i / 9;
      const baseValue = 50;
      const weeklyComponent = (weeklyTrend / 5) * progress * 30;
      const dailyComponent = i >= 8 ? dailyTrend * 10 : 0;
      const noise = (Math.sin(i * 1.5) + Math.cos(i * 0.8)) * 3;
      points.push(baseValue + weeklyComponent + dailyComponent + noise);
    }
    
    // Normalize to 0-40 range for SVG
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const normalized = points.map(p => 40 - ((p - min) / range) * 35);
    
    return normalized.map((y, i) => `${i * 20},${y}`).join(' ');
  };

  // Custom Dropdown Component
  const AssetDropdown = ({ 
    value, 
    onChange, 
    search, 
    setSearch, 
    showDropdown, 
    setShowDropdown, 
    filteredAssets,
    label 
  }: {
    value: string;
    onChange: (v: string) => void;
    search: string;
    setSearch: (v: string) => void;
    showDropdown: boolean;
    setShowDropdown: (v: boolean) => void;
    filteredAssets: MarketAsset[];
    label: string;
  }) => {
    const selectedAsset = assets.find(a => a.symbol === value);
    
    return (
      <div className="relative">
        <label className="text-xs text-slate-500 mb-1 block">{label}</label>
        <div
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm cursor-pointer hover:border-[#D4AF37]/50 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              selectedAsset?.category === 'index' ? 'bg-blue-500/20 text-blue-400' : 
              selectedAsset?.category === 'volatility' ? 'bg-purple-500/20 text-purple-400' : 
              selectedAsset?.category === 'bond' ? 'bg-cyan-500/20 text-cyan-400' : 
              selectedAsset?.category === 'currency' ? 'bg-green-500/20 text-green-400' : 
              selectedAsset?.category === 'commodity' ? 'bg-amber-500/20 text-amber-400' : 
              'bg-orange-500/20 text-orange-400'
            }`}>{value}</span>
            <span className="text-slate-300">{selectedAsset?.name}</span>
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-90' : ''}`} />
        </div>
        
        {showDropdown && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-white/10">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets..."
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-[#D4AF37]/50 focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            {/* Asset List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredAssets.length > 0 ? filteredAssets.map(asset => (
                <div
                  key={asset.symbol}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(asset.symbol);
                    setShowDropdown(false);
                    setSearch('');
                  }}
                  className={`px-3 py-2.5 cursor-pointer flex items-center gap-3 hover:bg-white/5 transition-colors ${
                    value === asset.symbol ? 'bg-[#D4AF37]/10' : ''
                  }`}
                >
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    asset.category === 'index' ? 'bg-blue-500/20 text-blue-400' : 
                    asset.category === 'volatility' ? 'bg-purple-500/20 text-purple-400' : 
                    asset.category === 'bond' ? 'bg-cyan-500/20 text-cyan-400' : 
                    asset.category === 'currency' ? 'bg-green-500/20 text-green-400' : 
                    asset.category === 'commodity' ? 'bg-amber-500/20 text-amber-400' : 
                    'bg-orange-500/20 text-orange-400'
                  }`}>{asset.symbol}</span>
                  <span className="text-slate-300 text-sm">{asset.name}</span>
                  {asset.dailyChangePercent !== null && (
                    <span className={`ml-auto text-xs ${asset.dailyChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {asset.dailyChangePercent >= 0 ? '+' : ''}{asset.dailyChangePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              )) : (
                <div className="px-3 py-4 text-center text-slate-500 text-sm">No assets found</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdownX(false);
      setShowDropdownY(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  return (
    <div className="space-y-4">
      {/* Asset Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div onClick={(e) => e.stopPropagation()}>
          <AssetDropdown
            value={assetX}
            onChange={setAssetX}
            search={searchX}
            setSearch={setSearchX}
            showDropdown={showDropdownX}
            setShowDropdown={(v) => { setShowDropdownX(v); setShowDropdownY(false); }}
            filteredAssets={filteredAssetsX}
            label="Asset X (Numerator)"
          />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <AssetDropdown
            value={assetY}
            onChange={setAssetY}
            search={searchY}
            setSearch={setSearchY}
            showDropdown={showDropdownY}
            setShowDropdown={(v) => { setShowDropdownY(v); setShowDropdownX(false); }}
            filteredAssets={filteredAssetsY}
            label="Asset Y (Denominator)"
          />
        </div>
      </div>
      
      {/* Swap Button */}
      <div className="flex justify-center -my-1">
        <button
          onClick={() => {
            const temp = assetX;
            setAssetX(assetY);
            setAssetY(temp);
          }}
          className="p-2 rounded-full bg-slate-800/50 border border-white/10 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 transition-all group"
          title="Swap assets"
        >
          <ArrowRightLeft className="w-4 h-4 text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
        </button>
      </div>
      
      {/* Calculation Mode Tabs */}
      <div className="flex gap-1 bg-black/20 rounded-lg p-1 overflow-x-auto">
        {[
          { id: 'ratio', label: 'X/Y', icon: Divide },
          { id: 'normalized', label: 'Norm', icon: Percent },
          { id: 'zScore', label: 'Z-Score', icon: BarChart2 },
          { id: 'roc', label: 'RoC', icon: TrendingUp },
          { id: 'correlation', label: 'Corr', icon: GitBranch },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCalcMode(id as any)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap ${
              calcMode === id ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>
      
      {analysis ? (
        <>
          {/* Main Display */}
          <div className="grid grid-cols-2 gap-3">
            {/* Ratio Value */}
            <div className="p-4 bg-black/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#D4AF37] font-bold">{assetX}</span>
                <Divide className="w-4 h-4 text-slate-500" />
                <span className="text-[#D4AF37] font-bold">{assetY}</span>
              </div>
              
              {calcMode === 'ratio' && (
                <div>
                  <p className="text-2xl font-bold text-white">{formatRatio(analysis.ratio)}</p>
                  <p className="text-xs text-slate-500 mt-1">Current ratio</p>
                </div>
              )}
              {calcMode === 'normalized' && (
                <div>
                  <p className="text-2xl font-bold text-white">100.0</p>
                  <p className={`text-sm ${analysis.ratioChange1W >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {analysis.ratioChange1W >= 0 ? '+' : ''}{analysis.ratioChange1W.toFixed(2)}% vs start
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Normalized base</p>
                </div>
              )}
              {calcMode === 'zScore' && (
                <div>
                  <p className={`text-2xl font-bold ${Math.abs(analysis.zScore) > 2 ? 'text-amber-400' : Math.abs(analysis.zScore) > 1 ? 'text-yellow-400' : 'text-white'}`}>
                    {analysis.zScore >= 0 ? '+' : ''}{analysis.zScore.toFixed(2)}σ
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {Math.abs(analysis.zScore) > 2 ? 'Extreme deviation' : Math.abs(analysis.zScore) > 1 ? 'Elevated' : 'Normal range'}
                  </p>
                </div>
              )}
              {calcMode === 'roc' && (
                <div>
                  <p className={`text-2xl font-bold ${analysis.rateOfChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {analysis.rateOfChange >= 0 ? '+' : ''}{analysis.rateOfChange.toFixed(0)}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Rate of change (momentum)</p>
                </div>
              )}
              {calcMode === 'correlation' && (
                <div>
                  <p className={`text-2xl font-bold ${analysis.correlation > 0.3 ? 'text-emerald-400' : analysis.correlation < -0.3 ? 'text-red-400' : 'text-slate-400'}`}>
                    {analysis.correlation >= 0 ? '+' : ''}{analysis.correlation.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {analysis.correlation > 0.5 ? 'Strong positive' : analysis.correlation > 0.2 ? 'Weak positive' : analysis.correlation < -0.5 ? 'Strong negative' : analysis.correlation < -0.2 ? 'Weak negative' : 'Uncorrelated'}
                  </p>
                </div>
              )}
            </div>
            
            {/* Mini Sparkline & Changes */}
            <div className="p-4 bg-black/20 rounded-xl">
              {/* Sparkline */}
              <svg viewBox="0 0 180 45" className="w-full h-12 mb-2">
                <polyline
                  fill="none"
                  stroke={analysis.ratioChange1W >= 0 ? '#34d399' : '#f87171'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={generateSparklinePoints()}
                />
              </svg>
              
              {/* Change Pills */}
              <div className="flex gap-2">
                <div className={`flex-1 text-center py-1 rounded ${analysis.ratioChange1D >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  <span className={`text-sm font-bold ${analysis.ratioChange1D >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {analysis.ratioChange1D >= 0 ? '+' : ''}{analysis.ratioChange1D.toFixed(2)}%
                  </span>
                  <p className="text-xs text-slate-500">1D</p>
                </div>
                <div className={`flex-1 text-center py-1 rounded ${analysis.ratioChange1W >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  <span className={`text-sm font-bold ${analysis.ratioChange1W >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {analysis.ratioChange1W >= 0 ? '+' : ''}{analysis.ratioChange1W.toFixed(2)}%
                  </span>
                  <p className="text-xs text-slate-500">1W</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Trend & Status */}
          <div className="grid grid-cols-2 gap-3">
            {/* Trend Signal */}
            <div className={`p-3 rounded-xl border ${getTrendColor(analysis.trend)}`}>
              <div className="flex items-center gap-2 mb-1">
                {getTrendIcon(analysis.trend)}
                <span className="font-semibold text-sm">{analysis.trend}</span>
              </div>
              <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${analysis.trend === 'Uptrend' ? 'bg-emerald-400' : analysis.trend === 'Downtrend' ? 'bg-red-400' : analysis.trend === 'Breakout' ? 'bg-amber-400' : 'bg-slate-400'}`}
                  style={{ width: `${analysis.trendStrength}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Strength: {analysis.trendStrength.toFixed(0)}%</p>
            </div>
            
            {/* Status */}
            <div className="p-3 bg-slate-800/50 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-semibold text-sm text-white">Status</span>
              </div>
              <p className="text-sm text-slate-300">{analysis.status}</p>
            </div>
          </div>
          
          {/* AI Interpretation */}
          <div className="p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[#D4AF37] font-semibold text-sm">AI Interpretation</span>
            </div>
            <p className="text-slate-300 text-sm">{analysis.interpretation}</p>
          </div>
          
          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500">Popular:</span>
            {[
              { x: 'BTC', y: 'SPX', label: 'BTC/SPX' },
              { x: 'NDX', y: 'DJI', label: 'Growth/Value' },
              { x: 'CL', y: 'DXY', label: 'Oil/Dollar' },
              { x: 'GC', y: 'SPX', label: 'Gold/SPX' },
              { x: 'TNX', y: 'VIX', label: 'Yield/Vol' },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => { setAssetX(preset.x); setAssetY(preset.y); }}
                className={`px-2 py-1 text-xs rounded border transition-all ${
                  assetX === preset.x && assetY === preset.y 
                    ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]' 
                    : 'bg-black/20 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-slate-500">
          <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Select two different assets to compare</p>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

export default function CrossAssetTerminal() {
  const [marketData, setMarketData] = useState<MarketAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'cache'>('live');
  const [cachedAt, setCachedAt] = useState<string | undefined>(undefined);
  const [timeframe, setTimeframe] = useState<'1D' | '1W'>('1D');

  const fetchMarketData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/macro/snapshot`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: ApiResponse = await response.json();
      setMarketData(data.assets);
      setLastUpdate(new Date(data.timestamp));
      setDataSource(data.source || 'live');
      setCachedAt(data.cachedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const { relationships, summary: relSummary } = useMemo(() => analyzeAssetRelationships(marketData), [marketData]);
  const riskScore = useMemo(() => calculateRiskScore(marketData), [marketData]);
  const marketRegime = useMemo(() => detectMarketRegime(marketData), [marketData]);
  const volatility = useMemo(() => analyzeVolatility(marketData), [marketData]);
  const whatMatters = useMemo(() => getWhatMattersToday(marketData), [marketData]);
  const macroRisks = useMemo(() => getMacroRisks(marketData), [marketData]);
  const capitalFlows = useMemo(() => simulateCapitalFlows(marketData, marketRegime.regime), [marketData, marketRegime]);
  const playbook = useMemo(() => generatePlaybook(marketData, marketRegime.regime), [marketData, marketRegime]);
  const breadth = useMemo(() => calculateBreadth(marketData), [marketData]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-6 space-y-4">
      {/* Header with Tagline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Cross-Asset <span className="text-[#D4AF37]">Terminal</span></h1>
          <p className="text-slate-400 text-sm mt-1">How rates, dollar, commodities and equities interact — the macro brain of the market</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 border border-white/10">
            {(['1D', '1W'] as const).map((tf) => (
              <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${timeframe === tf ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-gray-400 hover:text-white'}`}>{tf}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : dataSource === 'cache' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
            <span className="text-sm text-slate-300">{isLoading ? 'Loading' : dataSource === 'cache' ? 'Cached' : 'Live'}</span>
            <button onClick={fetchMarketData} disabled={isLoading} className="p-1 hover:bg-white/5 rounded"><RefreshCw className={`w-4 h-4 text-[#D4AF37] ${isLoading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/30 rounded-xl"><AlertCircle className="w-4 h-4" /> {error}</div>}
      {dataSource === 'cache' && <div className="flex items-center gap-2 text-amber-400 text-sm p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl"><Database className="w-4 h-4" /> Market Closed {cachedAt && `(${formatCacheTime(cachedAt)})`}</div>}

      {isLoading && marketData.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 rounded-xl bg-slate-800/50 animate-pulse" />)}</div>
      ) : marketData.length > 0 && (
        <>
          {/* Row 1: What Matters (Causal Chain) + Risk + Regime */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* What Matters Today - Causal Chain */}
            <SectionCard>
              <SectionHeader icon={Zap} title="What Matters Today" subtitle="Causal chain" />
              
              {/* Main Chain */}
              <div className="p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[#D4AF37] font-semibold text-sm">Today's Flow</span>
                </div>
                <p className="text-white font-medium">{whatMatters.chain}</p>
              </div>
              
              {/* Events */}
              <div className="space-y-2">
                {whatMatters.events.map((event, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${event.importance === 'high' ? 'bg-red-500/10 border-red-500/30' : event.importance === 'medium' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-500/10 border-slate-500/30'}`}>
                    <span className={`text-sm ${event.importance === 'high' ? 'text-red-400' : event.importance === 'medium' ? 'text-amber-400' : 'text-slate-300'}`}>{event.text}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Risk Appetite */}
            <SectionCard>
              <SectionHeader icon={Gauge} title="Risk Appetite" subtitle="Multi-factor score" />
              <RiskGauge score={riskScore.score} regime={riskScore.regime} />
              <p className="text-slate-400 text-sm mt-3 text-center">{riskScore.summary}</p>
              <div className="mt-4 space-y-2">
                {riskScore.indicators.map((ind, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{ind.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white">{ind.value}</span>
                      <span className={`w-2 h-2 rounded-full ${ind.signal === 'bullish' ? 'bg-emerald-400' : ind.signal === 'bearish' ? 'bg-red-400' : 'bg-slate-400'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Market Regime */}
            <SectionCard>
              <SectionHeader icon={Globe} title="Market Regime" subtitle={marketRegime.subRegime} />
              <div className={`p-4 rounded-xl border-2 mb-4 ${marketRegime.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30' : marketRegime.color === 'red' ? 'bg-red-500/10 border-red-500/30' : marketRegime.color === 'amber' ? 'bg-amber-500/10 border-amber-500/30' : marketRegime.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-500/10 border-slate-500/30'}`}>
                <h3 className={`font-bold text-lg ${marketRegime.color === 'emerald' ? 'text-emerald-400' : marketRegime.color === 'red' ? 'text-red-400' : marketRegime.color === 'amber' ? 'text-amber-400' : marketRegime.color === 'blue' ? 'text-blue-400' : 'text-slate-400'}`}>{marketRegime.regime}</h3>
                <p className="text-slate-400 text-sm mt-1">{marketRegime.description}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 text-xs uppercase">Key Drivers</span>
                {marketRegime.drivers.map((driver, idx) => <div key={idx} className="flex items-center gap-2 text-sm text-slate-300"><ChevronRight className="w-3 h-3 text-[#D4AF37]" />{driver}</div>)}
              </div>
            </SectionCard>
          </div>

          {/* Row 2: Asset Relationships (Full Width) */}
          <SectionCard>
            <SectionHeader icon={GitBranch} title="Asset Relationships" subtitle="Cross-asset dynamics with correlation & status" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {relationships.map((rel, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${rel.active ? getSignalBg(rel.relationship) : 'bg-slate-800/30 border-slate-700/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{rel.asset1}</span>
                      <span className={rel.active ? getSignalColor(rel.relationship) : 'text-slate-500'}>{rel.relationship === 'positive' ? '↗' : rel.relationship === 'negative' ? '↘' : '→'}</span>
                      <span className="text-white font-bold text-sm">{rel.asset2}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {rel.active && <span className="text-xs px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37]">ACTIVE</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${rel.status === 'Broken' ? 'bg-red-500/20 text-red-400' : rel.status === 'Unusual' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>{rel.status}</span>
                    </div>
                  </div>
                  
                  {/* Correlation */}
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="text-slate-500">Corr:</span>
                    <span className={`font-mono ${rel.correlation > 0 ? 'text-emerald-400' : rel.correlation < 0 ? 'text-red-400' : 'text-slate-400'}`}>{rel.correlation > 0 ? '+' : ''}{rel.correlation.toFixed(2)}</span>
                    <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${rel.relationship === 'positive' ? 'bg-emerald-400' : rel.relationship === 'negative' ? 'bg-red-400' : 'bg-slate-400'}`} style={{ width: `${rel.strength}%` }} />
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-300 mb-2">{rel.insight}</p>
                  <span className="text-xs text-slate-500">→ {rel.impact}</span>
                </div>
              ))}
            </div>
            
            {/* Summary Line */}
            <div className="mt-4 p-3 bg-black/20 rounded-lg border border-white/5">
              <p className="text-slate-300 text-sm"><span className="text-[#D4AF37] font-semibold">Summary:</span> {relSummary}</p>
            </div>
          </SectionCard>

          {/* Row 2.5: Custom Asset Ratio */}
          <SectionCard>
            <SectionHeader icon={Divide} title="Compare Any Two Assets" subtitle="Custom ratio analysis" />
            <CustomAssetRatio assets={marketData} />
          </SectionCard>

          {/* Row 3: Volatility + Macro Risks + Breadth */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard>
              <SectionHeader icon={Activity} title="Volatility" subtitle="Fear gauge" />
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-black/20 rounded-xl text-center">
                  <span className="text-slate-500 text-xs">VIX</span>
                  <p className={`text-2xl font-bold ${volatility.overall === 'Low' ? 'text-emerald-400' : volatility.overall === 'High' || volatility.overall === 'Extreme' ? 'text-red-400' : 'text-amber-400'}`}>{volatility.vix.level?.toFixed(1) || '—'}</p>
                </div>
                <div className="p-3 bg-black/20 rounded-xl text-center">
                  <span className="text-slate-500 text-xs">Change</span>
                  <p className={`text-2xl font-bold ${volatility.vix.change && volatility.vix.change < 0 ? 'text-emerald-400' : 'text-red-400'}`}>{volatility.vix.change ? `${volatility.vix.change > 0 ? '+' : ''}${volatility.vix.change.toFixed(1)}%` : '—'}</p>
                </div>
              </div>
              <div className={`p-3 rounded-lg text-center ${volatility.overall === 'Low' ? 'bg-emerald-500/10' : volatility.overall === 'High' || volatility.overall === 'Extreme' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                <span className={`font-bold ${volatility.overall === 'Low' ? 'text-emerald-400' : volatility.overall === 'High' || volatility.overall === 'Extreme' ? 'text-red-400' : 'text-amber-400'}`}>{volatility.overall} Volatility</span>
                <p className="text-slate-400 text-xs mt-1">{volatility.vix.percentile} percentile</p>
              </div>
              <p className="text-slate-400 text-sm mt-3">{volatility.interpretation}</p>
              <p className="text-[#D4AF37] text-sm mt-1">→ {volatility.action}</p>
            </SectionCard>

            {/* Macro Risk Heatmap with Driver & Impact */}
            <SectionCard>
              <SectionHeader icon={ThermometerSun} title="Macro Risk Heatmap" />
              <div className="space-y-2">
                {macroRisks.map((risk, idx) => (
                  <div key={idx} className="p-3 bg-black/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300 text-sm font-medium">{risk.risk}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${risk.level === 'high' ? 'bg-red-500/20 text-red-400' : risk.level === 'elevated' ? 'bg-amber-500/20 text-amber-400' : risk.level === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{risk.level.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{risk.indicator}</span>
                      <span className="text-slate-400">Driver: {risk.driver}</span>
                    </div>
                    {risk.impact !== 'N/A' && <p className="text-xs text-amber-400/80 mt-1">Impact: {risk.impact}</p>}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader icon={PieChart} title="Market Breadth" />
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-center">
                  <span className="text-slate-400 text-xs">Bullish</span>
                  <p className="text-2xl font-bold text-emerald-400">{breadth.bullishPct}%</p>
                  <span className="text-slate-500 text-xs">{breadth.bullish}/{breadth.total}</span>
                </div>
                <div className="p-3 bg-red-500/10 rounded-xl text-center">
                  <span className="text-slate-400 text-xs">Bearish</span>
                  <p className="text-2xl font-bold text-red-400">{breadth.bearishPct}%</p>
                  <span className="text-slate-500 text-xs">{breadth.bearish}/{breadth.total}</span>
                </div>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500" style={{ width: `${breadth.bullishPct}%` }} />
                <div className="bg-red-500" style={{ width: `${breadth.bearishPct}%` }} />
              </div>
              <p className="text-slate-400 text-sm mt-3">{breadth.interpretation}</p>
            </SectionCard>
          </div>

          {/* Row 4: Capital Flows + Playbook */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Capital Flows with Rotation */}
            <SectionCard>
              <SectionHeader icon={Waves} title="Capital Flows" subtitle="Rotation & flows" />
              
              {/* Net Rotation */}
              <div className={`p-3 rounded-lg mb-4 border ${capitalFlows.rotationDirection === 'risk-on' ? 'bg-emerald-500/10 border-emerald-500/30' : capitalFlows.rotationDirection === 'risk-off' ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-500/10 border-slate-500/30'}`}>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className={`w-4 h-4 ${capitalFlows.rotationDirection === 'risk-on' ? 'text-emerald-400' : capitalFlows.rotationDirection === 'risk-off' ? 'text-red-400' : 'text-slate-400'}`} />
                  <span className={`font-semibold ${capitalFlows.rotationDirection === 'risk-on' ? 'text-emerald-400' : capitalFlows.rotationDirection === 'risk-off' ? 'text-red-400' : 'text-slate-400'}`}>Rotation: {capitalFlows.rotation}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {capitalFlows.flowsConfirm ? '✓ Flows confirm regime' : '⚠ Flows contradict regime'}
                </p>
              </div>
              
              <div className="space-y-2">
                {capitalFlows.flows.map((flow, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                    <span className="text-slate-300 text-sm">{flow.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs">{flow.vsAvg}</span>
                      <span className={`font-bold text-sm ${flow.direction === 'inflow' ? 'text-emerald-400' : flow.direction === 'outflow' ? 'text-red-400' : 'text-slate-400'}`}>{flow.flow}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Macro Playbook - More Decisive */}
            <SectionCard>
              <SectionHeader icon={BookOpen} title="Macro Playbook" subtitle={`${marketRegime.regime} positioning`} />
              <div className="space-y-2">
                {playbook.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                    <span className="text-slate-300 text-sm">{item.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs hidden md:block">{item.reason}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.recommendation === 'Overweight' ? 'bg-emerald-500/20 text-emerald-400' : item.recommendation === 'Underweight' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>{item.recommendation === 'Overweight' ? 'OW' : item.recommendation === 'Underweight' ? 'UW' : 'N'}</span>
                      {item.conviction === 'High' && <span className="w-2 h-2 rounded-full bg-[#D4AF37]" title="High conviction" />}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Regime Strategy */}
              <div className="mt-4 p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl">
                <h4 className="text-[#D4AF37] font-semibold text-sm mb-2">Regime Strategy</h4>
                <ul className="space-y-1">
                  {marketRegime.playbook.map((item, idx) => <li key={idx} className="text-slate-300 text-sm">{item}</li>)}
                </ul>
              </div>
            </SectionCard>
          </div>

          {/* Row 5: All Assets (Enhanced) */}
          <SectionCard>
            <SectionHeader icon={Layers} title="Cross-Asset Metrics" subtitle="Price, change, sensitivity & role" />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase border-b border-white/5">
                    <th className="text-left py-2 px-3">Asset</th>
                    <th className="text-right py-2 px-3">Price</th>
                    <th className="text-right py-2 px-3">1D</th>
                    <th className="text-right py-2 px-3">1W</th>
                    <th className="text-center py-2 px-3">Beta</th>
                    <th className="text-center py-2 px-3">Sensitivity</th>
                    <th className="text-center py-2 px-3">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {marketData.map(asset => {
                    const daily = asset.dailyChangePercent;
                    const weekly = asset.weeklyChangePercent;
                    const meta = ASSET_META[asset.symbol] || { sensitivity: 'General', role: 'Indicator', betaToSPX: 0 };
                    return (
                      <tr key={asset.symbol} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${asset.category === 'index' ? 'bg-blue-500/20 text-blue-400' : asset.category === 'volatility' ? 'bg-purple-500/20 text-purple-400' : asset.category === 'bond' ? 'bg-cyan-500/20 text-cyan-400' : asset.category === 'currency' ? 'bg-green-500/20 text-green-400' : asset.category === 'commodity' ? 'bg-amber-500/20 text-amber-400' : 'bg-orange-500/20 text-orange-400'}`}>{asset.symbol}</span>
                            <span className="text-slate-300 text-sm hidden md:inline">{asset.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-white font-medium">{formatPrice(asset.price, asset.symbol)}</td>
                        <td className="py-3 px-3 text-right">{daily !== null ? <span className={`font-medium ${daily >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{daily >= 0 ? '+' : ''}{daily.toFixed(2)}%</span> : '—'}</td>
                        <td className="py-3 px-3 text-right">{weekly !== null ? <span className={`font-medium ${weekly >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{weekly >= 0 ? '+' : ''}{weekly.toFixed(2)}%</span> : '—'}</td>
                        <td className="py-3 px-3 text-center"><span className={`text-sm ${meta.betaToSPX > 1 ? 'text-amber-400' : meta.betaToSPX < 0 ? 'text-cyan-400' : 'text-slate-400'}`}>{meta.betaToSPX.toFixed(1)}</span></td>
                        <td className="py-3 px-3 text-center"><span className="text-xs text-slate-400">{meta.sensitivity}</span></td>
                        <td className="py-3 px-3 text-center"><span className="text-xs text-slate-500">{meta.role}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Row 6: Coming Soon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-60">
            <SectionCard><SectionHeader icon={Droplets} title="Liquidity" subtitle="Coming soon" /><div className="space-y-2 text-sm text-slate-500"><div className="flex justify-between"><span>Fed Balance Sheet</span><span>—</span></div><div className="flex justify-between"><span>Reverse Repo</span><span>—</span></div><div className="flex justify-between"><span>TGA</span><span>—</span></div></div></SectionCard>
            <SectionCard><SectionHeader icon={Scale} title="Credit" subtitle="Coming soon" /><div className="space-y-2 text-sm text-slate-500"><div className="flex justify-between"><span>HY Spread</span><span>—</span></div><div className="flex justify-between"><span>IG Spread</span><span>—</span></div><div className="flex justify-between"><span>Fin. Conditions</span><span>—</span></div></div></SectionCard>
            <SectionCard><SectionHeader icon={Radio} title="Vol Dashboard" subtitle="Full cross-asset volatility matrix" /><div className="space-y-2 text-sm text-slate-500"><div className="flex justify-between"><span>VVIX</span><span>—</span></div><div className="flex justify-between"><span>MOVE Index</span><span>—</span></div><div className="flex justify-between"><span>OVX</span><span>—</span></div></div></SectionCard>
          </div>

          <div className="text-center text-xs text-slate-500 pt-4 border-t border-white/5">For informational purposes only. Updated: {lastUpdate?.toLocaleString() || '—'}</div>
        </>
      )}
    </div>
  );
}