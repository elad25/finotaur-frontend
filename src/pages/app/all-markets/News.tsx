// src/pages/app/all-markets/News.tsx

import React from "react";
import { NewsList } from "@/components/markets/NewsList";

export default function AllMarketsNews() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Markets News</h1>
      <NewsList />
    </div>
  );
}