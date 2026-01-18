// =====================================================
// PUBLISHED REPORTS MANAGER - Admin Component
// =====================================================
// Place in: src/components/admin/PublishedReportsManager.tsx
//
// Features:
// - View all published reports (manual + automatic)
// - Filter by type, target group, status
// - Edit featured/pinned/target settings
// - Delete published reports
// - Statistics overview
// =====================================================

import React, { useState, useMemo, useCallback } from 'react';
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
  MoreVertical,
  AlertCircle,
  Loader2,
  X,
  Check,
  ExternalLink,
  Download,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

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
  ticker?: string;
  company_name?: string;
  sector?: string;
  report_month?: string;
  pmi_value?: number;
  market_regime?: string;
  is_featured: boolean;
  is_pinned: boolean;
  target_group: 'all' | 'top_secret' | 'newsletter' | 'trading_journal' | 'premium' | 'basic';
  published_at: string;
  published_by?: string;
  admin_note?: string;
  email_sent: boolean;
  email_sent_at?: string;
  email_recipient_count?: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  publisher_email?: string;
  publisher_name?: string;
}

interface PublishedReportsStats {
  total: number;
  by_type: {
    ism: number;
    company: number;
    crypto: number;
    weekly: number;
  };
  featured_count: number;
  pinned_count: number;
  email_sent_count: number;
  this_month: number;
}

interface FilterState {
  type: 'all' | 'ism' | 'company' | 'crypto' | 'weekly';
  target: 'all' | 'top_secret' | 'newsletter' | 'trading_journal' | 'premium' | 'basic';
  featured: 'all' | 'yes' | 'no';
  pinned: 'all' | 'yes' | 'no';
  search: string;
}

// ============================================
// CONSTANTS
// ============================================

const REPORT_TYPE_CONFIG = {
  ism: {
    name: 'ISM Report',
    shortName: 'ISM',
    icon: TrendingUp,
    gradient: 'from-blue-600 to-cyan-600',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
  },
  company: {
    name: 'Company Analysis',
    shortName: 'Company',
    icon: Building2,
    gradient: 'from-purple-600 to-pink-600',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
  },
  crypto: {
    name: 'Crypto Report',
    shortName: 'Crypto',
    icon: Bitcoin,
    gradient: 'from-orange-600 to-amber-600',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30',
  },
  weekly: {
    name: 'Weekly Review',
    shortName: 'Weekly',
    icon: Calendar,
    gradient: 'from-emerald-600 to-teal-600',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
  },
};

