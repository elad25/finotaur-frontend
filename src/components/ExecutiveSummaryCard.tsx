// =====================================================
// 🏆 EXECUTIVE SUMMARY COMPONENT
// =====================================================
// Premium institutional-grade executive summary with
// FINOTAUR proprietary scoring system
// =====================================================

import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Target, Clock, Zap,
  Award, Shield, Activity, BarChart3, Star,
  ChevronRight, Sparkles, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutiveSummary, VerdictType, ConvictionLevel, TimeHorizon } from '../types/stock.types';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const getVerdictConfig = (verdict: VerdictType) => {
  const configs = {
    STRONG_BUY: { label: 'STRONG BUY', color: '#22C55E', bg: 'rgba(34,197,94,0.15)', icon: TrendingUp },
    BUY: { label: 'BUY', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)', icon: TrendingUp },
    HOLD: { label: 'HOLD', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: Activity },
    SELL: { label: 'SELL', color: '#F87171', bg: 'rgba(248,113,113,0.12)', icon: TrendingDown },
    STRONG_SELL: { label: 'STRONG SELL', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', icon: TrendingDown },
  };
  return configs[verdict];
};

const getConvictionConfig = (conviction: ConvictionLevel) => {
  const configs = {
    HIGH: { label: 'High Conviction', bars: 5, color: '#22C55E' },
    MEDIUM: { label: 'Medium Conviction', bars: 3, color: '#F59E0B' },
    LOW: { label: 'Low Conviction', bars: 1, color: '#EF4444' },
  };
  return configs[conviction];
};

const getTimeHorizonConfig = (horizon: TimeHorizon) => {
  const configs = {
    SHORT: { label: '0-3 Months', icon: Zap, color: '#3B82F6' },
    MEDIUM: { label: '3-12 Months', icon: Clock, color: '#8B5CF6' },
    LONG: { label: '1+ Years', icon: Target, color: '#22C55E' },
  };
  return configs[horizon];
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#4ADE80';
  if (score >= 40) return '#F59E0B';
  if (score >= 20) return '#F87171';
  return '#EF4444';
};

const getScoreGrade = (score: number): string => {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 40) return 'D';
  return 'F';
};

// =====================================================
// SUB-COMPONENTS
// =====================================================

