import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  MoreHorizontal,
  Trash2,
  Edit2,
  Lock
} from "lucide-react";
import { usePlan } from "@/contexts/PlanContext";
import { Link } from "react-router-dom";

const Watchlists = () => {
  const { currentPlan } = usePlan();
  const [searchQuery, setSearchQuery] = useState("");

  const watchlists = [
    {
      name: "Tech Stocks",
      symbols: 8,
      items: [
        { ticker: "AAPL", name: "Apple Inc.", price: 178.25, change: 2.45, changePercent: 1.39 },
        { ticker: "MSFT", name: "Microsoft Corp", price: 425.15, change: -3.20, changePercent: -0.75 },
        { ticker: "NVDA", name: "NVIDIA Corp", price: 875.50, change: 15.75, changePercent: 1.83 },
        { ticker: "GOOGL", name: "Alphabet Inc", price: 142.30, change: 0.85, changePercent: 0.60 },
      ]
    },
    {
      name: "Growth Portfolio",
      symbols: 5,
      items: [
        { ticker: "TSLA", name: "Tesla Inc", price: 245.80, change: -5.40, changePercent: -2.15 },
        { ticker: "META", name: "Meta Platforms", price: 485.20, change: 8.90, changePercent: 1.87 },
      ]
    }
  ];

  const maxWatchlists = currentPlan === "basic" ? 1 : currentPlan === "pro" ? 5 : 999;
  const maxSymbols = currentPlan === "basic" ? 15 : currentPlan === "pro" ? 50 : 999;
  const canAddMore = watchlists.length < maxWatchlists;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Watchlists</h1>
          <p className="text-muted-foreground">
            Track your favorite stocks and ETFs
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {watchlists.length} / {maxWatchlists === 999 ? "Unlimited" : maxWatchlists} Lists
          </Badge>
          {canAddMore ? (
            <Button className="glow-primary">
              <Plus className="mr-2 h-4 w-4" /> New Watchlist
            </Button>
          ) : (
            <Button disabled className="relative">
              <Lock className="mr-2 h-4 w-4" />
              Upgrade to Add More
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search watchlists or symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Watchlists Grid */}
      <div className="space-y-6">
        {watchlists.map((watchlist, idx) => (
          <Card key={idx} className="p-6 hover:border-primary/50 transition-smooth">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-xl font-bold">{watchlist.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {watchlist.symbols} symbols · Updated 2m ago
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Symbols Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-sm font-semibold">Symbol</th>
                    <th className="text-left py-2 text-sm font-semibold">Name</th>
                    <th className="text-right py-2 text-sm font-semibold">Price</th>
                    <th className="text-right py-2 text-sm font-semibold">Change</th>
                    <th className="text-right py-2 text-sm font-semibold">%</th>
                    <th className="text-right py-2 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.items.map((item, itemIdx) => (
                    <tr key={itemIdx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <Link to={`/app/company/${item.ticker}`} className="font-bold text-primary hover:underline">
                          {item.ticker}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground text-sm">{item.name}</td>
                      <td className="py-3 text-right font-mono">${item.price.toFixed(2)}</td>
                      <td className={`py-3 text-right font-mono ${item.change >= 0 ? "text-success" : "text-destructive"}`}>
                        {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <Badge variant={item.changePercent >= 0 ? "default" : "destructive"} className="font-mono">
                          {item.changePercent >= 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {Math.abs(item.changePercent).toFixed(2)}%
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {watchlist.symbols} / {maxSymbols === 999 ? "Unlimited" : maxSymbols} symbols
              </p>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Symbol
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {watchlists.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">No watchlists yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first watchlist to start tracking your favorite symbols
            </p>
            <Button className="glow-primary">
              <Plus className="mr-2 h-4 w-4" /> Create Your First Watchlist
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Watchlists;
