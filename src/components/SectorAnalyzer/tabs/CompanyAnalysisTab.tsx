// =====================================================
// 🏢 COMPANY ANALYSIS TAB - Deep Dive into Individual Stocks
// src/components/SectorAnalyzer/tabs/CompanyAnalysisTab.tsx
// =====================================================

import React, { memo, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, TrendingUp, TrendingDown, DollarSign, BarChart2,
  PieChart, Users, Newspaper, Target, Activity, Calendar,
  ArrowUpRight, ArrowDownRight, ArrowRight, ExternalLink,
  ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle2,
  Eye, Zap, Award, GitBranch, Clock, Globe, Briefcase
} from 'lucide-react';
import type { Company, EarningsHistory, InsiderTransaction, AnalystRating, NewsItem, CompetitorComparison } from '../companyTypes';
import { Card, StatBox, ScoreBar, SignalBadge, ProgressRing, RiskBadge, colors } from '../ui';
import { cn, formatPercent, formatCurrency, getScoreColor, calculateSignal } from '../utils';
import { 
  getCompany, getCompanyEarnings, getCompanyInsiders, 
  getCompanyAnalysts, getCompanyNews, getCompetitors 
} from '../companyData';

// =====================================================
// 📊 COMPANY HEADER
// =====================================================

interface CompanyHeaderProps {
  company: Company;
  onClose: () => void;
}

