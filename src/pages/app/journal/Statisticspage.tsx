import { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import { getTrades } from "@/routes/journal";
import { formatNumber } from "@/utils/smartCalc";
import {
  calculateStatistics,
  groupBySymbol,
  groupByStrategy,
  groupBySession,
  groupByDayOfWeek,
  groupByHour,
  buildEquityCurve,
  createDistribution,
  calculateRollingMetrics,
  groupByRiskSize,
  groupByHoldingTime,
  groupByDirection,
  type Trade,
  type StatisticsMetrics,
} from "../../../utils/statistics";

// UI Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Charts
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
} from "recharts";

// Icons
import { Info, TrendingUp, TrendingDown } from "lucide-react";

// ============================================
// HELPER FUNCTIONS
// ============================================

function fmtCurrency(v: number): string {
  const s = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  return s + "$" + formatNumber(abs, 2);
}

function fmtPct(v: number): string {
  return (v * 100).toFixed(1) + "%";
}

function getPnLColor(value: number): string {
  if (value > 0) return "text-[#00C46C]";
  if (value < 0) return "text-[#E44545]";
  return "text-[#9AA3AF]";
}

// ============================================
// FILTER BAR COMPONENT
// ============================================

interface FilterBarProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  symbols: string[];
  selectedSymbol: string;
  onSymbolChange: (value: string) => void;
  strategies: string[];
  selectedStrategy: string;
  onStrategyChange: (value: string) => void;
  sessions: string[];
  selectedSession: string;
  onSessionChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

