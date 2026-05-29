import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

type AccountType = 'free' | 'basic' | 'premium' | 'admin';

// Bound the profiles fetch. supabase-js has no built-in timeout, so a stalled
// network would otherwise pin the BacktestRoute gate on an infinite "Loading…"
// spinner. 8s is far above a healthy round-trip and well below user patience.
const ACCESS_FETCH_TIMEOUT_MS = 8000;

async function fetchAccountType(userId: string): Promise<AccountType> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ACCESS_FETCH_TIMEOUT_MS);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', userId)
      .abortSignal(controller.signal)
      .maybeSingle();
    if (error) throw error;
    return (data?.account_type as AccountType) || 'free';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * useBacktestAccess — resolves the current user's backtest entitlement.
 *
 * React Query-backed (was a raw useEffect+useState): the result is cached per
 * user id with a 5-minute staleTime, so navigating between backtest tabs no
 * longer re-fetches `profiles` on every BacktestRoute re-mount (which showed a
 * fresh full-screen spinner each time and could hang on a stalled request).
 * The first load is bounded by an 8s abort so `isLoading` can never stick.
 */
export const useBacktestAccess = () => {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;

  const { data: accountType = 'free', isLoading } = useQuery<AccountType>({
    queryKey: ['backtest-access', userId ?? 'anon'],
    enabled: !!userId,
    queryFn: () => fetchAccountType(userId as string),
    staleTime: 5 * 60 * 1000,   // cache across tab switches — no refetch storm
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Loading only while auth itself is resolving, or while the entitlement
  // fetch is in flight for a known user. A resolved-but-logged-out visitor
  // (authLoading false, no userId) is NOT loading → falls through to the
  // landing/upsell rather than spinning forever. This also avoids flashing the
  // upsell to a premium user during the brief auth-resolution window.
  const resolvedLoading = authLoading || (!!userId && isLoading);
  const hasAccess = accountType === 'premium' || accountType === 'admin';

  return {
    hasAccess,
    accountType,
    isLoading: resolvedLoading,
    isPremium: accountType === 'premium',
    isAdmin: accountType === 'admin',
    isBasic: accountType === 'basic',
    isFree: accountType === 'free',
  };
};

export default useBacktestAccess;
