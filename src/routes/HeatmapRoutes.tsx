import { Route } from "react-router-dom";
import HeatmapPage from "../pages/HeatmapPage";

export function HeatmapRoutes() {
  return (
    <>
      <Route path="/app/stocks/heatmap" element={<HeatmapPage market="stocks" />} />
      <Route path="/app/crypto/heatmap" element={<HeatmapPage market="crypto" />} />
      <Route path="/app/futures/heatmap" element={<HeatmapPage market="futures" />} />
      <Route path="/app/forex/heatmap" element={<HeatmapPage market="forex" />} />
      <Route path="/app/commodities/heatmap" element={<HeatmapPage market="commodities" />} />
      <Route path="/app/indices/heatmap" element={<HeatmapPage market="indices" />} />
    </>
  );
}

export default HeatmapRoutes;
