import { Route, Navigate } from "react-router-dom";

/**
 * Keep the URL under /app/all-markets/heatmap and redirect any legacy market pages here.
 * Example: /app/stocks/heatmap -> /app/all-markets/heatmap?m=stocks
 */
export default function HeatmapKeepAllMarketsRedirects() {
  return (
    <>
      <Route path="/app/stocks/heatmap" element={<Navigate to="/app/all-markets/heatmap?m=stocks" replace />} />
      <Route path="/app/crypto/heatmap" element={<Navigate to="/app/all-markets/heatmap?m=crypto" replace />} />
      <Route path="/app/futures/heatmap" element={<Navigate to="/app/all-markets/heatmap?m=futures" replace />} />
      <Route path="/app/forex/heatmap" element={<Navigate to="/app/all-markets/heatmap?m=forex" replace />} />
      <Route path="/app/commodities/heatmap" element={<Navigate to="/app/all-markets/heatmap?m=commodities" replace />} />
      <Route path="/app/indices/heatmap" element={<Navigate to="/app/all-markets/heatmap?m=indices" replace />} />
    </>
  );
}