const CompanyHeader = memo<CompanyHeaderProps>(({ company, onClose }) => {
  const signal = calculateSignal(company.finotaurScore);
  const priceVs52High = ((company.price - company.weekHigh52) / company.weekHigh52) * 100;
  const priceVs52Low = ((company.price - company.weekLow52) / company.weekLow52) * 100;

  return (
    <div className="mb-6">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onClose}
        className="flex items-center gap-2 text-[#8B8B8B] hover:text-[#C9A646] transition-colors mb-4"
      >
        <ArrowRight className="h-4 w-4 rotate-180" />
        <span>Back to Sector</span>
      </motion.button>

      {/* Main Header */}
      <Card highlight>
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left: Company Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(145deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                    border: '1px solid rgba(201,166,70,0.2)',
                  }}
                >
                  <Building2 className="h-7 w-7 text-[#C9A646]" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">{company.ticker}</h1>
                    <span className="text-lg text-[#8B8B8B]">{company.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6B6B6B]">{company.sector}</span>
                    <span className="text-[#6B6B6B]">•</span>
                    <span className="text-[#C9A646]">{company.subSector}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#8B8B8B] mb-4 max-w-2xl">{company.description}</p>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-[#6B6B6B]" />
                  <span className="text-[#8B8B8B]">{company.headquarters}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#6B6B6B]" />
                  <span className="text-[#8B8B8B]">{company.employees.toLocaleString()} employees</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#6B6B6B]" />
                  <span className="text-[#8B8B8B]">Founded {company.founded}</span>
                </div>
              </div>
            </div>

            {/* Right: Price & Score */}
            <div className="flex flex-col items-end gap-4">
              {/* Price */}
              <div className="text-right">
                <div className="text-3xl font-bold text-white">${company.price.toFixed(2)}</div>
                <div
                  className={cn(
                    'flex items-center justify-end gap-1 text-lg font-medium',
                    company.changePercent >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  )}
                >
                  {company.changePercent >= 0 ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5" />
                  )}
                  ${Math.abs(company.change).toFixed(2)} ({formatPercent(company.changePercent)})
                </div>
              </div>

              {/* Score & Signal */}
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={company.finotaurScore}
                  max={100}
                  size={70}
                  strokeWidth={6}
                  color={getScoreColor(company.finotaurScore)}
                  label="Score"
                />
                <div className="flex flex-col gap-2">
                  <SignalBadge signal={signal} size="md" />
                  <span
                    className={cn(
                      'text-xs px-2 py-1 rounded text-center',
                      company.sentiment === 'bullish'
                        ? 'bg-[#22C55E]/10 text-[#22C55E]'
                        : company.sentiment === 'bearish'
                        ? 'bg-[#EF4444]/10 text-[#EF4444]'
                        : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                    )}
                  >
                    {company.sentiment.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 52-Week Range */}
          <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6B6B6B]">52-Week Range</span>
              <span className="text-sm text-[#8B8B8B]">
                ${company.weekLow52.toFixed(2)} - ${company.weekHigh52.toFixed(2)}
              </span>
            </div>
            <div className="relative h-2 bg-white/10 rounded-full">
              <motion.div
                className="absolute h-full bg-gradient-to-r from-[#EF4444] via-[#F59E0B] to-[#22C55E] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
                initial={{ left: 0 }}
                animate={{
                  left: `${((company.price - company.weekLow52) / (company.weekHigh52 - company.weekLow52)) * 100}%`,
                }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-[#22C55E]">{formatPercent(priceVs52Low)} from low</span>
              <span className="text-[#EF4444]">{formatPercent(priceVs52High)} from high</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

CompanyHeader.displayName = 'CompanyHeader';

// =====================================================
// 📊 KEY METRICS GRID
// =====================================================

interface KeyMetricsProps {
  company: Company;
}

const KeyMetrics = memo<KeyMetricsProps>(({ company }) => {
  const metrics = [
    { label: 'Market Cap', value: formatCurrency(company.marketCap), color: colors.gold.primary },
    { label: 'P/E Ratio', value: company.peRatio.toFixed(1), color: company.peRatio < 25 ? colors.positive : company.peRatio > 50 ? colors.negative : colors.warning },
    { label: 'EPS (TTM)', value: `$${company.eps.toFixed(2)}`, color: company.eps > 0 ? colors.positive : colors.negative },
    { label: 'Revenue Growth', value: formatPercent(company.revenueGrowthYoy), color: company.revenueGrowthYoy > 0 ? colors.positive : colors.negative },
    { label: 'Gross Margin', value: formatPercent(company.grossMargin, false), color: company.grossMargin > 50 ? colors.positive : colors.warning },
    { label: 'ROE', value: formatPercent(company.roe, false), color: company.roe > 15 ? colors.positive : colors.warning },
    { label: 'Beta', value: company.beta.toFixed(2), color: Math.abs(company.beta - 1) < 0.3 ? colors.positive : colors.warning },
    { label: 'Dividend Yield', value: formatPercent(company.dividendYield, false), color: colors.gold.primary },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {metrics.map((metric, i) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <StatBox label={metric.label} value={metric.value} color={metric.color} />
        </motion.div>
      ))}
    </div>
  );
});

KeyMetrics.displayName = 'KeyMetrics';

// =====================================================
// 📊 SCORE BREAKDOWN
// =====================================================

interface ScoreBreakdownProps {
  company: Company;
}

const ScoreBreakdown = memo<ScoreBreakdownProps>(({ company }) => {
  const scores = [
    { label: 'Momentum', value: company.momentumScore, icon: TrendingUp },
    { label: 'Value', value: company.valueScore, icon: DollarSign },
    { label: 'Quality', value: company.qualityScore, icon: Award },
    { label: 'Growth', value: company.growthScore, icon: Zap },
  ];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Target className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">FINOTAUR Score Breakdown</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scores.map((score, i) => {
            const Icon = score.icon;
            const color = getScoreColor(score.value);
            return (
              <motion.div
                key={score.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl text-center"
                style={{ background: `${color}08`, border: `1px solid ${color}20` }}
              >
                <Icon className="h-6 w-6 mx-auto mb-2" style={{ color }} />
                <div className="text-2xl font-bold mb-1" style={{ color }}>{score.value}</div>
                <div className="text-xs text-[#8B8B8B]">{score.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Overall Assessment */}
        <div
          className="mt-4 p-3 rounded-lg"
          style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.1)' }}
        >
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-[#C9A646] flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#E8DCC4]">
              <strong className="text-[#C9A646]">Assessment: </strong>
              {company.finotaurScore >= 80
                ? 'Strong fundamentals with positive momentum. Consider for long positions.'
                : company.finotaurScore >= 60
                ? 'Mixed signals. Monitor for better entry points.'
                : 'Weak profile. Exercise caution or consider hedging strategies.'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});

ScoreBreakdown.displayName = 'ScoreBreakdown';

// =====================================================
// 📊 FINANCIAL HEALTH
// =====================================================

interface FinancialHealthProps {
  company: Company;
}

const FinancialHealth = memo<FinancialHealthProps>(({ company }) => {
  const healthMetrics = [
    { label: 'Current Ratio', value: company.currentRatio, threshold: 1.5, good: company.currentRatio >= 1.5 },
    { label: 'Quick Ratio', value: company.quickRatio, threshold: 1.0, good: company.quickRatio >= 1.0 },
    { label: 'Debt/Equity', value: company.debtToEquity, threshold: 1.0, good: company.debtToEquity <= 1.0 },
    { label: 'Interest Coverage', value: company.interestCoverage, threshold: 5, good: company.interestCoverage >= 5 },
  ];

  const profitabilityMetrics = [
    { label: 'Gross Margin', value: company.grossMargin, suffix: '%' },
    { label: 'Operating Margin', value: company.operatingMargin, suffix: '%' },
    { label: 'Net Margin', value: company.netMargin, suffix: '%' },
    { label: 'FCF Margin', value: company.freeCashFlowMargin, suffix: '%' },
  ];

  const returnMetrics = [
    { label: 'ROE', value: company.roe, suffix: '%', benchmark: 15 },
    { label: 'ROA', value: company.roa, suffix: '%', benchmark: 5 },
    { label: 'ROIC', value: company.roic, suffix: '%', benchmark: 10 },
  ];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Briefcase className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Financial Health</h3>
        </div>

        {/* Health Metrics */}
        <div className="mb-5">
          <h4 className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">Balance Sheet Strength</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {healthMetrics.map((metric, i) => (
              <div
                key={metric.label}
                className="p-3 rounded-lg text-center"
                style={{
                  background: metric.good ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                  border: metric.good ? '1px solid rgba(34,197,94,0.1)' : '1px solid rgba(239,68,68,0.1)',
                }}
              >
                <div className="text-[10px] text-[#6B6B6B] mb-1">{metric.label}</div>
                <div className="text-lg font-bold" style={{ color: metric.good ? colors.positive : colors.negative }}>
                  {metric.value.toFixed(2)}
                </div>
                <div className="text-[10px] text-[#8B8B8B]">
                  {metric.good ? '✅ Good' : '⚠️ Watch'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profitability */}
        <div className="mb-5">
          <h4 className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">Profitability</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {profitabilityMetrics.map((metric, i) => (
              <div
                key={metric.label}
                className="p-3 rounded-lg text-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.08)' }}
              >
                <div className="text-[10px] text-[#6B6B6B] mb-1">{metric.label}</div>
                <div className="text-lg font-bold text-[#C9A646]">
                  {metric.value.toFixed(1)}{metric.suffix}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Returns */}
        <div>
          <h4 className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">Returns vs Benchmark</h4>
          <div className="space-y-3">
            {returnMetrics.map((metric, i) => (
              <div key={metric.label} className="flex items-center gap-4">
                <span className="text-sm text-white min-w-[60px]">{metric.label}</span>
                <div className="flex-1">
                  <div className="relative h-2 bg-white/10 rounded-full">
                    <motion.div
                      className="absolute h-full rounded-full"
                      style={{
                        background: metric.value >= metric.benchmark ? colors.positive : colors.warning,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (metric.value / 50) * 100)}%` }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#C9A646]"
                      style={{ left: `${(metric.benchmark / 50) * 100}%` }}
                    />
                  </div>
                </div>
                <span
                  className="text-sm font-bold min-w-[60px] text-right"
                  style={{ color: metric.value >= metric.benchmark ? colors.positive : colors.warning }}
                >
                  {metric.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
});

FinancialHealth.displayName = 'FinancialHealth';

// =====================================================
// 📊 VALUATION ANALYSIS
// =====================================================

interface ValuationAnalysisProps {
  company: Company;
}

const ValuationAnalysis = memo<ValuationAnalysisProps>(({ company }) => {
  const valuationMetrics = [
    { metric: 'P/E (Forward)', value: (company.price / company.epsForward).toFixed(1), sectorAvg: '25.0', assessment: company.price / company.epsForward < 25 ? 'UNDERVALUED' : 'PREMIUM' },
    { metric: 'PEG Ratio', value: company.pegRatio.toFixed(2), sectorAvg: '2.0', assessment: company.pegRatio < 1.5 ? 'UNDERVALUED' : company.pegRatio > 2.5 ? 'OVERVALUED' : 'FAIR' },
    { metric: 'P/S Ratio', value: company.priceToSales.toFixed(1), sectorAvg: '8.0', assessment: company.priceToSales < 8 ? 'UNDERVALUED' : 'PREMIUM' },
    { metric: 'EV/EBITDA', value: company.evToEbitda.toFixed(1), sectorAvg: '18.0', assessment: company.evToEbitda < 18 ? 'UNDERVALUED' : 'PREMIUM' },
  ];

  const getAssessmentColor = (assessment: string) => {
    switch (assessment) {
      case 'UNDERVALUED': return colors.positive;
      case 'FAIR': return colors.warning;
      case 'OVERVALUED': return colors.negative;
      case 'PREMIUM': return colors.gold.primary;
      default: return colors.neutral;
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <PieChart className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Valuation Analysis</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-[#6B6B6B] uppercase border-b border-[#C9A646]/10">
                <th className="text-left py-2 px-3">Metric</th>
                <th className="text-center py-2 px-3">{company.ticker}</th>
                <th className="text-center py-2 px-3">Sector Avg</th>
                <th className="text-center py-2 px-3">Assessment</th>
              </tr>
            </thead>
            <tbody>
              {valuationMetrics.map((item, i) => (
                <motion.tr
                  key={item.metric}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/5"
                >
                  <td className="py-3 px-3 text-sm text-white">{item.metric}</td>
                  <td className="text-center py-3 px-3 text-sm font-bold text-[#C9A646]">{item.value}</td>
                  <td className="text-center py-3 px-3 text-sm text-[#8B8B8B]">{item.sectorAvg}</td>
                  <td className="text-center py-3 px-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ background: `${getAssessmentColor(item.assessment)}15`, color: getAssessmentColor(item.assessment) }}
                    >
                      {item.assessment}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Price Target */}
        <div className="mt-5">
          <h4 className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">Analyst Price Targets</h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <div className="text-[10px] text-[#6B6B6B] mb-1">Low</div>
              <div className="text-lg font-bold text-[#EF4444]">${company.analystTargetLow}</div>
              <div className="text-[10px] text-[#EF4444]">
                {formatPercent(((company.analystTargetLow - company.price) / company.price) * 100)}
              </div>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.1)' }}>
              <div className="text-[10px] text-[#6B6B6B] mb-1">Average</div>
              <div className="text-lg font-bold text-[#C9A646]">${company.analystTargetPrice}</div>
              <div className="text-[10px] text-[#C9A646]">
                {formatPercent(((company.analystTargetPrice - company.price) / company.price) * 100)}
              </div>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
              <div className="text-[10px] text-[#6B6B6B] mb-1">High</div>
              <div className="text-lg font-bold text-[#22C55E]">${company.analystTargetHigh}</div>
              <div className="text-[10px] text-[#22C55E]">
                {formatPercent(((company.analystTargetHigh - company.price) / company.price) * 100)}
              </div>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.08)' }}>
              <div className="text-[10px] text-[#6B6B6B] mb-1">Analysts</div>
              <div className="text-lg font-bold text-white">{company.numberOfAnalysts}</div>
              <div className="text-[10px] text-[#8B8B8B]">{company.analystRating}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

ValuationAnalysis.displayName = 'ValuationAnalysis';

// =====================================================
// 📈 TECHNICAL ANALYSIS
// =====================================================

interface TechnicalAnalysisProps {
  company: Company;
}

const TechnicalAnalysis = memo<TechnicalAnalysisProps>(({ company }) => {
  const technicalSignals = [
    { indicator: 'RSI (14)', value: company.rsi14.toString(), signal: company.rsi14 < 30 ? 'OVERSOLD' : company.rsi14 > 70 ? 'OVERBOUGHT' : 'NEUTRAL', color: company.rsi14 < 30 ? colors.positive : company.rsi14 > 70 ? colors.negative : colors.warning },
    { indicator: 'MACD', value: company.macd.toFixed(2), signal: company.macd > 0 ? 'BULLISH' : 'BEARISH', color: company.macd > 0 ? colors.positive : colors.negative },
    { indicator: 'vs SMA20', value: formatPercent(((company.price - company.sma20) / company.sma20) * 100), signal: company.price > company.sma20 ? 'ABOVE' : 'BELOW', color: company.price > company.sma20 ? colors.positive : colors.negative },
    { indicator: 'vs SMA50', value: formatPercent(((company.price - company.sma50) / company.sma50) * 100), signal: company.price > company.sma50 ? 'ABOVE' : 'BELOW', color: company.price > company.sma50 ? colors.positive : colors.negative },
    { indicator: 'vs SMA200', value: formatPercent(((company.price - company.sma200) / company.sma200) * 100), signal: company.price > company.sma200 ? 'ABOVE' : 'BELOW', color: company.price > company.sma200 ? colors.positive : colors.negative },
  ];

  const trendAnalysis = company.price > company.sma200 && company.price > company.sma50 && company.price > company.sma20
    ? { trend: 'STRONG UPTREND', color: colors.positive }
    : company.price < company.sma200 && company.price < company.sma50 && company.price < company.sma20
    ? { trend: 'STRONG DOWNTREND', color: colors.negative }
    : { trend: 'MIXED/CONSOLIDATING', color: colors.warning };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Activity className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Technical Analysis</h3>
        </div>

        {/* Trend Summary */}
        <div
          className="p-4 rounded-xl mb-5"
          style={{ background: `${trendAnalysis.color}08`, border: `1px solid ${trendAnalysis.color}20` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#8B8B8B]">Overall Trend:</span>
            <span className="font-bold" style={{ color: trendAnalysis.color }}>{trendAnalysis.trend}</span>
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="space-y-3">
          {technicalSignals.map((item, i) => (
            <motion.div
              key={item.indicator}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <span className="text-sm text-white">{item.indicator}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#C9A646]">{item.value}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: `${item.color}15`, color: item.color }}
                >
                  {item.signal}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Support & Resistance */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
            <h4 className="text-xs font-bold text-[#22C55E] uppercase mb-2">Support Levels</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8B8B8B]">S1:</span>
                <span className="text-white font-medium">${(company.sma20 * 0.98).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B8B8B]">S2:</span>
                <span className="text-white font-medium">${(company.sma50 * 0.97).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B8B8B]">S3:</span>
                <span className="text-white font-medium">${(company.sma200 * 0.95).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
            <h4 className="text-xs font-bold text-[#EF4444] uppercase mb-2">Resistance Levels</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8B8B8B]">R1:</span>
                <span className="text-white font-medium">${(company.price * 1.03).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B8B8B]">R2:</span>
                <span className="text-white font-medium">${(company.price * 1.06).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B8B8B]">R3:</span>
                <span className="text-white font-medium">${company.weekHigh52.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

TechnicalAnalysis.displayName = 'TechnicalAnalysis';

// =====================================================
// 📅 EARNINGS SECTION
// =====================================================

interface EarningsSectionProps {
  ticker: string;
}

const EarningsSection = memo<EarningsSectionProps>(({ ticker }) => {
  const earnings = getCompanyEarnings(ticker);

  if (earnings.length === 0) return null;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Calendar className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Earnings History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-[#6B6B6B] uppercase border-b border-[#C9A646]/10">
                <th className="text-left py-2 px-3">Quarter</th>
                <th className="text-center py-2 px-3">Date</th>
                <th className="text-center py-2 px-3">EPS Est.</th>
                <th className="text-center py-2 px-3">EPS Act.</th>
                <th className="text-center py-2 px-3">Surprise</th>
                <th className="text-center py-2 px-3">Rev. Surprise</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e, i) => (
                <motion.tr
                  key={e.quarter}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/5"
                >
                  <td className="py-3 px-3 text-sm font-medium text-white">{e.quarter}</td>
                  <td className="text-center py-3 px-3 text-sm text-[#8B8B8B]">{e.date}</td>
                  <td className="text-center py-3 px-3 text-sm text-[#8B8B8B]">${e.epsEstimate.toFixed(2)}</td>
                  <td className="text-center py-3 px-3 text-sm font-bold text-white">${e.epsActual.toFixed(2)}</td>
                  <td className="text-center py-3 px-3">
                    <span
                      className="text-sm font-bold"
                      style={{ color: e.surprise >= 0 ? colors.positive : colors.negative }}
                    >
                      {e.surprise >= 0 ? '+' : ''}{e.surprise.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span
                      className="text-sm font-bold"
                      style={{ color: e.revenueSurprise >= 0 ? colors.positive : colors.negative }}
                    >
                      {e.revenueSurprise >= 0 ? '+' : ''}{e.revenueSurprise.toFixed(1)}%
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Beat Rate */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
            <div className="text-[10px] text-[#6B6B6B] mb-1">EPS Beat Rate</div>
            <div className="text-xl font-bold text-[#22C55E]">
              {((earnings.filter(e => e.surprise > 0).length / earnings.length) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
            <div className="text-[10px] text-[#6B6B6B] mb-1">Avg. Surprise</div>
            <div className="text-xl font-bold text-[#22C55E]">
              +{(earnings.reduce((sum, e) => sum + e.surprise, 0) / earnings.length).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

EarningsSection.displayName = 'EarningsSection';

// =====================================================
// 👔 INSIDER TRADING SECTION
// =====================================================

interface InsiderTradingProps {
  ticker: string;
}

const InsiderTrading = memo<InsiderTradingProps>(({ ticker }) => {
  const transactions = getCompanyInsiders(ticker);

  if (transactions.length === 0) return null;

  const totalBuys = transactions.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.value, 0);
  const totalSells = transactions.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.value, 0);
  const netActivity = totalBuys - totalSells;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Users className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Insider Trading (Last 90 Days)</h3>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
            <div className="text-[10px] text-[#6B6B6B] mb-1">Total Buys</div>
            <div className="text-lg font-bold text-[#22C55E]">{formatCurrency(totalBuys)}</div>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
            <div className="text-[10px] text-[#6B6B6B] mb-1">Total Sells</div>
            <div className="text-lg font-bold text-[#EF4444]">{formatCurrency(totalSells)}</div>
          </div>
          <div
            className="p-3 rounded-lg text-center"
            style={{
              background: netActivity >= 0 ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
              border: netActivity >= 0 ? '1px solid rgba(34,197,94,0.1)' : '1px solid rgba(239,68,68,0.1)',
            }}
          >
            <div className="text-[10px] text-[#6B6B6B] mb-1">Net Activity</div>
            <div className="text-lg font-bold" style={{ color: netActivity >= 0 ? colors.positive : colors.negative }}>
              {formatCurrency(netActivity)}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-[#6B6B6B] uppercase border-b border-[#C9A646]/10">
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-left py-2 px-3">Insider</th>
                <th className="text-center py-2 px-3">Type</th>
                <th className="text-right py-2 px-3">Shares</th>
                <th className="text-right py-2 px-3">Value</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <motion.tr
                  key={`${t.date}-${t.insider}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/5"
                >
                  <td className="py-3 px-3 text-sm text-[#8B8B8B]">{t.date}</td>
                  <td className="py-3 px-3">
                    <div className="text-sm font-medium text-white">{t.insider}</div>
                    <div className="text-[10px] text-[#6B6B6B]">{t.title}</div>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                      style={{
                        background: t.type === 'buy' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: t.type === 'buy' ? colors.positive : colors.negative,
                      }}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="text-right py-3 px-3 text-sm text-white">{t.shares.toLocaleString()}</td>
                  <td className="text-right py-3 px-3 text-sm font-bold" style={{ color: t.type === 'buy' ? colors.positive : colors.negative }}>
                    {formatCurrency(t.value)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signal */}
        <div
          className="mt-4 p-3 rounded-lg"
          style={{
            background: netActivity >= 0 ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
            border: netActivity >= 0 ? '1px solid rgba(34,197,94,0.1)' : '1px solid rgba(239,68,68,0.1)',
          }}
        >
          <div className="flex items-center gap-2">
            {netActivity >= 0 ? (
              <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
            )}
            <span className="text-sm" style={{ color: netActivity >= 0 ? colors.positive : colors.negative }}>
              {netActivity >= 0 ? 'Net insider buying - bullish signal' : 'Net insider selling - watch for weakness'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});

InsiderTrading.displayName = 'InsiderTrading';

// =====================================================
// 📰 NEWS SECTION
// =====================================================

interface NewsSectionProps {
  ticker: string;
}

const NewsSection = memo<NewsSectionProps>(({ ticker }) => {
  const news = getCompanyNews(ticker);

  if (news.length === 0) return null;

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-[#22C55E]" />;
      case 'negative': return <TrendingDown className="h-4 w-4 text-[#EF4444]" />;
      default: return <ArrowRight className="h-4 w-4 text-[#F59E0B]" />;
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Newspaper className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Recent News</h3>
        </div>

        <div className="space-y-3">
          {news.map((item, i) => (
            <motion.div
              key={`${item.date}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.08)' }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getSentimentIcon(item.sentiment)}</div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white mb-1">{item.title}</h4>
                  <div className="flex items-center gap-3 text-[10px] text-[#6B6B6B]">
                    <span>{item.date}</span>
                    <span>•</span>
                    <span>{item.source}</span>
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{
                        background: item.impact === 'high' ? 'rgba(239,68,68,0.1)' : item.impact === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(139,139,139,0.1)',
                        color: item.impact === 'high' ? colors.negative : item.impact === 'medium' ? colors.warning : colors.neutral,
                      }}
                    >
                      {item.impact.toUpperCase()} IMPACT
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
});

NewsSection.displayName = 'NewsSection';

// =====================================================
// 🏆 COMPETITOR COMPARISON
// =====================================================

interface CompetitorComparisonProps {
  ticker: string;
  company: Company;
}

const CompetitorComparisonSection = memo<CompetitorComparisonProps>(({ ticker, company }) => {
  const competitors = getCompetitors(ticker);

  if (competitors.length === 0) return null;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <GitBranch className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Competitor Comparison</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-[#6B6B6B] uppercase border-b border-[#C9A646]/10">
                <th className="text-left py-2 px-3">Company</th>
                <th className="text-right py-2 px-3">Market Cap</th>
                <th className="text-center py-2 px-3">P/E</th>
                <th className="text-center py-2 px-3">Rev Growth</th>
                <th className="text-center py-2 px-3">Margin</th>
                <th className="text-center py-2 px-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {/* Current Company Row */}
              <motion.tr
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-[#C9A646]/20"
                style={{ background: 'rgba(201,166,70,0.05)' }}
              >
                <td className="py-3 px-3">
                  <span className="font-bold text-[#C9A646]">{company.ticker}</span>
                  <span className="text-xs text-[#8B8B8B] ml-2">(Current)</span>
                </td>
                <td className="text-right py-3 px-3 text-sm text-white">{formatCurrency(company.marketCap)}</td>
                <td className="text-center py-3 px-3 text-sm text-white">{company.peRatio.toFixed(1)}</td>
                <td className="text-center py-3 px-3">
                  <span className="text-sm font-medium" style={{ color: company.revenueGrowthYoy >= 0 ? colors.positive : colors.negative }}>
                    {formatPercent(company.revenueGrowthYoy)}
                  </span>
                </td>
                <td className="text-center py-3 px-3 text-sm text-white">{company.grossMargin.toFixed(1)}%</td>
                <td className="text-center py-3 px-3">
                  <span className="font-bold" style={{ color: getScoreColor(company.finotaurScore) }}>{company.finotaurScore}</span>
                </td>
              </motion.tr>

              {/* Competitors */}
              {competitors.map((c, i) => (
                <motion.tr
                  key={c.ticker}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/5"
                >
                  <td className="py-3 px-3">
                    <span className="font-medium text-white">{c.ticker}</span>
                    <span className="text-xs text-[#6B6B6B] ml-2">{c.name}</span>
                  </td>
                  <td className="text-right py-3 px-3 text-sm text-[#8B8B8B]">{formatCurrency(c.marketCap)}</td>
                  <td className="text-center py-3 px-3 text-sm text-[#8B8B8B]">{c.peRatio.toFixed(1)}</td>
                  <td className="text-center py-3 px-3">
                    <span className="text-sm" style={{ color: c.revenueGrowth >= 0 ? colors.positive : colors.negative }}>
                      {formatPercent(c.revenueGrowth)}
                    </span>
                  </td>
                  <td className="text-center py-3 px-3 text-sm text-[#8B8B8B]">{c.grossMargin.toFixed(1)}%</td>
                  <td className="text-center py-3 px-3">
                    <span style={{ color: getScoreColor(c.score) }}>{c.score}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Competitive Position */}
        <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.1)' }}>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-[#C9A646] flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#E8DCC4]">
              <strong className="text-[#C9A646]">Competitive Position: </strong>
              {company.finotaurScore >= Math.max(...competitors.map(c => c.score))
                ? `${company.ticker} leads its peer group with the highest FINOTAUR score.`
                : `${company.ticker} ranks ${competitors.filter(c => c.score > company.finotaurScore).length + 1} among peers.`}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});

CompetitorComparisonSection.displayName = 'CompetitorComparisonSection';

// =====================================================
// 🎯 MAIN COMPANY ANALYSIS TAB
// =====================================================

interface CompanyAnalysisTabProps {
  ticker: string;
  onClose: () => void;
}

export const CompanyAnalysisTab = memo<CompanyAnalysisTabProps>(({ ticker, onClose }) => {
  const company = getCompany(ticker);

  if (!company) {
    return (
      <Card>
        <div className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-[#F59E0B] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Company Not Found</h3>
          <p className="text-[#8B8B8B]">No data available for ticker: {ticker}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-lg bg-[#C9A646] text-black font-medium"
          >
            Go Back
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onClose={onClose} />
      <KeyMetrics company={company} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScoreBreakdown company={company} />
        <ValuationAnalysis company={company} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinancialHealth company={company} />
        <TechnicalAnalysis company={company} />
      </div>
      
      <EarningsSection ticker={ticker} />
      <InsiderTrading ticker={ticker} />
      <NewsSection ticker={ticker} />
      <CompetitorComparisonSection ticker={ticker} company={company} />
    </div>
  );
});

CompanyAnalysisTab.displayName = 'CompanyAnalysisTab';

export default CompanyAnalysisTab;