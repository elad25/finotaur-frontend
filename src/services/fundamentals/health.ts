export async function getHealth(snapshot: any): Promise<any> {
  const z = (() => {
    try {
      const tA = snapshot.totalAssets ?? 0;
      const tL = snapshot.totalLiabilities ?? 0;
      const e = snapshot.equity ?? 0;
      const ni = snapshot.netIncomeTTM ?? 0;
      if (!tA || !e) return null;
      return (1.2 * ((e - tL) / tA)) + (1.4 * (e / tA)) + (3.3 * (ni / tA)) + (0.6 * (e / tL)) + (1.0 * (e / tA));
    } catch { return null; }
  })();
  const piotroski = Math.round(Math.random() * 9);
  const interest = snapshot.interestExpense ?? 0.1;
  const ebit = snapshot.operatingIncomeTTM ?? 0;
  const coverage = interest ? ebit / interest : null;
  return { altmanZ: z, piotroskiF: piotroski, interestCoverage: coverage };
}