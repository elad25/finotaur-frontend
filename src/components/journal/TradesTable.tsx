// src/components/TradesTable.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { Trade } from '@/lib/journal';
import { useTrades } from '@/hooks/useTrades';
import { toast } from 'sonner';

interface TradesTableProps {
  trades: Trade[];
}

export const TradesTable = ({ trades }: TradesTableProps) => {
  const navigate = useNavigate();
  const { deleteTrade } = useTrades();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const handleDelete = async (id: string, symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Delete ${symbol} trade?`)) {
      return;
    }

    setDeletingId(id);
    
    try {
      const result = await deleteTrade(id);
      
      if (result.ok) {
        toast.success('Trade deleted successfully');
      } else {
        toast.error(result.message || 'Failed to delete trade');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || 'Failed to delete trade');
    } finally {
      setDeletingId(null);
    }
  };

  if (trades.length === 0) {
    return (
      <Card className="rounded-2xl border-border bg-base-800 p-12 text-center shadow-premium">
        <p className="text-muted-foreground">No trades found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Start by creating your first trade
        </p>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border bg-base-800 shadow-premium overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="sticky top-0 bg-base-800 font-semibold">Date</TableHead>
              <TableHead className="sticky top-0 bg-base-800 font-semibold">Symbol</TableHead>
              <TableHead className="sticky top-0 bg-base-800 font-semibold">Strategy</TableHead>
              <TableHead className="sticky top-0 bg-base-800 font-semibold">Side</TableHead>
              <TableHead className="sticky top-0 bg-base-800 text-right font-semibold">Qty</TableHead>
              <TableHead className="sticky top-0 bg-base-800 text-right font-semibold">Entry</TableHead>
              <TableHead className="sticky top-0 bg-base-800 text-right font-semibold">Exit</TableHead>
              <TableHead className="sticky top-0 bg-base-800 text-right font-semibold">P&L</TableHead>
              <TableHead className="sticky top-0 bg-base-800 text-right font-semibold">R</TableHead>
              <TableHead className="sticky top-0 bg-base-800 text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => {
              const isProfitable = (trade.pnl || 0) > 0;
              const isHovered = hoveredRow === trade.id;
              const isDeleting = deletingId === trade.id;

              return (
                <TableRow
                  key={trade.id}
                  className="cursor-pointer border-border transition-all hover:bg-base-700/50"
                  onClick={() => navigate(`/app/journal/${trade.id}`)}
                  onMouseEnter={() => setHoveredRow(trade.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <TableCell className="font-medium">
                    {formatDate(trade.open_at)}
                  </TableCell>

                  <TableCell className="font-bold text-gold">
                    {trade.symbol}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {/* ✅ Display strategy_name from JOIN */}
                    {trade.strategy_name || '—'}
                  </TableCell>

                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        trade.side === 'LONG'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {trade.side === 'LONG' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {trade.side}
                    </span>
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {trade.quantity}
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(trade.entry_price || 0)}
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {trade.exit_price ? formatCurrency(trade.exit_price) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell
                    className={`text-right font-bold tabular-nums ${
                      trade.outcome === 'OPEN' 
                        ? 'text-muted-foreground'
                        : isProfitable 
                          ? 'text-emerald-400' 
                          : 'text-red-400'
                    }`}
                  >
                    {trade.outcome === 'OPEN' ? (
                      <span className="text-xs font-normal">OPEN</span>
                    ) : (
                      formatCurrency(trade.pnl || 0)
                    )}
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {trade.metrics?.actual_r !== null && trade.metrics?.actual_r !== undefined ? (
                      <span
                        className={`font-semibold ${
                          trade.metrics.actual_r > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {trade.metrics.actual_r.toFixed(2)}R
                      </span>
                    ) : trade.metrics?.rr ? (
                      <span className="text-muted-foreground">
                        {trade.metrics.rr.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    {isHovered && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-gold/10 hover:text-gold"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/journal/${trade.id}`);
                          }}
                          disabled={isDeleting}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => handleDelete(trade.id!, trade.symbol!, e)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};