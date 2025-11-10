export function percentileRank(arr: number[], value: number): number {
  if (!arr.length) return 50;
  const sorted = [...arr].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  return (below / arr.length) * 100;
}