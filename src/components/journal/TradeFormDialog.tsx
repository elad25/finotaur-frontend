import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (trade: any) => void;
  strategies: { id: string; name: string }[];
}

export const TradeFormDialog = ({ open, onOpenChange, onSave, strategies }: TradeFormDialogProps) => {
  const [ticker, setTicker] = useState("");
  const [type, setType] = useState<"Long" | "Short">("Long");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [shares, setShares] = useState("");
  const [strategyId, setStrategyId] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!ticker || !entry || !exit || !shares) return;

    const entryPrice = parseFloat(entry);
    const exitPrice = parseFloat(exit);
    const quantity = parseInt(shares);
    const pnl = type === "Long" 
      ? (exitPrice - entryPrice) * quantity 
      : (entryPrice - exitPrice) * quantity;
    const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100 * (type === "Long" ? 1 : -1);

    onSave({
      ticker: ticker.toUpperCase(),
      type,
      entry: entryPrice,
      exit: exitPrice,
      shares: quantity,
      pnl,
      pnlPercent,
      rMultiple: pnl > 0 ? Math.abs(pnl / (entryPrice * quantity * 0.02)) : -(Math.abs(pnl) / (entryPrice * quantity * 0.02)),
      strategyId: strategyId || undefined,
      notes,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      tags: [],
    });

    // Reset form
    setTicker("");
    setType("Long");
    setEntry("");
    setExit("");
    setShares("");
    setStrategyId("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Trade</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker Symbol</Label>
            <Input
              id="ticker"
              placeholder="AAPL"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Side</Label>
            <Select value={type} onValueChange={(v) => setType(v as "Long" | "Short")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Long">Long</SelectItem>
                <SelectItem value="Short">Short</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry">Entry Price</Label>
            <Input
              id="entry"
              type="number"
              step="0.01"
              placeholder="175.50"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exit">Exit Price</Label>
            <Input
              id="exit"
              type="number"
              step="0.01"
              placeholder="178.25"
              value={exit}
              onChange={(e) => setExit(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shares">Shares/Quantity</Label>
            <Input
              id="shares"
              type="number"
              placeholder="100"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy">Strategy (Optional)</Label>
            <Select value={strategyId} onValueChange={setStrategyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select strategy..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Trade notes, setup details, lessons learned..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!ticker || !entry || !exit || !shares}>
            Add Trade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
