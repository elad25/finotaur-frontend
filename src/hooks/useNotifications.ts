// src/hooks/useNotifications.ts
// =====================================================
// In-app notification bell — list + unread count + realtime.
// Backed by Supabase RPCs (get_my_notifications / get_my_unread_count /
// mark_notification_read / mark_all_notifications_read) and a realtime
// subscription on public.user_notifications (INSERT, filtered by user_id).
// =====================================================

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ============================================
// TYPES
// ============================================

export interface UserNotification {
  id: string; // user_notification row id
  notification_id: string;
  title: string;
  message: string | null;
  type: string;
  priority: string;
  is_read: boolean;
  published_at: string;
}

const NOTIFICATIONS_QUERY_KEY = ['notifications', 'list'] as const;
const UNREAD_QUERY_KEY = ['notifications', 'unread'] as const;

// ============================================
// HOOK
// ============================================

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const {
    data: notifications = [],
    isLoading: isLoadingList,
  } = useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_notifications');
      if (error) {
        console.error('[useNotifications] get_my_notifications failed:', error);
        throw error;
      }
      return (data ?? []) as UserNotification[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: unreadCount = 0,
    isLoading: isLoadingUnread,
  } = useQuery({
    queryKey: [...UNREAD_QUERY_KEY, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_unread_count');
      if (error) {
        console.error('[useNotifications] get_my_unread_count failed:', error);
        throw error;
      }
      return (data ?? 0) as number;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // ---- Realtime: invalidate on every new in-app notification row ----
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      const { error } = await supabase.rpc('mark_notification_read', { p_id: id });
      if (error) {
        console.error('[useNotifications] mark_notification_read failed:', error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    [userId, queryClient],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const { error } = await supabase.rpc('mark_all_notifications_read');
    if (error) {
      console.error('[useNotifications] mark_all_notifications_read failed:', error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [userId, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading: isLoadingList || isLoadingUnread,
    markRead,
    markAllRead,
  };
}

export default useNotifications;
