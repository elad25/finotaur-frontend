// src/pages/app/all-markets/Overview.tsx
import { api } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle,
  BarChart3,
  Zap,
  Target,
  Calendar,
  Volume2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Gauge,
  Shield,
  Flame,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Types
type Mover = { 
  symbol: string; 
  price: number | null; 
  chp: number | null; 
  name?: string;
  volume?: number;
};

type MoversResp = { 
  gainers: Mover[]; 
  losers: Mover[]; 
  mostActive?: Mover[];
  source: string; 
  ts: number;
};

type MarketRegime = 'risk-on' | 'risk-off' | 'transitional' | 'distribution';

type EarningsStock = {
  symbol: string;
  name: string;
  time: 'pre' | 'post' | 'during';
  estimate?: number;
};

// Mock data for demonstration - replace with real API calls
const mockEarnings: EarningsStock[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corp', time: 'post', estimate: 0.74 },
  { symbol: 'CRM', name: 'Salesforce', time: 'post', estimate: 2.44 },
  { symbol: 'DELL', name: 'Dell Technologies', time: 'post', estimate: 1.72 },
  { symbol: 'MRVL', name: 'Marvell Tech', time: 'post', estimate: 0.41 },
];

// Regime determination helper (replace with real logic/API)
function determineRegime(): { regime: MarketRegime; confidence: number } {
  // This would come from your backend analysis
  return { regime: 'risk-on', confidence: 72 };
}

// Format large numbers
function formatVolume(vol: number | undefined): string {
  if (!vol) return '-';
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
  return vol.toString();
}

// Regime badge styles
const regimeStyles: Record<MarketRegime, { bg: string; text: string; icon: typeof TrendingUp }> = {
  'risk-on': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: TrendingUp },
  'risk-off': { bg: 'bg-red-500/20', text: 'text-red-400', icon: Shield },
  'transitional': { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: Activity },
  'distribution': { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: BarChart3 },
};

