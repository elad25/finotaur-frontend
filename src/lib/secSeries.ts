
// Utility to normalize SEC companyfacts into {date: string, value: number} series
export type SeriesPoint = { date: string; value: number };
type Facts = any;

function pickUnit(fact: any) {
  // prefer USD for monetary values
  if (!fact || !fact.units) return null;
  return fact.units.USD || fact.units["USD/shares"] || fact.units.shares || null;
}

export function seriesFromFact(facts: Facts, key: string, opts: {limit?: number} = {}): SeriesPoint[] {
  const node = facts?.facts?.["us-gaap"]?.[key];
  const unit = pickUnit(node);
  if (!unit) return [];
  const arr = unit
    .filter((x: any) => x.end && typeof x.val === "number")
    .sort((a: any,b: any) => new Date(a.end).getTime() - new Date(b.end).getTime());
  const limit = opts.limit ?? 12;
  return arr.slice(-limit).map((x: any) => ({ date: x.end, value: x.val }));
}

export function yoy(a: number|null, b: number|null): number|null {
  if (a==null || b==null || b===0) return null;
  return ((a-b)/b)*100;
}

export function pct(n: number|null, d: number|null): number|null {
  if (n==null || d==null || d===0) return null;
  return (n/d)*100;
}
