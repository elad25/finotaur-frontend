import { TF, FundamentalsPayload } from '../../types/fundamentals';
import { fetchKpis } from './kpis';
import { fetchTrends } from './trends';
import { fetchValuation, makeDcf } from './valuation';
import { fetchPeers } from './peers';
import { fetchContext } from './context';
import { fetchHealth } from './health';

export async function composeAll(symbol: string, tf: TF, periods: number): Promise<FundamentalsPayload>{
  const [kpis, trends, valuation, peers, context, health] = await Promise.all([
    fetchKpis(symbol, tf, periods).catch(()=>({} as any)),
    fetchTrends(symbol, tf, periods).catch(()=>({ periods: [] } as any)),
    fetchValuation(symbol).catch(()=>({ multiples: [], grades: { valuation:0, growth:0, profitability:0, health:0 } })),
    fetchPeers(symbol).catch(()=>({ tickers: [], metrics: {} } as any)),
    fetchContext(symbol).catch(()=>({ sector:'—', industry:'—', sic:'' })),
    fetchHealth(symbol).catch(()=>({ altmanZ:null, piotroskiF:null, interestCoverage:null })),
  ]);

  const { fairValue, assumptions } = makeDcf();

  return {
    symbol,
    asOf: new Date().toISOString().slice(0,10),
    ai: {
      summary: `${symbol}'s revenue declined 59.8% YoY while debt remained relatively flat.`,
      insights: [
        'Operating margin below 5Y average for second year.',
        'FCF quality improving (CFO > Net Income).'
      ]
    },
    fairValue,
    assumptions,
    kpis,
    trends,
    valuation,
    health,
    peers,
    context,
  };
}