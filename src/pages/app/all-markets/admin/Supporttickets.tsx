// src/pages/app/all-markets/admin/SupportTickets.tsx
// ============================================
// SUPPORT CENTER - Admin Only
// Tab 1: Support Tickets Management
// Tab 2: System Updates Management (with target groups)
// Tab 3: Churned Users
// ============================================

import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Clock,
  CheckCircle,
  User,
  Send,
  Mail,
  Sparkles,
  Zap,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Bell,
  Plus,
  Edit3,
  CheckCircle2,
  Info,
  Megaphone,
  Users,
  Eye,
  EyeOff,
  X,
  Save,
  UserX,
  Target,
  Crown,
  Sword,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// ==================== INTERFACES ====================

interface ChatMessage {
  id: string;
  type: 'customer' | 'admin' | 'system';
  content: string;
  timestamp: string;
  read?: boolean;
}

interface Ticket {
  id: string;
  user_id: string | null;
  user_email: string;
  user_name: string;
  subject: string;
  message: string;
  messages: ChatMessage[];
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  admin_response: string | null;
  admin_notes: string | null;
  is_read: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  last_customer_message_at: string | null;
  last_admin_message_at: string | null;
}

interface SystemUpdate {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'announcement';
  target_group: 'all' | 'trading_journal' | 'war_zone' | 'top_secret';
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  views_count: number;
}

interface ChurnedUser {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  subscription_tier: string | null;
  user_group: string | null;
  churned_at: string;
  reason: string | null;
  last_subscription_end: string | null;
  total_paid: number;
  notes: string | null;
}

type TabType = 'support' | 'updates' | 'churned';
type TargetGroup = 'all' | 'trading_journal' | 'war_zone' | 'top_secret';

const TARGET_GROUPS: { key: TargetGroup; label: string; icon: any; color: string }[] = [
  { key: 'all', label: 'Everyone', icon: Users, color: 'blue' },
  { key: 'trading_journal', label: 'Trading Journal', icon: Target, color: 'green' },
  { key: 'war_zone', label: 'WAR ZONE', icon: Sword, color: 'orange' },
  { key: 'top_secret', label: 'TOP SECRET', icon: Crown, color: 'purple' },
];

