import { FundamentalsPayload, TF, KpiMap } from '../../types/fundamentals';

type SnapPoint = { date: string; value: number|null };
type SeriesDict = Record<string, SnapPoint[]>;

export interface LiveSnapshot {
  symbol: string;
  price?: number|null;
  revenueTTM?: number|null;
  netIncomeTTM?: number|null;
  epsTTM?: number|null;
  grossProfitTTM?: number|null;
  operatingIncomeTTM?: number|null;
  totalDebt?: number|null;
  equity?: number|null;
  dividendPerShare?: number|null;
  pe?: number|null;
  roe?: number|null;
  roa?: number|null;
  debtToEquity?: number|null;
  currentRatio?: number|null;
  series?: SeriesDict;
  sector?: string;
  industry?: string;
  sic?: string;
}

function takeLast(arr: any[], n: number){ return (arr||[]).slice(Math.max(0, (arr||[]).length - n)); }
function spark(arr: SnapPoint[], n: number){ return takeLast(arr||[], n).map(p => p?.value ?? null).filter(v => typeof v === 'number'); }
function yoyFromSeries(arr: SnapPoint[]){
  const s = (arr||[]).map(p => p?.value).filter(v => typeof v === 'number') as number[];
  if (s.length < 2) return null;
  const a = s[s.length-1], b = s[s.length-2];
  if (!isFinite(a) || !isFinite(b) || b === 0) return null;
  return ((a-b)/b)*100;
}
function valueFrom(arr: SnapPoint[]){ const s = (arr||[]); if (!s.length) return null; const v = s[s.length-1]?.value; return (typeof v==='number' && isFinite(v)) ? v : null; }
function safe(n: any){ return (typeof n === 'number' && isFinite(n)) ? n : null; }

export function mapSnapshotToPayload(snap: LiveSnapshot, tf: TF, periods: number): FundamentalsPayload{
  const sr = snap.series || {} as SeriesDict;

  const kpis: KpiMap = {
    marketCap: { value: safe((snap.price ?? null) && (sr['sharesOut']?.length ? (snap.price as number)*(valueFrom(sr['sharesOut']) as number) : null)), deltaYoY: null, spark: [] },
    revenueTTM: { value: safe(snap.revenueTTM ?? valueFrom(sr['revenue'])), deltaYoY: yoyFromSeries(sr['revenue']) ?? null, spark: spark(sr['revenue']||[], periods) },
    netIncomeTTM: { value: safe(snap.netIncomeTTM ?? valueFrom(sr['netIncome'])), deltaYoY: yoyFromSeries(sr['netIncome']) ?? null, spark: spark(sr['netIncome']||[], periods) },
    grossMargin: { value: safe(valueFrom(sr['grossMargin'])), deltaYoY: yoyFromSeries(sr['grossMargin']) ?? null, spark: spark(sr['grossMargin']||[], periods) },
    operatingMargin: { value: safe(valueFrom(sr['operatingMargin'])), deltaYoY: yoyFromSeries(sr['operatingMargin']) ?? null, spark: spark(sr['operatingMargin']||[], periods) },
    netMargin: { value: safe(valueFrom(sr['netMargin'])), deltaYoY: yoyFromSeries(sr['netMargin']) ?? null, spark: spark(sr['netMargin']||[], periods) },
    roe: { value: safe(snap.roe ?? valueFrom(sr['roe'])), deltaYoY: yoyFromSeries(sr['roe']) ?? null, spark: spark(sr['roe']||[], periods) },
    roa: { value: safe(snap.roa ?? valueFrom(sr['roa'])), deltaYoY: yoyFromSeries(sr['roa']) ?? null, spark: spark(sr['roa']||[], periods) },
    debtToEquity: { value: safe(snap.debtToEquity ?? valueFrom(sr['debtToEquity'])), deltaYoY: yoyFromSeries(sr['debtToEquity']) ?? null, spark: spark(sr['debtToEquity']||[], periods) },
    currentRatio: { value: safe(snap.currentRatio ?? valueFrom(sr['currentRatio'])), deltaYoY: yoyFromSeries(sr['currentRatio']) ?? null, spark: spark(sr['currentRatio']||[], periods) },
    quickRatio: { value: safe(valueFrom(sr['quickRatio'])), deltaYoY: yoyFromSeries(sr['quickRatio']) ?? null, spark: spark(sr['quickRatio']||[], periods) },
  };

  const periodsArr = (sr['periods']?.map(p=>p.value) as any) || // if someone prebuilt periods
                     takeLast(sr['revenue']||[], periods).map(p => p.date?.slice(0,10));

  const trends = {
    periods: periodsArr,
    revenue: spark(sr['revenue']||[], periods),
    netIncome: spark(sr['netIncome']||[], periods),
    grossMargin: spark(sr['grossMargin']||[], periods),
    operatingMargin: spark(sr['operatingMargin']||[], periods),
    netMargin: spark(sr['netMargin']||[], periods),
    totalDebt: spark(sr['totalDebt']||[], periods),
    totalEquity: spark(sr['equity']||sr['totalEquity']||[], periods),
    cfo: spark(sr['cfo']||sr['cashFromOperations']||[], periods),
    cfi: spark(sr['cfi']||sr['cashFromInvesting']||[], periods),
    cff: spark(sr['cff']||sr['cashFromFinancing']||[], periods),
    eps: spark(sr['eps']||sr['epsBasic']||[], periods),
    price: spark(sr['price']||sr['adjClose']||[], periods),
  };

  const valuation = {
    multiples: [
      { metric: 'PE', value: safe(snap.pe ?? valueFrom(sr['pe'])), avg5y: null, sectorAvg: null, trend: 'flat' as const },
      { metric: 'PB', value: safe(valueFrom(sr['pb'])), avg5y: null, sectorAvg: null, trend: 'flat' as const },
      { metric: 'PS', value: safe(valueFrom(sr['ps'])), avg5y: null, sectorAvg: null, trend: 'flat' as const },
      { metric: 'EVEBITDA', value: safe(valueFrom(sr['evebitda'])), avg5y: null, sectorAvg: null, trend: 'flat' as const },
    ],
    grades: { valuation: 0, growth: 0, profitability: 0, health: 0 },
  };

  const { fairValue, assumptions } = ((): any => {
    const fv = safe(valueFrom(sr['fairValue'])) ?? null;
    const prem = null;
    return { fairValue: { value: fv, premiumPct: prem, method: fv ? 'DCF' : '—' as const },
             assumptions: { wacc: null, ltGrowth: null, taxRate: null } };
  })();

  const peers = { tickers: [] as string[], metrics: {} as any };
  const context = { sector: snap.sector || '—', industry: snap.industry || '—', sic: snap.sic || '' };

  const payload: FundamentalsPayload = {
    symbol: snap.symbol,
    asOf: new Date().toISOString().slice(0,10),
    ai: {
      summary: `${snap.symbol} fundamentals snapshot loaded.`,
      insights: ['Live data mapped from snapshot. Replace averages with FMP sector data for grades.']
    },
    fairValue,
    assumptions,
    kpis,
    trends,
    valuation,
    health: { altmanZ: null, piotroskiF: null, interestCoverage: null },
    peers,
    context
  };

  return payload;
}