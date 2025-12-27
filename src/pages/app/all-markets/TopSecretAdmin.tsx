// =====================================================
// FINOTAUR TOP SECRET ADMIN - PREMIUM REPORTS - v2.5.0
// =====================================================
// Place in: src/pages/app/all-markets/TopSecretAdmin.tsx
//
// 🔥 FEATURES:
// - 4 Different Report Types (ISM, Company, Crypto, Weekly)
// - Real ISM API Integration with 13 AI Agents
// - INLINE progress tracking in cards (non-blocking)
// - INLINE report preview in cards
// - Subscriber management with eligibility tracking
// - PDF Download for ISM Reports
// - ✨ NEW: Select which ready report to send
// - ✨ NEW: Reports persist across page refresh
// - ✨ FIXED: Each report stays in its own card
// =====================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  Users,
  Search,
  Send,
  CheckCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  Crown,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  Eye,
  Maximize2,
  Bot,
  Clock,
  XCircle,
  Star,
  Lock,
  MessageSquare,
  Calendar,
  History,
  Shield,
  Sparkles,
  Copy,
  Check,
  Download,
  Settings,
  Info,
  Activity,
  TrendingUp,
  Target,
  BookOpen,
  PieChart,
  BarChart3,
  Briefcase,
  GraduationCap,
  Layers,
  Building,
  Coins,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================
// TYPES
// ============================================

interface ReportStats {
  active_subscribers: number;
  monthly_subscribers: number;
  yearly_subscribers: number;
}

interface PremiumReportsStats {
  total_subscribers: number;
  active_subscribers: number;
  trial_subscribers: number;
  total_users: number;
}

interface ReportUser {
  id: string;
  email: string;
  display_name: string | null;
  account_type: 'free' | 'basic' | 'premium';
  top_secret_enabled: boolean;
  top_secret_status: 'inactive' | 'active' | 'cancelled';
  top_secret_started_at: string | null;
  top_secret_expires_at: string | null;
  top_secret_interval: string | null;
  created_at: string;
}

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  gradient: string;
  endpoint: string;
  estimatedTime: string;
  agentCount: number;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

interface PreviewData {
  subject: string;
  preheader: string;
  sections: { id: string; title: string; content: string }[];
  html: string;
  markdown?: string;
  generatedAt: string;
  reportType: string;
  reportId?: string;
  processorInfo?: ProcessorInfo;
}

interface ProcessorInfo {
  version: string;
  type: string;
  agentCount: number;
  qaScore?: number;
  qaPassed?: boolean;
  duration?: string;
  features?: string[];
  mode?: string;
}

interface LastSentInfo {
  sent_at: string;
  recipient_count: number;
  subject: string;
  report_type: string;
  admin_note?: string;
}

interface InclusionStatus {
  premium_included: boolean;
  basic_included: boolean;
  total_recipients: number;
  newsletter_subscribers: number;
  premium_recipients: number;
  basic_recipients: number;
}

interface WorkflowProgress {
  isRunning: boolean;
  currentPhase: string | null;
  currentStep: string | null;
  currentAgent: string | null;
  progress: number;
  elapsedSeconds: number;
  elapsedFormatted: string;
  estimatedRemaining: number;
  completedAgentCount: number;
  completedAgents: string[];
  recentLogs: Array<{
    time: string;
    phase: string;
    step: string;
    agent: string;
    message: string;
  }>;
  error: string | null;
}

// ISM Specific Types
interface ISMStatus {
  month: string;
  ismAvailable: boolean;
  willUseMockData: boolean;
  expectedReleaseDate: string;
  status: 'pending_ism' | 'ism_available' | 'generating' | 'report_generated' | 'error';
  reportExists: boolean;
  reportId?: string;
  reportGeneratedAt?: string;
}

interface ISMGenerationProgress {
  reportId: string;
  status: 'running' | 'completed' | 'error' | 'not_found';
  progress: number;
  currentPhase?: string;
  currentAgentId?: string;
  completedAgents: string[];
  elapsedSeconds: number;
  error?: string;
}

// Generation state per report type
interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentPhase: string | null;
  currentAgent: string | null;
  completedAgents: string[];
  elapsedSeconds: number;
  reportId: string | null;
  error: string | null;
}

// ============================================
// REPORT TYPES CONFIGURATION
// ============================================
const REPORT_TYPES: ReportType[] = [
  {
    id: 'ism',
    name: 'ISM Report',
    description: 'Manufacturing PMI analysis with 13 AI agents - macro regime, trends, sectors, trade ideas',
    icon: BarChart3,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    gradient: 'from-blue-600 to-cyan-600',
    endpoint: '/api/ism',
    estimatedTime: '~4:20',
    agentCount: 13,
    requiresInput: false,
  },
  {
    id: 'company',
    name: 'Company Analysis',
    description: 'Deep dive research on any company - fundamentals, technicals, catalysts, and investment thesis',
    icon: Building,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    gradient: 'from-purple-600 to-pink-600',
    endpoint: '/api/company',
    estimatedTime: '~4:00',
    agentCount: 18,
    requiresInput: true,
    inputLabel: 'Enter Ticker Symbol',
    inputPlaceholder: 'AAPL, TSLA, NVDA...',
  },
  {
    id: 'crypto',
    name: 'Crypto Report',
    description: 'Cryptocurrency market analysis with on-chain metrics, sentiment, and key levels',
    icon: Coins,
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    gradient: 'from-orange-600 to-amber-600',
    endpoint: '/api/crypto',
    estimatedTime: '~7:00',
    agentCount: 18,
    requiresInput: false,
  },
  {
    id: 'weekly',
    name: 'Weekly Review',
    description: 'Comprehensive weekly market summary with key events, performance recap, and outlook',
    icon: Calendar,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    gradient: 'from-emerald-600 to-teal-600',
    endpoint: '/api/reports/weekly',
    estimatedTime: '~4:00',
    agentCount: 20,
    requiresInput: false,
  },
];

// ============================================
// ISM AGENT DEFINITIONS (13 Agents)
// ============================================
const ISM_AGENTS = [
  { id: 'ism_data_fetcher', name: 'ISM Data Fetcher', icon: '📥', phase: 'DATA_ACQUISITION' },
  { id: 'historical_context_builder', name: 'Historical Context', icon: '📊', phase: 'DATA_ACQUISITION' },
  { id: 'macro_regime_detector', name: 'Macro Regime Detector', icon: '🎯', phase: 'MACRO_ANALYSIS' },
  { id: 'critical_gap_analyzer', name: 'Critical Gap Analyzer', icon: '🔍', phase: 'MACRO_ANALYSIS' },
  { id: 'narrative_architect', name: 'Narrative Architect', icon: '📖', phase: 'MACRO_ANALYSIS' },
  { id: 'persistent_trend_scanner', name: 'Trend Scanner', icon: '📈', phase: 'TREND_ANALYSIS' },
  { id: 'structural_pressure_mapper', name: 'Pressure Mapper', icon: '🏗️', phase: 'TREND_ANALYSIS' },
  { id: 'sector_impact_scorer', name: 'Sector Scorer', icon: '🏭', phase: 'SECTOR_ANALYSIS' },
  { id: 'respondent_quote_extractor', name: 'Quote Extractor', icon: '💬', phase: 'SECTOR_ANALYSIS' },
  { id: 'equity_criteria_builder', name: 'Equity Criteria', icon: '📋', phase: 'EQUITY_ANALYSIS' },
  { id: 'trade_idea_generator', name: 'Trade Ideas', icon: '💡', phase: 'TRADE_SYNTHESIS' },
  { id: 'coherence_checker', name: 'QA Checker', icon: '✅', phase: 'QUALITY_ASSURANCE' },
  { id: 'executive_summary_writer', name: 'Summary Writer', icon: '📝', phase: 'QUALITY_ASSURANCE' },
];

// ============================================
// AGENT ICONS MAP
// ============================================
const AGENT_ICONS: Record<string, string> = {
  // ISM Agents
  ism_data_fetcher: '📥',
  historical_context_builder: '📊',
  macro_regime_detector: '🎯',
  critical_gap_analyzer: '🔍',
  narrative_architect: '📖',
  persistent_trend_scanner: '📈',
  structural_pressure_mapper: '🏗️',
  sector_impact_scorer: '🏭',
  respondent_quote_extractor: '💬',
  equity_criteria_builder: '📋',
  trade_idea_generator: '💡',
  coherence_checker: '✅',
  executive_summary_writer: '📝',
  // Generic Agents
  ModeController: '🎯',
  StructuralTheme: '🏗️',
  DataNormalizer: '📊',
  StoryArchitect: '📖',
  MarketPulse: '💹',
  MarketStructure: '🏛️',
  Radar: '📡',
  Macro: '🌍',
  Analyst: '📈',
  News: '📰',
  Earnings: '💰',
  Options: '🎯',
  Sectors: '🔄',
  Technical: '📐',
  CrossAsset: '🔗',
  Catalysts: '⚡',
  Tactical: '🎖️',
  BottomLine: '📋',
  CoherenceChecker: '✅',
  SectionValidator: '🔍',
  GapFiller: '🔧',
  ToneEnhancer: '✨',
  Compiler: '📦',
  FinalQA: '🏆',
  DataFetcher: '📥',
  SectorAnalyst: '📊',
  WatchlistScanner: '🎯',
  EducationWriter: '📚',
  // Crypto Agents
  market_data_fetcher: '📊',
  onchain_data_fetcher: '⛓️',
  derivatives_data_fetcher: '📈',
  liquidity_flow_analyzer: '💧',
  onchain_metrics_analyzer: '🔗',
  holder_behavior_analyzer: '👥',
  derivatives_structure_analyzer: '🎯',
  liquidation_mapper: '💥',
  btc_fundamentals_analyzer: '₿',
  btc_thesis_builder: '📝',
  eth_network_analyzer: 'Ξ',
  eth_thesis_builder: '📋',
  altcoin_due_diligence: '🔍',
  altcoin_verdict_generator: '⚖️',
  risk_portfolio_advisor: '🛡️',
  coherence_summary_writer: '✅',
};

// ============================================
// LOCAL STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  preview: (reportId: string) => `finotaur_report_preview_${reportId}`,
  fullReport: (reportId: string) => `finotaur_report_full_${reportId}`,
  allReports: 'finotaur_all_reports_index',
  activeGenerations: 'finotaur_active_generations',
};

// Active generation tracking
interface ActiveGeneration {
  reportType: string;
  reportId: string;
  ticker?: string;
  startedAt: string;
}

const saveActiveGeneration = (reportType: string, reportId: string, ticker?: string) => {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.activeGenerations);
    const generations: Record<string, ActiveGeneration> = existing ? JSON.parse(existing) : {};
    generations[reportType] = {
      reportType,
      reportId,
      ticker,
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.activeGenerations, JSON.stringify(generations));
    console.log(`[Storage] Saved active generation: ${reportType} -> ${reportId}`);
  } catch (err) {
    console.error('[Storage] Failed to save active generation:', err);
  }
};

const removeActiveGeneration = (reportType: string) => {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.activeGenerations);
    if (existing) {
      const generations: Record<string, ActiveGeneration> = JSON.parse(existing);
      delete generations[reportType];
      localStorage.setItem(STORAGE_KEYS.activeGenerations, JSON.stringify(generations));
      console.log(`[Storage] Removed active generation: ${reportType}`);
    }
  } catch (err) {
    console.error('[Storage] Failed to remove active generation:', err);
  }
};

const getActiveGenerations = (): Record<string, ActiveGeneration> => {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.activeGenerations);
    return existing ? JSON.parse(existing) : {};
  } catch (err) {
    console.error('[Storage] Failed to get active generations:', err);
    return {};
  }
};

// ============================================
// ISM API FUNCTIONS
// ============================================

async function fetchISMStatus(month?: string): Promise<ISMStatus | null> {
  try {
    const url = month ? `${API_BASE}/api/ism/status/${month}` : `${API_BASE}/api/ism/status`;
    const res = await fetch(url);
    
    if (!res.ok) {
      console.log('[ISM API] Status request failed:', res.status);
      return null;
    }
    
    const data = await res.json();
    if (!data.success || !data.data) {
      console.log('[ISM API] No data in response');
      return null;
    }
    return data.data;
  } catch (err) {
    console.error('[ISM API] fetchISMStatus error:', err);
    return null;
  }
}

