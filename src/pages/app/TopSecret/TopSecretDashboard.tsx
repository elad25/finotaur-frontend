// =====================================================
// TopSecretDashboard.tsx - FULL ARCHIVE VERSION v2.0
// =====================================================
// Features:
// 1. All historical reports accessible with PDF download
// 2. Reports grouped by month for easy browsing
// 3. Search functionality
// 4. Filter by report type
// 5. Load more pagination
// 6. Archive section with expandable months
// 7. ✅ API-based PDF generation (on-the-fly)
// =====================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
 import {
  FileText,
  TrendingUp,
  Bitcoin,
  Building2,
  Download,
  Eye,
  Clock,
  Sparkles,
  Bell,
  Settings,
  ExternalLink,
  Loader2,
  CalendarDays,
  MessageCircle,
  HelpCircle,
  Users,
  Wand2,
  Crown,
  Share2,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  MessageSquare,
  Bookmark,
  Flame,
  Target,
  Shield,
  Zap,
  X,
  Maximize2,
  Copy,
  Check,
  AlertCircle,
  FileDown,
  Archive,
  Calendar,
  Search,
  Filter,
  FolderOpen,
  ChevronUp,
  FlaskConical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, isSameMonth, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

// ========================================
// TYPES
// ========================================

interface SubscriptionInfo {
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  expiresAt: Date | null;
  isInTrial: boolean;
  trialEndsAt: Date | null;
}

 interface Report {
  id: string;
  type: 'macro' | 'company' | 'crypto' | 'weekly';
  title: string;
  subtitle?: string;
  date: Date;
  pdfUrl?: string;
  status: 'published' | 'upcoming' | 'generating';
  highlights?: string[];
  keyMetric?: string;
  keyMetricValue?: string;
  keyInsights?: number;
  qaScore?: number;
  commentsCount?: number;
  likesCount?: number;
  isFeatured?: boolean;
  isPinned?: boolean;
  ticker?: string;
  companyName?: string;
  sector?: string;
  reportMonth?: string;
  marketRegime?: string;
  markdownContent?: string;
  htmlContent?: string;
  pdfStoragePath?: string;
  originalReportId?: string;
  isLoadingContent?: boolean;
  visibility?: 'test' | 'live';
}

interface GroupedReports {
  [monthKey: string]: Report[];
}

interface TopSecretDashboardProps {
  userId?: string;
}

interface UserReportInteractions {
  likedReportIds: Set<string>;
  bookmarkedReportIds: Set<string>;
}

// ========================================
// CONSTANTS
// ========================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

const REPORT_TYPE_CONFIG = {
  macro: {
    name: 'Macro Report',
    shortName: 'Macro',
    icon: TrendingUp,
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    apiPath: 'ism', // ISM = Macro reports
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
    apiPath: 'company',
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
    apiPath: 'crypto',
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
    apiPath: 'weekly',
  },
};

const mapReportType = (dbType: string): 'macro' | 'company' | 'crypto' | 'weekly' | null => {
  if (dbType === 'ism') return 'macro';
  if (dbType === 'weekly') return 'weekly';
  if (dbType === 'company') return 'company';
  if (dbType === 'crypto') return 'crypto';
  // Unknown types (like 'daily') return null
  console.warn('[mapReportType] Unknown report type:', dbType);
  return null;
};

const mapReportTypeToDb = (type: string): string => {
  if (type === 'macro') return 'ism';
  return type;
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, 'MMM d, yyyy');
}

function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(date, 'MMMM yyyy');
}

// ========================================
// PDF DOWNLOAD HELPER - STORAGE BASED (v3.0)
// ========================================
// PDFs are downloaded directly from Supabase Storage
// Data comes from published_reports which has pdf_url and pdf_storage_path
// Storage paths (from published_reports):
//   - ISM/Macro: ism-reports/ism-report-{YYYY-MM}.pdf
//   - Company:   company_reports/{TICKER}_{uuid}.pdf
//   - Crypto:    crypto-reports/crypto-report-{date}.pdf
//   - Weekly:    weekly-reports/{YYYY}/{MM}/weekly-{date}-{timestamp}.pdf
// ========================================

