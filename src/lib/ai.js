
/**
 * Lightweight AI stub. Replace with real LLM service later.
 * For now we just synthesize short insights and forecasts.
 */
function synthesizeMiniInsight({ symbol, yoyRevenue = null, debtChange = null }) {
  const rev = yoyRevenue == null ? 'Revenue trend mixed' : (yoyRevenue > 0 ? `Revenue up ${Math.round(yoyRevenue*100)}% YoY` : `Revenue down ${Math.abs(Math.round(yoyRevenue*100))}% YoY`);
  const debt = debtChange == null ? 'debt stable' : (Math.abs(debtChange) < 0.02 ? 'debt flat' : (debtChange > 0 ? 'debt rising' : 'debt falling'));
  return `${rev} while ${debt} — leverage looks stable. (${symbol})`;
}

function synthesizeAnalystSummary() {
  // Mock distribution; in production, map from real provider.
  const buy = 18, hold = 7, sell = 2;
  const avg = 215, high = 260, low = 165;
  const note = 'Analysts have revised the average price target +8% over 3 months.';
  return { distribution: { buy, hold, sell }, targets: { average: avg, high, low }, note };
}

function synthesizeForecast() {
  // Simple deterministic numbers to avoid flicker
  return {
    revenueGrowthProb: 0.78,
    marginExpansionProb: 0.65,
  };
}

function answerUserQuestion(symbol, question) {
  // Deterministic placeholder; replace with LLM call
  return `Draft answer about ${symbol}: Based on public market snapshots and recent headlines, here are 2–3 angles to consider regarding “${question}”. (This is a placeholder; connect LLM for live analysis.)`;
}

module.exports = { synthesizeMiniInsight, synthesizeAnalystSummary, synthesizeForecast, answerUserQuestion };
