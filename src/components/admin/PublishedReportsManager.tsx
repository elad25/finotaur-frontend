// =====================================================
// PUBLISHED REPORTS MANAGER - Admin Component v2.0
// =====================================================
// Place in: src/components/admin/PublishedReportsManager.tsx
//
// Features:
// - Same visual style as TopSecretDashboard (user view)
// - Admin stats section at top (subscribers info)
// - Reports grouped by month with expand/collapse
// - LIVE/TEST visibility badges
// - Promote to Live functionality
// - PDF download
// - Edit/Delete capabilities
// =====================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  TrendingUp,
  Building2,
  Bitcoin,
  Calendar,
  Users,
  Crown,
  Star,
  Pin,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Mail,
  MailCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  X,
  Check,
  Download,
  Sparkles,
  Shield,
  Zap,
  Archive,
  FolderOpen,
  Activity,
  UserCheck,
  UserX,
  CalendarDays,
  FlaskConical,
  Globe,
  ThumbsUp,
  Bookmark,
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================

interface PublishedReport {
  id: string;
  report_type: 'ism' | 'company' | 'crypto' | 'weekly';
  original_report_id: string;
  title: string;
  subtitle?: string;
  highlights?: string[];
  key_metric_label?: string;
  key_metric_value?: string;
  key_insights_count?: number;
  qa_score?: number;
  pdf_url?: string;
  pdf_storage_path?: string;
  ticker?: string;
  company_name?: string;
  sector?: string;
  report_month?: string;
  pmi_value?: number;
  market_regime?: string;
  is_featured: boolean;
  is_pinned: boolean;
  target_group: 'all' | 'top_secret' | 'newsletter' | 'trading_journal' | 'premium' | 'basic';
  visibility?: 'test' | 'live';
  published_at: string;
  published_by?: string;
  admin_note?: string;
  email_sent: boolean;
  email_sent_at?: string;
  email_recipient_count?: number;
  created_at: string;
  updated_at: string;
  publisher_email?: string;
  publisher_name?: string;
}

interface AdminStats {
  totalSubscribers: number;
  activeSubscribers: number;
  monthlySubscribers: number;
  yearlySubscribers: number;
  trialUsers: number;
  cancelledUsers: number;
}

interface TopSecretStats {
  // Summary
  totalActive: number;
  totalTrial: number;
  totalPaid: number;
  totalCancelled: number;
  pendingCancellation: number;
  
  // Monthly breakdown
  monthlyTotal: number;
  monthlyTrial: number;
  monthlyPaid: number;
  
  // Yearly breakdown
  yearlyTotal: number;
  yearlyPaid: number;
  
  // Journey/Retention
  month1Users: number;
  month2Users: number;
  month3PlusUsers: number;
  
  // Revenue
  mrr: number;
}

interface ReportStats {
  total: number;
  liveCount: number;
  testCount: number;
  byType: {
    ism: number;
    company: number;
    crypto: number;
    weekly: number;
  };
  featuredCount: number;
  thisMonth: number;
}

interface GroupedReports {
  [monthKey: string]: PublishedReport[];
}

// ============================================
// CONSTANTS
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

const REPORT_TYPE_CONFIG = {
  ism: {
    name: 'Macro Report',
    shortName: 'Macro',
    icon: TrendingUp,
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
  },
  company: {
    name: 'Company Analysis',
    shortName: 'Company',
    icon: Building2,
    gradient: 'from-purple-500 to-violet-600',
    bgGradient: 'from-purple-500/20 to-violet-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
  },
  crypto: {
    name: 'Crypto Report',
    shortName: 'Crypto',
    icon: Bitcoin,
    gradient: 'from-cyan-500 to-blue-600',
    bgGradient: 'from-cyan-500/20 to-blue-500/10',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
  },
  weekly: {
    name: 'Weekly Report',
    shortName: 'Weekly',
    icon: CalendarDays,
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(date, 'MMMM yyyy');
}

function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

// ============================================
// PDF DOWNLOAD HELPER
// ============================================

async function downloadReportPdf(report: PublishedReport): Promise<boolean> {
  try {
    const config = REPORT_TYPE_CONFIG[report.report_type];
    if (!config) return false;
    
    const typeLabel = config.shortName;
    const dateStr = format(new Date(report.published_at), 'yyyy-MM-dd');
    const titleSlug = (report.ticker || report.title || 'Report')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
    const filename = `Finotaur_${typeLabel}_${titleSlug}_${dateStr}.pdf`;
    
    const downloadFromUrl = async (url: string): Promise<boolean> => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        if (blob.size < 1000) throw new Error('Invalid PDF file');
        
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        return true;
      } catch {
        return false;
      }
    };

    // Try API path first
    if (report.pdf_url?.startsWith('/api/')) {
      const fullApiUrl = `${API_BASE_URL}${report.pdf_url}`;
      if (await downloadFromUrl(fullApiUrl)) return true;
    }

    // Try direct Supabase URL
    if (report.pdf_url && report.pdf_url.includes('supabase.co')) {
      if (await downloadFromUrl(report.pdf_url)) return true;
    }
    
    // Try storage path with signed URL
    if (report.pdf_storage_path) {
      const { data } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.pdf_storage_path, 300);
      
      if (data?.signedUrl && await downloadFromUrl(data.signedUrl)) return true;
    }

    throw new Error('PDF not available');
  } catch (error) {
    console.error('[PDF] Download error:', error);
    return false;
  }
}

