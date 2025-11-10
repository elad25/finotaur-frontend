import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Trade } from '@/lib/journal';

interface EquityChartProps {
  trades: Trade[];
}

export const EquityChart = ({ trades }: EquityChartProps) => {
  // Calculate cumulative P&L
  const equityData = trades
    .filter((t) => t.exit_price !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc, trade, index) => {
      const prevEquity = index > 0 ? acc[index - 1].equity : 0;
      const equity = prevEquity + (trade.pnl || 0);
      
      acc.push({
        date: new Date(trade.date).toLocaleDateString(),
        equity,
      });
      
      return acc;
    }, [] as { date: string; equity: number }[]);

  if (equityData.length === 0) {
    return (
      <Card className="rounded-2xl border-border bg-base-800 p-12 text-center shadow-premium">
        <p className="text-muted-foreground">No completed trades yet</p>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border bg-base-800 p-6 shadow-premium">
      <h3 className="mb-4 text-lg font-bold">Equity Curve</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={equityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--base-700))" />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) =>
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact',
                }).format(value)
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--base-700))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) =>
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(value)
              }
            />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="hsl(var(--gold))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--gold))', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
