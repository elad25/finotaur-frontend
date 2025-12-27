

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UserX, 
  TrendingDown, 
  Calendar, 
  MessageSquare, 
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  RefreshCw,
  Download,
  X,
  Check,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface CancellationFeedback {
  id: string;
  user_id: string;
  email: string;
  plan_cancelled: string;
  subscription_type: string | null;
  subscription_duration_days: number | null;
  reason_id: string;
  reason_label: string;
  feedback_text: string | null;
  whop_membership_id: string | null;
  processed: boolean;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
}

interface ReasonStat {
  reason_id: string;
  reason_label: string;
  count: number;
  percentage: number;
}

interface PlanStat {
  plan: string;
  count: number;
  percentage: number;
}

interface DurationStat {
  bucket: string;
  count: number;
  percentage: number;
}

interface CancellationStats {
  period_days: number;
  start_date: string;
  end_date: string;
  total_cancellations: number;
  by_reason: ReasonStat[];
  by_plan: PlanStat[];
  by_duration: DurationStat[];
  avg_subscription_days: number | null;
  feedbacks_with_text: number;
  recent_feedbacks: any[];
}

// ============================================
// CONSTANTS
// ============================================

const REASON_COLORS: Record<string, string> = {
  'too_expensive': '#EF4444',
  'not_using': '#F59E0B',
  'missing_features': '#3B82F6',
  'found_alternative': '#8B5CF6',
  'technical_issues': '#EC4899',
  'temporary_break': '#06B6D4',
  'just_testing': '#10B981',
  'switching_plan': '#6366F1',
  'other': '#6B7280',
};

