// src/hooks/useDayScenarios.ts
// Supabase-backed hook for the Gameplan (day_scenarios) feature.
// Mirrors the DayScenario shape used in Scenarios.tsx to/from DB columns.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

// ============================================================
// Types (intentionally duplicated here so the hook is self-
// contained; Scenarios.tsx imports these instead of redefining)
// ============================================================

export interface Scenario {
  type: 'bullish' | 'bearish' | 'neutral';
  entryCondition: string;
  plannedAction: string;
  mentalState: number; // 1-5 scale
  tags: string[];
}

export interface DayScenario {
  id: string;
  date: string;      // ISO date "YYYY-MM-DD"
  title: string;
  description: string;
  scenarios: {
    bullish: Scenario;
    bearish: Scenario;
    neutral: Scenario;
  };
  gamePlanNotes: string;
}

// ============================================================
// DB row shape (matches day_scenarios table columns exactly)
// ============================================================

interface DayScenarioRow {
  id: string;
  user_id: string;
  date: string;
  title: string;
  description: string | null;
  bullish_condition: string | null;
  bullish_action: string | null;
  bullish_mental_state: number;
  bullish_tags: string[];
  bearish_condition: string | null;
  bearish_action: string | null;
  bearish_mental_state: number;
  bearish_tags: string[];
  neutral_condition: string | null;
  neutral_action: string | null;
  neutral_mental_state: number;
  neutral_tags: string[];
  game_plan_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Mapping helpers
// ============================================================

function rowToDayScenario(row: DayScenarioRow): DayScenario {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    description: row.description ?? '',
    scenarios: {
      bullish: {
        type: 'bullish',
        entryCondition: row.bullish_condition ?? '',
        plannedAction: row.bullish_action ?? '',
        mentalState: row.bullish_mental_state,
        tags: row.bullish_tags ?? [],
      },
      bearish: {
        type: 'bearish',
        entryCondition: row.bearish_condition ?? '',
        plannedAction: row.bearish_action ?? '',
        mentalState: row.bearish_mental_state,
        tags: row.bearish_tags ?? [],
      },
      neutral: {
        type: 'neutral',
        entryCondition: row.neutral_condition ?? '',
        plannedAction: row.neutral_action ?? '',
        mentalState: row.neutral_mental_state,
        tags: row.neutral_tags ?? [],
      },
    },
    gamePlanNotes: row.game_plan_notes ?? '',
  };
}

function dayScenarioToUpsertPayload(
  scenario: DayScenario,
  userId: string,
): Omit<DayScenarioRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    date: scenario.date,
    title: scenario.title,
    description: scenario.description || null,
    bullish_condition: scenario.scenarios.bullish.entryCondition || null,
    bullish_action: scenario.scenarios.bullish.plannedAction || null,
    bullish_mental_state: scenario.scenarios.bullish.mentalState,
    bullish_tags: scenario.scenarios.bullish.tags,
    bearish_condition: scenario.scenarios.bearish.entryCondition || null,
    bearish_action: scenario.scenarios.bearish.plannedAction || null,
    bearish_mental_state: scenario.scenarios.bearish.mentalState,
    bearish_tags: scenario.scenarios.bearish.tags,
    neutral_condition: scenario.scenarios.neutral.entryCondition || null,
    neutral_action: scenario.scenarios.neutral.plannedAction || null,
    neutral_mental_state: scenario.scenarios.neutral.mentalState,
    neutral_tags: scenario.scenarios.neutral.tags,
    game_plan_notes: scenario.gamePlanNotes || null,
  };
}

// ============================================================
// Query key
// ============================================================

export const DAY_SCENARIOS_QUERY_KEY = (userId: string) =>
  ['day-scenarios', userId] as const;

// ============================================================
// useDayScenarios — fetch hook
// ============================================================

export function useDayScenarios() {
  const { id: userId } = useEffectiveUser();

  return useQuery({
    queryKey: userId ? DAY_SCENARIOS_QUERY_KEY(userId) : ['day-scenarios', null],
    queryFn: async (): Promise<DayScenario[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('day_scenarios')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30);

      if (error) {
        console.error('[useDayScenarios] fetch error:', error.message);
        throw error;
      }

      return (data as DayScenarioRow[]).map(rowToDayScenario);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// ============================================================
// useUpsertDayScenario — upsert mutation
// ============================================================

export function useUpsertDayScenario() {
  const { id: userId } = useEffectiveUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scenario: DayScenario): Promise<DayScenario> => {
      if (!userId) throw new Error('User not authenticated');

      const payload = dayScenarioToUpsertPayload(scenario, userId);

      const { data, error } = await supabase
        .from('day_scenarios')
        .upsert(payload, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) {
        console.error('[useUpsertDayScenario] upsert error:', error.message);
        throw error;
      }

      return rowToDayScenario(data as DayScenarioRow);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: DAY_SCENARIOS_QUERY_KEY(userId) });
      }
    },
  });
}
