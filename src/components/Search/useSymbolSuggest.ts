import { useEffect, useMemo, useRef, useState } from "react";

export type SuggestItem = {
  symbol: string;
  name: string;
  exchange?: string;
  assetType?: "stock" | "etf" | "crypto" | "fx" | "futures" | "index" | "unknown";
};

type State =
  | { status: "idle"; data: SuggestItem[] }
  | { status: "loading"; data: SuggestItem[] }
  | { status: "ready"; data: SuggestItem[] }
  | { status: "error"; data: SuggestItem[]; error: string };

const normalize = (s: string) => s.replace(/\s+/g, "").toUpperCase();

export function useSymbolSuggest(query: string) {
  const [state, setState] = useState<State>({ status: "idle", data: [] });
  const ctrlRef = useRef<AbortController | null>(null);
  const q = useMemo(() => normalize(query), [query]);

  useEffect(() => {
    if (!q || q.length < 1) {
      setState({ status: "idle", data: [] });
      return;
    }
    if (ctrlRef.current) ctrlRef.current.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    const run = async () => {
      try {
        setState((s) => ({ status: "loading", data: s.data }));
        const res = await fetch(`/api/symbols/suggest?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const items: SuggestItem[] = (json.items || []).slice(0, 30);
        setState({ status: "ready", data: items });
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setState({ status: "error", data: [], error: e?.message || "failed" });
      }
    };
    run();
    return () => ctrl.abort();
  }, [q]);

  return state;
}
