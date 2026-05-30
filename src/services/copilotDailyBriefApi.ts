// src/services/copilotDailyBriefApi.ts
// FINOTAUR — Daily Brief API (personalized endpoint)

import { supabase } from '@/lib/supabase';
import type {
  EventRadarItem,
  RankedTradeIdea,
  PlanAction,
} from './copilotSynthesisBriefApi';
import type { ModuleGlance } from '@/pages/app/ai/copilot/utils/buildBriefModules';
import type { RotationRow } from '@/pages/app/ai/copilot/brief/QuantFlow';

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || '';
    return {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    };
  } catch {
    return {
      'Content-Type': 'application/json',
      'x-user-id': '',
    };
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyOpportunityItem {
  symbol: string;
  thesis: string;
  entry?: string;
  stop?: string;
  target?: string;
  conviction?: 'High' | 'Medium' | 'Low' | string;
  catalysts?: string[];
}

export interface DailyRiskItem {
  risk: string;
  severity?: string;
  time_horizon?: string;
}

export interface DailyBriefModules {
  bluf?:           { glance?: ModuleGlance; deep?: { narrative?: string } };
  marketPulse?:    { glance?: ModuleGlance; deep?: { narrative?: string } };
  eventRadar?:     { glance?: ModuleGlance; items?: EventRadarItem[] };
  quantFlow?:      { glance?: ModuleGlance; deep?: { narrative?: string }; rotation?: RotationRow[] };
  opportunities?:  { glance?: ModuleGlance; items?: DailyOpportunityItem[] };
  riskManagement?: { glance?: ModuleGlance; items?: DailyRiskItem[] };
  pmNote?:         { glance?: ModuleGlance; deep?: { narrative?: string } };
}

export interface DailyGlobalBrief {
  id: string;
  brief_date: string;
  generated_at: string;
  model?: string;
  modules: DailyBriefModules;
  trade_ideas?: unknown[];
}

export interface DailyPersonalization {
  personalCommentary?: string | null;
  rankedTradeIdeas?: RankedTradeIdea[];
  degenerate?: boolean;
  modules?: {
    portfolioToday?: { glance?: ModuleGlance; deep?: { narrative?: string } };
    thePlan?: { glance?: ModuleGlance; actions?: PlanAction[] };
  };
}

export interface PersonalizedDailyResponse {
  global: DailyGlobalBrief | null;
  personal: DailyPersonalization | null;
}

// Re-export shared types for consumers of this module
export type { EventRadarItem, RankedTradeIdea, PlanAction, ModuleGlance, RotationRow };

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

// GET /api/ai/copilot/daily-brief/personalized
export async function fetchPersonalizedDailyBrief(): Promise<PersonalizedDailyResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE}/api/ai/copilot/daily-brief/personalized`,
    { headers },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      (payload as { message?: string; error?: string }).message
      ?? (payload as { message?: string; error?: string }).error
      ?? `Daily brief request failed (${response.status})`
    );
  }

  return response.json() as Promise<PersonalizedDailyResponse>;
}
