// =====================================================
// FINOTAUR NEWSLETTER ADMIN PANEL - v5.5.0
// =====================================================
// Place in: src/pages/app/journal/admin/NewsletterSub.tsx
//
// 🔥 v5.5.0 CHANGES:
// - REMOVED: Newsletter Recipients Settings Section
// - REMOVED: Send Daily Intelligence Section
// - REMOVED: Admin Note, Test Email, Manual Send functionality
// - KEPT: Stats, Last Sent, Report Generation, Users Table
// =====================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Mail,
  Users,
  Search,
  CheckCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  Crown,
  Loader2,
  AlertCircle,
  Eye,
  Maximize2,
  Bot,
  Clock,
  XCircle,
  Star,
  Calendar,
  History,
  Shield,
  FileText,
  Sparkles,
  Copy,
  Check,
  Download,
  Activity,
FileDown,
  Send,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { lazy, Suspense } from 'react';

const WarZoneLandingSimple = lazy(() => import("@/pages/app/all-markets/WarzoneComponents/Warzonelanding"));
const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

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
  hasPdf?: boolean;
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

type AdminViewMode = 'landing' | 'subscriber' | 'admin';

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
  hasPdf?: boolean;
}

// ============================================
// AGENT ICONS MAP
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

// ============================================
// DOWNLOAD PDF FUNCTION
// ============================================
const downloadPDF = async (): Promise<boolean> => {
  try {
    toast.info('Downloading PDF...', { duration: 2000 });
    
    const response = await fetch(`${API_BASE}/api/newsletter/pdf`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'PDF not available');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finotaur-report-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('PDF downloaded!');
    return true;
  } catch (err: any) {
    console.error('PDF download error:', err);
    toast.error(err.message || 'Failed to download PDF');
    return false;
  }
};

// ============================================
// Phase helpers
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
// AGENT PROGRESS COMPONENT
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
        
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-white">{elapsedFormatted}</p>
          <p className="text-xs text-gray-500">/ ~3:00 estimated</p>
        </div>
      </div>

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

      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-gray-500">
          Agents completed: <span className="text-emerald-400 font-medium">{completedAgents.length}</span> / 25
        </span>
        <span className="text-gray-600 text-xs">
          {completedAgents.length > 0 && `Last: ${completedAgents[completedAgents.length - 1]}`}
        </span>
      </div>

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
// FULL REPORT VIEWER MODAL
// ============================================
const ReportViewerModal: React.FC<{
  report: string;
  subject: string;
  processorInfo: ProcessorInfo | null;
  generatedAt: string;
  hasPdf?: boolean;
  onClose: () => void;
}> = ({ report, subject, processorInfo, generatedAt, hasPdf = true, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'markdown'>('rendered');
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  const downloadMarkdown = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finotaur-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown downloaded');
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    await downloadPDF();
    setIsDownloadingPdf(false);
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
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors group"
              title="Download PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
              ) : (
                <FileDown className="w-5 h-5 text-red-400 group-hover:text-red-300" />
              )}
            </button>
            
            <button
              onClick={downloadMarkdown}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              title="Download Markdown"
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
            <span>•</span>
            <span className="text-red-400 flex items-center gap-1">
              <FileDown className="w-3.5 h-3.5" />
              PDF Available
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors text-white font-medium flex items-center gap-2"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Download PDF
            </button>
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
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [fullReport, setFullReport] = useState<string>('');
  const [processorInfo, setProcessorInfo] = useState<ProcessorInfo | null>(null);
  const [hasPdf, setHasPdf] = useState(false);
