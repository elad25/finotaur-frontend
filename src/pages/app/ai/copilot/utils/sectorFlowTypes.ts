// Mirror of finotaur-server /api/sector-flow response shapes.

export interface ScoredEtf {
  etf: string;
  subSector: string;
  parentSector: string;
  priceChangePct: number;
  volumeZScore: number;
  relativeStrength5d: number;
  composite: number;
  rank: number;
}

export interface EtfFailure {
  etf: string;
  error: string;
}

export interface SectorFlowSnapshot {
  fetchedAt: string;
  etfCount: number;
  successCount: number;
  failureCount: number;
  ranked: ScoredEtf[];
  sharpestMovers: ScoredEtf[];
  weakestMovers: ScoredEtf[];
  failures: EtfFailure[];
  cached: boolean;
}

export interface SectorFlowHighlight {
  etf: string;
  reason: string;
}

export interface SectorFlowBriefing {
  cached: boolean;
  generatedAt: string;
  brief: string;
  highlights: SectorFlowHighlight[];
  modelUsed: string;
  ageMs: number;
}

export interface SectorFlowBriefingError {
  error: 'briefing_generation_failed' | 'no_data';
  message?: string;
}

export function isSectorFlowBriefingError(
  payload: SectorFlowBriefing | SectorFlowBriefingError | null | undefined,
): payload is SectorFlowBriefingError {
  return !!payload && typeof payload === 'object' && 'error' in payload && typeof (payload as SectorFlowBriefingError).error === 'string';
}