const TARGET_GROUP_CONFIG = {
  all: { label: 'All Users', icon: Users, color: 'text-gray-400' },
  top_secret: { label: 'Top Secret', icon: Crown, color: 'text-[#C9A646]' },
  newsletter: { label: 'Newsletter', icon: Mail, color: 'text-blue-400' },
  trading_journal: { label: 'Journal Users', icon: FileText, color: 'text-purple-400' },
  premium: { label: 'Premium Only', icon: Crown, color: 'text-amber-400' },
  basic: { label: 'Basic Only', icon: Star, color: 'text-cyan-400' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (dateString: string): string => {
  return format(new Date(dateString), 'MMM d, yyyy HH:mm');
};

const formatRelativeDate = (dateString: string): string => {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};

// ============================================
// STATS CARD COMPONENT
// ============================================

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  trend?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, iconBg, trend }) => (
  <div className="bg-[#0d0d18] rounded-xl p-4 border border-gray-800/50">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-xs mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {trend && <p className="text-xs text-emerald-400 mt-1">{trend}</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${iconBg}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

// ============================================
// FILTER BAR COMPONENT
// ============================================

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onReset: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onReset }) => {
  const hasActiveFilters = 
    filters.type !== 'all' || 
    filters.target !== 'all' || 
    filters.featured !== 'all' || 
    filters.pinned !== 'all' ||
    filters.search !== '';

  return (
    <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search reports by title, ticker, or admin note..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#080812] border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30 text-sm"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type Filter */}
        <select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          className="px-3 py-2 bg-[#080812] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30"
        >
          <option value="all">All Types</option>
          <option value="ism">ISM Reports</option>
          <option value="company">Company Analysis</option>
          <option value="crypto">Crypto Reports</option>
          <option value="weekly">Weekly Reviews</option>
        </select>

        {/* Target Filter */}
        <select
          value={filters.target}
          onChange={(e) => onFilterChange('target', e.target.value)}
          className="px-3 py-2 bg-[#080812] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30"
        >
          <option value="all">All Targets</option>
          <option value="top_secret">Top Secret Only</option>
          <option value="newsletter">Newsletter</option>
          <option value="trading_journal">Journal Users</option>
          <option value="premium">Premium Only</option>
          <option value="basic">Basic Only</option>
        </select>

        {/* Featured Filter */}
        <select
          value={filters.featured}
          onChange={(e) => onFilterChange('featured', e.target.value)}
          className="px-3 py-2 bg-[#080812] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30"
        >
          <option value="all">Featured: All</option>
          <option value="yes">Featured Only</option>
          <option value="no">Not Featured</option>
        </select>

        {/* Pinned Filter */}
        <select
          value={filters.pinned}
          onChange={(e) => onFilterChange('pinned', e.target.value)}
          className="px-3 py-2 bg-[#080812] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30"
        >
          <option value="all">Pinned: All</option>
          <option value="yes">Pinned Only</option>
          <option value="no">Not Pinned</option>
        </select>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors flex items-center gap-2 text-gray-400 text-sm"
          >
            <X className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================
// REPORT ROW COMPONENT
// ============================================

interface ReportRowProps {
  report: PublishedReport;
  onEdit: (report: PublishedReport) => void;
  onDelete: (report: PublishedReport) => void;
  onViewPdf: (report: PublishedReport) => void;
}

const ReportRow: React.FC<ReportRowProps> = ({ report, onEdit, onDelete, onViewPdf }) => {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Validate report type - only show ism, company, crypto, weekly
  const validTypes = ['ism', 'company', 'crypto', 'weekly'] as const;
  if (!validTypes.includes(report.report_type as any)) {
    console.warn(`[ReportRow] Unknown report type: ${report.report_type}`);
    return null; // Skip rendering unknown report types
  }
  
  const config = REPORT_TYPE_CONFIG[report.report_type];
  const targetConfig = TARGET_GROUP_CONFIG[report.target_group] || TARGET_GROUP_CONFIG.all;
  
  // Safety check - should never happen after the validation above
  if (!config) {
    console.error(`[ReportRow] Missing config for report type: ${report.report_type}`);
    return null;
  }
  
  const Icon = config.icon;
  const TargetIcon = targetConfig.icon;

  return (
    <div className={`bg-[#0d0d18] rounded-xl border ${config.borderColor} overflow-hidden`}>
      {/* Main Row */}
      <div 
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Type Icon */}
        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.textColor}`} />
        </div>

        {/* Title & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{report.title}</h3>
            {report.is_pinned && (
              <Pin className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            {report.is_featured && (
              <Star className="w-4 h-4 text-[#C9A646] flex-shrink-0 fill-current" />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            <span>{report.subtitle || config.name}</span>
            {report.ticker && (
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                {report.ticker}
              </span>
            )}
            {report.report_month && (
              <span className="text-blue-400">{report.report_month}</span>
            )}
          </div>
        </div>

        {/* Target Group */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/50 ${targetConfig.color}`}>
          <TargetIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{targetConfig.label}</span>
        </div>

        {/* Email Status */}
        <div className="flex items-center gap-2">
          {report.email_sent ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400">
              <MailCheck className="w-3.5 h-3.5" />
              <span className="text-xs">{report.email_recipient_count || 0}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-800 text-gray-500">
              <Mail className="w-3.5 h-3.5" />
              <span className="text-xs">Not sent</span>
            </div>
          )}
        </div>

        {/* Date */}
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400">{formatRelativeDate(report.published_at)}</p>
          <p className="text-[10px] text-gray-600">{formatDate(report.published_at)}</p>
        </div>

        {/* QA Score */}
        {report.qa_score && (
          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
            report.qa_score >= 85 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : report.qa_score >= 75 
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'bg-red-500/20 text-red-400'
          }`}>
            QA: {report.qa_score}
          </div>
        )}

        {/* Expand Icon */}
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-800/50 p-4 bg-[#080812] space-y-4">
          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Report ID</p>
              <p className="text-gray-300 font-mono text-xs">{report.original_report_id.slice(0, 8)}...</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Published By</p>
              <p className="text-gray-300">{report.publisher_name || report.publisher_email || 'System'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Key Insights</p>
              <p className="text-gray-300">{report.key_insights_count || 0}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Email Sent At</p>
              <p className="text-gray-300">
                {report.email_sent_at ? formatDate(report.email_sent_at) : 'Not sent'}
              </p>
            </div>
          </div>

          {/* Key Metric */}
          {report.key_metric_label && report.key_metric_value && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/5">
              <Sparkles className={`w-5 h-5 ${config.textColor}`} />
              <div>
                <p className="text-xs text-gray-500">{report.key_metric_label}</p>
                <p className="text-lg font-bold text-white">{report.key_metric_value}</p>
              </div>
            </div>
          )}

          {/* Highlights */}
          {report.highlights && report.highlights.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-2">Highlights</p>
              <ul className="space-y-1">
                {report.highlights.slice(0, 4).map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className={config.textColor}>•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Admin Note */}
          {report.admin_note && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-400 mb-1">Admin Note</p>
              <p className="text-sm text-gray-300">{report.admin_note}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-800/50">
            {report.pdf_url && (
              <button
                onClick={(e) => { e.stopPropagation(); onViewPdf(report); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors text-gray-400 text-sm"
              >
                <Download className="w-4 h-4" />
                View PDF
              </button>
            )}
            
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(report); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-all text-white text-sm font-medium`}
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all text-red-400 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(report); setShowDeleteConfirm(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-white text-sm"
                >
                  <Check className="w-4 h-4" />
                  Confirm
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors text-gray-400 text-sm"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
        admin_note: adminNote || null,
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
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-[#0a0a12] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-800 bg-gradient-to-r ${config.gradient}`}>
          <h2 className="text-lg font-semibold text-white">Edit Published Report</h2>
          <p className="text-sm text-white/70">{report.title}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Target Group */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Target Audience
            </label>
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
            {/* Featured Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-[#080812]">
              <div className="flex items-center gap-3">
                <Star className={`w-5 h-5 ${isFeatured ? 'text-[#C9A646] fill-current' : 'text-gray-500'}`} />
                <div>
                  <p className="text-white font-medium">Featured Report</p>
                  <p className="text-xs text-gray-500">Highlight this report in the dashboard</p>
                </div>
              </div>
              <button
                onClick={() => setIsFeatured(!isFeatured)}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  isFeatured ? 'bg-[#C9A646]' : 'bg-gray-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                  isFeatured ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Pinned Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-[#080812]">
              <div className="flex items-center gap-3">
                <Pin className={`w-5 h-5 ${isPinned ? 'text-amber-400' : 'text-gray-500'}`} />
                <div>
                  <p className="text-white font-medium">Pin to Top</p>
                  <p className="text-xs text-gray-500">Keep at the top of the reports list</p>
                </div>
              </div>
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  isPinned ? 'bg-amber-500' : 'bg-gray-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                  isPinned ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Admin Note */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Admin Note (Optional)
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Internal note about this publication..."
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
            className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${config.gradient} text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
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
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    target: 'all',
    featured: 'all',
    pinned: 'all',
    search: '',
  });
  const [editingReport, setEditingReport] = useState<PublishedReport | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

// Fetch reports
  const { data: reports, isLoading, error, refetch } = useQuery({
    queryKey: ['published-reports', filters],
queryFn: async (): Promise<PublishedReport[]> => {
      let query = supabase
        .from('published_reports')
        .select('*')
        .in('report_type', ['ism', 'company', 'crypto', 'weekly']) // Only valid types
        .order('is_pinned', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false });

      // Apply filters
      if (filters.type !== 'all') {
        query = query.eq('report_type', filters.type);
      }
      if (filters.target !== 'all') {
        query = query.eq('target_group', filters.target);
      }
      if (filters.featured === 'yes') {
        query = query.eq('is_featured', true);
      } else if (filters.featured === 'no') {
        query = query.eq('is_featured', false);
      }
      if (filters.pinned === 'yes') {
        query = query.eq('is_pinned', true);
      } else if (filters.pinned === 'no') {
        query = query.eq('is_pinned', false);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,ticker.ilike.%${filters.search}%,admin_note.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

return data || [];
    },
  });

  // Calculate stats
  const stats = useMemo((): PublishedReportsStats => {
    const allReports = reports || [];
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    return {
      total: allReports.length,
      by_type: {
        ism: allReports.filter(r => r.report_type === 'ism').length,
        company: allReports.filter(r => r.report_type === 'company').length,
        crypto: allReports.filter(r => r.report_type === 'crypto').length,
        weekly: allReports.filter(r => r.report_type === 'weekly').length,
      },
      featured_count: allReports.filter(r => r.is_featured).length,
      pinned_count: allReports.filter(r => r.is_pinned).length,
      email_sent_count: allReports.filter(r => r.email_sent).length,
      this_month: allReports.filter(r => new Date(r.published_at) >= thisMonth).length,
    };
  }, [reports]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PublishedReport> }) => {
      const { error } = await supabase
        .from('published_reports')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report updated successfully');
      queryClient.invalidateQueries({ queryKey: ['published-reports'] });
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('published_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report removed from publication');
      queryClient.invalidateQueries({ queryKey: ['published-reports'] });
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  // Handlers
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      type: 'all',
      target: 'all',
      featured: 'all',
      pinned: 'all',
      search: '',
    });
    setPage(1);
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

  const handleViewPdf = useCallback((report: PublishedReport) => {
    if (report.pdf_url) {
      window.open(report.pdf_url, '_blank');
    }
  }, []);

  // Pagination
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (reports || []).slice(start, start + pageSize);
  }, [reports, page]);

  const totalPages = Math.ceil((reports?.length || 0) / pageSize);

  if (error) {
    return (
      <div className={`bg-[#0d0d18] rounded-xl p-8 border border-red-500/30 ${className}`}>
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-white font-medium mb-2">Failed to load published reports</h3>
          <p className="text-gray-500 text-sm mb-4">
            {(error as Error).message}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#C9A646]" />
            Published Reports Manager
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            View and manage all reports published to user dashboards
          </p>
        </div>
        
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 hover:bg-gray-800 transition-colors text-gray-400"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatsCard 
          title="Total Published" 
          value={stats.total} 
          icon={FileText} 
          iconBg="bg-[#C9A646]" 
        />
        <StatsCard 
          title="This Month" 
          value={stats.this_month} 
          icon={Calendar} 
          iconBg="bg-emerald-600"
          trend="+12% vs last month" 
        />
        <StatsCard 
          title="ISM Reports" 
          value={stats.by_type.ism} 
          icon={TrendingUp} 
          iconBg="bg-blue-600" 
        />
        <StatsCard 
          title="Company" 
          value={stats.by_type.company} 
          icon={Building2} 
          iconBg="bg-purple-600" 
        />
        <StatsCard 
          title="Featured" 
          value={stats.featured_count} 
          icon={Star} 
          iconBg="bg-amber-600" 
        />
        <StatsCard 
          title="Emails Sent" 
          value={stats.email_sent_count} 
          icon={MailCheck} 
          iconBg="bg-cyan-600" 
        />
      </div>

      {/* Filter Bar */}
      <FilterBar 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        onReset={handleResetFilters} 
      />

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#C9A646] animate-spin" />
        </div>
      ) : paginatedReports.length === 0 ? (
        <div className="bg-[#0d0d18] rounded-xl p-12 border border-gray-800/50 text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">No published reports found</h3>
          <p className="text-gray-500 text-sm">
            {filters.search || filters.type !== 'all' || filters.target !== 'all'
              ? 'Try adjusting your filters'
              : 'Publish your first report to see it here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedReports.map(report => (
            <ReportRow
              key={report.id}
              report={report}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewPdf={handleViewPdf}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, reports?.length || 0)} of {reports?.length || 0}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

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