function FilterBar({
  dateRange,
  onDateRangeChange,
  symbols,
  selectedSymbol,
  onSymbolChange,
  strategies,
  selectedStrategy,
  onStrategyChange,
  sessions,
  selectedSession,
  onSessionChange,
  status,
  onStatusChange,
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#27272a] py-4 px-6">
      <div className="flex flex-wrap gap-3">
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-[180px] bg-[#141416] border-[rgba(201,166,70,.12)] hover:border-[#C9A646] transition-all">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7D">Last 7 days</SelectItem>
            <SelectItem value="30D">Last 30 days</SelectItem>
            <SelectItem value="90D">Last 90 days</SelectItem>
            <SelectItem value="ALL">All time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedSymbol} onValueChange={onSymbolChange}>
          <SelectTrigger className="w-[180px] bg-[#141416] border-[rgba(201,166,70,.12)] hover:border-[#C9A646] transition-all">
            <SelectValue placeholder="Symbol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Symbols</SelectItem>
            {symbols.map((symbol) => (
              <SelectItem key={symbol} value={symbol}>
                {symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStrategy} onValueChange={onStrategyChange}>
          <SelectTrigger className="w-[180px] bg-[#141416] border-[rgba(201,166,70,.12)] hover:border-[#C9A646] transition-all">
            <SelectValue placeholder="Strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Strategies</SelectItem>
            {strategies.map((strategy) => (
              <SelectItem key={strategy} value={strategy}>
                {strategy}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSession} onValueChange={onSessionChange}>
          <SelectTrigger className="w-[180px] bg-[#141416] border-[rgba(201,166,70,.12)] hover:border-[#C9A646] transition-all">
            <SelectValue placeholder="Session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sessions</SelectItem>
            {sessions.map((session) => (
              <SelectItem key={session} value={session}>
                {session}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px] bg-[#141416] border-[rgba(201,166,70,.12)] hover:border-[#C9A646] transition-all">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Trades</SelectItem>
            <SelectItem value="CLOSED">Closed Only</SelectItem>
            <SelectItem value="OPEN">Open Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============================================
// KPI CARD COMPONENT
// ============================================

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  color?: string;
  tooltip?: string;
}

function KpiCard({ label, value, hint, color = "text-white", tooltip }: KpiCardProps) {
  const card = (
    <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] hover:border-[#C9A646] transition-all rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-[#9AA3AF] text-xs uppercase tracking-wider mb-2">{label}</div>
            <div className={`text-2xl font-semibold ${color} mt-1`}>{value}</div>
            {hint && <div className="text-[#9AA3AF] text-xs mt-2">{hint}</div>}
          </div>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-[#9AA3AF] hover:text-[#C9A646] transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#141416] border-[#C9A646] text-sm max-w-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return card;
}

// ============================================
// MAIN STATISTICS PAGE
// ============================================

export default function StatisticsPage() {
  // State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [includeOpen, setIncludeOpen] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState("30D");
  const [selectedSymbol, setSelectedSymbol] = useState("ALL");
  const [selectedStrategy, setSelectedStrategy] = useState("ALL");
  const [selectedSession, setSelectedSession] = useState("ALL");
  const [status, setStatus] = useState("CLOSED");

  // Load trades
  useEffect(() => {
    async function loadTrades() {
      setLoading(true);
      const result = await getTrades();
      if (result.ok && result.data) {
        setTrades(result.data);
      }
      setLoading(false);
    }
    loadTrades();
  }, []);

  // Extract filter options
  const symbols = useMemo(() => {
    return Array.from(new Set(trades.map((t) => t.symbol))).sort();
  }, [trades]);

  const strategies = useMemo(() => {
    return Array.from(new Set(trades.map((t) => t.strategy || "No Strategy"))).sort();
  }, [trades]);

  const sessions = useMemo(() => {
    return ["Asia", "London", "NY"];
  }, []);

  // Apply filters
  const filteredTrades = useMemo(() => {
    let filtered = [...trades];

    // Date range
    if (dateRange !== "ALL") {
      const minDate = dayjs().subtract(parseInt(dateRange), "day");
      filtered = filtered.filter((t) => dayjs(t.open_at).isAfter(minDate));
    }

    // Symbol
    if (selectedSymbol !== "ALL") {
      filtered = filtered.filter((t) => t.symbol === selectedSymbol);
    }

    // Strategy
    if (selectedStrategy !== "ALL") {
      filtered = filtered.filter((t) => (t.strategy || "No Strategy") === selectedStrategy);
    }

    // Session
    if (selectedSession !== "ALL") {
      filtered = filtered.filter((t) => t.session === selectedSession);
    }

    // Status
    if (status === "CLOSED") {
      filtered = filtered.filter((t) => t.exit_price);
    } else if (status === "OPEN") {
      filtered = filtered.filter((t) => !t.exit_price);
    }

    return filtered;
  }, [trades, dateRange, selectedSymbol, selectedStrategy, selectedSession, status]);

  // Calculate statistics
  const stats = useMemo(() => calculateStatistics(filteredTrades), [filteredTrades]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-radial from-[#0A0A0A] to-[#111315] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-radial from-[#0A0A0A] to-[#111315]">
      {/* Header */}
      <div className="px-6 py-6">
        <h1 className="text-3xl font-semibold text-white">Statistics</h1>
        <p className="text-[#9AA3AF] text-sm mt-2">Deep dive into your trading performance</p>
      </div>

      {/* Filter Bar */}
      <FilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        symbols={symbols}
        selectedSymbol={selectedSymbol}
        onSymbolChange={setSelectedSymbol}
        strategies={strategies}
        selectedStrategy={selectedStrategy}
        onStrategyChange={setSelectedStrategy}
        sessions={sessions}
        selectedSession={selectedSession}
        onSessionChange={setSelectedSession}
        status={status}
        onStatusChange={setStatus}
      />

      {/* Main Content */}
      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#141416] border border-[rgba(201,166,70,.12)] p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
              Overview
            </TabsTrigger>
            <TabsTrigger value="detailed" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
              Detailed Cuts
            </TabsTrigger>
            <TabsTrigger value="assets" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
              Assets
            </TabsTrigger>
            <TabsTrigger value="strategies" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
              Strategies
            </TabsTrigger>
            <TabsTrigger value="trade-types" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
              Trade Types
            </TabsTrigger>
            <TabsTrigger value="time" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
              Time Analysis
            </TabsTrigger>
            <TabsTrigger value="psychology" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
              Psychology
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab stats={stats} trades={filteredTrades} includeOpen={includeOpen} setIncludeOpen={setIncludeOpen} />
          </TabsContent>

          {/* Detailed Cuts Tab */}
          <TabsContent value="detailed" className="space-y-6">
            <DetailedCutsTab trades={filteredTrades} />
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <AssetsTab trades={filteredTrades} />
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies" className="space-y-6">
            <StrategiesTab trades={filteredTrades} />
          </TabsContent>

          {/* Trade Types Tab */}
          <TabsContent value="trade-types" className="space-y-6">
            <TradeTypesTab trades={filteredTrades} />
          </TabsContent>

          {/* Time Analysis Tab */}
          <TabsContent value="time" className="space-y-6">
            <TimeAnalysisTab trades={filteredTrades} />
          </TabsContent>

          {/* Psychology Tab */}
          <TabsContent value="psychology" className="space-y-6">
            <PsychologyTab trades={filteredTrades} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============================================
// OVERVIEW TAB
// ============================================

function OverviewTab({
  stats,
  trades,
  includeOpen,
  setIncludeOpen,
}: {
  stats: StatisticsMetrics;
  trades: Trade[];
  includeOpen: boolean;
  setIncludeOpen: (value: boolean) => void;
}) {
  const equity = useMemo(() => buildEquityCurve(trades, includeOpen), [trades, includeOpen]);
  const distribution = useMemo(() => createDistribution(trades, 100), [trades]);
  const rollingMetrics = useMemo(() => calculateRollingMetrics(trades, 20), [trades]);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Win Rate"
          value={fmtPct(stats.winRate)}
          hint={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`}
          color="text-[#4BA3FF]"
          tooltip="Win Rate = Wins / (Wins + Losses + Breakeven)"
        />
        <KpiCard
          label="Net P&L"
          value={fmtCurrency(stats.netPnL)}
          hint={`${stats.closedTrades} closed trades`}
          color={getPnLColor(stats.netPnL)}
          tooltip="Net P&L = Sum of all closed trades"
        />
        <KpiCard
          label="Avg R:R"
          value={stats.avgRR > 0 ? stats.avgRR.toFixed(2) : "—"}
          color="text-[#C9A646]"
          tooltip="Avg R:R = Average Risk:Reward ratio based on actual exits"
        />
        <KpiCard
          label="Profit Factor"
          value={stats.profitFactor > 0 && stats.profitFactor !== Infinity ? stats.profitFactor.toFixed(2) : "—"}
          color="text-[#00C46C]"
          tooltip="Profit Factor = Total Wins / Total Losses"
        />
        <KpiCard
          label="Expectancy"
          value={fmtCurrency(stats.expectancy)}
          color={getPnLColor(stats.expectancy)}
          tooltip="Expectancy = (WinRate × AvgWin) - ((1-WinRate) × AvgLoss)"
        />
        <KpiCard
          label="Max Drawdown"
          value={fmtCurrency(stats.maxDrawdown)}
          color="text-[#E44545]"
          tooltip="Max Drawdown = Largest peak-to-trough decline"
        />
      </div>

      {/* Equity Curve */}
      <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Equity Curve</CardTitle>
              <CardDescription className="text-[#9AA3AF]">Cumulative P&L over time</CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#9AA3AF] cursor-pointer">
              <input
                type="checkbox"
                checked={includeOpen}
                onChange={(e) => setIncludeOpen(e.target.checked)}
                className="rounded border-[#C9A646] text-[#C9A646] focus:ring-[#C9A646]"
              />
              Include open trades
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {equity.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={equity}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A646" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#C9A646" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
                <YAxis tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
                <RechartsTooltip
                  contentStyle={{
                    background: "#141416",
                    border: "1px solid #C9A646",
                    borderRadius: 12,
                    padding: 12,
                  }}
                  labelStyle={{ color: "#fff", fontSize: 13, marginBottom: 4 }}
                  itemStyle={{ color: "#C9A646", fontSize: 14, fontWeight: 600 }}
                  formatter={(val: any) => [fmtCurrency(Number(val)), "Equity"]}
                />
                <Area type="monotone" dataKey="equity" stroke="#C9A646" fill="url(#equityGradient)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-[#9AA3AF]">No data to display</div>
          )}
        </CardContent>
      </Card>

      {/* Distribution & Rolling Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution */}
        <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">P&L Distribution</CardTitle>
            <CardDescription className="text-[#9AA3AF]">Histogram of trade outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            {distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distribution}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="range" tick={{ fill: "#9AA3AF", fontSize: 11 }} stroke="#3f3f46" angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
                  <RechartsTooltip
                    contentStyle={{
                      background: "#141416",
                      border: "1px solid #C9A646",
                      borderRadius: 12,
                      padding: 12,
                    }}
                    cursor={{ fill: "rgba(201,166,70,0.1)" }}
                  />
                  <Bar dataKey="count" fill="#C9A646" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-[#9AA3AF]">No data to display</div>
            )}
          </CardContent>
        </Card>

        {/* Rolling Metrics */}
        <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Rolling Metrics</CardTitle>
            <CardDescription className="text-[#9AA3AF]">20-trade moving averages</CardDescription>
          </CardHeader>
          <CardContent>
            {rollingMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={rollingMetrics}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
                  <YAxis yAxisId="left" tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
                  <RechartsTooltip
                    contentStyle={{
                      background: "#141416",
                      border: "1px solid #C9A646",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="winRate" stroke="#4BA3FF" strokeWidth={2} name="Win Rate %" />
                  <Line yAxisId="right" type="monotone" dataKey="avgRR" stroke="#C9A646" strokeWidth={2} name="Avg R:R" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-[#9AA3AF]">Not enough data (need 20+ trades)</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// DETAILED CUTS TAB (placeholder structure)
// ============================================

function DetailedCutsTab({ trades }: { trades: Trade[] }) {
  const sessionData = useMemo(() => groupBySession(trades), [trades]);
  const dayData = useMemo(() => groupByDayOfWeek(trades), [trades]);
  const hourData = useMemo(() => groupByHour(trades), [trades]);
  const riskData = useMemo(() => groupByRiskSize(trades), [trades]);
  const holdingData = useMemo(() => groupByHoldingTime(trades), [trades]);
  const directionData = useMemo(() => groupByDirection(trades), [trades]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Detailed Performance Cuts</h2>

      {/* By Session */}
      <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">By Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a]">
                  <th className="text-left py-3 px-4 text-[#9AA3AF] font-medium">Session</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Trades</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Win Rate</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Avg R:R</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Net P&L</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">PF</th>
                </tr>
              </thead>
              <tbody>
                {sessionData.map((row) => (
                  <tr key={row.session} className="border-b border-[#27272a]/50 hover:bg-[#27272a]/30 transition-colors">
                    <td className="py-3 px-4 text-white">{row.session}</td>
                    <td className="py-3 px-4 text-right text-[#9AA3AF]">{row.trades}</td>
                    <td className="py-3 px-4 text-right text-[#4BA3FF]">{fmtPct(row.winRate)}</td>
                    <td className="py-3 px-4 text-right text-[#C9A646]">{row.avgRR.toFixed(2)}</td>
                    <td className={`py-3 px-4 text-right ${getPnLColor(row.netPnL)}`}>{fmtCurrency(row.netPnL)}</td>
                    <td className="py-3 px-4 text-right text-[#00C46C]">{row.profitFactor.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* By Day of Week */}
      <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">By Day of Week</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayData.map((d) => ({ day: d.day, winRate: d.stats.winRate * 100, pnl: d.stats.netPnL }))}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
              <YAxis yAxisId="left" tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
              <RechartsTooltip
                contentStyle={{
                  background: "#141416",
                  border: "1px solid #C9A646",
                  borderRadius: 12,
                  padding: 12,
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="winRate" fill="#4BA3FF" name="Win Rate %" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="pnl" fill="#C9A646" name="Net P&L" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* By Direction */}
      <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">By Direction (Long vs Short)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {directionData.map((dir) => (
              <div key={dir.direction} className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  {dir.direction === "LONG" ? <TrendingUp className="w-5 h-5 text-[#00C46C]" /> : <TrendingDown className="w-5 h-5 text-[#E44545]" />}
                  {dir.direction}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#27272a]/30 rounded-lg p-3">
                    <div className="text-xs text-[#9AA3AF]">Win Rate</div>
                    <div className="text-lg font-semibold text-[#4BA3FF] mt-1">{fmtPct(dir.stats.winRate)}</div>
                  </div>
                  <div className="bg-[#27272a]/30 rounded-lg p-3">
                    <div className="text-xs text-[#9AA3AF]">Avg R:R</div>
                    <div className="text-lg font-semibold text-[#C9A646] mt-1">{dir.stats.avgRR.toFixed(2)}</div>
                  </div>
                  <div className="bg-[#27272a]/30 rounded-lg p-3">
                    <div className="text-xs text-[#9AA3AF]">Net P&L</div>
                    <div className={`text-lg font-semibold mt-1 ${getPnLColor(dir.stats.netPnL)}`}>{fmtCurrency(dir.stats.netPnL)}</div>
                  </div>
                  <div className="bg-[#27272a]/30 rounded-lg p-3">
                    <div className="text-xs text-[#9AA3AF]">Profit Factor</div>
                    <div className="text-lg font-semibold text-[#00C46C] mt-1">{dir.stats.profitFactor.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// ASSETS TAB
// ============================================

function AssetsTab({ trades }: { trades: Trade[] }) {
  const symbolData = useMemo(() => {
    const data = groupBySymbol(trades);
    return data.sort((a, b) => b.netPnL - a.netPnL);
  }, [trades]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Assets Performance</h2>
        <Badge variant="outline" className="text-[#C9A646] border-[#C9A646]">
          {symbolData.length} Symbols
        </Badge>
      </div>

      <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a]">
                  <th className="text-left py-3 px-4 text-[#9AA3AF] font-medium">Symbol</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Trades</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Win Rate</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Avg R:R</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Net P&L</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">PF</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Expectancy</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Max DD</th>
                </tr>
              </thead>
              <tbody>
                {symbolData.map((row) => (
                  <tr key={row.symbol} className="border-b border-[#27272a]/50 hover:bg-[#27272a]/30 transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{row.symbol}</td>
                    <td className="py-3 px-4 text-right text-[#9AA3AF]">{row.trades}</td>
                    <td className="py-3 px-4 text-right text-[#4BA3FF]">{fmtPct(row.winRate)}</td>
                    <td className="py-3 px-4 text-right text-[#C9A646]">{row.avgRR.toFixed(2)}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${getPnLColor(row.netPnL)}`}>{fmtCurrency(row.netPnL)}</td>
                    <td className="py-3 px-4 text-right text-[#00C46C]">{row.profitFactor > 0 && row.profitFactor !== Infinity ? row.profitFactor.toFixed(2) : "—"}</td>
                    <td className={`py-3 px-4 text-right ${getPnLColor(row.expectancy)}`}>{fmtCurrency(row.expectancy)}</td>
                    <td className="py-3 px-4 text-right text-[#E44545]">{fmtCurrency(row.maxDD)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// STRATEGIES TAB
// ============================================

function StrategiesTab({ trades }: { trades: Trade[] }) {
  const strategyData = useMemo(() => {
    const data = groupByStrategy(trades);
    return data.sort((a, b) => b.expectancy - a.expectancy);
  }, [trades]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Strategy Comparator</h2>
        <Badge variant="outline" className="text-[#C9A646] border-[#C9A646]">
          {strategyData.length} Strategies
        </Badge>
      </div>

      <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a]">
                  <th className="text-left py-3 px-4 text-[#9AA3AF] font-medium">Strategy</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Trades</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Win Rate</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Avg R:R</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">PF</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Expectancy</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Net P&L</th>
                  <th className="text-right py-3 px-4 text-[#9AA3AF] font-medium">Max DD</th>
                </tr>
              </thead>
              <tbody>
                {strategyData.map((row) => (
                  <tr key={row.strategy} className="border-b border-[#27272a]/50 hover:bg-[#27272a]/30 transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{row.strategy}</td>
                    <td className="py-3 px-4 text-right text-[#9AA3AF]">{row.trades}</td>
                    <td className="py-3 px-4 text-right text-[#4BA3FF]">{fmtPct(row.winRate)}</td>
                    <td className="py-3 px-4 text-right text-[#C9A646]">{row.avgRR.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-[#00C46C]">{row.profitFactor > 0 && row.profitFactor !== Infinity ? row.profitFactor.toFixed(2) : "—"}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${getPnLColor(row.expectancy)}`}>{fmtCurrency(row.expectancy)}</td>
                    <td className={`py-3 px-4 text-right ${getPnLColor(row.netPnL)}`}>{fmtCurrency(row.netPnL)}</td>
                    <td className="py-3 px-4 text-right text-[#E44545]">{fmtCurrency(row.maxDD)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// TRADE TYPES TAB (Placeholder)
// ============================================

function TradeTypesTab({ trades }: { trades: Trade[] }) {
  const tradeTypes = useMemo(() => {
    const typeMap = new Map<string, Trade[]>();
    trades.forEach((t) => {
      const type = t.trade_type || "Unknown";
      const existing = typeMap.get(type) || [];
      typeMap.set(type, [...existing, t]);
    });
    return Array.from(typeMap.entries());
  }, [trades]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Trade Types Analysis</h2>
      <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
        <CardContent className="p-6">
          <p className="text-[#9AA3AF]">Trade types breakdown - {tradeTypes.length} unique types found</p>
          {/* Add detailed breakdown here */}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// TIME ANALYSIS TAB (Placeholder)
// ============================================

function TimeAnalysisTab({ trades }: { trades: Trade[] }) {
  const hourData = useMemo(() => groupByHour(trades), [trades]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Time-Based Performance</h2>

      <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Trading by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourData.filter((h) => h.trades > 0)}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
              <YAxis tick={{ fill: "#9AA3AF", fontSize: 12 }} stroke="#3f3f46" />
              <RechartsTooltip
                contentStyle={{
                  background: "#141416",
                  border: "1px solid #C9A646",
                  borderRadius: 12,
                  padding: 12,
                }}
              />
              <Bar dataKey="trades" fill="#C9A646" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// PSYCHOLOGY TAB (Placeholder)
// ============================================

function PsychologyTab({ trades }: { trades: Trade[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Trading Psychology</h2>
      <Card className="bg-[#141416] border-[rgba(201,166,70,.12)] rounded-2xl">
        <CardContent className="p-6">
          <p className="text-[#9AA3AF]">Psychology metrics - Placeholder for future features (streaks, recovery, errors log)</p>
        </CardContent>
      </Card>
    </div>
  );
}