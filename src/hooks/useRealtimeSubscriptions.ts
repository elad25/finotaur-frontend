// src/hooks/useRealtimeSubscriptions.ts
// v1.2.0 - Fixed infinite loop + reduced logging

import { useEffect, useCallback, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface ProfileChange {
  id: string;
  email?: string;
  display_name?: string;
  account_type?: string;
  subscription_status?: string;
  subscription_interval?: string;
  old_account_type?: string;
  old_subscription_status?: string;
}

export interface RealtimeCallbacks {
  onNewSubscriber?: (profile: ProfileChange) => void;
  onSubscriptionUpgrade?: (profile: ProfileChange) => void;
  onSubscriptionDowngrade?: (profile: ProfileChange) => void;
  onSubscriptionCancelled?: (profile: ProfileChange) => void;
  onAnyChange?: (profile: ProfileChange, eventType: string) => void;
}

export interface UseRealtimeSubscriptionsOptions {
  enabled?: boolean;
  showToasts?: boolean;
  callbacks?: RealtimeCallbacks;
  invalidateQueries?: boolean;
  debug?: boolean;
}

// ============================================
// QUERY KEYS TO INVALIDATE
// ============================================

const ADMIN_QUERY_KEYS = [
  ['admin-stats'],
  ['admin-users'],
  ['admin', 'stats'],
  ['admin', 'users'],
  ['admin', 'subscriber-stats'],
  ['admin', 'subscribers-list'],
  ['subscriber-stats'],
  ['subscribers-list'],
] as const;

// ============================================
// HELPER: Determine subscription change type
// ============================================

type ChangeType = 'new_subscriber' | 'upgrade' | 'downgrade' | 'cancelled' | 'reactivated' | 'updated';

function determineChangeType(
  newRecord: Record<string, unknown>,
  oldRecord: Record<string, unknown> | null
): ChangeType {
  const newType = newRecord.account_type as string;
  const oldType = oldRecord?.account_type as string;
  const newStatus = newRecord.subscription_status as string;
  const oldStatus = oldRecord?.subscription_status as string;

  if (oldType === 'free' && (newType === 'basic' || newType === 'premium')) {
    return 'new_subscriber';
  }
  if (oldType === 'basic' && newType === 'premium') {
    return 'upgrade';
  }
  if (
    (oldType === 'premium' && newType === 'basic') ||
    ((oldType === 'basic' || oldType === 'premium') && newType === 'free')
  ) {
    return 'downgrade';
  }
  if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
    return 'cancelled';
  }
  if (newStatus === 'active' && oldStatus === 'cancelled') {
    return 'reactivated';
  }
  return 'updated';
}

function getChangeMessage(changeType: ChangeType, profile: ProfileChange): string {
  const name = profile.display_name || profile.email?.split('@')[0] || 'User';
  
  switch (changeType) {
    case 'new_subscriber':
      return `🎉 ${name} subscribed to ${profile.account_type?.toUpperCase()}!`;
    case 'upgrade':
      return `⬆️ ${name} upgraded to ${profile.account_type?.toUpperCase()}!`;
    case 'downgrade':
      return `⬇️ ${name} downgraded to ${profile.account_type?.toUpperCase()}`;
    case 'cancelled':
      return `❌ ${name} cancelled their subscription`;
    case 'reactivated':
      return `✅ ${name} reactivated their subscription`;
    default:
      return `👤 ${name}'s profile updated`;
  }
}

// ============================================
// MAIN HOOK
// ============================================

export function useRealtimeSubscriptions(options: UseRealtimeSubscriptionsOptions = {}) {
  const {
    enabled = true,
    showToasts = true,
    invalidateQueries = true,
    debug = false,
  } = options;

  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Use refs to avoid dependency changes
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const log = useCallback((message: string, ...args: unknown[]) => {
    if (debug) {
      console.log(message, ...args);
    }
  }, [debug]);

  // ============================================
  // INVALIDATE ADMIN QUERIES
  // ============================================
  const invalidateAdminQueries = useCallback(() => {
    if (!invalidateQueries) return;

    log('🔄 Invalidating admin queries...');
    
    ADMIN_QUERY_KEYS.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });

    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('admin');
      },
    });
  }, [queryClient, invalidateQueries, log]);

  // ============================================
  // SETUP REALTIME SUBSCRIPTION
  // ============================================
  useEffect(() => {
    if (!enabled) {
      return;
    }

    log('🔌 Setting up Supabase Realtime subscription...');

    const channel = supabase
      .channel('admin-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown>;
          const oldRecord = payload.old as Record<string, unknown> | null;
          
          log('📡 Realtime profile change:', payload.eventType);

          const subscriptionFieldsChanged =
            newRecord.account_type !== oldRecord?.account_type ||
            newRecord.subscription_status !== oldRecord?.subscription_status ||
            newRecord.subscription_interval !== oldRecord?.subscription_interval;

          if (!subscriptionFieldsChanged && payload.eventType === 'UPDATE') {
            invalidateAdminQueries();
            return;
          }

          const profile: ProfileChange = {
            id: newRecord.id as string,
            email: newRecord.email as string,
            display_name: newRecord.display_name as string,
            account_type: newRecord.account_type as string,
            subscription_status: newRecord.subscription_status as string,
            subscription_interval: newRecord.subscription_interval as string,
            old_account_type: oldRecord?.account_type as string,
            old_subscription_status: oldRecord?.subscription_status as string,
          };

          const changeType = determineChangeType(newRecord, oldRecord);
          const message = getChangeMessage(changeType, profile);
          const currentOptions = optionsRef.current;

          if (currentOptions.showToasts !== false && changeType !== 'updated') {
            switch (changeType) {
              case 'new_subscriber':
                toast.success(message, { duration: 5000 });
                break;
              case 'upgrade':
                toast.success(message, { duration: 4000 });
                break;
              case 'downgrade':
                toast.info(message, { duration: 4000 });
                break;
              case 'cancelled':
                toast.warning(message, { duration: 4000 });
                break;
              case 'reactivated':
                toast.success(message, { duration: 4000 });
                break;
            }
          }

          // Call callbacks
          const callbacks = currentOptions.callbacks;
          if (callbacks) {
            switch (changeType) {
              case 'new_subscriber':
                callbacks.onNewSubscriber?.(profile);
                break;
              case 'upgrade':
                callbacks.onSubscriptionUpgrade?.(profile);
                break;
              case 'downgrade':
                callbacks.onSubscriptionDowngrade?.(profile);
                break;
              case 'cancelled':
                callbacks.onSubscriptionCancelled?.(profile);
                break;
            }
            callbacks.onAnyChange?.(profile, changeType);
          }

          invalidateAdminQueries();
        }
      )
      .subscribe((status) => {
        log('📡 Realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          log('✅ Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsSubscribed(false);
        } else if (status === 'CLOSED') {
          setIsSubscribed(false);
        }
      });

    return () => {
      log('🔌 Cleaning up Realtime subscription...');
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [enabled, invalidateAdminQueries, log]); // Stable dependencies!

  const refresh = useCallback(() => {
    invalidateAdminQueries();
  }, [invalidateAdminQueries]);

  return {
    refresh,
    isSubscribed,
  };
}

// ============================================
// SIMPLIFIED HOOK FOR ADMIN PAGES
// ============================================

export function useAdminRealtimeUpdates(showToasts = true) {
  return useRealtimeSubscriptions({
    enabled: true,
    showToasts,
    invalidateQueries: true,
    debug: false, // Set to true for debugging
  });
}

export default useRealtimeSubscriptions;