// FINOTAUR Score Gauge
const FinotaurScoreGauge = ({ score, percentile }: { score: number; percentile: number }) => {
  const circumference = 2 * Math.PI * 45;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);
  const grade = getScoreGrade(score);

  return (
    <div className="relative">
      {/* Outer glow */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-30"
        style={{ background: color }}
      />
      
      <svg width="140" height="140" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="70"
          cy="70"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="10"
        />
        {/* Progress circle */}
        <motion.circle
          cx="70"
          cy="70"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-4xl font-bold text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          {score}
        </motion.span>
        <span 
          className="text-sm font-semibold"
          style={{ color }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
};

// Score Breakdown Bar
const ScoreBreakdownBar = ({ 
  label, 
  score, 
  icon: Icon,
  delay = 0 
}: { 
  label: string; 
  score: number; 
  icon: any;
  delay?: number;
}) => {
  const color = getScoreColor(score);
  
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[#8B8B8B] group-hover:text-[#C9A646] transition-colors" />
          <span className="text-xs text-[#8B8B8B] group-hover:text-white transition-colors">{label}</span>
        </div>
        <span className="text-xs font-semibold text-white">{score}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

// Verdict Badge
const VerdictBadge = ({ verdict, conviction }: { verdict: VerdictType; conviction: ConvictionLevel }) => {
  const verdictConfig = getVerdictConfig(verdict);
  const convictionConfig = getConvictionConfig(conviction);
  const Icon = verdictConfig.icon;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="relative"
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-2xl blur-xl opacity-40"
        style={{ background: verdictConfig.color }}
      />
      
      <div 
        className="relative px-8 py-6 rounded-2xl border text-center"
        style={{ 
          background: verdictConfig.bg,
          borderColor: `${verdictConfig.color}40`,
        }}
      >
        <Icon 
          className="h-8 w-8 mx-auto mb-2"
          style={{ color: verdictConfig.color }}
        />
        <div 
          className="text-2xl font-bold tracking-wide"
          style={{ color: verdictConfig.color }}
        >
          {verdictConfig.label}
        </div>
        
        {/* Conviction bars */}
        <div className="flex items-center justify-center gap-1 mt-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-4 rounded-sm"
              initial={{ height: 0 }}
              animate={{ height: 16 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              style={{
                background: i <= convictionConfig.bars 
                  ? convictionConfig.color 
                  : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>
        <p className="text-xs text-[#8B8B8B] mt-2">{convictionConfig.label}</p>
      </div>
    </motion.div>
  );
};

// Key Numbers Box
const KeyNumbersBox = ({ keyNumbers }: { keyNumbers: ExecutiveSummary['keyNumbers'] }) => {
  const items = [
    { label: 'Price', value: `$${keyNumbers.price.toFixed(2)}`, highlight: false },
    { label: 'Target', value: `$${keyNumbers.target.toFixed(2)}`, highlight: true },
    { 
      label: 'Upside', 
      value: `${keyNumbers.upside >= 0 ? '+' : ''}${keyNumbers.upside.toFixed(1)}%`, 
      highlight: true,
      isPositive: keyNumbers.upside >= 0
    },
    { label: 'P/E', value: keyNumbers.pe?.toFixed(1) || 'N/A', highlight: false },
    { label: 'Dividend', value: keyNumbers.dividend ? `${keyNumbers.dividend.toFixed(2)}%` : 'N/A', highlight: false },
    { label: 'Beta', value: keyNumbers.beta.toFixed(2), highlight: false },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {items.map((item, idx) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * idx }}
          className={cn(
            "p-3 rounded-xl text-center",
            item.highlight 
              ? "bg-[#C9A646]/10 border border-[#C9A646]/20" 
              : "bg-white/[0.03]"
          )}
        >
          <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-1">{item.label}</p>
          <p className={cn(
            "text-lg font-bold",
            item.highlight 
              ? item.isPositive !== undefined 
                ? item.isPositive ? "text-[#22C55E]" : "text-[#EF4444]"
                : "text-[#C9A646]"
              : "text-white"
          )}>
            {item.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

// Time Horizon Badge
const TimeHorizonBadge = ({ horizon }: { horizon: TimeHorizon }) => {
  const config = getTimeHorizonConfig(horizon);
  const Icon = config.icon;

  return (
    <div 
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
      style={{ 
        background: `${config.color}15`,
        border: `1px solid ${config.color}30`,
      }}
    >
      <Icon className="h-4 w-4" style={{ color: config.color }} />
      <span className="text-sm font-medium" style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

interface ExecutiveSummaryCardProps {
  data: ExecutiveSummary;
  className?: string;
}

export function ExecutiveSummaryCard({ data, className }: ExecutiveSummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-6", className)}
    >
      {/* Main Score Card */}
      <div 
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
          border: '1px solid rgba(201,166,70,0.2)',
        }}
      >
        {/* Animated top border */}
        <div className="absolute top-0 left-0 right-0 h-[2px]">
          <motion.div
            className="h-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #C9A646, #F4D97B, #C9A646, transparent)',
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                boxShadow: '0 4px 20px rgba(201,166,70,0.3)',
              }}
            >
              <Award className="h-5 w-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">FINOTAUR Analysis</h2>
              <p className="text-xs text-[#6B6B6B]">Proprietary Institutional-Grade Rating</p>
            </div>
          </div>

          {/* Score + Verdict Row */}
          <div className="flex flex-col lg:flex-row items-center gap-8 mb-8">
            {/* FINOTAUR Score */}
            <div className="flex items-center gap-8">
              <FinotaurScoreGauge 
                score={data.finotaurScore.overall} 
                percentile={data.finotaurScore.percentile} 
              />
              
              {/* Score Breakdown */}
              <div className="w-48 space-y-3">
                <ScoreBreakdownBar 
                  label="Fundamentals" 
                  score={data.finotaurScore.breakdown.fundamentals}
                  icon={BarChart3}
                  delay={0.2}
                />
                <ScoreBreakdownBar 
                  label="Valuation" 
                  score={data.finotaurScore.breakdown.valuation}
                  icon={Target}
                  delay={0.3}
                />
                <ScoreBreakdownBar 
                  label="Momentum" 
                  score={data.finotaurScore.breakdown.momentum}
                  icon={TrendingUp}
                  delay={0.4}
                />
                <ScoreBreakdownBar 
                  label="Quality" 
                  score={data.finotaurScore.breakdown.quality}
                  icon={Star}
                  delay={0.5}
                />
                <ScoreBreakdownBar 
                  label="Safety" 
                  score={data.finotaurScore.breakdown.safety}
                  icon={Shield}
                  delay={0.6}
                />
              </div>
            </div>

            {/* Verdict */}
            <div className="flex-1 flex flex-col items-center lg:items-end gap-4">
              <VerdictBadge verdict={data.verdict} conviction={data.conviction} />
              <TimeHorizonBadge horizon={data.timeHorizon} />
            </div>
          </div>

          {/* Key Numbers */}
          <KeyNumbersBox keyNumbers={data.keyNumbers} />

          {/* Percentile Note */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-[#C9A646]" />
            <span className="text-[#8B8B8B]">
              Outperforms <span className="text-[#C9A646] font-semibold">{data.finotaurScore.percentile}%</span> of S&P 500 companies
            </span>
          </div>
        </div>
      </div>

      {/* One-Line Thesis */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(13,11,8,0.95))',
          border: '1px solid rgba(201,166,70,0.3)',
        }}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] via-[#F4D97B] to-transparent" />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#C9A646]/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#C9A646] mb-2">ONE-LINE THESIS</h3>
              <p className="text-lg text-[#E8DCC4] leading-relaxed font-medium">
                "{data.oneLineThesis}"
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Investment Story Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Investment Story */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
            border: '1px solid rgba(201,166,70,0.15)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-[#C9A646]" />
            <h4 className="text-sm font-semibold text-[#C9A646]">Investment Story</h4>
          </div>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">{data.investmentStory}</p>
        </motion.div>

        {/* Why We're Looking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
            border: '1px solid rgba(201,166,70,0.15)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-[#3B82F6]" />
            <h4 className="text-sm font-semibold text-[#3B82F6]">Why We're Looking</h4>
          </div>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">{data.whyLooking}</p>
        </motion.div>

        {/* Signal Identified */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
            border: '1px solid rgba(201,166,70,0.15)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-[#22C55E]" />
            <h4 className="text-sm font-semibold text-[#22C55E]">Signal Identified</h4>
          </div>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">{data.signalIdentified}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default ExecutiveSummaryCard;
