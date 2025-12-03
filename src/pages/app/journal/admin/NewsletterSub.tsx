// =====================================================
// FINOTAUR NEWSLETTER ADMIN PANEL - v2.0.0
// =====================================================
// Place in: src/pages/app/journal/admin/NewsletterSub.tsx
//
// 🔥 v2.0.0 CHANGES:
// - FIXED: Uses newsletter_status instead of account_type
// - Newsletter is SEPARATE from Trading Journal subscription
// - Stats show: total_subscribers, active, trial, cancelled
// - Groups: All Subscribers, Active (Paid), In Trial, Custom
// - Red/Orange War Zone theme
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
  MinusSquare,
  Filter,
  Eye,
  Maximize2,
  Bot,
  Clock,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================
// TYPES - MATCHES SQL SCHEMA
// ============================================

// Matches get_newsletter_stats() SQL return
interface NewsletterStats {
  total_subscribers: number;   // active + trial
  active_subscribers: number;  // paid active
  trial_subscribers: number;   // in 7-day trial
  cancelled_subscribers: number;
  total_users: number;
}

// Matches get_newsletter_users() SQL return
interface NewsletterUser {
  id: string;
  email: string;
  display_name: string | null;
  account_type: 'free' | 'basic' | 'premium'; // Journal plan (for reference)
  // Newsletter specific fields
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
  generatedAt: string;
  processorInfo?: ProcessorInfo;
}

interface ProcessorInfo {
  version: string;
  type: string;
  agentCount: number;
}

