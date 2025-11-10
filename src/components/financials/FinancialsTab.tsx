import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import dayjs from "dayjs";
import { downloadCSV, printElementAsPDF } from "@/utils/export";
import FinancialsTable from "./FinancialsTable";

type TF = "Quarterly" | "Annual";
type Statement = "income" | "balance" | "cashflow";

type SeriesPoint = { date: string; value: number | null };
type StatementBlock = {
  name: string;              // e.g., "Revenue"
  unit?: string;             // e.g., "USD"
  series: SeriesPoint[];     // oldest -> newest
};

type FinancialsPayload = {
  symbol: string;
  tf: TF;
  periods: number;
  income: StatementBlock[];
  balance: StatementBlock[];
  cashflow: StatementBlock[];
  ai?: { summary: string };
};

function useSymbolFromURL() {
  const params = new URLSearchParams(window.location.search);
  return {
    symbol: params.get("symbol") || "",
    tfParam: (params.get("tf") as TF) || "Quarterly",
  };
}

const statementLabels: Record<Statement, string> = {
  income: "דוח רווח והפסד",
  balance: "מאזן",
  cashflow: "תזרים מזומנים",
};

export default function FinancialsTab() {
  const { symbol, tfParam } = useSymbolFromURL();
  const [tf, setTF] = useState<TF>(tfParam);
  const [statement, setStatement] = useState<Statement>("income");
  const [data, setData] = useState<FinancialsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const periods = 8; // 4–8 columns per spec

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/financials/all?symbol=${encodeURIComponent(symbol)}&tf=${tf}&periods=${periods}`,
          { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (alive) setData(json);
      } catch (e:any) {
        if (alive) setError(e.message || "Failed loading financials");
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (symbol) run();
    return () => { alive = false; };
  }, [symbol, tf]);

  const blocks = useMemo(() => {
    if (!data) return [];
    if (statement === "income") return data.income;
    if (statement === "balance") return data.balance;
    return data.cashflow;
  }, [data, statement]);

  const dates = useMemo(() => {
    // Derive unified column headers from first block
    const first = blocks[0];
    return (first?.series ?? []).map(p => p.date).slice(-periods).reverse();
  }, [blocks]);

  function onExportCSV() {
    if (!blocks.length) return;
    const rows: any[] = [];
    const header = ["Metric", ...dates];
    rows.push(header);
    blocks.forEach(b => {
      const values = dates.map(d => {
        const found = b.series.find(p => p.date === d);
        return found?.value ?? "";
      });
      rows.push([b.name, *values]);
    });
    downloadCSV(rows, `${symbol}_${tf}_${statement}.csv`);
  }

  function onPrintPDF() {
    printElementAsPDF("financials-root");
  }

  return (
    <div id="financials-root" className="space-y-4">
      {/* Top bar: statement tabs & TF toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["income","balance","cashflow"] as Statement[]).map(key => (
            <button
              key={key}
              onClick={() => setStatement(key)}
              className={
                "px-3 py-1.5 rounded-full text-sm transition " +
                (statement === key ? "bg-yellow-600/30 text-yellow-100" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")
              }
            >
              {statementLabels[key]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTF("Quarterly")}
            className={
              "px-3 py-1.5 rounded-full text-sm transition " +
              (tf === "Quarterly" ? "bg-yellow-600/30 text-yellow-100" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")
            }
          >רבעוני</button>
          <button
            onClick={() => setTF("Annual")}
            className={
              "px-3 py-1.5 rounded-full text-sm transition " +
              (tf === "Annual" ? "bg-yellow-600/30 text-yellow-100" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")
            }
          >שנתי</button>

          <div className="w-px h-5 bg-zinc-700 mx-1" />
          <button onClick={onExportCSV} className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm">
            הורדה CSV
          </button>
          <button onClick={onPrintPDF} className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm">
            PDF/Print
          </button>
        </div>
      </div>

      {/* AI summary line */}
      {data?.ai?.summary && (
        <div className="text-sm text-zinc-300">
          <span className="text-zinc-400">AI:</span> {data.ai.summary}
        </div>
      )}

      {/* Error / Loading */}
      {error && <div className="text-red-400 text-sm">שגיאה: {error}</div>}
      {loading && <div className="text-zinc-400 text-sm">טוען נתונים…</div>}

      {/* Compact table with sparkline */}
      {!loading && !error && blocks.length > 0 && (
        <FinancialsTable blocks={blocks} dates={dates} />
      )}

      {/* Footer link */}
      <div className="pt-2">
        <a href={`/app/filings?symbol=${encodeURIComponent(symbol)}`} className="text-yellow-400 hover:text-yellow-300 text-sm">
          צפייה בכל הדוחות (SEC) ←
        </a>
      </div>
    </div>
  );
}
