import React from "react";
import { Link, useLocation } from "react-router-dom";

type Crumb = { label: string; href?: string };

type Props = {
  items?: Crumb[];          // אם לא שולחים items, נבנה לבד מה-URL
  className?: string;
};

const LABEL_MAP: Record<string, string> = {
  app: "App",
  all: "All Markets",
  stocks: "Stocks",
  crypto: "Crypto",
  forex: "Forex",
  commodities: "Commodities",
  options: "Options",
  macro: "Macro & News",
  ai: "AI Insights",
  journal: "Journal",
  "copy-trade": "Copy Trade",
  funding: "Funding",

  // תתי-ראוטים נפוצים (אפשר להרחיב לפי הצורך)
  overview: "Overview",
  "top-coins": "Top Coins",
  "on-chain": "On-chain",
  heatmap: "Heatmap",
  news: "News",
  "large-caps": "Large Caps",
  "small-caps": "Small Caps",
  trends: "Trends",
  earnings: "Earnings",
  "investing-screener": "Investing Screener",
  favorites: "Favorites",
  catalysts: "Catalysts",
  "upgrades-downgrades": "Upgrades / Downgrades",
  reports: "Reports",
  calendar: "Calendar",
  "deep-analysis": "Deep Analysis",
  correlations: "Correlations",
  "open-positions": "Open Positions",
  flow: "Flow",
  iv: "IV",
  strategy: "Strategy",
  greeks: "Greeks",
  "unusual-activity": "Unusual Activity",
  "earnings-plays": "Earnings Plays",
  "economic-calendar": "Economic Calendar",
  "fed-watch": "Fed Watch",
  "global-events": "Global Events",
  global: "Global",
  sentiment: "Sentiment",
  movers: "Movers",
};

function autoItemsFromPath(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean); // ["app","stocks","overview", ...]
  const acc: Crumb[] = [];
  let href = "";
  for (const p of parts) {
    href += `/${p}`;
    acc.push({ label: LABEL_MAP[p] ?? p, href });
  }
  return acc;
}

const Breadcrumb: React.FC<Props> = ({ items, className }) => {
  const { pathname } = useLocation();
  const crumbs = items ?? autoItemsFromPath(pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-sm text-neutral-300 ${className ?? ""}`}
    >
      {crumbs.map((c, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <React.Fragment key={`${c.label}-${idx}`}>
            {c.href && !isLast ? (
              <Link
                to={c.href}
                className="hover:underline hover:text-yellow-400 transition-colors"
              >
                {c.label}
              </Link>
            ) : (
              <span className="text-yellow-400">{c.label}</span>
            )}
            {!isLast && <span className="mx-1 text-yellow-500/40">›</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
