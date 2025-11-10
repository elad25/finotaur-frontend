// src/hooks/useTrackSnapTradeActivity.ts

import { useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

// 🔥 SINGLETON GUARD - prevents multiple instances running simultaneously
let isTrackingActive = false;

/**
 * Track user activity for SnapTrade
 * Updates last_activity_at every 5 minutes to prevent auto-disconnect after 7 days
 * 
 * ⚠️ IMPORTANT: This hook uses a singleton pattern - only one instance will run at a time
 * even if called multiple times (e.g., due to React StrictMode or multiple mounts)
 * 
 * Usage: Add to your main App component
 * 
 * @example
 * function App() {
 *   useTrackSnapTradeActivity();
 *   return <YourApp />
 * }
 */
export function useTrackSnapTradeActivity() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 🔥 EARLY EXIT - prevent duplicate tracking instances
    if (isTrackingActive) {
      if (import.meta.env.DEV) {
        console.log('[SnapTrade] Already tracking - skipping duplicate instance');
      }
      return;
    }

    if (!user) {
      // Clear interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isTrackingActive = false;
      }
      return;
    }

    // 🔥 Mark as active (singleton lock)
    isTrackingActive = true;

    // Function to update activity
    const updateActivity = async () => {
      try {
        const { error } = await supabase
          .from('snaptrade_activity')
          .upsert(
            {
              user_id: user.id,
              last_activity_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id',
              ignoreDuplicates: false,
            }
          );

        // 🔥 Only log errors, not success
        if (error) {
          console.error('[SnapTrade] Update failed:', error.message);
        }
      } catch (error) {
        console.error('[SnapTrade] Unexpected error:', error);
      }
    };

    // Update immediately on mount
    updateActivity();

    // Update every 5 minutes (300000ms)
    // This ensures the user stays "active" while using the app
    intervalRef.current = setInterval(updateActivity, 5 * 60 * 1000);

    // 🔥 Silent - only log in dev mode
    if (import.meta.env.DEV) {
      console.log('[SnapTrade] Tracking started (singleton instance)');
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isTrackingActive = false; // Release singleton lock
        
        if (import.meta.env.DEV) {
          console.log('[SnapTrade] Tracking stopped - singleton released');
        }
      }
    };
  }, [user]);

  // Also update on page visibility change (user comes back to tab)
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await supabase
            .from('snaptrade_activity')
            .upsert(
              {
                user_id: user.id,
                last_activity_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
        } catch (error) {
          console.error('[SnapTrade] Visibility update failed:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);
}

/**
 * Hook to manually update connection status when user connects/disconnects a broker
 * 
 * @example
 * const { markAsConnected, markAsDisconnected } = useSnapTradeConnectionStatus();
 * 
 * // When user connects a broker:
 * await markAsConnected(connectionId, brokerageName);
 * 
 * // When user disconnects:
 * await markAsDisconnected();
 */
export function useSnapTradeConnectionStatus() {
  const { user } = useAuth();

  const markAsConnected = async (connectionId: string, brokerageName?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('snaptrade_activity')
        .upsert(
          {
            user_id: user.id,
            connection_status: 'connected',
            brokerage_connection_id: connectionId,
            brokerage_name: brokerageName,
            connected_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      console.log('[SnapTrade] Connected - billing: $1.50/month');
    } catch (error) {
      console.error('[SnapTrade] Connection failed:', error);
      throw error;
    }
  };

  const markAsDisconnected = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('snaptrade_activity')
        .update({
          connection_status: 'disconnected',
          disconnected_at: new Date().toISOString(),
          brokerage_connection_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('[SnapTrade] Disconnected - billing stopped');
    } catch (error) {
      console.error('[SnapTrade] Disconnect failed:', error);
      throw error;
    }
  };

  return {
    markAsConnected,
    markAsDisconnected,
  };
}