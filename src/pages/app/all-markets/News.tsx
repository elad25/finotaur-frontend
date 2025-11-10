// src/pages/app/all-markets/News.tsx
import React from "react";
import { PageTemplate } from "@/components/PageTemplate";
import { NewsList } from "@/components/markets/NewsList";

export default function AllMarketsNews() {
  return (
    <PageTemplate
      title="Markets News"
      description="Market-wide headlines and insights across all assets."
    >
      <div className="grid grid-cols-1 gap-6">
        <NewsList />
      </div>
    </PageTemplate>
  );
}
