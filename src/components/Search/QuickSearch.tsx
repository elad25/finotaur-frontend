import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSymbolSuggest, SuggestItem } from "./useSymbolSuggest";
import { Search, X } from "lucide-react";

type Props = {
  open?: boolean;
  onClose?: () => void;
  buildSummaryHref?: (s: SuggestItem) => string;
  buildChartHref?: (s: SuggestItem) => string;
};

// ---- ROUTE BUILDERS (All Markets) ----
const ALL_MARKETS_BASE = "/app/all-markets";

// מעביר גם symbol וגם ticker כדי לכסות מימושים שונים באפליקציה בלי לשבור כלום
const defaultSummaryHref = (s: SuggestItem) =>
  `${ALL_MARKETS_BASE}/summary?symbol=${encodeURIComponent(s.symbol)}&ticker=${encodeURIComponent(s.symbol)}`;

const defaultChartHref = (s: SuggestItem) =>
  `${ALL_MARKETS_BASE}/chart?symbol=${encodeURIComponent(s.symbol)}&ticker=${encodeURIComponent(s.symbol)}`;

export default function QuickSearch({
  open = false,
  onClose,
  buildSummaryHref = defaultSummaryHref,
  buildChartHref = defaultChartHref,
}: Props) {
  const [query, setQuery] = useState("");
  const [hoverIdx, setHoverIdx] = useState<number>(-1);
  const { status, data } = useSymbolSuggest(query);
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setHoverIdx(-1);
    }
  }, [open]);

  // Close only on Escape; do NOT auto-close on internal clicks
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowDown")
        setHoverIdx((i) => Math.min((data?.length ?? 0) - 1, i + 1));
      if (e.key === "ArrowUp") setHoverIdx((i) => Math.max(0, i - 1));
      if (e.key === "Enter" && hoverIdx >= 0 && data[hoverIdx]) {
        nav(buildSummaryHref(data[hoverIdx]));
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hoverIdx, data, onClose, nav, buildSummaryHref]);

  const renderRow = useCallback(
    (item: SuggestItem, idx: number) => {
      const active = idx === hoverIdx;
      return (
        <div
          key={item.symbol}
          onMouseEnter={() => setHoverIdx(idx)}
          className={`group grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 cursor-pointer ${
            active ? "bg-neutral-800/70" : ""
          }`}
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {item.symbol}
            </div>
            <div className="text-xs text-neutral-400 truncate">
              {item.name}
              {item.exchange ? ` • ${item.exchange}` : ""}
            </div>
          </div>

          {/* TWO LARGE RECTANGLES ON HOVER/ACTIVE */}
          <div className="flex items-center gap-2">
            <button
              className={`h-10 px-5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold ${
                active ? "" : "opacity-0 group-hover:opacity-100"
              } transition-opacity`}
              onClick={(e) => {
                e.stopPropagation();
                nav(buildChartHref(item));
                onClose?.();
              }}
            >
              CHART
            </button>
            <button
              className={`h-10 px-5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold ${
                active ? "" : "opacity-0 group-hover:opacity-100"
              } transition-opacity`}
              onClick={(e) => {
                e.stopPropagation();
                nav(buildSummaryHref(item));
                onClose?.();
              }}
            >
              SUMMARY
            </button>
          </div>
        </div>
      );
    },
    [hoverIdx, onClose, nav, buildSummaryHref, buildChartHref]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75]">
      {/* dimmer */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Medium overlay panel */}
      <div className="absolute left-1/2 top-24 -translate-x-1/2 w-[760px] rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl overflow-hidden">
        {/* Header with BIG search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols… (prefix match)"
            className="flex-1 bg-transparent outline-none text-base text-white placeholder:text-neutral-500"
          />
          <button
            className="p-2 rounded-lg border border-neutral-700 hover:bg-neutral-800"
            onClick={() => onClose?.()}
            aria-label="Close search"
          >
            <X className="w-4 h-4 text-neutral-300" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[520px] overflow-y-auto divide-y divide-neutral-800">
          {status === "idle" && (
            <div className="p-6 text-sm text-neutral-400">
              Type at least 1 character to search…
            </div>
          )}
          {status === "loading" && (
            <div className="p-6 text-sm text-neutral-400">Searching…</div>
          )}
          {status === "error" && (
            <div className="p-6 text-sm text-rose-400">
              Could not fetch suggestions. Try again.
            </div>
          )}
          {status === "ready" && (
            <div className="divide-y divide-neutral-800">
              {data.length === 0 ? (
                <div className="p-6 text-sm text-neutral-400">No matches.</div>
              ) : (
                data.map((it, idx) => renderRow(it, idx))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuickSearchTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
        aria-label="Open quick search"
      >
        <Search className="w-4 h-4 text-neutral-400" />
        <span className="text-xs text-neutral-300">Search</span>
      </button>
      <QuickSearch open={open} onClose={() => setOpen(false)} />
    </>
  );
}
