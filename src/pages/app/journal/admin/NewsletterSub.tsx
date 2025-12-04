// =====================================================
// FINOTAUR NEWSLETTER ADMIN PANEL - v2.2.1
// =====================================================
// Place in: src/pages/app/journal/admin/NewsletterSub.tsx
//
// 🔥 v2.2.1 CHANGES:
// - Admin notes field (English UI)
// - Last sent status display
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
  Star,
  Lock,
  MessageSquare,
  Calendar,
  History,
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
  generatedAt: string;
  processorInfo?: ProcessorInfo;
}

interface ProcessorInfo {
  version: string;
  type: string;
  agentCount: number;
}

interface LastSentInfo {
  sent_at: string;
  recipient_count: number;
  subject: string;
  segments: string[];
  admin_note?: string;
}

type AudienceSegment = 
  | 'newsletter_active'
  | 'newsletter_trial'
  | 'journal_basic'
  | 'journal_premium';

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

  const sentDate = new Date(lastSent.sent_at);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let timeAgo = '';
  if (diffHours < 1) {
    timeAgo = 'Less than an hour ago';
  } else if (diffHours < 24) {
    timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    timeAgo = 'Yesterday';
  } else {
    timeAgo = `${diffDays} days ago`;
  }

  const getSegmentLabel = (segment: string) => {
    switch (segment) {
      case 'newsletter_active': return 'Paid';
      case 'newsletter_trial': return 'Trial';
      case 'journal_basic': return 'Basic';
      case 'journal_premium': return 'Premium';
      default: return segment;
    }
  };

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
            {sentDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
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

        {lastSent.segments && lastSent.segments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lastSent.segments.map((segment) => (
              <span 
                key={segment}
                className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400"
              >
                {getSegmentLabel(segment)}
              </span>
            ))}
          </div>
        )}

        {lastSent.admin_note && (
          <div className="mt-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <p className="text-xs text-orange-400 mb-1 font-medium">Admin Note:</p>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{lastSent.admin_note}</p>
          </div>
        )}
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#080812] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Eye className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Newsletter Preview</h2>
              <p className="text-sm text-gray-500">
                Generated {new Date(preview.generatedAt).toLocaleString('en-US')}
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

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-[#080812] rounded-b-2xl">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              <span className="text-white font-medium">{preview.sections.length}</span> sections
            </div>
            <div className="w-px h-4 bg-gray-700" />
            <div className="text-sm text-gray-500">
              Recipients: <span className="text-red-400 font-medium">{recipientCount}</span>
            </div>
            {adminNote && (
              <>
                <div className="w-px h-4 bg-gray-700" />
                <div className="flex items-center gap-1 text-sm text-orange-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>With note</span>
                </div>
              </>
            )}
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
// AUDIENCE SEGMENT BUTTON
// ============================================
const AudienceSegmentButton: React.FC<{
  segment: AudienceSegment;
  label: string;
  count: number;
  icon: React.ElementType;
  isSelected: boolean;
  isLocked?: boolean;
  colorScheme: 'red' | 'blue' | 'cyan' | 'gold';
  onToggle: () => void;
}> = ({ segment, label, count, icon: Icon, isSelected, isLocked, colorScheme, onToggle }) => {
  const colors = {
    red: {
      selected: 'border-red-500 bg-red-500/10',
      icon: 'text-red-400',
      text: 'text-red-400',
      badge: 'bg-red-500/20 text-red-400',
    },
    blue: {
      selected: 'border-blue-500 bg-blue-500/10',
      icon: 'text-blue-400',
      text: 'text-blue-400',
      badge: 'bg-blue-500/20 text-blue-400',
    },
    cyan: {
      selected: 'border-cyan-500 bg-cyan-500/10',
      icon: 'text-cyan-400',
      text: 'text-cyan-400',
      badge: 'bg-cyan-500/20 text-cyan-400',
    },
    gold: {
      selected: 'border-[#C9A646] bg-[#C9A646]/10',
      icon: 'text-[#C9A646]',
      text: 'text-[#C9A646]',
      badge: 'bg-[#C9A646]/20 text-[#C9A646]',
    },
  };

  const scheme = colors[colorScheme];

  return (
    <button
      onClick={onToggle}
      disabled={isLocked}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
        isSelected
          ? scheme.selected
          : 'border-gray-800 hover:border-gray-700 bg-[#080812]'
      } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {isLocked && (
        <div className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 rounded-full">
          <Lock className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      
      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
        isSelected 
          ? `${scheme.selected} border-current` 
          : 'border-gray-600 bg-transparent'
      }`}>
        {isSelected && <CheckCircle className={`w-3 h-3 ${scheme.icon}`} />}
      </div>

      <Icon className={`w-4 h-4 ${isSelected ? scheme.icon : 'text-gray-500'}`} />
      <span className={`text-sm font-medium ${isSelected ? scheme.text : 'text-gray-400'}`}>
        {label}
      </span>
      <span className={`text-xs px-1.5 py-0.5 rounded ${
        isSelected ? scheme.badge : 'bg-gray-800 text-gray-500'
      }`}>
        {count}
      </span>
    </button>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const NewsletterSub: React.FC = () => {
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'trial' | 'cancelled' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [selectedSegments, setSelectedSegments] = useState<Set<AudienceSegment>>(
    new Set(['newsletter_active', 'newsletter_trial'])
  );
  const [useCustomSelection, setUseCustomSelection] = useState(false);
  const [customSelectedIds, setCustomSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [processorInfo, setProcessorInfo] = useState<ProcessorInfo | null>(null);
  const [adminNote, setAdminNote] = useState('');
  
  const pageSize = 15;

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
              } catch {}
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

  const segmentCounts = useMemo(() => ({
    newsletter_active: userList.filter(u => u.newsletter_status === 'active').length,
    newsletter_trial: userList.filter(u => u.newsletter_status === 'trial').length,
    journal_basic: userList.filter(u => u.account_type === 'basic').length,
    journal_premium: userList.filter(u => u.account_type === 'premium').length,
  }), [userList]);

  const getSegmentUsers = (segment: AudienceSegment): NewsletterUser[] => {
    switch (segment) {
      case 'newsletter_active':
        return userList.filter(u => u.newsletter_status === 'active');
      case 'newsletter_trial':
        return userList.filter(u => u.newsletter_status === 'trial');
      case 'journal_basic':
        return userList.filter(u => u.account_type === 'basic');
      case 'journal_premium':
        return userList.filter(u => u.account_type === 'premium');
      default:
        return [];
    }
  };

  const selectedUserIds = useMemo(() => {
    if (useCustomSelection) {
      return customSelectedIds;
    }
    
    const ids = new Set<string>();
    selectedSegments.forEach(segment => {
      getSegmentUsers(segment).forEach(user => {
        ids.add(user.id);
      });
    });
    return ids;
  }, [selectedSegments, userList, useCustomSelection, customSelectedIds]);

  const eligibleSelectedIds = useMemo(() => {
    return Array.from(selectedUserIds).filter(id => {
      const user = userList.find(u => u.id === id);
      if (!user) return false;
      
      if (user.newsletter_status === 'active' || user.newsletter_status === 'trial') {
        return true;
      }
      
      if (selectedSegments.has('journal_basic') && user.account_type === 'basic') {
        return true;
      }
      if (selectedSegments.has('journal_premium') && user.account_type === 'premium') {
        return true;
      }
      
      return false;
    });
  }, [selectedUserIds, userList, selectedSegments]);

  const toggleSegment = (segment: AudienceSegment) => {
    if (segment === 'newsletter_active' || segment === 'newsletter_trial') return;
    
    setUseCustomSelection(false);
    const newSegments = new Set(selectedSegments);
    if (newSegments.has(segment)) {
      newSegments.delete(segment);
    } else {
      newSegments.add(segment);
    }
    setSelectedSegments(newSegments);
  };

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

  const clearPreview = () => {
    setPreview(null);
    localStorage.removeItem('newsletter_preview');
    localStorage.removeItem('newsletter_preview_timestamp');
  };

  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    try {
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
    if (eligibleSelectedIds.length === 0) {
      toast.error('No eligible recipients selected');
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
          segments: Array.from(selectedSegments),
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

  const isUserSelected = (userId: string) => {
    if (useCustomSelection) {
      return customSelectedIds.has(userId);
    }
    return selectedUserIds.has(userId);
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
      {showPreviewModal && preview && (
        <PreviewModal
          preview={preview}
          onClose={() => setShowPreviewModal(false)}
          onSend={sendNewsletter}
          isSending={isSending}
          recipientCount={eligibleSelectedIds.length}
          processorInfo={processorInfo}
          adminNote={adminNote}
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
              <span className="text-gray-600">users</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Multi-Select Audience Segments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Select Target Audiences</p>
              <p className="text-xs text-gray-600">
                <Lock className="w-3 h-3 inline mr-1" />
                Subscribers & Trial always included
              </p>
            </div>
            
            <div className="mb-4">
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Newsletter Subscribers</p>
              <div className="flex flex-wrap gap-2">
                <AudienceSegmentButton
                  segment="newsletter_active"
                  label="Paid Subscribers"
                  count={segmentCounts.newsletter_active}
                  icon={CheckCircle}
                  isSelected={selectedSegments.has('newsletter_active')}
                  isLocked={true}
                  colorScheme="red"
                  onToggle={() => toggleSegment('newsletter_active')}
                />
                <AudienceSegmentButton
                  segment="newsletter_trial"
                  label="Trial Users"
                  count={segmentCounts.newsletter_trial}
                  icon={Clock}
                  isSelected={selectedSegments.has('newsletter_trial')}
                  isLocked={true}
                  colorScheme="blue"
                  onToggle={() => toggleSegment('newsletter_trial')}
                />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Add Journal Plan Users</p>
              <div className="flex flex-wrap gap-2">
                <AudienceSegmentButton
                  segment="journal_basic"
                  label="Basic Plan"
                  count={segmentCounts.journal_basic}
                  icon={Star}
                  isSelected={selectedSegments.has('journal_basic')}
                  colorScheme="cyan"
                  onToggle={() => toggleSegment('journal_basic')}
                />
                <AudienceSegmentButton
                  segment="journal_premium"
                  label="Premium Plan"
                  count={segmentCounts.journal_premium}
                  icon={Crown}
                  isSelected={selectedSegments.has('journal_premium')}
                  colorScheme="gold"
                  onToggle={() => toggleSegment('journal_premium')}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800/50">
              <button
                onClick={() => {
                  if (!useCustomSelection) {
                    const ids = new Set<string>();
                    selectedSegments.forEach(segment => {
                      getSegmentUsers(segment).forEach(user => {
                        ids.add(user.id);
                      });
                    });
                    setCustomSelectedIds(ids);
                  }
                  setUseCustomSelection(!useCustomSelection);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  useCustomSelection
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-800 hover:border-gray-700 bg-[#080812]'
                }`}
              >
                <Filter className={`w-4 h-4 ${useCustomSelection ? 'text-orange-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${useCustomSelection ? 'text-orange-400' : 'text-gray-400'}`}>
                  Custom Selection Mode
                </span>
                {useCustomSelection && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                    {customSelectedIds.size} selected
                  </span>
                )}
              </button>
              {useCustomSelection && (
                <p className="text-xs text-gray-500 mt-2 ml-1">
                  Use the table below to manually select/deselect individual users
                </p>
              )}
            </div>
          </div>

          {/* Selected Segments Summary */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[#080812] rounded-xl border border-gray-800/50">
            <span className="text-sm text-gray-500">Sending to:</span>
            {selectedSegments.has('newsletter_active') && (
              <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium">
                Paid Subscribers
              </span>
            )}
            {selectedSegments.has('newsletter_trial') && (
              <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium">
                Trial Users
              </span>
            )}
            {selectedSegments.has('journal_basic') && (
              <span className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                Basic Plan
              </span>
            )}
            {selectedSegments.has('journal_premium') && (
              <span className="px-2 py-1 rounded-lg bg-[#C9A646]/20 text-[#C9A646] text-xs font-medium">
                Premium Plan
              </span>
            )}
            {useCustomSelection && (
              <span className="px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-medium">
                + Custom Overrides
              </span>
            )}
          </div>

          {/* Admin Note Section - ENGLISH */}
          <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-orange-400" />
              <p className="text-sm font-medium text-white">Admin Note (Optional)</p>
            </div>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add a personal message that will appear at the beginning of the email... (e.g., important update, special announcement)"
              className="w-full px-4 py-3 bg-[#0d0d18] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none text-sm"
              rows={3}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-600">
                The note will appear at the beginning of the email, before the newsletter content
              </p>
              <p className="text-xs text-gray-500">
                {adminNote.length}/500
              </p>
            </div>
            {adminNote && (
              <div className="mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-xs text-orange-400 mb-1">Preview:</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{adminNote}</p>
              </div>
            )}
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

          {/* Send Button */}
          <button
            onClick={sendNewsletter}
            disabled={isSending || eligibleSelectedIds.length === 0 || !preview}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-bold text-lg flex items-center justify-center gap-3"
          >
            {isSending ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Sending...</>
            ) : (
              <><Send className="w-5 h-5" />Send to {eligibleSelectedIds.length} Recipients</>
            )}
          </button>

          {!preview && eligibleSelectedIds.length > 0 && (
            <p className="text-center text-sm text-gray-500">Generate preview before sending</p>
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

        <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50 bg-[#080812]">
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase w-12">
                  <button
                    onClick={() => {
                      if (!useCustomSelection) {
                        setUseCustomSelection(true);
                        setCustomSelectedIds(new Set(selectedUserIds));
                      }
                      
                      if (customSelectedIds.size === filteredUsers.length && filteredUsers.length > 0) {
                        setCustomSelectedIds(new Set());
                      } else {
                        setCustomSelectedIds(new Set(filteredUsers.map(u => u.id)));
                      }
                    }}
                    className="p-1 hover:bg-gray-700 rounded"
                  >
                    {customSelectedIds.size === filteredUsers.length && filteredUsers.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-red-500" />
                    ) : customSelectedIds.size > 0 ? (
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
                  const isSelected = isUserSelected(user.id);
                  const isSubscriber = user.newsletter_status === 'active' || user.newsletter_status === 'trial';
                  const trialInfo = getTrialInfo(user);
                  
                  let rowBgClass = '';
                  if (isSelected) {
                    if (user.newsletter_status === 'active') {
                      rowBgClass = 'bg-red-500/5';
                    } else if (user.newsletter_status === 'trial') {
                      rowBgClass = 'bg-blue-500/5';
                    } else if (user.account_type === 'premium') {
                      rowBgClass = 'bg-[#C9A646]/5';
                    } else if (user.account_type === 'basic') {
                      rowBgClass = 'bg-cyan-500/5';
                    }
                  }
                  
                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-[#080812]/50 transition-colors ${rowBgClass}`}
                    >
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleUserSelection(user.id)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          {isSelected ? (
                            <CheckSquare className={`w-4 h-4 ${
                              user.newsletter_status === 'active' ? 'text-red-500' :
                              user.newsletter_status === 'trial' ? 'text-blue-500' :
                              user.account_type === 'premium' ? 'text-[#C9A646]' :
                              user.account_type === 'basic' ? 'text-cyan-500' :
                              'text-orange-500'
                            }`} />
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