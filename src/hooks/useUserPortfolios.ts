// src/hooks/useUserPortfolios.ts
// ═══════════════════════════════════════════════════════════════
// Lists the user's manual portfolios; exposes create/rename/delete
// mutations and active-portfolio selection, all capped by plan tier.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlan } from '@/hooks/usePlan';
import { portfolioLimitsForPlan } from '@/constants/portfolioLimits';

// ── Public types ──────────────────────────────────────────────────

export interface PortfolioSummary {
  id: string;
  name: string;
}

export interface UseUserPortfoliosReturn {
  portfolios: PortfolioSummary[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  loading: boolean;
  saving: boolean;
  error: string | null;
  maxPortfolios: number;
  maxTickersPerPortfolio: number;
  canCreate: boolean;
  reloadList: () => Promise<void>;
  createPortfolio: (name?: string) => Promise<{ id: string | null; reason?: 'limit' | 'error' }>;
  renamePortfolio: (id: string, name: string) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useUserPortfolios(): UseUserPortfoliosReturn {
  const { plan } = usePlan();
  const limits = portfolioLimitsForPlan(plan);

  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Load ─────────────────────────────────────────────────────
  const reloadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPortfolios([]);
        setActiveId(null);
        return;
      }

      const { data, error: dbErr } = await supabase
        .from('portfolios')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .eq('source', 'manual')
        .order('created_at', { ascending: true });

      if (dbErr) throw dbErr;

      const list: PortfolioSummary[] = (data ?? []).map(
        (row: { id: string; name: string }) => ({ id: row.id, name: row.name }),
      );

      setPortfolios(list);

      // Keep activeId pointing to a valid portfolio; fall back to first.
      setActiveId(prev => {
        if (prev && list.some(p => p.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load portfolios';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    reloadList();
  }, [reloadList]);

  // ── Mutations ─────────────────────────────────────────────────

  const createPortfolio = useCallback(
    async (name?: string): Promise<{ id: string | null; reason?: 'limit' | 'error' }> => {
      if (portfolios.length >= limits.maxPortfolios) {
        return { id: null, reason: 'limit' };
      }

      setSaving(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const portfolioName = name?.trim() || `Portfolio ${portfolios.length + 1}`;

        const { data, error: dbErr } = await supabase
          .from('portfolios')
          .insert({
            user_id:           user.id,
            name:              portfolioName,
            source:            'manual',
            environment:       'live',
            is_active:         true,
            currency:          'USD',
            benchmark_enabled: false,
          })
          .select('id')
          .single();

        if (dbErr) throw dbErr;

        const newId: string = data.id;
        await reloadList();
        setActiveId(newId);
        return { id: newId };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create portfolio';
        setError(msg);
        return { id: null, reason: 'error' };
      } finally {
        setSaving(false);
      }
    },
    [portfolios, limits.maxPortfolios, reloadList],
  );

  const renamePortfolio = useCallback(
    async (id: string, name: string): Promise<void> => {
      setSaving(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error: dbErr } = await supabase
          .from('portfolios')
          .update({ name: name.trim() })
          .eq('id', id)
          .eq('user_id', user.id);

        if (dbErr) throw dbErr;

        await reloadList();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to rename portfolio';
        setError(msg);
      } finally {
        setSaving(false);
      }
    },
    [reloadList],
  );

  const deletePortfolio = useCallback(
    async (id: string): Promise<void> => {
      setSaving(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error: dbErr } = await supabase
          .from('portfolios')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (dbErr) throw dbErr;

        await reloadList();

        // If the deleted portfolio was active, reset to the first remaining one.
        setActiveId(prev => {
          if (prev !== id) return prev;
          return null; // reloadList() will set it to the first remaining via its own setActiveId logic
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete portfolio';
        setError(msg);
      } finally {
        setSaving(false);
      }
    },
    [reloadList],
  );

  return {
    portfolios,
    activeId,
    setActiveId,
    loading,
    saving,
    error,
    maxPortfolios:          limits.maxPortfolios,
    maxTickersPerPortfolio: limits.maxTickersPerPortfolio,
    canCreate:              portfolios.length < limits.maxPortfolios,
    reloadList,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
  };
}
