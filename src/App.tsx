// src/App.tsx - COMPLETE WITH AFFILIATE CENTER & LOCKED BACKTEST
// 🔥 v7.0 FIX: BacktestRoute & AffiliateRoute moved to separate files to fix useAuth context error
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppQueryProvider } from "@/providers/QueryProvider";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { RiskSettingsRealtimeProvider } from "@/providers/RiskSettingsRealtimeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DomainGuard } from "@/components/DomainGuard";
import { ProtectedAppLayout } from "@/layouts/ProtectedAppLayout";
import { ProtectedAdminRoute } from "@/components/ProtectedAdminRoute";
import { lazy, Suspense, memo } from "react";
import { JournalRoute } from "@/components/routes/JournalRoute";


// 🔥 ROUTE PROTECTION COMPONENTS - Imported from separate files to use AuthProvider correctly
import { BacktestRoute } from "@/components/routes/BacktestRoute";
import { AffiliateRoute } from "@/components/routes/AffiliateRoute";

import '@/scripts/migrationRunner';

import SupportWidget from "@/components/SupportWidget";
import { AffiliateTracker } from "@/features/affiliate/components/AffiliateTracker";

// PUBLIC PAGES
import LandingPage from "@/pages/landing/LandingPage";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import NotFound from "./pages/NotFound";
import PricingSelection from "@/pages/app/journal/PricingSelection";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import AffiliatePage from "@/pages/AffiliatePage";
import { TermsOfUse, PrivacyPolicy, Disclaimer, Copyright, CookiePolicy, RiskDisclosure, RefundPolicy, DMCA } from "@/components/legal";

// LAZY LOADED PAGES
const AdminDashboard = lazy(() => import("@/pages/app/journal/admin/Dashboard"));
const AdminUsers = lazy(() => import("@/pages/app/journal/admin/Users"));
const AdminAnalytics = lazy(() => import("@/pages/app/journal/admin/Analytics"));
const AdminSubscribers = lazy(() => import("@/pages/app/journal/admin/Subscribers"));
const AdminTopTraders = lazy(() => import("@/pages/app/journal/admin/TopTraders"));
const AdminAffiliate = lazy(() => import("@/pages/app/journal/admin/Affiliate"));
const Cancellations = lazy(() => import("@/pages/app/journal/admin/Cancellations"));
const UserDetails = lazy(() => import("@/pages/app/journal/admin/UserDetails"));
const AdminNewsletterSub = lazy(() => import("@/pages/app/journal/admin/NewsletterSub"));
const SettingsLayout = lazy(() => import("@/layouts/SettingsLayout"));
const Pricing = lazy(() => import("@/pages/app/journal/Pricing"));
const PropFirmsPage = lazy(() => import('@/pages/app/journal/PropFirmsPage'));
const PaymentSuccessPage = lazy(() => import("@/pages/app/journal/PaymentSuccessPage"));
const PaymentFailurePage = lazy(() => import("@/pages/app/journal/PaymentFailurePage"));
const HeatmapPage = lazy(() => import("@/pages/HeatmapPage"));

// Journal Pages
const JournalOverview = lazy(() => import("@/pages/app/journal/Overview"));
const New = lazy(() => import("@/pages/app/journal/New"));
const JournalMyTrades = lazy(() => import("@/pages/app/journal/MyTrades"));
const JournalTradeDetail = lazy(() => import("@/pages/app/journal/TradeDetail"));
const JournalImport = lazy(() => import("@/pages/app/journal/Import"));
const JournalExport = lazy(() => import("@/pages/app/journal/Export"));
const JournalNotes = lazy(() => import("@/pages/app/journal/Notes"));
const JournalAnalytics = lazy(() => import("@/pages/app/journal/Analytics"));
const JournalAIReview = lazy(() => import("@/pages/app/journal/AIReview"));
const JournalCalendar = lazy(() => import("@/pages/app/journal/Calendar"));
const JournalPerformance = lazy(() => import("@/pages/app/journal/Performance"));
const Strategies = lazy(() => import("@/pages/app/journal/Strategies").then(m => ({ default: m.default })));
const StrategyDetailView = lazy(() => import("@/pages/app/journal/Strategies").then(m => ({ default: m.StrategyDetailView })));
const JournalScenarios = lazy(() => import("@/pages/app/journal/Scenarios"));
const JournalCommunity = lazy(() => import("@/pages/app/journal/Community"));
const JournalAcademy = lazy(() => import("@/pages/app/journal/Academy"));
const JournalSettings = lazy(async () => {
  const module = await import("@/pages/app/journal/JournalSettings");
  const Component = (module as any).default ?? (module as any).JournalSettings ?? Object.values(module)[0];
  return { default: Component };
});

