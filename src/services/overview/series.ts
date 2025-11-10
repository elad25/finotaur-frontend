import type { Request } from 'express';
import { logOverviewSeries } from '../../utils/logger';

type SeriesRange = '1D'|'1W'|'1M'|'6M'|'1Y'|'5Y';

interface Candle { t: string; o: number; h: number; l: number; c: number; v?: number; }
type EventType = 'filing'|'earning'|'dividend';
interface ChartEvent {
  type: EventType;
  label: string;
  date: string;
  ts?: string;
  docUrl?: string;
  priceAtEvent?: number;
}

async function safeJson(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (_) { return null; }
}

export async function getOverviewSeries(req: Request) {
  const symbol = String(req.query.symbol || '').toUpperCase();
  const range = (String(req.query.range || '1M').toUpperCase() as SeriesRange);

  // Attempt to reuse any existing internal endpoints if present in the app:
  // These are optional and may return 404 in some installs; we guard accordingly.
  const base = `${req.protocol}://${req.get('host')}`;

  // Try price endpoint (expected to be daily bars at least).
  const priceJson = await safeJson(`${base}/api/overview/price?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(range)}`)
                    ?? await safeJson(`${base}/api/price?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(range)}`);

  const price: Candle[] = Array.isArray(priceJson?.price) ? priceJson.price :
                          Array.isArray(priceJson) ? priceJson : [];

  // Try events endpoint or build empty fallbacks.
  const eventsJson = await safeJson(`${base}/api/overview/events?symbol=${encodeURIComponent(symbol)}`);
  let events: ChartEvent[] = [];

  if (Array.isArray(eventsJson)) {
    events = eventsJson
      .map((e: any) => ({
        type: (e?.type === 'filing' || e?.type === 'earning' || e?.type === 'dividend') ? e.type : 'filing',
        label: e?.label ?? '',
        date: (e?.date ?? '').slice(0,10),
        ts: e?.ts ?? undefined,
        docUrl: e?.docUrl || undefined,
        priceAtEvent: Number.isFinite(e?.priceAtEvent) ? e.priceAtEvent : undefined,
      }))
      .filter((e: ChartEvent) => e.type !== 'filing' || !!e.docUrl); // exclude filings without url
  }

  const counts = {
    price: price.length,
    filings: events.filter(e=>e.type==='filing').length,
    earnings: events.filter(e=>e.type==='earning').length,
    dividends: events.filter(e=>e.type==='dividend').length,
  };
  logOverviewSeries(symbol, range, counts);

  return {
    symbol, range,
    price,
    events,
    meta: {
      hasDividends: counts.dividends > 0,
      hasEarnings: counts.earnings > 0,
      hasFilings: counts.filings > 0,
      source: { price: priceJson?.source ?? 'polygon', events: ['polygon','sec'] }
    }
  };
}
