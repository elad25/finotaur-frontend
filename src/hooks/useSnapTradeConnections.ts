// src/hooks/useSnapTradeConnections.ts
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from './useAuth';

export interface SnapTradeConnection {
  id: string;
  user_id: string;
  broker: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING';
  account_id: string | null;
  account_name: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// 🔥 פונקציית fetch מחוץ ל-hook
// ============================================
async function fetchSnapTradeConnections(userId: string): Promise<SnapTradeConnection[]> {
  const { data, error } = await supabase
    .from('broker_connections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SnapTradeConnection[];
}

export function useSnapTradeConnections() {
  const { getEffectiveUserId, isLoading: authLoading } = useAuth();
  
  const effectiveUserId = useMemo(() => getEffectiveUserId(), [getEffectiveUserId]);

  return useQuery({
    queryKey: queryKeys.snapTradeConnections(), // כבר מוגדר ב-queryClient שלך
    queryFn: () => fetchSnapTradeConnections(effectiveUserId!),
    enabled: !!effectiveUserId && !authLoading, // רק אם יש user
    staleTime: 5 * 60 * 1000, // 5 דקות
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}