type AudienceGroup = 'all_subscribers' | 'active' | 'trial' | 'custom';

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
}> = ({ preview, onClose, onSend, isSending, recipientCount, processorInfo }) => {
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
              <h2 className="text-lg font-semibold text-white">Newsletter Preview</h2>
              <p className="text-sm text-gray-500">
                Generated {new Date(preview.generatedAt).toLocaleString('he-IL')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {processorInfo && processorInfo.type === 'openai-agents-sdk' && (
              <div className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mr-2">
                <Bot className="w-3 h-3" />
                <span>{processorInfo.agentCount} Agents</span>
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

        {/* Email Preview */}
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
// JOURNAL PLAN BADGE (for reference only)
// ============================================
const JournalPlanBadge: React.FC<{ type: string }> = ({ type }) => {
  const config: Record<string, { bg: string; text: string; icon?: React.ElementType }> = {
    free: { bg: 'bg-gray-800', text: 'text-gray-400' },
    basic: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
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
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'trial' | 'cancelled' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState<AudienceGroup>('all_subscribers');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [processorInfo, setProcessorInfo] = useState<ProcessorInfo | null>(null);
  const pageSize = 15;

  // Load saved preview from localStorage
  useEffect(() => {
    const savedPreview = localStorage.getItem('newsletter_preview');
    const savedProcessorInfo = localStorage.getItem('newsletter_processor_info');
    
    if (savedPreview) {
      try {
        const parsed = JSON.parse(savedPreview);
        const age = Date.now() - new Date(parsed.generatedAt).getTime();
        if (age < 30 * 60 * 1000) {
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
  }, []);

  // Check for generation in progress
  useEffect(() => {
    const generatingTimestamp = localStorage.getItem('newsletter_generating');
    if (generatingTimestamp) {
      const startTime = parseInt(generatingTimestamp);
      const elapsed = Date.now() - startTime;
      
      if (elapsed < 5 * 60 * 1000) {
        setIsGeneratingPreview(true);
        toast.info('Newsletter generation in progress...');
        
        const checkInterval = setInterval(() => {
          const savedPreview = localStorage.getItem('newsletter_preview');
          const savedTimestamp = localStorage.getItem('newsletter_preview_timestamp');
          
          if (savedPreview && savedTimestamp) {
            const previewTime = parseInt(savedTimestamp);
            if (previewTime > startTime) {
              try {
                setPreview(JSON.parse(savedPreview));
                setIsGeneratingPreview(false);
                clearInterval(checkInterval);
                localStorage.removeItem('newsletter_generating');
                toast.success('Preview ready!');
              } catch {
                // ignore
              }
            }
          }
        }, 3000);
        
        const timeout = setTimeout(() => {
          clearInterval(checkInterval);
          setIsGeneratingPreview(false);
          localStorage.removeItem('newsletter_generating');
        }, 5 * 60 * 1000 - elapsed);
        
        return () => {
          clearInterval(checkInterval);
          clearTimeout(timeout);
        };
      } else {
        localStorage.removeItem('newsletter_generating');
      }
    }
  }, []);

  // Fetch stats - FIXED to match SQL
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

  // Fetch users - FIXED to use newsletter fields
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

  // Group counts - FIXED to use newsletter_status
  const groupCounts = useMemo(() => ({
    all_subscribers: userList.filter(u => u.newsletter_status === 'active' || u.newsletter_status === 'trial').length,
    active: userList.filter(u => u.newsletter_status === 'active').length,
    trial: userList.filter(u => u.newsletter_status === 'trial').length,
    custom: selectedIds.size,
  }), [userList, selectedIds.size]);

  // Get users for selected group
  const getGroupUsers = (group: AudienceGroup): NewsletterUser[] => {
    switch (group) {
      case 'all_subscribers':
        return userList.filter(u => u.newsletter_status === 'active' || u.newsletter_status === 'trial');
      case 'active':
        return userList.filter(u => u.newsletter_status === 'active');
      case 'trial':
        return userList.filter(u => u.newsletter_status === 'trial');
      case 'custom':
        return userList.filter(u => selectedIds.has(u.id));
      default:
        return [];
    }
  };

  // Update selection when group changes
  useEffect(() => {
    if (selectedGroup !== 'custom') {
      const groupUsers = getGroupUsers(selectedGroup);
      setSelectedIds(new Set(groupUsers.map(u => u.id)));
    }
  }, [selectedGroup, userList]);

  // Filter users for table
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

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedGroup('custom');
    const newSelection = new Set(selectedIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedIds(newSelection);
  };

  // Toggle newsletter status mutation
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

  // Generate preview
  const generatePreview = async () => {
    setIsGeneratingPreview(true);
    localStorage.setItem('newsletter_generating', Date.now().toString());
    
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/preview?force=true`);
      const data = await res.json();
      
      if (data.success) {
        setPreview(data.data);
        localStorage.setItem('newsletter_preview', JSON.stringify(data.data));
        localStorage.setItem('newsletter_preview_timestamp', Date.now().toString());
        
        if (data.data.processorInfo) {
          setProcessorInfo(data.data.processorInfo);
          localStorage.setItem('newsletter_processor_info', JSON.stringify(data.data.processorInfo));
        }
        
        setShowPreviewModal(true);
        toast.success('Preview generated!');
      } else {
        toast.error(data.error || 'Failed to generate preview');
      }
    } catch (err) {
      toast.error('Server connection error');
    } finally {
      setIsGeneratingPreview(false);
      localStorage.removeItem('newsletter_generating');
    }
  };

  // Clear preview
  const clearPreview = () => {
    setPreview(null);
    localStorage.removeItem('newsletter_preview');
    localStorage.removeItem('newsletter_preview_timestamp');
  };

  // Send test email
  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
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

  // Get only active/trial subscribers from selection
  const eligibleSelectedIds = useMemo(() => {
    return Array.from(selectedIds).filter(id => {
      const user = userList.find(u => u.id === id);
      return user?.newsletter_status === 'active' || user?.newsletter_status === 'trial';
    });
  }, [selectedIds, userList]);

  // Count ineligible in selection
  const ineligibleInSelection = useMemo(() => {
    return Array.from(selectedIds).filter(id => {
      const user = userList.find(u => u.id === id);
      return user?.newsletter_status !== 'active' && user?.newsletter_status !== 'trial';
    }).length;
  }, [selectedIds, userList]);

  // Send newsletter
  const sendNewsletter = async () => {
    if (eligibleSelectedIds.length === 0) {
      toast.error('No active subscribers selected');
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
          recipientIds: eligibleSelectedIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Newsletter sent to ${data.data.sentCount} recipients!`);
        queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] });
        clearPreview();
        setShowPreviewModal(false);
      } else {
        toast.error(data.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  // Get display name helper
  const getDisplayName = (user: NewsletterUser) => {
    return user.display_name || user.email.split('@')[0];
  };

  // Format trial days remaining
  const getTrialInfo = (user: NewsletterUser): string | null => {
    if (user.newsletter_status !== 'trial' || !user.newsletter_trial_ends_at) return null;
    const daysLeft = Math.ceil((new Date(user.newsletter_trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} days left` : 'Ending today';
  };

  // Error state
  if (usersError) {
    return (
      <div className="p-6 min-h-screen bg-[#080812]">
        <div className="bg-[#0d0d18] rounded-xl p-8 border border-red-500/30">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-white font-medium mb-2">Failed to load newsletter users</h3>
            <p className="text-gray-500 text-sm mb-4">
              Make sure the SQL migration has been run (newsletter-whop-migration-fixed.sql)
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
      {/* Preview Modal */}
      {showPreviewModal && preview && (
        <PreviewModal
          preview={preview}
          onClose={() => setShowPreviewModal(false)}
          onSend={sendNewsletter}
          isSending={isSending}
          recipientCount={eligibleSelectedIds.length}
          processorInfo={processorInfo}
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
          <p className="text-gray-600 mt-1 ml-14">Manage War Zone subscribers and send daily intelligence</p>
          
          {/* AI Agents Status */}
          {processorInfo && (
            <div className="mt-2 ml-14 flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                processorInfo.type === 'openai-agents-sdk' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {processorInfo.type === 'openai-agents-sdk' ? (
                  <><Bot className="w-3 h-3" />AI Agents Active</>
                ) : (
                  <><AlertCircle className="w-3 h-3" />Legacy Mode</>
                )}
              </div>
              <span className="text-xs text-gray-500">
                v{processorInfo.version} • {processorInfo.agentCount} agents
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats - FIXED labels */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              <span className="text-red-400 font-bold">{eligibleSelectedIds.length}</span>
              {ineligibleInSelection > 0 && (
                <span className="text-gray-500">({ineligibleInSelection} skipped)</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Group Selection - FIXED for Newsletter */}
          <div>
            <p className="text-sm text-gray-500 mb-3">Select Target Audience</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedGroup('all_subscribers')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  selectedGroup === 'all_subscribers'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-800 hover:border-gray-700 bg-[#080812]'
                }`}
              >
                <Users className={`w-4 h-4 ${selectedGroup === 'all_subscribers' ? 'text-red-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${selectedGroup === 'all_subscribers' ? 'text-red-400' : 'text-gray-400'}`}>
                  All Subscribers
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${selectedGroup === 'all_subscribers' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-500'}`}>
                  {groupCounts.all_subscribers}
                </span>
              </button>

              <button
                onClick={() => setSelectedGroup('active')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  selectedGroup === 'active'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-800 hover:border-gray-700 bg-[#080812]'
                }`}
              >
                <CheckCircle className={`w-4 h-4 ${selectedGroup === 'active' ? 'text-emerald-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${selectedGroup === 'active' ? 'text-emerald-400' : 'text-gray-400'}`}>
                  Active (Paid)
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${selectedGroup === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                  {groupCounts.active}
                </span>
              </button>

              <button
                onClick={() => setSelectedGroup('trial')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  selectedGroup === 'trial'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-800 hover:border-gray-700 bg-[#080812]'
                }`}
              >
                <Clock className={`w-4 h-4 ${selectedGroup === 'trial' ? 'text-blue-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${selectedGroup === 'trial' ? 'text-blue-400' : 'text-gray-400'}`}>
                  In Trial
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${selectedGroup === 'trial' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                  {groupCounts.trial}
                </span>
              </button>

              <button
                onClick={() => setSelectedGroup('custom')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  selectedGroup === 'custom'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-800 hover:border-gray-700 bg-[#080812]'
                }`}
              >
                <Filter className={`w-4 h-4 ${selectedGroup === 'custom' ? 'text-orange-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${selectedGroup === 'custom' ? 'text-orange-400' : 'text-gray-400'}`}>
                  Custom
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${selectedGroup === 'custom' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-500'}`}>
                  {groupCounts.custom}
                </span>
              </button>
            </div>
          </div>

          {/* Preview & Test Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-[#080812] rounded-xl p-4 border border-gray-800/50">
              <p className="text-sm text-gray-500 mb-3">Preview</p>
              {!preview ? (
                <button
                  onClick={generatePreview}
                  disabled={isGeneratingPreview}
                  className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition-colors text-white font-medium flex items-center justify-center gap-2"
                >
                  {isGeneratingPreview ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                  ) : (
                    <><Zap className="w-4 h-4" />Generate Preview</>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium truncate flex-1 pr-2">{preview.subject}</p>
                    <button onClick={clearPreview} className="p-1 hover:bg-gray-700 rounded flex-shrink-0">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400">✓ Preview ready</span>
                    <button
                      onClick={() => setShowPreviewModal(true)}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Full Preview
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 bg-[#080812] rounded-xl p-4 border border-gray-800/50">
              <p className="text-sm text-gray-500 mb-3">Test Email</p>
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

          {/* Warning for ineligible users */}
          {ineligibleInSelection > 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-400">
                {ineligibleInSelection} non-subscriber{ineligibleInSelection > 1 ? 's' : ''} will be skipped
              </p>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={sendNewsletter}
            disabled={isSending || eligibleSelectedIds.length === 0 || !preview}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-bold text-lg flex items-center justify-center gap-3"
          >
            {isSending ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Sending...</>
            ) : (
              <><Send className="w-5 h-5" />Send to {eligibleSelectedIds.length} Subscribers</>
            )}
          </button>

          {!preview && eligibleSelectedIds.length > 0 && (
            <p className="text-center text-sm text-gray-500">Generate preview before sending</p>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="space-y-4">
        {/* Filters */}
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
                  <button
                    onClick={() => {
                      if (selectedIds.size === filteredUsers.length && filteredUsers.length > 0) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(filteredUsers.map(u => u.id)));
                      }
                      setSelectedGroup('custom');
                    }}
                    className="p-1 hover:bg-gray-700 rounded"
                  >
                    {selectedIds.size === filteredUsers.length && filteredUsers.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-red-500" />
                    ) : selectedIds.size > 0 ? (
                      <MinusSquare className="w-4 h-4 text-red-500" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Newsletter</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Journal</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-red-500" />
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
                  const isSelected = selectedIds.has(user.id);
                  const isSubscriber = user.newsletter_status === 'active' || user.newsletter_status === 'trial';
                  const trialInfo = getTrialInfo(user);
                  
                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-[#080812]/50 transition-colors ${isSelected ? (isSubscriber ? 'bg-red-500/5' : 'bg-yellow-500/5') : ''}`}
                    >
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleUserSelection(user.id)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          {isSelected ? (
                            <CheckSquare className={`w-4 h-4 ${isSubscriber ? 'text-red-500' : 'text-yellow-500'}`} />
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

          {/* Pagination */}
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