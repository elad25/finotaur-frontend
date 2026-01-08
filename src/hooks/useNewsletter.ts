// ==========================================
// useNewsletter Hook
// For Admin UI newsletter management
// ==========================================

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { GeneratedNewsletter, NewsletterSection } from '../types';

interface NewsletterPreview {
  subject: string;
  preheader: string;
  sections: NewsletterSection[];
  html: string;
  subscriberCount: number;
  generatedAt: string;
}

interface SendResult {
  newsletterId: string;
  subject: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt: string;
}

export function useNewsletter() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  /**
   * Fetch today's newsletter from database
   */
  const todayNewsletterQuery = useQuery({
    queryKey: ['newsletter', 'today'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_today_newsletter');
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  /**
   * Fetch newsletter history
   */
  const historyQuery = useQuery({
    queryKey: ['newsletter', 'history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  /**
   * Generate newsletter preview
   */
  const generatePreview = useCallback(async (): Promise<NewsletterPreview | null> => {
    setIsGenerating(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        toast.error('Not authenticated');
        return null;
      }

      const response = await fetch('/api/newsletter/preview', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate preview');
      }

      toast.success('Preview generated!');
      return result.data as NewsletterPreview;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to generate preview: ${message}`);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Send newsletter to all subscribers
   */
  const sendNewsletter = useMutation({
    mutationFn: async (): Promise<SendResult> => {
      setIsSending(true);
      
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send newsletter');
      }

      return result.data as SendResult;
    },
    onSuccess: (data) => {
      toast.success(
        `Newsletter sent! ${data.sentCount}/${data.recipientCount} delivered`
      );
      queryClient.invalidateQueries({ queryKey: ['newsletter'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to send: ${message}`);
    },
    onSettled: () => {
      setIsSending(false);
    },
  });

  /**
   * Send test email
   */
  const sendTestEmail = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        toast.error('Not authenticated');
        return false;
      }

      const response = await fetch('/api/newsletter/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Test email sent to ${email}`);
        return true;
      } else {
        toast.error(result.error || 'Failed to send test email');
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error: ${message}`);
      return false;
    }
  }, []);

  return {
    // Queries
    todayNewsletter: todayNewsletterQuery.data,
    history: historyQuery.data,
    isLoadingToday: todayNewsletterQuery.isLoading,
    isLoadingHistory: historyQuery.isLoading,
    
    // Actions
    generatePreview,
    sendNewsletter: sendNewsletter.mutate,
    sendTestEmail,
    
    // States
    isGenerating,
    isSending: isSending || sendNewsletter.isPending,
    
    // Refresh
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter'] });
    },
  };
}