export default function AllMarketsOverview() {
  const [data, setData] = useState<MoversResp | null>(null);
  const [loading, setLoading] = useState(true);
  const { regime, confidence } = determineRegime();

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const res = await fetch(api(`/api/top-movers?limit=5`));
        if (!res.ok) {
          if (ok) setData({ gainers: [], losers: [], source: 'http-error', ts: Date.now() });
          return;
        }
        const j = await res.json().catch(() => null);
        if (!j || typeof j !== 'object') {
          if (ok) setData({ gainers: [], losers: [], source: 'parse-error', ts: Date.now() });
          return;
        }
        if (ok) setData(j as MoversResp);
      } catch {
        if (ok) setData({ gainers: [], losers: [], source: 'network-error', ts: Date.now() });
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false };
  }, []);

  const RegimeIcon = regimeStyles[regime].icon;

  return (
    <div className="space-y-6 pb-8">
      {/* ═══════════════════════════════════════════════════════════════════
          1️⃣ MARKET REGIME SNAPSHOT - The anchor of the page
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-base-900 via-base-800 to-base-900 p-6">
        {/* Background glow effect */}
        <div className={cn(
          "absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-20",
          regime === 'risk-on' && "bg-emerald-500",
          regime === 'risk-off' && "bg-red-500",
          regime === 'transitional' && "bg-amber-500",
          regime === 'distribution' && "bg-purple-500"
        )} />
        
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Main Regime Display */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl",
              regimeStyles[regime].bg
            )}>
              <RegimeIcon className={cn("h-7 w-7", regimeStyles[regime].text)} />
            </div>
            <div>
              <p className="text-sm font-medium text-base-400">Market State</p>
              <div className="flex items-center gap-3">
                <h2 className={cn(
                  "text-2xl font-bold capitalize tracking-tight",
                  regimeStyles[regime].text
                )}>
                  {regime.replace('-', ' ')}
                </h2>
                <Badge variant="outline" className="border-white/20 text-base-300">
                  {confidence}% confidence
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Indicators */}
          <div className="flex flex-wrap gap-4 lg:gap-6">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2">
              <Activity className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-base-300">Volatility</span>
              <span className="font-semibold text-amber-400">↑ Elevated</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2">
              <Gauge className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-base-300">Liquidity</span>
              <span className="font-semibold text-emerald-400">Normal</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-base-300">Breadth</span>
              <span className="font-semibold text-blue-400">Healthy</span>
            </div>
          </div>
        </div>

        {/* Navigation hints */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <Link to="/app/all-markets/sentiment" className="group flex items-center gap-1 text-sm text-base-400 hover:text-white transition-colors">
            Deep dive into Sentiment <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <span className="text-base-600">•</span>
          <Link to="/app/all-markets/heatmap" className="group flex items-center gap-1 text-sm text-base-400 hover:text-white transition-colors">
            See Sector Heatmap <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <span className="text-base-600">•</span>
          <Link to="/app/all-markets/macro" className="group flex items-center gap-1 text-sm text-base-400 hover:text-white transition-colors">
            Macro Analysis <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          2️⃣ WHAT'S DRIVING THE MARKET + 3️⃣ WHO'S WINNING
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Market Drivers */}
        <Card className="rounded-2xl border-white/10 bg-base-800/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-amber-400" />
              What's Driving the Market
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-white/5 p-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                <Target className="h-4 w-4 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-base-200">Macro Driver</p>
                <p className="text-sm text-base-400">Rate expectations shifting dovish after Fed minutes</p>
                <Link to="/app/all-markets/macro" className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  See Macro <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            
            <div className="flex items-start gap-3 rounded-lg bg-white/5 p-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-base-200">Positioning Driver</p>
                <p className="text-sm text-base-400">Short covering in tech, institutions adding exposure</p>
                <Link to="/app/all-markets/sentiment" className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                  See Sentiment <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            
            <div className="flex items-start gap-3 rounded-lg bg-white/5 p-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-base-200">Event Risk</p>
                <p className="text-sm text-base-400">Earnings cluster: NVDA, CRM lead mega-cap reports</p>
                <Link to="/app/all-markets/news" className="mt-1 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
                  See News <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Who's Winning */}
        <Card className="rounded-2xl border-white/10 bg-base-800/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-5 w-5 text-orange-400" />
              Who's Winning the Regime
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Leading</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">Technology</Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">Semiconductors</Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">AI Infrastructure</Badge>
              </div>
            </div>
            
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-sm font-medium text-amber-400">Neutral</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30">Healthcare</Badge>
                <Badge className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30">Consumer Staples</Badge>
                <Badge className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30">Industrials</Badge>
              </div>
            </div>
            
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-sm font-medium text-red-400">Lagging</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-red-500/20 text-red-300 hover:bg-red-500/30">Utilities</Badge>
                <Badge className="bg-red-500/20 text-red-300 hover:bg-red-500/30">Real Estate</Badge>
                <Badge className="bg-red-500/20 text-red-300 hover:bg-red-500/30">Small Caps</Badge>
              </div>
            </div>

            <Link to="/app/all-markets/heatmap" className="mt-2 flex items-center gap-1 text-sm text-base-400 hover:text-white transition-colors">
              Full sector breakdown <ChevronRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          4️⃣ RISK RADAR
      ═══════════════════════════════════════════════════════════════════ */}
      <Card className="rounded-2xl border-white/10 bg-base-800/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-red-400" />
            Risk Radar
            <span className="ml-auto text-xs font-normal text-base-400">
              Signals that could shift the regime
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <Activity className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-300">VIX Creeping Up</p>
                <p className="text-xs text-base-400">+2.3 pts from yesterday</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-base-700 bg-white/5 p-3">
              <BarChart3 className="h-5 w-5 text-base-400" />
              <div>
                <p className="text-sm font-medium text-base-300">Breadth Normal</p>
                <p className="text-xs text-base-400">A/D ratio healthy</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-base-700 bg-white/5 p-3">
              <TrendingUp className="h-5 w-5 text-base-400" />
              <div>
                <p className="text-sm font-medium text-base-300">Yields Stable</p>
                <p className="text-xs text-base-400">10Y at 4.25%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          5️⃣ MARKET MOVERS - Top Gainers, Losers, Most Active
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Gainers */}
        <Card className="rounded-2xl border-white/10 bg-base-800/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              Top Gainers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs text-base-400">Symbol</TableHead>
                  <TableHead className="text-right text-xs text-base-400">Price</TableHead>
                  <TableHead className="text-right text-xs text-base-400">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell colSpan={3}>
                        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  (data?.gainers || []).slice(0, 5).map((m, i) => (
                    <TableRow key={m.symbol + String(i)} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-medium">{m.symbol}</TableCell>
                      <TableCell className="text-right text-base-300">
                        {m.price != null ? `$${m.price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-400">
                        {m.chp != null ? `+${m.chp.toFixed(2)}%` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="border-t border-white/10 p-3">
              <Link to="/app/all-markets/movers" className="flex items-center justify-center gap-1 text-sm text-base-400 hover:text-white transition-colors">
                See all movers <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Top Losers */}
        <Card className="rounded-2xl border-white/10 bg-base-800/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownRight className="h-4 w-4 text-red-400" />
              Top Losers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs text-base-400">Symbol</TableHead>
                  <TableHead className="text-right text-xs text-base-400">Price</TableHead>
                  <TableHead className="text-right text-xs text-base-400">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell colSpan={3}>
                        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  (data?.losers || []).slice(0, 5).map((m, i) => (
                    <TableRow key={m.symbol + String(i)} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-medium">{m.symbol}</TableCell>
                      <TableCell className="text-right text-base-300">
                        {m.price != null ? `$${m.price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-400">
                        {m.chp != null ? `${m.chp.toFixed(2)}%` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="border-t border-white/10 p-3">
              <Link to="/app/all-markets/movers" className="flex items-center justify-center gap-1 text-sm text-base-400 hover:text-white transition-colors">
                See all movers <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Most Active */}
        <Card className="rounded-2xl border-white/10 bg-base-800/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Volume2 className="h-4 w-4 text-blue-400" />
              Most Active
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs text-base-400">Symbol</TableHead>
                  <TableHead className="text-right text-xs text-base-400">Volume</TableHead>
                  <TableHead className="text-right text-xs text-base-400">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell colSpan={3}>
                        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  (data?.mostActive || data?.gainers || []).slice(0, 5).map((m, i) => (
                    <TableRow key={m.symbol + String(i)} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-medium">{m.symbol}</TableCell>
                      <TableCell className="text-right text-base-300">
                        {formatVolume(m.volume)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        (m.chp || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {m.chp != null ? `${m.chp >= 0 ? '+' : ''}${m.chp.toFixed(2)}%` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="border-t border-white/10 p-3">
              <Link to="/app/all-markets/movers" className="flex items-center justify-center gap-1 text-sm text-base-400 hover:text-white transition-colors">
                See all active <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          6️⃣ UPCOMING EARNINGS
      ═══════════════════════════════════════════════════════════════════ */}
      <Card className="rounded-2xl border-white/10 bg-base-800/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-purple-400" />
            Earnings Today
            <Badge variant="outline" className="ml-auto border-white/20 text-xs text-base-400">
              {mockEarnings.length} Reports
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {mockEarnings.map((stock) => (
              <div 
                key={stock.symbol}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div>
                  <p className="font-semibold">{stock.symbol}</p>
                  <p className="text-xs text-base-400 truncate max-w-[120px]">{stock.name}</p>
                </div>
                <div className="text-right">
                  <Badge 
                    className={cn(
                      "text-xs",
                      stock.time === 'pre' && "bg-amber-500/20 text-amber-300",
                      stock.time === 'post' && "bg-blue-500/20 text-blue-300",
                      stock.time === 'during' && "bg-emerald-500/20 text-emerald-300"
                    )}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {stock.time === 'pre' ? 'Pre' : stock.time === 'post' ? 'Post' : 'During'}
                  </Badge>
                  {stock.estimate && (
                    <p className="mt-1 text-xs text-base-400">Est: ${stock.estimate}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-white/10 pt-3">
            <Link to="/app/all-markets/earnings" className="flex items-center justify-center gap-1 text-sm text-base-400 hover:text-white transition-colors">
              Full earnings calendar <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          7️⃣ TRADER VS INVESTOR FOCUS
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-emerald-400" />
              For Traders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-base-300">Intraday volatility elevated - opportunity in momentum plays</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-base-300">Tech futures leading overnight - watch for continuation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-base-300">Best playground: Semiconductors, AI infrastructure names</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-blue-400" />
              For Investors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span className="text-base-300">Quality growth continuing to outperform value</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span className="text-base-300">International diversification gaining appeal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span className="text-base-300">Valuation compression in small caps - watch for entry</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}