export default function SupportTickets() {
  // ==================== TAB STATE ====================
  const [activeTab, setActiveTab] = useState<TabType>('support');

  // ==================== SUPPORT STATE ====================
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [response, setResponse] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('awaiting');
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [responding, setResponding] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [awaitingCount, setAwaitingCount] = useState(0);
  const [ticketStats, setTicketStats] = useState({ total: 0, open: 0, avgResponseTime: '< 2 hrs' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseInputRef = useRef<HTMLTextAreaElement>(null);

  // ==================== UPDATES STATE ====================
  const [updates, setUpdates] = useState<SystemUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<SystemUpdate | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingUpdate, setDeletingUpdate] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<SystemUpdate['type']>('info');
  const [formTargetGroup, setFormTargetGroup] = useState<TargetGroup>('all');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [updateStats, setUpdateStats] = useState({
    total: 0,
    active: 0,
    pinned: 0,
    totalViews: 0,
  });
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({
    all: 0,
    trading_journal: 0,
    war_zone: 0,
    top_secret: 0,
  });

  // ==================== CHURNED USERS STATE ====================
  const [churnedUsers, setChurnedUsers] = useState<ChurnedUser[]>([]);
  const [loadingChurned, setLoadingChurned] = useState(true);
  const [churnedStats, setChurnedStats] = useState({
    total: 0,
    thisMonth: 0,
    totalLostRevenue: 0,
  });

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (activeTab === 'support') {
      loadTickets();
      loadUnreadCount();
      loadAwaitingCount();
      loadTicketStats();
    } else if (activeTab === 'updates') {
      loadUpdates();
      loadGroupCounts();
    } else if (activeTab === 'churned') {
      loadChurnedUsers();
    }
  }, [activeTab, statusFilter]);

  useEffect(() => {
    if (activeTab === 'support') {
      const channel = supabase
        .channel('admin-support')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'support_tickets',
          },
          (payload) => {
            console.log('Real-time update:', payload);
            loadTickets();
            loadUnreadCount();
            loadAwaitingCount();
            loadTicketStats();
            
            if (selectedTicket && payload.new && (payload.new as any).id === selectedTicket.id) {
              if (payload.eventType === 'DELETE') {
                setSelectedTicket(null);
                toast.info('Conversation was deleted');
              } else {
                setSelectedTicket(payload.new as Ticket);
              }
            }
            
            if (payload.eventType === 'INSERT') {
              const newTicket = payload.new as Ticket;
              toast.success(`New message from ${newTicket.user_name}`, {
                description: newTicket.subject,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeTab, selectedTicket?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages]);

  useEffect(() => {
    if (editingUpdate) {
      setFormTitle(editingUpdate.title);
      setFormContent(editingUpdate.content);
      setFormType(editingUpdate.type);
      setFormTargetGroup(editingUpdate.target_group || 'all');
      setFormIsPinned(editingUpdate.is_pinned);
    } else {
      resetForm();
    }
  }, [editingUpdate]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  function resetForm() {
    setFormTitle('');
    setFormContent('');
    setFormType('info');
    setFormTargetGroup('all');
    setFormIsPinned(false);
  }

  // ==================== SUPPORT FUNCTIONS ====================

  async function loadTicketStats() {
    try {
      const { data: allTickets } = await supabase
        .from('support_tickets')
        .select('*');
      
      const total = allTickets?.length || 0;
      const open = allTickets?.filter(t => t.status === 'open').length || 0;
      
      setTicketStats({
        total,
        open,
        avgResponseTime: '< 2 hrs'
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadUnreadCount() {
    try {
      const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress'])
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }

  async function loadAwaitingCount() {
    try {
      const { data: allTickets } = await supabase
        .from('support_tickets')
        .select('*')
        .in('status', ['open', 'in_progress']);
      
      if (!allTickets) {
        setAwaitingCount(0);
        return;
      }
      
      const awaiting = allTickets.filter(ticket => {
        if (!ticket.messages || !Array.isArray(ticket.messages) || ticket.messages.length === 0) {
          return true;
        }
        const lastMsg = ticket.messages[ticket.messages.length - 1];
        return lastMsg.type === 'customer';
      });
      
      setAwaitingCount(awaiting.length);
    } catch (error) {
      console.error('Error loading awaiting count:', error);
      setAwaitingCount(0);
    }
  }

  async function loadTickets() {
    try {
      setLoadingTickets(true);

      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (statusFilter === 'awaiting') {
        const { data: allTickets } = await query;
        
        const filtered = allTickets?.filter(ticket => {
          if (ticket.status === 'resolved' || ticket.status === 'closed') {
            return false;
          }
          
          if (!ticket.messages || !Array.isArray(ticket.messages) || ticket.messages.length === 0) {
            return true;
          }
          
          const lastMsg = ticket.messages[ticket.messages.length - 1];
          return lastMsg.type === 'customer';
        }) || [];
        
        setTickets(filtered);
        setLoadingTickets(false);
        return;
      } else if (statusFilter === 'responded') {
        const { data: allTickets } = await query;
        
        const filtered = allTickets?.filter(ticket => {
          if (ticket.status === 'resolved' || ticket.status === 'closed') {
            return false;
          }
          
          if (!ticket.messages || !Array.isArray(ticket.messages) || ticket.messages.length === 0) {
            return false;
          }
          
          const lastMsg = ticket.messages[ticket.messages.length - 1];
          return lastMsg.type === 'admin';
        }) || [];
        
        setTickets(filtered);
        setLoadingTickets(false);
        return;
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        toast.error(`Failed to load: ${error.message}`);
        throw error;
      }

      console.log('Loaded tickets:', data?.length || 0);
      setTickets(data || []);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  }

  async function handleSelectTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    
    setTimeout(() => {
      responseInputRef.current?.focus();
    }, 300);

    if (!ticket.is_read) {
      try {
        await supabase
          .from('support_tickets')
          .update({ is_read: true })
          .eq('id', ticket.id);

        console.log('Marked as read:', ticket.id);
        loadUnreadCount();
        loadTickets();
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  }

  async function handleRespond() {
    if (!selectedTicket || !response.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setResponding(true);

    try {
      console.log('Sending response...');

      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'admin',
        content: response.trim(),
        timestamp: new Date().toISOString(),
      };

      const existingMessages = Array.isArray(selectedTicket.messages) 
        ? selectedTicket.messages 
        : [];
      const updatedMessages = [...existingMessages, newMessage];

      const { data: updatedTicket, error } = await supabase
        .from('support_tickets')
        .update({
          messages: updatedMessages,
          admin_response: response.trim(),
          status: 'in_progress',
          is_read: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTicket.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      console.log('Response sent');
      toast.success('Response sent successfully');

      // Send email notification
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const emailResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-support-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`,
            },
            body: JSON.stringify({
              type: 'admin_response',
              record: updatedTicket,
            }),
          }
        );
        
        if (emailResponse.ok) {
          console.log('Email sent');
        }
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

      setResponse('');
      setSelectedTicket(updatedTicket);
      loadTickets();
      loadAwaitingCount();

    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setResponding(false);
    }
  }

  async function markAsResolved(ticketId: string) {
    try {
      await supabase
        .from('support_tickets')
        .update({ 
          status: 'resolved', 
          is_read: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      toast.success('Conversation resolved');
      loadTickets();
      loadTicketStats();
      loadAwaitingCount();
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to update status');
    }
  }

  async function handleDeleteTicket(ticketId: string) {
    if (!confirm('Delete this conversation permanently?\n\nThis cannot be undone!')) {
      return;
    }

    setDeletingTicket(true);

    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Conversation deleted');
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
      
      loadTickets();
      loadTicketStats();
      loadUnreadCount();
      loadAwaitingCount();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setDeletingTicket(false);
    }
  }

  // ==================== UPDATES FUNCTIONS ====================

  async function loadUpdates() {
    try {
      setLoadingUpdates(true);
      const { data, error } = await supabase
        .from('system_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUpdates(data || []);

      const total = data?.length || 0;
      const active = data?.filter(u => u.is_active).length || 0;
      const pinned = data?.filter(u => u.is_pinned).length || 0;
      const totalViews = data?.reduce((sum, u) => sum + (u.views_count || 0), 0) || 0;

      setUpdateStats({ total, active, pinned, totalViews });
    } catch (error: any) {
      console.error('Error loading updates:', error);
      toast.error('Failed to load updates');
    } finally {
      setLoadingUpdates(false);
    }
  }

  async function loadGroupCounts() {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .neq('role', 'admin');

      if (profiles) {
        const counts = {
          all: profiles.length,
          trading_journal: profiles.filter(p => 
            !p.subscription_tier || 
            !['WAR_ZONE', 'TOP_SECRET'].includes(p.subscription_tier)
          ).length,
          war_zone: profiles.filter(p => p.subscription_tier === 'WAR_ZONE').length,
          top_secret: profiles.filter(p => p.subscription_tier === 'TOP_SECRET').length,
        };
        setGroupCounts(counts);
      }
    } catch (error) {
      console.error('Error loading group counts:', error);
    }
  }

  async function handleSaveUpdate() {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    setSaving(true);

    try {
      if (editingUpdate) {
        const { error } = await supabase
          .from('system_updates')
          .update({
            title: formTitle.trim(),
            content: formContent.trim(),
            type: formType,
            target_group: formTargetGroup,
            is_pinned: formIsPinned,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUpdate.id);

        if (error) throw error;
        toast.success('Update saved successfully');
      } else {
        const { error } = await supabase
          .from('system_updates')
          .insert({
            title: formTitle.trim(),
            content: formContent.trim(),
            type: formType,
            target_group: formTargetGroup,
            is_pinned: formIsPinned,
            is_active: true,
            published_at: new Date().toISOString(),
            views_count: 0,
          });

        if (error) throw error;
        toast.success('Update published successfully');
      }

      setShowCreateModal(false);
      setEditingUpdate(null);
      resetForm();
      loadUpdates();
    } catch (error: any) {
      console.error('Error saving update:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(update: SystemUpdate) {
    try {
      const { error } = await supabase
        .from('system_updates')
        .update({
          is_active: !update.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id);

      if (error) throw error;
      toast.success(update.is_active ? 'Update hidden' : 'Update published');
      loadUpdates();
    } catch (error: any) {
      console.error('Error toggling update:', error);
      toast.error('Failed to update status');
    }
  }

  async function handleDeleteUpdate(id: string) {
    if (!confirm('Are you sure you want to delete this update?')) return;

    setDeletingUpdate(id);

    try {
      const { error } = await supabase
        .from('system_updates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Update deleted');
      loadUpdates();
    } catch (error: any) {
      console.error('Error deleting update:', error);
      toast.error('Failed to delete');
    } finally {
      setDeletingUpdate(null);
    }
  }

  // ==================== CHURNED USERS FUNCTIONS ====================

  async function loadChurnedUsers() {
    try {
      setLoadingChurned(true);
      const { data, error } = await supabase
        .from('churned_users')
        .select('*')
        .order('churned_at', { ascending: false });

      if (error) throw error;

      setChurnedUsers(data || []);

      const total = data?.length || 0;
      const now = new Date();
      const thisMonth = data?.filter(u => {
        const churnDate = new Date(u.churned_at);
        return churnDate.getMonth() === now.getMonth() && 
               churnDate.getFullYear() === now.getFullYear();
      }).length || 0;
      const totalLostRevenue = data?.reduce((sum, u) => sum + (u.total_paid || 0), 0) || 0;

      setChurnedStats({ total, thisMonth, totalLostRevenue });
    } catch (error: any) {
      console.error('Error loading churned users:', error);
      toast.error('Failed to load churned users');
    } finally {
      setLoadingChurned(false);
    }
  }

  async function handleDeleteChurnedUser(id: string) {
    if (!confirm('Remove this user from the churned list?')) return;

    try {
      const { error } = await supabase
        .from('churned_users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Removed from list');
      loadChurnedUsers();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to remove');
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  function getStatusBadge(status: string) {
    const config = {
      open: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Clock, label: 'New' },
      in_progress: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: MessageCircle, label: 'Active' },
      resolved: { bg: 'bg-green-500/10', text: 'text-green-400', icon: CheckCircle, label: 'Resolved' },
      closed: { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: CheckCircle, label: 'Closed' },
    };
    return config[status as keyof typeof config] || config.open;
  }

  function getTypeConfig(type: SystemUpdate['type']) {
    const configs = {
      info: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        icon: Info,
        label: 'Info',
      },
      success: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        icon: CheckCircle2,
        label: 'Success',
      },
      warning: {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        icon: AlertCircle,
        label: 'Warning',
      },
      announcement: {
        bg: 'bg-[#D4AF37]/10',
        border: 'border-[#D4AF37]/30',
        text: 'text-[#D4AF37]',
        icon: Megaphone,
        label: 'Announcement',
      },
    };
    return configs[type];
  }

  function getGroupConfig(group: TargetGroup) {
    const configs = {
      all: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Everyone', icon: Users },
      trading_journal: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Trading Journal', icon: Target },
      war_zone: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'WAR ZONE', icon: Sword },
      top_secret: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'TOP SECRET', icon: Crown },
    };
    return configs[group] || configs.all;
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? 'now' : `${minutes}m ago`;
    } else if (hours < 24) {
      return `${Math.floor(hours)}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  }

  function formatMessageTime(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit'
    });
  }

  function formatDate(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function ticketNeedsResponse(ticket: Ticket): boolean {
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      return false;
    }
    
    if (!ticket.messages || !Array.isArray(ticket.messages) || ticket.messages.length === 0) {
      return true;
    }
    
    const lastMsg = ticket.messages[ticket.messages.length - 1];
    return lastMsg.type === 'customer';
  }

  const filterCounts = {
    awaiting: awaitingCount,
    responded: tickets.filter(t => {
      if (t.status === 'resolved' || t.status === 'closed') return false;
      if (!t.messages || !Array.isArray(t.messages) || t.messages.length === 0) return false;
      const lastMsg = t.messages[t.messages.length - 1];
      return lastMsg.type === 'admin';
    }).length,
    all: ticketStats.total,
  };

  // ==================== RENDER ====================

  return (
    <AdminLayout
      title="Support Center"
      description="Manage support tickets, system updates, and user activity"
    >
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 bg-[#111111] border border-gray-800 rounded-xl p-2 w-fit">
        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'support'
              ? 'bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-black shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          Support Tickets
          {awaitingCount > 0 && (
            <span className={`ml-1 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
              activeTab === 'support' ? 'bg-black/20' : 'bg-red-500 text-white animate-pulse'
            }`}>
              {awaitingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('updates')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'updates'
              ? 'bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-black shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Bell className="h-4 w-4" />
          System Updates
          {updateStats.active > 0 && (
            <span className={`ml-1 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
              activeTab === 'updates' ? 'bg-black/20' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {updateStats.active}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('churned')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'churned'
              ? 'bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-black shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <UserX className="h-4 w-4" />
          Churned Users
          {churnedStats.total > 0 && (
            <span className={`ml-1 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
              activeTab === 'churned' ? 'bg-black/20' : 'bg-red-500/20 text-red-400'
            }`}>
              {churnedStats.total}
            </span>
          )}
        </button>
      </div>

      {/* ==================== SUPPORT TAB ==================== */}
      {activeTab === 'support' && (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total</p>
                  <p className="text-2xl font-bold text-white">{ticketStats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Open</p>
                  <p className="text-2xl font-bold text-white">{ticketStats.open}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Avg Response</p>
                  <p className="text-2xl font-bold text-white">{ticketStats.avgResponseTime}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Unread</p>
                  <p className="text-2xl font-bold text-white">{unreadCount}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-orange-500 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-400 mb-1 font-semibold">Awaiting Response</p>
                  <p className="text-2xl font-bold text-orange-400">{awaitingCount}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-400px)] min-h-[600px]">
            {/* Conversations List */}
            <div className="lg:col-span-1 bg-[#111111] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-800 bg-zinc-900/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-[#D4AF37]" />
                    <h2 className="text-lg font-bold text-white">Conversations</h2>
                  </div>
                  {unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 animate-pulse">
                      {unreadCount}
                    </Badge>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'awaiting', label: 'Awaiting Response', count: awaitingCount },
                    { key: 'responded', label: 'Responded', count: filterCounts.responded },
                    { key: 'all', label: 'All', count: filterCounts.all },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === tab.key
                          ? 'bg-[#D4AF37] text-black shadow-lg'
                          : 'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-base">{tab.count}</span>
                        <span className="text-[10px] opacity-80 leading-tight">{tab.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingTickets ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                    <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No conversations</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {statusFilter === 'awaiting' && 'All caught up!'}
                      {statusFilter === 'responded' && 'No pending responses'}
                      {statusFilter === 'all' && 'No conversations yet'}
                    </p>
                  </div>
                ) : (
                  tickets.map((ticket) => {
                    const statusBadge = getStatusBadge(ticket.status);
                    const StatusIcon = statusBadge.icon;
                    const isUnread = !ticket.is_read;
                    const needsResponse = ticketNeedsResponse(ticket);

                    return (
                      <button
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className={`w-full p-4 border-b border-gray-800 hover:bg-zinc-900/50 transition-all text-left relative group ${
                          selectedTicket?.id === ticket.id ? 'bg-zinc-900 border-l-4 border-l-[#D4AF37]' : ''
                        } ${isUnread ? 'bg-blue-500/5' : ''}`}
                      >
                        {isUnread && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                        
                        {needsResponse && (
                          <div className="absolute left-2 top-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        )}

                        <div className="flex items-start justify-between mb-2 ml-4">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E5C158] flex items-center justify-center flex-shrink-0 shadow-lg">
                              <span className="text-black text-sm font-bold">
                                {ticket.user_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-sm truncate ${isUnread ? 'text-white font-bold' : 'text-white font-medium'}`}>
                                {ticket.user_name}
                              </h3>
                              <p className="text-xs text-gray-500 truncate">{ticket.user_email}</p>
                            </div>
                          </div>
                          <Badge className={`${statusBadge.bg} ${statusBadge.text} text-[9px] px-1.5 py-0 h-5 flex-shrink-0`}>
                            <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                            {statusBadge.label}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2 ml-4 leading-relaxed">
                          {ticket.subject}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-gray-600 ml-4">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-3 w-3" />
                            <span>{ticket.message_count || 0} msgs</span>
                            {needsResponse && statusFilter !== 'awaiting' && (
                              <>
                                <span>•</span>
                                <span className="text-orange-400 font-semibold">Needs reply</span>
                              </>
                            )}
                          </div>
                          <span>{formatTime(ticket.updated_at)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat View */}
            <div className="lg:col-span-2 bg-[#111111] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
              {selectedTicket ? (
                <>
                  <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-zinc-900/50 to-zinc-900/30 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E5C158] flex items-center justify-center text-black font-bold text-lg shadow-lg">
                          {selectedTicket.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-white font-bold">{selectedTicket.user_name}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Mail className="h-3 w-3" />
                            <span>{selectedTicket.user_email}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(selectedTicket.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedTicket.status !== 'resolved' && (
                          <Button
                            onClick={() => markAsResolved(selectedTicket.id)}
                            className="bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-xs h-9"
                            size="sm"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => handleDeleteTicket(selectedTicket.id)}
                          disabled={deletingTicket}
                          className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs h-9"
                          size="sm"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {deletingTicket ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-3 px-3 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <p className="text-xs text-gray-400 mb-0.5">Subject</p>
                      <p className="text-sm text-white font-medium">{selectedTicket.subject}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
                    {Array.isArray(selectedTicket.messages) && selectedTicket.messages.length > 0 ? (
                      selectedTicket.messages.map((msg, idx) => (
                        <div
                          key={msg.id || idx}
                          className={`flex ${msg.type === 'customer' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                          <div className="flex items-end gap-2 max-w-[75%]">
                            {msg.type === 'customer' && (
                              <div className="h-8 w-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mb-1">
                                <User className="h-4 w-4 text-[#D4AF37]" />
                              </div>
                            )}
                            
                            <div>
                              {msg.type === 'admin' && (
                                <div className="flex items-center gap-2 mb-1 justify-end">
                                  <span className="text-xs text-gray-500">You</span>
                                </div>
                              )}
                              
                              <div
                                className={`rounded-2xl px-4 py-3 shadow-lg ${
                                  msg.type === 'customer'
                                    ? 'bg-zinc-900 text-white border border-zinc-800'
                                    : msg.type === 'admin'
                                    ? 'bg-gradient-to-br from-[#D4AF37] to-[#E5C158] text-black'
                                    : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                <span className={`text-[10px] mt-2 block ${
                                  msg.type === 'customer' ? 'text-gray-500' : msg.type === 'admin' ? 'text-black/60' : 'text-blue-400/60'
                                }`}>
                                  {formatMessageTime(msg.timestamp)}
                                </span>
                              </div>
                            </div>
                            
                            {msg.type === 'admin' && (
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E5C158] flex items-center justify-center flex-shrink-0 mb-1 shadow-lg">
                                <Sparkles className="h-4 w-4 text-black" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <p className="text-sm">No messages yet</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-gray-800 bg-zinc-900/50 flex-shrink-0">
                    <div className="mb-3">
                      <Textarea
                        ref={responseInputRef}
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Type your response..."
                        className="bg-zinc-800 border-zinc-700 text-white min-h-[100px] resize-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl"
                        disabled={responding}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleRespond();
                          }
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Customer will receive email
                      </p>
                      <Button
                        onClick={handleRespond}
                        disabled={!response.trim() || responding}
                        className="bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:from-[#E5C158] hover:to-[#D4AF37] text-black font-medium px-6 shadow-lg disabled:opacity-50 h-10"
                      >
                        {responding ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Response
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <p className="text-[10px] text-gray-600 mt-2 text-center">
                      Press Ctrl+Enter to send
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-4 shadow-inner">
                    <MessageCircle className="h-12 w-12 opacity-30" />
                  </div>
                  <p className="text-lg font-semibold mb-2">No conversation selected</p>
                  <p className="text-sm text-gray-500 text-center max-w-xs">
                    Choose a conversation from the list to view and respond
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== UPDATES TAB ==================== */}
      {activeTab === 'updates' && (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Updates</p>
                  <p className="text-2xl font-bold text-white">{updateStats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Active</p>
                  <p className="text-2xl font-bold text-white">{updateStats.active}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Pinned</p>
                  <p className="text-2xl font-bold text-white">{updateStats.pinned}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                  <Megaphone className="h-6 w-6 text-[#D4AF37]" />
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Views</p>
                  <p className="text-2xl font-bold text-white">{updateStats.totalViews}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Group Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {TARGET_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div
                  key={group.key}
                  className="bg-[#111111] border border-gray-800 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    group.color === 'blue' ? 'bg-blue-500/10' :
                    group.color === 'green' ? 'bg-green-500/10' :
                    group.color === 'orange' ? 'bg-orange-500/10' :
                    'bg-purple-500/10'
                  }`}>
                    <GroupIcon className={`h-5 w-5 ${
                      group.color === 'blue' ? 'text-blue-400' :
                      group.color === 'green' ? 'text-green-400' :
                      group.color === 'orange' ? 'text-orange-400' :
                      'text-purple-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{group.label}</p>
                    <p className="text-lg font-bold text-white">{groupCounts[group.key] || 0}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E5C158] flex items-center justify-center">
                <Bell className="h-5 w-5 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">System Updates</h2>
                <p className="text-xs text-gray-400">Manage announcements shown to users</p>
              </div>
            </div>

            <Button
              onClick={() => {
                setEditingUpdate(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:from-[#E5C158] hover:to-[#D4AF37] text-black font-medium shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Update
            </Button>
          </div>

          {/* Updates List */}
          <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
            {loadingUpdates ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
              </div>
            ) : updates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Bell className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No updates yet</p>
                <p className="text-xs text-gray-500 mt-1">Create your first announcement</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {updates.map((update) => {
                  const typeConfig = getTypeConfig(update.type);
                  const TypeIcon = typeConfig.icon;
                  const groupConfig = getGroupConfig(update.target_group || 'all');
                  const GroupIcon = groupConfig.icon;

                  return (
                    <div
                      key={update.id}
                      className={`p-5 hover:bg-zinc-900/50 transition-all ${
                        !update.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`h-10 w-10 rounded-xl ${typeConfig.bg} border ${typeConfig.border} flex items-center justify-center flex-shrink-0`}
                        >
                          <TypeIcon className={`h-5 w-5 ${typeConfig.text}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-white font-semibold">{update.title}</h3>
                            <Badge className={`${typeConfig.bg} ${typeConfig.text} text-[10px] px-2`}>
                              {typeConfig.label}
                            </Badge>
                            <Badge className={`${groupConfig.bg} ${groupConfig.text} text-[10px] px-2 flex items-center gap-1`}>
                              <GroupIcon className="h-3 w-3" />
                              {groupConfig.label}
                            </Badge>
                            {update.is_pinned && (
                              <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] px-2">
                                Pinned
                              </Badge>
                            )}
                            {!update.is_active && (
                              <Badge className="bg-gray-500/10 text-gray-400 text-[10px] px-2">
                                Hidden
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-2 mb-2">{update.content}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(update.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {update.views_count || 0} views
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            onClick={() => handleToggleActive(update)}
                            variant="ghost"
                            size="sm"
                            className={`h-9 w-9 p-0 ${
                              update.is_active
                                ? 'text-green-400 hover:bg-green-500/10'
                                : 'text-gray-400 hover:bg-gray-500/10'
                            }`}
                            title={update.is_active ? 'Hide' : 'Publish'}
                          >
                            {update.is_active ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            onClick={() => {
                              setEditingUpdate(update);
                              setShowCreateModal(true);
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-blue-400 hover:bg-blue-500/10"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() => handleDeleteUpdate(update.id)}
                            disabled={deletingUpdate === update.id}
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-red-400 hover:bg-red-500/10"
                            title="Delete"
                          >
                            {deletingUpdate === update.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== CHURNED USERS TAB ==================== */}
      {activeTab === 'churned' && (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Churned</p>
                  <p className="text-2xl font-bold text-white">{churnedStats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <UserX className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">This Month</p>
                  <p className="text-2xl font-bold text-white">{churnedStats.thisMonth}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Revenue Lost</p>
                  <p className="text-2xl font-bold text-white">${churnedStats.totalLostRevenue.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Churned Users List */}
          <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-400" />
                <h2 className="text-lg font-bold text-white">Users Who Left</h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">Track and analyze user churn</p>
            </div>

            {loadingChurned ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
              </div>
            ) : churnedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <CheckCircle className="h-12 w-12 mb-3 opacity-30 text-green-400" />
                <p className="text-sm font-medium">No churned users</p>
                <p className="text-xs text-gray-500 mt-1">Great! All your users are staying</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-900/50 border-b border-gray-800">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">User</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Group</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Tier</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Reason</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Paid</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {churnedUsers.map((user) => {
                      const groupConfig = user.user_group ? getGroupConfig(user.user_group as TargetGroup) : null;
                      
                      return (
                        <tr key={user.id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <span className="text-red-400 text-sm font-bold">
                                  {(user.full_name || user.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm text-white font-medium">
                                  {user.full_name || 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {groupConfig ? (
                              <Badge className={`${groupConfig.bg} ${groupConfig.text} text-[10px] px-2`}>
                                {groupConfig.label}
                              </Badge>
                            ) : (
                              <span className="text-gray-500 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-300">
                              {user.subscription_tier || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className="bg-red-500/10 text-red-400 text-[10px] px-2">
                              {user.reason || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-xs text-gray-400">
                              {formatDate(user.churned_at)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-green-400 font-medium">
                              ${(user.total_paid || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              onClick={() => handleDeleteChurnedUser(user.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                              title="Remove from list"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-[#111111]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E5C158] flex items-center justify-center">
                  {editingUpdate ? (
                    <Edit3 className="h-5 w-5 text-black" />
                  ) : (
                    <Plus className="h-5 w-5 text-black" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingUpdate ? 'Edit Update' : 'Create New Update'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {editingUpdate ? 'Modify this announcement' : 'This will be shown to selected users'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingUpdate(null);
                }}
                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Title</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Platform Update v2.5"
                  className="bg-zinc-900 border-zinc-700 text-white focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Content</label>
                <Textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write your announcement message..."
                  className="bg-zinc-900 border-zinc-700 text-white min-h-[120px] focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['info', 'success', 'warning', 'announcement'] as const).map((type) => {
                    const config = getTypeConfig(type);
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setFormType(type)}
                        className={`p-3 rounded-xl border transition-all ${
                          formType === type
                            ? `${config.bg} ${config.border} ${config.text}`
                            : 'bg-zinc-900 border-zinc-700 text-gray-400 hover:border-zinc-600'
                        }`}
                      >
                        <Icon className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-[10px] font-medium">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Group Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Target Group</label>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_GROUPS.map((group) => {
                    const GroupIcon = group.icon;
                    const isSelected = formTargetGroup === group.key;
                    const colorClasses = {
                      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
                      green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
                      orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
                      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
                    };
                    const colors = colorClasses[group.color as keyof typeof colorClasses];
                    
                    return (
                      <button
                        key={group.key}
                        onClick={() => setFormTargetGroup(group.key)}
                        className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                          isSelected
                            ? `${colors.bg} ${colors.border} ${colors.text}`
                            : 'bg-zinc-900 border-zinc-700 text-gray-400 hover:border-zinc-600'
                        }`}
                      >
                        <GroupIcon className={`h-5 w-5 ${isSelected ? colors.text : ''}`} />
                        <div className="text-left">
                          <p className="text-sm font-medium">{group.label}</p>
                          <p className="text-[10px] opacity-70">{groupCounts[group.key] || 0} users</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-700">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-[#D4AF37]" />
                  <div>
                    <p className="text-sm text-white font-medium">Pin this update</p>
                    <p className="text-xs text-gray-400">Pinned updates appear at the top</p>
                  </div>
                </div>
                <button
                  onClick={() => setFormIsPinned(!formIsPinned)}
                  className={`h-6 w-11 rounded-full transition-colors ${
                    formIsPinned ? 'bg-[#D4AF37]' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white shadow-md transform transition-transform ${
                      formIsPinned ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-800 sticky bottom-0 bg-[#111111]">
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingUpdate(null);
                }}
                variant="ghost"
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveUpdate}
                disabled={saving || !formTitle.trim() || !formContent.trim()}
                className="bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:from-[#E5C158] hover:to-[#D4AF37] text-black font-medium shadow-lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    {editingUpdate ? (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Publish Update
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}