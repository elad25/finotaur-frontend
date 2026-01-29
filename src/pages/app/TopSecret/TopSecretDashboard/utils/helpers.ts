// =====================================================
// TopSecretDashboard - Utility Functions
// =====================================================

import { format } from 'date-fns';

// ========================================
// TYPES
// ========================================

export interface Report {
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

export interface GroupedReports {
  [monthKey: string]: Report[];
}

export interface UserReportInteractions {
  likedReportIds: Set<string>;
  bookmarkedReportIds: Set<string>;
}

export interface SubscriptionInfo {
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  expiresAt: Date | null;
  isInTrial: boolean;
  trialEndsAt: Date | null;
}

// ========================================
// CONSTANTS
// ========================================

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

export const REPORT_TYPE_CONFIG = {
  macro: {
    name: 'Macro Report',
    shortName: 'Macro',
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    apiPath: 'ism',
  },
  company: {
    name: 'Company Analysis',
    shortName: 'Company',
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
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    apiPath: 'weekly',
  },
} as const;

// ========================================
// HELPER FUNCTIONS
// ========================================

export function formatTimeAgo(date: Date): string {
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

export function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(date, 'MMMM yyyy');
}

export function mapReportType(dbType: string): 'macro' | 'company' | 'crypto' | 'weekly' | null {
  if (dbType === 'ism') return 'macro';
  if (dbType === 'weekly') return 'weekly';
  if (dbType === 'company') return 'company';
  if (dbType === 'crypto') return 'crypto';
  return null;
}

export function mapReportTypeToDb(type: string): string {
  if (type === 'macro') return 'ism';
  return type;
}

// ========================================
// REPORT TRANSFORMATION
// ========================================

export function transformReport(r: any): Report | null {
  const mappedType = mapReportType(r.report_type);
  if (!mappedType) return null;

  return {
    id: r.id,
    type: mappedType,
    title: r.title,
    subtitle: r.subtitle,
    date: new Date(r.published_at),
    pdfUrl: r.pdf_url,
    status: 'published',
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
  };
}

export function deduplicateReports(reports: Report[]): Report[] {
  const seen = new Map<string, Report>();
  
  for (const report of reports) {
    let uniqueKey: string;
    const dateKey = report.date.toISOString().split('T')[0];
    
    switch (report.type) {
      case 'company':
        uniqueKey = `company-${(report.ticker || report.title).toLowerCase()}-${dateKey}`;
        break;
      case 'macro':
        uniqueKey = `macro-${report.reportMonth || dateKey}`;
        break;
      case 'crypto':
        uniqueKey = `crypto-${dateKey}`;
        break;
      case 'weekly':
        uniqueKey = `weekly-${dateKey}`;
        break;
      default:
        uniqueKey = `${report.type}-${report.title}-${dateKey}`;
    }
    
    if (!seen.has(uniqueKey)) {
      seen.set(uniqueKey, report);
    }
  }
  
  return Array.from(seen.values());
}

export function sortReports(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.date.getTime() - a.date.getTime();
  });
}

export function groupReportsByMonth(reports: Report[]): GroupedReports {
  const groups: GroupedReports = {};
  
  for (const report of reports) {
    const monthKey = getMonthKey(report.date);
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(report);
  }
  
  return groups;
}
