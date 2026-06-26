// src/features/floor/hooks/useUserDisciplineScore.ts
// Backward-compat re-export. The hook and type now live in:
//   @/features/shared/hooks/useUserDisciplineScore
//   @/features/shared/types/discipline
// Floor-internal callers (SharedTradeCard) continue to work from this path.
// New callers (e.g. mentor) MUST import from @/features/shared/... directly.

export {
  useUserDisciplineScore,
  useUserDisciplineScores,
} from '@/features/shared/hooks/useUserDisciplineScore';
