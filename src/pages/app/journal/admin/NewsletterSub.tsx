// =====================================================
// FINOTAUR NEWSLETTER ADMIN PANEL - v5.3.0
// =====================================================
// Place in: src/pages/app/journal/admin/NewsletterSub.tsx
//
// 🔥 v5.3.0 CHANGES:
// - Real-time workflow progress tracking (2-second polling)
// - Live agent status display with completion indicators
// - Phase-by-phase progress with color coding
// - Agent icons and completion grid
// - Recent activity log display
// - Elapsed time and estimated remaining
// - Background generation with navigation support
// - Fallback to legacy status endpoint
// =====================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Mail,
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
  FileText,
  Sparkles,
  Copy,
  Check,
  Download,
  Settings,
  Info,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================
// TYPES
// ============================================

interface NewsletterStats {
  total_subscribers: number;
  active_subscribers: number;
  trial_subscribers: number;
  cancelled_subscribers: number;
  total_users: number;
}

interface NewsletterUser {
  id: string;
  email: string;
  display_name: string | null;
  account_type: 'free' | 'basic' | 'premium';
  newsletter_enabled: boolean;
  newsletter_status: 'inactive' | 'trial' | 'active' | 'cancelled';
  newsletter_started_at: string | null;
  newsletter_expires_at: string | null;
  newsletter_trial_ends_at: string | null;
  created_at: string;
}

interface PreviewData {
  subject: string;
  preheader: string;
  sections: { id: string; title: string; content: string }[];
  html: string;
  markdown?: string;
  generatedAt: string;
  processorInfo?: ProcessorInfo;
  story?: StoryData;
}

interface StoryData {
  primaryStory?: string;
  threeForces?: Array<{ name: string; direction: string }>;
  narrativeHook?: string;
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
  segments: string[];
  admin_note?: string;
}

interface NewsletterConfig {
  config_key: string;
  config_value: {
    enabled?: boolean;
    days?: string[];
    hour?: number;
    minute?: number;
    timezone?: string;
  };
  description: string;
  updated_at: string;
}

interface InclusionStatus {
  premium_included: boolean;
  basic_included: boolean;
  total_recipients: number;
  newsletter_subscribers: number;
  premium_recipients: number;
  basic_recipients: number;
}

// v5.3.0: Real-time workflow progress interface
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

// ============================================
// AGENT ICONS MAP (v5.3.0)
// ============================================
const AGENT_ICONS: Record<string, string> = {
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
};

// ============================================
// HELPER: Format exact time
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

// ============================================
// v5.3.0: Get phase color
// ============================================
const getPhaseColor = (phase: string | null): string => {
  if (!phase) return 'text-gray-500';
  switch (phase) {
    case 'INIT': return 'text-gray-400';
    case 'DATA_FETCH': return 'text-blue-400';
    case 'PHASE_0': return 'text-purple-400';
    case 'PHASE_1': return 'text-cyan-400';
    case 'PHASE_2': return 'text-[#C9A646]';
    case 'PHASE_3': return 'text-orange-400';
    case 'PHASE_4': return 'text-emerald-400';
    case 'COMPLETE': return 'text-emerald-500';
    case 'ERROR': return 'text-red-500';
    default: return 'text-gray-400';
  }
};

const getPhaseBgColor = (phase: string | null): string => {
  if (!phase) return 'bg-gray-500/10';
  switch (phase) {
    case 'INIT': return 'bg-gray-400/10';
    case 'DATA_FETCH': return 'bg-blue-400/10';
    case 'PHASE_0': return 'bg-purple-400/10';
    case 'PHASE_1': return 'bg-cyan-400/10';
    case 'PHASE_2': return 'bg-[#C9A646]/10';
    case 'PHASE_3': return 'bg-orange-400/10';
    case 'PHASE_4': return 'bg-emerald-400/10';
    case 'COMPLETE': return 'bg-emerald-500/10';
    case 'ERROR': return 'bg-red-500/10';
    default: return 'bg-gray-400/10';
  }
};

const getPhaseLabel = (phase: string | null): string => {
  if (!phase) return 'Waiting';
  switch (phase) {
    case 'INIT': return 'Initializing';
    case 'DATA_FETCH': return 'Fetching Data';
    case 'PHASE_0': return 'Mode Detection';
    case 'PHASE_1': return 'Story Architecture';
    case 'PHASE_2': return 'Content Generation';
    case 'PHASE_3': return 'Quality Assurance';
    case 'PHASE_4': return 'Final Assembly';
    case 'COMPLETE': return 'Complete';
    case 'ERROR': return 'Error';
    default: return phase;
  }
};

