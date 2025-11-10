/**
 * ================================================
 * GLOBAL REALTIME SUBSCRIPTION FOR RISK SETTINGS
 * ✅ Single subscription for entire app
 * ✅ Invalidates cache on changes
 * ✅ No duplicate subscriptions
 * ================================================
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

interface RiskSettingsRealtimeProviderProps {
  children: React.ReactNode;
}

export function RiskSettingsRealtimeProvider({ children }: RiskSettingsRealtimeProviderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    console.log('🔌 Setting up global risk settings realtime subscription');

    // ✅ Single global subscription for the entire app
    const channel = supabase
      .channel('risk_settings_global')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Risk settings updated in DB - invalidating cache', payload);
          
          // ✅ Invalidate React Query cache - will refetch automatically
          queryClient.invalidateQueries({ 
            queryKey: ['riskSettings', user.id] 
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Risk settings realtime subscription active');
        }
      });

    // ✅ Cleanup on unmount or user change
    return () => {
      console.log('🔌 Removing risk settings realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // ✅ Just pass through children - no extra UI
  return <>{children}</>;
}