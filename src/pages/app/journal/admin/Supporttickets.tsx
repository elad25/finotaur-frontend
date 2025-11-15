// src/pages/app/journal/admin/SupportTickets.tsx
// ============================================
// UPDATED FILTERS:
// - Awaiting Response (needs reply)
// - Responded (admin already replied)
// - All (everything)
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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [response, setResponse] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('awaiting');
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [awaitingCount, setAwaitingCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, open: 0, avgResponseTime: '< 2 hrs' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadTickets();
    loadUnreadCount();
    loadAwaitingCount();
    loadStats();

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
          console.log('🔄 Real-time update:', payload);
          loadTickets();
          loadUnreadCount();
          loadAwaitingCount();
          loadStats();
          
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
  }, [statusFilter]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  async function loadStats() {
    try {
      const { data: allTickets } = await supabase
        .from('support_tickets')
        .select('*');
      
      const total = allTickets?.length || 0;
      const open = allTickets?.filter(t => t.status === 'open').length || 0;
      
      setStats({
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
      
      // Count tickets where last message is from customer
      const awaiting = allTickets.filter(ticket => {
        if (!ticket.messages || !Array.isArray(ticket.messages) || ticket.messages.length === 0) {
          return true; // No messages = needs response
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
      setLoading(true);

      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      // Filter logic
      if (statusFilter === 'awaiting') {
        // Show only tickets where last message is from customer
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
        setLoading(false);
        return;
      } else if (statusFilter === 'responded') {
        // Show only tickets where last message is from admin
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
        setLoading(false);
        return;
      }
      
      // 'all' - show everything
      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        toast.error(`Failed to load: ${error.message}`);
        throw error;
      }

      console.log('📋 Loaded tickets:', data?.length || 0);
      setTickets(data || []);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
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

        console.log('✅ Marked as read:', ticket.id);
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
      console.log('📤 Sending response...');

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

      console.log('✅ Response sent');
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
          console.log('✅ Email sent');
        }
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

      setResponse('');
      setSelectedTicket(updatedTicket);
      loadTickets();
      loadAwaitingCount();

    } catch (error: any) {
      console.error('❌ Error:', error);
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
      loadStats();
      loadAwaitingCount();
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to update status');
    }
  }

  async function handleDelete(ticketId: string) {
    if (!confirm('⚠️ Delete this conversation permanently?\n\nThis cannot be undone!')) {
      return;
    }

    setDeleting(true);

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
      loadStats();
      loadUnreadCount();
      loadAwaitingCount();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  }

  function getStatusBadge(status: string) {
    const config = {
      open: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Clock, label: 'New' },
      in_progress: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: MessageCircle, label: 'Active' },
      resolved: { bg: 'bg-green-500/10', text: 'text-green-400', icon: CheckCircle, label: 'Resolved' },
      closed: { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: CheckCircle, label: 'Closed' },
    };
    return config[status as keyof typeof config] || config.open;
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

  // Check if ticket needs response
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

  // Count tickets for each filter
  const filterCounts = {
    awaiting: tickets.filter(t => {
      if (t.status === 'resolved' || t.status === 'closed') return false;
      if (!t.messages || !Array.isArray(t.messages) || t.messages.length === 0) return true;
      const lastMsg = t.messages[t.messages.length - 1];
      return lastMsg.type === 'customer';
    }).length,
    responded: tickets.filter(t => {
      if (t.status === 'resolved' || t.status === 'closed') return false;
      if (!t.messages || !Array.isArray(t.messages) || t.messages.length === 0) return false;
      const lastMsg = t.messages[t.messages.length - 1];
      return lastMsg.type === 'admin';
    }).length,
    all: tickets.length,
  };

  return (
    <AdminLayout
      title="Support Conversations"
      description="Professional chat support management"
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
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
              <p className="text-2xl font-bold text-white">{stats.open}</p>
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
              <p className="text-2xl font-bold text-white">{stats.avgResponseTime}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-350px)] min-h-[600px]">
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

            {/* NEW FILTER TABS */}
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
            {loading ? (
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

        {/* Chat View - Same as before */}
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
                      onClick={() => handleDelete(selectedTicket.id)}
                      disabled={deleting}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs h-9"
                      size="sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {deleting ? 'Deleting...' : 'Delete'}
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
    </AdminLayout>
  );
}