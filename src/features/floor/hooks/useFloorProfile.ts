// src/hooks/useFloorProfile.ts
// =====================================================
// THE FLOOR — profile hook
// Fetches and caches the current user's Floor profile
// (floor_username, display_name, avatar_url).
// =====================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// =====================================================
// Types
// =====================================================

export interface FloorProfile {
  floor_username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  floor_username_locked_until: string | null;
}

// =====================================================
// Query key (exported so invalidation works cross-file)
// =====================================================

export const FLOOR_PROFILE_QUERY_KEY = ['floor-profile'] as const;

// =====================================================
// Hook
// =====================================================

export function useFloorProfile() {
  const { user } = useAuth();

  const query = useQuery<FloorProfile | null>({
    queryKey: [...FLOOR_PROFILE_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('floor_username, display_name, avatar_url, floor_username_locked_until')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as FloorProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 min — profile changes are infrequent
  });

  const isComplete = !!query.data?.floor_username;

  return {
    profile: query.data ?? null,
    isComplete,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// =====================================================
// Invalidation helper (used by FloorProfileDialog)
// =====================================================

export function useInvalidateFloorProfile() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: FLOOR_PROFILE_QUERY_KEY });
}
