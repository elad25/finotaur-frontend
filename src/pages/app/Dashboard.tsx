import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Bell,
  BookOpen,
  Target,
  BarChart3,
  Calendar,
  AlertTriangle,
  Newspaper,
  DollarSign,
  Activity,
} from "lucide-react";

const Dashboard = () => {
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Enhanced mock data
  const indices = [
    { symbol: "SPY", name: "S&P 500", price: 458.32, change: 1.24, changePercent: 0.27 },
    { symbol: "QQQ", name: "NASDAQ-100", price: 382.45, change: 2.15, changePercent: 0.57 },
    { symbol: "DIA", name: "Dow Jones", price: 362.18, change: -0.34, changePercent: -0.09 },
  ];

  const economicEvents = [
    { time: "08:30 AM", event: "Initial Jobless Claims", impact: "high", previous: "210K", forecast: "215K" },
    { time: "10:00 AM", event: "Consumer Confidence", impact: "medium", previous: "102.6", forecast: "103.0" },
    { time: "02:00 PM", event: "Fed Speech - Powell", impact: "high", previous: "-", forecast: "-" },
  ];

  const portfolioData = {
    totalValue: 127543.82,
    dailyPnL: 1234.56,
    dailyPnLPercent: 0.98,
    ytdReturn: 18.4,
  };

  const quickEarnings = [
    { ticker: "AAPL", time: "AMC", est: "$1.53", watchlist: true },
    { ticker: "MSFT", time: "AMC", est: "$2.77", watchlist: true },
    { ticker: "NVDA", time: "AMC", est: "$4.12", watchlist: false },
    { ticker: "TSLA", time: "BMO", est: "$0.73", watchlist: true },
  ];

  const alertsDueToday = [
    { ticker: "AAPL", type: "Price Alert", condition: "Above $180", current: "$178.52" },
    { ticker: "MSFT", type: "% Change", condition: "+2%", current: "+1.8%" },
    { ticker: "NVDA", type: "Volume Spike", condition: "2x Avg", current: "1.8x" },
  ];

  const allHeadlines = [
    { title: "Apple Announces Q4 Earnings Beat", source: "Bloomberg", time: "2 hours ago", symbol: "AAPL", sentiment: "positive", inWatchlist: true },
    { title: "Fed Signals Potential Rate Pause", source: "Reuters", time: "4 hours ago", symbol: null, sentiment: "neutral", inWatchlist: false },
    { title: "Tesla Unveils New Model Line", source: "CNBC", time: "5 hours ago", symbol: "TSLA", sentiment: "positive", inWatchlist: true },
    { title: "Microsoft Cloud Revenue Surges", source: "WSJ", time: "6 hours ago", symbol: "MSFT", sentiment: "positive", inWatchlist: true },
    { title: "Meta Faces Regulatory Scrutiny", source: "FT", time: "7 hours ago", symbol: "META", sentiment: "negative", inWatchlist: false },
  ];

  const headlines = watchlistOnly 
    ? allHeadlines.filter(h => h.inWatchlist)
    : allHeadlines;

  const watchlistData = [
    { symbol: "AAPL", price: 178.52, change: 2.34, changePercent: 1.33 },
    { symbol: "MSFT", price: 415.89, change: 7.23, changePercent: 1.77 },
    { symbol: "TSLA", price: 245.67, change: -3.45, changePercent: -1.38 },
    { symbol: "NVDA", price: 875.32, change: 12.45, changePercent: 1.44 },
  ];

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <Badge variant="outline" className="text-success border-success text-xs">Positive</Badge>;
      case "negative":
        return <Badge variant="outline" className="text-destructive border-destructive text-xs">Negative</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground text-xs">Neutral</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, Trader</h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-success border-success">
            ● Market Open
          </Badge>
        </div>
      </div>

      {/* Portfolio Overview */}
      <Card className="border-2 border-primary/20 bg-gradient-best-value">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <BarChart3 size={20} />
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Value</p>
              <p className="text-3xl font-bold">${portfolioData.totalValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Today's P&L</p>
              <p className={`text-3xl font-bold ${portfolioData.dailyPnL >= 0 ? "text-success" : "text-destructive"}`}>
                {portfolioData.dailyPnL >= 0 ? "+" : ""}${portfolioData.dailyPnL.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Today %</p>
              <p className={`text-3xl font-bold ${portfolioData.dailyPnLPercent >= 0 ? "text-success" : "text-destructive"}`}>
                {portfolioData.dailyPnLPercent >= 0 ? "+" : ""}{portfolioData.dailyPnLPercent}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">YTD Return</p>
              <p className="text-3xl font-bold text-success">+{portfolioData.ytdReturn}%</p>
            </div>
          </div>
          <div className="mt-4 h-32 flex items-center justify-center bg-muted/20 rounded-lg">
            <p className="text-sm text-muted-foreground">Mock Equity Curve (MVP)</p>
          </div>
        </CardContent>
      </Card>

      {/* Top Row - Market & Economic Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Market Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Activity size={20} />
              Market Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {indices.map((index) => (
              <div
                key={index.symbol}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth"
              >
                <div>
                  <p className="font-bold text-lg">{index.symbol}</p>
                  <p className="text-sm text-muted-foreground">{index.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl">${index.price}</p>
                  <div className={`flex items-center gap-1 text-sm ${
                    index.change >= 0 ? "text-success" : "text-destructive"
                  }`}>
                    {index.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>
                      {index.change >= 0 ? "+" : ""}
                      {index.change} ({index.changePercent}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Economic Calendar Today */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Calendar size={20} />
              Economic Calendar - Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {economicEvents.map((event, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/20"
              >
                <div className="min-w-[80px]">
                  <p className="font-bold text-sm">{event.time}</p>
                  <Badge 
                    variant="outline" 
                    className={`text-xs mt-1 ${
                      event.impact === "high" 
                        ? "border-destructive text-destructive" 
                        : "border-muted-foreground text-muted-foreground"
                    }`}
                  >
                    {event.impact.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{event.event}</p>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Prev: {event.previous}</span>
                    <span>Forecast: {event.forecast}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - Earnings & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Earnings Watch */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <DollarSign size={20} />
              Earnings This Week (Watchlist)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickEarnings.filter(e => e.watchlist).map((earning) => (
              <div
                key={earning.ticker}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <p className="font-bold text-lg">{earning.ticker}</p>
                  <Badge variant="outline" className="text-xs">
                    {earning.time}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Est. EPS</p>
                  <p className="font-semibold">{earning.est}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alerts Due Today */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Bell size={20} />
              Alerts Due Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertsDueToday.map((alert, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-primary" />
                  <div>
                    <p className="font-bold">{alert.ticker}</p>
                    <p className="text-xs text-muted-foreground">{alert.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{alert.condition}</p>
                  <p className="text-xs text-muted-foreground">Current: {alert.current}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button className="h-24 flex flex-col gap-2 glow-primary">
          <Plus size={24} />
          <span>Add Alert</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2">
          <Target size={24} />
          <span>Add to Watchlist</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2">
          <BookOpen size={24} />
          <span>New Journal Entry</span>
        </Button>
      </div>

      {/* My Watchlist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-primary">My Watchlist</CardTitle>
            <Button size="sm" variant="outline">
              <Plus size={16} className="mr-2" />
              Add Symbol
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {watchlistData.map((stock) => (
              <div
                key={stock.symbol}
                className="p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-xl">{stock.symbol}</p>
                  {stock.change >= 0 ? (
                    <TrendingUp size={18} className="text-success" />
                  ) : (
                    <TrendingDown size={18} className="text-destructive" />
                  )}
                </div>
                <p className="font-bold text-2xl mb-1">${stock.price}</p>
                <p className={`text-sm font-semibold ${
                  stock.change >= 0 ? "text-success" : "text-destructive"
                }`}>
                  {stock.change >= 0 ? "+" : ""}{stock.change} ({stock.changePercent}%)
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Headlines - Personalized */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-primary flex items-center gap-2">
            <Newspaper size={20} />
            Top Headlines
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="watchlist-filter" className="text-sm text-muted-foreground">
              My Watchlist Only
            </Label>
            <Switch
              id="watchlist-filter"
              checked={watchlistOnly}
              onCheckedChange={setWatchlistOnly}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {headlines.map((article, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-1">
                    <h4 className="font-semibold flex-1">{article.title}</h4>
                    {getSentimentBadge(article.sentiment)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{article.source}</span>
                    <span>•</span>
                    <span>{article.time}</span>
                    {article.symbol && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          {article.symbol}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      <Card className="border-2 border-primary/30 bg-gradient-best-value glow-primary">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Unlock Pro Features</h3>
              <p className="text-muted-foreground">
                Real-time data, advanced alerts, AI insights, options flow & more
              </p>
            </div>
            <Button size="lg" className="glow-primary">
              Upgrade to Pro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
