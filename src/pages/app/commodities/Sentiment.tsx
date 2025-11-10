import { useMemo } from "react";
import { Link } from "react-router-dom";

export default function CommoditiesSentiment() {
  const breadcrumbs = useMemo(() => [
    { title: "All Markets", to: "/app/all-markets/overview" },
    { title: "Commodities", to: "/app/commodities/overview" }, { title: "Sentiment", to: "/app/commodities/sentiment" }
  ], []);

  return (
    <div className="p-6 space-y-4">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        {{breadcrumbs.map((b, i) => (
          <span key={i}>
            <Link to={{b.to}} className="hover:underline">{{b.title}}</Link>
            {{i < breadcrumbs.length - 1 ? " / " : ""}}
          </span>
        ))}}
      </div>
      <h1 className="text-xl font-semibold">Commodities — Sentiment</h1>
      <div className="rounded-xl border border-border/40 p-4">
        <p className="text-sm opacity-80">This is the Commodities — Sentiment page. Hook up your data source here.</p>
        <ul className="list-disc pl-6 mt-3 text-sm">
          <li>Consistent layout with the rest of the app</li>
          <li>Ready to wire to your existing feed/service</li>
          <li>Route added via delta helper</li>
        </ul>
      </div>
    </div>
  );
}