async function downloadReportPdf(report: Report): Promise<boolean> {
  try {
    console.log('[PDF] Starting download for report:', report.id, 'type:', report.type);
    console.log('[PDF] Report details:', {
      pdfUrl: report.pdfUrl,
      pdfStoragePath: report.pdfStoragePath,
      ticker: report.ticker,
      reportMonth: report.reportMonth,
    });
    
    const config = REPORT_TYPE_CONFIG[report.type];
    if (!config) {
      console.error('[PDF] Unknown report type:', report.type);
      throw new Error(`Unknown report type: ${report.type}`);
    }
    
    // Generate filename for download
    const typeLabel = config.shortName;
    const dateStr = format(report.date, 'yyyy-MM-dd');
    const titleSlug = (report.ticker || report.title || 'Report')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
    const filename = `Finotaur_${typeLabel}_${titleSlug}_${dateStr}.pdf`;
    
    // Helper to download PDF from URL
    const downloadFromUrl = async (url: string, source: string): Promise<boolean> => {
      console.log(`[PDF] Trying ${source}:`, url);
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        
        if (blob.size < 1000) {
          console.error('[PDF] File too small:', blob.size, 'bytes');
          throw new Error('Invalid PDF file');
        }
        
        console.log('[PDF] ✅ Received blob:', blob.size, 'bytes');
        
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        console.log(`[PDF] ✅ Download initiated via ${source}: ${filename}`);
        return true;
      } catch (error) {
        console.error(`[PDF] ❌ Failed via ${source}:`, error);
        return false;
      }
    };

    // ===========================================
    // METHOD 1: API path (pdfUrl starting with /api/)
    // This calls the server to generate/return the PDF
    // ===========================================
    if (report.pdfUrl?.startsWith('/api/')) {
      console.log('[PDF] 🔗 Method 1: Using API path');
      const fullApiUrl = `${API_BASE_URL}${report.pdfUrl}`;
      const success = await downloadFromUrl(fullApiUrl, 'API endpoint');
      if (success) return true;
      console.log('[PDF] ⚠️ API endpoint failed, trying other methods...');
    }

    // ===========================================
    // METHOD 2: Direct Supabase URL (full URL from published_reports)
    // ===========================================
    if (report.pdfUrl && !report.pdfUrl.startsWith('/api/') && report.pdfUrl.includes('supabase.co')) {
      console.log('[PDF] 🔗 Method 2: Using direct Supabase URL');
      const success = await downloadFromUrl(report.pdfUrl, 'direct pdfUrl');
      if (success) return true;
    }
    
    // ===========================================
    // METHOD 2: pdfStoragePath with signed URL
    // ===========================================
    if (report.pdfStoragePath) {
      console.log('[PDF] 🔑 Method 2: Using pdfStoragePath with signed URL:', report.pdfStoragePath);
      
      try {
        const { data, error } = await supabase.storage
          .from('reports')
          .createSignedUrl(report.pdfStoragePath, 300); // 5 minutes
        
        if (data?.signedUrl) {
          const success = await downloadFromUrl(data.signedUrl, 'pdfStoragePath signed URL');
          if (success) return true;
        }
        
        console.warn('[PDF] ⚠️ Failed to create signed URL:', error?.message);
      } catch (err) {
        console.error('[PDF] ❌ Error creating signed URL:', err);
      }
    }
    // ===========================================
    // METHOD 3: Try constructed paths directly
    // (without using list() which may have permission issues)
    // ===========================================
    console.log('[PDF] 🔧 Method 3: Trying constructed paths...');
    
    const reportDate = new Date(report.date);
    const pathsToTry: string[] = [];
    
    if (report.type === 'crypto') {
      // Crypto: Try current date and up to 3 days back
      for (let daysBack = 0; daysBack <= 3; daysBack++) {
        const checkDate = new Date(reportDate);
        checkDate.setDate(checkDate.getDate() - daysBack);
        const checkDateStr = format(checkDate, 'yyyy-MM-dd');
        pathsToTry.push(`crypto-reports/crypto-report-${checkDateStr}.pdf`);
      }
    } else if (report.type === 'macro') {
      // ISM/Macro: ism-reports/ism-report-YYYY-MM.pdf
      const monthStr = report.reportMonth || format(reportDate, 'yyyy-MM');
      pathsToTry.push(`ism-reports/ism-report-${monthStr}.pdf`);
    } else if (report.type === 'company' && report.ticker) {
      // Company: company_reports/TICKER_uuid.pdf
      if (report.originalReportId) {
        pathsToTry.push(`company_reports/${report.ticker.toUpperCase()}_${report.originalReportId}.pdf`);
      }
    } else if (report.type === 'weekly') {
      // Weekly: weekly-reports/YYYY/MM/weekly-YYYY-MM-DD-timestamp.pdf
      // Without knowing the timestamp, we can't construct the exact path
      // Skip this - rely on pdfStoragePath or pdfUrl for weekly
      console.log('[PDF] ⚠️ Weekly reports require pdfStoragePath (timestamp unknown)');
    }
    
    // Try each constructed path
    for (const path of pathsToTry) {
      console.log(`[PDF] 🔧 Trying path:`, path);
      
      try {
        const { data, error } = await supabase.storage
          .from('reports')
          .createSignedUrl(path, 300);
        
        if (data?.signedUrl && !error) {
          const success = await downloadFromUrl(data.signedUrl, `constructed path: ${path}`);
          if (success) return true;
        } else {
          console.log(`[PDF] ⚠️ Path not available:`, path, error?.message);
        }
      } catch (err) {
        console.log(`[PDF] ⚠️ Error trying path:`, path);
      }
    }
    // ===========================================
    // ALL METHODS FAILED
    // ===========================================
    console.error('[PDF] ❌ ALL PDF DOWNLOAD METHODS FAILED');
    console.error('[PDF] Debug info:', {
      report_id: report.id,
      type: report.type,
      date: report.date,
      pdfUrl: report.pdfUrl,
      pdfStoragePath: report.pdfStoragePath,
      ticker: report.ticker,
      reportMonth: report.reportMonth,
      originalReportId: report.originalReportId,
    });
    
    throw new Error('PDF not available. Please try again later.');
    
  } catch (error) {
    console.error('[PDF] Download error:', error);
    return false;
  }
}

