import React from "react";

type Category =
  | "all"
  | "stocks"
  | "crypto"
  | "forex"
  | "commodities"
  | "macro"
  | "ai"
  | "journal"
  | "copytrade"
  | "funding";

const MENU: Record<Category, { title: string; items: { label: string; href?: string }[] }> = {
  all: {
    title: "All Markets",
    items: [
      { label: "Dashboard" },
      { label: "News" },
      { label: "Top Movers" },
    ],
  },
  stocks: {
    title: "Stocks",
    items: [
      { label: "Dashboard" },
      { label: "Screener" },
      { label: "Earnings Calendar" },
      { label: "Fundamentals" },
      { label: "Top Movers" },
      { label: "News" },
    ],
  },
  crypto: {
    title: "Crypto",
    items: [
      { label: "Dashboard" },
      { label: "Top Coins" },
      { label: "On-chain Data" },
      { label: "Heatmap" },
      { label: "News" },
    ],
  },
  forex: {
    title: "Forex",
    items: [
      { label: "Dashboard" },
      { label: "Currency Strength" },
      { label: "Correlation Map" },
      { label: "Economic Calendar" },
    ],
  },
  commodities: {
    title: "Commodities",
    items: [
      { label: "Dashboard" },
      { label: "Energy" },
      { label: "Metals" },
      { label: "Agriculture" },
      { label: "News" },
    ],
  },
  macro: {
    title: "Macro & News",
    items: [
      { label: "Market Overview" },
      { label: "Global Calendar" },
      { label: "Interest Rates" },
      { label: "Reports & PDFs" },
    ],
  },
  ai: {
    title: "AI Insights",
    items: [
      { label: "Daily Summary" },
      { label: "Weekly Digest" },
      { label: "Sentiment Map" },
    ],
  },
  journal: {
    title: "Journal",
    items: [{ label: "Trading Journal (soon)" }],
  },
  copytrade: {
    title: "Copy Trade",
    items: [{ label: "Top Traders (soon)" }],
  },
  funding: {
    title: "Funding",
    items: [{ label: "Cash Advance (soon)" }],
  },
};

export default function SideNav({ category = "all" }: { category?: Category }) {
  const block = MENU[category] ?? MENU.all;

  return (
    <nav className="text-sm">
      <div className="px-2 py-1.5 font-medium text-neutral-400 uppercase tracking-wide">
        {block.title}
      </div>
      <ul className="space-y-1 mt-2">
        {block.items.map((it) => (
          <li key={it.label}>
            <a
              href={it.href || "#"}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#FFD700]/10 hover:text-[#F5F5F5] text-neutral-300 transition"
            >
              {/* Minimal icon placeholder */}
              <span className="text-xs">•</span>
              <span className="truncate">{it.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