async function generateISMReport(month?: string, options?: {
  isAdminOverride?: boolean;
  overrideReason?: string;
  adminId?: string;
}): Promise<{ reportId: string; success: boolean }> {
  const res = await fetch(`${API_BASE}/api/ism/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, ...options }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

async function fetchISMProgress(reportId: string): Promise<ISMGenerationProgress> {
  const res = await fetch(`${API_BASE}/api/ism/progress/${reportId}`);
  
  // Handle 404 gracefully - report doesn't exist
  if (res.status === 404) {
    return {
      reportId,
      status: 'not_found',
      progress: 0,
      completedAgents: [],
      elapsedSeconds: 0,
    };
  }
  
  // Handle other HTTP errors
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Unknown error');
  return data.data;
}

async function fetchISMReport(reportId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/ism/report/${reportId}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function downloadISMPdf(reportId: string, month: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/ism/report/${reportId}/pdf`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ISM_Report_${month.replace('-', '_')}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function downloadCompanyPdf(reportId: string, ticker: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/company/report/${reportId}/pdf`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Company_Analysis_${ticker}_${new Date().toISOString().split('T')[0]}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function downloadCryptoPdf(reportId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/crypto/report/${reportId}/pdf`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Crypto_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function sendISMEmail(reportId: string, email: string, recipientName?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/ism/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId, email, recipientName }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
}

function getCurrentISMMonth(): string {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthDisplay(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}


// ============================================
// COMPANY ANALYSIS API FUNCTIONS
// ============================================

async function generateCompanyReport(ticker?: string): Promise<{ reportId: string; ticker: string; success: boolean }> {
  const res = await fetch(`${API_BASE}/api/company/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, isAdminOverride: true }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

async function fetchCompanyProgress(reportId: string): Promise<{
  status: 'running' | 'completed' | 'error' | 'not_found';
  progress: number;
  elapsedSeconds: number;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/company/progress/${reportId}`);
  
  // Handle 404 gracefully - report doesn't exist
  if (res.status === 404) {
    return {
      status: 'not_found',
      progress: 0,
      elapsedSeconds: 0,
    };
  }
  
  // Handle other HTTP errors
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Unknown error');
  return data.data;
}

async function fetchCompanyReport(reportId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/company/report/${reportId}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// Fetch the latest company report (if any exists)
async function fetchLatestCompanyReport(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/api/company/latest`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.data;
  } catch {
    return null;
  }
}

// Build markdown from structured company report data
function buildCompanyMarkdown(report: any): string {
  if (!report) return '';
  
  const lines: string[] = [];
  const ticker = report.ticker || 'Unknown';
  const companyName = report.company_name || ticker;
  
  // Header
  lines.push(`# ${companyName} (${ticker}) - Company Analysis`);
  lines.push('');
  lines.push(`**Sector:** ${report.sector || 'N/A'} | **Confidence:** ${report.confidence_level || 'N/A'} | **QA Score:** ${report.qa_score || 'N/A'}/100`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Executive Summary
  const exec = report.executive_summary;
  if (exec) {
    lines.push('## Executive Summary');
    lines.push('');
    if (exec.oneLiner) {
      lines.push(`**${exec.oneLiner}**`);
      lines.push('');
    }
    if (exec.lines && exec.lines.length > 0) {
      exec.lines.forEach((line: string) => {
        lines.push(`- ${line}`);
      });
      lines.push('');
    }
  }
  
  // Business Reality
  const biz = exec?._sections?.businessReality;
  if (biz) {
    lines.push('## Business Reality');
    lines.push('');
    if (biz.whatTheySell?.oneSentence) {
      lines.push(`**What They Do:** ${biz.whatTheySell.oneSentence}`);
      lines.push('');
    }
    if (biz.whatTheySell?.products && biz.whatTheySell.products.length > 0) {
      lines.push('### Products & Services');
      lines.push('');
      biz.whatTheySell.products.forEach((p: any) => {
        lines.push(`**${p.name}** (${p.revenueShare || 'N/A'})`);
        lines.push(`- ${p.description || 'No description'}`);
        lines.push(`- Growth: ${p.growth || 'N/A'}`);
        lines.push('');
      });
    }
  }
  
  // Financial Core
  const fin = exec?._sections?.financialCore;
  if (fin) {
    lines.push('## Financial Analysis');
    lines.push('');
    
    // Revenue Quality
    if (fin.revenueQuality) {
      const rq = fin.revenueQuality;
      lines.push('### Revenue Quality');
      lines.push('');
      if (rq.growth) {
        lines.push(`- **Current Growth:** ${rq.growth.current || 'N/A'}`);
        lines.push(`- **3-Year CAGR:** ${rq.growth.cagr3Year || 'N/A'}`);
        lines.push(`- **Trend:** ${rq.growth.trend || 'N/A'}`);
      }
      if (rq.growth?.sustainability) {
        lines.push(`- **Sustainability:** ${rq.growth.sustainability.assessment || 'N/A'}`);
        lines.push(`- **Rationale:** ${rq.growth.sustainability.rationale || 'N/A'}`);
        if (rq.growth.sustainability.risks?.length > 0) {
          lines.push(`- **Risks:** ${rq.growth.sustainability.risks.join(', ')}`);
        }
      }
      lines.push('');
    }
    
    // Cash Flow
    if (fin.cashFlow) {
      lines.push('### Cash Flow & Balance Sheet');
      lines.push('');
      if (fin.cashFlow.fcfAnalysis) {
        lines.push(`- **FCF TTM:** ${fin.cashFlow.fcfAnalysis.ttm || 'N/A'}`);
        lines.push(`- **FCF Margin:** ${fin.cashFlow.fcfAnalysis.margin || 'N/A'}`);
      }
      if (fin.cashFlow.balanceSheet) {
        lines.push(`- **Net Debt:** ${fin.cashFlow.balanceSheet.netDebt || 'N/A'}`);
        lines.push(`- **Leverage Ratio:** ${fin.cashFlow.balanceSheet.leverageRatio || 'N/A'}`);
      }
      lines.push('');
    }
  }
  
  // Investment Decision
  const inv = exec?._sections?.investmentDecision;
  if (inv) {
    lines.push('## Investment Decision');
    lines.push('');
    
    // Trade Profile
    if (inv.tradeProfile) {
      const tp = inv.tradeProfile;
      lines.push('### Trade Profile');
      lines.push('');
      if (tp.tradeType?.type) {
        lines.push(`- **Trade Type:** ${tp.tradeType.type}`);
        if (tp.tradeType.reasoning) lines.push(`  - ${tp.tradeType.reasoning}`);
      }
      if (tp.conviction) {
        lines.push(`- **Conviction:** ${tp.conviction.level || 'N/A'}`);
        if (tp.conviction.reasoning) lines.push(`  - ${tp.conviction.reasoning}`);
      }
      if (tp.riskReward) {
        lines.push(`- **Risk/Reward Ratio:** ${tp.riskReward.ratio || 'N/A'}`);
        lines.push(`- **Upside:** ${tp.riskReward.upside || 'N/A'}`);
        lines.push(`- **Downside:** ${tp.riskReward.downside || 'N/A'}`);
      }
      lines.push('');
    }
    
    // Valuation
    if (inv.valuation) {
      lines.push('### Valuation');
      lines.push('');
      const val = inv.valuation;
      if (val.currentValuation) {
        lines.push(`- **P/E:** ${val.currentValuation.pe || 'N/A'}`);
        lines.push(`- **EV/EBITDA:** ${val.currentValuation.evEbitda || 'N/A'}`);
        lines.push(`- **Price/Sales:** ${val.currentValuation.priceToSales || 'N/A'}`);
      }
      if (val.valuationVerdict?.assessment) {
        lines.push(`- **Assessment:** ${val.valuationVerdict.assessment}`);
      }
      lines.push('');
    }
    
    // Risk Monitor
    if (inv.riskMonitor?.keyRisks?.length > 0) {
      lines.push('### Key Risks');
      lines.push('');
      inv.riskMonitor.keyRisks.forEach((risk: any) => {
        lines.push(`- ${typeof risk === 'string' ? risk : risk.description || JSON.stringify(risk)}`);
      });
      lines.push('');
    }
  }
  
  // Forward View
  const fwd = exec?._sections?.forwardView;
  if (fwd?.scenarios) {
    lines.push('## Scenarios');
    lines.push('');
    const scenarios = fwd.scenarios;
    if (scenarios.bullCase?.thesis) {
      lines.push(`### 🐂 Bull Case (${scenarios.bullCase.probability || 'N/A'})`);
      lines.push(scenarios.bullCase.thesis);
      lines.push(`- **Target Return:** ${scenarios.bullCase.targetReturn || 'N/A'}`);
      lines.push('');
    }
    if (scenarios.bearCase?.thesis) {
      lines.push(`### 🐻 Bear Case (${scenarios.bearCase.probability || 'N/A'})`);
      lines.push(scenarios.bearCase.thesis);
      lines.push(`- **Target Return:** ${scenarios.bearCase.targetReturn || 'N/A'}`);
      lines.push('');
    }
  }
  
  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Report generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}*`);
  
  return lines.join('\n');
}

// ============================================
// CRYPTO ANALYSIS API FUNCTIONS
// ============================================

async function generateCryptoReport(): Promise<{ reportId: string; success: boolean }> {
  const res = await fetch(`${API_BASE}/api/crypto/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAdminOverride: true }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

async function fetchCryptoProgress(reportId: string): Promise<{
  status: 'running' | 'completed' | 'error' | 'not_found';
  progress: number;
  currentPhase?: string;
  currentAgent?: string;
  completedAgents: string[];
  elapsedSeconds: number;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/crypto/progress/${reportId}`);
  
  // Handle 404 gracefully - report doesn't exist
  if (res.status === 404) {
    return {
      status: 'not_found',
      progress: 0,
      completedAgents: [],
      elapsedSeconds: 0,
    };
  }
  
  // Handle other HTTP errors
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Unknown error');
  return data.data;
}

async function fetchCryptoReport(reportId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/crypto/report/${reportId}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatExactTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${Math.floor(diffHours / 24)} days ago`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const getPhaseColor = (phase: string | null): string => {
  if (!phase) return 'text-gray-500';
  switch (phase) {
    case 'INIT': return 'text-gray-400';
    case 'DATA_FETCH':
    case 'DATA_ACQUISITION': return 'text-blue-400';
    case 'PHASE_0':
    case 'MACRO_ANALYSIS': return 'text-purple-400';
    case 'PHASE_1':
    case 'TREND_ANALYSIS': return 'text-cyan-400';
    case 'PHASE_2':
    case 'SECTOR_ANALYSIS': return 'text-[#C9A646]';
    case 'PHASE_3':
    case 'EQUITY_ANALYSIS': return 'text-orange-400';
    case 'TRADE_SYNTHESIS': return 'text-pink-400';
    case 'PHASE_4':
    case 'QUALITY_ASSURANCE': return 'text-emerald-400';
    case 'COMPLETE': return 'text-emerald-500';
    case 'ERROR': return 'text-red-500';
    default: return 'text-gray-400';
  }
};

const getPhaseBgColor = (phase: string | null): string => {
  if (!phase) return 'bg-gray-500/10';
  switch (phase) {
    case 'INIT': return 'bg-gray-400/10';
    case 'DATA_FETCH':
    case 'DATA_ACQUISITION': return 'bg-blue-400/10';
    case 'PHASE_0':
    case 'MACRO_ANALYSIS': return 'bg-purple-400/10';
    case 'PHASE_1':
    case 'TREND_ANALYSIS': return 'bg-cyan-400/10';
    case 'PHASE_2':
    case 'SECTOR_ANALYSIS': return 'bg-[#C9A646]/10';
    case 'PHASE_3':
    case 'EQUITY_ANALYSIS': return 'bg-orange-400/10';
    case 'TRADE_SYNTHESIS': return 'bg-pink-400/10';
    case 'PHASE_4':
    case 'QUALITY_ASSURANCE': return 'bg-emerald-400/10';
    case 'COMPLETE': return 'bg-emerald-500/10';
    case 'ERROR': return 'bg-red-500/10';
    default: return 'bg-gray-400/10';
  }
};

const getPhaseLabel = (phase: string | null): string => {
  if (!phase) return 'Waiting';
  switch (phase) {
    case 'INIT': return 'Initializing';
    case 'DATA_FETCH':
    case 'DATA_ACQUISITION': return 'Fetching Data';
    case 'PHASE_0':
    case 'MACRO_ANALYSIS': return 'Macro Analysis';
    case 'PHASE_1':
    case 'TREND_ANALYSIS': return 'Trend Analysis';
    case 'PHASE_2':
    case 'SECTOR_ANALYSIS': return 'Sector Analysis';
    case 'PHASE_3':
    case 'EQUITY_ANALYSIS': return 'Equity Analysis';
    case 'TRADE_SYNTHESIS': return 'Trade Synthesis';
    case 'PHASE_4':
    case 'QUALITY_ASSURANCE': return 'Quality Assurance';
    case 'COMPLETE': return 'Complete';
    case 'ERROR': return 'Error';
    default: return phase;
  }
};

// ============================================
// STORAGE HELPERS - ENHANCED VERSION
// ============================================
const saveReportToStorage = (reportId: string, preview: PreviewData, fullReport: string) => {
  try {
    localStorage.setItem(STORAGE_KEYS.preview(reportId), JSON.stringify(preview));
    localStorage.setItem(STORAGE_KEYS.fullReport(reportId), fullReport);
    
    // Update index of all saved reports
    const indexStr = localStorage.getItem(STORAGE_KEYS.allReports);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];
    if (!index.includes(reportId)) {
      index.push(reportId);
      localStorage.setItem(STORAGE_KEYS.allReports, JSON.stringify(index));
    }
    
    console.log(`[Storage] Saved report: ${reportId}`);
  } catch (err) {
    console.error(`[Storage] Failed to save report ${reportId}:`, err);
  }
};

const loadReportFromStorage = (reportId: string): { preview: PreviewData | null; fullReport: string | null } => {
  try {
    const previewStr = localStorage.getItem(STORAGE_KEYS.preview(reportId));
    const fullReport = localStorage.getItem(STORAGE_KEYS.fullReport(reportId));
    
    if (!previewStr) {
      return { preview: null, fullReport: null };
    }
    
    const preview = JSON.parse(previewStr) as PreviewData;
    
    // Check if report is older than 24 hours
    const age = Date.now() - new Date(preview.generatedAt).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      console.log(`[Storage] Report ${reportId} expired, clearing...`);
      clearReportFromStorage(reportId);
      return { preview: null, fullReport: null };
    }
    
    console.log(`[Storage] Loaded report: ${reportId}`);
    return { preview, fullReport };
  } catch (err) {
    console.error(`[Storage] Failed to load report ${reportId}:`, err);
    return { preview: null, fullReport: null };
  }
};

const clearReportFromStorage = (reportId: string) => {
  try {
    localStorage.removeItem(STORAGE_KEYS.preview(reportId));
    localStorage.removeItem(STORAGE_KEYS.fullReport(reportId));
    
    // Update index
    const indexStr = localStorage.getItem(STORAGE_KEYS.allReports);
    if (indexStr) {
      const index: string[] = JSON.parse(indexStr);
      const newIndex = index.filter(id => id !== reportId);
      localStorage.setItem(STORAGE_KEYS.allReports, JSON.stringify(newIndex));
    }
    
    console.log(`[Storage] Cleared report: ${reportId}`);
  } catch (err) {
    console.error(`[Storage] Failed to clear report ${reportId}:`, err);
  }
};

const loadAllReportsFromStorage = (): { previews: Record<string, PreviewData>; fullReports: Record<string, string> } => {
  const previews: Record<string, PreviewData> = {};
  const fullReports: Record<string, string> = {};
  
  try {
    const indexStr = localStorage.getItem(STORAGE_KEYS.allReports);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];
    
    // Also check known report types
    const allIds = [...new Set([...index, ...REPORT_TYPES.map(r => r.id)])];
    
    for (const reportId of allIds) {
      const { preview, fullReport } = loadReportFromStorage(reportId);
      if (preview && fullReport) {
        previews[reportId] = preview;
        fullReports[reportId] = fullReport;
      }
    }
  } catch (err) {
    console.error('[Storage] Failed to load all reports:', err);
  }
  
  return { previews, fullReports };
};

// ============================================
// ISM STATUS BADGE COMPONENT
// ============================================
const ISMStatusBadge: React.FC<{ status: string; willUseMock?: boolean }> = ({ status, willUseMock }) => {
  const styles: Record<string, string> = {
    pending_ism: willUseMock 
      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      : 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    ism_available: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    generating: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    report_generated: 'bg-green-500/20 text-green-400 border-green-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const labels: Record<string, string> = {
    pending_ism: willUseMock ? 'Ready (Mock)' : 'Waiting for ISM',
    ism_available: 'ISM Available',
    generating: 'Generating...',
    report_generated: 'Report Ready',
    error: 'Error',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.error}`}>
      {labels[status] || status}
    </span>
  );
};

// ============================================
// QA SCORE BADGE
// ============================================
const QAScoreBadge: React.FC<{ score?: number; passed?: boolean }> = ({ score, passed }) => {
  if (!score) return null;

  const getColor = () => {
    if (score >= 85) return 'emerald';
    if (score >= 75) return 'yellow';
    return 'red';
  };

  const color = getColor();
  const colors = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${colors[color]}`}>
      <Shield className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">QA: {score}/100</span>
      {passed && <CheckCircle className="w-3 h-3" />}
    </div>
  );
};

