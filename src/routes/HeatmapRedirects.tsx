import { Route, Navigate } from "react-router-dom";

export function HeatmapRedirects() {
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

export default HeatmapRedirects;
