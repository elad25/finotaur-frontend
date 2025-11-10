export async function getMarketOverview() {
  // Placeholder – return mock sectors snapshot
  return {
    sectors: [
      { name: 'Technology', changePct: 1.23 },
      { name: 'Energy', changePct: -0.45 },
      { name: 'Financials', changePct: 0.78 },
    ],
    ts: Date.now(),
  };
}
