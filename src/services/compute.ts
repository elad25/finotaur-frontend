type Num = number | null | undefined;
const nz = (n: Num, d = 0) => (typeof n === 'number' && isFinite(n) ? n : d);

export function computeDerivedFromStatements(stmts: any) {
  const periods = stmts?.periods ?? [];
  const revenue = stmts?.revenue ?? [];
  const netIncome = stmts?.netIncome ?? [];
  const grossMarginPct = stmts?.grossMarginPct ?? [];
  const operMarginPct = stmts?.operMarginPct ?? [];
  const debt = stmts?.debt ?? [];
  const equity = stmts?.equity ?? [];
  const cfo = stmts?.cfo ?? [];
  const cfi = stmts?.cfi ?? [];
  const cff = stmts?.cff ?? [];

  const revenueTTM = stmts?.revenueTTM ?? revenue.at(-1) ?? null;
  const netIncomeTTM = stmts?.netIncomeTTM ?? netIncome.at(-1) ?? null;
  const grossMarginTTM = stmts?.grossMarginTTM ?? grossMarginPct.at(-1) ?? null;
  const operatingMarginTTM = stmts?.operatingMarginTTM ?? operMarginPct.at(-1) ?? null;
  const netMarginTTM = revenueTTM ? (nz(netIncomeTTM)/nz(revenueTTM))*100 : null;

  const assetsAvg = (nz(stmts?.assets) + nz(stmts?.assetsPrev)) / 2 || null;
  const equityAvg = (nz(stmts?.equity) + nz(stmts?.equityPrev)) / 2 || null;
  const roeTTM = equityAvg ? (nz(netIncomeTTM) / equityAvg) * 100 : null;
  const roA = assetsAvg ? (nz(netIncomeTTM) / assetsAvg) * 100 : null;

  const currentRatio = stmts?.currentAssets && stmts?.currentLiabilities ? nz(stmts.currentAssets) / nz(stmts.currentLiabilities) : null;
  const quickAssets = nz(stmts?.cash) + nz(stmts?.shortTermInvestments) + nz(stmts?.accountsReceivable);
  const quickRatio = stmts?.currentLiabilities ? quickAssets / nz(stmts.currentLiabilities) : null;
  const debtToEquity = Array.isArray(equity) && equity.at(-1) ? nz(debt.at(-1)) / nz(equity.at(-1)) : (equity ? nz(debt) / nz(equity) : null);

  const ebitTTM = stmts?.operatingIncomeTTM ?? (operMarginPct.at?.(-1) ? (operMarginPct.at(-1)/100) * nz(revenueTTM) : null);
  const interestExpTTM = stmts?.interestExpenseTTM ?? null;
  const interestCoverage = interestExpTTM ? nz(ebitTTM) / nz(interestExpTTM, 1e-9) : null;

  const altmanZ = (nz(stmts?.currentAssets)-nz(stmts?.currentLiabilities))/nz(stmts?.assets,1) * 1.2
                + nz(stmts?.retainedEarnings)/nz(stmts?.assets,1) * 1.4
                + nz(ebitTTM)/nz(stmts?.assets,1) * 3.3
                + nz(stmts?.equity)/nz(stmts?.liabilities,1) * 0.6
                + nz(revenueTTM)/nz(stmts?.assets,1) * 1.0;

  const piotroskiF = computePiotroskiSimple(stmts);

  return {
    kpis: {
      revenueTTM, netIncomeTTM, grossMarginTTM, operatingMarginTTM, netMarginTTM,
      roeTTM, roaTTM: roA, currentRatio, quickRatio, debtToEquity,
      deltaYoY: stmts?.deltaYoY ?? {}
    },
    trends: {
      periods, revenue, netIncome, grossMarginPct, operMarginPct,
      debt: Array.isArray(debt) ? debt : [nz(debt)],
      equity: Array.isArray(equity) ? equity : [nz(equity)],
      cashFlow: { cfo, cfi, cff }
    },
    health: { altmanZ: isFinite(altmanZ) ? altmanZ : null, piotroskiF, interestCoverage }
  };
}