// ============================================
// ADMIN STATS SECTION
// ============================================

interface AdminStatsSectionProps {
  stats: AdminStats;
  isLoading: boolean;
}

const AdminStatsSection: React.FC<AdminStatsSectionProps> = ({ stats, isLoading }) => {
  const statCards = [
    {
      title: 'Active Subscribers',
      value: stats.activeSubscribers,
      icon: UserCheck,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      valueColor: 'text-emerald-400',
    },
    {
      title: 'Monthly Plans',
      value: stats.monthlySubscribers,
      icon: Calendar,
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      valueColor: 'text-blue-400',
    },
    {
      title: 'Yearly Plans',
      value: stats.yearlySubscribers,
      icon: Crown,
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      valueColor: 'text-amber-400',
    },
    {
      title: 'Trial Users',
      value: stats.trialUsers,
      icon: Clock,
      iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
      valueColor: 'text-purple-400',
    },
    {
      title: 'Cancelled',
      value: stats.cancelledUsers,
      icon: UserX,
      iconBg: 'bg-gradient-to-br from-red-500 to-rose-600',
      valueColor: 'text-red-400',
    },
    {
      title: 'Total Subscribers',
      value: stats.totalSubscribers,
      icon: Users,
      iconBg: 'bg-gradient-to-br from-[#C9A646] to-orange-500',
      valueColor: 'text-[#C9A646]',
    },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#0d0d18] to-[#080812] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#C9A646]/20 to-orange-500/10 border border-[#C9A646]/30">
          <Users className="w-5 h-5 text-[#C9A646]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Subscriber Statistics</h3>
          <p className="text-xs text-gray-500">Top Secret subscription overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-black/30 rounded-xl p-4 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon className="w-4.5 h-4.5 text-white" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-8 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            ) : (
              <p className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{card.title}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// TOP SECRET STATS SECTION
// ============================================

interface TopSecretStatsSectionProps {
  stats: TopSecretStats;
  isLoading: boolean;
}

const TopSecretStatsSection: React.FC<TopSecretStatsSectionProps> = ({ stats, isLoading }) => {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#0d0d18] to-[#080812] p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Top Secret Statistics</h3>
          <p className="text-xs text-gray-500">Detailed subscription breakdown</p>
        </div>
        {stats.mrr > 0 && (
          <div className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-sm font-bold text-emerald-400">
              MRR: ${stats.mrr.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-black/30 rounded-xl p-4 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-gray-500">Active Total</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{stats.totalActive}</p>
            </div>
            
            <div className="bg-black/30 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-500">In Trial</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{stats.totalTrial}</p>
            </div>
            
            <div className="bg-black/30 rounded-xl p-4 border border-[#C9A646]/20">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-[#C9A646]" />
                <span className="text-xs text-gray-500">Paid</span>
              </div>
              <p className="text-2xl font-bold text-[#C9A646]">{stats.totalPaid}</p>
            </div>
            
            <div className="bg-black/30 rounded-xl p-4 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-gray-500">Cancelled</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{stats.totalCancelled}</p>
            </div>
            
            <div className="bg-black/30 rounded-xl p-4 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-500">Pending Cancel</span>
              </div>
              <p className="text-2xl font-bold text-orange-400">{stats.pendingCancellation}</p>
            </div>
          </div>

          {/* Monthly vs Yearly Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Plan */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl p-5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h4 className="text-base font-semibold text-white">Monthly Plan</h4>
                <span className="ml-auto text-lg font-bold text-blue-400">{stats.monthlyTotal}</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">Trial (14 days)</span>
                  </div>
                  <span className="text-lg font-bold text-purple-400">{stats.monthlyTrial}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-gray-400">Paid ($70/mo)</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">{stats.monthlyPaid}</span>
                </div>
              </div>
            </div>

            {/* Yearly Plan */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-xl p-5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-amber-400" />
                <h4 className="text-base font-semibold text-white">Yearly Plan</h4>
                <span className="ml-auto text-lg font-bold text-amber-400">{stats.yearlyTotal}</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-[#C9A646] fill-current" />
                    <span className="text-sm text-gray-400">Paid ($500/yr)</span>
                  </div>
                  <span className="text-lg font-bold text-[#C9A646]">{stats.yearlyPaid}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg opacity-50">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">No trial for yearly</span>
                  </div>
                  <span className="text-lg font-bold text-gray-500">—</span>
                </div>
              </div>
            </div>
          </div>

          {/* Retention Journey */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-xl p-5 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h4 className="text-base font-semibold text-white">Retention Journey</h4>
              <span className="text-xs text-gray-500 ml-2">(Paid subscribers only)</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 bg-black/30 rounded-xl border border-emerald-500/10">
                <p className="text-xs text-gray-500 mb-1">Month 1</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.month1Users}</p>
                <p className="text-[10px] text-gray-600 mt-1">0-30 days</p>
              </div>
              
              <div className="text-center p-4 bg-black/30 rounded-xl border border-cyan-500/10">
                <p className="text-xs text-gray-500 mb-1">Month 2</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.month2Users}</p>
                <p className="text-[10px] text-gray-600 mt-1">30-60 days</p>
              </div>
              
              <div className="text-center p-4 bg-black/30 rounded-xl border border-[#C9A646]/10">
                <p className="text-xs text-gray-500 mb-1">Month 3+</p>
                <p className="text-2xl font-bold text-[#C9A646]">{stats.month3PlusUsers}</p>
                <p className="text-[10px] text-gray-600 mt-1">60+ days</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// ============================================
// REPORT STATS SECTION
// ============================================

interface ReportStatsSectionProps {
  stats: ReportStats;
}

const ReportStatsSection: React.FC<ReportStatsSectionProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <div className="bg-[#0d0d18] rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-[#C9A646]" />
          <span className="text-xs text-gray-500">Total</span>
        </div>
        <p className="text-2xl font-bold text-white">{stats.total}</p>
      </div>
      
      <div className="bg-[#0d0d18] rounded-xl p-4 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-gray-500">Live</span>
        </div>
        <p className="text-2xl font-bold text-emerald-400">{stats.liveCount}</p>
      </div>
      
      <div className="bg-[#0d0d18] rounded-xl p-4 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-gray-500">Test</span>
        </div>
        <p className="text-2xl font-bold text-purple-400">{stats.testCount}</p>
      </div>
      
      <div className="bg-[#0d0d18] rounded-xl p-4 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-gray-500">Macro</span>
        </div>
        <p className="text-2xl font-bold text-amber-400">{stats.byType.ism}</p>
      </div>
      
      <div className="bg-[#0d0d18] rounded-xl p-4 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-gray-500">Company</span>
        </div>
        <p className="text-2xl font-bold text-purple-400">{stats.byType.company}</p>
      </div>
      
      <div className="bg-[#0d0d18] rounded-xl p-4 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Bitcoin className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-gray-500">Crypto</span>
        </div>
        <p className="text-2xl font-bold text-cyan-400">{stats.byType.crypto}</p>
      </div>
      
      <div className="bg-[#0d0d18] rounded-xl p-4 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-gray-500">Weekly</span>
        </div>
        <p className="text-2xl font-bold text-emerald-400">{stats.byType.weekly}</p>
      </div>
    </div>
  );
};

// ============================================
// VISIBILITY TOGGLE (LIVE/TEST)
// ============================================

interface VisibilityToggleProps {
  showLive: boolean;
  showTest: boolean;
  onToggleLive: () => void;
  onToggleTest: () => void;
  liveCount: number;
  testCount: number;
}

const VisibilityToggle: React.FC<VisibilityToggleProps> = ({
  showLive,
  showTest,
  onToggleLive,
  onToggleTest,
  liveCount,
  testCount,
}) => {
  return (
    <div className="flex items-center gap-2 bg-[#0d0d18] rounded-xl p-1.5 border border-white/10">
      <button
        onClick={onToggleLive}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          showLive
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Globe className="w-4 h-4" />
        <span>Live</span>
        <span className={`px-1.5 py-0.5 rounded text-xs ${
          showLive ? 'bg-emerald-500/30' : 'bg-gray-800'
        }`}>
          {liveCount}
        </span>
      </button>
      
      <button
        onClick={onToggleTest}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          showTest
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <FlaskConical className="w-4 h-4" />
        <span>Test</span>
        <span className={`px-1.5 py-0.5 rounded text-xs ${
          showTest ? 'bg-purple-500/30' : 'bg-gray-800'
        }`}>
          {testCount}
        </span>
      </button>
    </div>
  );
};

// ============================================
// COMPACT REPORT CARD (Latest Reports Grid)
// ============================================

interface CompactReportCardProps {
  report: PublishedReport;
  onDownload: (report: PublishedReport) => void;
  onEdit: (report: PublishedReport) => void;
  onPromote?: (report: PublishedReport) => void;
  isDownloading: boolean;
  isPromoting: boolean;
}

const CompactReportCard: React.FC<CompactReportCardProps> = ({
  report,
  onDownload,
  onEdit,
  onPromote,
  isDownloading,
  isPromoting,
}) => {
  const config = REPORT_TYPE_CONFIG[report.report_type];
  if (!config) return null;
  
  const Icon = config.icon;
  const isTest = report.visibility === 'test';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`relative rounded-xl border ${config.borderColor} bg-gradient-to-br ${config.bgGradient} p-5 flex flex-col min-h-[280px]`}
    >
      {/* Visibility Badge */}
      {isTest ? (
        <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold z-10 flex items-center gap-1">
          <FlaskConical className="w-3 h-3" />
          TEST
        </div>
      ) : (
        <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold z-10 flex items-center gap-1">
          <Globe className="w-3 h-3" />
          LIVE
        </div>
      )}
      
      {report.is_featured && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" />
          FEATURED
        </div>
      )}
      
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-9 h-9 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white truncate block">{config.shortName}</span>
          <span className="text-xs text-gray-500">{format(new Date(report.published_at), 'MMM d, yyyy')}</span>
        </div>
      </div>

      <div className="flex-1 mb-4">
        <h3 className={`text-base font-semibold ${config.textColor} mb-3 line-clamp-2`}>
          {report.subtitle || report.title}
        </h3>
        
        {report.report_type === 'company' && report.ticker && (
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/30 border border-white/10">
            <span className="text-base font-bold text-white">{report.ticker}</span>
          </div>
        )}
        
        {report.qa_score && (
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
            <Shield className="w-3 h-3" />
            <span>QA: {report.qa_score}%</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {/* Promote Button - Only for TEST reports */}
        {isTest && onPromote && (
          <button
            onClick={(e) => { e.stopPropagation(); onPromote(report); }}
            disabled={isPromoting}
            className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 
              flex items-center justify-center gap-2 text-sm font-semibold text-white 
              hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isPromoting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Promoting...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Promote to LIVE
              </>
            )}
          </button>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(report); }}
            disabled={isDownloading}
            className={`flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r ${config.gradient} 
              flex items-center justify-center gap-2 text-sm font-semibold text-white 
              hover:opacity-90 transition-all ${isDownloading ? 'opacity-50' : ''}`}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            PDF
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(report); }}
            className="p-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
          >
            <Edit className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// ARCHIVE REPORT ROW
// ============================================

interface ArchiveReportRowProps {
  report: PublishedReport;
  onDownload: (report: PublishedReport) => void;
  onEdit: (report: PublishedReport) => void;
  onDelete: (report: PublishedReport) => void;
  onPromote?: (report: PublishedReport) => void;
  isDownloading: boolean;
  isPromoting: boolean;
}

const ArchiveReportRow: React.FC<ArchiveReportRowProps> = ({
  report,
  onDownload,
  onEdit,
  onDelete,
  onPromote,
  isDownloading,
  isPromoting,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const config = REPORT_TYPE_CONFIG[report.report_type];
  if (!config) return null;
  
  const Icon = config.icon;
  const isTest = report.visibility === 'test';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 
        hover:bg-white/10 hover:border-white/10 transition-all group relative`}
    >
      {/* Visibility Badge */}
      {isTest ? (
        <div className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-purple-500 text-white text-[9px] font-bold z-10">
          TEST
        </div>
      ) : (
        <div className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold z-10">
          LIVE
        </div>
      )}

      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Title & Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.textColor}`}>{config.shortName}</span>
          <span className="text-gray-600">•</span>
          <span className="text-sm text-white truncate">{report.title}</span>
          {report.ticker && (
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-xs text-gray-400">
              {report.ticker}
            </span>
          )}
          {report.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-400" />}
          {report.is_featured && <Star className="w-3.5 h-3.5 text-[#C9A646] fill-current" />}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
          <span>{format(new Date(report.published_at), 'MMM d, yyyy HH:mm')}</span>
          {report.qa_score && (
            <span className="flex items-center gap-1 text-emerald-500">
              <Shield className="w-3 h-3" />
              {report.qa_score}%
            </span>
          )}
          {report.email_sent && (
            <span className="flex items-center gap-1 text-blue-400">
              <MailCheck className="w-3 h-3" />
              {report.email_recipient_count || 0}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
        {/* Promote Button - Only for TEST */}
        {isTest && onPromote && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onPromote(report); }}
            disabled={isPromoting}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all
              ${isPromoting 
                ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed' 
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
          >
            {isPromoting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>{isPromoting ? 'Promoting...' : 'Go Live'}</span>
          </motion.button>
        )}
        
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(report); }}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(report); setShowDeleteConfirm(false); }}
              className="p-1.5 rounded bg-red-600 hover:bg-red-700 text-white"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
              className="p-1.5 rounded border border-gray-700 hover:bg-gray-800 text-gray-400"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onDownload(report); }}
          disabled={isDownloading}
          className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.gradient} 
            flex items-center gap-1.5 text-xs font-medium text-white 
            hover:opacity-90 transition-all ${isDownloading ? 'opacity-50' : ''}`}
        >
          {isDownloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileDown className="w-3.5 h-3.5" />
          )}
          <span>PDF</span>
        </button>
      </div>
    </motion.div>
  );
};

// ============================================
// MONTH GROUP COMPONENT
// ============================================

interface MonthGroupProps {
  monthKey: string;
  reports: PublishedReport[];
  isExpanded: boolean;
  onToggle: () => void;
  onDownload: (report: PublishedReport) => void;
  onEdit: (report: PublishedReport) => void;
  onDelete: (report: PublishedReport) => void;
  onPromote?: (report: PublishedReport) => void;
  downloadingReportId: string | null;
  promotingReportId: string | null;
}

const MonthGroup: React.FC<MonthGroupProps> = ({
  monthKey,
  reports,
  isExpanded,
  onToggle,
  onDownload,
  onEdit,
  onDelete,
  onPromote,
  downloadingReportId,
  promotingReportId,
}) => {
  const reportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let liveCount = 0;
    let testCount = 0;
    reports.forEach(r => {
      counts[r.report_type] = (counts[r.report_type] || 0) + 1;
      if (r.visibility === 'test') testCount++;
      else liveCount++;
    });
    return { counts, liveCount, testCount };
  }, [reports]);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 
            border border-amber-500/30 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-white">{formatMonthLabel(monthKey)}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{reports.length} reports</span>
              <span>•</span>
              <span className="text-emerald-400">{reportCounts.liveCount} live</span>
              {reportCounts.testCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-purple-400">{reportCounts.testCount} test</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Type badges */}
          <div className="hidden sm:flex items-center gap-1.5">
            {Object.entries(reportCounts.counts).map(([type, count]) => {
              const config = REPORT_TYPE_CONFIG[type as keyof typeof REPORT_TYPE_CONFIG];
              if (!config) return null;
              return (
                <span 
                  key={type}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.textColor} bg-white/5`}
                >
                  {count} {config.shortName}
                </span>
              );
            })}
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </motion.div>
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 bg-black/20">
              {reports.map((report) => (
                <ArchiveReportRow
                  key={report.id}
                  report={report}
                  onDownload={onDownload}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPromote={onPromote}
                  isDownloading={downloadingReportId === report.id}
                  isPromoting={promotingReportId === report.id}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// EDIT MODAL COMPONENT
// ============================================

interface EditModalProps {
  report: PublishedReport;
  onClose: () => void;
  onSave: (updates: Partial<PublishedReport>) => Promise<void>;
}

const EditModal: React.FC<EditModalProps> = ({ report, onClose, onSave }) => {
  const [isFeatured, setIsFeatured] = useState(report.is_featured);
  const [isPinned, setIsPinned] = useState(report.is_pinned);
  const [targetGroup, setTargetGroup] = useState(report.target_group);
  const [visibility, setVisibility] = useState(report.visibility || 'live');
  const [adminNote, setAdminNote] = useState(report.admin_note || '');
  const [isSaving, setIsSaving] = useState(false);

  const config = REPORT_TYPE_CONFIG[report.report_type];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        is_featured: isFeatured,
        is_pinned: isPinned,
        target_group: targetGroup,
        visibility: visibility as 'test' | 'live',
        admin_note: adminNote || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0a0a12] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-800 bg-gradient-to-r ${config?.gradient || 'from-gray-600 to-gray-700'}`}>
          <h2 className="text-lg font-semibold text-white">Edit Published Report</h2>
          <p className="text-sm text-white/70">{report.title}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Visibility Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Visibility</label>
            <div className="flex gap-3">
              <button
                onClick={() => setVisibility('live')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  visibility === 'live'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-[#080812] border-gray-700 text-gray-500 hover:text-gray-300'
                }`}
              >
                <Globe className="w-5 h-5" />
                <span className="font-medium">Live</span>
              </button>
              <button
                onClick={() => setVisibility('test')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  visibility === 'test'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                    : 'bg-[#080812] border-gray-700 text-gray-500 hover:text-gray-300'
                }`}
              >
                <FlaskConical className="w-5 h-5" />
                <span className="font-medium">Test</span>
              </button>
            </div>
          </div>

          {/* Target Group */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Target Audience</label>
            <select
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value as any)}
              className="w-full px-4 py-3 bg-[#080812] border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30"
            >
              <option value="all">All Users</option>
              <option value="top_secret">Top Secret Subscribers</option>
              <option value="newsletter">Newsletter Subscribers</option>
              <option value="trading_journal">Trading Journal Users</option>
              <option value="premium">Premium Journal Only</option>
              <option value="basic">Basic Journal Only</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-[#080812]">
              <div className="flex items-center gap-3">
                <Star className={`w-5 h-5 ${isFeatured ? 'text-[#C9A646] fill-current' : 'text-gray-500'}`} />
                <div>
                  <p className="text-white font-medium">Featured Report</p>
                  <p className="text-xs text-gray-500">Highlight in dashboard</p>
                </div>
              </div>
              <button
                onClick={() => setIsFeatured(!isFeatured)}
                className={`relative w-12 h-6 rounded-full transition-all ${isFeatured ? 'bg-[#C9A646]' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${isFeatured ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-[#080812]">
              <div className="flex items-center gap-3">
                <Pin className={`w-5 h-5 ${isPinned ? 'text-amber-400' : 'text-gray-500'}`} />
                <div>
                  <p className="text-white font-medium">Pin to Top</p>
                  <p className="text-xs text-gray-500">Keep at top of list</p>
                </div>
              </div>
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`relative w-12 h-6 rounded-full transition-all ${isPinned ? 'bg-amber-500' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${isPinned ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Admin Note */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Admin Note</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Internal note..."
              rows={3}
              className="w-full px-4 py-3 bg-[#080812] border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 bg-[#080812]">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${config?.gradient || 'from-[#C9A646] to-orange-500'} text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SEARCH & FILTER BAR
// ============================================

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
}

const SearchFilterBar: React.FC<SearchBarProps> = ({ value, onChange, typeFilter, onTypeChange }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by ticker, title, company..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 
            text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
        />
        {value && (
          <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
        {['All', 'Macro', 'Company', 'Crypto', 'Weekly'].map((tab) => (
          <button
            key={tab}
            onClick={() => onTypeChange(tab.toLowerCase() === 'macro' ? 'ism' : tab.toLowerCase())}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              (typeFilter === 'all' && tab === 'All') || 
              typeFilter === (tab.toLowerCase() === 'macro' ? 'ism' : tab.toLowerCase())
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

interface PublishedReportsManagerProps {
  className?: string;
}

const PublishedReportsManager: React.FC<PublishedReportsManagerProps> = ({ className }) => {
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showLive, setShowLive] = useState(true);
  const [showTest, setShowTest] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [editingReport, setEditingReport] = useState<PublishedReport | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [promotingReportId, setPromotingReportId] = useState<string | null>(null);

  // Fetch admin stats (general)
  const { data: adminStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-subscriber-stats'],
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await supabase.rpc('get_top_secret_stats');
      if (error) throw error;
      const row = data?.[0] || {};
      return {
        totalSubscribers: Number(row.total_subscribers) || 0,
        activeSubscribers: Number(row.active_subscribers) || 0,
        monthlySubscribers: Number(row.monthly_subscribers) || 0,
        yearlySubscribers: Number(row.yearly_subscribers) || 0,
        trialUsers: Number(row.trial_users) || 0,
        cancelledUsers: Number(row.cancelled_users) || 0,
      };
    },
  });

  // Fetch Top Secret detailed stats
  const { data: topSecretStats, isLoading: topSecretLoading } = useQuery({
    queryKey: ['top-secret-detailed-stats'],
    queryFn: async (): Promise<TopSecretStats> => {
      const { data, error } = await supabase.rpc('get_comprehensive_subscription_stats');
      if (error) throw error;
      
      const ts = data?.top_secret || {};
      const revenue = data?.revenue || {};
      
      return {
        // Summary
        totalActive: Number(ts.total_subscribers) || 0,
        totalTrial: Number(ts.monthly?.in_trial) || 0,
        totalPaid: (Number(ts.monthly?.paid) || 0) + (Number(ts.yearly?.paid) || 0),
        totalCancelled: Number(ts.cancelled) || 0,
        pendingCancellation: Number(ts.pending_cancellation) || 0,
        
        // Monthly breakdown
        monthlyTotal: Number(ts.monthly?.total) || 0,
        monthlyTrial: Number(ts.monthly?.in_trial) || 0,
        monthlyPaid: Number(ts.monthly?.paid) || 0,
        
        // Yearly breakdown
        yearlyTotal: Number(ts.yearly?.total) || 0,
        yearlyPaid: Number(ts.yearly?.paid) || 0,
        
        // Journey/Retention
        month1Users: Number(ts.journey?.month_1) || 0,
        month2Users: Number(ts.journey?.month_2) || 0,
        month3PlusUsers: Number(ts.journey?.month_3_plus) || 0,
        
        // Revenue
        mrr: Number(revenue.top_secret_mrr) || 0,
      };
    },
  });

  // Fetch reports
  const { data: reports, isLoading: reportsLoading, error, refetch } = useQuery({
    queryKey: ['published-reports-admin'],
    queryFn: async (): Promise<PublishedReport[]> => {
      const { data, error } = await supabase
        .from('published_reports')
        .select('*')
        .in('report_type', ['ism', 'company', 'crypto', 'weekly'])
        .order('is_pinned', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate report stats
  const reportStats = useMemo((): ReportStats => {
    const allReports = reports || [];
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    return {
      total: allReports.length,
      liveCount: allReports.filter(r => r.visibility !== 'test').length,
      testCount: allReports.filter(r => r.visibility === 'test').length,
      byType: {
        ism: allReports.filter(r => r.report_type === 'ism').length,
        company: allReports.filter(r => r.report_type === 'company').length,
        crypto: allReports.filter(r => r.report_type === 'crypto').length,
        weekly: allReports.filter(r => r.report_type === 'weekly').length,
      },
      featuredCount: allReports.filter(r => r.is_featured).length,
      thisMonth: allReports.filter(r => new Date(r.published_at) >= thisMonth).length,
    };
  }, [reports]);

  // Filter reports
  const filteredReports = useMemo(() => {
    let result = reports || [];

    // Visibility filter
    result = result.filter(r => {
      const isTest = r.visibility === 'test';
      if (isTest && !showTest) return false;
      if (!isTest && !showLive) return false;
      return true;
    });

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(r => r.report_type === typeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.subtitle?.toLowerCase().includes(query) ||
        r.ticker?.toLowerCase().includes(query) ||
        r.company_name?.toLowerCase().includes(query) ||
        r.admin_note?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [reports, showLive, showTest, typeFilter, searchQuery]);

  // Group by month
  const groupedReports = useMemo(() => {
    const groups: GroupedReports = {};
    filteredReports.forEach(report => {
      const monthKey = getMonthKey(new Date(report.published_at));
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(report);
    });
    return groups;
  }, [filteredReports]);

  const sortedMonthKeys = useMemo(() => {
    return Object.keys(groupedReports).sort((a, b) => b.localeCompare(a));
  }, [groupedReports]);

  // Latest reports (for top grid)
  const latestByType = useMemo(() => {
    const types: Array<'ism' | 'company' | 'crypto' | 'weekly'> = ['ism', 'company', 'crypto', 'weekly'];
    const result: PublishedReport[] = [];
    for (const type of types) {
      const latest = filteredReports.find(r => r.report_type === type);
      if (latest) result.push(latest);
    }
    return result;
  }, [filteredReports]);

  // Auto-expand current month on load
  useEffect(() => {
    const currentMonthKey = getMonthKey(new Date());
    setExpandedMonths(new Set([currentMonthKey]));
  }, []);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PublishedReport> }) => {
      const { error } = await supabase
        .from('published_reports')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report updated');
      queryClient.invalidateQueries({ queryKey: ['published-reports-admin'] });
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('published_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report deleted');
      queryClient.invalidateQueries({ queryKey: ['published-reports-admin'] });
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  // Handlers
  const toggleMonth = useCallback((monthKey: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) newSet.delete(monthKey);
      else newSet.add(monthKey);
      return newSet;
    });
  }, []);

  const expandAllMonths = useCallback(() => {
    const allMonths = new Set(filteredReports.map(r => getMonthKey(new Date(r.published_at))));
    setExpandedMonths(allMonths);
  }, [filteredReports]);

  const collapseAllMonths = useCallback(() => {
    setExpandedMonths(new Set());
  }, []);

  const handleDownload = useCallback(async (report: PublishedReport) => {
    setDownloadingReportId(report.id);
    const success = await downloadReportPdf(report);
    if (!success) toast.error('Failed to download PDF');
    else toast.success('PDF downloaded');
    setDownloadingReportId(null);
  }, []);

  const handleEdit = useCallback((report: PublishedReport) => {
    setEditingReport(report);
  }, []);

  const handleSaveEdit = useCallback(async (updates: Partial<PublishedReport>) => {
    if (!editingReport) return;
    await updateMutation.mutateAsync({ id: editingReport.id, updates });
    setEditingReport(null);
  }, [editingReport, updateMutation]);

  const handleDelete = useCallback((report: PublishedReport) => {
    deleteMutation.mutate(report.id);
  }, [deleteMutation]);

  const handlePromote = useCallback(async (report: PublishedReport) => {
    setPromotingReportId(report.id);
    try {
      await updateMutation.mutateAsync({
        id: report.id,
        updates: { visibility: 'live' },
      });
      toast.success(`${report.ticker || report.title} promoted to LIVE!`);
    } catch (err) {
      toast.error('Failed to promote');
    }
    setPromotingReportId(null);
  }, [updateMutation]);

  if (error) {
    return (
      <div className={`bg-[#0d0d18] rounded-xl p-8 border border-red-500/30 ${className}`}>
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-white font-medium mb-2">Failed to load reports</h3>
          <p className="text-gray-500 text-sm mb-4">{(error as Error).message}</p>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentMonth = format(new Date(), 'MMMM yyyy');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
            Published Reports Dashboard
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage all published reports • {currentMonth}
          </p>
        </div>
        
        <button
          onClick={() => refetch()}
          disabled={reportsLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 hover:bg-gray-800 transition-colors text-gray-400"
        >
          <RefreshCw className={`w-4 h-4 ${reportsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Admin Stats Section */}
      <AdminStatsSection 
        stats={adminStats || {
          totalSubscribers: 0,
          activeSubscribers: 0,
          monthlySubscribers: 0,
          yearlySubscribers: 0,
          trialUsers: 0,
          cancelledUsers: 0,
        }} 
        isLoading={statsLoading} 
      />

      {/* Top Secret Detailed Stats */}
      <TopSecretStatsSection
        stats={topSecretStats || {
          totalActive: 0,
          totalTrial: 0,
          totalPaid: 0,
          totalCancelled: 0,
          pendingCancellation: 0,
          monthlyTotal: 0,
          monthlyTrial: 0,
          monthlyPaid: 0,
          yearlyTotal: 0,
          yearlyPaid: 0,
          month1Users: 0,
          month2Users: 0,
          month3PlusUsers: 0,
          mrr: 0,
        }}
        isLoading={topSecretLoading}
      />

      {/* Report Stats */}
      <ReportStatsSection stats={reportStats} />

      {/* Visibility Toggle + Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <VisibilityToggle
          showLive={showLive}
          showTest={showTest}
          onToggleLive={() => setShowLive(!showLive)}
          onToggleTest={() => setShowTest(!showTest)}
          liveCount={reportStats.liveCount}
          testCount={reportStats.testCount}
        />
        
        <SearchFilterBar
          value={searchQuery}
          onChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
        />
      </div>

      {/* Latest Reports Grid */}
      {latestByType.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Latest Reports</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {latestByType.map((report) => (
              <CompactReportCard
                key={report.id}
                report={report}
                onDownload={handleDownload}
                onEdit={handleEdit}
                onPromote={report.visibility === 'test' ? handlePromote : undefined}
                isDownloading={downloadingReportId === report.id}
                isPromoting={promotingReportId === report.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Archive Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Reports Archive</h3>
            <span className="text-xs text-gray-500 ml-2">{filteredReports.length} reports</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAllMonths}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Expand All
            </button>
            <button
              onClick={collapseAllMonths}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Collapse All
            </button>
          </div>
        </div>

        {reportsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : sortedMonthKeys.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-white/10 rounded-xl">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No reports found</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mt-2 text-amber-400 text-sm hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMonthKeys.map((monthKey) => (
              <MonthGroup
                key={monthKey}
                monthKey={monthKey}
                reports={groupedReports[monthKey]}
                isExpanded={expandedMonths.has(monthKey)}
                onToggle={() => toggleMonth(monthKey)}
                onDownload={handleDownload}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPromote={handlePromote}
                downloadingReportId={downloadingReportId}
                promotingReportId={promotingReportId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingReport && (
        <EditModal
          report={editingReport}
          onClose={() => setEditingReport(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default PublishedReportsManager;