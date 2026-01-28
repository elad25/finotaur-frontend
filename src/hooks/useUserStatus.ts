// =====================================================
// FINOTAUR: User Status Hook v2.0
// Uses EXISTING get_user_subscription_status() RPC
// =====================================================

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

interface SubscriptionStatus {
  // Newsletter (War Zone)
  newsletter_paid: boolean;
  newsletter_status: string;
  newsletter_expires_at: string | null;
  newsletter_interval: string | null;
  // Top Secret
  top_secret_enabled: boolean;
  top_secret_status: string;
  top_secret_expires_at: string | null;
  // User meta
  role: string;
  is_tester?: boolean;
}

export function useWarZoneStatus() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<SubscriptionStatus | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    try {
      // 🔥 Use EXISTING function that returns TABLE
      const { data: result, error } = await supabase.rpc('get_user_subscription_status', {
        p_user_id: user.id
      });
      
      if (error) {
        console.error('[useWarZoneStatus] RPC error:', error);
        throw error;
      }
      
      // Result is array, take first row
      if (result && result.length > 0) {
        setData(result[0]);
      }
    } catch (err) {
      console.error('[useWarZoneStatus] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 🔥 Map DB fields to hook interface
  // Trial users should have access even if newsletter_paid is false
  const isActive = data?.newsletter_status === 'active' || 
                   data?.newsletter_status === 'trial' || 
                   data?.newsletter_status === 'trialing';
  const isInTrial = data?.newsletter_status === 'trial';

  return {
    isActive,
    isInTrial,
    status: data?.newsletter_status ?? '',
    membershipId: null,
    expiresAt: data?.newsletter_expires_at ?? null,
    trialEndsAt: null,
    cancelAtPeriodEnd: false,
    daysRemaining: null,
    trialDaysRemaining: null,
    isLoading,
    refresh,
  };
}

export function useTopSecretStatus() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<SubscriptionStatus | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    try {
      const { data: result, error } = await supabase.rpc('get_user_subscription_status', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      if (result && result.length > 0) {
        setData(result[0]);
      }
    } catch (err) {
      console.error('[useTopSecretStatus] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isActive: data?.top_secret_enabled === true && 
              (data?.top_secret_status === 'active' || data?.top_secret_status === 'trial'),
    status: data?.top_secret_status ?? '',
    membershipId: null,
    expiresAt: data?.top_secret_expires_at ?? null,
    isLoading,
    refresh,
  };
}

export function useUserMeta() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{ role: string; is_tester: boolean } | null>(null);

  useEffect(() => {
    async function fetchMeta() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_tester')
          .eq('id', user.id)
          .single();
        
        setData(profile);
      } catch (err) {
        console.error('[useUserMeta] Error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMeta();
  }, [user?.id]);

  return {
    role: data?.role ?? null,
    isTester: data?.is_tester ?? false,
    isAdmin: data?.role === 'admin' || data?.role === 'super_admin',
    isLoading,
  };
}