const PLAN_COLORS: Record<string, string> = {
  'premium': 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30',
  'basic': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'newsletter': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'top_secret': 'bg-red-500/20 text-red-400 border-red-500/30',
  'free': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

// ============================================
// ADMIN NOTES MODAL
// ============================================

const AdminNotesModal = ({
  isOpen,
  onClose,
  onSave,
  isLoading,
  feedbackEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
  isLoading: boolean;
  feedbackEmail: string;
}) => {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Mark as Processed</h3>
            <p className="text-sm text-zinc-400 mt-1">{feedbackEmail}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Admin Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this cancellation..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-zinc-500 mt-1 text-right">{notes.length}/500</p>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(notes)}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Mark Processed
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

export default function AdminChurnPage() {
  // State
  const [stats, setStats] = useState<CancellationStats | null>(null);
  const [feedbacks, setFeedbacks] = useState<CancellationFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [periodDays, setPeriodDays] = useState(30);
  const [planFilter, setPlanFilter] = useState<string | null>(null);
  const [showUnprocessedOnly, setShowUnprocessedOnly] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  
  // Modal state
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; feedbackId: string; email: string }>({
    isOpen: false,
    feedbackId: '',
    email: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;

  // ============================================
  // DATA LOADING
  // ============================================

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_cancellation_stats', {
        p_days: periodDays
      });
      
      if (error) throw error;
      setStats(data);
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.message);
    } finally {
      setStatsLoading(false);
    }
  }, [periodDays]);

  const loadFeedbacks = useCallback(async (reset = false) => {
    if (reset) {
      setPage(0);
      setFeedbacks([]);
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_cancellation_feedbacks', {
        p_limit: ITEMS_PER_PAGE,
        p_offset: reset ? 0 : page * ITEMS_PER_PAGE,
        p_plan_filter: planFilter,
        p_unprocessed_only: showUnprocessedOnly
      });
      
      if (error) throw error;
      
      if (reset) {
        setFeedbacks(data || []);
      } else {
        setFeedbacks(prev => [...prev, ...(data || [])]);
      }
      
      setHasMore((data || []).length === ITEMS_PER_PAGE);
    } catch (err: any) {
      console.error('Error loading feedbacks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, planFilter, showUnprocessedOnly]);

  // ============================================
  // ACTIONS
  // ============================================

  const markAsProcessed = useCallback(async (feedbackId: string, notes: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('mark_feedback_processed', {
        p_feedback_id: feedbackId,
        p_admin_notes: notes || null
      });
      
      if (error) throw error;
      
      // Update local state
      setFeedbacks(prev => prev.map(f => 
        f.id === feedbackId 
          ? { ...f, processed: true, admin_notes: notes || null, processed_at: new Date().toISOString() }
          : f
      ));
      
      // Close modal
      setNotesModal({ isOpen: false, feedbackId: '', email: '' });
      
      // Show success
      toast.success('Marked as processed');
      
      // Refresh stats
      loadStats();
    } catch (err: any) {
      console.error('Error marking as processed:', err);
      toast.error('Failed to mark as processed', { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  }, [loadStats]);

  const copyEmail = useCallback((email: string) => {
    navigator.clipboard.writeText(email);
    toast.success('Email copied to clipboard');
  }, []);

  const exportToCSV = useCallback(() => {
    const headers = ['Date', 'Email', 'Plan', 'Type', 'Duration (days)', 'Reason', 'Feedback', 'Processed', 'Admin Notes'];
    const rows = feedbacks.map(f => [
      new Date(f.created_at).toLocaleDateString('en-US'),
      f.email,
      f.plan_cancelled,
      f.subscription_type || '',
      f.subscription_duration_days?.toString() || '',
      f.reason_label,
      (f.feedback_text || '').replace(/"/g, '""'),
      f.processed ? 'Yes' : 'No',
      (f.admin_notes || '').replace(/"/g, '""')
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `churn-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`Exported ${feedbacks.length} records`);
  }, [feedbacks]);

  const refreshData = useCallback(() => {
    loadStats();
    loadFeedbacks(true);
  }, [loadStats, loadFeedbacks]);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    loadStats();
    loadFeedbacks(true);
  }, [periodDays]);

  useEffect(() => {
    loadFeedbacks(true);
  }, [planFilter, showUnprocessedOnly]);

  // ============================================
  // HELPERS
  // ============================================

  const formatDuration = (days: number | null) => {
    if (days === null) return '-';
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    return `${(days / 365).toFixed(1)}y`;
  };

  const unprocessedCount = feedbacks.filter(f => !f.processed).length;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <UserX className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Churn Analytics</h1>
            <p className="text-sm text-zinc-400">Cancellation reasons & feedback</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:border-[#D4AF37] focus:outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
          
          <button
            onClick={refreshData}
            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 text-zinc-400 ${loading || statsLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={exportToCSV}
            disabled={feedbacks.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cancellations */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-400">Total Cancellations</span>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {statsLoading ? (
              <div className="h-9 w-16 bg-zinc-800 animate-pulse rounded" />
            ) : (
              stats?.total_cancellations || 0
            )}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Last {periodDays} days
          </div>
        </div>

        {/* Avg Duration */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-400">Avg Subscription</span>
            <Clock className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div className="text-3xl font-bold text-white">
            {statsLoading ? (
              <div className="h-9 w-20 bg-zinc-800 animate-pulse rounded" />
            ) : stats?.avg_subscription_days ? (
              `${Math.round(stats.avg_subscription_days)}d`
            ) : (
              'N/A'
            )}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Before cancellation
          </div>
        </div>

        {/* With Feedback */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-400">With Feedback</span>
            <MessageSquare className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {statsLoading ? (
              <div className="h-9 w-12 bg-zinc-800 animate-pulse rounded" />
            ) : (
              stats?.feedbacks_with_text || 0
            )}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Left written feedback
          </div>
        </div>

        {/* Unprocessed */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-400">Unprocessed</span>
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {loading ? (
              <div className="h-9 w-12 bg-zinc-800 animate-pulse rounded" />
            ) : (
              unprocessedCount
            )}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Awaiting review
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Reason */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            By Reason
          </h3>
          
          {statsLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-8 bg-zinc-800 animate-pulse rounded" />
              ))}
            </div>
          ) : stats?.by_reason?.length ? (
            <div className="space-y-3">
              {stats.by_reason.map((reason) => (
                <div key={reason.reason_id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-300 truncate">{reason.reason_label}</span>
                    <span className="text-zinc-500 ml-2 flex-shrink-0">
                      {reason.count} ({reason.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${reason.percentage}%`,
                        backgroundColor: REASON_COLORS[reason.reason_id] || '#6B7280'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-8">No data</p>
          )}
        </div>

        {/* By Plan */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#D4AF37]" />
            By Plan
          </h3>
          
          {statsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 bg-zinc-800 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : stats?.by_plan?.length ? (
            <div className="space-y-3">
              {stats.by_plan.map((plan) => (
                <div 
                  key={plan.plan}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                >
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${PLAN_COLORS[plan.plan] || PLAN_COLORS.free}`}>
                    {plan.plan}
                  </span>
                  <div className="text-right">
                    <div className="font-bold text-white">{plan.count}</div>
                    <div className="text-xs text-zinc-500">{plan.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-8">No data</p>
          )}
        </div>

        {/* By Duration */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            By Duration
          </h3>
          
          {statsLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-7 bg-zinc-800 animate-pulse rounded" />
              ))}
            </div>
          ) : stats?.by_duration?.length ? (
            <div className="space-y-2">
              {stats.by_duration.map((duration) => (
                <div 
                  key={duration.bucket}
                  className="flex items-center justify-between p-2 hover:bg-zinc-800/50 rounded transition-colors"
                >
                  <span className="text-zinc-300 text-sm">{duration.bucket}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${duration.percentage}%` }}
                      />
                    </div>
                    <span className="text-zinc-500 text-xs w-14 text-right">
                      {duration.count} ({duration.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-8">No data</p>
          )}
        </div>
      </div>

      {/* Feedbacks Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            Cancellation Feedback
            {unprocessedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                {unprocessedCount} new
              </span>
            )}
          </h3>
          
          <div className="flex items-center gap-3">
            {/* Plan filter */}
            <select
              value={planFilter || ''}
              onChange={(e) => setPlanFilter(e.target.value || null)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="">All Plans</option>
              <option value="premium">Premium</option>
              <option value="basic">Basic</option>
              <option value="newsletter">Newsletter</option>
              <option value="top_secret">Top Secret</option>
            </select>
            
            {/* Unprocessed toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnprocessedOnly}
                onChange={(e) => setShowUnprocessedOnly(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 text-[#D4AF37] focus:ring-[#D4AF37] bg-zinc-800"
              />
              <span className="text-sm text-zinc-400">Unprocessed only</span>
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">User</th>
                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Plan</th>
                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Reason</th>
                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Duration</th>
                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {feedbacks.map((feedback) => (
                <>
                  <tr 
                    key={feedback.id}
                    className={`hover:bg-zinc-800/30 transition-colors ${
                      expandedFeedback === feedback.id ? 'bg-zinc-800/30' : ''
                    } ${!feedback.processed ? 'border-l-2 border-l-amber-500' : ''}`}
                  >
                    {/* User */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-zinc-300">
                            {feedback.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <button 
                            onClick={() => copyEmail(feedback.email)}
                            className="text-white hover:text-[#D4AF37] transition-colors flex items-center gap-1 group"
                            title="Click to copy"
                          >
                            <span className="truncate max-w-[180px]">{feedback.email}</span>
                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${PLAN_COLORS[feedback.plan_cancelled] || PLAN_COLORS.free}`}>
                          {feedback.plan_cancelled}
                        </span>
                        {feedback.subscription_type && (
                          <span className="text-xs text-zinc-500">
                            ({feedback.subscription_type})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-300">{feedback.reason_label}</span>
                        {feedback.feedback_text && (
                          <span title="Has feedback text">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        </span>
                        )}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="p-4">
                      <span className="text-sm text-zinc-400">
                        {formatDuration(feedback.subscription_duration_days)}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="p-4">
                      <span className="text-sm text-zinc-400">
                        {new Date(feedback.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      {feedback.processed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <CheckCircle className="w-3 h-3" />
                          Processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setExpandedFeedback(
                            expandedFeedback === feedback.id ? null : feedback.id
                          )}
                          className="p-2 rounded-lg hover:bg-zinc-700 transition-colors"
                          title="View details"
                        >
                          {expandedFeedback === feedback.id ? (
                            <ChevronUp className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                        
                        {!feedback.processed && (
                          <button
                            onClick={() => setNotesModal({
                              isOpen: true,
                              feedbackId: feedback.id,
                              email: feedback.email
                            })}
                            className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                            title="Mark as processed"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        <a
                          href={`mailto:${feedback.email}`}
                          className="p-2 rounded-lg hover:bg-zinc-700 transition-colors"
                          title="Send email"
                        >
                          <Mail className="w-4 h-4 text-zinc-400" />
                        </a>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Details */}
                  {expandedFeedback === feedback.id && (
                    <tr className="bg-zinc-800/20">
                      <td colSpan={7} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Feedback Text */}
                          <div>
                            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                              User Feedback
                            </h4>
                            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700">
                              {feedback.feedback_text ? (
                                <p className="text-zinc-300 text-sm whitespace-pre-wrap">
                                  {feedback.feedback_text}
                                </p>
                              ) : (
                                <p className="text-zinc-500 text-sm italic">No feedback provided</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Additional Info */}
                          <div>
                            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                              Details
                            </h4>
                            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700 space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">User ID:</span>
                                <span className="text-zinc-300 font-mono text-xs">{feedback.user_id.slice(0, 8)}...</span>
                              </div>
                              {feedback.whop_membership_id && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-zinc-500">Whop ID:</span>
                                  <span className="text-zinc-300 font-mono text-xs">{feedback.whop_membership_id}</span>
                                </div>
                              )}
                              {feedback.admin_notes && (
                                <div className="pt-2 border-t border-zinc-700">
                                  <span className="text-zinc-500 text-sm block mb-1">Admin Notes:</span>
                                  <p className="text-zinc-300 text-sm">{feedback.admin_notes}</p>
                                </div>
                              )}
                              {feedback.processed_at && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-zinc-500">Processed:</span>
                                  <span className="text-zinc-300">
                                    {new Date(feedback.processed_at).toLocaleString('en-US')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              
              {/* Empty State */}
              {feedbacks.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <UserX className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                    <p className="text-zinc-500">No cancellation feedback found</p>
                    <p className="text-zinc-600 text-sm mt-1">
                      {showUnprocessedOnly ? 'All feedbacks have been processed' : 'No users have cancelled yet'}
                    </p>
                  </td>
                </tr>
              )}
              
              {/* Loading State */}
              {loading && feedbacks.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-zinc-500">Loading...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {hasMore && feedbacks.length > 0 && (
          <div className="p-4 border-t border-zinc-800 text-center">
            <button
              onClick={() => {
                setPage(prev => prev + 1);
                loadFeedbacks();
              }}
              disabled={loading}
              className="px-6 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors text-sm text-zinc-300 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Admin Notes Modal */}
      <AdminNotesModal
        isOpen={notesModal.isOpen}
        onClose={() => setNotesModal({ isOpen: false, feedbackId: '', email: '' })}
        onSave={(notes) => markAsProcessed(notesModal.feedbackId, notes)}
        isLoading={isProcessing}
        feedbackEmail={notesModal.email}
      />
    </div>
  );
}