function computePiotroskiSimple(stmts:any){
  let score = 0;
  if (nz(stmts?.netIncomeTTM) > 0) score++;
  if (nz(stmts?.cfoTTM ?? (Array.isArray(stmts?.cfo) ? stmts.cfo.slice(-4).reduce((a:number,b:number)=>a+b,0) : 0)) > 0) score++;
  if (nz(stmts?.roeTTM) > nz(stmts?.roePrevTTM, -1e9)) score++;
  if (nz(stmts?.leverage) < nz(stmts?.leveragePrev, 1e9)) score++;
  if (nz(stmts?.currentRatio) > nz(stmts?.currentRatioPrev, -1e9)) score++;
  if (nz(stmts?.dilutedSharesTTM) <= nz(stmts?.dilutedSharesPrevTTM, 1e12)) score++;
  if (nz(stmts?.grossMarginTTM) > nz(stmts?.grossMarginPrevTTM, -1e9)) score++;
  if (nz(stmts?.assetTurnoverTTM) > nz(stmts?.assetTurnoverPrevTTM, -1e9)) score++;
  if (nz(stmts?.accrualsTTM) < nz(stmts?.accrualsPrevTTM, 1e9)) score++;
  return score;
}

export function computeMultiples(args: { price: Num, marketCap: Num, stmts: any }) {
  const { price, marketCap, stmts } = args;
  const epsTTM = nz(stmts?.netIncomeTTM) / nz(stmts?.dilutedSharesTTM, 1e-9);
  const peTTM = price ? nz(price) / (epsTTM || 1e-9) : null;
  const ps = marketCap ? nz(marketCap) / nz(stmts?.revenueTTM, 1e-9) : null;
  const pb = marketCap ? nz(marketCap) / nz(stmts?.equity, 1e-9) : null;
  const ev = nz(marketCap) + nz(stmts?.totalDebt) - nz(stmts?.cash);
  const ebitda = nz(stmts?.ebitdaTTM) || (nz(stmts?.operatingIncomeTTM) + nz(stmts?.daTTM));
  const evEbitda = ebitda ? ev / ebitda : null;
  return { peTTM, ps, pb, evEbitda, peForward: null, peg: null };
}

export function runSimpleDCF(args: { stmts:any, price: Num }){
  const { stmts } = args;
  const cfo = nz(stmts?.cfoTTM ?? (Array.isArray(stmts?.cfo) ? stmts.cfo.slice(-4).reduce((a:number,b:number)=>a+b,0) : 0));
  const capex = Math.abs(nz(stmts?.capexTTM));
  const fcff = cfo - capex;
  if (!isFinite(fcff)) return { value: null, premiumPct: null, assumptions: { wacc: 0.085, ltGrowth: 0.02 } };
  const wacc = 0.085, g = 0.02, horizon = 5;
  let pv = 0, f = fcff;
  const revCagr = Math.max(-0.15, Math.min(0.15, nz(stmts?.revCagr3y, 0.06)));
  for (let i=1;i<=horizon;i++){ f *= (1+revCagr); pv += f / ((1+wacc)**i); }
  const tv = (f * (1+g)) / (wacc - g); pv += tv / ((1+wacc)**horizon);
  const perShare = pv / nz(stmts?.dilutedSharesTTM, 1e-9);
  const price = nz(stmts?.price);
  const premiumPct = price ? ((perShare - price)/price)*100 : null;
  return { value: perShare, premiumPct, assumptions: { wacc, ltGrowth: g } };
}

export function buildInsightLine(derived:any, multiples:any, dcf:any): string {
  const rev = derived?.kpis?.deltaYoY?.revenue ?? null;
  const nm = derived?.kpis?.netMarginTTM ?? null;
  const line = `Revenue ${typeof rev==='number'?(rev>=0?'grew':'fell'):''} ${typeof rev==='number'?Math.abs(rev).toFixed(1)+'%':'—'} YoY; net margin is ${typeof nm==='number'?nm.toFixed(1)+'%':'—'}.`;
  return line;
}
