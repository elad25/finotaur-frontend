
import { useEffect, useState } from "react";

type CompanyProfile = { name: string; ticker: string; logoUrl?: string | null; marketCap?: number | null };

export default function CompanyHeader({ symbol }: { symbol: string }) {
  const [p, setP] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const r = await fetch(`/api/company/profile?symbol=${encodeURIComponent(symbol)}`, { credentials: "include" });
        const j = await r.json();
        if (!cancelled) setP(j?.data ?? null);
      } catch (_) {}
    }
    run();
    return () => { cancelled = true; };
  }, [symbol]);

  const name = p?.name || symbol;
  const ticker = p?.ticker || symbol;

  return (
    <div className="flex items-center gap-4 mb-4">
      {p?.logoUrl ? (
        <img
          src={p.logoUrl}
          alt={`${name} logo`}
          className="h-10 w-10 rounded-full ring-1 ring-zinc-700 object-contain bg-zinc-900"
          loading="lazy"
        />
      ) : (
        <div className="h-10 w-10 rounded-full ring-1 ring-zinc-700 bg-zinc-900 flex items-center justify-center text-sm text-zinc-300">
          {ticker.slice(0, 2)}
        </div>
      )}
      <div className="flex flex-col">
        <div className="text-xl font-semibold tracking-tight">{name}</div>
        <div className="text-sm text-zinc-400">{ticker}</div>
      </div>
    </div>
  );
}
