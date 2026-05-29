import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

// ============================================================
// Types — public API (UI depends on these exact shapes)
// ============================================================

export type ProgressRule = {
  id: string;
  text: string;
  order: number;
  isActive: boolean;
  createdAt: string;
};

export type ProgressEntry = {
  ruleId: string;
  date: string;
  completed: boolean;
};

// ============================================================
// DB row → domain type mappers
// ============================================================

function mapRule(row: {
  id: string;
  text: string;
  order: number;
  is_active: boolean;
  created_at: string;
}): ProgressRule {
  return {
    id: row.id,
    text: row.text,
    order: row.order,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapEntry(row: {
  rule_id: string;
  date: string;
  completed: boolean;
}): ProgressEntry {
  return { ruleId: row.rule_id, date: row.date, completed: row.completed };
}

// ============================================================
// Date helpers
// ============================================================

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Pure compute functions (unchanged logic from localStorage era)
// ============================================================

function computeStreak(rules: ProgressRule[], entries: ProgressEntry[]): number {
  const activeRules = rules.filter(r => r.isActive);
  if (activeRules.length === 0) return 0;

  const today = todayStr();
  let streak = 0;

  for (let i = 0; i <= 365; i++) {
    const date = dateNDaysAgo(i);

    // If today has no entries at all, don't break the streak — skip and check yesterday
    if (date === today) {
      const todayCompleted = entries.filter(e => e.date === today && e.completed).length;
      if (todayCompleted === 0) continue;
    }

    const completedCount = entries.filter(e => e.date === date && e.completed).length;
    const passed = completedCount >= Math.ceil(activeRules.length * 0.5);

    if (passed) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function computePeriodScore(
  rules: ProgressRule[],
  entries: ProgressEntry[],
  days: number,
): number {
  const activeRules = rules.filter(r => r.isActive);
  if (activeRules.length === 0) return 0;

  const total = activeRules.length * days;
  let completed = 0;

  for (let i = 0; i < days; i++) {
    const date = dateNDaysAgo(i);
    completed += entries.filter(e => e.date === date && e.completed).length;
  }

  return Math.round((completed / total) * 100);
}

// ============================================================
// Hook
// ============================================================

export function useProgressTracker() {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  // ── Rules query (only active rules, ordered) ──────────────
  const rulesQuery = useQuery({
    queryKey: ['journal-progress-rules', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_progress_rules')
        .select('id, text, "order", is_active, created_at')
        .eq('user_id', userId!)
        .eq('is_active', true)
        .order('"order"', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapRule);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ── Entries query: last 30 days (covers streak + monthly) ──
  const entriesQuery = useQuery({
    queryKey: ['journal-progress-entries', userId],
    queryFn: async () => {
      const from = dateNDaysAgo(365); // covers full streak window
      const { data, error } = await supabase
        .from('journal_progress_entries')
        .select('rule_id, date, completed')
        .eq('user_id', userId!)
        .gte('date', from);
      if (error) throw error;
      return (data ?? []).map(mapEntry);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const rules = rulesQuery.data ?? [];
  const entries = entriesQuery.data ?? [];

  // ── Derived state ──────────────────────────────────────────
  const todayEntries = useMemo<Map<string, boolean>>(() => {
    const today = todayStr();
    const map = new Map<string, boolean>();
    for (const e of entries) {
      if (e.date === today) {
        map.set(e.ruleId, e.completed);
      }
    }
    return map;
  }, [entries]);

  const streak = useMemo(() => computeStreak(rules, entries), [rules, entries]);
  const weeklyScore = useMemo(() => computePeriodScore(rules, entries, 7), [rules, entries]);
  const monthlyScore = useMemo(() => computePeriodScore(rules, entries, 30), [rules, entries]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['journal-progress-rules', userId] });
    qc.invalidateQueries({ queryKey: ['journal-progress-entries', userId] });
  };

  // ── Mutations ──────────────────────────────────────────────

  const addRuleMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!userId) throw new Error('No user ID');
      const maxOrder = rules.length > 0 ? Math.max(...rules.map(r => r.order)) : -1;
      const { error } = await supabase.from('journal_progress_rules').insert({
        user_id: userId,
        text: text.slice(0, 200),
        order: maxOrder + 1,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase
        .from('journal_progress_rules')
        .update({ text: text.slice(0, 200) })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Soft delete — flip is_active=false to preserve historical entries
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase
        .from('journal_progress_rules')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorderRulesMutation = useMutation({
    mutationFn: async (newOrder: ProgressRule[]) => {
      if (!userId) throw new Error('No user ID');
      const updates = newOrder.map((r, i) =>
        supabase
          .from('journal_progress_rules')
          .update({ order: i })
          .eq('id', r.id)
          .eq('user_id', userId),
      );
      const results = await Promise.all(updates);
      for (const { error } of results) {
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const toggleEntryMutation = useMutation({
    mutationFn: async ({ ruleId, date }: { ruleId: string; date: string }) => {
      if (!userId) throw new Error('No user ID');
      // Determine current state to flip it
      const existing = entries.find(e => e.ruleId === ruleId && e.date === date);
      const nextCompleted = existing ? !existing.completed : true;

      const { error } = await supabase.from('journal_progress_entries').upsert(
        {
          user_id: userId,
          rule_id: ruleId,
          date,
          completed: nextCompleted,
        },
        { onConflict: 'user_id,rule_id,date' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-progress-entries', userId] });
    },
  });

  // ── Public API ─────────────────────────────────────────────

  return {
    rules,
    todayEntries,
    streak,
    weeklyScore,
    monthlyScore,
    isLoading: rulesQuery.isLoading,

    addRule: (text: string) => addRuleMutation.mutate(text),
    updateRule: (id: string, text: string) => updateRuleMutation.mutate({ id, text }),
    deleteRule: (id: string) => deleteRuleMutation.mutate(id),
    reorderRules: (newOrder: ProgressRule[]) => reorderRulesMutation.mutate(newOrder),
    toggleEntry: (ruleId: string, date?: string) =>
      toggleEntryMutation.mutate({ ruleId, date: date ?? todayStr() }),
  };
}
