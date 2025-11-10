import React from "react";
import { Route, Navigate } from "react-router-dom";
import HeatmapPage from "../pages/HeatmapPage";

// React Router v6: children of <Routes> must be <Route> elements (or arrays thereof),
// not custom components. Export an array of <Route> elements and spread it inside <Routes>.

export const HEATMAP_ROUTES = [
  <Route key="stocks-hm" path="/app/stocks/heatmap" element={<HeatmapPage market="stocks" />} />,
  <Route key="crypto-hm" path="/app/crypto/heatmap" element={<HeatmapPage market="crypto" />} />,
  <Route key="futures-hm" path="/app/futures/heatmap" element={<HeatmapPage market="futures" />} />,
  <Route key="forex-hm" path="/app/forex/heatmap" element={<HeatmapPage market="forex" />} />,
  <Route key="commodities-hm" path="/app/commodities/heatmap" element={<HeatmapPage market="commodities" />} />,
  <Route key="indices-hm" path="/app/indices/heatmap" element={<HeatmapPage market="indices" />} />,
] as const;

// optional legacy redirect from /app/all-markets/heatmap → /app/stocks/heatmap
export const HEATMAP_REDIRECT = null as any;
