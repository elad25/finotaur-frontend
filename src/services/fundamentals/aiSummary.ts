// finotaur-server/src/services/fundamentals/aiSummary.ts
export async function summarizeAI(symbol: string, stats: Record<string, any>) {
  const rev = stats?.kpis?.revenueTTM?.deltaYoY ?? 0;
  const margin = stats?.kpis?.netMargin?.deltaYoY ?? 0;
  const cost = Math.max(0, Number(rev) - Number(margin));
  return {
    summary: `Revenue grew ${Number(rev).toFixed(1)}% YoY while costs rose ${Number(cost).toFixed(1)}%, expanding margins by ${Number(margin).toFixed(1)}%.`,
    insights: [
      "Operating margin vs 5Y avg requires monitoring.",
      "CFO > Net Income in recent periods suggests improving earnings quality."
    ]
  };
}
