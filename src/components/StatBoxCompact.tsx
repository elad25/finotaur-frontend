// components/StatBoxCompact.tsx
import { memo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface StatBoxCompactProps {
  label: string;
  value: string;
  color: string;
  sublabel?: string;
  icon?: React.ReactNode;
  change?: number;
  trend?: 'up' | 'down';
}

// 🚀 Memoized component - לא יתרנדר מחדש אם ה-props לא השתנו
export const StatBoxCompact = memo(function StatBoxCompact({ 
  label, 
  value, 
  color, 
  sublabel,
  icon,
  change,
  trend
}: StatBoxCompactProps) {
  return (
    <div 
      className="space-y-2 p-3 rounded-lg transition-all hover:scale-[1.02] hover:shadow-lg group relative"
      style={{
        background: 'rgba(20,20,20,0.4)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon && <div style={{ color }}>{icon}</div>}
          <p className="text-xs font-semibold" style={{ color: '#9A9A9A' }}>
            {label}
          </p>
        </div>
        {trend && change !== undefined && (
          <div className="flex items-center gap-1" style={{ color }}>
            {trend === 'up' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span className="text-xs font-semibold">{Math.abs(change).toFixed(1)}</span>
          </div>
        )}
      </div>
      
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
      </p>
      
      {sublabel && (
        <p className="text-xs" style={{ color: '#606060' }}>
          {sublabel}
        </p>
      )}
    </div>
  );
});