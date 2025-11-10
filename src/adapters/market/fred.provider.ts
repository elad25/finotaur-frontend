export async function getSeries(series: string) {
  // Placeholder – mock time series
  const now = Date.now();
  return {
    series,
    points: Array.from({ length: 12 }).map((_, i) => ({
      t: now - (11 - i) * 30 * 24 * 3600 * 1000,
      v: 100 + i,
    })),
  };
}
