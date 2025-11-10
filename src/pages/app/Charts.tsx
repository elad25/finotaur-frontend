import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, LayoutGrid, Plus } from "lucide-react";

const Charts = () => {
  const [symbol, setSymbol] = useState("AAPL");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Charts & Technical Analysis</h1>
          <p className="text-muted-foreground">
            Advanced charting tools powered by TradingView
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <LayoutGrid size={16} className="mr-2" />
            Saved Layouts
          </Button>
          <Button variant="default" size="sm" className="glow-primary">
            <Plus size={16} className="mr-2" />
            New Chart
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Search symbols..." 
          className="pl-10"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        />
      </div>

      {/* TradingView Chart */}
      <Card className="shadow-premium border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[700px]">
            <iframe
              src={`https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=NASDAQ%3A${symbol || "AAPL"}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=America%2FNew_York&withdateranges=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart&utm_term=NASDAQ%3AAAPL`}
              className="w-full h-full border-0"
              title="TradingView Chart"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Charts;
