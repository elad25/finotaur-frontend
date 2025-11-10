import { LiveSnapshot } from '../fundamentals/liveAdapter';
import { polyTickerDetails, polyAggregatesMonthly, polyFinancials } from '../providers/polygon';
import { subYears, formatISO } from './time';

function safe(n:any){ return (typeof n==='number' && isFinite(n)) ? n : null; }
function point(date:string, value:any){ return { date, value: safe(value) }; }
function fromPath(obj:any, path:string){ return path.split('.').reduce((a,k)=> (a && a[k]!==undefined)? a[k]: undefined, obj); }

function toSeries(items:any[], dateKey:string, valuePath:string){
  const arr = (items||[]).map((it:any)=> point(String(it[dateKey] || it['end_date'] || it['fiscal_period'] || it['calendarDate']), fromPath(it, valuePath))).filter(p=>p.value!==null);
  arr.sort((a,b)=> a.date.localeCompare(b.date));
  return arr;
}

export async function fetchLiveSnapshot(symbol: string, tf: 'TTM'|'Annual'|'Quarterly', periods: number): Promise<LiveSnapshot>{
  const now = new Date();
  const from = formatISO(subYears(now, 10)).slice(0,10);
  const to = formatISO(now).slice(0,10);

  // 1) Price + market cap / shares
  const [agg, tick] = await Promise.all([
    polyAggregatesMonthly(symbol, from, to).catch(()=>null),
    polyTickerDetails(symbol).catch(()=>null),
  ]);

  const priceSeries = (agg?.results||[]).map((r:any)=> point(new Date(r.t).toISOString().slice(0,10), r.c));
  const lastPrice = priceSeries.length ? priceSeries[priceSeries.length-1].value : null;
  const shares = safe(tick?.share_class_shares_outstanding || tick?.weighted_shares_outstanding || tick?.shares_outstanding);
  const marketCap = (lastPrice && shares) ? (lastPrice as number) * (shares as number) : (safe(tick?.market_cap) ?? null);

  // 2) Financials
  const timeframe = tf==='TTM' ? 'ttm' : (tf==='Annual' ? 'annual' : 'quarterly');
  const fin = await polyFinancials(symbol, timeframe as any, 40).catch(()=>null);
  const finItems = fin?.results || fin?.financials || [];

  const revenue = toSeries(finItems, 'end_date', 'financials.income_statement.revenues.value');
  const netIncome = toSeries(finItems, 'end_date', 'financials.income_statement.net_income_loss.value');
  const grossProfit = toSeries(finItems, 'end_date', 'financials.income_statement.gross_profit.value');
  const operatingIncome = toSeries(finItems, 'end_date', 'financials.income_statement.operating_income_loss.value');
  const totalDebt = toSeries(finItems, 'end_date', 'financials.balance_sheet.total_debt.value') // attempt total debt
                      || toSeries(finItems, 'end_date', 'financials.balance_sheet.debt.current_portion_of_long_term_debt.value');
  const equity = toSeries(finItems, 'end_date', 'financials.balance_sheet.stockholders_equity.value');
  const cfo = toSeries(finItems, 'end_date', 'financials.cash_flow_statement.net_cash_flow_from_operating_activities.value');
  const cfi = toSeries(finItems, 'end_date', 'financials.cash_flow_statement.net_cash_flow_from_investing_activities.value');
  const cff = toSeries(finItems, 'end_date', 'financials.cash_flow_statement.net_cash_flow_from_financing_activities.value');
  const eps = toSeries(finItems, 'end_date', 'financials.income_statement.basic_earnings_per_share.value');

  // Derived margins series if not present
  function deriveMargin(numer:any[], denom:any[]){
    const map = new Map(numer.map((p:any)=>[p.date,p.value]));
    return denom.map((d:any)=> point(d.date, (map.has(d.date)&& d.value)? (100*(map.get(d.date) as number)/(d.value as number)) : null));
  }
  const grossMargin = deriveMargin(grossProfit, revenue);
  const operatingMargin = deriveMargin(operatingIncome, revenue);
  const netMargin = deriveMargin(netIncome, revenue);

  const snapshot: LiveSnapshot = {
    symbol,
    price: lastPrice,
    revenueTTM: revenue.length ? revenue[revenue.length-1].value : null,
    netIncomeTTM: netIncome.length ? netIncome[netIncome.length-1].value : null,
    grossProfitTTM: grossProfit.length ? grossProfit[grossProfit.length-1].value : null,
    operatingIncomeTTM: operatingIncome.length ? operatingIncome[operatingIncome.length-1].value : null,
    totalDebt: totalDebt.length ? totalDebt[totalDebt.length-1].value : null,
    equity: equity.length ? equity[equity.length-1].value : null,
    pe: null,
    series: {
      price: priceSeries,
      revenue,
      netIncome,
      grossMargin,
      operatingMargin,
      netMargin,
      totalDebt,
      equity,
      cfo, cfi, cff,
      eps,
      sharesOut: shares ? [{ date: to, value: shares }] : []
    },
    sector: tick?.sic_description || tick?.sector || '—',
    industry: tick?.industry || tick?.sic_code || '—',
    sic: String(tick?.sic_code || '') || ''
  };

  return snapshot;
}