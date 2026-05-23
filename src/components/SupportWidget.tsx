// ============================================
// FINOTAUR SUPPORT WIDGET v3.0
// ============================================
// ✨ Support for both logged-in and guest users
// 🔒 Guests can only send one message (no history)
// 📧 Guests must provide name + email first
// 📢 System updates with PDF support for ISM reports
// 📅 30-day notification history
// 🛡️ Admins see ALL reports (not filtered by target_group)
// 🆕 v3.0: Category selection + improved welcome flow
// 🔧 v3.1: Fixed widget height to not overlap SUBNAV
// ============================================

import { useState, useEffect, useRef } from 'react';
import { 
  X, Send, MessageCircle, Shield, ArrowLeft, Plus, 
  Paperclip, Image as ImageIcon, ChevronRight, Upload, Bell, 
  CheckCircle2, AlertCircle, Info, Megaphone, Download,
  TrendingUp, TrendingDown, Wrench, CreditCard, HelpCircle, Lightbulb, UserRound
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

type GuidedSupportStep = 'idle' | 'details' | 'impact' | 'contact' | 'ready';

interface Ticket {
  id: string;
  user_id: string | null;
  user_email: string;
  user_name: string;
  subject: string;
  category?: TicketCategory;
  messages: ChatMessage[];
  status: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_read_at?: string;
}

interface SystemUpdateMetadata {
  report_type?: string;
  report_month?: string;
  report_id?: string;
  pdf_url?: string;
  pmi_value?: number;
  pmi_change?: number;
  ticker?: string;
  sector?: string;
  regime?: string;
  regime_score?: number;
}

interface SystemUpdate {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'announcement';
  target_group?: string;
  is_pinned?: boolean;
  created_at: string;
  read: boolean;
  metadata?: SystemUpdateMetadata;
}

// ==================== CATEGORY DEFINITIONS ====================

type TicketCategory = 'technical' | 'payment' | 'question' | 'feedback';

interface CategoryOption {
  id: TicketCategory;
  icon: React.ReactNode;
  label: string;
  labelHe: string;
  description: string;
  color: string;
}

const TICKET_CATEGORIES: CategoryOption[] = [
  { 
    id: 'technical', 
    icon: <Wrench className="h-5 w-5" />,
    label: 'Technical Issue', 
    labelHe: 'בעיה טכנית', 
    description: 'Bugs, sync issues, errors',
    color: 'text-red-400'
  },
  { 
    id: 'payment', 
    icon: <CreditCard className="h-5 w-5" />,
    label: 'Payment Issue', 
    labelHe: 'בעיית תשלום', 
    description: 'Billing, subscriptions, refunds',
    color: 'text-blue-400'
  },
  { 
    id: 'question', 
    icon: <HelpCircle className="h-5 w-5" />,
    label: 'Question', 
    labelHe: 'שאלה', 
    description: 'How to use features',
    color: 'text-purple-400'
  },
  { 
    id: 'feedback', 
    icon: <Lightbulb className="h-5 w-5" />,
    label: 'Feedback', 
    labelHe: 'המלצות לשיפור', 
    description: 'Suggestions, feature requests',
    color: 'text-yellow-400'
  },
];

// ==================== ADMIN EMAIL CONSTANT ====================
const ADMIN_EMAIL = 'elad2550@gmail.com';

const SUPPORT_TOPIC_SUGGESTIONS = [
  'I have a technical issue',
  'I need help with billing',
  'I have a question about my account',
  'I want to share feedback',
];

const SUPPORT_TOPIC_FOLLOW_UPS: Record<string, string> = {
  'I have a technical issue': 'Got it. What exactly is happening? Please include the page, action, or error message if you have one.',
  'I need help with billing': 'Got it. What billing issue should we look at? Please mention the plan, payment, invoice, or subscription change involved.',
  'I have a question about my account': 'Sure. What account question can we help with? Include what you expected to see or change.',
  'I want to share feedback': 'Thanks. What feedback would you like to share, and what would make the experience better for you?',
};

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
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [messageSent, setMessageSent] = useState(false);
  const [showSupportPrompt, setShowSupportPrompt] = useState(false);
  const [guidedMessages, setGuidedMessages] = useState<ChatMessage[]>([]);
  const [guidedStep, setGuidedStep] = useState<GuidedSupportStep>('idle');
  const [guidedTopic, setGuidedTopic] = useState('');
  
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

  // Track if initial load happened
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    // Only set view on initial load, not on every tickets update
    if (!initialLoadDone && !isGuest) {
      if (tickets.length > 0) {
        setView('list');
        setIsNewConversation(false);
      } else {
        setView('chat');
        setIsNewConversation(true);
      }
      setInitialLoadDone(true);
    }
  }, [tickets, isGuest, initialLoadDone]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages, guidedMessages, guidedStep, isNewConversation, messageSent, isTyping, showSupportPrompt]);

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
    if (!isOpen || view !== 'chat' || !isNewConversation || messageSent || showGuestForm) {
      setIsTyping(false);
      setShowSupportPrompt(false);
      return;
    }

    setShowSupportPrompt(false);
    setIsTyping(true);

    const timer = window.setTimeout(() => {
      setIsTyping(false);
      setShowSupportPrompt(true);
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, view, isNewConversation, messageSent, showGuestForm]);

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
        
        const isAdminUser = user.email === ADMIN_EMAIL;
        setIsAdmin(isAdminUser);
        
        loadUserInfo();
        loadUserTickets();
      } else {
        setIsGuest(true);
        setIsAdmin(false);
        setView('chat');
        setIsNewConversation(true);
        setActiveTab('support');
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setIsGuest(true);
      setIsAdmin(false);
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
        
        if (profile?.role === 'admin' || profile?.role === 'super_admin' || user.email === ADMIN_EMAIL) {
          setIsAdmin(true);
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

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('Could not load tickets:', error.message);
        return;
      }

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
      const now = new Date().toISOString();
      
      // Mark as read in DB
      await supabase
        .from('support_tickets')
        .update({ last_read_at: now })
        .eq('id', ticketId);
      
      // Set with updated last_read_at
      setSelectedTicket({ ...data, last_read_at: now });
      
      // Also update in tickets list
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, last_read_at: now } : t
      ));
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('top_secret_enabled, newsletter_enabled, newsletter_paid, role, email')
        .eq('id', user.id)
        .single();

      const userIsAdmin = 
        profile?.role === 'admin' || 
        profile?.role === 'super_admin' || 
        user.email === ADMIN_EMAIL ||
        profile?.email === ADMIN_EMAIL;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let query = supabase
        .from('system_updates')
        .select('*')
        .eq('is_active', true)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (!userIsAdmin) {
        let userGroup = 'trading_journal';
        if (profile?.top_secret_enabled) {
          userGroup = 'top_secret';
        } else if (profile?.newsletter_enabled || profile?.newsletter_paid) {
          userGroup = 'newsletter';
        }
        
        query = query.or(`target_group.eq.all,target_group.eq.${userGroup}`);
      }

      const { data: updates, error } = await query;

      if (error) {
        console.error('Error loading updates:', error);
        return;
      }

      const { data: readRecords } = await supabase
        .from('user_update_reads')
        .select('update_id')
        .eq('user_id', user.id);

      const readIds = new Set(readRecords?.map(r => r.update_id) || []);

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

  async function clearAllUpdates() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const unreadUpdates = systemUpdates.filter(u => !u.read);
      if (unreadUpdates.length === 0) {
        toast.info('All updates are already read');
        return;
      }

      // Mark all unread updates as read
      const upsertData = unreadUpdates.map(update => ({
        user_id: user.id,
        update_id: update.id,
        read_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('user_update_reads')
        .upsert(upsertData, { onConflict: 'user_id,update_id' });

      if (error) throw error;

      // Update local state
      setSystemUpdates(prev => prev.map(u => ({ ...u, read: true })));
      toast.success(`Marked ${unreadUpdates.length} updates as read`);
    } catch (error) {
      console.error('Error clearing all updates:', error);
      toast.error('Failed to clear updates');
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

  function resetGuidedSupportFlow() {
    setGuidedMessages([]);
    setGuidedStep('idle');
    setGuidedTopic('');
  }

  function appendGuidedAdminMessage(content: string, delay = 700) {
    setIsTyping(true);

    window.setTimeout(() => {
      setIsTyping(false);
      setGuidedMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'admin',
          content,
          timestamp: new Date().toISOString(),
        },
      ]);
    }, delay);
  }

  function buildSupportRequestMessage(finalNote: string) {
    const transcript = guidedMessages
      .map((msg) => `${msg.type === 'customer' ? 'User' : 'Support'}: ${msg.content}`)
      .join('\n');

    return [
      'Support request',
      '',
      `Topic: ${guidedTopic || 'Support Request'}`,
      '',
      'Intake conversation:',
      transcript || 'No guided intake conversation.',
      finalNote ? ['', 'Additional note:', finalNote].join('\n') : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  function handleGuidedReply() {
    const message = currentMessage.trim();
    if (!message) return;

    const customerMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'customer',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setGuidedMessages((prev) => [...prev, customerMessage]);
    setCurrentMessage('');

    if (guidedStep === 'details') {
      setGuidedStep('impact');
      appendGuidedAdminMessage('Thanks. How is this affecting you right now? For example: blocked completely, partially working, or just a question before moving forward.');
      return;
    }

    if (guidedStep === 'impact') {
      setGuidedStep('contact');
      appendGuidedAdminMessage('Understood. Is there anything specific our team should check first, or any account/order detail that would help us investigate faster?');
      return;
    }

    if (guidedStep === 'contact') {
      setGuidedStep('ready');
      appendGuidedAdminMessage('Perfect, I have enough context. Add any final details below, then leave a support request and our team will follow up.');
    }
  }

  async function handleSendMessage() {
    if (isGuest && (!userName || !userEmail)) {
      toast.error('Please fill in your contact information first');
      return;
    }

    if (isNewConversation && guidedStep !== 'idle' && guidedStep !== 'ready') {
      handleGuidedReply();
      return;
    }

    if (!currentMessage.trim() && !(isNewConversation && guidedStep === 'ready')) return;

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
        content: guidedStep === 'ready'
          ? buildSupportRequestMessage(currentMessage.trim())
          : currentMessage.trim(),
        timestamp: new Date().toISOString(),
        attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      };

      if (isGuest || isNewConversation) {
        const ticketPayload = {
          user_id: isGuest ? null : (await supabase.auth.getUser()).data.user?.id,
          user_email: userEmail,
          user_name: userName,
          subject: 'Support Request',
          category: null,
          message: newMessage.content,
          messages: [newMessage],
          status: 'open',
        };

        let data: any = null;
        let dbSuccess = false;

        // Attempt DB insert with 1 retry
        for (let attempt = 0; attempt < 2; attempt++) {
          const { data: insertData, error } = await supabase
            .from('support_tickets')
            .insert(ticketPayload)
            .select()
            .single();

          if (!error && insertData) {
            data = insertData;
            dbSuccess = true;
            break;
          }

          console.error(`DB insert attempt ${attempt + 1} failed:`, error);
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }

        if (dbSuccess && !isGuest) {
          setSelectedTicket(data);
          setIsNewConversation(false);
          setMessageSent(true);
          loadUserTickets();
        }

        setCurrentMessage('');
        setAttachments([]);
        
        // Send email notification (always attempt — acts as fallback if DB failed)
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
                type: dbSuccess ? 'new_ticket' : 'fallback_ticket',
                record: data || ticketPayload,
                db_failed: !dbSuccess,
              }),
            }
          );
        } catch (e) {
          console.error('Email fallback also failed:', e);
        }

        if (dbSuccess) {
          toast.success(
            isGuest 
              ? "Message sent! We'll respond to your email soon." 
              : "Message sent! Our team will get back to you shortly."
          );
        } else {
          toast.warning(
            "We received your message via email. Our team will get back to you shortly."
          );
        }
        
        if (isGuest) {
          setMessageSent(true);
          setTimeout(() => {
            handleClose();
          }, 3000);
        }

        if (!dbSuccess && !isGuest) {
          setMessageSent(true);
        }
        
        return;
      }

      if (!selectedTicket) return;

      const existingMessages = Array.isArray(selectedTicket.messages) ? selectedTicket.messages : [];
      const updatedMessages = [...existingMessages, newMessage];

      let updateSuccess = false;

      // Attempt DB update with 1 retry
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase
          .from('support_tickets')
          .update({
            messages: updatedMessages,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedTicket.id)
          .select()
          .single();

        if (!error && data) {
          setSelectedTicket(data);
          updateSuccess = true;
          break;
        }

        console.error(`DB update attempt ${attempt + 1} failed:`, error);
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      if (!updateSuccess) {
        // Fallback: send reply via email so it's not lost
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
                type: 'fallback_reply',
                record: {
                  id: selectedTicket.id,
                  user_email: userEmail,
                  user_name: userName,
                  subject: selectedTicket.subject,
                  message: currentMessage.trim(),
                },
                db_failed: true,
              }),
            }
          );
          
          toast.warning("Message sent via email — we'll sync it shortly.");
        } catch (e) {
          console.error('Email fallback also failed:', e);
          toast.error('Failed to send message. Please try again later.');
          return;
        }
      }

      setCurrentMessage('');
      setAttachments([]);
      inputRef.current?.focus();
      if (updateSuccess) loadUserTickets();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to send message');
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
  // Only unread if last message is from admin AND was sent after last_read_at
  if (lastMsg.type !== 'admin') return false;
  if (!ticket.last_read_at) return true;
  return new Date(lastMsg.timestamp) > new Date(ticket.last_read_at);
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

  function getReportTypeLabel(reportType?: string): string {
    switch (reportType) {
      case 'ism':
        return '🏭 ISM Report';
      case 'crypto_analysis':
        return '🪙 Crypto Report';
      case 'company_analysis':
        return '📊 Company Report';
      case 'weekly_analysis':
        return '📈 Weekly Report';
      default:
        return '';
    }
  }

  function getTargetGroupLabel(targetGroup?: string): string {
    switch (targetGroup) {
      case 'top_secret':
        return '🔒 TOP SECRET';
      case 'newsletter':
        return '📧 Newsletter';
      case 'all':
        return '🌐 All Users';
      default:
        return '';
    }
  }

  function getCategoryIcon(category?: TicketCategory) {
    const cat = TICKET_CATEGORIES.find(c => c.id === category);
    return cat?.icon || <HelpCircle className="h-4 w-4" />;
  }

  function getCategoryLabel(category?: TicketCategory) {
    const cat = TICKET_CATEGORIES.find(c => c.id === category);
    return cat?.label || 'Support';
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
      setMessageSent(false);
      setShowSupportPrompt(false);
      resetGuidedSupportFlow();
      setInitialLoadDone(false); // Reset for next open
    }, 300);
  };

  const handleBackToList = () => {
    if (isGuest) return;
    setView('list');
    setSelectedTicket(null);
    setIsNewConversation(false);
    setAttachments([]);
    setMessageSent(false);
    setShowSupportPrompt(false);
    resetGuidedSupportFlow();
    loadUserTickets();
  };

  const handleNewChat = () => {
    if (isGuest) return;
    setView('chat');
    setSelectedTicket(null);
    setIsNewConversation(true);
    setAttachments([]);
    setMessageSent(false);
    setShowSupportPrompt(false);
    resetGuidedSupportFlow();
  };

  const handleTopicSuggestionClick = (topic: string) => {
    const customerMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'customer',
      content: topic,
      timestamp: new Date().toISOString(),
    };

    setGuidedTopic(topic);
    setGuidedStep('details');
    setGuidedMessages([customerMessage]);
    setCurrentMessage('');
    setShowSupportPrompt(false);
    appendGuidedAdminMessage(SUPPORT_TOPIC_FOLLOW_UPS[topic] || 'Got it. Tell me a bit more so we can understand the issue.');
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

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 z-[200] group"
        >
          <div className="absolute inset-0 rounded-full bg-[#1E88E5] opacity-30 blur-xl group-hover:opacity-50 transition-all duration-200"></div>
          
          <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-[#2196F3] to-[#1976D2] flex items-center justify-center shadow-2xl group-hover:scale-105 transition-all duration-200 ease-out border border-[#42A5F5]/30">
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

      {/* ==================== MAIN WINDOW ==================== */}
      {/* 
        🔧 FIX: Added max-h-[calc(100vh-80px-32px)] to constrain the widget.
        - 80px = SUBNAV height (adjust if your nav is different)
        - 32px = bottom-8 offset (2rem)
        This ensures the widget grows UP TO the SUBNAV but never overlaps it.
        The inner card also gets flex + max-h so content scrolls properly.
      */}
      {isOpen && (
        <div className="fixed bottom-8 right-8 z-[200] w-[500px] h-[720px] max-w-[calc(100vw-64px)] max-h-[calc(100vh-80px-32px)] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="absolute -inset-1 bg-gradient-to-br from-[#1D4ED8]/10 via-transparent to-[#C8CDD6]/30 rounded-3xl blur-2xl"></div>
          
          <div className="relative bg-[#F4EFE4] rounded-2xl shadow-2xl overflow-hidden border border-[#C8CDD6] flex flex-col h-full max-h-[calc(100vh-80px-32px)]">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-[#F8F3EA] to-[#EEF0F3] px-5 py-4 border-b border-[#D8D1C5] flex-shrink-0">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#1D4ED8]/40 to-transparent"></div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {!isGuest && activeTab === 'support' && view === 'chat' && !isNewConversation && (
                    <button
                      onClick={handleBackToList}
                      className="h-8 w-8 rounded-lg bg-white/70 hover:bg-white border border-[#C8CDD6] flex items-center justify-center transition-all duration-200 ease-out"
                    >
                      <ArrowLeft className="h-4 w-4 text-[#475569] hover:text-[#1D4ED8] transition-colors" />
                    </button>
                  )}
                  
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#1E88E5] opacity-20 blur-lg rounded-lg"></div>
                    <div className="relative h-10 w-10 rounded-lg bg-[#1E88E5]/10 flex items-center justify-center border border-[#42A5F5]/30">
                      <UserRound className="h-5 w-5 text-[#42A5F5]" strokeWidth={2.5} />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-[#111827] tracking-tight font-['Inter',sans-serif]">
                      Finotaur
                    </h3>
                    <p className="text-[10px] text-[#1D4ED8] font-medium mt-0.5 font-['Inter',sans-serif]">
                      Support & Updates
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className="h-8 w-8 rounded-lg bg-white/70 hover:bg-white border border-[#C8CDD6] flex items-center justify-center transition-all duration-200 ease-out group"
                >
                  <X className="h-4 w-4 text-[#475569] group-hover:text-[#111827] transition-colors" />
                </button>
              </div>

              {/* Tab Switcher */}
              {!isGuest && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setActiveTab('updates')}
                    className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                      activeTab === 'updates'
                        ? 'bg-white border border-[#1D4ED8]/35 text-[#1D4ED8] shadow-sm'
                        : 'bg-[#E5E7EB]/70 border border-[#C8CDD6] text-[#64748B] hover:bg-white hover:text-[#334155]'
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
                        ? 'bg-white border border-[#1D4ED8]/35 text-[#1D4ED8] shadow-sm'
                        : 'bg-[#E5E7EB]/70 border border-[#C8CDD6] text-[#64748B] hover:bg-white hover:text-[#334155]'
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

            {/* ==================== CONTENT AREA ==================== */}
            {/* 
              🔧 FIX: Changed from h-[600px] to flex-1 + min-h-0 + overflow-hidden.
              This lets the content area fill whatever space remains after the header,
              instead of forcing a fixed 600px that could push past the SUBNAV.
            */}
            <div className="flex-1 min-h-0 flex flex-col bg-gradient-to-b from-[#0a0a0a] to-black overflow-hidden">
              {/* Guest Form Overlay */}
              {showGuestForm && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-[#F8F3EA] border border-[#C8CDD6] rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl">
                    <div className="text-center mb-6">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C19A2F] flex items-center justify-center mx-auto mb-3">
                        <Shield className="h-6 w-6 text-black" strokeWidth={2.5} />
                      </div>
                      <h3 className="text-lg font-semibold text-[#111827] mb-1">Welcome! 👋</h3>
                      <p className="text-sm text-[#64748B]">Let us know how to reach you</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-2">Your Name</label>
                        <input
                          type="text"
                          value={guestFormName}
                          onChange={(e) => setGuestFormName(e.target.value)}
                          placeholder="John Doe"
                          autoFocus
                          className="w-full px-4 py-3 bg-white/90 border border-[#C8CDD6] rounded-xl text-[#111827] text-sm placeholder-[#94A3B8] focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8] outline-none transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.getElementById('guest-email-input')?.focus();
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-2">Your Email</label>
                        <input
                          id="guest-email-input"
                          type="email"
                          value={guestFormEmail}
                          onChange={(e) => setGuestFormEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full px-4 py-3 bg-white/90 border border-[#C8CDD6] rounded-xl text-[#111827] text-sm placeholder-[#94A3B8] focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8] outline-none transition-all"
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
                          className="flex-1 h-11 bg-white/80 hover:bg-white border border-[#C8CDD6] rounded-xl text-[#475569] text-sm font-medium transition-all"
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
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  {/* Clear All Button */}
                  {systemUpdates.length > 0 && unreadUpdatesCount > 0 && (
                    <div className="px-4 pt-3 flex-shrink-0">
                      <button
                        onClick={clearAllUpdates}
                        className="w-full h-9 bg-white/75 hover:bg-white border border-[#C8CDD6] hover:border-[#1D4ED8]/45 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 group"
                      >
                        <CheckCircle2 className="h-4 w-4 text-[#64748B] group-hover:text-[#1D4ED8] transition-colors" />
                        <span className="text-xs font-medium text-[#64748B] group-hover:text-[#1D4ED8] transition-colors">
                          Clear All ({unreadUpdatesCount})
                        </span>
                      </button>
                    </div>
                  )}
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
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
                              
                              {isAdmin && update.target_group && (
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    {getTargetGroupLabel(update.target_group)}
                                  </span>
                                  {update.metadata?.report_type && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                      {getReportTypeLabel(update.metadata.report_type)}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {update.content}
                              </p>
                              
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
                              
                              {update.metadata?.ticker && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                                    📈 {update.metadata.ticker}
                                    {update.metadata.sector && ` • ${update.metadata.sector}`}
                                  </span>
                                </div>
                              )}
                              
                              {update.metadata?.regime && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                                    update.metadata.regime_score && update.metadata.regime_score >= 50 
                                      ? 'bg-green-500/20 text-green-400' 
                                      : 'bg-orange-500/20 text-orange-400'
                                  }`}>
                                    🪙 {update.metadata.regime}
                                    {update.metadata.regime_score && ` (${update.metadata.regime_score}/100)`}
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
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex-1 overflow-y-auto pt-3 min-h-0">
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
                               onClick={async () => {
  setSelectedTicket(ticket);
  setView('chat');
  setIsNewConversation(false);
  
  // Mark as read
  await supabase
    .from('support_tickets')
    .update({ last_read_at: new Date().toISOString() })
    .eq('id', ticket.id);
  
  // Update local state to remove notification immediately
  setTickets(prev => prev.map(t => 
    t.id === ticket.id ? { ...t, last_read_at: new Date().toISOString() } : t
  ));
}}
                                className="w-full px-4 py-3 border-b border-[#D8D1C5]/70 hover:bg-white/60 transition-all duration-200 ease-out text-left group"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="relative flex-shrink-0">
                                    <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center border border-[#C8CDD6]">
                                      {ticket.category ? (
                                        <span className="text-[#1D4ED8]">{getCategoryIcon(ticket.category)}</span>
                                      ) : (
                                        <Shield className="h-5 w-5 text-[#1D4ED8]" strokeWidth={2.5} />
                                      )}
                                    </div>
                                    {hasUnread && (
                                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-[#F4EFE4]"></div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className={`text-sm font-medium ${hasUnread ? 'text-[#111827]' : 'text-[#475569]'} transition-colors`}>
                                        {ticket.category ? getCategoryLabel(ticket.category) : 'Support'}
                                      </h4>
                                      <span className="text-[11px] text-[#1D4ED8] opacity-60 group-hover:opacity-90 transition-opacity">
                                        {formatRelativeTime(ticket.updated_at)}
                                      </span>
                                    </div>
                                    <p className={`text-xs line-clamp-2 ${hasUnread ? 'text-[#475569]' : 'text-[#64748B]'}`}>
                                      {getLastMessage(ticket)}
                                    </p>
                                  </div>

                                  <div className="flex items-center">
                                    <ChevronRight className="h-[18px] w-[18px] text-[#1D4ED8] opacity-45 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      <div className="border-t border-[#D8D1C5] bg-gradient-to-r from-[#F8F3EA] to-[#EEF0F3] p-4 flex-shrink-0">
                        <button
                          onClick={handleNewChat}
                          className="w-full h-12 bg-white hover:bg-[#EFF6FF] border border-[#C8CDD6] hover:border-[#1D4ED8]/45 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ease-out transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        >
                          <Plus className="h-5 w-5 text-[#1D4ED8]" strokeWidth={2.5} />
                          <span className="text-sm font-semibold text-[#1D4ED8] tracking-wide font-['Inter',sans-serif]">
                            NEW CHAT
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chat View */}
                  {view === 'chat' && (
                    <>
                      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
                        {isNewConversation ? (
                          <div className="min-h-full flex flex-col justify-end space-y-4 pb-2">
                            {guidedMessages.map((msg, idx) => (
                              <div
                                key={msg.id || idx}
                                className={`flex ${msg.type === 'customer' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-200`}
                              >
                                <div className="max-w-[75%]">
                                  {msg.type === 'admin' && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="h-6 w-6 rounded-lg bg-[#E5E7EB] flex items-center justify-center border border-[#C8CDD6]">
                                        <Shield className="h-3.5 w-3.5 text-[#475569]" strokeWidth={2.5} />
                                      </div>
                                      <span className="text-xs font-medium text-[#475569]">
                                        Support Team
                                      </span>
                                    </div>
                                  )}

                                  {msg.type === 'customer' && (
                                    <div className="flex items-center gap-2 mb-2 justify-end">
                                      <span className="text-xs font-medium text-[#1D4ED8]">
                                        {userName || 'You'}
                                      </span>
                                    </div>
                                  )}

                                  <div
                                    className={`rounded-[18px] px-4 py-3 shadow-md backdrop-blur-sm ${
                                      msg.type === 'customer'
                                        ? 'bg-[#1D4ED8] border border-[#1E40AF]'
                                        : 'bg-white/90 border border-[#D8D1C5]'
                                    }`}
                                  >
                                    <p className={`text-sm leading-relaxed whitespace-pre-wrap font-['Inter',sans-serif] ${
                                      msg.type === 'customer' ? 'text-white' : 'text-[#1F2937]'
                                    }`}>
                                      {msg.content}
                                    </p>
                                    <span className={`text-[10px] mt-2 block ${msg.type === 'customer' ? 'text-white/65' : 'text-[#64748B]'}`}>
                                      {formatTime(msg.timestamp)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {showSupportPrompt && !messageSent && (
                              <>
                                <div className="animate-in slide-in-from-bottom-2 fade-in duration-200">
                                  <div className="flex justify-start">
                                    <div className="max-w-[75%]">
                                      <div className="rounded-[18px] px-4 py-3 shadow-md bg-white/90 border border-[#D8D1C5] backdrop-blur-sm">
                                        <p className="text-sm leading-relaxed text-[#1F2937] font-['Inter',sans-serif]">
                                          ✨ How can we help?
                                        </p>
                                        <span className="text-[10px] text-[#64748B] mt-2 block">
                                          {formatTime(new Date().toISOString())}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end">
                                  <div className="max-w-[78%] flex flex-wrap justify-end gap-2">
                                    {SUPPORT_TOPIC_SUGGESTIONS.map((topic) => (
                                      <button
                                        key={topic}
                                        type="button"
                                        onClick={() => handleTopicSuggestionClick(topic)}
                                        className="rounded-lg border border-[#C8CDD6] bg-white/75 px-3 py-2 text-left text-xs leading-snug text-[#334155] transition-all duration-200 hover:border-[#1D4ED8]/45 hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                                      >
                                        {topic}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}

                            {guidedStep === 'ready' && !messageSent && (
                              <div className="flex justify-end animate-in slide-in-from-bottom-2 fade-in duration-200">
                                <div className="max-w-[82%] rounded-[14px] border border-[#C8CDD6] bg-white/85 px-4 py-3">
                                  <p className="text-xs font-semibold text-[#1D4ED8] font-['Inter',sans-serif]">
                                    Leave a support request
                                  </p>
                                  <p className="mt-1 text-xs leading-relaxed text-[#64748B] font-['Inter',sans-serif]">
                                    Add any final details in the box below. Your answers will be included for the support team.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Message Sent Confirmation */}
                            {messageSent && (
                              <div className="animate-in slide-in-from-bottom-2 fade-in duration-200">
                                <div className="flex justify-start">
                                  <div className="max-w-[85%]">
                                    <div className="rounded-[18px] px-4 py-3 shadow-md bg-green-500/10 border border-green-500/30 backdrop-blur-sm">
                                      <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                                        <span className="text-sm font-medium text-green-400">
                                          Message Received!
                                        </span>
                                      </div>
                                      <p className="text-sm leading-relaxed text-[#1F2937] font-['Inter',sans-serif]">
                                        Thank you for reaching out! Our support team has received your message and will get back to you as soon as possible.
                                      </p>
                                      <p className="text-xs text-[#64748B] mt-2 font-['Inter',sans-serif]">
                                        📧 We typically respond within 24 hours.
                                      </p>
                                      <span className="text-[10px] text-green-400/50 mt-2 block">
                                        {formatTime(new Date().toISOString())}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
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
                              className={`flex ${msg.type === 'customer' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-200`}
                            >
                              <div className="max-w-[75%]">
                                {msg.type === 'admin' && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-6 rounded-lg bg-[#E5E7EB] flex items-center justify-center border border-[#C8CDD6]">
                                      <Shield className="h-3.5 w-3.5 text-[#475569]" strokeWidth={2.5} />
                                    </div>
                                    <span className="text-xs font-medium text-[#475569]">
                                      Support Team
                                    </span>
                                  </div>
                                )}
                                
                                {msg.type === 'customer' && (
                                  <div className="flex items-center gap-2 mb-2 justify-end">
                                    <span className="text-xs font-medium text-[#1D4ED8]">
                                      {userName || 'You'}
                                    </span>
                                  </div>
                                )}
                                
                                <div
                                  className={`rounded-[18px] px-4 py-3 shadow-md backdrop-blur-sm ${
                                    msg.type === 'customer'
                                      ? 'bg-[#1D4ED8] border border-[#1E40AF]'
                                      : 'bg-white/90 border border-[#D8D1C5]'
                                  }`}
                                >
                                  <p className={`text-sm leading-relaxed whitespace-pre-wrap font-['Inter',sans-serif] ${
                                    msg.type === 'customer' ? 'text-white' : 'text-[#1F2937]'
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

                                  <span className={`text-[10px] mt-2 block ${msg.type === 'customer' ? 'text-white/65' : 'text-[#64748B]'}`}>
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
                              <div className="rounded-[18px] px-4 py-3 shadow-md bg-white/90 border border-[#D8D1C5] backdrop-blur-sm">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-[#1D4ED8] rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                                  <div className="w-2 h-2 bg-[#1D4ED8] rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
                                  <div className="w-2 h-2 bg-[#1D4ED8] rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                      
                      {/* Input Area */}
                      {!messageSent && (
                        <div className="border-t border-[#D8D1C5] bg-gradient-to-r from-[#F8F3EA] to-[#EEF0F3] p-4 flex-shrink-0">
                          {attachments.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {attachments.map((file, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-[#C8CDD6] rounded-lg"
                                >
                                  <ImageIcon className="h-3 w-3 text-[#1D4ED8]" />
                                  <span className="text-xs text-[#334155] max-w-[100px] truncate font-['Inter',sans-serif]">
                                    {file.name}
                                  </span>
                                  <button
                                    onClick={() => removeAttachment(idx)}
                                    className="ml-1 text-[#64748B] hover:text-[#111827] transition-colors"
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
                              className="h-11 px-4 flex-shrink-0 bg-white/80 hover:bg-white border border-[#C8CDD6] hover:border-[#1D4ED8]/45 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-200 ease-out group"
                              title="Upload file (max 20MB)"
                            >
                              <Upload className="h-[18px] w-[18px] text-[#475569] group-hover:text-[#1D4ED8] transition-colors" strokeWidth={2.5} />
                              <span className="text-xs font-medium text-[#475569] group-hover:text-[#1D4ED8] transition-colors">
                                Upload
                              </span>
                            </button>

                            <Textarea
                              ref={inputRef}
                              value={currentMessage}
                              onChange={(e) => setCurrentMessage(e.target.value)}
                              placeholder={
                                guidedStep === 'ready'
                                  ? 'Add final details for support...'
                                  : guidedStep !== 'idle'
                                    ? 'Type your answer...'
                                    : 'Type your message...'
                              }
                              className="flex-1 px-4 py-3 bg-white/90 border border-[#C8CDD6] rounded-xl text-[#111827] text-sm placeholder-[#94A3B8] focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8] outline-none resize-none min-h-[44px] max-h-[120px] transition-all duration-200 ease-out font-['Inter',sans-serif]"
                              disabled={sending}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                            />
                            <button
                              onClick={handleSendMessage}
                              disabled={(!currentMessage.trim() && guidedStep !== 'ready') || sending || uploadingFiles}
                              className={`h-11 flex-shrink-0 bg-gradient-to-br from-[#1D4ED8] to-[#1E40AF] hover:from-[#1E40AF] hover:to-[#1D4ED8] rounded-xl flex items-center justify-center disabled:opacity-50 transition-all duration-200 ease-out transform hover:scale-105 active:scale-95 shadow-lg ${
                                guidedStep === 'ready' ? 'px-4 gap-2' : 'w-11'
                              }`}
                            >
                              {sending || uploadingFiles ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              ) : guidedStep === 'ready' ? (
                                <>
                                  <Send className="h-[16px] w-[16px] text-white" strokeWidth={2.5} />
                                  <span className="text-xs font-semibold text-white whitespace-nowrap">
                                    Send Request
                                  </span>
                                </>
                              ) : (
                                <Send className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] text-[#64748B] mt-2 text-center font-['Inter',sans-serif]">
                            {isGuest 
                              ? "We'll respond to your email • Max 5 files, 20MB each"
                              : 'Press Enter to send • Shift+Enter for new line • Max 5 files, 20MB each'
                            }
                          </p>
                        </div>
                      )}

                      {/* After message sent - show back button */}
                      {messageSent && !isGuest && (
                        <div className="border-t border-[#D8D1C5] bg-gradient-to-r from-[#F8F3EA] to-[#EEF0F3] p-4 flex-shrink-0">
                          <button
                            onClick={handleBackToList}
                            className="w-full h-12 bg-white hover:bg-[#EFF6FF] border border-[#C8CDD6] hover:border-[#1D4ED8]/45 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ease-out"
                          >
                            <ArrowLeft className="h-5 w-5 text-[#1D4ED8]" strokeWidth={2.5} />
                            <span className="text-sm font-semibold text-[#1D4ED8] tracking-wide font-['Inter',sans-serif]">
                              Back to Conversations
                            </span>
                          </button>
                        </div>
                      )}
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