// Backtest Pages
const BacktestLanding = lazy(() => import("@/pages/app/journal/backtest/BacktestLanding"));
const BacktestOverview = lazy(() => import("@/pages/app/journal/backtest/Overview"));
const BacktestChart = lazy(() => import("@/pages/app/journal/backtest/Chart"));
const BacktestResults = lazy(() => import("@/pages/app/journal/backtest/Results"));
const BacktestBuilder = lazy(() => import("@/pages/app/journal/backtest/Builder"));
const BacktestData = lazy(() => import("@/pages/app/journal/backtest/Data"));
const BacktestAnalytics = lazy(() => import("@/pages/app/journal/backtest/Analytics"));
const BacktestAIInsights = lazy(() => import("@/pages/app/journal/backtest/Aiinsights"));
const BacktestMonteCarlo = lazy(() => import("@/pages/app/journal/backtest/Montecarlo"));
const BacktestWalkForward = lazy(() => import("@/pages/app/journal/backtest/Walkforward"));
const BacktestOptimization = lazy(() => import("@/pages/app/journal/backtest/Optimization"));
const BacktestReplay = lazy(() => import("@/pages/app/journal/backtest/Replay"));

// Affiliate Center Pages
const AffiliateOverview = lazy(() => import("@/features/affiliate/pages/Affiliateoverview"));
const AffiliateReferrals = lazy(() => import("@/features/affiliate/pages/Affiliatereferrals"));
const AffiliateEarnings = lazy(() => import("@/features/affiliate/pages/Affiliateearnings"));
const AffiliatePayouts = lazy(() => import("@/features/affiliate/pages/Affiliatepayouts"));
const AffiliateMarketing = lazy(() => import("@/features/affiliate/pages/Affiliatemarketing"));
const AffiliateSettings = lazy(() => import("@/features/affiliate/pages/Affiliatesettings"));
const AffiliateAnalytics = lazy(() => import("@/features/affiliate/pages/Affiliateanalytics"));

// All Markets
const AllMarketsOverview = lazy(() => import("@/pages/app/all-markets/Overview"));
const AllMarketsPricing = lazy(() => import("@/pages/app/all-markets/Pricing"));
const AllMarketsChart = lazy(() => import("@/pages/app/all-markets/Chart"));
const AllMarketsSummary = lazy(() => import("@/pages/app/all-markets/Summary"));
const AllMarketsMovers = lazy(() => import("@/pages/app/all-markets/Movers"));
const AllMarketsSentiment = lazy(() => import("@/pages/app/all-markets/Sentiment"));
const AllMarketsCalendar = lazy(() => import("@/pages/app/all-markets/Calendar"));
const AllMarketsNews = lazy(() => import("@/pages/app/all-markets/News"));
const AllMarketsHeatmap = lazy(() => import("@/pages/app/all-markets/Heatmap"));
const WarZonePage = lazy(() => import("@/pages/app/all-markets/Warzonepage"));
const AdminSupportTickets = lazy(() => import("@/pages/app/all-markets/admin/Supporttickets"));
const AdminSiteDashboard = lazy(() => import("@/pages/app/all-markets/admin/SiteDashboard"));
const TopSecretAdmin = lazy(() => import("@/pages/app/all-markets/TopSecretAdmin"));
const TopSecretPage = lazy(() => import("@/pages/app/TopSecret/TopSecretPage"));

// Stocks
const StocksOverview = lazy(() => import("@/pages/app/stocks/Overview"));
const StocksScreener = lazy(() => import("@/pages/app/stocks/Screener"));
const StocksEarnings = lazy(() => import("@/pages/app/stocks/Earnings"));
const StocksFundamentals = lazy(() => import("@/pages/app/stocks/Fundamentals"));
const StocksMovers = lazy(() => import("@/pages/app/stocks/Movers"));
const StocksNews = lazy(() => import("@/pages/app/stocks/News"));
const StocksSectors = lazy(() => import("@/pages/app/stocks/Sectors"));
const StocksCatalysts = lazy(() => import("@/pages/app/stocks/Catalysts"));
const StocksUpgrades = lazy(() => import("@/pages/app/stocks/Upgrades"));
const StocksValuation = lazy(() => import("@/pages/app/stocks/Valuation"));
const StocksReports = lazy(() => import("@/pages/app/stocks/Reports"));
const StocksWatchlists = lazy(() => import("@/pages/app/stocks/Watchlists"));

// Crypto
const CryptoOverview = lazy(() => import("@/pages/app/crypto/Overview"));
const CryptoTopCoins = lazy(() => import("@/pages/app/crypto/TopCoins"));
const CryptoOnChain = lazy(() => import("@/pages/app/crypto/OnChain"));
const CryptoHeatmap = lazy(() => import("@/pages/app/crypto/Heatmap"));
const CryptoNews = lazy(() => import("@/pages/app/crypto/News"));
const CryptoCatalysts = lazy(() => import("@/pages/app/crypto/Catalysts"));
const CryptoExchanges = lazy(() => import("@/pages/app/crypto/Exchanges"));
const CryptoMovers = lazy(() => import("@/pages/app/crypto/Movers"));
const CryptoReports = lazy(() => import("@/pages/app/crypto/Reports"));
const CryptoCalendar = lazy(() => import("@/pages/app/crypto/Calendar"));