// ========================================
// SEARCH BAR COMPONENT
// ========================================

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function SearchBar({ value, onChange, placeholder = 'Search reports...' }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 
          text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50
          transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ========================================
// FILTER TABS COMPONENT
// ========================================

interface FilterTabsProps {
  selected: string;
  onChange: (value: string) => void;
}

function FilterTabs({ selected, onChange }: FilterTabsProps) {
  const tabs = ['All', 'Macro', 'Company', 'Crypto', 'Weekly'];

  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab.toLowerCase())}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            selected === tab.toLowerCase()
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ========================================
// COMPACT REPORT CARD COMPONENT
// ========================================

interface CompactReportCardProps {
  report: Report;
  onDownload: (report: Report) => void;
  isDownloading: boolean;
}

function CompactReportCard({ report, onDownload, isDownloading }: CompactReportCardProps) {
  const config = REPORT_TYPE_CONFIG[report.type];
  const Icon = config.icon;

  const getDisplaySubtitle = () => {
    if (report.type === 'company') {
      return report.ticker || report.subtitle || 'Deep-Dive Analysis';
    }
    return report.subtitle || report.title;
  };

  // v2.0: PDF is ALWAYS available via API (generated on-the-fly)
  // No need to check pdfStoragePath or pdfUrl anymore
  const canDownloadPdf = true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`relative rounded-xl border ${config.borderColor} bg-gradient-to-br ${config.bgGradient} p-5 flex flex-col min-h-[280px]`}
    >
      {report.visibility === 'test' && (
        <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold z-10">
          TEST
        </div>
      )}
      {report.isFeatured && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold">
          NEW
        </div>
      )}
      
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-9 h-9 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white truncate block">{config.shortName}</span>
          <span className="text-xs text-gray-500">{format(report.date, 'MMM d, yyyy')}</span>
        </div>
      </div>

      <div className="flex-1 mb-4">
        <h3 className={`text-base font-semibold ${config.textColor} mb-3 line-clamp-2`}>
          {getDisplaySubtitle()}
        </h3>
        
        {report.type === 'company' && report.ticker && (
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/30 border border-white/10">
            <span className="text-base font-bold text-white">{report.ticker}</span>
          </div>
        )}
        
        {report.qaScore && (
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
            <Shield className="w-3 h-3" />
            <span>QA: {report.qaScore}%</span>
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isDownloading) onDownload(report);
        }}
        disabled={isDownloading}
        className={`w-full py-2.5 px-4 rounded-lg bg-gradient-to-r ${config.gradient} 
          flex items-center justify-center gap-2 text-sm font-semibold text-white 
          hover:opacity-90 transition-all whitespace-nowrap
          ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            DOWNLOAD PDF
          </>
        )}
      </button>
    </motion.div>
  );
}

// ========================================
// ARCHIVE REPORT ROW COMPONENT
// ========================================

interface ArchiveReportRowProps {
  report: Report;
  onDownload: (report: Report) => void;
  isDownloading: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  onToggleLike: (reportId: string) => void;
  onToggleBookmark: (reportId: string) => void;
  // v2.3: Promote functionality
  isTester?: boolean;
  onPromoteToLive?: (report: Report) => void;
  isPromoting?: boolean;
}

function ArchiveReportRow({ 
  report, 
  onDownload,
  isDownloading,
  isLiked, 
  isBookmarked,
  onToggleLike,
  onToggleBookmark,
  // v2.3: New props for promote functionality
  isTester,
  onPromoteToLive,
  isPromoting,
}: ArchiveReportRowProps) {
  const config = REPORT_TYPE_CONFIG[report.type];
  const Icon = config.icon;
  
  // v2.0: PDF is ALWAYS available via API
  const canDownloadPdf = true;
  
  // v2.3: Can promote only if tester AND report is test visibility
  const canPromote = isTester && report.visibility === 'test';

  const getDisplayTitle = () => {
    if (report.type === 'company' && (report.companyName || report.ticker)) {
      return report.companyName || report.ticker;
    }
    return report.title;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 
        hover:bg-white/10 hover:border-white/10 transition-all group relative`}
    >
      {/* TEST Badge */}
      {report.visibility === 'test' && (
        <div className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-purple-500 text-white text-[9px] font-bold z-10">
          TEST
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
          <span className="text-sm text-white truncate">{getDisplayTitle()}</span>
          {report.ticker && report.type === 'company' && (
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-xs text-gray-400">
              {report.ticker}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
          <span>{format(report.date, 'MMM d, yyyy')}</span>
          {report.qaScore && (
            <span className="flex items-center gap-1 text-emerald-500">
              <Shield className="w-3 h-3" />
              {report.qaScore}%
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
        {/* v2.3: Promote to Live button - only for testers on test reports */}
        {canPromote && onPromoteToLive && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onPromoteToLive(report);
            }}
            disabled={isPromoting}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all
              ${isPromoting 
                ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed' 
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
            title="Promote to Live - Make visible to all users"
          >
            {isPromoting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>{isPromoting ? 'Promoting...' : 'Go Live'}</span>
          </motion.button>
        )}
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(report.id);
          }}
          className={`p-1.5 rounded-lg transition-all ${
            isLiked 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'text-gray-500 hover:text-amber-400 hover:bg-white/5'
          }`}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-amber-400' : ''}`} />
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(report.id);
          }}
          className={`p-1.5 rounded-lg transition-all ${
            isBookmarked 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'text-gray-500 hover:text-amber-400 hover:bg-white/5'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
        </motion.button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isDownloading) onDownload(report);
          }}
          disabled={isDownloading}
          className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.gradient} 
            flex items-center gap-1.5 text-xs font-medium text-white 
            hover:opacity-90 transition-all
            ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
}

// ========================================
// MONTH GROUP COMPONENT
// ========================================

interface MonthGroupProps {
  monthKey: string;
  reports: Report[];
  isExpanded: boolean;
  onToggle: () => void;
  onDownload: (report: Report) => void;
  downloadingReportId: string | null;
  userInteractions: UserReportInteractions;
  onToggleLike: (reportId: string) => void;
  onToggleBookmark: (reportId: string) => void;
  // v2.3: Promote functionality
  isTester?: boolean;
  onPromoteToLive?: (report: Report) => void;
  promotingReportId?: string | null;
}

function MonthGroup({ 
  monthKey, 
  reports, 
  isExpanded, 
  onToggle,
  onDownload,
  downloadingReportId,
  userInteractions,
  onToggleLike,
  onToggleBookmark,
  isTester,
  onPromoteToLive,
  promotingReportId,
}: MonthGroupProps) {
  const reportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [reports]);

  // v2.0: All reports have PDF available via API
  const pdfCount = reports.length;

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
              <span className="text-emerald-500">{pdfCount} PDFs available</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Type badges */}
<div className="hidden sm:flex items-center gap-1.5">
  {Object.entries(reportCounts).map(([type, count]) => {
    const config = REPORT_TYPE_CONFIG[type as keyof typeof REPORT_TYPE_CONFIG];
    // Skip unknown report types
    if (!config) {
      console.warn('[MonthGroup] Unknown report type:', type);
      return null;
    }
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
                  isDownloading={downloadingReportId === report.id}
                  isLiked={userInteractions.likedReportIds.has(report.id)}
                  isBookmarked={userInteractions.bookmarkedReportIds.has(report.id)}
                  onToggleLike={onToggleLike}
                  onToggleBookmark={onToggleBookmark}
                  isTester={isTester}
                  onPromoteToLive={onPromoteToLive}
                  isPromoting={promotingReportId === report.id}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ========================================
// HOW TO USE SECTION COMPONENT
// ========================================

function HowToUseSection() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-900/30 to-transparent p-5">
      <h3 className="text-base font-semibold text-amber-300 mb-4">
        How Top Secret Members Use These Reports.
      </h3>

      <ol className="space-y-3 text-sm text-gray-300 mb-4">
        <li className="flex gap-2">
          <span className="text-amber-400 font-semibold">1.</span>
          <span>Start with the Macro updates</span>
        </li>
        <li className="flex gap-2">
          <span className="text-amber-400 font-semibold">2.</span>
          <span>Use Company Deep Dive to build conviction</span>
        </li>
        <li className="flex gap-2">
          <span className="text-amber-400 font-semibold">3.</span>
          <span>Ignore daily noise — we filter it for you</span>
        </li>
      </ol>

      <p className="text-xs text-gray-500">
        Most members read less than 30 minutes/month — and feel more confident than ever.
      </p>
    </div>
  );
}

// ========================================
// MEMBER SECTION COMPONENT
// ========================================

function MemberSection() {
  const DISCORD_INVITE_URL = 'https://whop.com/joined/finotaur/discord-UJWtnrAZQebLPC/app/';
  
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-semibold text-white mb-4">Member Section</h3>

      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
      >
        <Users className="w-6 h-6 text-indigo-400" />
        <div>
          <span className="text-sm font-medium text-white">Join Discord Community</span>
          <p className="text-xs text-gray-500">Connect with other members</p>
        </div>
      </a>
    </div>
  );
}

// ========================================
// STATS CARD COMPONENT
// ========================================

interface StatsCardProps {
  reports: Report[];
}

function StatsCard({ reports }: StatsCardProps) {
  const stats = useMemo(() => {
    // v2.0: All reports have PDF available via API
    const pdfCount = reports.length;
    const typeCount: Record<string, number> = {};
    reports.forEach(r => {
      typeCount[r.type] = (typeCount[r.type] || 0) + 1;
    });
    
    const months = new Set(reports.map(r => getMonthKey(r.date)));
    
    return {
      totalReports: reports.length,
      pdfAvailable: pdfCount,
      monthsCovered: months.size,
      typeCount,
    };
  }, [reports]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <Archive className="w-5 h-5 text-amber-400" />
        Archive Stats
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-black/20">
          <div className="text-2xl font-bold text-white">{stats.totalReports}</div>
          <div className="text-xs text-gray-500">Total Reports</div>
        </div>
        <div className="p-3 rounded-lg bg-black/20">
          <div className="text-2xl font-bold text-emerald-400">{stats.pdfAvailable}</div>
          <div className="text-xs text-gray-500">PDFs Available</div>
        </div>
        <div className="p-3 rounded-lg bg-black/20">
          <div className="text-2xl font-bold text-amber-400">{stats.monthsCovered}</div>
          <div className="text-xs text-gray-500">Months</div>
        </div>
        <div className="p-3 rounded-lg bg-black/20">
          <div className="text-2xl font-bold text-purple-400">{stats.typeCount.company || 0}</div>
          <div className="text-xs text-gray-500">Company Reports</div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// BOTTOM FEATURES BAR
// ========================================

function BottomFeaturesBar() {
  const features = [
    { icon: Target, label: 'CUTS THROUGH NOISE', desc: 'We read the noise, isolate the signal' },
    { icon: Zap, label: 'BUILT FOR CONVICTION', desc: 'Clarity, not confusion' },
    { icon: Shield, label: 'LIVE GUIDES', desc: 'Real-time market analysis' },
  ];

  return (
    <div className="flex items-center justify-between py-6 border-t border-white/5">
      {features.map((feature, idx) => (
        <div key={idx} className="flex flex-col items-center text-center px-4">
          <feature.icon className="w-6 h-6 text-amber-400 mb-2" />
          <span className="text-xs font-semibold text-white mb-1">{feature.label}</span>
          <span className="text-[10px] text-gray-500">{feature.desc}</span>
        </div>
      ))}

      <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
        <Share2 className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-300">Share</span>
      </button>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function TopSecretDashboard({ userId }: TopSecretDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFocus, setMonthFocus] = useState<string>('');
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [downloadError, setDownloadError] = useState<string | null>(null);
  
  // v2.3: Promote to live state
  const [promotingReportId, setPromotingReportId] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);
  
  const [userInteractions, setUserInteractions] = useState<UserReportInteractions>({
    likedReportIds: new Set(),
    bookmarkedReportIds: new Set(),
  });
  
// v2.1: Track if user is a tester (can see test reports)
  const [isTester, setIsTester] = useState(false);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  
  // v2.2: Test Mode toggle - allows testers to view as regular user
  const [testModeEnabled, setTestModeEnabled] = useState(true); // true = see test reports, false = view as regular user
  
  // Effective tester status (considers the toggle)
  const effectiveIsTester = isTester && testModeEnabled;

  const currentUserId = userId || user?.id;

  // Fetch subscription status
  useEffect(() => {
    async function fetchSubscription() {
      if (!currentUserId) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            top_secret_enabled,
            top_secret_status,
            top_secret_expires_at,
            top_secret_is_in_trial,
            top_secret_trial_ends_at,
            is_tester,
            role,
            email
          `)
          .eq('id', currentUserId)
          .single();

        if (error) throw error;

        if (data) {
          setSubscription({
            status: data.top_secret_status || 'inactive',
            expiresAt: data.top_secret_expires_at ? new Date(data.top_secret_expires_at) : null,
            isInTrial: data.top_secret_is_in_trial || false,
            trialEndsAt: data.top_secret_trial_ends_at ? new Date(data.top_secret_trial_ends_at) : null,
          });
          
          // v2.1: Check if user is tester or admin
          const isAdmin = data.role === 'admin' || data.role === 'super_admin' || data.email === 'elad2550@gmail.com';
          setIsTester(data.is_tester || isAdmin);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setIsUserLoaded(true);
      }
    }

    fetchSubscription();
  }, [currentUserId]);

  // Fetch user interactions
  useEffect(() => {
    async function fetchUserInteractions() {
      if (!currentUserId) return;

      try {
        const { data: likes } = await supabase
          .from('report_likes')
          .select('report_id')
          .eq('user_id', currentUserId);

        const { data: bookmarks } = await supabase
          .from('report_bookmarks')
          .select('report_id')
          .eq('user_id', currentUserId);

        setUserInteractions({
          likedReportIds: new Set(likes?.map(l => l.report_id) || []),
          bookmarkedReportIds: new Set(bookmarks?.map(b => b.report_id) || []),
        });
      } catch (error) {
        console.error('Error fetching user interactions:', error);
      }
    }

    fetchUserInteractions();
  }, [currentUserId]);

  // Toggle like handler
  const handleToggleLike = useCallback(async (reportId: string) => {
    if (!currentUserId) return;

    const isCurrentlyLiked = userInteractions.likedReportIds.has(reportId);

    setUserInteractions(prev => {
      const newLikedIds = new Set(prev.likedReportIds);
      if (isCurrentlyLiked) {
        newLikedIds.delete(reportId);
      } else {
        newLikedIds.add(reportId);
      }
      return { ...prev, likedReportIds: newLikedIds };
    });

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from('report_likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('report_id', reportId);
      } else {
        await supabase
          .from('report_likes')
          .insert({ user_id: currentUserId, report_id: reportId });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setUserInteractions(prev => {
        const newLikedIds = new Set(prev.likedReportIds);
        if (isCurrentlyLiked) {
          newLikedIds.add(reportId);
        } else {
          newLikedIds.delete(reportId);
        }
        return { ...prev, likedReportIds: newLikedIds };
      });
    }
  }, [currentUserId, userInteractions.likedReportIds]);

  // Toggle bookmark handler
  const handleToggleBookmark = useCallback(async (reportId: string) => {
    if (!currentUserId) return;

    const isCurrentlyBookmarked = userInteractions.bookmarkedReportIds.has(reportId);

    setUserInteractions(prev => {
      const newBookmarkedIds = new Set(prev.bookmarkedReportIds);
      if (isCurrentlyBookmarked) {
        newBookmarkedIds.delete(reportId);
      } else {
        newBookmarkedIds.add(reportId);
      }
      return { ...prev, bookmarkedReportIds: newBookmarkedIds };
    });

    try {
      if (isCurrentlyBookmarked) {
        await supabase
          .from('report_bookmarks')
          .delete()
          .eq('user_id', currentUserId)
          .eq('report_id', reportId);
      } else {
        await supabase
          .from('report_bookmarks')
          .insert({ user_id: currentUserId, report_id: reportId });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      setUserInteractions(prev => {
        const newBookmarkedIds = new Set(prev.bookmarkedReportIds);
        if (isCurrentlyBookmarked) {
          newBookmarkedIds.add(reportId);
        } else {
          newBookmarkedIds.delete(reportId);
        }
        return { ...prev, bookmarkedReportIds: newBookmarkedIds };
      });
    }
  }, [currentUserId, userInteractions.bookmarkedReportIds]);
// v2.3: Promote report from test to live
  const handlePromoteToLive = useCallback(async (report: Report) => {
    if (!report.id) return;
    
    setPromotingReportId(report.id);
    
    try {
      console.log('[Promote] Starting promotion for report:', report.id);
      
      // Update published_reports visibility to 'live'
      const { error: publishedError } = await supabase
        .from('published_reports')
        .update({ 
          visibility: 'live',
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id);
      
      if (publishedError) {
        throw new Error(publishedError.message);
      }
      
      // Also update the source table if we have original_report_id
      if (report.originalReportId) {
        const sourceTable = `${report.type === 'macro' ? 'ism' : report.type}_reports`;
        
        await supabase
          .from(sourceTable)
          .update({ visibility: 'live' })
          .eq('id', report.originalReportId);
      }
      
      console.log('[Promote] ✅ Report promoted to live:', report.id);
      
      // Show success message
      setPromoteSuccess(`${report.ticker || report.title} promoted to live!`);
      setTimeout(() => setPromoteSuccess(null), 3000);
      
      // Update local state - remove from view if test mode is on (since it's no longer test)
      setReports(prev => prev.map(r => 
        r.id === report.id ? { ...r, visibility: 'live' } : r
      ));
      
    } catch (error) {
      console.error('[Promote] Error:', error);
      setDownloadError(`Failed to promote: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setPromotingReportId(null);
    }
  }, [supabase]);
  // Download PDF handler - v2.0: Uses API
  const handleDownloadPdf = useCallback(async (report: Report) => {
    setDownloadingReportId(report.id);
    setDownloadError(null);
    
    const success = await downloadReportPdf(report);
    
    if (!success) {
      console.error('Failed to download PDF for report:', report.id);
      setDownloadError(`Failed to download ${report.title}. Please try again.`);
      
      // Clear error after 5 seconds
      setTimeout(() => setDownloadError(null), 5000);
    }
    
    setDownloadingReportId(null);
  }, []);

  // Toggle month expansion
  const toggleMonth = useCallback((monthKey: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  }, []);

  // Expand all months
  const expandAllMonths = useCallback(() => {
    const allMonths = new Set(reports.map(r => getMonthKey(r.date)));
    setExpandedMonths(allMonths);
  }, [reports]);

  // Collapse all months
  const collapseAllMonths = useCallback(() => {
    setExpandedMonths(new Set());
  }, []);

  // Fetch reports
  useEffect(() => {
    async function fetchReports() {
      if (!isUserLoaded) {
        return;
      }
      
      setIsLoading(true);

      try {
        if (!currentUserId) {
          setIsLoading(false);
          return;
        }

        // Fetch ALL reports (not just limited)
        const { data: publishedReports, error } = await supabase
          .rpc('get_published_reports_for_user', {
            p_user_id: currentUserId,
            p_limit: 200 // Increased limit for archive
          });

        if (error) {
          console.error('Error fetching reports via RPC:', error);
          // Fallback to direct query
          const { data: directReports, error: directError } = await supabase
            .from('published_reports')
            .select('*')
            .order('published_at', { ascending: false })
            .limit(200);

          if (directError) {
            console.error('Error fetching reports directly:', directError);
            setIsLoading(false);
            return;
          }

          if (directReports) {
            processReports(directReports);
          }
          setIsLoading(false);
          return;
        }

        if (!publishedReports || publishedReports.length === 0) {
          setReports([]);
          setIsLoading(false);
          return;
        }

        processReports(publishedReports);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setIsLoading(false);
      }
    }

function processReports(publishedReports: any[]) {
      const transformedReports: Report[] = publishedReports
        .filter((r: any) => {
          const mappedType = mapReportType(r.report_type);
          if (!mappedType) {
            console.log('[processReports] Skipping report with unknown type:', r.report_type, r.id);
            return false;
          }
          
          // v2.2 FIX: Strict visibility filtering
          // Regular users: ONLY see 'live' or 'public' (or null for legacy)
          // Testers with test mode ON: see 'test' reports
          // Testers with test mode OFF: see same as regular users
          const visibility = r.visibility || 'live'; // Default to 'live' for legacy reports
          
          if (effectiveIsTester) {
            // Tester with test mode ON - show ONLY test reports
            if (visibility !== 'test') {
              console.log('[processReports] Tester mode: skipping non-test report:', r.id, visibility);
              return false;
            }
          } else {
            // Regular user OR tester with test mode OFF - show ONLY live/public
            if (visibility === 'test') {
              console.log('[processReports] Skipping test report (user is not tester or test mode off):', r.id);
              return false;
            }
          }
          return true;
        })
        .map((r: any) => ({
          id: r.id,
          type: mapReportType(r.report_type)!,
          title: r.title,
          subtitle: r.subtitle,
          date: new Date(r.published_at),
          pdfUrl: r.pdf_url,
          status: 'published' as const,
          highlights: r.highlights || [],
          keyMetric: r.key_metric_label,
          keyMetricValue: r.key_metric_value,
          keyInsights: r.key_insights_count,
          qaScore: r.qa_score,
          commentsCount: r.comments_count || 0,
          likesCount: r.likes_count || 0,
          isFeatured: r.is_featured,
          isPinned: r.is_pinned,
          ticker: r.ticker,
          companyName: r.company_name,
          sector: r.sector,
          reportMonth: r.report_month,
          marketRegime: r.market_regime,
          markdownContent: r.markdown_content,
          htmlContent: r.html_content,
          pdfStoragePath: r.pdf_storage_path,
          originalReportId: r.original_report_id,
          isLoadingContent: false,
          visibility: r.visibility || 'live',
        }));

      // ============================================
      // 🔧 FIX: Remove duplicate reports
      // ============================================
      const seen = new Map<string, Report>();
      const deduplicatedReports: Report[] = [];
      
      for (const report of transformedReports) {
        // Create unique key based on type and identifying info
        let uniqueKey: string;
        
        if (report.type === 'company') {
          // For company reports: use ticker + date (same day)
          const dateKey = report.date.toISOString().split('T')[0]; // YYYY-MM-DD
          uniqueKey = `company-${(report.ticker || report.title).toLowerCase()}-${dateKey}`;
        } else if (report.type === 'macro') {
          // For ISM/Macro reports: use report_month
          uniqueKey = `macro-${report.reportMonth || report.date.toISOString().split('T')[0]}`;
        } else if (report.type === 'crypto') {
          // For crypto reports: use date
          const dateKey = report.date.toISOString().split('T')[0];
          uniqueKey = `crypto-${dateKey}`;
        } else if (report.type === 'weekly') {
          // For weekly reports: use date
          const dateKey = report.date.toISOString().split('T')[0];
          uniqueKey = `weekly-${dateKey}`;
        } else {
          // Fallback: use type + title + date
          const dateKey = report.date.toISOString().split('T')[0];
          uniqueKey = `${report.type}-${report.title}-${dateKey}`;
        }
        
        if (!seen.has(uniqueKey)) {
          seen.set(uniqueKey, report);
          deduplicatedReports.push(report);
        } else {
          console.log('[processReports] Skipping duplicate report:', uniqueKey, report.id);
        }
      }
      
      console.log(`[processReports] Deduplicated: ${transformedReports.length} -> ${deduplicatedReports.length} reports`);
      // ============================================

      // Sort by date (newest first)
      deduplicatedReports.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.date.getTime() - a.date.getTime();
      });

      setReports(deduplicatedReports);

      // Get month focus from latest macro report
      const latestMacro = deduplicatedReports.find(r => r.type === 'macro');
      if (latestMacro?.subtitle) {
        setMonthFocus(latestMacro.subtitle);
      }

      // Auto-expand current month
      const currentMonthKey = getMonthKey(new Date());
      setExpandedMonths(new Set([currentMonthKey]));
    }
    fetchReports();
  }, [currentUserId, effectiveIsTester, isUserLoaded]);

  // ========================================
  // REAL-TIME SUBSCRIPTION - Auto-refresh on new reports
  // ========================================
  useEffect(() => {
    if (!currentUserId || !isUserLoaded) return;

    console.log('[Realtime] Setting up subscription for published_reports');

    const channel = supabase
      .channel('published_reports_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'published_reports',
        },
        (payload) => {
          console.log('[Realtime] New report published:', payload.new);
          
          const newReport = payload.new as any;
          const mappedType = mapReportType(newReport.report_type);
          
          // Skip unknown types
          if (!mappedType) {
            console.log('[Realtime] Skipping unknown report type:', newReport.report_type);
            return;
          }
          
          // Check visibility
          const visibility = newReport.visibility || 'live';
          if (effectiveIsTester) {
            if (visibility !== 'test') return;
          } else {
            if (visibility === 'test') return;
          }
          
          // Transform and add the new report
          const transformedReport: Report = {
            id: newReport.id,
            type: mappedType,
            title: newReport.title,
            subtitle: newReport.subtitle,
            date: new Date(newReport.published_at),
            pdfUrl: newReport.pdf_url,
            status: 'published' as const,
            highlights: newReport.highlights || [],
            keyMetric: newReport.key_metric_label,
            keyMetricValue: newReport.key_metric_value,
            keyInsights: newReport.key_insights_count,
            qaScore: newReport.qa_score,
            commentsCount: newReport.comments_count || 0,
            likesCount: newReport.likes_count || 0,
            isFeatured: newReport.is_featured,
            isPinned: newReport.is_pinned,
            ticker: newReport.ticker,
            companyName: newReport.company_name,
            sector: newReport.sector,
            reportMonth: newReport.report_month,
            marketRegime: newReport.market_regime,
            markdownContent: newReport.markdown_content,
            htmlContent: newReport.html_content,
            pdfStoragePath: newReport.pdf_storage_path,
            originalReportId: newReport.original_report_id,
            isLoadingContent: false,
            visibility: newReport.visibility || 'live',
          };
          
          setReports((prev) => {
            // Check for duplicates
            const exists = prev.some((r) => r.id === transformedReport.id);
            if (exists) return prev;
            
            // Add new report at the beginning and sort
            const updated = [transformedReport, ...prev];
            updated.sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return b.date.getTime() - a.date.getTime();
            });
            
            return updated;
          });
          
          // Auto-expand the month of the new report
          const monthKey = getMonthKey(transformedReport.date);
          setExpandedMonths((prev) => new Set([...prev, monthKey]));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'published_reports',
        },
        (payload) => {
          console.log('[Realtime] Report updated:', payload.new);
          
          const updatedReport = payload.new as any;
          const mappedType = mapReportType(updatedReport.report_type);
          
          if (!mappedType) return;
          
          setReports((prev) =>
            prev.map((r) =>
              r.id === updatedReport.id
                ? {
                    ...r,
                    title: updatedReport.title,
                    subtitle: updatedReport.subtitle,
                    pdfUrl: updatedReport.pdf_url,
                    pdfStoragePath: updatedReport.pdf_storage_path,
                    qaScore: updatedReport.qa_score,
                    visibility: updatedReport.visibility || 'live',
                    likesCount: updatedReport.likes_count || 0,
                    commentsCount: updatedReport.comments_count || 0,
                  }
                : r
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [currentUserId, effectiveIsTester, isUserLoaded]);

  // Filter and search reports
  const filteredReports = useMemo(() => {
    let result = reports;

    // Filter by type
    if (selectedFilter !== 'all') {
      result = result.filter(r => r.type === selectedFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.subtitle?.toLowerCase().includes(query) ||
        r.ticker?.toLowerCase().includes(query) ||
        r.companyName?.toLowerCase().includes(query) ||
        r.sector?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [reports, selectedFilter, searchQuery]);

  // Group reports by month
  const groupedReports = useMemo(() => {
    const groups: GroupedReports = {};
    
    filteredReports.forEach(report => {
      const monthKey = getMonthKey(report.date);
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(report);
    });

    return groups;
  }, [filteredReports]);

  // Get sorted month keys (newest first)
  const sortedMonthKeys = useMemo(() => {
    return Object.keys(groupedReports).sort((a, b) => b.localeCompare(a));
  }, [groupedReports]);

  // Get latest report of each type (for the top grid)
  const latestByType = useMemo(() => {
    const types: Array<'macro' | 'company' | 'crypto' | 'weekly'> = ['macro', 'company', 'crypto', 'weekly'];
    const result: Report[] = [];
    
    for (const type of types) {
      const latest = reports.find(r => r.type === type);
      if (latest) {
        result.push(latest);
      }
    }
    
    return result;
  }, [reports]);

  const currentMonth = format(new Date(), 'MMMM yyyy');

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/3 rounded-full blur-[200px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Top Secret Member Dashboard
            </h1>
            
            {/* Test Mode Toggle - Only visible to testers */}
            {isTester && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-900/50 border border-purple-500/30">
                <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-medium text-purple-300">Test Mode</span>
                <button
                  onClick={() => setTestModeEnabled(!testModeEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    testModeEnabled ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: testModeEnabled ? 18 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                  />
                </button>
                <span className={`text-xs font-medium min-w-[24px] ${testModeEnabled ? 'text-purple-300' : 'text-gray-500'}`}>
                  {testModeEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
            )}
          </div>
          
          <p className="text-gray-400 max-w-2xl text-sm">
            Your institutional-grade market intelligence is ready. Download your PDF reports to stay informed.
          </p>
        </motion.div>

        {/* Success Toast - for promote */}
        <AnimatePresence>
          {promoteSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>{promoteSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Toast */}
        <AnimatePresence>
          {downloadError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5" />
              <span>{downloadError}</span>
              <button onClick={() => setDownloadError(null)}>
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Reports */}
          <div className="lg:col-span-2 space-y-8">
            {/* Premium Reports Library Section - Latest of each type */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Latest Reports</h2>
                <span className="text-xs text-gray-500 ml-2">{currentMonth}</span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              ) : latestByType.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No reports available yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {latestByType.map((report) => (
                    <CompactReportCard
                      key={report.id}
                      report={report}
                      onDownload={handleDownloadPdf}
                      isDownloading={downloadingReportId === report.id}
                    />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Search & Filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex-1">
                <SearchBar 
                  value={searchQuery} 
                  onChange={setSearchQuery}
                  placeholder="Search by ticker, company, sector..."
                />
              </div>
              <FilterTabs selected={selectedFilter} onChange={setSelectedFilter} />
            </motion.div>

            {/* Archive Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">Reports Archive</h2>
                  <span className="text-xs text-gray-500 ml-2">
                    {filteredReports.length} reports
                  </span>
                </div>

                {/* Expand/Collapse All */}
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

              {sortedMonthKeys.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border border-white/10 rounded-xl">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No reports found</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-amber-400 text-sm hover:underline"
                    >
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
                      onDownload={handleDownloadPdf}
                      downloadingReportId={downloadingReportId}
                      userInteractions={userInteractions}
                      onToggleLike={handleToggleLike}
                      onToggleBookmark={handleToggleBookmark}
                      isTester={isTester}
                      onPromoteToLive={handlePromoteToLive}
                      promotingReportId={promotingReportId}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <StatsCard reports={reports} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <HowToUseSection />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <MemberSection />
            </motion.div>
          </div>
        </div>

        {/* Bottom Features Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <BottomFeaturesBar />
        </motion.div>
      </div>
    </div>
  );
}