// ============================================
// v5.3.0: REAL-TIME AGENT PROGRESS COMPONENT
// ============================================
const AgentProgress: React.FC<{ 
  isGenerating: boolean; 
  workflowProgress: WorkflowProgress | null;
}> = ({ isGenerating, workflowProgress }) => {
  
  if (!isGenerating) return null;

  const progress = workflowProgress?.progress || 0;
  const currentPhase = workflowProgress?.currentPhase || 'INIT';
  const currentAgent = workflowProgress?.currentAgent;
  const elapsedFormatted = workflowProgress?.elapsedFormatted || '0:00';
  const completedAgents = workflowProgress?.completedAgents || [];
  const recentLogs = workflowProgress?.recentLogs || [];

  // Agent grid - shows which agents are done, running, or waiting
  const agentList = [
    'ModeController', 'StoryArchitect', 'DataNormalizer', 'MarketPulse',
    'MarketStructure', 'Radar', 'Macro', 'Analyst',
    'News', 'Earnings', 'Options', 'Sectors',
    'Technical', 'CrossAsset', 'Catalysts', 'Tactical',
    'BottomLine', 'CoherenceChecker', 'SectionValidator', 'GapFiller',
    'ToneEnhancer', 'Compiler', 'FinalQA',
  ];

  return (
    <div className="bg-[#0d0d18] rounded-xl border border-[#C9A646]/30 p-6 mb-4">
      {/* Header with LIVE indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="w-8 h-8 text-[#C9A646]" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold">25 AI Agents Working</h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <p className="text-sm text-gray-500">v29 - Single Story Spine + Flow Linkage</p>
          </div>
        </div>
        
        {/* Elapsed time */}
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-white">{elapsedFormatted}</p>
          <p className="text-xs text-gray-500">/ ~3:00 estimated</p>
        </div>
      </div>

      {/* Current Phase & Agent */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`px-3 py-1.5 rounded-lg ${getPhaseBgColor(currentPhase)} border border-current/20`}>
          <span className={`text-sm font-medium ${getPhaseColor(currentPhase)}`}>
            {getPhaseLabel(currentPhase)}
          </span>
        </div>
        
        {currentAgent && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/30">
            <span className="text-lg">{AGENT_ICONS[currentAgent] || '🤖'}</span>
            <span className="text-sm font-medium text-[#C9A646]">{currentAgent}</span>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A646]" />
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>{workflowProgress?.currentStep || 'Initializing...'}</span>
          <span className="font-mono">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#C9A646] to-orange-500 transition-all duration-500 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
        {agentList.slice(0, 12).map((agent) => {
          const isCompleted = completedAgents.includes(agent);
          const isRunning = currentAgent === agent;
          
          return (
            <div 
              key={agent}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all ${
                isCompleted 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : isRunning
                    ? 'bg-[#C9A646]/20 text-[#C9A646] border border-[#C9A646]/30 animate-pulse'
                    : 'bg-gray-800/50 text-gray-500 border border-gray-700/50'
              }`}
            >
              <span>{AGENT_ICONS[agent] || '🤖'}</span>
              <span className="truncate hidden sm:inline">{agent.substring(0, 8)}</span>
              {isCompleted && <CheckCircle className="w-3 h-3 ml-auto flex-shrink-0" />}
              {isRunning && <Loader2 className="w-3 h-3 ml-auto flex-shrink-0 animate-spin" />}
            </div>
          );
        })}
      </div>

      {/* Completed count */}
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-gray-500">
          Agents completed: <span className="text-emerald-400 font-medium">{completedAgents.length}</span> / 25
        </span>
        <span className="text-gray-600 text-xs">
          {completedAgents.length > 0 && `Last: ${completedAgents[completedAgents.length - 1]}`}
        </span>
      </div>

      {/* Recent Activity Log */}
      {recentLogs.length > 0 && (
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Recent Activity</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {recentLogs.slice(-5).reverse().map((log, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="text-gray-600 font-mono">{log.time}</span>
                <span className={getPhaseColor(log.phase)}>{log.phase}</span>
                <span className="text-gray-400 truncate">{log.message || log.step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4 text-center">
        💡 6 Phases: Mode → Data → Story → Content (14 sections) → QA → Assembly
      </p>
    </div>
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
// GENERATION TIME DISPLAY
// ============================================
const GenerationTimeDisplay: React.FC<{ generatedAt: string }> = ({ generatedAt }) => {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Clock className="w-3.5 h-3.5 text-gray-500" />
      <span className="text-gray-400">{formatExactTime(generatedAt)}</span>
      <span className="text-gray-600">({formatTimeAgo(generatedAt)})</span>
    </div>
  );
};

// ============================================
// NEWSLETTER SETTINGS SECTION
// ============================================
const NewsletterSettingsSection: React.FC<{
  config: NewsletterConfig[] | undefined;
  inclusionStatus: InclusionStatus | undefined;
  isLoading: boolean;
  onToggle: (key: string, enabled: boolean) => void;
  isUpdating: boolean;
}> = ({ config, inclusionStatus, isLoading, onToggle, isUpdating }) => {
  
  const getConfigValue = (key: string): boolean => {
    const item = config?.find(c => c.config_key === key);
    return item?.config_value?.enabled ?? false;
  };

  const premiumEnabled = getConfigValue('premium_included');
  const basicEnabled = getConfigValue('basic_included');

  if (isLoading) {
    return (
      <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          <span className="text-gray-500">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800/50 bg-[#080812] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Settings className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Newsletter Recipients</h2>
            <p className="text-xs text-gray-500">Control who receives the newsletter</p>
          </div>
        </div>
        
        {/* Total Recipients Badge */}
        {inclusionStatus && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/20">
            <Users className="w-4 h-4 text-[#C9A646]" />
            <span className="text-sm font-medium text-[#C9A646]">
              {inclusionStatus.total_recipients} Total Recipients
            </span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Automatic Newsletter Distribution</p>
            <p className="text-blue-400/80">
              Newsletter subscribers (paid + trial) always receive the newsletter. 
              Enable the options below to also include journal plan users as a perk.
            </p>
          </div>
        </div>

        {/* Recipients Breakdown */}
        {inclusionStatus && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-500">Newsletter Subs</span>
              </div>
              <p className="text-2xl font-bold text-red-400">
                {inclusionStatus.newsletter_subscribers}
              </p>
              <p className="text-xs text-gray-600 mt-1">Always included</p>
            </div>
            
            <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${premiumEnabled ? 'bg-[#C9A646]' : 'bg-gray-600'}`}></div>
                <span className="text-xs text-gray-500">Premium Users</span>
              </div>
              <p className={`text-2xl font-bold ${premiumEnabled ? 'text-[#C9A646]' : 'text-gray-600'}`}>
                {premiumEnabled ? inclusionStatus.premium_recipients : 0}
                {!premiumEnabled && inclusionStatus.premium_recipients > 0 && (
                  <span className="text-sm font-normal text-gray-600 ml-1">
                    ({inclusionStatus.premium_recipients} available)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {premiumEnabled ? 'Included as perk' : 'Not included'}
              </p>
            </div>
            
            <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${basicEnabled ? 'bg-cyan-500' : 'bg-gray-600'}`}></div>
                <span className="text-xs text-gray-500">Basic Users</span>
              </div>
              <p className={`text-2xl font-bold ${basicEnabled ? 'text-cyan-400' : 'text-gray-600'}`}>
                {basicEnabled ? inclusionStatus.basic_recipients : 0}
                {!basicEnabled && inclusionStatus.basic_recipients > 0 && (
                  <span className="text-sm font-normal text-gray-600 ml-1">
                    ({inclusionStatus.basic_recipients} available)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {basicEnabled ? 'Included as perk' : 'Not included'}
              </p>
            </div>
          </div>
        )}

        {/* Toggle Settings */}
        <div className="space-y-3">
          {/* Premium Toggle */}
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            premiumEnabled 
              ? 'bg-[#C9A646]/10 border-[#C9A646]/30' 
              : 'bg-[#080812] border-gray-800/50 hover:border-gray-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${premiumEnabled ? 'bg-[#C9A646]/20' : 'bg-gray-800'}`}>
                <Crown className={`w-5 h-5 ${premiumEnabled ? 'text-[#C9A646]' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className={`font-medium ${premiumEnabled ? 'text-white' : 'text-gray-400'}`}>
                  Include Premium Users
                </p>
                <p className="text-xs text-gray-500">
                  Premium journal subscribers receive newsletter as a free perk
                </p>
              </div>
            </div>
            
            <button
              onClick={() => onToggle('premium_included', !premiumEnabled)}
              disabled={isUpdating}
              className={`relative w-14 h-7 rounded-full transition-all ${
                premiumEnabled ? 'bg-[#C9A646]' : 'bg-gray-700'
              } ${isUpdating ? 'opacity-50' : ''}`}
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
                  Include Basic Users
                </p>
                <p className="text-xs text-gray-500">
                  Basic journal subscribers receive newsletter as a free perk
                </p>
              </div>
            </div>
            
            <button
              onClick={() => onToggle('basic_included', !basicEnabled)}
              disabled={isUpdating}
              className={`relative w-14 h-7 rounded-full transition-all ${
                basicEnabled ? 'bg-cyan-500' : 'bg-gray-700'
              } ${isUpdating ? 'opacity-50' : ''}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                basicEnabled ? 'translate-x-8' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Impact Notice */}
        {(premiumEnabled || basicEnabled) && (
          <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-300">
              {premiumEnabled && basicEnabled ? (
                <>All Premium and Basic users will receive the newsletter!</>
              ) : premiumEnabled ? (
                <>All Premium users will receive the newsletter!</>
              ) : (
                <>All Basic users will receive the newsletter!</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// FULL REPORT VIEWER MODAL
// ============================================
const ReportViewerModal: React.FC<{
  report: string;
  subject: string;
  processorInfo: ProcessorInfo | null;
  generatedAt: string;
  onClose: () => void;
}> = ({ report, subject, processorInfo, generatedAt, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'markdown'>('rendered');
  const [copied, setCopied] = useState(false);

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
    a.download = `finotaur-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
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
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        const isHeader = match.includes('---');
        if (isHeader) return '';
        return `<tr class="border-b border-gray-800">${cells.map(c => 
          `<td class="px-3 py-2 text-sm text-gray-300">${c.trim()}</td>`
        ).join('')}</tr>`;
      })
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
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#C9A646]/20 to-orange-500/10 border border-[#C9A646]/30">
              <FileText className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{subject || 'Finotaur Intelligence Report'}</h2>
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
                <GenerationTimeDisplay generatedAt={generatedAt} />
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
              title="Download report"
            >
              <Download className="w-5 h-5 text-gray-400" />
            </button>
            
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

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-[#080812] rounded-b-2xl">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{report.split(' ').length.toLocaleString()} words</span>
            <span>•</span>
            <span>{report.length.toLocaleString()} characters</span>
            <span>•</span>
            <span>{(report.match(/^-+$/gm) || []).length + 1} sections</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          >
            Close
          </button>
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
            <p className="text-xs text-gray-600">This will be the first report</p>
          </div>
        </div>
      </div>
    );
  }

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
          <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
          <p className="text-sm text-white font-medium">{lastSent.subject}</p>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-gray-800/50">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-400">
              <span className="text-white font-medium">{lastSent.recipient_count}</span> recipients
            </span>
          </div>
          
          {lastSent.admin_note && (
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs text-orange-400">Includes note</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// PREVIEW MODAL COMPONENT
// ============================================
const PreviewModal: React.FC<{
  preview: PreviewData;
  onClose: () => void;
  onSend: () => void;
  isSending: boolean;
  recipientCount: number;
  processorInfo: ProcessorInfo | null;
  adminNote: string;
}> = ({ preview, onClose, onSend, isSending, recipientCount, processorInfo, adminNote }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className={`relative bg-[#0d0d18] border border-gray-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${
        isFullscreen ? 'w-[95vw] h-[95vh]' : 'w-[90vw] max-w-4xl h-[85vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#080812] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Eye className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Email Preview</h2>
              <GenerationTimeDisplay generatedAt={preview.generatedAt} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {processorInfo && (
              <div className="flex items-center gap-2 mr-2">
                <div className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 bg-[#C9A646]/20 text-[#C9A646] border border-[#C9A646]/30">
                  <Bot className="w-3 h-3" />
                  <span>{processorInfo.agentCount} Agents</span>
                </div>
                {processorInfo.qaScore && (
                  <QAScoreBadge score={processorInfo.qaScore} passed={processorInfo.qaPassed} />
                )}
              </div>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Maximize2 className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Subject & Preheader */}
        <div className="px-6 py-4 border-b border-gray-800/50 bg-[#0a0a14]">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Subject</p>
              <p className="text-white font-medium text-lg">{preview.subject}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Preheader</p>
              <p className="text-gray-400">{preview.preheader}</p>
            </div>
          </div>
        </div>

        {/* Admin Note Preview */}
        {adminNote && (
          <div className="px-6 py-3 bg-orange-500/10 border-b border-orange-500/20">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-orange-400 font-medium mb-0.5">Admin note will be included:</p>
                <p className="text-sm text-orange-200">{adminNote}</p>
              </div>
            </div>
          </div>
        )}

        {/* HTML Preview */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="w-full h-full bg-gray-100 rounded-xl overflow-hidden shadow-inner">
            <iframe
              srcDoc={preview.html}
              title="Newsletter Preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-[#080812] rounded-b-2xl">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              <span className="text-white font-medium">{preview.sections.length}</span> sections
            </div>
            <div className="w-px h-4 bg-gray-700" />
            <div className="text-sm text-gray-500">
              Recipients: <span className="text-red-400 font-medium">{recipientCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onSend}
              disabled={isSending || recipientCount === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-semibold flex items-center gap-2"
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
              ) : (
                <><Send className="w-4 h-4" />Send to {recipientCount}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// NEWSLETTER STATUS BADGE
// ============================================
const NewsletterStatusBadge: React.FC<{ status: string }> = ({ status }) => {
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
// MAIN COMPONENT
// ============================================
const NewsletterSub: React.FC = () => {
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'trial' | 'cancelled' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [useCustomSelection, setUseCustomSelection] = useState(false);
  const [customSelectedIds, setCustomSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [fullReport, setFullReport] = useState<string>('');
  const [testEmail, setTestEmail] = useState('');
  const [processorInfo, setProcessorInfo] = useState<ProcessorInfo | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  
  // v5.3.0: Real-time workflow progress state
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress | null>(null);
  
  const pageSize = 15;

  // Load cached preview on mount
  useEffect(() => {
    const savedPreview = localStorage.getItem('newsletter_preview');
    const savedProcessorInfo = localStorage.getItem('newsletter_processor_info');
    const savedReport = localStorage.getItem('newsletter_full_report');
    
    if (savedPreview) {
      try {
        const parsed = JSON.parse(savedPreview);
        const age = Date.now() - new Date(parsed.generatedAt).getTime();
        if (age < 4 * 60 * 60 * 1000) {
          setPreview(parsed);
        } else {
          localStorage.removeItem('newsletter_preview');
        }
      } catch {
        localStorage.removeItem('newsletter_preview');
      }
    }
    
    if (savedProcessorInfo) {
      try {
        setProcessorInfo(JSON.parse(savedProcessorInfo));
      } catch {
        localStorage.removeItem('newsletter_processor_info');
      }
    }

    if (savedReport) {
      setFullReport(savedReport);
    }
  }, []);

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: async (): Promise<NewsletterStats> => {
      const { data, error } = await supabase.rpc('get_newsletter_stats');
      if (error) throw error;
      const row = data?.[0] || {};
      return {
        total_subscribers: Number(row.total_subscribers) || 0,
        active_subscribers: Number(row.active_subscribers) || 0,
        trial_subscribers: Number(row.trial_subscribers) || 0,
        cancelled_subscribers: Number(row.cancelled_subscribers) || 0,
        total_users: Number(row.total_users) || 0,
      };
    },
  });

  // Fetch last sent
  const { data: lastSent, isLoading: lastSentLoading } = useQuery({
    queryKey: ['newsletter-last-sent'],
    queryFn: async (): Promise<LastSentInfo | null> => {
      const { data, error } = await supabase
        .from('newsletter_send_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return data ? {
        sent_at: data.sent_at,
        recipient_count: data.recipient_count,
        subject: data.subject,
        segments: data.segments || [],
        admin_note: data.admin_note,
      } : null;
    },
  });

  // Fetch newsletter config from DB
  const { data: newsletterConfig, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['newsletter-config'],
    queryFn: async (): Promise<NewsletterConfig[]> => {
      const { data, error } = await supabase.rpc('get_newsletter_config');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch inclusion status from DB
  const { data: inclusionStatus, refetch: refetchInclusion } = useQuery({
    queryKey: ['newsletter-inclusion-status'],
    queryFn: async (): Promise<InclusionStatus> => {
      const { data, error } = await supabase.rpc('get_newsletter_inclusion_status');
      if (error) throw error;
      const row = data?.[0] || {};
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

  // Toggle config mutation - calls DB function
  const handleToggleConfig = async (key: string, enabled: boolean) => {
    setIsUpdatingConfig(true);
    try {
      const { error } = await supabase.rpc('toggle_newsletter_config', {
        p_config_key: key,
        p_enabled: enabled,
      });
      
      if (error) throw error;
      
      toast.success(
        enabled 
          ? `${key === 'premium_included' ? 'Premium' : 'Basic'} users will now receive newsletters`
          : `${key === 'premium_included' ? 'Premium' : 'Basic'} users removed from newsletter`
      );
      
      await Promise.all([refetchConfig(), refetchInclusion()]);
      
    } catch (err) {
      console.error('Toggle config error:', err);
      toast.error('Failed to update setting');
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  // Fetch users
  const { data: allUsers, isLoading: usersLoading, refetch, error: usersError } = useQuery({
    queryKey: ['newsletter-users'],
    queryFn: async (): Promise<NewsletterUser[]> => {
      const { data, error } = await supabase.rpc('get_newsletter_users');
      if (error) throw error;
      return (data || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        account_type: u.account_type as 'free' | 'basic' | 'premium',
        newsletter_enabled: u.newsletter_enabled ?? false,
        newsletter_status: (u.newsletter_status || 'inactive') as NewsletterUser['newsletter_status'],
        newsletter_started_at: u.newsletter_started_at,
        newsletter_expires_at: u.newsletter_expires_at,
        newsletter_trial_ends_at: u.newsletter_trial_ends_at,
        created_at: u.created_at,
      }));
    },
  });

  const userList = useMemo(() => allUsers || [], [allUsers]);

  // Calculate eligible recipients based on Settings config (from DB)
  const eligibleRecipients = useMemo(() => {
    const premiumIncluded = inclusionStatus?.premium_included ?? false;
    const basicIncluded = inclusionStatus?.basic_included ?? false;
    
    return userList.filter(user => {
      if (user.newsletter_status === 'active' || user.newsletter_status === 'trial') {
        return true;
      }
      if (user.account_type === 'premium' && premiumIncluded) {
        return true;
      }
      if (user.account_type === 'basic' && basicIncluded) {
        return true;
      }
      return false;
    });
  }, [userList, inclusionStatus]);

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
      users = users.filter(u => u.newsletter_status === filterStatus);
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

  const toggleMutation = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const { error } = await supabase.rpc('toggle_newsletter_status', {
        p_user_id: userId,
        p_enabled: enabled,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-inclusion-status'] });
      toast.success('Updated successfully');
    },
    onError: () => {
      toast.error('Failed to update');
    },
  });

  // v5.3.0: Poll for real-time workflow progress
  const pollWorkflowProgress = async (): Promise<boolean> => {
    try {
      // Try new endpoint first
      const res = await fetch(`${API_BASE}/api/newsletter/workflow-progress`);
      const data = await res.json();
      
      if (data.success) {
        setWorkflowProgress({
          isRunning: data.isRunning,
          currentPhase: data.currentPhase,
          currentStep: data.currentStep,
          currentAgent: data.currentAgent,
          progress: data.progress,
          elapsedSeconds: data.elapsedSeconds,
          elapsedFormatted: data.elapsedFormatted,
          estimatedRemaining: data.estimatedRemaining,
          completedAgentCount: data.completedAgentCount,
          completedAgents: data.completedAgents || [],
          recentLogs: data.recentLogs || [],
          error: data.error,
        });
        
        // Check if completed
        if (!data.isRunning && data.progress === 100) {
          // Fetch the completed report
          const reportRes = await fetch(`${API_BASE}/api/newsletter/preview`);
          const reportData = await reportRes.json();
          
          if (reportData.success && reportData.data) {
            setPreview(reportData.data);
            localStorage.setItem('newsletter_preview', JSON.stringify(reportData.data));
            
            if (reportData.data.processorInfo) {
              setProcessorInfo(reportData.data.processorInfo);
              localStorage.setItem('newsletter_processor_info', JSON.stringify(reportData.data.processorInfo));
            }
            
            if (reportData.data.markdown) {
              setFullReport(reportData.data.markdown);
              localStorage.setItem('newsletter_full_report', reportData.data.markdown);
            }
            
            const qaScore = reportData.data.processorInfo?.qaScore;
            toast.success(`Report ready! QA Score: ${qaScore || 'N/A'}/100 ${qaScore >= 80 ? '✅' : '⚠️'}`);
          }
          
          setIsGeneratingPreview(false);
          return true; // Stop polling
        }
        
        // Check for error
        if (data.error) {
          toast.error(data.error || 'Generation failed');
          setIsGeneratingPreview(false);
          return true; // Stop polling
        }
        
        return false; // Continue polling
      }
    } catch (err) {
      console.error('Workflow progress poll error:', err);
      // Fallback to old status endpoint
      try {
        const fallbackRes = await fetch(`${API_BASE}/api/newsletter/status`);
        const fallbackData = await fallbackRes.json();
        
        if (fallbackData.success) {
          const { status, hasReport, progress, currentPhase } = fallbackData.data;
          
          setWorkflowProgress(prev => ({
            ...prev!,
            isRunning: status === 'generating',
            currentPhase: currentPhase || prev?.currentPhase || 'GENERATING',
            progress: progress || prev?.progress || 0,
          }));
          
          if (status === 'completed' && hasReport) {
            const reportRes = await fetch(`${API_BASE}/api/newsletter/preview`);
            const reportData = await reportRes.json();
            
            if (reportData.success && reportData.data) {
              setPreview(reportData.data);
              if (reportData.data.processorInfo) setProcessorInfo(reportData.data.processorInfo);
              if (reportData.data.markdown) setFullReport(reportData.data.markdown);
              toast.success('Report ready!');
            }
            
            setIsGeneratingPreview(false);
            return true;
          }
          
          if (status === 'error') {
            toast.error('Generation failed');
            setIsGeneratingPreview(false);
            return true;
          }
        }
      } catch {
        // Silently fail
      }
    }
    return false;
  };

  // Check for in-progress generation on mount
  useEffect(() => {
    const checkExistingGeneration = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/newsletter/workflow-progress`);
        const data = await res.json();
        
        if (data.success && data.isRunning) {
          setIsGeneratingPreview(true);
          setWorkflowProgress({
            isRunning: true,
            currentPhase: data.currentPhase,
            currentStep: data.currentStep,
            currentAgent: data.currentAgent,
            progress: data.progress,
            elapsedSeconds: data.elapsedSeconds,
            elapsedFormatted: data.elapsedFormatted,
            estimatedRemaining: data.estimatedRemaining,
            completedAgentCount: data.completedAgentCount,
            completedAgents: data.completedAgents || [],
            recentLogs: data.recentLogs || [],
            error: null,
          });
          toast.info('Report generation in progress...', { duration: 5000 });
        } else if (!data.isRunning && data.progress === 100 && !preview) {
          // Load completed report if not already loaded
          const reportRes = await fetch(`${API_BASE}/api/newsletter/preview`);
          const reportData = await reportRes.json();
          
          if (reportData.success && reportData.data) {
            setPreview(reportData.data);
            if (reportData.data.processorInfo) setProcessorInfo(reportData.data.processorInfo);
            if (reportData.data.markdown) setFullReport(reportData.data.markdown);
          }
        }
      } catch (err) {
        console.error('Failed to check generation status:', err);
      }
    };
    
    checkExistingGeneration();
  }, []);

  // v5.3.0: Polling effect with 2-second interval
  useEffect(() => {
    if (!isGeneratingPreview) return;
    
    const pollInterval = setInterval(async () => {
      const shouldStop = await pollWorkflowProgress();
      if (shouldStop) {
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds for real-time feel
    
    return () => clearInterval(pollInterval);
  }, [isGeneratingPreview]);

  const generatePreview = async () => {
    setIsGeneratingPreview(true);
    setWorkflowProgress({
      isRunning: true,
      currentPhase: 'INIT',
      currentStep: 'Starting workflow',
      currentAgent: null,
      progress: 0,
      elapsedSeconds: 0,
      elapsedFormatted: '0:00',
      estimatedRemaining: 180,
      completedAgentCount: 0,
      completedAgents: [],
      recentLogs: [],
      error: null,
    });
    
    try {
      toast.info('Starting report generation... You can navigate away - it will continue in background!', { duration: 8000 });
      
      const res = await fetch(`${API_BASE}/api/newsletter/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (data.data.status === 'completed') {
          await pollWorkflowProgress();
        }
        // Otherwise polling will pick up the progress
      } else {
        toast.error(data.error || 'Failed to start generation');
        setIsGeneratingPreview(false);
        setWorkflowProgress(null);
      }
    } catch (err) {
      console.error('Preview generation error:', err);
      toast.error('Server connection error. Make sure the server is running.');
      setIsGeneratingPreview(false);
      setWorkflowProgress(null);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setFullReport('');
    setProcessorInfo(null);
    localStorage.removeItem('newsletter_preview');
    localStorage.removeItem('newsletter_full_report');
    localStorage.removeItem('newsletter_processor_info');
  };

  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    
    try {
      toast.info('Generating report and sending test...', { duration: 10000 });
      
      const res = await fetch(`${API_BASE}/api/newsletter/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: testEmail,
          adminNote: adminNote || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Test sent to ${testEmail}`);
        setTestEmail('');
      } else {
        toast.error(data.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send');
    }
  };

  const sendNewsletter = async () => {
    if (recipientIds.length === 0) {
      toast.error('No recipients selected');
      return;
    }

    if (!preview) {
      toast.error('Generate preview first');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audienceType: 'custom',
          recipientIds: recipientIds,
          adminNote: adminNote || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Newsletter sent to ${data.data.sentCount} recipients!`);
        queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] });
        queryClient.invalidateQueries({ queryKey: ['newsletter-last-sent'] });
        clearPreview();
        setAdminNote('');
        setShowPreviewModal(false);
        clearCustomSelection();
      } else {
        toast.error(data.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const getDisplayName = (user: NewsletterUser) => {
    return user.display_name || user.email.split('@')[0];
  };

  const getTrialInfo = (user: NewsletterUser): string | null => {
    if (user.newsletter_status !== 'trial' || !user.newsletter_trial_ends_at) return null;
    const daysLeft = Math.ceil((new Date(user.newsletter_trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} days left` : 'Ending today';
  };

  const isUserEligible = (user: NewsletterUser): boolean => {
    return eligibleRecipients.some(r => r.id === user.id);
  };

  const isUserSelected = (userId: string) => {
    if (useCustomSelection) {
      return customSelectedIds.has(userId);
    }
    return eligibleRecipients.some(u => u.id === userId);
  };

  if (usersError) {
    return (
      <div className="p-6 min-h-screen bg-[#080812]">
        <div className="bg-[#0d0d18] rounded-xl p-8 border border-red-500/30">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-white font-medium mb-2">Failed to load newsletter users</h3>
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

      {/* Modals */}
      {showPreviewModal && preview && (
        <PreviewModal
          preview={preview}
          onClose={() => setShowPreviewModal(false)}
          onSend={sendNewsletter}
          isSending={isSending}
          recipientCount={recipientIds.length}
          processorInfo={processorInfo}
          adminNote={adminNote}
        />
      )}

      {showReportViewer && fullReport && preview && (
        <ReportViewerModal
          report={fullReport}
          subject={preview?.subject || 'Finotaur Intelligence Report'}
          processorInfo={processorInfo}
          generatedAt={preview?.generatedAt || new Date().toISOString()}
          onClose={() => setShowReportViewer(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <Mail className="w-6 h-6 text-red-500" />
            </div>
            War Zone Newsletter
          </h1>
          <p className="text-gray-600 mt-1 ml-14">Powered by 25 AI Agents (v29 - 6 Phase System) • Single Story Spine</p>
          
          {processorInfo && (
            <div className="mt-2 ml-14 flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 bg-[#C9A646]/20 text-[#C9A646] border border-[#C9A646]/30">
                <Bot className="w-3 h-3" />
                <span>{processorInfo.agentCount} AI Agents</span>
              </div>
              <span className="text-xs text-gray-500">
                {processorInfo.version}
              </span>
              {processorInfo.qaScore && (
                <QAScoreBadge score={processorInfo.qaScore} passed={processorInfo.qaPassed} />
              )}
            </div>
          )}
        </div>

        {/* SINGLE YELLOW PREVIEW BUTTON */}
        <button
          onClick={() => {
            if (fullReport && preview) {
              setShowReportViewer(true);
            } else {
              generatePreview();
            }
          }}
          disabled={isGeneratingPreview}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A646] to-orange-500 hover:from-[#d4af4f] hover:to-orange-400 disabled:opacity-50 transition-all text-black font-bold shadow-lg shadow-[#C9A646]/20"
        >
          {isGeneratingPreview ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating ({workflowProgress?.progress || 0}%)...</span>
            </>
          ) : fullReport && preview ? (
            <>
              <Eye className="w-5 h-5" />
              <span>VIEW REPORT</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>GENERATE DAILY REPORT</span>
            </>
          )}
        </button>
      </div>

      {/* v5.3.0: Real-time Agent Progress (when generating) */}
      <AgentProgress 
        isGenerating={isGeneratingPreview} 
        workflowProgress={workflowProgress}
      />

      {/* Stats + Last Sent Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard 
            title="Total Subscribers" 
            value={stats?.total_subscribers || 0} 
            icon={Users} 
            iconBg="bg-red-600"
            valueColor="text-red-400"
            loading={statsLoading}
          />
          <StatCard 
            title="Active (Paid)" 
            value={stats?.active_subscribers || 0} 
            icon={CheckCircle} 
            iconBg="bg-emerald-600"
            valueColor="text-emerald-400"
            loading={statsLoading}
          />
          <StatCard 
            title="In Trial" 
            value={stats?.trial_subscribers || 0} 
            icon={Clock} 
            iconBg="bg-blue-600"
            valueColor="text-blue-400"
            loading={statsLoading}
          />
          <StatCard 
            title="Cancelled" 
            value={stats?.cancelled_subscribers || 0} 
            icon={XCircle} 
            iconBg="bg-gray-600"
            valueColor="text-gray-400"
            loading={statsLoading}
          />
        </div>

        <div className="lg:col-span-1">
          <LastSentStatus lastSent={lastSent || null} isLoading={lastSentLoading} />
        </div>
      </div>

      {/* Newsletter Settings Section */}
      <NewsletterSettingsSection
        config={newsletterConfig}
        inclusionStatus={inclusionStatus}
        isLoading={configLoading}
        onToggle={handleToggleConfig}
        isUpdating={isUpdatingConfig}
      />

      {/* Send Newsletter Section */}
      <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 overflow-hidden">
        <div className="p-5 border-b border-gray-800/50 bg-[#080812]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-white">Send Daily Intelligence</h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Will receive:</span>
              <span className="text-red-400 font-bold">{recipientIds.length}</span>
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
            <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Newsletter Subscribers
            </span>
            {inclusionStatus?.premium_included && (
              <span className="px-2 py-1 rounded-lg bg-[#C9A646]/20 text-[#C9A646] text-xs font-medium">
                + Premium Users
              </span>
            )}
            {inclusionStatus?.basic_included && (
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
              placeholder="Add a personal message that will appear at the top of the email..."
              className="w-full px-4 py-3 bg-[#0d0d18] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none text-sm"
              rows={3}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-600">
                Appears before the newsletter content
              </p>
              <p className="text-xs text-gray-500">
                {adminNote.length}/500
              </p>
            </div>
          </div>

          {/* Preview Status & Test Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Preview Status */}
            <div className="flex-1 bg-[#080812] rounded-xl p-4 border border-gray-800/50">
              <p className="text-sm text-gray-500 mb-3">Report Status</p>
              {!preview ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-2">No report generated yet</p>
                  <p className="text-xs text-gray-600">Click the yellow button above to generate</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium truncate flex-1 pr-2">{preview.subject}</p>
                    <button onClick={clearPreview} className="p-1 hover:bg-gray-700 rounded flex-shrink-0">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  
                  <GenerationTimeDisplay generatedAt={preview.generatedAt} />
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-emerald-400">✓ Report ready</span>
                    {processorInfo?.qaScore && (
                      <QAScoreBadge score={processorInfo.qaScore} passed={processorInfo.qaPassed} />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowReportViewer(true)}
                      className="flex items-center gap-1.5 text-xs text-[#C9A646] hover:text-[#d4af4f] transition-colors font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Full Report
                    </button>
                    <span className="text-gray-700">|</span>
                    <button
                      onClick={() => setShowPreviewModal(true)}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Email Preview
                    </button>
                    <span className="text-gray-700">|</span>
                    <button
                      onClick={generatePreview}
                      disabled={isGeneratingPreview}
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Test Email */}
            <div className="flex-1 bg-[#080812] rounded-xl p-4 border border-gray-800/50">
              <p className="text-sm text-gray-500 mb-3">Send Test Email</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-[#0d0d18] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-sm"
                />
                <button
                  onClick={sendTestEmail}
                  disabled={!testEmail}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors text-white font-medium text-sm"
                >
                  Test
                </button>
              </div>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={sendNewsletter}
            disabled={isSending || recipientIds.length === 0 || !preview}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-bold text-lg flex items-center justify-center gap-3"
          >
            {isSending ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Sending...</>
            ) : (
              <><Send className="w-5 h-5" />Send to {recipientIds.length} Recipients</>
            )}
          </button>

          {!preview && recipientIds.length > 0 && (
            <p className="text-center text-sm text-gray-500">Generate report before sending</p>
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
                className="w-full pl-10 pr-4 py-2.5 bg-[#080812] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as any); setPage(1); }}
              className="px-4 py-2.5 bg-[#080812] border border-gray-800 rounded-xl text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active (Paid)</option>
              <option value="trial">In Trial</option>
              <option value="cancelled">Cancelled</option>
              <option value="inactive">Not Subscribed</option>
            </select>
            <button
              onClick={() => refetch()}
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
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Newsletter</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Journal</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Eligible</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {usersLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-red-500" />
                    <p className="text-gray-500">Loading users...</p>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Users className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400">No users found</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isSelected = isUserSelected(user.id);
                  const isEligible = isUserEligible(user);
                  const isSubscriber = user.newsletter_status === 'active' || user.newsletter_status === 'trial';
                  const trialInfo = getTrialInfo(user);
                  
                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-[#080812]/50 transition-colors ${isSelected ? 'bg-red-500/5' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleUserSelection(user.id)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-red-500" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isSubscriber ? 'bg-gradient-to-br from-red-500/20 to-orange-500/10' : 'bg-gray-800'
                          }`}>
                            <span className={`font-medium ${isSubscriber ? 'text-red-400' : 'text-gray-400'}`}>
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
                        <NewsletterStatusBadge status={user.newsletter_status} />
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
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleMutation.mutate({ 
                            userId: user.id, 
                            enabled: !user.newsletter_enabled 
                          })}
                          disabled={toggleMutation.isPending}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm ${
                            user.newsletter_enabled
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {user.newsletter_enabled ? 'Disable' : 'Enable'}
                        </button>
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

export default NewsletterSub;