// Futures
const FuturesOverview = lazy(() => import("@/pages/app/futures/Overview"));
const FuturesOpenInterests = lazy(() => import("@/pages/app/futures/OpenInterests"));
const FuturesCalendar = lazy(() => import("@/pages/app/futures/Calendar"));

// Forex
const ForexOverview = lazy(() => import("@/pages/app/forex/Overview"));
const ForexStrength = lazy(() => import("@/pages/app/forex/Strength"));
const ForexCorrelation = lazy(() => import("@/pages/app/forex/Correlation"));
const ForexCalendar = lazy(() => import("@/pages/app/forex/Calendar"));
const ForexPairs = lazy(() => import("@/pages/app/forex/Pairs"));
const ForexRates = lazy(() => import("@/pages/app/forex/Rates"));
const ForexDeepAnalysis = lazy(() => import("@/pages/app/forex/DeepAnalysis"));
const ForexAlerts = lazy(() => import("@/pages/app/forex/Alerts"));
const ForexNews = lazy(() => import("@/pages/app/forex/News"));

// Commodities
const CommoditiesOverview = lazy(() => import("@/pages/app/commodities/Overview"));
const CommoditiesScreener = lazy(() => import("@/pages/app/commodities/Screener"));
const CommoditiesCatalysts = lazy(() => import("@/pages/app/commodities/Catalysts"));
const CommoditiesEnergy = lazy(() => import("@/pages/app/commodities/Energy"));
const CommoditiesMetals = lazy(() => import("@/pages/app/commodities/Metals"));
const CommoditiesAgriculture = lazy(() => import("@/pages/app/commodities/Agriculture"));
const CommoditiesSeasonality = lazy(() => import("@/pages/app/commodities/Seasonality"));
const CommoditiesReports = lazy(() => import("@/pages/app/commodities/Reports"));
const CommoditiesCalendar = lazy(() => import("@/pages/app/commodities/Calendar"));
const CommoditiesNews = lazy(() => import("@/pages/app/commodities/News"));

// Macro
const MacroOverview = lazy(() => import("@/pages/app/macro/Overview"));
const MacroCrossAsset = lazy(() => import("@/pages/app/macro/CrossAsset"));
const MacroGlobalHeatmap = lazy(() => import("@/pages/app/macro/GlobalHeatmap"));
const MacroModels = lazy(() => import("@/pages/app/macro/Models"));
const MacroCalendar = lazy(() => import("@/pages/app/macro/Calendar"));
const MacroRates = lazy(() => import("@/pages/app/macro/Rates"));
const MacroIndicators = lazy(() => import("@/pages/app/macro/Indicators"));
const MacroEvents = lazy(() => import("@/pages/app/macro/Events"));
const MacroReports = lazy(() => import("@/pages/app/macro/Reports"));
const MacroSentiment = lazy(() => import("@/pages/app/macro/Sentiment"));
const MacroNews = lazy(() => import("@/pages/app/macro/News"));

// Options
const OptionsChain = lazy(() => import("@/pages/app/options/Chain"));
const OptionsFlow = lazy(() => import("@/pages/app/options/Flow"));
const OptionsVolatility = lazy(() => import("@/pages/app/options/Volatility"));
const OptionsStrategy = lazy(() => import("@/pages/app/options/Strategy"));
const OptionsSimulator = lazy(() => import("@/pages/app/options/Simulator"));
const OptionsGreeksMonitor = lazy(() => import("@/pages/app/options/GreeksMonitor"));
const OptionsIvRank = lazy(() => import("@/pages/app/options/IVRank"));
const OptionsOIVolume = lazy(() => import("@/pages/app/options/OIVolume"));
const OptionsUnusualActivity = lazy(() => import("@/pages/app/options/UnusualActivity"));
const OptionsEarningsIVCrush = lazy(() => import("@/pages/app/options/EarningsIVCrush"));
const OptionsShortcuts = lazy(() => import("@/pages/app/options/Shortcuts"));

// AI
const AIOverview = lazy(() => import("@/pages/app/ai/Overview"));
const AIMorningBrief = lazy(() => import("@/pages/app/ai/MorningBrief"));
const AIMarketPulse = lazy(() => import("@/pages/app/ai/MarketPulse"));
const AIMyPortfolio = lazy(() => import("@/pages/app/ai/MyPortfolio"));
const AIMacroEarnings = lazy(() => import("@/pages/app/ai/MacroEarnings"));
const AITradeIdeas = lazy(() => import("@/pages/app/ai/TradeIdeas"));
const AIAssistant = lazy(() => import("@/pages/app/ai/AIAssistant"));

const AIOptionsIntelligence = lazy(() => import("@/pages/app/ai/OptionsIntelligenceAI"));
const AIMomentumLab = lazy(() => import("@/pages/app/ai/MomentumRegimeLab"));

