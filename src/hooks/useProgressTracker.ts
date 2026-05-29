import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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

function rulesKey(userId: string) {
  return `finotaur:journal:progress:rules:${userId}`;
}

function entriesKey(userId: string) {
  return `finotaur:journal:progress:entries:${userId}`;
}

function loadRules(userId: string): ProgressRule[] {
  try {
    const raw = localStorage.getItem(rulesKey(userId));
    return raw ? (JSON.parse(raw) as ProgressRule[]) : [];
  } catch {
    return [];
  }
}

function loadEntries(userId: string): ProgressEntry[] {
  try {
    const raw = localStorage.getItem(entriesKey(userId));
    return raw ? (JSON.parse(raw) as ProgressEntry[]) : [];
  } catch {
    return [];
  }
}

function saveRules(userId: string, rules: ProgressRule[]) {
  localStorage.setItem(rulesKey(userId), JSON.stringify(rules));
}

function saveEntries(userId: string, entries: ProgressEntry[]) {
  localStorage.setItem(entriesKey(userId), JSON.stringify(entries));
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

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
  days: number
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

export function useProgressTracker() {
  const { user } = useAuth();
  const userId = user?.id ?? 'anon';

  const [rules, setRules] = useState<ProgressRule[]>(() => loadRules(userId));
  const [entries, setEntries] = useState<ProgressEntry[]>(() => loadEntries(userId));
  const [isLoading] = useState(false);

  // Reload from localStorage when userId changes (e.g. after login)
  useEffect(() => {
    setRules(loadRules(userId));
    setEntries(loadEntries(userId));
  }, [userId]);

  const persistRules = useCallback(
    (next: ProgressRule[]) => {
      setRules(next);
      saveRules(userId, next);
    },
    [userId]
  );

  const persistEntries = useCallback(
    (next: ProgressEntry[]) => {
      setEntries(next);
      saveEntries(userId, next);
    },
    [userId]
  );

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

  const addRule = useCallback(
    (text: string) => {
      const activeCount = rules.filter(r => r.isActive).length;
      if (activeCount >= 10) {
        toast.error('Maximum 10 active rules allowed.');
        return;
      }
      const maxOrder = rules.length > 0 ? Math.max(...rules.map(r => r.order)) : -1;
      const newRule: ProgressRule = {
        id: crypto.randomUUID(),
        text: text.slice(0, 200),
        order: maxOrder + 1,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      persistRules([...rules, newRule]);
    },
    [rules, persistRules]
  );

  const updateRule = useCallback(
    (id: string, text: string) => {
      persistRules(rules.map(r => (r.id === id ? { ...r, text: text.slice(0, 200) } : r)));
    },
    [rules, persistRules]
  );

  const deleteRule = useCallback(
    (id: string) => {
      persistRules(rules.filter(r => r.id !== id));
    },
    [rules, persistRules]
  );

  const reorderRules = useCallback(
    (newOrder: ProgressRule[]) => {
      const reindexed = newOrder.map((r, i) => ({ ...r, order: i }));
      persistRules(reindexed);
    },
    [persistRules]
  );

  const toggleEntry = useCallback(
    (ruleId: string, date?: string) => {
      const d = date ?? todayStr();
      const existing = entries.find(e => e.ruleId === ruleId && e.date === d);

      if (!existing) {
        persistEntries([...entries, { ruleId, date: d, completed: true }]);
      } else if (!existing.completed) {
        persistEntries(
          entries.map(e =>
            e.ruleId === ruleId && e.date === d ? { ...e, completed: true } : e
          )
        );
      } else {
        // flip to false → remove the record
        persistEntries(entries.filter(e => !(e.ruleId === ruleId && e.date === d)));
      }
    },
    [entries, persistEntries]
  );

  return {
    rules,
    todayEntries,
    streak,
    weeklyScore,
    monthlyScore,
    isLoading,
    addRule,
    updateRule,
    deleteRule,
    reorderRules,
    toggleEntry,
  };
}
