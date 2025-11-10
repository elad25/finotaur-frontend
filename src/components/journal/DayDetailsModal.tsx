import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Plus, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Trade {
  id: number;
  time: string;
  ticker: string;
  type: "Long" | "Short";
  entry: number;
  exit: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  rMultiple: number;
  strategy?: string;
  tags: string[];
  notes: string;
}

interface DayDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  trades: Trade[];
  onAddTrade: () => void;
}

export const DayDetailsModal = ({ open, onOpenChange, date, trades, onAddTrade }: DayDetailsModalProps) => {
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
  const avgRMultiple = trades.length > 0 
    ? trades.reduce((sum, t) => sum + t.rMultiple, 0) / trades.length 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Export Day
              </Button>
              <Button size="sm" onClick={onAddTrade}>
                <Plus className="h-4 w-4 mr-2" /> Add Trade
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Daily Summary */}
        <div className="grid grid-cols-4 gap-4 py-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{trades.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Daily P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
                ${totalPnL >= 0 ? "+" : ""}{totalPnL.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Avg R:R</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{avgRMultiple.toFixed(2)}R</p>
            </CardContent>
          </Card>
        </div>

        {/* Trades Table */}
        <div className="border rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Symbol</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Side</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Size</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Entry</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Exit</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">R:R</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">P&L</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Strategy</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="py-4 px-4 text-sm text-muted-foreground">{trade.time}</td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-primary">{trade.ticker}</span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={trade.type === "Long" ? "default" : "secondary"}>
                        {trade.type}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm">{trade.shares}</td>
                    <td className="py-4 px-4 text-right font-mono text-sm">${trade.entry.toFixed(2)}</td>
                    <td className="py-4 px-4 text-right font-mono text-sm">${trade.exit.toFixed(2)}</td>
                    <td className="py-4 px-4 text-right font-mono text-sm">{trade.rMultiple.toFixed(2)}R</td>
                    <td className={`py-4 px-4 text-right font-mono font-bold ${trade.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                      ${trade.pnl >= 0 ? "+" : ""}{trade.pnl}
                    </td>
                    <td className="py-4 px-4">
                      {trade.strategy && (
                        <Badge variant="outline" className="text-xs">
                          {trade.strategy}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {trades.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No trades recorded for this day</p>
            <Button onClick={onAddTrade}>
              <Plus className="h-4 w-4 mr-2" /> Add Trade
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
