// =====================================================
// TopSecretAdmin - Constants & Types
// =====================================================

import {
  BarChart3,
  Building,
  Coins,
  Calendar,
} from 'lucide-react';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ========================================
// TYPES
// ========================================

export interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: typeof BarChart3;
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

export interface PreviewData {
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

export interface ProcessorInfo {
  version: string;
  type: string;
  agentCount: number;
  qaScore?: number;
  qaPassed?: boolean;
  duration?: string;
  features?: string[];
  mode?: string;
}

export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentPhase: string | null;
  currentAgent: string | null;
  completedAgents: string[];
  elapsedSeconds: number;
  reportId: string | null;
  error: string | null;
}

export interface ISMStatus {
  month: string;
  ismAvailable: boolean;
  willUseMockData: boolean;
  expectedReleaseDate: string;
  status: 'pending_ism' | 'ism_available' | 'generating' | 'report_generated' | 'error';
  reportExists: boolean;
  reportId?: string;
  reportGeneratedAt?: string;
}

export interface ReportStats {
  active_subscribers: number;
  monthly_subscribers: number;
  yearly_subscribers: number;
}

export interface ReportUser {
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

export interface ActiveGeneration {
  reportType: string;
  reportId: string;
  ticker?: string;
  startedAt: string;
}

// ========================================
// CONSTANTS
// ========================================

export const REPORT_TYPES: ReportType[] = [
  {
    id: 'ism',
    name: 'ISM Report',
    description: 'Manufacturing PMI analysis with 13 AI agents',
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
    description: 'Deep dive research on any company',
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
    description: 'Cryptocurrency market analysis',
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
    description: 'Comprehensive weekly market summary',
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

export const ISM_AGENTS = [
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

export const AGENT_ICONS: Record<string, string> = {
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
  ModeController: '🎯',
  DataNormalizer: '📊',
  market_data_fetcher: '📊',
  onchain_data_fetcher: '⛓️',
  data_fetcher: '📥',
  week_summary_writer: '📝',
};

// ========================================
// STORAGE KEYS
// ========================================

export const STORAGE_KEYS = {
  preview: (reportId: string) => `finotaur_report_preview_${reportId}`,
  fullReport: (reportId: string) => `finotaur_report_full_${reportId}`,
  allReports: 'finotaur_all_reports_index',
  activeGenerations: 'finotaur_active_generations',
  ismToggle: 'finotaur_company_ism_toggle',
};

// ========================================
// HELPER FUNCTIONS
// ========================================

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${Math.floor(diffHours / 24)} days ago`;
}

export function formatExactTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getPhaseColor(phase: string | null): string {
  if (!phase) return 'text-gray-500';
  const colors: Record<string, string> = {
    INIT: 'text-gray-400',
    DATA_FETCH: 'text-blue-400',
    DATA_ACQUISITION: 'text-blue-400',
    MACRO_ANALYSIS: 'text-purple-400',
    TREND_ANALYSIS: 'text-cyan-400',
    SECTOR_ANALYSIS: 'text-[#C9A646]',
    EQUITY_ANALYSIS: 'text-orange-400',
    TRADE_SYNTHESIS: 'text-pink-400',
    QUALITY_ASSURANCE: 'text-emerald-400',
    COMPLETE: 'text-emerald-500',
    ERROR: 'text-red-500',
  };
  return colors[phase] || 'text-gray-400';
}

export function getPhaseBgColor(phase: string | null): string {
  if (!phase) return 'bg-gray-500/10';
  const colors: Record<string, string> = {
    INIT: 'bg-gray-400/10',
    DATA_FETCH: 'bg-blue-400/10',
    DATA_ACQUISITION: 'bg-blue-400/10',
    MACRO_ANALYSIS: 'bg-purple-400/10',
    TREND_ANALYSIS: 'bg-cyan-400/10',
    SECTOR_ANALYSIS: 'bg-[#C9A646]/10',
    EQUITY_ANALYSIS: 'bg-orange-400/10',
    TRADE_SYNTHESIS: 'bg-pink-400/10',
    QUALITY_ASSURANCE: 'bg-emerald-400/10',
    COMPLETE: 'bg-emerald-500/10',
    ERROR: 'bg-red-500/10',
  };
  return colors[phase] || 'bg-gray-400/10';
}

export function getPhaseLabel(phase: string | null): string {
  if (!phase) return 'Waiting';
  const labels: Record<string, string> = {
    INIT: 'Initializing',
    DATA_FETCH: 'Fetching Data',
    DATA_ACQUISITION: 'Fetching Data',
    MACRO_ANALYSIS: 'Macro Analysis',
    TREND_ANALYSIS: 'Trend Analysis',
    SECTOR_ANALYSIS: 'Sector Analysis',
    EQUITY_ANALYSIS: 'Equity Analysis',
    TRADE_SYNTHESIS: 'Trade Synthesis',
    QUALITY_ASSURANCE: 'Quality Assurance',
    COMPLETE: 'Complete',
    ERROR: 'Error',
  };
  return labels[phase] || phase;
}

export function getCurrentISMMonth(): string {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthDisplay(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
