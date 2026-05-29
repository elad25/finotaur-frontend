// src/components/admin/seo/TickerTable.tsx
// ==========================================
// Top-20 ticker table with views + unique visitors.
// Ticker cells link to /research/<TICKER> in a new tab.

import type { TopTickerRow } from '@/lib/seo/analyticsTypes';

interface TickerTableProps {
  tickers: TopTickerRow[];
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function TickerTable({ tickers }: TickerTableProps) {
  const rows = tickers.slice(0, 20);

  return (
    <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-white font-semibold">
          Top pages — /research/* tickers
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">Top {rows.length} by views</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">
          No ticker data yet — pages need to be visited first.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0A0A0A] text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium text-[#C9A646]">
                  #
                </th>
                <th className="text-left px-5 py-2.5 font-medium text-[#C9A646]">
                  Ticker
                </th>
                <th className="text-left px-5 py-2.5 font-medium text-[#C9A646] hidden sm:table-cell">
                  Path
                </th>
                <th className="text-right px-5 py-2.5 font-medium text-[#C9A646]">
                  Views
                </th>
                <th className="text-right px-5 py-2.5 font-medium text-[#C9A646]">
                  Unique visitors
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.ticker}
                  className="border-t border-gray-800 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-2.5 text-gray-500 text-xs w-10">
                    {idx + 1}
                  </td>
                  <td className="px-5 py-2.5">
                    <a
                      href={`/research/${row.ticker}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-semibold text-white hover:text-[#C9A646] transition-colors"
                    >
                      {row.ticker}
                    </a>
                  </td>
                  <td className="px-5 py-2.5 text-gray-500 text-xs hidden sm:table-cell">
                    {row.path}
                  </td>
                  <td className="text-right px-5 py-2.5 text-gray-300">
                    {formatNumber(row.views)}
                  </td>
                  <td className="text-right px-5 py-2.5 text-gray-400">
                    {formatNumber(row.uniqueVisitors)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TickerTable;