// Copy Trade
const CopyTradeOverview = lazy(() => import("@/pages/app/copy-trade/Overview"));
const CopyTradeTopTraders = lazy(() => import("@/pages/app/copy-trade/TopTraders"));
const CopyTradeStrategies = lazy(() => import("@/pages/app/copy-trade/Strategies"));
const CopyTradePortfolios = lazy(() => import("@/pages/app/copy-trade/Portfolios"));
const CopyTradeLeaderboard = lazy(() => import("@/pages/app/copy-trade/Leaderboard"));
const CopyTradeMyCopying = lazy(() => import("@/pages/app/copy-trade/MyCopying"));
const CopyTradeInsights = lazy(() => import("@/pages/app/copy-trade/Insights"));

// Funding
const FundingOverview = lazy(() => import("@/pages/app/funding/Overview"));
const FundingBrokers = lazy(() => import("@/pages/app/funding/Brokers"));
const FundingAdvance = lazy(() => import("@/pages/app/funding/Advance"));
const FundingTransactions = lazy(() => import("@/pages/app/funding/Transactions"));

// LOADING COMPONENT
const PageLoader = memo(() => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
));
PageLoader.displayName = 'PageLoader';

// WRAPPERS
const SuspenseRoute = memo(({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
));
SuspenseRoute.displayName = 'SuspenseRoute';

const LockedRoute = memo(({ domainId, children }: { domainId: string; children: React.ReactNode }) => (
  <DomainGuard domainId={domainId}>
    <SuspenseRoute>{children}</SuspenseRoute>
  </DomainGuard>
));
LockedRoute.displayName = 'LockedRoute';

// APP CONTENT
function AppContent() {
  return (
    <>
      <AffiliateTracker />
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/affiliate" element={<AffiliatePage />} />
        <Route path="/warzone" element={<ProtectedRoute><SuspenseRoute><WarZonePage /></SuspenseRoute></ProtectedRoute>} />
        <Route path="/legal/terms" element={<TermsOfUse />} />
        <Route path="/legal/privacy" element={<PrivacyPolicy />} />
        <Route path="/legal/disclaimer" element={<Disclaimer />} />
        <Route path="/legal/copyright" element={<Copyright />} />
        <Route path="/legal/cookies" element={<CookiePolicy />} />
        <Route path="/legal/risk-disclosure" element={<RiskDisclosure />} />
        <Route path="/legal/refund" element={<RefundPolicy />} />
        <Route path="/legal/dmca" element={<DMCA />} />
        <Route path="/pricing-selection" element={<PricingSelection />} />
        
        {/* PROTECTED ROUTES */}
        <Route path="/app" element={<ProtectedRoute><ProtectedAppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/top-secret" replace />} />
          
          {/* ALL MARKETS */}
          <Route path="all-markets/overview" element={<SuspenseRoute><AllMarketsOverview /></SuspenseRoute>} />
          <Route path="all-markets/chart" element={<SuspenseRoute><AllMarketsChart /></SuspenseRoute>} />
          <Route path="all-markets/summary" element={<SuspenseRoute><AllMarketsSummary /></SuspenseRoute>} />
          <Route path="all-markets/movers" element={<SuspenseRoute><AllMarketsMovers /></SuspenseRoute>} />
          <Route path="all-markets/sentiment" element={<SuspenseRoute><AllMarketsSentiment /></SuspenseRoute>} />
          <Route path="all-markets/calendar" element={<SuspenseRoute><AllMarketsCalendar /></SuspenseRoute>} />
          <Route path="all-markets/news" element={<SuspenseRoute><AllMarketsNews /></SuspenseRoute>} />
          <Route path="all-markets/heatmap" element={<SuspenseRoute><AllMarketsHeatmap /></SuspenseRoute>} />
<Route path="all-markets/warzone" element={<SuspenseRoute><WarZonePage /></SuspenseRoute>} />
          <Route path="all-markets/admin/support" element={<ProtectedAdminRoute><SuspenseRoute><AdminSupportTickets /></SuspenseRoute></ProtectedAdminRoute>} />
<Route path="all-markets/admin/site-dashboard" element={<ProtectedAdminRoute><SuspenseRoute><AdminSiteDashboard /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="top-secret" element={<SuspenseRoute><TopSecretPage /></SuspenseRoute>} />
          <Route path="all-markets/top-secret" element={<SuspenseRoute><TopSecretPage /></SuspenseRoute>} />
          <Route path="top-secret/admin" element={<ProtectedAdminRoute><SuspenseRoute><TopSecretAdmin /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="all-markets/top-secret-admin" element={<ProtectedAdminRoute><SuspenseRoute><TopSecretAdmin /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="all-markets/pricing" element={<SuspenseRoute><AllMarketsPricing /></SuspenseRoute>} />

          {/* OPTIONS */}
          <Route path="options" element={<Navigate to="/app/options/chain" replace />} />
          <Route path="options/chain" element={<LockedRoute domainId="options"><OptionsChain /></LockedRoute>} />
          <Route path="options/flow" element={<LockedRoute domainId="options"><OptionsFlow /></LockedRoute>} />
          <Route path="options/volatility" element={<LockedRoute domainId="options"><OptionsVolatility /></LockedRoute>} />
          <Route path="options/strategy" element={<LockedRoute domainId="options"><OptionsStrategy /></LockedRoute>} />
          <Route path="options/simulator" element={<LockedRoute domainId="options"><OptionsSimulator /></LockedRoute>} />
          <Route path="options/greeks-monitor" element={<LockedRoute domainId="options"><OptionsGreeksMonitor /></LockedRoute>} />
          <Route path="options/iv-rank" element={<LockedRoute domainId="options"><OptionsIvRank /></LockedRoute>} />
          <Route path="options/oi-volume" element={<LockedRoute domainId="options"><OptionsOIVolume /></LockedRoute>} />
          <Route path="options/unusual-activity" element={<LockedRoute domainId="options"><OptionsUnusualActivity /></LockedRoute>} />
          <Route path="options/earnings-iv-crush" element={<LockedRoute domainId="options"><OptionsEarningsIVCrush /></LockedRoute>} />
          <Route path="options/shortcuts" element={<LockedRoute domainId="options"><OptionsShortcuts /></LockedRoute>} />

          {/* STOCKS */}
          <Route path="stocks/overview" element={<LockedRoute domainId="stocks"><StocksOverview /></LockedRoute>} />
          <Route path="stocks/screener" element={<LockedRoute domainId="stocks"><StocksScreener /></LockedRoute>} />
          <Route path="stocks/earnings" element={<LockedRoute domainId="stocks"><StocksEarnings /></LockedRoute>} />
          <Route path="stocks/fundamentals" element={<LockedRoute domainId="stocks"><StocksFundamentals /></LockedRoute>} />
          <Route path="stocks/movers" element={<LockedRoute domainId="stocks"><StocksMovers /></LockedRoute>} />
          <Route path="stocks/news" element={<LockedRoute domainId="stocks"><StocksNews /></LockedRoute>} />
          <Route path="stocks/sectors" element={<LockedRoute domainId="stocks"><StocksSectors /></LockedRoute>} />
          <Route path="stocks/catalysts" element={<LockedRoute domainId="stocks"><StocksCatalysts /></LockedRoute>} />
          <Route path="stocks/upgrades" element={<LockedRoute domainId="stocks"><StocksUpgrades /></LockedRoute>} />
          <Route path="stocks/valuation" element={<LockedRoute domainId="stocks"><StocksValuation /></LockedRoute>} />
          <Route path="stocks/reports" element={<LockedRoute domainId="stocks"><StocksReports /></LockedRoute>} />
          <Route path="stocks/watchlists" element={<LockedRoute domainId="stocks"><StocksWatchlists /></LockedRoute>} />
          
          {/* CRYPTO */}
          <Route path="crypto/overview" element={<LockedRoute domainId="crypto"><CryptoOverview /></LockedRoute>} />
          <Route path="crypto/top-coins" element={<LockedRoute domainId="crypto"><CryptoTopCoins /></LockedRoute>} />
          <Route path="crypto/on-chain" element={<LockedRoute domainId="crypto"><CryptoOnChain /></LockedRoute>} />
          <Route path="crypto/heatmap" element={<LockedRoute domainId="crypto"><CryptoHeatmap /></LockedRoute>} />
          <Route path="crypto/news" element={<LockedRoute domainId="crypto"><CryptoNews /></LockedRoute>} />
          <Route path="crypto/catalysts" element={<LockedRoute domainId="crypto"><CryptoCatalysts /></LockedRoute>} />
          <Route path="crypto/exchanges" element={<LockedRoute domainId="crypto"><CryptoExchanges /></LockedRoute>} />
          <Route path="crypto/movers" element={<LockedRoute domainId="crypto"><CryptoMovers /></LockedRoute>} />
          <Route path="crypto/reports" element={<LockedRoute domainId="crypto"><CryptoReports /></LockedRoute>} />
          <Route path="crypto/calendar" element={<LockedRoute domainId="crypto"><CryptoCalendar /></LockedRoute>} />
          
          {/* FUTURES */}
          <Route path="futures/overview" element={<LockedRoute domainId="futures"><FuturesOverview /></LockedRoute>} />
          <Route path="futures/open-interests" element={<LockedRoute domainId="futures"><FuturesOpenInterests /></LockedRoute>} />
          <Route path="futures/calendar" element={<LockedRoute domainId="futures"><FuturesCalendar /></LockedRoute>} />
          
          {/* FOREX */}
          <Route path="forex/overview" element={<LockedRoute domainId="forex"><ForexOverview /></LockedRoute>} />
          <Route path="forex/strength" element={<LockedRoute domainId="forex"><ForexStrength /></LockedRoute>} />
          <Route path="forex/correlation" element={<LockedRoute domainId="forex"><ForexCorrelation /></LockedRoute>} />
          <Route path="forex/calendar" element={<LockedRoute domainId="forex"><ForexCalendar /></LockedRoute>} />
          <Route path="forex/pairs" element={<LockedRoute domainId="forex"><ForexPairs /></LockedRoute>} />
          <Route path="forex/rates" element={<LockedRoute domainId="forex"><ForexRates /></LockedRoute>} />
          <Route path="forex/deep-analysis" element={<LockedRoute domainId="forex"><ForexDeepAnalysis /></LockedRoute>} />
          <Route path="forex/alerts" element={<LockedRoute domainId="forex"><ForexAlerts /></LockedRoute>} />
          <Route path="forex/news" element={<LockedRoute domainId="forex"><ForexNews /></LockedRoute>} />
          
          {/* COMMODITIES */}
          <Route path="commodities/overview" element={<LockedRoute domainId="commodities"><CommoditiesOverview /></LockedRoute>} />
          <Route path="commodities/screener" element={<LockedRoute domainId="commodities"><CommoditiesScreener /></LockedRoute>} />
          <Route path="commodities/catalysts" element={<LockedRoute domainId="commodities"><CommoditiesCatalysts /></LockedRoute>} />
          <Route path="commodities/energy" element={<LockedRoute domainId="commodities"><CommoditiesEnergy /></LockedRoute>} />
          <Route path="commodities/metals" element={<LockedRoute domainId="commodities"><CommoditiesMetals /></LockedRoute>} />
          <Route path="commodities/agriculture" element={<LockedRoute domainId="commodities"><CommoditiesAgriculture /></LockedRoute>} />
          <Route path="commodities/seasonality" element={<LockedRoute domainId="commodities"><CommoditiesSeasonality /></LockedRoute>} />
          <Route path="commodities/reports" element={<LockedRoute domainId="commodities"><CommoditiesReports /></LockedRoute>} />
          <Route path="commodities/calendar" element={<LockedRoute domainId="commodities"><CommoditiesCalendar /></LockedRoute>} />
          <Route path="commodities/news" element={<LockedRoute domainId="commodities"><CommoditiesNews /></LockedRoute>} />
          
          {/* MACRO */}
          <Route path="macro/overview" element={<LockedRoute domainId="macro"><MacroOverview /></LockedRoute>} />
          <Route path="macro/cross-asset" element={<LockedRoute domainId="macro"><MacroCrossAsset /></LockedRoute>} />
          <Route path="macro/global-heatmap" element={<LockedRoute domainId="macro"><MacroGlobalHeatmap /></LockedRoute>} />
          <Route path="macro/models" element={<LockedRoute domainId="macro"><MacroModels /></LockedRoute>} />
          <Route path="macro/calendar" element={<LockedRoute domainId="macro"><MacroCalendar /></LockedRoute>} />
          <Route path="macro/rates" element={<LockedRoute domainId="macro"><MacroRates /></LockedRoute>} />
          <Route path="macro/indicators" element={<LockedRoute domainId="macro"><MacroIndicators /></LockedRoute>} />
          <Route path="macro/events" element={<LockedRoute domainId="macro"><MacroEvents /></LockedRoute>} />
          <Route path="macro/reports" element={<LockedRoute domainId="macro"><MacroReports /></LockedRoute>} />
          <Route path="macro/sentiment" element={<LockedRoute domainId="macro"><MacroSentiment /></LockedRoute>} />
          <Route path="macro/news" element={<LockedRoute domainId="macro"><MacroNews /></LockedRoute>} />
          
          {/* AI */}
          <Route path="ai/overview" element={<SuspenseRoute><AIOverview /></SuspenseRoute>} />
          <Route path="ai/morning-brief" element={<SuspenseRoute><AIMorningBrief /></SuspenseRoute>} />
          <Route path="ai/market-pulse" element={<SuspenseRoute><AIMarketPulse /></SuspenseRoute>} />
          <Route path="ai/my-portfolio" element={<SuspenseRoute><AIMyPortfolio /></SuspenseRoute>} />
          <Route path="ai/macro-earnings" element={<SuspenseRoute><AIMacroEarnings /></SuspenseRoute>} />
          <Route path="ai/trade-ideas" element={<LockedRoute domainId="ai"><AITradeIdeas /></LockedRoute>} />
          <Route path="ai/assistant" element={<LockedRoute domainId="ai"><AIAssistant /></LockedRoute>} />
<Route path="ai/options-intelligence" element={<SuspenseRoute><AIOptionsIntelligence /></SuspenseRoute>} />
<Route path="ai/momentum-lab" element={<SuspenseRoute><AIMomentumLab /></SuspenseRoute>} />
          {/* JOURNAL */}
          <Route path="journal/overview" element={<JournalRoute><JournalOverview /></JournalRoute>} />
<Route path="journal/new" element={<JournalRoute><New /></JournalRoute>} />
<Route path="journal/my-trades" element={<JournalRoute><JournalMyTrades /></JournalRoute>} />
<Route path="journal/strategies" element={<JournalRoute><Strategies /></JournalRoute>} />
<Route path="journal/strategies/:id" element={<JournalRoute><StrategyDetailView /></JournalRoute>} />
<Route path="journal/scenarios" element={<JournalRoute><JournalScenarios /></JournalRoute>} />
<Route path="journal/community" element={<JournalRoute><JournalCommunity /></JournalRoute>} />
<Route path="journal/academy" element={<JournalRoute><JournalAcademy /></JournalRoute>} />          
<Route path="journal/settings" element={<JournalRoute><JournalSettings /></JournalRoute>} />
<Route path="journal/:id" element={<JournalRoute><JournalTradeDetail /></JournalRoute>} />
<Route path="journal/import" element={<JournalRoute><JournalImport /></JournalRoute>} />
<Route path="journal/export" element={<JournalRoute><JournalExport /></JournalRoute>} />
<Route path="journal/notes" element={<JournalRoute><JournalNotes /></JournalRoute>} />
<Route path="journal/analytics" element={<JournalRoute><JournalAnalytics /></JournalRoute>} />
<Route path="journal/ai-review" element={<JournalRoute><JournalAIReview /></JournalRoute>} />
<Route path="journal/calendar" element={<JournalRoute><JournalCalendar /></JournalRoute>} />
<Route path="journal/performance" element={<JournalRoute><JournalPerformance /></JournalRoute>} />
<Route path="journal/prop-firms" element={<JournalRoute><PropFirmsPage /></JournalRoute>} />

          {/* BACKTEST */}
          <Route path="journal/backtest/landing" element={<BacktestRoute><BacktestLanding /></BacktestRoute>} />
          <Route path="journal/backtest/overview" element={<BacktestRoute><BacktestOverview /></BacktestRoute>} />
          <Route path="journal/backtest/chart" element={<BacktestRoute><BacktestChart /></BacktestRoute>} />
          <Route path="journal/backtest/results" element={<BacktestRoute><BacktestResults /></BacktestRoute>} />
          <Route path="journal/backtest/builder" element={<BacktestRoute><BacktestBuilder /></BacktestRoute>} />
          <Route path="journal/backtest/data" element={<BacktestRoute><BacktestData /></BacktestRoute>} />
          <Route path="journal/backtest/analytics" element={<BacktestRoute><BacktestAnalytics /></BacktestRoute>} />
          <Route path="journal/backtest/ai-insights" element={<BacktestRoute><BacktestAIInsights /></BacktestRoute>} />
          <Route path="journal/backtest/monte-carlo" element={<BacktestRoute><BacktestMonteCarlo /></BacktestRoute>} />
          <Route path="journal/backtest/walk-forward" element={<BacktestRoute><BacktestWalkForward /></BacktestRoute>} />
          <Route path="journal/backtest/optimization" element={<BacktestRoute><BacktestOptimization /></BacktestRoute>} />
          <Route path="journal/backtest/replay" element={<BacktestRoute><BacktestReplay /></BacktestRoute>} />
          <Route path="journal/backtest/new" element={<BacktestRoute><BacktestOverview /></BacktestRoute>} />

          {/* AFFILIATE CENTER */}
          <Route path="journal/affiliate" element={<Navigate to="/app/journal/affiliate/overview" replace />} />
          <Route path="journal/affiliate/overview" element={<AffiliateRoute><AffiliateOverview /></AffiliateRoute>} />
          <Route path="journal/affiliate/dashboard" element={<AffiliateRoute><AffiliateOverview /></AffiliateRoute>} />
          <Route path="journal/affiliate/referrals" element={<AffiliateRoute><AffiliateReferrals /></AffiliateRoute>} />
          <Route path="journal/affiliate/earnings" element={<AffiliateRoute><AffiliateEarnings /></AffiliateRoute>} />
          <Route path="journal/affiliate/commissions" element={<AffiliateRoute><AffiliateEarnings /></AffiliateRoute>} />
          <Route path="journal/affiliate/payouts" element={<AffiliateRoute><AffiliatePayouts /></AffiliateRoute>} />
          <Route path="journal/affiliate/request-payout" element={<AffiliateRoute><AffiliatePayouts /></AffiliateRoute>} />
          <Route path="journal/affiliate/payout-history" element={<AffiliateRoute><AffiliatePayouts /></AffiliateRoute>} />
          <Route path="journal/affiliate/marketing" element={<AffiliateRoute><AffiliateMarketing /></AffiliateRoute>} />
          <Route path="journal/affiliate/analytics" element={<AffiliateRoute><AffiliateAnalytics /></AffiliateRoute>} />
          <Route path="journal/affiliate/performance" element={<AffiliateRoute><AffiliateAnalytics /></AffiliateRoute>} />
          <Route path="journal/affiliate/settings" element={<AffiliateRoute><AffiliateSettings /></AffiliateRoute>} />
          <Route path="journal/affiliate/bonuses" element={<AffiliateRoute><AffiliateEarnings /></AffiliateRoute>} />

          {/* JOURNAL ADMIN */}
          <Route path="journal/admin" element={<ProtectedAdminRoute><SuspenseRoute><AdminDashboard /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="journal/admin/users" element={<ProtectedAdminRoute><SuspenseRoute><AdminUsers /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="journal/admin/users/:userId" element={<ProtectedAdminRoute><SuspenseRoute><UserDetails /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="journal/admin/analytics" element={<ProtectedAdminRoute><SuspenseRoute><AdminAnalytics /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="journal/admin/subscribers" element={<ProtectedAdminRoute><SuspenseRoute><AdminSubscribers /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="journal/admin/affiliate" element={<ProtectedAdminRoute><SuspenseRoute><AdminAffiliate /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="journal/admin/top-traders" element={<ProtectedAdminRoute><SuspenseRoute><AdminTopTraders /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="journal/admin/Cancellations" element={<ProtectedAdminRoute><SuspenseRoute><Cancellations /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="journal/admin/newsletter-sub" element={<ProtectedAdminRoute><SuspenseRoute><AdminNewsletterSub /></SuspenseRoute></ProtectedAdminRoute>} />
          
          {/* BACKTEST BACKWARD COMPAT */}
          <Route path="backtest/landing" element={<BacktestRoute><BacktestLanding /></BacktestRoute>} />
          <Route path="backtest/overview" element={<BacktestRoute><BacktestOverview /></BacktestRoute>} />
          <Route path="backtest/chart" element={<BacktestRoute><BacktestChart /></BacktestRoute>} />
          <Route path="backtest/results" element={<BacktestRoute><BacktestResults /></BacktestRoute>} />
          <Route path="backtest/builder" element={<BacktestRoute><BacktestBuilder /></BacktestRoute>} />
          <Route path="backtest/data" element={<BacktestRoute><BacktestData /></BacktestRoute>} />
          <Route path="backtest/analytics" element={<BacktestRoute><BacktestAnalytics /></BacktestRoute>} />
          <Route path="backtest/ai-insights" element={<BacktestRoute><BacktestAIInsights /></BacktestRoute>} />
          <Route path="backtest/monte-carlo" element={<BacktestRoute><BacktestMonteCarlo /></BacktestRoute>} />
          <Route path="backtest/walk-forward" element={<BacktestRoute><BacktestWalkForward /></BacktestRoute>} />
          <Route path="backtest/optimization" element={<BacktestRoute><BacktestOptimization /></BacktestRoute>} />
          <Route path="backtest/replay" element={<BacktestRoute><BacktestReplay /></BacktestRoute>} />
          
          {/* COPY TRADE */}
          <Route path="copy-trade/overview" element={<LockedRoute domainId="copy-trade"><CopyTradeOverview /></LockedRoute>} />
          <Route path="copy-trade/top-traders" element={<LockedRoute domainId="copy-trade"><CopyTradeTopTraders /></LockedRoute>} />
          <Route path="copy-trade/strategies" element={<LockedRoute domainId="copy-trade"><CopyTradeStrategies /></LockedRoute>} />
          <Route path="copy-trade/portfolios" element={<LockedRoute domainId="copy-trade"><CopyTradePortfolios /></LockedRoute>} />
          <Route path="copy-trade/leaderboard" element={<LockedRoute domainId="copy-trade"><CopyTradeLeaderboard /></LockedRoute>} />
          <Route path="copy-trade/my-copying" element={<LockedRoute domainId="copy-trade"><CopyTradeMyCopying /></LockedRoute>} />
          <Route path="copy-trade/insights" element={<LockedRoute domainId="copy-trade"><CopyTradeInsights /></LockedRoute>} />
          
          {/* FUNDING */}
          <Route path="funding/overview" element={<LockedRoute domainId="funding"><FundingOverview /></LockedRoute>} />
          <Route path="funding/brokers" element={<LockedRoute domainId="funding"><FundingBrokers /></LockedRoute>} />
          <Route path="funding/advance" element={<LockedRoute domainId="funding"><FundingAdvance /></LockedRoute>} />
          <Route path="funding/transactions" element={<LockedRoute domainId="funding"><FundingTransactions /></LockedRoute>} />
          
          <Route path="settings" element={<SuspenseRoute><SettingsLayout /></SuspenseRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <SupportWidget />
    </>
  );
}

// MAIN APP
export const App = () => (
  <AppQueryProvider>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <TimezoneProvider>
              <RiskSettingsRealtimeProvider>
                <ImpersonationProvider>
                  <AppContent />
                </ImpersonationProvider>
              </RiskSettingsRealtimeProvider>
            </TimezoneProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </AppQueryProvider>
);

export default App;