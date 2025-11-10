import { useMemo } from "react";
import useSWR from "swr";
import dayjs from "dayjs";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export function useFundamentals(symbol: string, tf = "TTM", periods = 10) {
  const { data, error, isLoading } = useSWR(
    symbol ? `/api/fundamentals/all?symbol=${symbol}&tf=${tf}&periods=${periods}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // series safety
  const series = data?.series ?? {};
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  // helpers
  const sortByDate = (arr: any[]) =>
    [...arr].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const revenue = useMemo(() => sortByDate(series.revenue ?? []), [series.revenue]);
  const netIncome = useMemo(() => sortByDate(series.netIncome ?? []), [series.netIncome]);
  const debt = useMemo(() => sortByDate(series.debt ?? []), [series.debt]);
  const equity = useMemo(() => sortByDate(series.equity ?? []), [series.equity]);

  // margins: try compute if server didn’t send
  const margins = useMemo(() => {
    const byDate: Record<string, { rev?: number; ni?: number }> = {};
    for (const r of revenue) byDate[r.date] = { ...(byDate[r.date] ?? {}), rev: r.value };
    for (const n of netIncome) byDate[n.date] = { ...(byDate[n.date] ?? {}), ni: n.value };
    // Net margin only (other margins יגיעו מהשרת כשיתווספו)
    const nm = Object.entries(byDate)
      .filter(([, v]) => v.rev && v.ni)
      .map(([date, v]) => ({ date, net: (v.ni! / v.rev!) * 100 }));
    return {
      net: nm.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      // placeholders for future server data
      gross: (series.grossMargin ?? []).filter((x: any) => x?.value != null),
      operating: (series.operatingMargin ?? []).filter((x: any) => x?.value != null),
    };
  }, [revenue, netIncome, series.grossMargin, series.operatingMargin]);

  return {
    data,
    snapshot: data?.snapshot ?? {},
    series: { revenue, netIncome, debt, equity, margins },
    rows,
    error,
    isLoading,
  };
}
