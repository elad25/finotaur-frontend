import { useEffect, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";

type Props = { symbol: string };

export default function AISummary({ symbol }: Props) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!symbol) return;
      setLoading(true);
      setErr("");
      try {
        // Prefer lightweight server insight; gracefully fallback to empty.
        const r = await fetch(`/api/ai/insight?symbol=${encodeURIComponent(symbol)}`);
        if (!r.ok) throw new Error(`AI insight ${r.status}`);
        const j = await r.json();
        if (!cancelled) setText(j.text || "");
      } catch (e:any) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) return <LoadingSkeleton lines={2} />;
  if (err) return null;
  if (!text) return null;

  return (
    <div className="rounded-xl border border-border bg-base-800/80 p-3 text-sm">
      <div className="font-medium">Quick insight</div>
      <div className="opacity-80">{text}</div>
    </div>
  );
}
