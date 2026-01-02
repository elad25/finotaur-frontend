// ============================================
// FINOTAUR SUPPORT WIDGET v2.0
// ============================================
// ✨ Support for both logged-in and guest users
// 🔒 Guests can only send one message (no history)
// 📧 Guests must provide name + email first
// 📢 System updates with PDF support for ISM reports
// 📅 30-day notification history
// ============================================

import { useState, useEffect, useRef } from 'react';
import { 
  X, Send, MessageCircle, Sparkles, Shield, ArrowLeft, Plus, 
  Paperclip, Image as ImageIcon, ChevronRight, Upload, Bell, 
  CheckCircle2, AlertCircle, Info, Megaphone, Download, FileText,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// ==================== INTERFACES ====================

interface ChatMessage {
  id: string;
  type: 'customer' | 'admin' | 'system';
  content: string;
  timestamp: string;
  attachments?: string[];
}

interface Ticket {
  id: string;
  user_id: string | null;
  user_email: string;
  user_name: string;
  subject: string;
  messages: ChatMessage[];
  status: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface SystemUpdateMetadata {
  report_type?: string;
  report_month?: string;
  report_id?: string;
  pdf_url?: string;
  pmi_value?: number;
  pmi_change?: number;
}

interface SystemUpdate {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'announcement';
  is_pinned?: boolean;
  created_at: string;
  read: boolean;
  metadata?: SystemUpdateMetadata;
}

export default function SupportWidget() {
  // ==================== STATE ====================
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'updates' | 'support'>('support');
  const [view, setView] = useState<'list' | 'chat'>('chat');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isNewConversation, setIsNewConversation] = useState(true);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestFormName, setGuestFormName] = useState('');
  const [guestFormEmail, setGuestFormEmail] = useState('');
  const [systemUpdates, setSystemUpdates] = useState<SystemUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (isOpen) {
      checkUserStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isGuest && isOpen && !userName && !userEmail) {
      setShowGuestForm(true);
    }
  }, [isGuest, isOpen, userName, userEmail]);

  useEffect(() => {
    if (!isGuest && tickets.length > 0) {
      setView('list');
      setIsNewConversation(false);
    } else {
      setView('chat');
      setIsNewConversation(true);
    }
  }, [tickets, isGuest]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages, isNewConversation]);

  useEffect(() => {
    if (isOpen && !isGuest) {
      const channel = supabase
        .channel('support-live')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'support_tickets',
          },
          () => {
            loadUserTickets();
            if (selectedTicket) {
              loadTicketById(selectedTicket.id);
            }
          }
        )
        .subscribe();

      // Also subscribe to system_updates for real-time notifications
      const updatesChannel = supabase
        .channel('updates-live')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'system_updates',
          },
          () => {
            loadSystemUpdates();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(updatesChannel);
      };
    }
  }, [isOpen, selectedTicket?.id, isGuest]);

  useEffect(() => {
    if (isNewConversation && isOpen) {
      setIsTyping(false);
    }
  }, [isNewConversation, isOpen]);

  useEffect(() => {
    if (isOpen && !isGuest) {
      loadSystemUpdates();
    }
  }, [isOpen, isGuest]);

  // ==================== HELPER FUNCTIONS ====================

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  async function checkUserStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsGuest(false);
        loadUserInfo();
        loadUserTickets();
      } else {
        setIsGuest(true);
        setView('chat');
        setIsNewConversation(true);
        setActiveTab('support');
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setIsGuest(true);
    }
  }

  async function loadUserInfo() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
          setUserEmail(user.email || '');
          return;
        }

        const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, email, top_secret_enabled, newsletter_enabled, newsletter_paid, role')
  .eq('id', user.id)
  .single();
        
        if (profile?.full_name) {
          setUserName(profile.full_name);
          setUserEmail(profile.email || user.email || '');
        } else {
          setUserName(user.email?.split('@')[0] || 'Trader');
          setUserEmail(user.email || '');
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserName('Trader');
    }
  }

  async function loadUserTickets() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (data) {
        setTickets(data);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  }

  async function loadTicketById(ticketId: string) {
    try {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (data) {
        setSelectedTicket(data);
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
    }
  }

  // ==================== SYSTEM UPDATES ====================

  async function loadSystemUpdates() {
    setLoadingUpdates(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's subscription tier to determine target group
const { data: profile } = await supabase
  .from('profiles')
  .select('top_secret_enabled, newsletter_enabled, newsletter_paid, role')
  .eq('id', user.id)
  .single();
      // Determine user's target group
      // Determine user's target group
// Admins automatically get TOP SECRET access
let userGroup = 'trading_journal';
if (profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.top_secret_enabled) {
  userGroup = 'top_secret';
} else if (profile?.newsletter_enabled || profile?.newsletter_paid) {
  userGroup = 'newsletter';
}

      // Keep 30 days of history
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Load active updates for user's group
      const { data: updates, error } = await supabase
        .from('system_updates')
        .select('*')
        .eq('is_active', true)
        .or(`target_group.eq.all,target_group.eq.${userGroup}`)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading updates:', error);
        return;
      }

      // Load user's read status
      const { data: readRecords } = await supabase
        .from('user_update_reads')
        .select('update_id')
        .eq('user_id', user.id);

      const readIds = new Set(readRecords?.map(r => r.update_id) || []);

      // Map updates with read status and parse metadata
      const updatesWithReadStatus = (updates || []).map(update => {
        let metadata: SystemUpdateMetadata | undefined = undefined;
        
        if (update.metadata) {
          try {
            metadata = typeof update.metadata === 'string' 
              ? JSON.parse(update.metadata) 
              : update.metadata;
          } catch (e) {
            console.error('Error parsing metadata:', e);
          }
        }

        return {
          ...update,
          read: readIds.has(update.id),
          metadata,
        };
      });

      setSystemUpdates(updatesWithReadStatus);
    } catch (error) {
      console.error('Error loading system updates:', error);
    } finally {
      setLoadingUpdates(false);
    }
  }

  async function markUpdateAsRead(updateId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_update_reads')
        .upsert({
          user_id: user.id,
          update_id: updateId,
          read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,update_id'
        });

      // Increment views count
      try {
        await supabase.rpc('increment_update_views', { update_id: updateId });
      } catch (e) {
        // Function might not exist yet
      }
      
      setSystemUpdates(prev => 
        prev.map(u => u.id === updateId ? { ...u, read: true } : u)
      );
    } catch (error) {
      console.error('Error marking update as read:', error);
    }
  }

  // ==================== FILE HANDLING ====================

  async function uploadFiles(files: File[]): Promise<string[]> {
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `support-attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('public')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('public')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    return uploadedUrls;
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    
    const maxSize = 20 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 20MB)`);
        return false;
      }
      return true;
    });

    if (attachments.length + validFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    setAttachments(prev => [...prev, ...validFiles]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  // ==================== GUEST FORM ====================

  function validateGuestForm(): boolean {
    if (!guestFormName.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!guestFormEmail.trim() || !emailRegex.test(guestFormEmail)) {
      toast.error('Please enter a valid email');
      return false;
    }
    
    return true;
  }

  function handleGuestFormSubmit() {
    if (!validateGuestForm()) return;
    
    setUserName(guestFormName.trim());
    setUserEmail(guestFormEmail.trim());
    setShowGuestForm(false);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

  // ==================== MESSAGING ====================

  async function handleSendMessage() {
    if (isGuest && (!userName || !userEmail)) {
      toast.error('Please fill in your contact information first');
      return;
    }

    if (!currentMessage.trim()) return;

    setSending(true);

    try {
      let uploadedUrls: string[] = [];
      if (attachments.length > 0) {
        setUploadingFiles(true);
        uploadedUrls = await uploadFiles(attachments);
        setUploadingFiles(false);
      }

      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'customer',
        content: currentMessage.trim(),
        timestamp: new Date().toISOString(),
        attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      };

      if (isGuest || isNewConversation) {
        const { data, error } = await supabase
          .from('support_tickets')
          .insert({
            user_id: isGuest ? null : (await supabase.auth.getUser()).data.user?.id,
            user_email: userEmail,
            user_name: userName,
            subject: 'Support Request',
            message: currentMessage.trim(),
            messages: [newMessage],
            status: 'open',
          })
          .select()
          .single();

        if (error) throw error;

        if (!isGuest) {
          setSelectedTicket(data);
          setIsNewConversation(false);
          loadUserTickets();
        }

        setCurrentMessage('');
        setAttachments([]);
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-support-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || ''}`,
              },
              body: JSON.stringify({
                type: 'new_ticket',
                record: data,
              }),
            }
          );
        } catch (e) {
          console.error('Email error:', e);
        }

        toast.success(isGuest ? 'Message sent! We\'ll respond to your email soon.' : 'Message sent');
        
        if (isGuest) {
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
        
        inputRef.current?.focus();
        return;
      }

      if (!selectedTicket) return;

      const existingMessages = Array.isArray(selectedTicket.messages) ? selectedTicket.messages : [];
      const updatedMessages = [...existingMessages, newMessage];

      const { data, error } = await supabase
        .from('support_tickets')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTicket.id)
        .select()
        .single();

      if (error) throw error;

      setSelectedTicket(data);
      setCurrentMessage('');
      setAttachments([]);
      inputRef.current?.focus();
      loadUserTickets();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to send');
    } finally {
      setSending(false);
      setUploadingFiles(false);
    }
  }

  // ==================== FORMATTING ====================

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit'
    });
  }

  function formatRelativeTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  function formatDate(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function getLastMessage(ticket: Ticket): string {
    if (!ticket.messages || !Array.isArray(ticket.messages) || ticket.messages.length === 0) {
      return 'No messages';
    }
    const lastMsg = ticket.messages[ticket.messages.length - 1];
    return lastMsg.content.substring(0, 60) + (lastMsg.content.length > 60 ? '...' : '');
  }

  function hasUnreadMessages(ticket: Ticket): boolean {
    if (!ticket.messages || !Array.isArray(ticket.messages) || ticket.messages.length === 0) {
      return false;
    }
    const lastMsg = ticket.messages[ticket.messages.length - 1];
    return lastMsg.type === 'admin';
  }

  function getUpdateIcon(type: SystemUpdate['type']) {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-[#D4AF37]" />;
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  }

  function getUpdateBorderColor(type: SystemUpdate['type']) {
    switch (type) {
      case 'success':
        return 'border-green-500/30';
      case 'warning':
        return 'border-yellow-500/30';
      case 'announcement':
        return 'border-[#D4AF37]/30';
      default:
        return 'border-blue-500/30';
    }
  }

  function getUpdateBgColor(type: SystemUpdate['type']) {
    switch (type) {
      case 'success':
        return 'bg-green-500/10';
      case 'warning':
        return 'bg-yellow-500/10';
      case 'announcement':
        return 'bg-[#D4AF37]/10';
      default:
        return 'bg-blue-500/10';
    }
  }

  // ==================== NAVIGATION ====================

  const unreadUpdatesCount = systemUpdates.filter(u => !u.read).length;

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      if (!isGuest && tickets.length > 0) {
        setView('list');
      } else {
        setView('chat');
        setIsNewConversation(true);
      }
      setSelectedTicket(null);
      setAttachments([]);
      setShowGuestForm(false);
      setGuestFormName('');
      setGuestFormEmail('');
    }, 300);
  };

  const handleBackToList = () => {
    if (isGuest) return;
    setView('list');
    setSelectedTicket(null);
    setIsNewConversation(false);
    setAttachments([]);
    loadUserTickets();
  };

  const handleNewChat = () => {
    if (isGuest) return;
    setView('chat');
    setSelectedTicket(null);
    setIsNewConversation(true);
    setAttachments([]);
  };

  // ==================== RENDER ====================

  return (
    <>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Floating Button - Blue Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 z-50 group"
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 rounded-full bg-[#1E88E5] opacity-30 blur-xl group-hover:opacity-50 transition-all duration-200"></div>
          
          {/* Main Button */}
          <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-[#2196F3] to-[#1976D2] flex items-center justify-center shadow-2xl group-hover:scale-105 transition-all duration-200 ease-out border border-[#42A5F5]/30">
            {/* Chat Bubble Icon */}
            <svg 
              viewBox="0 0 24 24" 
              className="h-7 w-7 text-white"
              fill="currentColor"
            >
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
              <path d="M4 4h16v12H5.17L4 17.17V4z" opacity="0.9"/>
            </svg>
          </div>
          
          {!isGuest && (tickets.some(t => hasUnreadMessages(t)) || unreadUpdatesCount > 0) && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-[#0a0a0a] flex items-center justify-center animate-pulse">
              <span className="text-[10px] text-white font-bold">
                {(tickets.filter(t => hasUnreadMessages(t)).length + unreadUpdatesCount)}
              </span>
            </div>
          )}
        </button>
      )}

      {/* Main Window */}
      {isOpen && (
        <div className="fixed bottom-8 right-8 z-50 w-[420px] animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="absolute -inset-1 bg-gradient-to-br from-[#D4AF37]/10 via-transparent to-transparent rounded-3xl blur-2xl"></div>
          
          <div className="relative bg-[#0a0a0a] rounded-2xl shadow-2xl overflow-hidden border border-[#7F6823]/30">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-[#0f0f0f] to-[#0a0a0a] px-5 py-4 border-b border-[#7F6823]/20">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {!isGuest && activeTab === 'support' && view === 'chat' && !isNewConversation && (
                    <button
                      onClick={handleBackToList}
                      className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all duration-200 ease-out"
                    >
                      <ArrowLeft className="h-4 w-4 text-gray-400 hover:text-white transition-colors" />
                    </button>
                  )}
                  
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#D4AF37] opacity-20 blur-lg rounded-lg"></div>
                    <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C19A2F] flex items-center justify-center border border-[#E6C77D]/30">
                      <Shield className="h-5 w-5 text-black" strokeWidth={2.5} />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight font-['Inter',sans-serif]">
                      Finotaur
                    </h3>
                    <p className="text-[10px] text-[#D4AF37] font-medium mt-0.5 font-['Inter',sans-serif]">
                      Support & Updates
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all duration-200 ease-out group"
                >
                  <X className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                </button>
              </div>

              {/* Tab Switcher */}
              {!isGuest && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setActiveTab('updates')}
                    className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                      activeTab === 'updates'
                        ? 'bg-gradient-to-br from-[#3d3420] to-[#2d2718] border border-[#7F6823]/50 text-[#D4AF37]'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                    <span className="text-sm font-medium">Updates</span>
                    {unreadUpdatesCount > 0 && (
                      <span className="h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadUpdatesCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('support')}
                    className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                      activeTab === 'support'
                        ? 'bg-gradient-to-br from-[#3d3420] to-[#2d2718] border border-[#7F6823]/50 text-[#D4AF37]'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                    }`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Support</span>
                    {tickets.some(t => hasUnreadMessages(t)) && (
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="h-[600px] flex flex-col bg-gradient-to-b from-[#0a0a0a] to-black">
              {/* Guest Form Overlay */}
              {showGuestForm && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-[#0f0f0f] border border-[#7F6823]/30 rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl">
                    <div className="text-center mb-6">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C19A2F] flex items-center justify-center mx-auto mb-3">
                        <Shield className="h-6 w-6 text-black" strokeWidth={2.5} />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">Welcome! 👋</h3>
                      <p className="text-sm text-gray-400">Let us know how to reach you</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Your Name</label>
                        <input
                          type="text"
                          value={guestFormName}
                          onChange={(e) => setGuestFormName(e.target.value)}
                          placeholder="John Doe"
                          autoFocus
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.getElementById('guest-email-input')?.focus();
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Your Email</label>
                        <input
                          id="guest-email-input"
                          type="email"
                          value={guestFormEmail}
                          onChange={(e) => setGuestFormEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleGuestFormSubmit();
                            }
                          }}
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleClose}
                          className="flex-1 h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 text-sm font-medium transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleGuestFormSubmit}
                          className="flex-1 h-11 bg-gradient-to-br from-[#D4AF37] to-[#C19A2F] hover:from-[#C19A2F] hover:to-[#D4AF37] rounded-xl text-black text-sm font-semibold transition-all shadow-lg"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== UPDATES TAB ==================== */}
              {!isGuest && activeTab === 'updates' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingUpdates ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D4AF37] border-t-transparent"></div>
                      </div>
                    ) : systemUpdates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-8">
                        <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                          <Bell className="h-8 w-8 text-gray-600" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm text-gray-500 text-center font-['Inter',sans-serif]">
                          No updates yet
                        </p>
                        <p className="text-xs text-gray-600 text-center mt-2 font-['Inter',sans-serif]">
                          System announcements will appear here
                        </p>
                      </div>
                    ) : (
                      systemUpdates.map((update) => (
                        <div
                          key={update.id}
                          onClick={() => markUpdateAsRead(update.id)}
                          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:bg-white/5 ${
                            getUpdateBorderColor(update.type)
                          } ${!update.read ? 'bg-white/5' : 'bg-transparent'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              getUpdateBgColor(update.type)
                            }`}>
                              {getUpdateIcon(update.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className={`text-sm font-medium ${!update.read ? 'text-white' : 'text-gray-300'}`}>
                                  {update.title}
                                </h4>
                                {!update.read && (
                                  <span className="h-2 w-2 rounded-full bg-[#D4AF37]"></span>
                                )}
                                {update.is_pinned && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                                    Pinned
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {update.content}
                              </p>
                              
                              {/* ISM Report specific: PDF Download Button */}
                              {update.metadata?.pdf_url && (
                                <a
                                  href={update.metadata.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-lg text-[#D4AF37] text-xs font-medium transition-all"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Download PDF Report
                                </a>
                              )}
                              
                              {/* ISM Report specific: PMI Badge */}
                              {update.metadata?.pmi_value && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                                    update.metadata.pmi_value >= 50 
                                      ? 'bg-green-500/20 text-green-400' 
                                      : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {update.metadata.pmi_value >= 50 ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3" />
                                    )}
                                    PMI: {update.metadata.pmi_value}
                                    {update.metadata.pmi_change !== undefined && update.metadata.pmi_change !== null && (
                                      <span className="ml-1">
                                        ({update.metadata.pmi_change > 0 ? '+' : ''}{update.metadata.pmi_change.toFixed(1)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                              
                              <span className="text-[10px] text-gray-600 mt-2 block">
                                {formatDate(update.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ==================== SUPPORT TAB ==================== */}
              {(isGuest || activeTab === 'support') && (
                <>
                  {/* Conversations List View */}
                  {!isGuest && view === 'list' && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1 overflow-y-auto pt-3">
                        {tickets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full p-8">
                            <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                              <MessageCircle className="h-7 w-7 text-gray-600" strokeWidth={2} />
                            </div>
                            <p className="text-sm text-gray-500 text-center font-['Inter',sans-serif]">
                              No conversations yet
                            </p>
                            <p className="text-xs text-gray-600 text-center mt-2 font-['Inter',sans-serif]">
                              Start a new conversation to get help
                            </p>
                          </div>
                        ) : (
                          tickets.map((ticket) => {
                            const hasUnread = hasUnreadMessages(ticket);
                            return (
                              <button
                                key={ticket.id}
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setView('chat');
                                  setIsNewConversation(false);
                                }}
                                className="w-full px-4 py-3 border-b border-white/5 hover:bg-gradient-to-r hover:from-[#1a1510]/30 hover:to-transparent transition-all duration-200 ease-out text-left group"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="relative flex-shrink-0">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C19A2F] flex items-center justify-center border border-[#E6C77D]/30">
                                      <Shield className="h-5 w-5 text-black" strokeWidth={2.5} />
                                    </div>
                                    {hasUnread && (
                                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-black"></div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className={`text-sm font-medium ${hasUnread ? 'text-white' : 'text-gray-300'} transition-colors`}>
                                        Support Team
                                      </h4>
                                      <span className="text-[11px] text-[#E6C77D] opacity-40 group-hover:opacity-60 transition-opacity">
                                        {formatRelativeTime(ticket.updated_at)}
                                      </span>
                                    </div>
                                    <p className={`text-xs line-clamp-2 ${hasUnread ? 'text-gray-300' : 'text-gray-500'}`}>
                                      {getLastMessage(ticket)}
                                    </p>
                                  </div>

                                  <div className="flex items-center">
                                    <ChevronRight className="h-[18px] w-[18px] text-[#E6C77D] opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      <div className="border-t border-[#7F6823]/20 bg-gradient-to-r from-[#0f0f0f] to-[#0a0a0a] p-4">
                        <button
                          onClick={handleNewChat}
                          className="w-full h-12 bg-gradient-to-br from-[#3d3420] to-[#2d2718] hover:from-[#4d4430] hover:to-[#3d3728] border border-[#7F6823]/40 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ease-out transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        >
                          <Plus className="h-5 w-5 text-[#D4AF37]" strokeWidth={2.5} />
                          <span className="text-sm font-semibold text-[#D4AF37] tracking-wide font-['Inter',sans-serif]">
                            NEW CHAT
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chat View */}
                  {view === 'chat' && (
                    <>
                      <div className="flex-1 overflow-y-auto p-5 space-y-2">
                        {isNewConversation ? (
                          <div className="animate-in slide-in-from-bottom-2 fade-in duration-200">
                            <div className="flex justify-start">
                              <div className="max-w-[75%]">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C19A2F] flex items-center justify-center border border-[#E6C77D]/30">
                                    <Shield className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
                                  </div>
                                  <span className="text-xs font-medium text-[#D4AF37]">
                                    Support Team
                                  </span>
                                </div>
                                
                                <div className="rounded-[18px] px-4 py-3 shadow-md bg-[#0E0E0E]/90 border border-[#7F6823]/40 backdrop-blur-sm">
                                  <p className="text-sm leading-relaxed text-white font-['Inter',sans-serif]">
                                    Hey 👋
                                  </p>
                                  <p className="text-sm leading-relaxed text-white/90 mt-2 font-['Inter',sans-serif]">
                                    {isGuest && userName 
                                      ? `Hi ${userName}! How can we help you today? We'll respond to ${userEmail}.`
                                      : 'Welcome to Finotaur Support. How can we help you today? Our team is here to support your trading journey — whether it\'s technical help, trade syncing, or anything else you need.'
                                    }
                                  </p>
                                  <span className="text-[10px] text-[#E6C77D] opacity-50 mt-2 block">
                                    {formatTime(new Date().toISOString())}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : !selectedTicket?.messages || !Array.isArray(selectedTicket.messages) || selectedTicket.messages.length === 0 ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-3">
                              <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                                <MessageCircle className="h-6 w-6 text-gray-600" />
                              </div>
                              <p className="text-sm text-gray-500 font-['Inter',sans-serif]">
                                No messages yet
                              </p>
                            </div>
                          </div>
                        ) : (
                          selectedTicket.messages.map((msg, idx) => (
                            <div
                              key={msg.id || idx}
                              className={`flex ${msg.type === 'customer' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-200 mb-2`}
                            >
                              <div className="max-w-[75%]">
                                {msg.type === 'admin' && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C19A2F] flex items-center justify-center border border-[#E6C77D]/30">
                                      <Shield className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
                                    </div>
                                    <span className="text-xs font-medium text-[#D4AF37]">
                                      Support Team
                                    </span>
                                  </div>
                                )}
                                
                                {msg.type === 'customer' && (
                                  <div className="flex items-center gap-2 mb-2 justify-end">
                                    <span className="text-xs font-medium text-[#D4AF37]">
                                      {userName || 'You'}
                                    </span>
                                  </div>
                                )}
                                
                                <div
                                  className={`rounded-[18px] px-4 py-3 shadow-md backdrop-blur-sm ${
                                    msg.type === 'customer'
                                      ? 'bg-[#1a1510]/90 border border-[#7F6823]/50'
                                      : 'bg-[#0E0E0E]/90 border border-[#7F6823]/40'
                                  }`}
                                >
                                  <p className={`text-sm leading-relaxed whitespace-pre-wrap font-['Inter',sans-serif] ${
                                    msg.type === 'customer' ? 'text-[#E6C77D]' : 'text-white/90'
                                  }`}>
                                    {msg.content}
                                  </p>

                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {msg.attachments.map((url, i) => {
                                        const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                        return (
                                          <div key={i}>
                                            {isImage ? (
                                              <img
                                                src={url}
                                                alt="Attachment"
                                                className="max-w-full rounded-lg border border-white/10"
                                              />
                                            ) : (
                                              <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-xs text-[#D4AF37] hover:text-[#C19A2F] transition-colors"
                                              >
                                                <Paperclip className="h-3 w-3" />
                                                View attachment
                                              </a>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  <span className="text-[10px] text-[#E6C77D] opacity-50 mt-2 block">
                                    {formatTime(msg.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        
                        {isTyping && (
                          <div className="flex justify-start animate-in slide-in-from-bottom-2 fade-in duration-200">
                            <div className="max-w-[75%]">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C19A2F] flex items-center justify-center border border-[#E6C77D]/30">
                                  <Shield className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
                                </div>
                                <span className="text-xs font-medium text-[#D4AF37]">
                                  Support Team
                                </span>
                              </div>
                              
                              <div className="rounded-[18px] px-4 py-3 shadow-md bg-[#0E0E0E]/90 border border-[#7F6823]/40 backdrop-blur-sm">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                                  <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
                                  <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                      
                      {/* Input */}
                      <div className="border-t border-[#7F6823]/20 bg-gradient-to-r from-[#0f0f0f] to-[#0a0a0a] p-4">
                        {attachments.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {attachments.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg"
                              >
                                <ImageIcon className="h-3 w-3 text-[#D4AF37]" />
                                <span className="text-xs text-gray-300 max-w-[100px] truncate font-['Inter',sans-serif]">
                                  {file.name}
                                </span>
                                <button
                                  onClick={() => removeAttachment(idx)}
                                  className="ml-1 text-gray-400 hover:text-white transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sending || attachments.length >= 5}
                            className="h-11 px-4 flex-shrink-0 bg-white/5 hover:bg-[#1a1510]/50 border border-white/10 hover:border-[#7F6823]/40 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-200 ease-out group"
                            title="Upload file (max 20MB)"
                          >
                            <Upload className="h-[18px] w-[18px] text-[#E6C77D] opacity-60 group-hover:opacity-100 transition-opacity" strokeWidth={2.5} />
                            <span className="text-xs font-medium text-[#E6C77D] opacity-60 group-hover:opacity-100 transition-opacity">
                              Upload
                            </span>
                          </button>

                          <Textarea
                            ref={inputRef}
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none resize-none min-h-[44px] max-h-[120px] transition-all duration-200 ease-out font-['Inter',sans-serif]"
                            disabled={sending}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                          <button
                            onClick={handleSendMessage}
                            disabled={!currentMessage.trim() || sending || uploadingFiles}
                            className="h-11 w-11 flex-shrink-0 bg-gradient-to-br from-[#D4AF37] to-[#C19A2F] hover:from-[#C19A2F] hover:to-[#D4AF37] rounded-xl flex items-center justify-center disabled:opacity-50 transition-all duration-200 ease-out transform hover:scale-105 active:scale-95 shadow-lg"
                          >
                            {sending || uploadingFiles ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                            ) : (
                              <Send className="h-[18px] w-[18px] text-black" strokeWidth={2.5} />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-2 text-center font-['Inter',sans-serif]">
                          {isGuest 
                            ? 'We\'ll respond to your email • Max 5 files, 20MB each'
                            : 'Press Ctrl+Enter to send • Max 5 files, 20MB each'
                          }
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
          </div>
        </div>
      )}
    </>
  );
}