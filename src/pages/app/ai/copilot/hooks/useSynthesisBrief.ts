// hooks/useSynthesisBrief.ts
// Fetches the global synthesis brief once on mount; shares state between consumers.
// Phase 2: also fires a lazy personalization request once the global brief resolves.

import { useState, useEffect } from 'react';
import {
  fetchSynthesisBrief,
  fetchPersonalizedSynthesisBrief,
  type SynthesisBrief,
  type PersonalizedBriefPayload,
} from '@/services/copilotSynthesisBriefApi';

export interface UseSynthesisBriefResult {
  brief: SynthesisBrief | null;
  loading: boolean;
  error: Error | null;
  selfHealed: boolean;
  personal: PersonalizedBriefPayload | null;
  personalLoading: boolean;
  personalError: Error | null;
}

export function useSynthesisBrief(): UseSynthesisBriefResult {
  const [brief, setBrief] = useState<SynthesisBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selfHealed, setSelfHealed] = useState(false);

  // Phase 2: personalization state
  const [personal, setPersonal] = useState<PersonalizedBriefPayload | null>(null);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalError, setPersonalError] = useState<Error | null>(null);

  // Effect 1: fetch global brief
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSynthesisBrief();
        if (!cancelled) {
          setBrief(data.brief);
          setSelfHealed(data.selfHealed);
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

  // Effect 2: fetch personalization lazily, once the global brief is available
  useEffect(() => {
    if (!brief) return;

    let cancelled = false;

    async function loadPersonal() {
      try {
        setPersonalLoading(true);
        setPersonalError(null);
        const data = await fetchPersonalizedSynthesisBrief();
        if (!cancelled) {
          setPersonal(data.personal);
        }
      } catch (err) {
        if (!cancelled) {
          setPersonalError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setPersonalLoading(false);
      }
    }

    void loadPersonal();
    return () => { cancelled = true; };
  }, [brief]);

  return { brief, loading, error, selfHealed, personal, personalLoading, personalError };
}
