import React from "react";
import { Route } from "react-router-dom";

import AllMarketsNews from "@/pages/app/all-markets/News";
import ForexNews from "@/pages/app/forex/News";
import CommoditiesNews from "@/pages/app/commodities/News";

import CryptoSentiment from "@/pages/app/crypto/Sentiment";
import StocksSentiment from "@/pages/app/stocks/Sentiment";
import ForexSentiment from "@/pages/app/forex/Sentiment";
import CommoditiesSentiment from "@/pages/app/commodities/Sentiment";
import IndicesSentiment from "@/pages/app/indices/Sentiment";

export const DELTA_ROUTES_NEWS_SENTIMENT = [
  <Route key="allm-news" path="all-markets/news" element={<AllMarketsNews />} />,
  <Route key="forex-news" path="forex/news" element={<ForexNews />} />,
  <Route key="commodities-news" path="commodities/news" element={<CommoditiesNews />} />,
  <Route key="forex-sentiment" path="forex/sentiment" element={<ForexSentiment />} />,
  <Route key="commodities-sentiment" path="commodities/sentiment" element={<CommoditiesSentiment />} />,
  <Route key="stocks-sentiment" path="stocks/sentiment" element={<StocksSentiment />} />,
  <Route key="crypto-sentiment" path="crypto/sentiment" element={<CryptoSentiment />} />,
  <Route key="indices-sentiment" path="indices/sentiment" element={<IndicesSentiment />} />,
] as const;
