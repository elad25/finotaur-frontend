// src/services/copilotSynthesisBriefApi.ts
// FINOTAUR — Weekly Synthesis Brief API (Phase 1: global, Phase 2: personalized)

import { supabase } from '@/lib/supabase';

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

export interface GroundSentimentItem {
  quote: string;
  attribution?: string;
  source?: string;
  classification?: 'leading' | 'lagging';
  sector?: string;
}

export interface SectorCall {
  sector: string;
  stance: 'OW' | 'MW' | 'UW';
  rationale: string;
}

export interface TradeIdea {
  symbol: string;
  sector?: string;
  time_horizon: 'short' | 'medium' | 'long';
  source: 'war_zone' | 'weekly' | 'ism' | 'synthesis';
  thesis: string;
  entry?: string | number;
  stop?: string | number;
  target?: string | number;
  rr?: number;
  conviction: 'high' | 'medium' | 'low';
  /** Two to three short catalyst tags added by Task C backend update */
  catalysts?: string[];
}

export interface KeyRisk {
  risk: string;
  impact?: string;
  probability?: string;
}

export interface SynthesisBrief {
  id: string;
  week_start: string;          // ISO date "YYYY-MM-DD"
  generated_at: string;        // ISO timestamp
  model: string;
  cost_usd: number;
  visibility: 'live' | 'draft';
  qa_score: number | null;
  central_thesis: string;
  macro_narrative: string;
  weekly_context: string;
  this_week_tactical: string;
  ground_sentiment: GroundSentimentItem[];
  sector_calls: SectorCall[];
  trade_ideas: TradeIdea[];
  key_risks: KeyRisk[];
  source_provenance: Record<string, unknown>;
}

export interface SynthesisBriefResponse {
  brief: SynthesisBrief;
  selfHealed: boolean;
}

// ---------------------------------------------------------------------------
// Phase 2: Personalization types
// ---------------------------------------------------------------------------

export interface RankedTradeIdea {
  ideaIndex: number;
  relevanceScore: number;
  whyForYou: string;
}

export interface PersonalizedBriefPayload {
  degenerate: boolean;
  personalCommentary: string | null;
  rankedTradeIdeas: RankedTradeIdea[];
  expiresAt?: string;
  model?: string;
  costUsd?: number;
  error?: string;
}

export interface PersonalizedResponse {
  global: SynthesisBrief | null;
  personal: PersonalizedBriefPayload | null;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export async function fetchSynthesisBrief(): Promise<SynthesisBriefResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/ai/copilot/synthesis-brief`, { headers });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      (payload as { message?: string; error?: string }).message
      ?? (payload as { message?: string; error?: string }).error
      ?? `Synthesis brief request failed (${response.status})`
    );
  }

  return response.json() as Promise<SynthesisBriefResponse>;
}

export async function fetchPersonalizedSynthesisBrief(): Promise<PersonalizedResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/ai/copilot/synthesis-brief/personalized`, { headers });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      (payload as { message?: string; error?: string }).message
      ?? (payload as { message?: string; error?: string }).error
      ?? `Personalized brief request failed (${response.status})`
    );
  }

  return response.json() as Promise<PersonalizedResponse>;
}