const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastPublishedDate, setLastPublishedDate] = useState<string | null>(null);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>('admin');
  
  // Mock newsletter status for preview modes
  const mockActiveNewsletterStatus = {
    newsletter_enabled: true,
    newsletter_status: 'active',
    newsletter_whop_membership_id: 'mock_id',
    newsletter_started_at: new Date().toISOString(),
    newsletter_expires_at: null,
    newsletter_trial_ends_at: null,
    newsletter_cancel_at_period_end: false,
    days_until_expiry: null,
    days_until_trial_ends: null,
    is_in_trial: false,
    is_active: true,
  };
  
  const pageSize = 15;

  // Load cached preview on mount
  useEffect(() => {
    const savedPreview = localStorage.getItem('newsletter_preview');
    const savedProcessorInfo = localStorage.getItem('newsletter_processor_info');
    const savedReport = localStorage.getItem('newsletter_full_report');
    const savedHasPdf = localStorage.getItem('newsletter_has_pdf');
    
    if (savedPreview) {
      try {
        const parsed = JSON.parse(savedPreview);
        const age = Date.now() - new Date(parsed.generatedAt).getTime();
        if (age < 4 * 60 * 60 * 1000) {
          setPreview(parsed);
          setHasPdf(parsed.hasPdf || savedHasPdf === 'true');
        } else {
          localStorage.removeItem('newsletter_preview');
          localStorage.removeItem('newsletter_has_pdf');
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
      toast.success('Updated successfully');
    },
    onError: () => {
      toast.error('Failed to update');
    },
  });

  // Poll for workflow progress
  const pollWorkflowProgress = async (): Promise<boolean> => {
    try {
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
          hasPdf: data.hasPdf,
        });
        
        if (!data.isRunning && data.progress === 100) {
          const reportRes = await fetch(`${API_BASE}/api/newsletter/preview`);
          const reportData = await reportRes.json();
          
          if (reportData.success && reportData.data) {
            setPreview(reportData.data);
            setHasPdf(true);
            localStorage.setItem('newsletter_preview', JSON.stringify(reportData.data));
            localStorage.setItem('newsletter_has_pdf', 'true');
            
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
          return true;
        }
        
        if (data.error) {
          toast.error(data.error || 'Generation failed');
          setIsGeneratingPreview(false);
          return true;
        }
        
        return false;
      }
    } catch (err) {
      console.error('Workflow progress poll error:', err);
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
            hasPdf: data.hasPdf,
          });
          toast.info('Report generation in progress...', { duration: 5000 });
        } else if (!data.isRunning && data.progress === 100 && !preview) {
          const reportRes = await fetch(`${API_BASE}/api/newsletter/preview`);
          const reportData = await reportRes.json();
          
          if (reportData.success && reportData.data) {
            setPreview(reportData.data);
            setHasPdf(true);
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

  // Polling effect
  useEffect(() => {
    if (!isGeneratingPreview) return;
    
    const pollInterval = setInterval(async () => {
      const shouldStop = await pollWorkflowProgress();
      if (shouldStop) {
        clearInterval(pollInterval);
      }
    }, 2000);
    
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
      toast.info('Starting report generation...', { duration: 8000 });
      
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
      } else {
        toast.error(data.error || 'Failed to start generation');
        setIsGeneratingPreview(false);
        setWorkflowProgress(null);
      }
    } catch (err) {
      console.error('Preview generation error:', err);
      toast.error('Server connection error');
      setIsGeneratingPreview(false);
      setWorkflowProgress(null);
    }
  };

const clearPreview = () => {
    setPreview(null);
    setFullReport('');
    setProcessorInfo(null);
    setHasPdf(false);
    localStorage.removeItem('newsletter_preview');
    localStorage.removeItem('newsletter_full_report');
    localStorage.removeItem('newsletter_processor_info');
    localStorage.removeItem('newsletter_has_pdf');
  };

  // ============================================
  // PUBLISH DAILY REPORT FUNCTION
  // ============================================
  const publishDailyReport = async () => {
    if (!preview || !fullReport) {
      toast.error('No report to publish. Generate a report first.');
      return;
    }

    setIsPublishing(true);
    
    try {
      // Get today's date in YYYY-MM-DD format (NY timezone)
      const nyDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const reportId = `daily-${nyDate}`;
      
      // Prepare the report data
      const reportData = {
        id: reportId,
        report_date: nyDate,
        report_title: preview.subject || 'Daily Intelligence Report',
        markdown_content: fullReport,
        html_content: preview.html,
        sections: preview.sections ? JSON.stringify(preview.sections) : null,
        qa_score: processorInfo?.qaScore || 0,
        status: 'completed',
        pdf_url: `/api/newsletter/pdf`,
      };

      // Upsert to daily_reports table
      const { error } = await supabase
        .from('daily_reports')
        .upsert(reportData, { 
          onConflict: 'report_date',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Publish error:', error);
        throw new Error(error.message);
      }

      setLastPublishedDate(nyDate);
      setShowPublishModal(false);
      toast.success(`✅ Daily report published for ${nyDate}!`, {
        description: 'War Zone subscribers can now see this report.',
        duration: 5000,
      });

    } catch (err: any) {
      console.error('Publish error:', err);
      toast.error(`Failed to publish: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Check last published date on mount
  useEffect(() => {
    const checkLastPublished = async () => {
      const { data } = await supabase
        .from('daily_reports')
        .select('report_date')
        .order('report_date', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.report_date) {
        setLastPublishedDate(data.report_date);
      }
    };
    checkLastPublished();
  }, []);

  const getDisplayName = (user: NewsletterUser) => {
    return user.display_name || user.email.split('@')[0];
  };

  const getTrialInfo = (user: NewsletterUser): string | null => {
    if (user.newsletter_status !== 'trial' || !user.newsletter_trial_ends_at) return null;
    const daysLeft = Math.ceil((new Date(user.newsletter_trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} days left` : 'Ending today';
  };

// ============================================
  // PUBLISH CONFIRMATION MODAL
  // ============================================
  const PublishModal = () => {
    if (!showPublishModal) return null;
    
    const todayNY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const isAlreadyPublished = lastPublishedDate === todayNY;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={() => setShowPublishModal(false)}
        />
        
        <div className="relative bg-[#0a0a12] border border-[#C9A646]/30 rounded-2xl shadow-2xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30">
                <Globe className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Publish to War Zone</h2>
            </div>
            <button
              onClick={() => setShowPublishModal(false)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Report Info */}
            <div className="bg-[#0d0d18] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-[#C9A646]" />
                <span className="text-white font-medium">{preview?.subject || 'Daily Intelligence Report'}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {todayNY}
                </span>
                {processorInfo?.qaScore && (
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    QA: {processorInfo.qaScore}/100
                  </span>
                )}
              </div>
            </div>

            {/* Warning if already published today */}
            {isAlreadyPublished && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium text-sm">Already published today</p>
                    <p className="text-yellow-400/70 text-xs mt-1">
                      Publishing again will replace the existing report for {todayNY}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-300 text-sm">
                This will make the report visible to all <strong>War Zone</strong> subscribers immediately.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-800 bg-[#080812]">
            <button
              onClick={() => setShowPublishModal(false)}
              className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={publishDailyReport}
              disabled={isPublishing}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isPublishing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isPublishing ? 'Publishing...' : isAlreadyPublished ? 'Replace & Publish' : 'Publish Now'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // ADMIN VIEW TOGGLE COMPONENT
  // ============================================
  const AdminViewToggle = () => (
    <div className="fixed top-28 right-4 z-50 flex items-center gap-1 p-1 rounded-xl bg-black/90 backdrop-blur-sm border border-purple-500/40 shadow-xl">
      <button
        onClick={() => setAdminViewMode('landing')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          adminViewMode === 'landing'
            ? "bg-orange-500 text-white shadow-md"
            : "text-gray-400 hover:text-white hover:bg-white/10"
        }`}
      >
        🚫 Landing
      </button>
      <button
        onClick={() => setAdminViewMode('subscriber')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          adminViewMode === 'subscriber'
            ? "bg-green-500 text-white shadow-md"
            : "text-gray-400 hover:text-white hover:bg-white/10"
        }`}
      >
        ✅ Subscriber
      </button>
      <button
        onClick={() => setAdminViewMode('admin')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          adminViewMode === 'admin'
            ? "bg-purple-500 text-white shadow-md"
            : "text-gray-400 hover:text-white hover:bg-white/10"
        }`}
      >
        ⚙️ Admin
      </button>
    </div>
  );

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

  // ============================================
  // RENDER BASED ON VIEW MODE
  // ============================================
 // Landing Preview - Show WarZone landing page
  if (adminViewMode === 'landing') {
    return (
      <>
        <AdminViewToggle />
        <Suspense fallback={<div className="min-h-screen bg-[#0a0806] flex items-center justify-center"><Loader2 className="w-14 h-14 animate-spin text-[#C9A646]" /></div>}>
          <WarZoneLandingSimple previewMode="landing" />
        </Suspense>
      </>
    );
  }
  
  // Subscriber Preview - Show WarZone with active subscription
  if (adminViewMode === 'subscriber') {
    return (
      <>
        <AdminViewToggle />
        <Suspense fallback={<div className="min-h-screen bg-[#0a0806] flex items-center justify-center"><Loader2 className="w-14 h-14 animate-spin text-[#C9A646]" /></div>}>
          <WarZoneLandingSimple previewMode="subscriber" />
        </Suspense>
      </>
    );
  }

  // Admin View - Original admin panel
  return (
  <div className="p-6 space-y-6 min-h-screen bg-[#080812]">
      {/* Admin View Toggle - Fixed position */}
      <AdminViewToggle />
      
      {/* Publish Modal */}
      <PublishModal />

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* Report Viewer Modal */}
      {showReportViewer && fullReport && preview && (
        <ReportViewerModal
          report={fullReport}
          subject={preview?.subject || 'Finotaur Intelligence Report'}
          processorInfo={processorInfo}
          generatedAt={preview?.generatedAt || new Date().toISOString()}
          hasPdf={true}
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
<p className="text-gray-600 mt-1 ml-14">Powered by 25 AI Agents (v29 - 6 Phase System)</p>
          
          {lastPublishedDate && (
            <div className="mt-2 ml-14 flex items-center gap-2">
              <div className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 bg-green-500/20 text-green-400 border border-green-500/30">
                <CheckCircle className="w-3 h-3" />
                <span>Last published: {lastPublishedDate}</span>
              </div>
            </div>
          )}          
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
              {preview && (
                <div className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 bg-red-500/20 text-red-400 border border-red-500/30">
                  <FileDown className="w-3 h-3" />
                  <span>PDF Ready</span>
                </div>
              )}
            </div>
          )}
        </div>

{/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Admin View Toggle */}
          <AdminViewToggle />
          
          {/* PUBLISH Button - NEW! */}
          {preview && fullReport && (
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 transition-all text-green-400 hover:text-green-300 text-sm font-medium"
            >
              <Send className="w-4 h-4" />
              <span>PUBLISH</span>
            </button>
          )}

          {/* PDF Download Button */}
          {preview && (
            <button
              onClick={downloadPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 transition-all text-red-400 hover:text-red-300 text-sm font-medium"
            >
              <FileDown className="w-4 h-4" />
              <span>PDF</span>
            </button>
          )}
          
          {/* MAIN PREVIEW BUTTON */}
          <button
            onClick={() => {
              if (fullReport && preview) {
                setShowReportViewer(true);
              } else {
                generatePreview();
              }
            }}
            disabled={isGeneratingPreview}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C9A646]/20 hover:bg-[#C9A646]/30 border border-[#C9A646]/50 transition-all text-[#C9A646] hover:text-[#d4af4f] disabled:opacity-50 text-sm font-medium"
          >
            {isGeneratingPreview ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{workflowProgress?.progress || 0}%</span>
              </>
            ) : fullReport && preview ? (
              <>
                <Eye className="w-4 h-4" />
                <span>View Report</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Agent Progress */}
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

      {/* Report Preview Status (simplified) */}
      {preview && (
        <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-white font-medium">{preview.subject}</p>
                <GenerationTimeDisplay generatedAt={preview.generatedAt} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReportViewer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A646]/20 hover:bg-[#C9A646]/30 border border-[#C9A646]/30 text-[#C9A646] text-sm font-medium transition-colors"
              >
                <FileText className="w-4 h-4" />
                View Report
              </button>
              <button
                onClick={downloadPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm font-medium transition-colors"
              >
                <FileDown className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={generatePreview}
                disabled={isGeneratingPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
              <button
                onClick={clearPreview}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
  );
};

export default NewsletterSub;