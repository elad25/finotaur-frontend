import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, Save, Play, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";

const Screener = () => {
  const [activeTab, setActiveTab] = useState("technical");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [peRange, setPeRange] = useState([0, 50]);
  
  const mockResults = [
    { symbol: "AAPL", name: "Apple Inc.", price: 178.45, change: 1.83, volume: "52.3M", marketCap: "2.8T", pe: 28.5 },
    { symbol: "MSFT", name: "Microsoft Corp", price: 415.89, change: 0.65, volume: "28.1M", marketCap: "3.1T", pe: 35.2 },
    { symbol: "NVDA", name: "NVIDIA Corp", price: 875.32, change: 1.44, volume: "42.7M", marketCap: "2.2T", pe: 65.8 },
    { symbol: "GOOGL", name: "Alphabet Inc.", price: 152.43, change: 0.57, volume: "21.5M", marketCap: "1.9T", pe: 22.3 },
    { symbol: "AMZN", name: "Amazon.com", price: 178.92, change: 2.15, volume: "35.7M", marketCap: "1.8T", pe: 48.7 },
  ];

  return (
    <div className="space-y-6 p-6 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Stock Screener</h1>
          <p className="text-muted-foreground">Filter stocks by fundamentals and technicals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Save size={16} className="mr-2" />
            Save Preset
          </Button>
          <Button size="sm" className="glow-primary">
            <Play size={16} className="mr-2" />
            Run Screen
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="technical">Technical Filters</TabsTrigger>
          <TabsTrigger value="fundamental">Fundamental Filters</TabsTrigger>
        </TabsList>

        {/* Technical Filters */}
        <TabsContent value="technical" className="mt-6">
          <Card className="shadow-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter size={20} />
                Technical Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price Action */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth">
                  <span className="font-semibold">Price Action</span>
                  <ChevronDown size={18} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-4 p-4 border border-border rounded-lg">
                  <div className="space-y-2">
                    <Label>Price Range: ${priceRange[0]} - ${priceRange[1]}</Label>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={1000}
                      step={10}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>% Change Today</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="text" placeholder="Min %" />
                      <Input type="text" placeholder="Max %" />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Technical Indicators */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth">
                  <span className="font-semibold">Technical Indicators</span>
                  <ChevronDown size={18} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3 p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="rsi-oversold" />
                    <Label htmlFor="rsi-oversold" className="cursor-pointer">RSI Oversold (&lt; 30)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="rsi-overbought" />
                    <Label htmlFor="rsi-overbought" className="cursor-pointer">RSI Overbought (&gt; 70)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="macd-bullish" />
                    <Label htmlFor="macd-bullish" className="cursor-pointer">MACD Bullish Crossover</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="sma-cross" />
                    <Label htmlFor="sma-cross" className="cursor-pointer">SMA 50/200 Golden Cross</Label>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Volume & Volatility */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth">
                  <span className="font-semibold">Volume & Volatility</span>
                  <ChevronDown size={18} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3 p-4 border border-border rounded-lg">
                  <div className="space-y-2">
                    <Label>Minimum Volume</Label>
                    <Input type="text" placeholder="e.g., 1M" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="volume-spike" />
                    <Label htmlFor="volume-spike" className="cursor-pointer">Volume Spike (2x Avg)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="high-volatility" />
                    <Label htmlFor="high-volatility" className="cursor-pointer">High Volatility (&gt; 3% ATR)</Label>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fundamental Filters */}
        <TabsContent value="fundamental" className="mt-6">
          <Card className="shadow-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter size={20} />
                Fundamental Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Valuation */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth">
                  <span className="font-semibold">Valuation Metrics</span>
                  <ChevronDown size={18} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-4 p-4 border border-border rounded-lg">
                  <div className="space-y-2">
                    <Label>P/E Ratio: {peRange[0]} - {peRange[1]}</Label>
                    <Slider
                      value={peRange}
                      onValueChange={setPeRange}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Market Cap</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="text" placeholder="Min (e.g., 1B)" />
                      <Input type="text" placeholder="Max" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>EV/EBITDA</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="text" placeholder="Min" />
                      <Input type="text" placeholder="Max" />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Growth & Profitability */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth">
                  <span className="font-semibold">Growth & Profitability</span>
                  <ChevronDown size={18} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3 p-4 border border-border rounded-lg">
                  <div className="space-y-2">
                    <Label>EPS Growth (YoY %)</Label>
                    <Input type="text" placeholder="Min %" />
                  </div>
                  <div className="space-y-2">
                    <Label>Revenue Growth (YoY %)</Label>
                    <Input type="text" placeholder="Min %" />
                  </div>
                  <div className="space-y-2">
                    <Label>Profit Margin (%)</Label>
                    <Input type="text" placeholder="Min %" />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Financial Health */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth">
                  <span className="font-semibold">Financial Health</span>
                  <ChevronDown size={18} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3 p-4 border border-border rounded-lg">
                  <div className="space-y-2">
                    <Label>Debt/Equity Ratio</Label>
                    <Input type="text" placeholder="Max" />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Ratio</Label>
                    <Input type="text" placeholder="Min (e.g., 1.5)" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="dividend" />
                    <Label htmlFor="dividend" className="cursor-pointer">Dividend Paying</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Dividend Yield (%)</Label>
                    <Input type="text" placeholder="Min %" />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Table */}
      <Card className="shadow-premium border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Results ({mockResults.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Last updated: 2 min ago</Badge>
              <Button variant="outline" size="sm">
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Ticker</th>
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-right py-3 px-4 font-semibold">Price</th>
                  <th className="text-right py-3 px-4 font-semibold">% Change</th>
                  <th className="text-right py-3 px-4 font-semibold">Volume</th>
                  <th className="text-right py-3 px-4 font-semibold">Market Cap</th>
                  <th className="text-right py-3 px-4 font-semibold">P/E</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockResults.map((stock) => (
                  <tr
                    key={stock.symbol}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="font-bold text-primary">{stock.symbol}</span>
                    </td>
                    <td className="py-4 px-4 text-sm">{stock.name}</td>
                    <td className="py-4 px-4 text-right font-mono">${stock.price}</td>
                    <td className="py-4 px-4 text-right">
                      <div
                        className={`flex items-center justify-end gap-1 ${
                          stock.change >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {stock.change >= 0 ? (
                          <TrendingUp size={14} />
                        ) : (
                          <TrendingDown size={14} />
                        )}
                        <span className="font-semibold">
                          {stock.change >= 0 ? "+" : ""}
                          {stock.change}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm">{stock.volume}</td>
                    <td className="py-4 px-4 text-right font-mono text-sm">{stock.marketCap}</td>
                    <td className="py-4 px-4 text-right font-mono">{stock.pe}</td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Screener;
