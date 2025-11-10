import { useState, useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar,
} from "recharts";
import dayjs from "dayjs";

function formatDate(d?: string) {
  if (!d) return "";
  return dayjs(d).format("YYYY-MM");
}

type TrendsPanelProps = {
  data: any; // { series: {...}, cashflows?: [...] }
};

export default function TrendsPanel({ data }: TrendsPanelProps) {
  const [tab, setTab] = useState<"rev" | "margins" | "deq" | "cf">("rev");

  // tolerate both shapes:
  const series = data?.series ?? {};
  const cashflows = data?.cashflows ?? [];

  // ---- Revenue vs Net Income (stacked area)
  const revNI = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of series?.revenue ?? []) map[r.date] = { date: r.date, revenue: r.value };
    for (const n of series?.netIncome ?? []) {
      map[n.date] = { ...(map[n.date] ?? { date: n.date }), netIncome: n.value };
    }
    return Object.values(map).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [series]);

  // ---- Margins (dual/tri line)
  const margins = useMemo(() => {
    // support series.grossMargin OR series.margins.gross, etc.
    const grossArr = series?.grossMargin ?? series?.margins?.gross ?? [];
    const opArr = series?.operatingMargin ?? series?.margins?.operating ?? [];
    const netArr = series?.netMargin ?? series?.margins?.net ?? [];

    const map: Record<string, any> = {};
    for (const g of grossArr) map[g.date] = { date: g.date, gross: g.value };
    for (const o of opArr) map[o.date] = { ...(map[o.date] ?? { date: o.date }), operating: o.value };
    for (const n of netArr) {
      const v = n.net ?? n.value;
      map[n.date] = { ...(map[n.date] ?? { date: n.date }), net: v };
    }
    return Object.values(map).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [series]);

  // ---- Debt vs Equity (dual line)
  const deq = useMemo(() => {
    const map: Record<string, any> = {};
    for (const d of series?.debt ?? []) map[d.date] = { date: d.date, debt: d.value };
    for (const e of series?.equity ?? []) {
      map[e.date] = { ...(map[e.date] ?? { date: e.date }), equity: e.value };
    }
    return Object.values(map).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [series]);

  // ---- Cash flows stacked bars (expecting [{date,cfo,cfi,cff}] if exists)
  const cf = useMemo(() => {
    const arr = Array.isArray(cashflows) ? cashflows : [];
    return arr.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [cashflows]);

  const tabs: [keyof typeof tab, string][] = [
    ["rev", "Revenue vs Net Income"],
    ["margins", "Margins over time"],
    ["deq", "Debt vs Equity"],
    ["cf", "Cash Flow Breakdown"],
  ];

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1 rounded-full text-sm transition ${
              tab === key ? "bg-yellow-600/30 text-yellow-200" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {tab === "rev" && (
        <div className="h-56 rounded-xl bg-neutral-900/60 border border-neutral-800 p-2">
          {revNI.length ? (
            <ResponsiveContainer>
              <AreaChart data={revNI}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip labelFormatter={formatDate} />
                <Area type="monotone" dataKey="revenue" stackId="1" fillOpacity={0.2} />
                <Area type="monotone" dataKey="netIncome" stackId="1" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-sm text-neutral-500 pt-18">No revenue/net income series.</div>
          )}
        </div>
      )}

      {tab === "margins" && (
        <div className="h-56 rounded-xl bg-neutral-900/60 border border-neutral-800 p-2">
          {margins.length ? (
            <ResponsiveContainer>
              <LineChart data={margins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis unit="%" />
                <Tooltip labelFormatter={formatDate} />
                <Line type="monotone" dataKey="gross" dot={false} />
                <Line type="monotone" dataKey="operating" dot={false} />
                <Line type="monotone" dataKey="net" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-sm text-neutral-500 pt-18">No margin series.</div>
          )}
        </div>
      )}

      {tab === "deq" && (
        <div className="h-56 rounded-xl bg-neutral-900/60 border border-neutral-800 p-2">
          {deq.length ? (
            <ResponsiveContainer>
              <LineChart data={deq}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip labelFormatter={formatDate} />
                <Line type="monotone" dataKey="debt" dot={false} />
                <Line type="monotone" dataKey="equity" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-sm text-neutral-500 pt-18">No debt/equity series.</div>
          )}
        </div>
      )}

      {tab === "cf" && (
        <div className="h-56 rounded-xl bg-neutral-900/60 border border-neutral-800 p-2">
          {cf.length ? (
            <ResponsiveContainer>
              <BarChart data={cf}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip labelFormatter={formatDate} />
                <Bar dataKey="cfo" stackId="cf" />
                <Bar dataKey="cfi" stackId="cf" />
                <Bar dataKey="cff" stackId="cf" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-sm text-neutral-500 pt-18">No cash flow breakdown.</div>
          )}
        </div>
      )}
    </div>
  );
}
