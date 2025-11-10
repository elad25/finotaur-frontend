import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, DollarSign } from 'lucide-react';

interface JournalStatsProps {
  stats: {
    totalPnl: number;
    winRate: number;
    avgR: number;
    expectancy: number;
    totalTrades: number;
  };
}

export const JournalStats = ({ stats }: JournalStatsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const cards = [
    {
      title: 'Total P&L',
      value: formatCurrency(stats.totalPnl),
      icon: DollarSign,
      positive: stats.totalPnl >= 0,
    },
    {
      title: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      subtitle: `${stats.totalTrades} trades`,
      icon: Target,
      positive: stats.winRate >= 50,
    },
    {
      title: 'Avg R',
      value: stats.avgR.toFixed(2),
      icon: TrendingUp,
      positive: stats.avgR > 0,
    },
    {
      title: 'Expectancy',
      value: formatCurrency(stats.expectancy),
      icon: stats.expectancy >= 0 ? TrendingUp : TrendingDown,
      positive: stats.expectancy >= 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className="rounded-2xl border-border bg-base-800 p-6 shadow-premium"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    card.positive ? 'text-emerald' : 'text-destructive'
                  }`}
                >
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
                )}
              </div>
              <div
                className={`rounded-full p-3 ${
                  card.positive ? 'bg-emerald/10' : 'bg-destructive/10'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    card.positive ? 'text-emerald' : 'text-destructive'
                  }`}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
