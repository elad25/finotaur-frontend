// ================================================
// MONTHLY RETURNS HEATMAP
// File: src/components/charts/MonthlyReturnsHeatmap.tsx
// ================================================

import React, { useMemo } from "react";
import dayjs from "dayjs";

interface MonthlyReturn {
  month: string;
  return: number;
}

interface MonthlyReturnsHeatmapProps {
  data: MonthlyReturn[];
}

const MonthlyReturnsHeatmap: React.FC<MonthlyReturnsHeatmapProps> = ({ data }) => {
  const heatmapData = useMemo(() => {
    if (!data || data.length === 0) return { years: [], months: [], data: {} };
    
    // Group by year
    const byYear: { [key: string]: { [key: number]: number } } = {};
    
    data.forEach(item => {
      const date = dayjs(item.month);
      const year = date.year().toString();
      const monthNum = date.month();
      
      if (!byYear[year]) byYear[year] = {};
      byYear[year][monthNum] = item.return;
    });
    
    return {
      years: Object.keys(byYear).sort(),
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      data: byYear
    };
  }, [data]);

  const getColor = (value: number | undefined) => {
    if (value === undefined) return 'rgba(255, 255, 255, 0.03)';
    
    const intensity = Math.min(Math.abs(value) / 10, 1);
    
    if (value > 0) {
      return `rgba(74, 210, 149, ${0.2 + intensity * 0.6})`;
    } else if (value < 0) {
      return `rgba(227, 99, 99, ${0.2 + intensity * 0.6})`;
    }
    return 'rgba(255, 255, 255, 0.05)';
  };

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[380px] bg-[#0A0A0A] rounded-[20px] flex items-center justify-center border border-white/[0.08]">
        <p className="text-[#666666] text-sm">No monthly returns data available</p>
      </div>
    );
  }

  return (
    <div 
      className="rounded-2xl border p-6 shadow-lg"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.08)',
        background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
      }}
    >
      <div className="mb-6">
        <h3 className="text-[#F4F4F4] text-lg font-semibold mb-1">
          BACKTEST: Monthly Returns Heatmap
        </h3>
        <p className="text-[#666666] text-sm">
          Performance distribution across months
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="flex items-center mb-2">
            <div className="w-16"></div>
            {heatmapData.months.map((month, i) => (
              <div 
                key={i} 
                className="flex-1 text-center text-xs text-[#666666] font-medium"
              >
                {month}
              </div>
            ))}
          </div>

          {/* Rows */}
          {heatmapData.years.map(year => (
            <div key={year} className="flex items-center mb-2">
              <div className="w-16 text-sm text-[#666666] font-medium">{year}</div>
              {heatmapData.months.map((_, monthIndex) => {
                const value = heatmapData.data[year]?.[monthIndex];
                
                return (
                  <div 
                    key={monthIndex}
                    className="flex-1 mx-0.5 group relative"
                  >
                    <div
                      className="h-12 rounded-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105"
                      style={{ backgroundColor: getColor(value) }}
                    >
                      {value !== undefined && (
                        <span className={`text-xs font-semibold ${
                          Math.abs(value) > 3 ? 'text-white' : 'text-[#A0A0A0]'
                        }`}>
                          {value > 0 ? '+' : ''}{value.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    
                    {/* Tooltip on hover */}
                    {value !== undefined && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-black/90 px-3 py-2 rounded-lg text-xs whitespace-nowrap">
                          <div className="font-semibold text-white mb-1">
                            {heatmapData.months[monthIndex]} {year}
                          </div>
                          <div className={value >= 0 ? 'text-[#4AD295]' : 'text-[#E36363]'}>
                            {value > 0 ? '+' : ''}{value.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: 'rgba(227, 99, 99, 0.8)' }}></div>
          <span className="text-xs text-[#666666]">Negative</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
          <span className="text-xs text-[#666666]">Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: 'rgba(74, 210, 149, 0.8)' }}></div>
          <span className="text-xs text-[#666666]">Positive</span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReturnsHeatmap;