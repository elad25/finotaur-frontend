import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BookOpen, TrendingUp, TrendingDown, DollarSign, Target, Calendar as CalendarIcon, Table as TableIcon, BarChart3, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { StrategyDialog } from "@/components/journal/StrategyDialog";
import { DayDetailsModal } from "@/components/journal/DayDetailsModal";
import { TradeFormDialog } from "@/components/journal/TradeFormDialog";

const Journal = () => {
  const [viewMode, setViewMode] = useState<"calendar" | "table" | "analytics">("calendar");
  const [analyticsTab, setAnalyticsTab] = useState<"overview" | "strategies">("overview");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [strategyDialogOpen, setStrategyDialogOpen] = useState(false);
  const [tradeFormOpen, setTradeFormOpen] = useState(false);
  const [strategies, setStrategies] = useState([
    { id: "1", name: "Breakout Pullback", description: "Entry on pullback after breakout", checklist: [] },
    { id: "2", name: "Reversal", description: "Counter-trend entries", checklist: [] },
  ]);

  const [trades, setTrades] = useState([
    {
      id: 1,
      date: "2025-01-15",
      time: "09:45 AM",
      ticker: "AAPL",
      type: "Long" as const,
      entry: 175.50,
      exit: 178.25,
      shares: 100,
      pnl: 275,
      pnlPercent: 1.57,
      rMultiple: 1.5,
      strategy: "Breakout Pullback",
      tags: ["Swing", "Tech"],
      notes: "Strong earnings momentum, rode the wave up",
    },
    {
      id: 2,
      date: "2025-01-14",
      time: "10:30 AM",
      ticker: "TSLA",
      type: "Short" as const,
      entry: 248.50,
      exit: 245.80,
      shares: 50,
      pnl: 135,
      pnlPercent: 1.09,
      rMultiple: 1.2,
      strategy: "Reversal",
      tags: ["Day Trade", "EV"],
      notes: "Overextended, took profit at support",
    },
    {
      id: 3,
      date: "2025-01-13",
      time: "14:15 PM",
      ticker: "NVDA",
      type: "Long" as const,
      entry: 890.00,
      exit: 875.50,
      shares: 20,
      pnl: -290,
      pnlPercent: -1.63,
      rMultiple: -1.0,
      tags: ["Swing", "Tech"],
      notes: "Got stopped out, market weakness",
    },
  ]);

  const stats = {
    totalTrades: 45,
    winRate: 64.4,
    avgWin: 425,
    avgLoss: -215,
    totalPnL: 4850,
    bestTrade: 1250,
    worstTrade: -480,
    rRatio: 1.98,
    monthlyPnL: 4850,
    weeklyPnL: 1240,
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  const handleMonthChange = (monthIndex: string) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), parseInt(monthIndex)));
  };

  const handleDayClick = (date: string) => {
    setSelectedDay(date);
  };

  const handleAddStrategy = (strategy: any) => {
    setStrategies([...strategies, { ...strategy, id: Date.now().toString() }]);
  };

  const handleAddTrade = (trade: any) => {
    setTrades([...trades, { ...trade, id: Date.now() }]);
  };

  // Calculate calendar data
  const firstDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTrades = trades.filter(t => t.date === dateStr);
    const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    return {
      day,
      date: dateStr,
      trades: dayTrades.length,
      pnl: dayPnL,
    };
  });

  // Calculate weekly summaries
  const weeks: any[][] = [];
  let currentWeek: any[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    currentWeek.push(null);
  }
  
  calendarDays.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  // Add remaining days to last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const weekSummaries = weeks.map(week => {
    const validDays = week.filter(d => d !== null);
    const totalTrades = validDays.reduce((sum, d) => sum + d.trades, 0);
    const totalPnL = validDays.reduce((sum, d) => sum + d.pnl, 0);
    const winningDays = validDays.filter(d => d.pnl > 0).length;
    const winRate = validDays.length > 0 ? (winningDays / validDays.length) * 100 : 0;
    
    return {
      trades: totalTrades,
      pnl: totalPnL,
      winRate,
      avgRR: 1.5, // Mock
    };
  });

  const selectedDayTrades = selectedDay 
    ? trades.filter(t => t.date === selectedDay)
    : [];

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Trading Journal</h1>
          <p className="text-muted-foreground">
            Professional trade tracking and analytics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setStrategyDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" /> Manage Strategies
          </Button>
          <Button className="glow-primary" onClick={() => setTradeFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Trade
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon size={16} /> Calendar
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2">
            <TableIcon size={16} /> Table
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 size={16} /> Analytics
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total P&L</p>
              <DollarSign className="h-4 w-4 text-primary group-hover:text-primary/80" />
            </div>
            <p className={`text-2xl font-bold ${stats.monthlyPnL >= 0 ? "text-success" : "text-destructive"}`}>
              ${stats.monthlyPnL >= 0 ? "+" : ""}{stats.monthlyPnL.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <Target className="h-4 w-4 text-primary group-hover:text-primary/80" />
            </div>
            <p className="text-2xl font-bold">{stats.winRate}%</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">R:R Ratio</p>
              <BarChart3 className="h-4 w-4 text-primary group-hover:text-primary/80" />
            </div>
            <p className="text-2xl font-bold">{stats.rRatio.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Win</p>
              <TrendingUp className="h-4 w-4 text-success group-hover:text-success/80" />
            </div>
            <p className="text-2xl font-bold text-success">${stats.avgWin}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Loss</p>
              <TrendingDown className="h-4 w-4 text-destructive group-hover:text-destructive/80" />
            </div>
            <p className="text-2xl font-bold text-destructive">${stats.avgLoss}</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select 
                  value={selectedMonth.getMonth().toString()} 
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month} {selectedMonth.getFullYear()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm">
                Today
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex gap-4">
              {/* Calendar Grid */}
              <div className="flex-1">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-2 mb-2">
                    {week.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        onClick={() => day && handleDayClick(day.date)}
                        className={`aspect-square border rounded-lg p-2 transition-all ${
                          day
                            ? `cursor-pointer ${
                                day.trades > 0
                                  ? day.pnl >= 0
                                    ? "border-success/50 bg-success/10 hover:bg-success/20"
                                    : "border-destructive/50 bg-destructive/10 hover:bg-destructive/20"
                                  : "border-border hover:border-primary/50"
                              }`
                            : "border-transparent"
                        }`}
                      >
                        {day && (
                          <>
                            <div className="font-bold text-lg">{day.day}</div>
                            {day.trades > 0 && (
                              <>
                                <div className="text-xs text-muted-foreground">{day.trades} trades</div>
                                <div
                                  className={`text-sm font-bold ${
                                    day.pnl >= 0 ? "text-success" : "text-destructive"
                                  }`}
                                >
                                  {day.pnl >= 0 ? "+" : ""}${day.pnl.toFixed(0)}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Weekly Summary Column */}
              <div className="w-48 space-y-2">
                <div className="text-center font-semibold text-sm text-muted-foreground p-2 mb-4">
                  Week
                </div>
                {weekSummaries.map((summary, index) => (
                  <Card 
                    key={index} 
                    className="p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4"
                    style={{
                      borderLeftColor: summary.pnl >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'
                    }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Trades</span>
                        <span className="font-bold">{summary.trades}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">P&L</span>
                        <span className={`font-bold ${summary.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                          ${summary.pnl >= 0 ? "+" : ""}{summary.pnl.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Win%</span>
                        <span className="font-bold">{summary.winRate.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">R:R</span>
                        <span className="font-bold">{summary.avgRR.toFixed(1)}R</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table View */}
      {viewMode === "table" && (
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 text-sm font-semibold">Date</th>
                    <th className="text-left py-3 text-sm font-semibold">Symbol</th>
                    <th className="text-left py-3 text-sm font-semibold">Type</th>
                    <th className="text-right py-3 text-sm font-semibold">Entry</th>
                    <th className="text-right py-3 text-sm font-semibold">Exit</th>
                    <th className="text-right py-3 text-sm font-semibold">Size</th>
                    <th className="text-right py-3 text-sm font-semibold">P&L</th>
                    <th className="text-right py-3 text-sm font-semibold">%</th>
                    <th className="text-left py-3 text-sm font-semibold">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                      <td className="py-4 text-sm text-muted-foreground">{trade.date}</td>
                      <td className="py-4">
                        <span className="font-bold text-primary">{trade.ticker}</span>
                      </td>
                      <td className="py-4">
                        <Badge variant={trade.type === "Long" ? "default" : "secondary"}>
                          {trade.type}
                        </Badge>
                      </td>
                      <td className="py-4 text-right font-mono text-sm">${trade.entry.toFixed(2)}</td>
                      <td className="py-4 text-right font-mono text-sm">${trade.exit.toFixed(2)}</td>
                      <td className="py-4 text-right font-mono text-sm">{trade.shares}</td>
                      <td className={`py-4 text-right font-mono font-bold ${trade.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                        ${trade.pnl >= 0 ? "+" : ""}{trade.pnl}
                      </td>
                      <td className="py-4 text-right">
                        <Badge variant={trade.pnlPercent >= 0 ? "default" : "destructive"} className="font-mono">
                          {trade.pnlPercent >= 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {Math.abs(trade.pnlPercent).toFixed(2)}%
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-1">
                          {trade.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Analytics View */}
        {viewMode === "analytics" && (
        <div className="space-y-6">
          {/* Analytics Sub-Tabs */}
          <Tabs value={analyticsTab} onValueChange={(v) => setAnalyticsTab(v as any)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="strategies">Strategies</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">Performance Breakdown</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <span className="text-muted-foreground">Average Win</span>
                      <span className="font-bold text-success">${stats.avgWin}</span>
                    </div>
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <span className="text-muted-foreground">Average Loss</span>
                      <span className="font-bold text-destructive">${stats.avgLoss}</span>
                    </div>
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <span className="text-muted-foreground">Best Trade</span>
                      <span className="font-bold text-success">${stats.bestTrade}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Worst Trade</span>
                      <span className="font-bold text-destructive">${stats.worstTrade}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">Monthly P&L</h3>
                  <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">Chart coming soon</p>
                  </div>
                </Card>

                <Card className="p-6 md:col-span-2">
                  <h3 className="text-xl font-bold mb-4">Equity Curve</h3>
                  <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">Equity curve visualization coming soon</p>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">Trade Distribution</h3>
                  <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">Histogram coming soon</p>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">Win Rate by Day</h3>
                  <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">Chart coming soon</p>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="strategies" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold">Strategy Performance</h3>
                    <p className="text-sm text-muted-foreground">Analyze performance by strategy</p>
                  </div>
                  <Button onClick={() => setStrategyDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Strategy
                  </Button>
                </div>

                {strategies.length > 0 ? (
                  <div className="grid gap-4">
                    {strategies.map((strategy) => {
                      const strategyTrades = trades.filter(t => t.strategy === strategy.name);
                      const strategyPnL = strategyTrades.reduce((sum, t) => sum + t.pnl, 0);
                      const winningTrades = strategyTrades.filter(t => t.pnl > 0).length;
                      const winRate = strategyTrades.length > 0 
                        ? (winningTrades / strategyTrades.length) * 100 
                        : 0;
                      
                      return (
                        <Card key={strategy.id} className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-bold">{strategy.name}</h4>
                              <p className="text-sm text-muted-foreground">{strategy.description}</p>
                            </div>
                            <Badge variant={strategyPnL >= 0 ? "default" : "destructive"}>
                              {strategyPnL >= 0 ? "+" : ""}${strategyPnL.toFixed(0)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Trades</p>
                              <p className="text-lg font-bold">{strategyTrades.length}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Win Rate</p>
                              <p className="text-lg font-bold">{winRate.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Avg R</p>
                              <p className="text-lg font-bold">1.5R</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Profit Factor</p>
                              <p className="text-lg font-bold">1.98</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <div className="max-w-md mx-auto">
                      <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-2xl font-bold mb-2">No strategies yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Create your first trading strategy to track performance
                      </p>
                      <Button onClick={() => setStrategyDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create Strategy
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Modals */}
      <StrategyDialog
        open={strategyDialogOpen}
        onOpenChange={setStrategyDialogOpen}
        onSave={handleAddStrategy}
      />

      <DayDetailsModal
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        date={selectedDay || ""}
        trades={selectedDayTrades}
        onAddTrade={() => {
          setSelectedDay(null);
          setTradeFormOpen(true);
        }}
      />

      <TradeFormDialog
        open={tradeFormOpen}
        onOpenChange={setTradeFormOpen}
        onSave={handleAddTrade}
        strategies={strategies}
      />
    </div>
  );
};

export default Journal;
