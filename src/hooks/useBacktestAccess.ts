import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export const useBacktestAccess = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [accountType, setAccountType] = useState<'free' | 'basic' | 'premium'>('free');

  useEffect(() => {
    async function fetchAccountType() {
      if (!user?.id) {
        setAccountType('free');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setAccountType(data?.account_type || 'free');
      } catch (error) {
        console.error('Error fetching account type:', error);
        setAccountType('free');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccountType();
  }, [user?.id]);

  const hasAccess = accountType === 'premium';

  return {
    hasAccess,
    accountType,
    isLoading,
    isPremium: hasAccess,
    isBasic: accountType === 'basic',
    isFree: accountType === 'free',
  };
};