// src/components/markets/ChartBoard.tsx
import React, { useEffect, useState } from "react";
import { TvWidget } from "./TvWidget";
import { WatchlistTable } from "./WatchlistTable";

type Props = {
  /** Optional initial symbol (e.g., from URL ?symbol=TSLA). */
  initialSymbol?: string;
};

const FALLBACK = "FOREXCOM:XAUUSD";

export const ChartBoard: React.FC<Props> = ({ initialSymbol }) => {
  const [symbol, setSymbol] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("finotaur.activeSymbol");
      return (initialSymbol && initialSymbol.length > 0) ? initialSymbol : (saved || FALLBACK);
    } catch {
      return (initialSymbol && initialSymbol.length > 0) ? initialSymbol : FALLBACK;
    }
  });

  // If initialSymbol comes from URL or changes, adopt it once.
  useEffect(() => {
    if (initialSymbol && initialSymbol.length > 0 && initialSymbol !== symbol) {
      setSymbol(initialSymbol);
      try { localStorage.setItem("finotaur.activeSymbol", initialSymbol); } catch {}
    }
    // We only care when initialSymbol changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSymbol]);

  const onChange = (sym: string) => {
    setSymbol(sym);
    try { localStorage.setItem("finotaur.activeSymbol", sym); } catch {}
  };

  return (
    <div className="flex gap-4 items-stretch">
      {/* Chart area */}
      <div className="flex-1 min-w-0 rounded-2xl border border-border bg-base-800 p-2">
        <TvWidget symbol={symbol} interval="60" height={640} />
      </div>

      {/* Watchlist */}
      <div className="w-[300px] shrink-0">
        <WatchlistTable value={symbol} onChange={onChange} />
      </div>
    </div>
  );
};
