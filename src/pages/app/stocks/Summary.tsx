// src/pages/app/stocks/Summary.tsx
import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OverviewTab from "@/components/overview/OverviewTab"; // NEW

export default function StocksSummary() {
  // single source of truth: symbol from URL (?symbol=...)
  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const symbol = (sp.get('symbol') || '').trim().toUpperCase();

  // keep localStorage for back-compat (view-only; do not render input)
  useEffect(() => {
    if (symbol) try { localStorage.setItem('finotaur.summary.symbol', symbol); } catch {}
  }, [symbol]);

  const companyLabel = symbol ? `${symbol}` : '—';

  return (
    <div className="space-y-6">
      {/* Header line (no internal search here) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{companyLabel}</h1>
          <div className="text-zinc-500 text-sm">— —</div>
        </div>
      </div>

      {/* Finotaur Overview (replaces old text-only block) */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <OverviewTab symbol={symbol} />
        </CardContent>
      </Card>

          </div>
  );
}
