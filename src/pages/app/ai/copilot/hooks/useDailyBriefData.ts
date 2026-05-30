// hooks/useDailyBriefData.ts
// Fetches the personalized daily brief once on mount.
// Both global and personal arrive in a single call.

import { useState, useEffect } from 'react';
import {
  fetchPersonalizedDailyBrief,
  type DailyGlobalBrief,
  type DailyPersonalization,
} from '@/services/copilotDailyBriefApi';

export interface UseDailyBriefDataResult {
  global: DailyGlobalBrief | null;
  personal: DailyPersonalization | null;
  loading: boolean;
  error: Error | null;
}

export function useDailyBriefData(): UseDailyBriefDataResult {
  const [global, setGlobal] = useState<DailyGlobalBrief | null>(null);
  const [personal, setPersonal] = useState<DailyPersonalization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPersonalizedDailyBrief();
        if (!cancelled) {
          setGlobal(data.global);
          setPersonal(data.personal);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return { global, personal, loading, error };
}