// ============================================
// INLINE PROGRESS COMPONENT (for cards)
// ============================================
const InlineProgress: React.FC<{
  progress: number;
  currentPhase: string | null;
  currentAgent: string | null;
  completedAgents: string[];
  elapsedSeconds: number;
  reportType: ReportType;
  isISM?: boolean;
  onCancel?: () => void;
}> = ({ progress, currentPhase, currentAgent, completedAgents, elapsedSeconds, reportType, isISM, onCancel }) => {
  return (
    <div className="mt-4 space-y-3">
      {/* LIVE indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            LIVE
          </span>
          {currentPhase && (
            <span className={`px-2 py-0.5 rounded text-xs ${getPhaseBgColor(currentPhase)} ${getPhaseColor(currentPhase)}`}>
              {getPhaseLabel(currentPhase)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">
            {formatDuration(elapsedSeconds)} / {reportType.estimatedTime}
          </span>
          {/* Cancel button for stuck generations */}
          {onCancel && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
              title="Cancel generation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${reportType.gradient} transition-all duration-500 relative`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
        <span className="absolute right-0 top-3 text-xs text-gray-500">{progress}%</span>
      </div>

      {/* Current agent */}
      {currentAgent && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-lg">{AGENT_ICONS[currentAgent] || '🤖'}</span>
          <span className="text-gray-400">
            {isISM ? ISM_AGENTS.find(a => a.id === currentAgent)?.name || currentAgent : currentAgent}
          </span>
          <Loader2 className="w-3 h-3 animate-spin text-[#C9A646]" />
        </div>
      )}

      {/* Agents progress */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          Agents: <span className="text-emerald-400">{completedAgents.length}</span>/{reportType.agentCount}
        </span>
      </div>

      {/* ISM mini agent grid */}
      {isISM && (
        <div className="flex flex-wrap gap-1">
          {ISM_AGENTS.map((agent) => (
            <div
              key={agent.id}
              className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-all ${
                completedAgents.includes(agent.id) 
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : currentAgent === agent.id 
                    ? 'bg-[#C9A646]/20 border border-[#C9A646]/30 animate-pulse' 
                    : 'bg-gray-800/50 border border-gray-700/30'
              }`}
              title={agent.name}
            >
              {agent.icon}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// INLINE PREVIEW COMPONENT (for cards) - FIXED
// ============================================
const InlinePreview: React.FC<{
  preview: PreviewData;
  fullReport: string;
  reportType: ReportType;
  onViewFull: () => void;
  onDownloadPdf?: () => void;
  onRegenerate: () => void;
  onClear: () => void;
}> = ({ preview, fullReport, reportType, onViewFull, onDownloadPdf, onRegenerate, onClear }) => {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Get first 500 chars of markdown for preview - use multiple fallbacks
  const previewText = useMemo(() => {
    const text = fullReport || preview.markdown || preview.html || '';
    // Remove headers and get clean text
    const cleaned = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/^#{1,3}\s+.*/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
    return cleaned.slice(0, 400) + (cleaned.length > 400 ? '...' : '');
  }, [preview.markdown, preview.html, fullReport]);

  const handleDelete = () => {
    onClear();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Report Ready</span>
        </div>
        {preview.processorInfo?.qaScore && (
          <QAScoreBadge score={preview.processorInfo.qaScore} passed={preview.processorInfo.qaPassed} />
        )}
      </div>

      {/* Generated time */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        <span>{formatTimeAgo(preview.generatedAt)}</span>
        {preview.processorInfo?.duration && (
          <>
            <span>•</span>
            <span>Duration: {preview.processorInfo.duration}</span>
          </>
        )}
      </div>

      {/* Preview content - collapsible */}
      <div className="relative">
        <div 
          className={`text-xs text-gray-400 leading-relaxed overflow-hidden transition-all duration-300 ${
            expanded ? 'max-h-96' : 'max-h-20'
          }`}
        >
          {previewText || 'No preview available'}
        </div>
        {!expanded && previewText.length > 200 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0d0d18] to-transparent" />
        )}
      </div>

      {/* Expand/collapse button */}
      {previewText.length > 200 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show more
            </>
          )}
        </button>
      )}

      {/* ============================================ */}
      {/* ACTION BUTTONS - CLEAR SEPARATION */}
      {/* ============================================ */}
      <div className="pt-3 border-t border-gray-800/50 space-y-3">
        {/* Primary Actions Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={onViewFull}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-gradient-to-r ${reportType.gradient} hover:opacity-90 transition-all text-white text-sm font-medium`}
          >
            <Eye className="w-4 h-4" />
            View Full Report
          </button>
          
          {onDownloadPdf && (
            <button
              onClick={onDownloadPdf}
              className="p-2.5 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Secondary Actions Row - Clear Delete & Regenerate */}
        <div className="flex items-center gap-2">
          {/* Generate New Report Button */}
          <button
            onClick={onRegenerate}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all text-blue-400 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Generate New Report
          </button>
          
          {/* Delete Current Report Button */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all text-red-400 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete Report
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-all text-white text-xs font-medium"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-all text-gray-400 text-xs font-medium"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// REPORT TYPE CARD COMPONENT (FIXED)
// ============================================
const ReportTypeCard: React.FC<{
  report: ReportType;
  isSelected: boolean;
  generationState: GenerationState | null;
  preview: PreviewData | null;
  fullReport: string | null;
  ismStatus?: ISMStatus | null;
  onClick: () => void;
  onGenerate: (inputValue?: string) => void;
  onViewFull: () => void;
  onDownloadPdf?: () => void;
  onClearPreview: () => void;
}> = ({ 
  report, 
  isSelected, 
  generationState, 
  preview, 
  fullReport,
  ismStatus, 
  onClick, 
  onGenerate, 
  onViewFull, 
  onDownloadPdf,
  onClearPreview 
}) => {
  const Icon = report.icon;
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  
  const isISM = report.id === 'ism';
  const isGenerating = generationState?.isGenerating || false;
  
  // More robust check - preview exists and has some content
  const hasPreview = !!(preview && (fullReport || preview.markdown || preview.html));
  
  // Debug logging
  useEffect(() => {
    if (preview || fullReport) {
      console.log(`[Card ${report.id}] preview:`, !!preview, 'fullReport:', !!fullReport, 'hasPreview:', hasPreview);
    }
  }, [preview, fullReport, hasPreview, report.id]);
  
  const handleGenerate = () => {
    if (report.requiresInput) {
      if (showInput && inputValue.trim()) {
        onGenerate(inputValue.trim().toUpperCase());
        setInputValue('');
        setShowInput(false);
      } else {
        setShowInput(true);
      }
    } else {
      onGenerate();
    }
  };

  // Get status indicator for mini view
  const getStatusIndicator = () => {
    if (isGenerating) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{generationState?.progress || 0}%</span>
        </div>
      );
    }
    if (hasPreview) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
          <CheckCircle className="w-3 h-3" />
          <span>Ready</span>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div 
      onClick={onClick}
      className={`relative bg-[#0d0d18] rounded-xl border transition-all cursor-pointer overflow-hidden ${
        isSelected 
          ? 'border-[#C9A646] ring-2 ring-[#C9A646]/20' 
          : 'border-gray-800/50 hover:border-gray-700'
      }`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C9A646] to-orange-500" />
      )}
      
      {/* Generating indicator */}
      {isGenerating && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${report.iconBg} border border-current/20 relative`}>
            <Icon className={`w-6 h-6 ${report.iconColor}`} />
            {isGenerating && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusIndicator()}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-800/50 text-xs text-gray-400">
              <Bot className="w-3 h-3" />
              <span>{report.agentCount}</span>
            </div>
          </div>
        </div>
        
        <h3 className="text-white font-semibold mb-1">{report.name}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{report.description}</p>
        
        {/* ISM Status */}
        {isISM && ismStatus && !isGenerating && !hasPreview && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {formatMonthDisplay(ismStatus.month)}
              </span>
              <ISMStatusBadge status={ismStatus.status} willUseMock={ismStatus.willUseMockData} />
            </div>
            {ismStatus.willUseMockData && !ismStatus.reportExists && (
              <p className="text-xs text-yellow-400 flex items-center gap-1">
                <span>🧪</span> Will use mock data
              </p>
            )}
          </div>
        )}

        {/* INLINE PROGRESS - When generating */}
        {isGenerating && generationState && (
          <InlineProgress
            progress={generationState.progress}
            currentPhase={generationState.currentPhase}
            currentAgent={generationState.currentAgent}
            completedAgents={generationState.completedAgents}
            elapsedSeconds={generationState.elapsedSeconds}
            reportType={report}
            isISM={isISM}
          />
        )}

        {/* INLINE PREVIEW - When report is ready */}
        {!isGenerating && hasPreview && (
          <InlinePreview
            preview={preview}
            fullReport={fullReport}
            reportType={report}
            onViewFull={onViewFull}
            onDownloadPdf={onDownloadPdf}
            onRegenerate={() => onGenerate()}
            onClear={onClearPreview}
          />
        )}

        {/* Ticker Input for Company Analysis */}
        {report.requiresInput && showInput && !isGenerating && !hasPreview && (
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1.5 block">{report.inputLabel}</label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              onClick={(e) => e.stopPropagation()}
              placeholder={report.inputPlaceholder}
              className="w-full px-3 py-2 bg-[#080812] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm font-mono"
              maxLength={10}
            />
          </div>
        )}
        
        {/* Generate button - Only show when not generating and no preview */}
        {!isGenerating && !hasPreview && (
          <div className="w-full space-y-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
              disabled={report.requiresInput && showInput && !inputValue.trim()}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${report.gradient} hover:opacity-90 disabled:opacity-50 transition-all text-white font-medium text-sm`}
            >
              {report.requiresInput && showInput ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze {inputValue || 'Ticker'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </button>
            {/* Admin Override for ISM when data not available */}
            {isISM && ismStatus?.willUseMockData && !ismStatus?.reportExists && (
              <p className="text-[10px] text-center text-yellow-500/70">
                ⚠️ ISM not released yet - will use mock data
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// FULL REPORT VIEWER MODAL - FIXED
// ============================================
const ReportViewerModal: React.FC<{
  report: string;
  subject: string;
  reportType: ReportType;
  processorInfo: ProcessorInfo | null;
  generatedAt: string;
  onClose: () => void;
  onDownloadPdf?: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}> = ({ report, subject, reportType, processorInfo, generatedAt, onClose, onDownloadPdf, onRegenerate, onDelete }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'markdown'>('rendered');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      toast.success('Report copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const downloadReport = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finotaur-${reportType.id}-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  const renderMarkdown = (md: string) => {
    let html = md
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-[#C9A646] mt-6 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-8 mb-3 pb-2 border-b border-gray-800">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-[#C9A646] mb-4">$1</h1>')
      .replace(/^-{3,}$/gim, '<hr class="border-gray-700 my-6" />')
      .replace(/^={3,}$/gim, '<hr class="border-[#C9A646]/30 my-8" />')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>')
      .replace(/🔥/g, '<span class="text-orange-500">🔥</span>')
      .replace(/🎯/g, '<span class="text-red-500">🎯</span>')
      .replace(/✅/g, '<span class="text-emerald-500">✅</span>')
      .replace(/⚠️/g, '<span class="text-yellow-500">⚠️</span>')
      .replace(/❌/g, '<span class="text-red-500">❌</span>')
      .replace(/📊/g, '<span class="text-blue-500">📊</span>')
      .replace(/📈/g, '<span class="text-emerald-500">📈</span>')
      .replace(/\n\n/g, '</p><p class="text-gray-400 leading-relaxed mb-4">')
      .replace(/\n/g, '<br/>');
    
    return `<p class="text-gray-400 leading-relaxed mb-4">${html}</p>`;
  };

  const Icon = reportType.icon;
  const isISM = reportType.id === 'ism';

  // If no report content, show error
  if (!report || report.trim() === '') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-[#0a0a12] border border-gray-800 rounded-2xl shadow-2xl p-8 max-w-md">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-white font-medium mb-2">Report content not available</h3>
            <p className="text-gray-500 text-sm mb-4">
              The report content could not be loaded. Try generating a new report.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { onClose(); onRegenerate(); }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500"
              >
                Generate New
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className={`relative bg-[#0a0a12] border border-gray-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${
        isFullscreen ? 'w-[98vw] h-[98vh]' : 'w-[95vw] max-w-5xl h-[90vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#080812] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${reportType.iconBg} border border-current/20`}>
              <Icon className={`w-5 h-5 ${reportType.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">{subject || reportType.name}</h2>
                {isISM && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/50 text-red-400 border border-red-500/30">
                    TOP SECRET
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {processorInfo && (
                  <>
                    <span className="text-xs text-gray-500">{processorInfo.version}</span>
                    <span className="text-gray-700">•</span>
                    <span className="text-xs text-[#C9A646]">{processorInfo.agentCount} Agents</span>
                    {processorInfo.duration && (
                      <>
                        <span className="text-gray-700">•</span>
                        <span className="text-xs text-gray-500">{processorInfo.duration}</span>
                      </>
                    )}
                  </>
                )}
                <span className="text-gray-700">•</span>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-400">{formatExactTime(generatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {processorInfo?.qaScore && (
              <QAScoreBadge score={processorInfo.qaScore} passed={processorInfo.qaPassed} />
            )}
            
            <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('rendered')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'rendered' 
                    ? 'bg-[#C9A646] text-black' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Rendered
              </button>
              <button
                onClick={() => setViewMode('markdown')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'markdown' 
                    ? 'bg-[#C9A646] text-black' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Markdown
              </button>
            </div>

            <button
              onClick={copyToClipboard}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <Copy className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            <button
              onClick={downloadReport}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              title="Download Markdown"
            >
              <Download className="w-5 h-5 text-gray-400" />
            </button>

            {onDownloadPdf && (
              <button
                onClick={onDownloadPdf}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors bg-red-900/30 border border-red-500/30"
                title="Download PDF (TOP SECRET)"
              >
                <FileText className="w-5 h-5 text-red-400" />
              </button>
            )}
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Maximize2 className="w-5 h-5 text-gray-400" />
            </button>
            
            <button 
              onClick={onClose} 
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'rendered' ? (
            <div className="p-8 max-w-4xl mx-auto">
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
              />
            </div>
          ) : (
            <div className="p-6">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-[#0d0d18] p-6 rounded-xl border border-gray-800 overflow-auto">
                {report}
              </pre>
            </div>
          )}
        </div>

        {/* Footer with Report Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-[#080812] rounded-b-2xl">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{report.split(' ').length.toLocaleString()} words</span>
            <span>•</span>
            <span>{report.length.toLocaleString()} characters</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Generate New Report */}
            <button
              onClick={() => { onClose(); onRegenerate(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors text-blue-400 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Generate New
            </button>
            
            {/* Delete Report */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors text-red-400 font-medium text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 transition-colors text-white text-sm font-medium"
                >
                  <Check className="w-4 h-4" />
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-700 hover:bg-gray-800 transition-colors text-gray-400 text-sm"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// LAST SENT STATUS COMPONENT
// ============================================
const LastSentStatus: React.FC<{ lastSent: LastSentInfo | null; isLoading: boolean }> = ({ 
  lastSent, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (!lastSent) {
    return (
      <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-800">
            <History className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-gray-400 font-medium">No reports sent yet</p>
            <p className="text-xs text-gray-600">Generate and send your first report</p>
          </div>
        </div>
      </div>
    );
  }

  const reportType = REPORT_TYPES.find(r => r.id === lastSent.report_type);
  const Icon = reportType?.icon || FileText;
  const timeAgo = formatTimeAgo(lastSent.sent_at);

  return (
    <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800/50 bg-[#080812] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-white">Last Report Sent</span>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
          {timeAgo}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">
            {formatExactTime(lastSent.sent_at)}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <Icon className={`w-4 h-4 mt-0.5 ${reportType?.iconColor || 'text-gray-500'}`} />
          <p className="text-sm text-white font-medium">{lastSent.subject}</p>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-gray-800/50">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-400">
              <span className="text-white font-medium">{lastSent.recipient_count}</span> recipients
            </span>
          </div>
          
          {reportType && (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${reportType.iconBg}`}>
              <Icon className={`w-3 h-3 ${reportType.iconColor}`} />
              <span className={`text-xs ${reportType.iconColor}`}>{reportType.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// STAT CARD
// ============================================
const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  valueColor?: string;
  loading?: boolean;
}> = ({ title, value, icon: Icon, iconBg, valueColor = 'text-white', loading }) => (
  <div className="bg-[#0d0d18] rounded-xl p-5 border border-gray-800/50">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        {loading ? (
          <div className="h-9 flex items-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          </div>
        ) : (
          <p className={`text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
        )}
      </div>
      <div className={`p-3.5 rounded-xl ${iconBg}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

// ============================================
// STATUS BADGE
// ============================================
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
    active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle, label: 'Active' },
    trial: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock, label: 'Trial' },
    cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Cancelled' },
    inactive: { bg: 'bg-gray-800', text: 'text-gray-400', icon: X, label: 'Not Subscribed' },
  };
  const { bg, text, icon: Icon, label } = config[status] || config.inactive;

  return (
    <div className={`px-2.5 py-1 rounded-lg ${bg} flex items-center gap-1.5`}>
      <Icon className={`w-3.5 h-3.5 ${text}`} />
      <span className={`text-xs font-medium ${text}`}>{label}</span>
    </div>
  );
};

// ============================================
// JOURNAL PLAN BADGE
// ============================================
const JournalPlanBadge: React.FC<{ type: string }> = ({ type }) => {
  const config: Record<string, { bg: string; text: string; icon?: React.ElementType }> = {
    free: { bg: 'bg-gray-800', text: 'text-gray-400' },
    basic: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Star },
    premium: { bg: 'bg-[#C9A646]/20', text: 'text-[#C9A646]', icon: Crown },
  };
  const { bg, text, icon: Icon } = config[type] || config.free;

  return (
    <div className={`px-2 py-0.5 rounded ${bg} flex items-center gap-1`}>
      {Icon && <Icon className={`w-3 h-3 ${text}`} />}
      <span className={`text-xs capitalize ${text}`}>{type}</span>
    </div>
  );
};

// ============================================
// MAIN COMPONENT - FIXED VERSION
// ============================================
const TopSecretAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  
  // State
  const [selectedReportType, setSelectedReportType] = useState<string>(REPORT_TYPES[0].id);
  const [selectedReportToSend, setSelectedReportToSend] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cancelled' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [useCustomSelection, setUseCustomSelection] = useState(false);
  const [customSelectedIds, setCustomSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  
  // Per-report generation states
  const [generationStates, setGenerationStates] = useState<Record<string, GenerationState>>({});
  
  // FIXED: Separate state for previews and full reports
  const [previews, setPreviews] = useState<Record<string, PreviewData>>({});
  const [fullReports, setFullReports] = useState<Record<string, string>>({});
  
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [basicEnabled, setBasicEnabled] = useState(false);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  
  // ISM Specific State
  const [ismStatus, setIsmStatus] = useState<ISMStatus | null>(null);
  
  // Progress polling refs (per report type)
  const progressIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  const pageSize = 15;

  const currentReportType = REPORT_TYPES.find(r => r.id === selectedReportType) || REPORT_TYPES[0];
  
  // Get the report to send (either selected or current)
  const reportToSend = selectedReportToSend || selectedReportType;
  const reportToSendType = REPORT_TYPES.find(r => r.id === reportToSend) || REPORT_TYPES[0];
  const reportToSendPreview = previews[reportToSend];
  const reportToSendFullReport = fullReports[reportToSend];

  // Helper to update generation state for a specific report
  const updateGenerationState = useCallback((reportId: string, updates: Partial<GenerationState>) => {
    setGenerationStates(prev => ({
      ...prev,
      [reportId]: { ...prev[reportId], ...updates } as GenerationState
    }));
  }, []);

  // Helper to clear generation state
  const clearGenerationState = useCallback((reportId: string) => {
    setGenerationStates(prev => {
      const newStates = { ...prev };
      delete newStates[reportId];
      return newStates;
    });
    // Clear interval if exists
    if (progressIntervalsRef.current[reportId]) {
      clearInterval(progressIntervalsRef.current[reportId]);
      delete progressIntervalsRef.current[reportId];
    }
  }, []);

  // Debug: Log when previews or fullReports change
  useEffect(() => {
    console.log('[State] Previews updated:', Object.keys(previews));
    console.log('[State] FullReports updated:', Object.keys(fullReports));
  }, [previews, fullReports]);

  // ============================================
  // LOAD ISM STATUS - FIXED (moved up)
  // ============================================
  const loadISMStatus = useCallback(async () => {
    try {
      const status = await fetchISMStatus();
      
      // Check if status is valid
      if (!status) {
        console.log('[ISM] No status returned from API');
        return;
      }
      
      setIsmStatus(status);
      
      // If report exists, load it
      if (status.reportExists && status.reportId) {
        try {
          const report = await fetchISMReport(status.reportId);
          const markdownContent = report?.markdown_content || '';
          
          if (!markdownContent && !report?.html_content) {
            console.log('[ISM] Report exists but has no content');
            return;
          }
          
          // Create preview data from ISM report
          const preview: PreviewData = {
            subject: `ISM Manufacturing Report - ${formatMonthDisplay(status.month)}`,
            preheader: 'TOP SECRET - Institutional Market Intelligence',
            sections: [],
            html: report.html_content || '',
            markdown: markdownContent,
            generatedAt: report.created_at || new Date().toISOString(),
            reportType: 'ism',
            reportId: status.reportId,
            processorInfo: {
              version: 'ISM v1.0',
              type: 'ism',
              agentCount: 13,
              qaScore: report.qa_score,
              qaPassed: report.qa_passed,
            },
          };
          
          // Set both preview AND fullReport
          console.log(`[ISM] Setting preview and fullReport for ISM, content length: ${markdownContent.length}`);
          setPreviews(prev => ({ ...prev, ism: preview }));
          setFullReports(prev => ({ ...prev, ism: markdownContent }));
          
          // Also save to localStorage for persistence
          saveReportToStorage('ism', preview, markdownContent);
          console.log('[ISM] Report saved to state and localStorage');
        } catch (reportErr) {
          console.error('[ISM] Failed to fetch report:', reportErr);
        }
      }
    } catch (err) {
      console.error('Failed to load ISM status:', err);
    }
  }, []);

  // ============================================
  // RESUME POLLING FUNCTIONS
  // ============================================
  
  // Resume ISM polling
  const resumeISMPolling = useCallback((reportId: string) => {
    console.log('[Resume] Starting ISM polling for:', reportId);
    
    let errorCount = 0;
    const maxErrors = 3;
    
    progressIntervalsRef.current['ism'] = setInterval(async () => {
      try {
        const progress = await fetchISMProgress(reportId);
        
        // Reset error count on success
        errorCount = 0;
        
        updateGenerationState('ism', {
          progress: progress.progress,
          currentPhase: progress.currentPhase || null,
          currentAgent: progress.currentAgentId || null,
          completedAgents: progress.completedAgents,
          elapsedSeconds: progress.elapsedSeconds,
        });
        
        if (progress.status === 'completed' || progress.status === 'error') {
          clearGenerationState('ism');
          removeActiveGeneration('ism');
          
          if (progress.status === 'completed') {
            toast.success('ISM Report generated successfully!');
            // Will reload on next mount
          } else {
            toast.error(`ISM generation failed: ${progress.error}`);
          }
        } else if (progress.status === 'not_found') {
          // Report doesn't exist on server
          console.log('[Resume] ISM report not found on server, clearing...');
          clearGenerationState('ism');
          removeActiveGeneration('ism');
          toast.error('Report not found. The server may have restarted. Please try again.');
        }
      } catch (err: any) {
        console.error('[Resume] ISM progress fetch error:', err);
        errorCount++;
        
        // If we get too many errors, the generation probably doesn't exist anymore
        if (errorCount >= maxErrors) {
          console.log('[Resume] Too many errors, clearing stale ISM generation');
          clearGenerationState('ism');
          removeActiveGeneration('ism');
          toast.error('Generation no longer available. Please start a new one.');
        }
      }
    }, 2000);
  }, [updateGenerationState, clearGenerationState]);

  // Resume Company polling
  const resumeCompanyPolling = useCallback((reportId: string, ticker: string) => {
    console.log('[Resume] Starting Company polling for:', reportId);
    
    let errorCount = 0;
    const maxErrors = 3;
    
    progressIntervalsRef.current['company'] = setInterval(async () => {
      try {
        const progress = await fetchCompanyProgress(reportId);
        
        // Reset error count on success
        errorCount = 0;
        
        updateGenerationState('company', {
          progress: progress.progress,
          currentPhase: progress.progress < 20 ? 'DATA_ACQUISITION' : 
                       progress.progress < 50 ? 'BUSINESS_ANALYSIS' : 
                       progress.progress < 80 ? 'FINANCIAL_ANALYSIS' : 'QUALITY_ASSURANCE',
          elapsedSeconds: progress.elapsedSeconds,
        });

        if (progress.status === 'completed') {
          console.log('[Resume] Company generation completed!');
          clearGenerationState('company');
          removeActiveGeneration('company');

          try {
            const response = await fetchCompanyReport(reportId);
            const report = response?.report || response;
            
            const markdownContent = report?.markdown_content 
              || report?.content 
              || report?.markdownContent
              || '';
            
            const htmlContent = report?.html_content 
              || report?.htmlContent 
              || report?.html 
              || '';

            let finalContent = markdownContent;
            if (!finalContent && report?.sections && Array.isArray(report.sections)) {
              finalContent = report.sections.map((s: any) => 
                `## ${s.title || s.name || ''}\n\n${s.content || s.text || ''}`
              ).join('\n\n');
            }

            if (finalContent || htmlContent) {
              const preview: PreviewData = {
                subject: `Company Analysis: ${ticker}`,
                preheader: `Deep dive research on ${ticker}`,
                sections: [],
                html: htmlContent,
                markdown: finalContent,
                generatedAt: report?.created_at || new Date().toISOString(),
                reportType: 'company',
                reportId: reportId,
                processorInfo: {
                  version: 'Company v1.0',
                  type: 'company',
                  agentCount: 23,
                  qaScore: report?.qa_score || 85,
                  qaPassed: true,
                  duration: formatDuration(progress.elapsedSeconds),
                },
              };

              setPreviews(prev => ({ ...prev, company: preview }));
              setFullReports(prev => ({ ...prev, company: finalContent }));
              saveReportToStorage('company', preview, finalContent);
              toast.success(`✅ Company Analysis for ${ticker} ready!`);
            } else {
              // No markdown content - build from structured data
              console.log('[Resume] No markdown content, building from structured data...');
              const builtMarkdown = buildCompanyMarkdown(report);
              
              if (builtMarkdown) {
                const preview: PreviewData = {
                  subject: `Company Analysis: ${ticker}`,
                  preheader: `Deep dive research on ${ticker}`,
                  sections: [],
                  html: '',
                  markdown: builtMarkdown,
                  generatedAt: report?.created_at || new Date().toISOString(),
                  reportType: 'company',
                  reportId: reportId,
                  processorInfo: {
                    version: 'Company v1.0',
                    type: 'company',
                    agentCount: 23,
                    qaScore: report?.qa_score || 85,
                    qaPassed: true,
                    duration: formatDuration(progress.elapsedSeconds),
                  },
                };

                setPreviews(prev => ({ ...prev, company: preview }));
                setFullReports(prev => ({ ...prev, company: builtMarkdown }));
                saveReportToStorage('company', preview, builtMarkdown);
                toast.success(`✅ Company Analysis for ${ticker} ready!`);
              } else {
                console.error('[Resume] Could not build markdown from report data');
                toast.error('Report generated but content could not be built');
              }
            }
          } catch (fetchErr) {
            console.error('[Resume] Failed to fetch completed report:', fetchErr);
          }
        } else if (progress.status === 'error') {
          clearGenerationState('company');
          removeActiveGeneration('company');
          toast.error(`Generation failed: ${progress.error}`);
        } else if (progress.status === 'not_found') {
          // Report doesn't exist on server - clear and notify
          console.log('[Resume] Company report not found on server, clearing...');
          clearGenerationState('company');
          removeActiveGeneration('company');
          toast.error('Report not found. The server may have restarted. Please try again.');
        }
      } catch (err: any) {
        console.error('[Resume] Company progress fetch error:', err);
        errorCount++;
        
        // If we get too many errors, the generation probably doesn't exist anymore
        if (errorCount >= maxErrors) {
          console.log('[Resume] Too many errors, clearing stale Company generation');
          clearGenerationState('company');
          removeActiveGeneration('company');
          toast.error('Generation no longer available. Please start a new one.');
        }
      }
    }, 2000);
  }, [updateGenerationState, clearGenerationState]);

  // Resume Crypto polling
  const resumeCryptoPolling = useCallback((reportId: string) => {
    console.log('[Resume] Starting Crypto polling for:', reportId);
    
    let errorCount = 0;
    const maxErrors = 3;
    
    progressIntervalsRef.current['crypto'] = setInterval(async () => {
      try {
        const progress = await fetchCryptoProgress(reportId);
        
        // Reset error count on success
        errorCount = 0;
        
        updateGenerationState('crypto', {
          progress: progress.progress,
          currentPhase: progress.currentPhase || null,
          currentAgent: progress.currentAgent || null,
          completedAgents: progress.completedAgents || [],
          elapsedSeconds: progress.elapsedSeconds,
        });

        if (progress.status === 'completed') {
          console.log('[Resume] Crypto generation completed!');
          clearGenerationState('crypto');
          removeActiveGeneration('crypto');

          try {
            const response = await fetchCryptoReport(reportId);
            const report = response?.report || response;
            
            const markdownContent = report?.markdown_content 
              || report?.content 
              || report?.markdownContent
              || '';
            
            const htmlContent = report?.html_content 
              || report?.htmlContent 
              || report?.html 
              || '';

            let finalContent = markdownContent;
            if (!finalContent && report?.sections && Array.isArray(report.sections)) {
              finalContent = report.sections.map((s: any) => 
                `## ${s.title || s.name || ''}\n\n${s.content || s.text || ''}`
              ).join('\n\n');
            }

            if (finalContent || htmlContent) {
              const preview: PreviewData = {
                subject: `Crypto Market Analysis - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
                preheader: 'Institutional-grade cryptocurrency market intelligence',
                sections: [],
                html: htmlContent,
                markdown: finalContent,
                generatedAt: report?.created_at || new Date().toISOString(),
                reportType: 'crypto',
                reportId: reportId,
                processorInfo: {
                  version: 'Crypto v1.0',
                  type: 'crypto',
                  agentCount: 18,
                  qaScore: report?.qa_score || 85,
                  qaPassed: true,
                  duration: formatDuration(progress.elapsedSeconds),
                },
              };

              setPreviews(prev => ({ ...prev, crypto: preview }));
              setFullReports(prev => ({ ...prev, crypto: finalContent }));
              saveReportToStorage('crypto', preview, finalContent);
              toast.success('✅ Crypto Analysis Report ready!');
            }
          } catch (fetchErr) {
            console.error('[Resume] Failed to fetch crypto report:', fetchErr);
          }
        } else if (progress.status === 'error') {
          clearGenerationState('crypto');
          removeActiveGeneration('crypto');
          toast.error(`Generation failed: ${progress.error}`);
        } else if (progress.status === 'not_found') {
          // Report doesn't exist on server
          console.log('[Resume] Crypto report not found on server, clearing...');
          clearGenerationState('crypto');
          removeActiveGeneration('crypto');
          toast.error('Report not found. The server may have restarted. Please try again.');
        }
      } catch (err: any) {
        console.error('[Resume] Crypto progress fetch error:', err);
        errorCount++;
        
        // If we get too many errors, the generation probably doesn't exist anymore
        if (errorCount >= maxErrors) {
          console.log('[Resume] Too many errors, clearing stale Crypto generation');
          clearGenerationState('crypto');
          removeActiveGeneration('crypto');
          toast.error('Generation no longer available. Please start a new one.');
        }
      }
    }, 2000);
  }, [updateGenerationState, clearGenerationState]);

  // ============================================
  // RESUME ACTIVE GENERATIONS ON MOUNT
  // ============================================
  const resumeActiveGenerations = useCallback(async () => {
    const activeGens = getActiveGenerations();
    console.log('[Resume] Checking active generations:', activeGens);
    
    for (const [reportType, gen] of Object.entries(activeGens)) {
      // Check if generation is not too old (max 10 minutes)
      const age = Date.now() - new Date(gen.startedAt).getTime();
      if (age > 10 * 60 * 1000) {
        console.log(`[Resume] Generation ${reportType} too old, removing`);
        removeActiveGeneration(reportType);
        continue;
      }
      
      console.log(`[Resume] Resuming tracking for ${reportType} (${gen.reportId})`);
      
      // Set generating state
      updateGenerationState(reportType, {
        isGenerating: true,
        progress: 0,
        currentPhase: 'RESUMING',
        currentAgent: null,
        completedAgents: [],
        elapsedSeconds: Math.floor(age / 1000),
        reportId: gen.reportId,
        error: null,
      });
      
      // Start polling based on report type
      if (reportType === 'ism') {
        resumeISMPolling(gen.reportId);
      } else if (reportType === 'company') {
        resumeCompanyPolling(gen.reportId, gen.ticker || 'Unknown');
      } else if (reportType === 'crypto') {
        resumeCryptoPolling(gen.reportId);
      }
    }
  }, [updateGenerationState, resumeISMPolling, resumeCompanyPolling, resumeCryptoPolling]);

  // Run resume on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      resumeActiveGenerations();
    }, 500);
    return () => clearTimeout(timer);
  }, [resumeActiveGenerations]);

  // Load ALL cached reports on mount FIRST
  useEffect(() => {
    console.log('[Init] Loading saved reports from storage...');
    const { previews: savedPreviews, fullReports: savedFullReports } = loadAllReportsFromStorage();
    
    if (Object.keys(savedPreviews).length > 0) {
      console.log('[Init] Found saved reports:', Object.keys(savedPreviews));
      setPreviews(savedPreviews);
      setFullReports(savedFullReports);
    }
  }, []);

  // Load ISM status AFTER storage loading
  useEffect(() => {
    const timer = setTimeout(() => {
      loadISMStatus();
    }, 100);
    return () => clearTimeout(timer);
  }, [loadISMStatus]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(progressIntervalsRef.current).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, []);

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['top-secret-stats'],
    queryFn: async (): Promise<ReportStats> => {
      const { data, error } = await supabase.rpc('get_top_secret_stats');
      if (error) throw error;
      const row = data?.[0] || {};
      return {
        active_subscribers: Number(row.active_subscribers) || 0,
        monthly_subscribers: Number(row.monthly_subscribers) || 0,
        yearly_subscribers: Number(row.yearly_subscribers) || 0,
      };
    },
  });

  // Fetch last sent
  const { data: lastSent, isLoading: lastSentLoading } = useQuery({
    queryKey: ['report-last-sent'],
    queryFn: async (): Promise<LastSentInfo | null> => {
      return null;
    },
  });

  // Fetch inclusion status
  const { data: inclusionStatus, refetch: refetchInclusion } = useQuery({
    queryKey: ['top-secret-inclusion-status'],
    queryFn: async (): Promise<InclusionStatus> => {
      const { data, error } = await supabase.rpc('get_top_secret_inclusion_status');
      if (error) throw error;
      const row = data?.[0] || {};
      
      setPremiumEnabled(row.premium_included || false);
      setBasicEnabled(row.basic_included || false);
      
      return {
        premium_included: row.premium_included || false,
        basic_included: row.basic_included || false,
        total_recipients: Number(row.total_recipients) || 0,
        newsletter_subscribers: Number(row.newsletter_subscribers) || 0,
        premium_recipients: Number(row.premium_recipients) || 0,
        basic_recipients: Number(row.basic_recipients) || 0,
      };
    },
  });

  // Fetch users
  const { data: allUsers, isLoading: usersLoading, refetch, error: usersError } = useQuery({
    queryKey: ['top-secret-users'],
    queryFn: async (): Promise<ReportUser[]> => {
      const { data, error } = await supabase.rpc('get_top_secret_users');
      if (error) throw error;
      return (data || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        account_type: u.account_type as 'free' | 'basic' | 'premium',
        top_secret_enabled: u.top_secret_enabled ?? false,
        top_secret_status: (u.top_secret_status || 'inactive') as ReportUser['top_secret_status'],
        top_secret_started_at: u.top_secret_started_at,
        top_secret_expires_at: u.top_secret_expires_at,
        top_secret_interval: u.top_secret_interval,
        created_at: u.created_at,
      }));
    },
  });

  const userList = useMemo(() => allUsers || [], [allUsers]);

  // Calculate eligible recipients
  const eligibleRecipients = useMemo(() => {
    return userList.filter(user => {
      if (user.top_secret_status === 'active') return true;
      if (user.account_type === 'premium' && premiumEnabled) return true;
      if (user.account_type === 'basic' && basicEnabled) return true;
      return false;
    });
  }, [userList, premiumEnabled, basicEnabled]);

  // Get IDs for sending
  const recipientIds = useMemo(() => {
    if (useCustomSelection && customSelectedIds.size > 0) {
      return Array.from(customSelectedIds);
    }
    return eligibleRecipients.map(u => u.id);
  }, [useCustomSelection, customSelectedIds, eligibleRecipients]);

  const toggleUserSelection = (userId: string) => {
    setUseCustomSelection(true);
    const newSelection = new Set(customSelectedIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setCustomSelectedIds(newSelection);
  };

  const clearCustomSelection = () => {
    setUseCustomSelection(false);
    setCustomSelectedIds(new Set());
  };

  const filteredUsers = useMemo(() => {
    let users = userList;
    
    if (filterStatus !== 'all') {
      users = users.filter(u => u.top_secret_status === filterStatus);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      users = users.filter(u => 
        u.email?.toLowerCase().includes(term) ||
        u.display_name?.toLowerCase().includes(term)
      );
    }
    
    return users;
  }, [userList, filterStatus, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  // Toggle config handler
  const handleToggleConfig = async (key: string, enabled: boolean) => {
    setIsUpdatingConfig(true);
    try {
      const { error } = await supabase.rpc('toggle_top_secret_config', {
        p_config_key: key,
        p_enabled: enabled,
      });
      
      if (error) throw error;
      
      if (key === 'premium_included') setPremiumEnabled(enabled);
      if (key === 'basic_included') setBasicEnabled(enabled);
      
      toast.success(
        enabled 
          ? `${key === 'premium_included' ? 'Premium' : 'Basic'} users will now receive reports`
          : `${key === 'premium_included' ? 'Premium' : 'Basic'} users removed from reports`
      );
      
      await refetchInclusion();
      
    } catch (err) {
      console.error('Toggle config error:', err);
      toast.error('Failed to update setting');
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  // ============================================
  // CLEAR PREVIEW - FIXED VERSION
  // ============================================
  const clearPreview = useCallback((reportId: string) => {
    console.log(`[Clear] Clearing report: ${reportId}`);
    console.trace('[Clear] Called from:'); // This will show the call stack
    
    // Clear from state
    setPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[reportId];
      return newPreviews;
    });
    
    setFullReports(prev => {
      const newReports = { ...prev };
      delete newReports[reportId];
      return newReports;
    });
    
    // Clear from localStorage
    clearReportFromStorage(reportId);
    
    // For ISM, also clear the ISM status reference
    if (reportId === 'ism') {
      setIsmStatus(prev => prev ? { ...prev, reportExists: false, reportId: undefined } : null);
    }
    
    // If this was the selected report to send, clear selection
    if (selectedReportToSend === reportId) {
      setSelectedReportToSend(null);
    }
    
    toast.success('Report deleted');
  }, [selectedReportToSend]);

  // ============================================
  // GENERATE REPORT (ISM, Company, or Generic)
  // ============================================
  const generateReport = async (reportId: string, inputValue?: string) => {
    const reportType = REPORT_TYPES.find(r => r.id === reportId);
    if (!reportType) return;

    console.log(`[Generate] Starting generation for: ${reportId}`);

    // Initialize generation state (don't clear existing preview until we have new content)
    updateGenerationState(reportId, {
      isGenerating: true,
      progress: 0,
      currentPhase: 'INIT',
      currentAgent: null,
      completedAgents: [],
      elapsedSeconds: 0,
      reportId: null,
      error: null,
    });

    // Handle ISM
    if (reportId === 'ism') {
      await generateISMReportHandler();
      return;
    }

    // Handle Company Analysis
    if (reportId === 'company') {
      await generateCompanyReportHandler(inputValue);
      return;
    }

    // Handle Crypto Analysis
    if (reportId === 'crypto') {
      await generateCryptoReportHandler();
      return;
    }

    // Other report types - show not implemented
    toast.error(`${reportType.name} not implemented yet`);
    clearGenerationState(reportId);
  };

  // ============================================
  // ISM GENERATION HANDLER - FIXED
  // ============================================
  const generateISMReportHandler = async () => {
    const targetMonth = ismStatus?.month || getCurrentISMMonth();
    
    try {
      const usingMockData = !ismStatus?.ismAvailable;
      toast.info(
        usingMockData 
          ? '🧪 Generating TOP SECRET ISM Report...' 
          : '🔒 Generating TOP SECRET ISM Report...', 
        { duration: 5000 }
      );
      
      const result = await generateISMReport(targetMonth, {
        isAdminOverride: ismStatus?.reportExists || usingMockData,
        overrideReason: ismStatus?.reportExists 
          ? 'Admin regeneration' 
          : usingMockData 
            ? 'Admin test with mock data' 
            : undefined,
      });
      
      updateGenerationState('ism', { reportId: result.reportId });
      
      // Save active generation for resume capability
      saveActiveGeneration('ism', result.reportId);
      
      // Start progress polling
      progressIntervalsRef.current['ism'] = setInterval(async () => {
        try {
          const progress = await fetchISMProgress(result.reportId);
          
          updateGenerationState('ism', {
            progress: progress.progress,
            currentPhase: progress.currentPhase || null,
            currentAgent: progress.currentAgentId || null,
            completedAgents: progress.completedAgents,
            elapsedSeconds: progress.elapsedSeconds,
          });
          
          if (progress.status === 'completed' || progress.status === 'error') {
            clearGenerationState('ism');
            removeActiveGeneration('ism');
            
            if (progress.status === 'completed') {
              toast.success('ISM Report generated successfully!');
              
              // Try to fetch and save the report directly
              try {
                const report = await fetchISMReport(result.reportId);
                const markdownContent = report?.markdown_content || report?.content || '';
                
                if (markdownContent || report?.html_content) {
                  const preview: PreviewData = {
                    subject: `ISM Manufacturing Report - ${formatMonthDisplay(targetMonth)}`,
                    preheader: 'TOP SECRET - Institutional Market Intelligence',
                    sections: [],
                    html: report.html_content || '',
                    markdown: markdownContent,
                    generatedAt: report.created_at || new Date().toISOString(),
                    reportType: 'ism',
                    reportId: result.reportId,
                    processorInfo: {
                      version: 'ISM v1.0',
                      type: 'ism',
                      agentCount: 13,
                      qaScore: report.qa_score,
                      qaPassed: report.qa_passed,
                    },
                  };
                  
                  console.log(`[ISM] Report completed! Content length: ${markdownContent.length}`);
                  setPreviews(prev => ({ ...prev, ism: preview }));
                  setFullReports(prev => ({ ...prev, ism: markdownContent }));
                  saveReportToStorage('ism', preview, markdownContent);
                  
                  // Update ISM status
                  setIsmStatus(prev => prev ? { 
                    ...prev, 
                    reportExists: true, 
                    reportId: result.reportId,
                    status: 'report_generated'
                  } : null);
                } else {
                  console.error('[ISM] Report completed but no content found');
                  toast.error('Report generated but content is empty');
                }
              } catch (fetchErr) {
                console.error('[ISM] Failed to fetch completed report:', fetchErr);
                toast.error('Report generated but failed to load content');
              }
            } else {
              toast.error(`ISM generation failed: ${progress.error}`);
            }
          } else if (progress.status === 'not_found') {
            // Report doesn't exist on server
            console.log('[ISM] Report not found on server, clearing...');
            clearGenerationState('ism');
            removeActiveGeneration('ism');
            toast.error('Report not found. The server may have restarted. Please try again.');
          }
        } catch (err) {
          console.error('Progress fetch error:', err);
        }
      }, 2000);
      
    } catch (err: any) {
      console.error('ISM generation error:', err);
      toast.error(`Failed to generate ISM report: ${err.message}`);
      clearGenerationState('ism');
      removeActiveGeneration('ism');
    }
  };

  // ============================================
  // COMPANY GENERATION HANDLER - FIXED
  // ============================================
  const generateCompanyReportHandler = async (ticker?: string) => {
    try {
      const tickerDisplay = ticker || 'Random S&P 500';
      toast.info(`🏢 Generating Company Analysis for ${tickerDisplay}...`, { duration: 5000 });

      // Start generation
      console.log('[Company] Starting generation...');
      const result = await generateCompanyReport(ticker);
      console.log('[Company] Generation started, reportId:', result.reportId, 'ticker:', result.ticker);
      
      updateGenerationState('company', { reportId: result.reportId });
      
      // Save active generation for resume capability
      saveActiveGeneration('company', result.reportId, result.ticker);
      
      toast.success(`Started analysis for ${result.ticker}`);

      // Poll for progress
      progressIntervalsRef.current['company'] = setInterval(async () => {
        try {
          const progress = await fetchCompanyProgress(result.reportId);
          console.log('[Company] Progress:', progress.progress, '%', progress.status);
          
          updateGenerationState('company', {
            progress: progress.progress,
            currentPhase: progress.progress < 20 ? 'DATA_ACQUISITION' : 
                         progress.progress < 50 ? 'BUSINESS_ANALYSIS' : 
                         progress.progress < 80 ? 'FINANCIAL_ANALYSIS' : 'QUALITY_ASSURANCE',
            elapsedSeconds: progress.elapsedSeconds,
          });

          if (progress.status === 'completed') {
            console.log('[Company] Generation completed! Fetching report...');
            clearGenerationState('company');
            removeActiveGeneration('company');

            // Fetch the report
            try {
              const response = await fetchCompanyReport(result.reportId);
              console.log('[Company] Report response:', response);
              
              // The report might be nested inside a 'report' object
              const report = response?.report || response;
              console.log('[Company] Actual report object:', report);
              
              // Try multiple paths for markdown content
              const markdownContent = report?.markdown_content 
                || report?.content 
                || report?.markdownContent
                || report?.fullReport
                || report?.text
                || '';
              
              // Try multiple paths for HTML content
              const htmlContent = report?.html_content 
                || report?.htmlContent 
                || report?.html 
                || '';
              
              console.log('[Company] Markdown content length:', markdownContent.length);
              console.log('[Company] HTML content length:', htmlContent.length);
              
              // If still no content, try to build from sections
              let finalContent = markdownContent;
              if (!finalContent && report?.sections && Array.isArray(report.sections)) {
                console.log('[Company] Building content from sections...');
                finalContent = report.sections.map((s: any) => 
                  `## ${s.title || s.name || ''}\n\n${s.content || s.text || ''}`
                ).join('\n\n');
              }
              
              // Last resort - stringify the report object
              if (!finalContent && !htmlContent) {
                console.log('[Company] No content found, checking all keys:', Object.keys(report || {}));
                // Try to find any string content
                for (const key of Object.keys(report || {})) {
                  if (typeof report[key] === 'string' && report[key].length > 500) {
                    console.log(`[Company] Found content in key: ${key}`);
                    finalContent = report[key];
                    break;
                  }
                }
              }

              if (finalContent || htmlContent) {
                // Create preview
                const preview: PreviewData = {
                  subject: `Company Analysis: ${result.ticker}`,
                  preheader: `Deep dive research on ${result.ticker}`,
                  sections: [],
                  html: htmlContent,
                  markdown: finalContent,
                  generatedAt: report?.created_at || report?.createdAt || new Date().toISOString(),
                  reportType: 'company',
                  reportId: result.reportId,
                  processorInfo: {
                    version: 'Company v1.0',
                    type: 'company',
                    agentCount: 23,
                    qaScore: report?.qa_score || report?.qaScore || 85,
                    qaPassed: (report?.qa_score || report?.qaScore || 85) >= 75,
                    duration: formatDuration(progress.elapsedSeconds),
                  },
                };

                console.log(`[Company] Saving report with content length: ${finalContent.length}`);
                setPreviews(prev => ({ ...prev, company: preview }));
                setFullReports(prev => ({ ...prev, company: finalContent }));
                saveReportToStorage('company', preview, finalContent);

                toast.success(`✅ Company Analysis for ${result.ticker} ready!`);
              } else {
                // No markdown content - build from structured data
                console.log('[Company] No markdown content found, building from structured data...');
                const builtMarkdown = buildCompanyMarkdown(report);
                
                if (builtMarkdown && builtMarkdown.length > 100) {
                  const preview: PreviewData = {
                    subject: `Company Analysis: ${result.ticker}`,
                    preheader: `Deep dive research on ${result.ticker}`,
                    sections: [],
                    html: '',
                    markdown: builtMarkdown,
                    generatedAt: report?.created_at || report?.createdAt || new Date().toISOString(),
                    reportType: 'company',
                    reportId: result.reportId,
                    processorInfo: {
                      version: 'Company v1.0',
                      type: 'company',
                      agentCount: 23,
                      qaScore: report?.qa_score || report?.qaScore || 85,
                      qaPassed: (report?.qa_score || report?.qaScore || 85) >= 75,
                      duration: formatDuration(progress.elapsedSeconds),
                    },
                  };

                  console.log(`[Company] Built markdown from structured data, length: ${builtMarkdown.length}`);
                  setPreviews(prev => ({ ...prev, company: preview }));
                  setFullReports(prev => ({ ...prev, company: builtMarkdown }));
                  saveReportToStorage('company', preview, builtMarkdown);

                  toast.success(`✅ Company Analysis for ${result.ticker} ready!`);
                } else {
                  console.error('[Company] Report completed but could not build content');
                  console.error('[Company] Report structure:', JSON.stringify(report, null, 2).slice(0, 1000));
                  toast.error('Report generated but content could not be built');
                }
              }
            } catch (fetchErr) {
              console.error('[Company] Failed to fetch completed report:', fetchErr);
              toast.error('Report generated but failed to load content');
            }

          } else if (progress.status === 'error') {
            clearGenerationState('company');
            removeActiveGeneration('company');
            toast.error(`Generation failed: ${progress.error}`);
          } else if (progress.status === 'not_found') {
            // Report doesn't exist on server - clear and notify
            console.log('[Company] Report not found on server, clearing...');
            clearGenerationState('company');
            removeActiveGeneration('company');
            toast.error('Report not found. The server may have restarted. Please try again.');
          }
        } catch (err) {
          console.error('[Company] Progress fetch error:', err);
        }
      }, 2000);

    } catch (err: any) {
      console.error('Company generation error:', err);
      toast.error(`Failed: ${err.message}`);
      clearGenerationState('company');
      removeActiveGeneration('company');
    }
  };

  // ============================================
  // CRYPTO GENERATION HANDLER
  // ============================================
  const generateCryptoReportHandler = async () => {
    try {
      toast.info('🪙 Generating Crypto Analysis Report...', { duration: 5000 });

      console.log('[Crypto] Starting generation...');
      const result = await generateCryptoReport();
      console.log('[Crypto] Generation started, reportId:', result.reportId);
      
      updateGenerationState('crypto', { reportId: result.reportId });
      
      // Save active generation for resume capability
      saveActiveGeneration('crypto', result.reportId);

      // Poll for progress
      progressIntervalsRef.current['crypto'] = setInterval(async () => {
        try {
          const progress = await fetchCryptoProgress(result.reportId);
          console.log('[Crypto] Progress:', progress.progress, '%', progress.status);
          
          updateGenerationState('crypto', {
            progress: progress.progress,
            currentPhase: progress.currentPhase || null,
            currentAgent: progress.currentAgent || null,
            completedAgents: progress.completedAgents || [],
            elapsedSeconds: progress.elapsedSeconds,
          });

          if (progress.status === 'completed') {
            console.log('[Crypto] Generation completed! Fetching report...');
            clearGenerationState('crypto');
            removeActiveGeneration('crypto');

            try {
              const response = await fetchCryptoReport(result.reportId);
              console.log('[Crypto] Report response:', response);
              
              // Handle nested report object
              const report = response?.report || response;
              
              // Try multiple paths for content
              const markdownContent = report?.markdown_content 
                || report?.content 
                || report?.markdownContent
                || report?.fullReport
                || '';
              
              const htmlContent = report?.html_content 
                || report?.htmlContent 
                || report?.html 
                || '';
              
              console.log('[Crypto] Markdown content length:', markdownContent.length);

              // If no content, try building from sections
              let finalContent = markdownContent;
              if (!finalContent && report?.sections && Array.isArray(report.sections)) {
                console.log('[Crypto] Building content from sections...');
                finalContent = report.sections.map((s: any) => 
                  `## ${s.title || s.name || ''}\n\n${s.content || s.text || ''}`
                ).join('\n\n');
              }

              if (finalContent || htmlContent) {
                const preview: PreviewData = {
                  subject: `Crypto Market Analysis - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
                  preheader: 'Institutional-grade cryptocurrency market intelligence',
                  sections: [],
                  html: htmlContent,
                  markdown: finalContent,
                  generatedAt: report?.created_at || report?.createdAt || new Date().toISOString(),
                  reportType: 'crypto',
                  reportId: result.reportId,
                  processorInfo: {
                    version: 'Crypto v1.0',
                    type: 'crypto',
                    agentCount: 18,
                    qaScore: report?.qa_score || report?.qaScore || 85,
                    qaPassed: (report?.qa_score || report?.qaScore || 85) >= 75,
                    duration: formatDuration(progress.elapsedSeconds),
                  },
                };

                console.log(`[Crypto] Saving report with content length: ${finalContent.length}`);
                setPreviews(prev => ({ ...prev, crypto: preview }));
                setFullReports(prev => ({ ...prev, crypto: finalContent }));
                saveReportToStorage('crypto', preview, finalContent);

                toast.success('✅ Crypto Analysis Report ready!');
              } else {
                console.error('[Crypto] Report completed but no content found');
                console.error('[Crypto] Report structure:', JSON.stringify(report, null, 2).slice(0, 1000));
                toast.error('Report generated but content is empty');
              }
            } catch (fetchErr) {
              console.error('[Crypto] Failed to fetch completed report:', fetchErr);
              toast.error('Report generated but failed to load content');
            }

          } else if (progress.status === 'error') {
            clearGenerationState('crypto');
            removeActiveGeneration('crypto');
            toast.error(`Generation failed: ${progress.error}`);
          } else if (progress.status === 'not_found') {
            // Report doesn't exist on server
            console.log('[Crypto] Report not found on server, clearing...');
            clearGenerationState('crypto');
            removeActiveGeneration('crypto');
            toast.error('Report not found. The server may have restarted. Please try again.');
          }
        } catch (err) {
          console.error('[Crypto] Progress fetch error:', err);
        }
      }, 2000);

    } catch (err: any) {
      console.error('Crypto generation error:', err);
      toast.error(`Failed: ${err.message}`);
      clearGenerationState('crypto');
      removeActiveGeneration('crypto');
    }
  };

  // View report - FIXED with fallback
  const viewReport = (reportId: string) => {
    const preview = previews[reportId];
    const fullReport = fullReports[reportId] || preview?.markdown || preview?.html || '';
    
    if (!preview) {
      toast.error('Report not available. Try generating a new report.');
      return;
    }
    
    if (!fullReport) {
      toast.error('Report content not available. Try generating a new report.');
      return;
    }
    
    setViewingReportId(reportId);
    setShowReportViewer(true);
  };

  // Download ISM PDF
const handleDownloadISMPdf = async () => {
  const reportId = ismStatus?.reportId || previews['ism']?.reportId;
  const month = ismStatus?.month || getCurrentISMMonth();
  
  if (!reportId) {
    toast.error('No ISM report available');
    return;
  }
  
  try {
    toast.info('Generating PDF...', { duration: 2000 });
    await downloadISMPdf(reportId, month);
      toast.success('PDF downloaded!');
    } catch (err: any) {
      toast.error(`Failed to download PDF: ${err.message}`);
    }
  };

  const handleDownloadCompanyPdf = async () => {
    const preview = previews['company'];
    if (!preview?.reportId) {
      toast.error('No Company report available');
      return;
    }
    
    try {
      toast.info('Generating PDF...', { duration: 2000 });
      // Extract ticker from subject or use default
      const ticker = preview.subject?.replace('Company Analysis: ', '') || 'Company';
      await downloadCompanyPdf(preview.reportId, ticker);
      toast.success('PDF downloaded!');
    } catch (err: any) {
      toast.error(`Failed to download PDF: ${err.message}`);
    }
  };

  const handleDownloadCryptoPdf = async () => {
    const preview = previews['crypto'];
    if (!preview?.reportId) {
      toast.error('No Crypto report available');
      return;
    }
    
    try {
      toast.info('Generating PDF...', { duration: 2000 });
      await downloadCryptoPdf(preview.reportId);
      toast.success('PDF downloaded!');
    } catch (err: any) {
      toast.error(`Failed to download PDF: ${err.message}`);
    }
  };

  // Get download handler for report type
const getDownloadHandler = (reportId: string) => {
  switch (reportId) {
    case 'ism':
      // Check both ismStatus and preview for reportId
      const ismReportId = ismStatus?.reportId || previews['ism']?.reportId;
      return ismReportId ? handleDownloadISMPdf : undefined;
      case 'company':
        return previews['company']?.reportId ? handleDownloadCompanyPdf : undefined;
      case 'crypto':
        return previews['crypto']?.reportId ? handleDownloadCryptoPdf : undefined;
      default:
        return undefined;
    }
  };

  // Send test email
  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    
    if (!reportToSendPreview) {
      toast.error('Select a report to send first');
      return;
    }
    
    try {
      toast.info(`Sending ${reportToSendType.name} test to ${testEmail}...`);
      
      if (reportToSend === 'ism' && ismStatus?.reportId) {
        await sendISMEmail(ismStatus.reportId, testEmail);
      } else {
        // TODO: Implement for other report types
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      toast.success(`Test sent to ${testEmail}`);
      setTestEmail('');
    } catch (err: any) {
      toast.error(`Failed to send test: ${err.message}`);
    }
  };

  // Send report
  const sendReport = async () => {
    if (recipientIds.length === 0) {
      toast.error('No recipients selected');
      return;
    }

    if (!reportToSendPreview || !reportToSendFullReport) {
      toast.error('Select a report to send first');
      return;
    }

    setIsSending(true);
    try {
      // TODO: Implement actual sending logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`${reportToSendType.name} sent to ${recipientIds.length} recipients!`);
      queryClient.invalidateQueries({ queryKey: ['report-stats'] });
      queryClient.invalidateQueries({ queryKey: ['report-last-sent'] });
      setAdminNote('');
      clearCustomSelection();
      setSelectedReportToSend(null);
    } catch {
      toast.error('Failed to send report');
    } finally {
      setIsSending(false);
    }
  };

  const getDisplayName = (user: ReportUser) => {
    return user.display_name || user.email.split('@')[0];
  };

  const getTrialInfo = (user: ReportUser): string | null => {
    return null;
  };

  const isUserEligible = (user: ReportUser): boolean => {
    return eligibleRecipients.some(r => r.id === user.id);
  };

  const isUserSelected = (userId: string) => {
    if (useCustomSelection) {
      return customSelectedIds.has(userId);
    }
    return eligibleRecipients.some(u => u.id === userId);
  };

  // Check if any report is generating
  const anyReportGenerating = Object.values(generationStates).some(s => s?.isGenerating);

  // Count reports with active generation or preview
  const activeReportsCount = useMemo(() => {
    let count = 0;
    REPORT_TYPES.forEach(r => {
      const preview = previews[r.id];
      const hasContent = !!(preview && (fullReports[r.id] || preview.markdown || preview.html));
      if (generationStates[r.id]?.isGenerating || hasContent) {
        count++;
      }
    });
    return count;
  }, [generationStates, previews, fullReports]);

  // Count ready reports - more robust check
  const readyReportsCount = useMemo(() => {
    return REPORT_TYPES.filter(r => {
      const preview = previews[r.id];
      return !!(preview && (fullReports[r.id] || preview.markdown || preview.html));
    }).length;
  }, [previews, fullReports]);

  if (usersError) {
    return (
      <div className="p-6 min-h-screen bg-[#080812]">
        <div className="bg-[#0d0d18] rounded-xl p-8 border border-red-500/30">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-white font-medium mb-2">Failed to load report users</h3>
            <p className="text-gray-500 text-sm mb-4">
              Make sure the SQL migration has been run
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const viewingReport = viewingReportId ? REPORT_TYPES.find(r => r.id === viewingReportId) : null;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#080812]">
      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* Report Viewer Modal - FIXED */}
      {showReportViewer && viewingReport && viewingReportId && (fullReports[viewingReportId] || previews[viewingReportId]?.markdown) && (
        <ReportViewerModal
          report={fullReports[viewingReportId] || previews[viewingReportId]?.markdown || previews[viewingReportId]?.html || ''}
          subject={previews[viewingReportId]?.subject || viewingReport.name}
          reportType={viewingReport}
          processorInfo={previews[viewingReportId]?.processorInfo || null}
          generatedAt={previews[viewingReportId]?.generatedAt || new Date().toISOString()}
          onClose={() => {
            setShowReportViewer(false);
            setViewingReportId(null);
          }}
          onDownloadPdf={viewingReportId ? getDownloadHandler(viewingReportId) : undefined}
          onRegenerate={() => generateReport(viewingReportId)}
          onDelete={() => clearPreview(viewingReportId)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#C9A646]/20 to-orange-500/10 border border-[#C9A646]/30">
              <Layers className="w-6 h-6 text-[#C9A646]" />
            </div>
            Premium Reports
          </h1>
          <p className="text-gray-600 mt-1 ml-14">4 Report Types • ISM • Company Analysis • Crypto • Weekly Review</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Active reports indicator */}
          {activeReportsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">
                {activeReportsCount} Active
              </span>
            </div>
          )}
          
          {/* Ready to send indicator */}
          {readyReportsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/30">
              <CheckCircle className="w-4 h-4 text-[#C9A646]" />
              <span className="text-[#C9A646] text-sm font-medium">
                {readyReportsCount} Ready
              </span>
            </div>
          )}
          
          {/* ISM Month indicator */}
          {ismStatus && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-medium">
                ISM: {formatMonthDisplay(ismStatus.month)}
              </span>
              <ISMStatusBadge status={ismStatus.status} willUseMock={ismStatus.willUseMockData} />
              {ismStatus.willUseMockData && !ismStatus.reportExists && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-900/50 text-yellow-400 border border-yellow-500/30">
                  🧪 MOCK
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report Type Cards - 2x2 Grid with inline progress/preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORT_TYPES.map(report => (
          <ReportTypeCard
            key={report.id}
            report={report}
            isSelected={selectedReportType === report.id}
            generationState={generationStates[report.id] || null}
            preview={previews[report.id] || null}
            fullReport={fullReports[report.id] || null}
            ismStatus={report.id === 'ism' ? ismStatus : undefined}
            onClick={() => setSelectedReportType(report.id)}
            onGenerate={(inputValue) => generateReport(report.id, inputValue)}
            onViewFull={() => viewReport(report.id)}
            onDownloadPdf={getDownloadHandler(report.id)}
            onClearPreview={() => clearPreview(report.id)}
          />
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard 
          title="Active Subscribers" 
          value={stats?.active_subscribers || 0} 
          icon={Users} 
          iconBg="bg-[#C9A646]"
          valueColor="text-[#C9A646]"
          loading={statsLoading}
        />
        <StatCard 
          title="Monthly" 
          value={stats?.monthly_subscribers || 0} 
          icon={Calendar} 
          iconBg="bg-blue-600"
          valueColor="text-blue-400"
          loading={statsLoading}
        />
        <StatCard 
          title="Yearly" 
          value={stats?.yearly_subscribers || 0} 
          icon={Crown} 
          iconBg="bg-purple-600"
          valueColor="text-purple-400"
          loading={statsLoading}
        />
      </div>

      {/* Recipient Settings */}
      <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800/50 bg-[#080812] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/20">
              <FileText className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Report Distribution</h2>
              <p className="text-xs text-gray-500">Premium Reports subscribers (separate from Newsletter)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/20">
            <Users className="w-4 h-4 text-[#C9A646]" />
            <span className="text-sm font-medium text-[#C9A646]">
              {inclusionStatus?.total_recipients || 0} Total Recipients
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Recipients Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#C9A646]"></div>
                <span className="text-xs text-gray-500">Reports Subs</span>
              </div>
              <p className="text-2xl font-bold text-[#C9A646]">
                {stats?.active_subscribers || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">Always included</p>
            </div>
            
            <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${premiumEnabled ? 'bg-purple-500' : 'bg-gray-600'}`}></div>
                <span className="text-xs text-gray-500">Premium Journal</span>
              </div>
              <p className={`text-2xl font-bold ${premiumEnabled ? 'text-purple-400' : 'text-gray-600'}`}>
                {premiumEnabled ? inclusionStatus?.premium_recipients || 0 : 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {premiumEnabled ? 'Included as perk' : 'Not included'}
              </p>
            </div>
            
            <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${basicEnabled ? 'bg-cyan-500' : 'bg-gray-600'}`}></div>
                <span className="text-xs text-gray-500">Basic Journal</span>
              </div>
              <p className={`text-2xl font-bold ${basicEnabled ? 'text-cyan-400' : 'text-gray-600'}`}>
                {basicEnabled ? inclusionStatus?.basic_recipients || 0 : 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {basicEnabled ? 'Included as perk' : 'Not included'}
              </p>
            </div>
          </div>

          {/* Toggle Settings */}
          <div className="space-y-3">
            {/* Premium Toggle */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              premiumEnabled 
                ? 'bg-purple-500/10 border-purple-500/30' 
                : 'bg-[#080812] border-gray-800/50 hover:border-gray-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${premiumEnabled ? 'bg-purple-500/20' : 'bg-gray-800'}`}>
                  <Crown className={`w-5 h-5 ${premiumEnabled ? 'text-purple-400' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className={`font-medium ${premiumEnabled ? 'text-white' : 'text-gray-400'}`}>
                    Include Premium Journal Users
                  </p>
                  <p className="text-xs text-gray-500">
                    Premium journal subscribers receive reports as a perk
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => handleToggleConfig('premium_included', !premiumEnabled)}
                disabled={isUpdatingConfig}
                className={`relative w-14 h-7 rounded-full transition-all ${
                  premiumEnabled ? 'bg-purple-500' : 'bg-gray-700'
                } ${isUpdatingConfig ? 'opacity-50' : ''}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  premiumEnabled ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Basic Toggle */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              basicEnabled 
                ? 'bg-cyan-500/10 border-cyan-500/30' 
                : 'bg-[#080812] border-gray-800/50 hover:border-gray-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${basicEnabled ? 'bg-cyan-500/20' : 'bg-gray-800'}`}>
                  <Star className={`w-5 h-5 ${basicEnabled ? 'text-cyan-400' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className={`font-medium ${basicEnabled ? 'text-white' : 'text-gray-400'}`}>
                    Include Basic Journal Users
                  </p>
                  <p className="text-xs text-gray-500">
                    Basic journal subscribers receive reports as a perk
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => handleToggleConfig('basic_included', !basicEnabled)}
                disabled={isUpdatingConfig}
                className={`relative w-14 h-7 rounded-full transition-all ${
                  basicEnabled ? 'bg-cyan-500' : 'bg-gray-700'
                } ${isUpdatingConfig ? 'opacity-50' : ''}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  basicEnabled ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Send Report Section - UPDATED */}
      <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 overflow-hidden">
        <div className="p-5 border-b border-gray-800/50 bg-[#080812]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-[#C9A646]" />
              <h2 className="text-lg font-semibold text-white">Send Report</h2>
              {readyReportsCount > 0 && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {readyReportsCount} ready to send
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Will receive:</span>
              <span className="text-[#C9A646] font-bold">{recipientIds.length}</span>
              <span className="text-gray-600">users</span>
              {useCustomSelection && (
                <button 
                  onClick={clearCustomSelection}
                  className="ml-2 text-xs text-blue-400 hover:text-blue-300"
                >
                  (Reset to auto)
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Recipient Summary */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[#080812] rounded-xl border border-gray-800/50">
            <span className="text-sm text-gray-500">Recipients based on settings:</span>
            <span className="px-2 py-1 rounded-lg bg-[#C9A646]/20 text-[#C9A646] text-xs font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Newsletter Subscribers
            </span>
            {premiumEnabled && (
              <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium">
                + Premium Users
              </span>
            )}
            {basicEnabled && (
              <span className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                + Basic Users
              </span>
            )}
          </div>

          {/* Admin Note */}
          <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-orange-400" />
              <p className="text-sm font-medium text-white">Admin Note (Optional)</p>
            </div>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add a personal message that will appear at the top of the report..."
              className="w-full px-4 py-3 bg-[#0d0d18] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30 resize-none text-sm"
              rows={3}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-600">
                Appears before the report content
              </p>
              <p className="text-xs text-gray-500">
                {adminNote.length}/500
              </p>
            </div>
          </div>

          {/* Test Email Section - Compact */}
          <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Send className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-medium text-white">Send Test Email</p>
            </div>
            
            {/* Report Selection Toggles */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-gray-500">Select report:</span>
              {REPORT_TYPES.map(report => {
                const Icon = report.icon;
                const preview = previews[report.id];
                const hasReport = !!(preview && (fullReports[report.id] || preview.markdown || preview.html));
                const isSelected = selectedReportToSend === report.id;
                
                return (
                  <button
                    key={report.id}
                    onClick={() => hasReport && setSelectedReportToSend(isSelected ? null : report.id)}
                    disabled={!hasReport}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? `bg-gradient-to-r ${report.gradient} text-white`
                        : hasReport
                          ? `${report.iconBg} ${report.iconColor} border border-current/20 hover:opacity-80`
                          : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {report.name.split(' ')[0]}
                    {hasReport && <CheckCircle className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
            
            {/* Email Input + Send */}
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-[#0d0d18] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30 text-sm"
              />
              <button
                onClick={sendTestEmail}
                disabled={!testEmail || !selectedReportToSend || !previews[selectedReportToSend]}
                className={`px-4 py-2.5 rounded-xl transition-colors text-white font-medium text-sm disabled:opacity-50 ${
                  selectedReportToSend 
                    ? `bg-gradient-to-r ${reportToSendType.gradient} hover:opacity-90`
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Test
              </button>
            </div>
            
            {/* Selected report info */}
            {selectedReportToSend && previews[selectedReportToSend] && (
              <div className="mt-3 pt-3 border-t border-gray-800/50 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Will send: <span className="text-white font-medium">{previews[selectedReportToSend].subject}</span>
                </span>
                <button
                  onClick={() => viewReport(selectedReportToSend)}
                  className={`flex items-center gap-1 text-xs ${reportToSendType.iconColor} hover:opacity-80`}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={sendReport}
            disabled={isSending || recipientIds.length === 0 || !reportToSendPreview || !reportToSendFullReport}
            className={`w-full py-4 rounded-xl bg-gradient-to-r ${reportToSendType.gradient} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-bold text-lg flex items-center justify-center gap-3`}
          >
            {isSending ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Sending...</>
            ) : (
              <><Send className="w-5 h-5" />Send {reportToSendType.name} to {recipientIds.length} Recipients</>
            )}
          </button>

          {!reportToSendPreview && readyReportsCount === 0 && (
            <p className="text-center text-sm text-gray-500">Generate a report before sending</p>
          )}
          
          {!reportToSendPreview && readyReportsCount > 0 && (
            <p className="text-center text-sm text-gray-500">Select a report above to send</p>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="space-y-4">
        <div className="bg-[#0d0d18] rounded-xl p-4 border border-gray-800/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#080812] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as any); setPage(1); }}
              className="px-4 py-2.5 bg-[#080812] border border-gray-800 rounded-xl text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active (Paid)</option>
              <option value="cancelled">Cancelled</option>
              <option value="inactive">Not Subscribed</option>
            </select>
            <button
              onClick={() => { refetch(); loadISMStatus(); }}
              className="p-2.5 rounded-xl border border-gray-800 bg-[#080812] hover:bg-[#151520]"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50 bg-[#080812]">
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase w-12">
                  <Square className="w-4 h-4 text-gray-500" />
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Eligible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#C9A646]" />
                    <p className="text-gray-500">Loading users...</p>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Users className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400">No users found</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isSelected = isUserSelected(user.id);
                  const isEligible = isUserEligible(user);
                  const isSubscriber = user.top_secret_status === 'active';
                  const trialInfo = getTrialInfo(user);
                  
                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-[#080812]/50 transition-colors ${isSelected ? 'bg-[#C9A646]/5' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleUserSelection(user.id)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#C9A646]" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isSubscriber ? 'bg-gradient-to-br from-[#C9A646]/20 to-orange-500/10' : 'bg-gray-800'
                          }`}>
                            <span className={`font-medium ${isSubscriber ? 'text-[#C9A646]' : 'text-gray-400'}`}>
                              {(user.display_name?.[0] || user.email[0]).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{getDisplayName(user)}</p>
                            {trialInfo && (
                              <p className="text-xs text-blue-400">{trialInfo}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-400">{user.email}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={user.top_secret_status} />
                      </td>
                      <td className="px-5 py-4">
                        <JournalPlanBadge type={user.account_type} />
                      </td>
                      <td className="px-5 py-4">
                        {isEligible ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Yes
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <X className="w-3.5 h-3.5" />
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800/50 bg-[#080812]">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-800 bg-[#0d0d18] hover:bg-[#151520] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <span className="px-3 text-gray-400">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-800 bg-[#0d0d18] hover:bg-[#151520] disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopSecretAdmin;