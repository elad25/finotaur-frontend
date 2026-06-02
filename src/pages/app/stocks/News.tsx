// src/pages/app/stocks/News.tsx
// Reuses the shared NewsList component (all-markets news feed with Stocks category).
// Mirrors the pattern used by forex/News.tsx and commodities/News.tsx.

import { PageTemplate } from '@/components/PageTemplate';
import { NewsList } from '@/components/markets/NewsList';

export default function StocksNews() {
  return (
    <PageTemplate
      title="Stock News"
      description="Latest market news and analysis for equities."
    >
      <div className="mt-4">
        <NewsList />
      </div>
      <p className="text-[11px] text-white/20 text-center pt-4">
        Market data may be delayed · Powered by Polygon.io
      </p>
    </PageTemplate>
  );
}
