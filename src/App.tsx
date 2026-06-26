// src/App.tsx - COMPLETE WITH AFFILIATE CENTER & LOCKED BACKTEST
// 🔥 v7.0 FIX: BacktestRoute & AffiliateRoute moved to separate files to fix useAuth context error
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PlanChangeConfirmHost } from "@/components/billing/PlanChangeConfirm";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppQueryProvider } from "@/providers/QueryProvider";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { MentorViewProvider } from "@/contexts/MentorViewContext";
import { RiskSettingsRealtimeProvider } from "@/providers/RiskSettingsRealtimeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DomainGuard } from "@/components/DomainGuard";
import { ProtectedAdminRoute } from "@/components/ProtectedAdminRoute";
import { Suspense, memo, useEffect } from "react";
import { lazy } from "@/lib/lazyWithRetry";
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { JournalRoute } from "@/components/routes/JournalRoute";


// 🔥 ROUTE PROTECTION COMPONENTS - Imported from separate files to use AuthProvider correctly
import { BacktestRoute } from "@/components/routes/BacktestRoute";
import { AffiliateRoute } from "@/components/routes/AffiliateRoute";
import { BetaRoute } from "@/components/routes/BetaRoute";
import { AdminBetaGate } from "@/components/routes/AdminBetaGate";


import '@/scripts/migrationRunner';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';

// =====================================================
// 🔄 AUTO-RELOAD ON CHUNK LOAD FAILURE (after deploy)
// =====================================================
if (typeof window !== 'undefined') {
  // Keep this list in sync with CHUNK_LOAD_ERROR_PATTERNS in ErrorBoundary.tsx.
  // Three layers can catch a chunk-load failure: this window-error listener
  // (resource 404 on a <script> tag), unhandledrejection (the import promise
  // rejected and React did not handle it), and the ErrorBoundary fallback
  // (React's Suspense caught the rejection before it became unhandled).
  // All three trip the same sessionStorage key so we never reload twice in a
  // row on the same pathname.
  const CHUNK_LOAD_PATTERNS = [
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'error loading dynamically imported module',
    'Loading chunk',
    'Loading CSS chunk',
  ];
  const matchesChunkError = (msg: string) =>
    !!msg && CHUNK_LOAD_PATTERNS.some((p) => msg.includes(p));
  const tryReloadOnce = () => {
    const reloadKey = 'chunk_reload_' + window.location.pathname;
    if (sessionStorage.getItem(reloadKey)) return false;
    sessionStorage.setItem(reloadKey, String(Date.now()));
    window.location.reload();
    return true;
  };

  // Expire stale reload guards after 5 minutes. Without this, a single
  // genuine app-level error on a route after a chunk-load reload would
  // leave the guard set forever for that route, defeating the auto-recovery
  // the next time a real chunk mismatch hits the same path.
  try {
    const RELOAD_TTL_MS = 5 * 60 * 1000;
    const now = Date.now();
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith('chunk_reload_')) continue;
      const ts = Number(sessionStorage.getItem(key));
      if (!Number.isFinite(ts) || now - ts > RELOAD_TTL_MS) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // sessionStorage can throw in private mode / storage disabled — ignore.
  }

  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'SCRIPT' || target?.tagName === 'LINK') {
      tryReloadOnce();
      return;
    }
    if (matchesChunkError(event.message || '')) {
      tryReloadOnce();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const msg =
      (event.reason && (event.reason.message || event.reason.toString?.())) || '';
    // ChunkLoadError is handled by GlobalErrorBoundary (manual refresh UI).
    // Do NOT auto-reload here — it causes infinite reload loops after deploys.
    if (matchesChunkError(msg)) {
      logger.warn('[App] Chunk load rejection detected — GlobalErrorBoundary will handle UI', { msg });
      return;
    }
    logger.error('[App] Unhandled promise rejection', event.reason);
  });
}

import { FinoChatProvider } from "@/contexts/FinoChatContext";
import { FEATURES } from "@/config/features";

// PUBLIC PAGES (kept eager — tiny, critical for first paint)
import NotFound from "./pages/NotFound";
import ScrollToTop from "@/components/ScrollToTop";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { useAnalytics } from "@/lib/analytics";
import { captureFirstTouch } from "@/lib/analytics/attribution";

// LAZY LOADED PAGES

// --- Formerly-eager public pages (Task 1) ---
const LandingPage = lazy(() => import("@/pages/landing/LandingPage"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const AffiliatePage = lazy(() => import("@/pages/AffiliatePage"));
const LinksPage = lazy(() => import("@/pages/LinksPage"));
const JournalPublicPage = lazy(() => import("@/pages/JournalPublicPage"));
const GlossaryIndex = lazy(() => import("@/pages/glossary/GlossaryIndex"));
const GlossaryTerm = lazy(() => import("@/pages/glossary/GlossaryTerm"));
const JournalCopierPage = lazy(() => import("@/pages/JournalCopierPage"));
const BestTradingJournalTradovate = lazy(() => import("@/pages/BestTradingJournalTradovate"));
const ResearchIndex = lazy(() => import("@/pages/research/ResearchIndexPage"));
const TickerResearch = lazy(() => import("@/pages/research/TickerResearchPage"));
const WelcomeScreen = lazy(() => import("@/pages/onboarding/WelcomeScreen"));

// --- Formerly-eager global widgets (Task 3 & 4) ---
const SupportWidget = lazy(() => import("@/components/SupportWidget"));
const FinoChatDrawer = lazy(() => import("@/components/fino/FinoChatDrawer"));
const AffiliateTracker = lazy(() => import("@/features/affiliate/components/AffiliateTracker").then(m => ({ default: m.AffiliateTracker })));

const FinotaurAI = lazy(() => import("@/pages/app/journal/finotaur-ai/FinotaurAI"));

// Automation — web config layer (Session 1: UI only, no execution)
const AutomationShell = lazy(() => import("@/features/automation/AutomationShell"));
const AutomationRiskTab = lazy(() => import("@/features/automation/tabs/RiskRulesTab"));
const AutomationCopierTab = lazy(() => import("@/features/automation/tabs/CopierRoutesTab"));
const AutomationAgentTab = lazy(() => import("@/features/automation/tabs/AgentStatusTab"));

const SettingsShell = lazy(() => import("@/features/settings/SettingsShell"));
const AccountTab = lazy(() => import("@/features/settings/tabs/AccountTab"));
const BillingTab = lazy(() => import("@/features/settings/tabs/BillingTab"));
const NotificationsTab = lazy(() => import("@/features/settings/tabs/NotificationsTab"));
const SecurityTab = lazy(() => import("@/features/settings/tabs/SecurityTab"));
const TheFloorTab = lazy(() => import("@/features/settings/tabs/TheFloorTab"));
const Pricing = lazy(() => import("@/pages/app/journal/Pricing"));
const JournalPricingPage = lazy(() => import("@/pages/app/journal/JournalPricingPage"));
const PropFirmsPage = lazy(() => import('@/pages/app/journal/PropFirmsPage'));
const PaymentSuccessPage = lazy(() => import("@/pages/app/journal/PaymentSuccessPage"));
const PaymentFailurePage = lazy(() => import("@/pages/app/journal/PaymentFailurePage"));
const HeatmapPage = lazy(() => import("@/pages/HeatmapPage"));
const DesignLab = lazy(() => import("@/pages/DesignLab"));

// ACADEMY (public learning center)
const AcademyIndex = lazy(() => import("@/pages/academy/AcademyIndex"));
const AcademyTopicHub = lazy(() => import("@/pages/academy/TopicHub"));
const AcademyModule = lazy(() => import("@/pages/academy/AcademyModule"));
const AcademyChapter = lazy(() => import("@/pages/academy/AcademyChapter"));
const PlansPage = lazy(() => import("@/pages/app/Plans"));
const ProtectedAppLayout = lazy(() => import("@/layouts/ProtectedAppLayout"));
const CopilotStandaloneLayout = lazy(() => import("@/layouts/CopilotStandaloneLayout"));
const HomePage = lazy(() => import("@/pages/app/home/HomePage"));
const WelcomeOffer = lazy(() => import("@/components/onboarding/WelcomeOffer"));
const LegalHub = lazy(() => import("@/components/legal").then(m => ({ default: m.LegalHub })));
const TermsOfUse = lazy(() => import("@/components/legal").then(m => ({ default: m.TermsOfUse })));
const PrivacyPolicy = lazy(() => import("@/components/legal").then(m => ({ default: m.PrivacyPolicy })));
const Disclaimer = lazy(() => import("@/components/legal").then(m => ({ default: m.Disclaimer })));
const Copyright = lazy(() => import("@/components/legal").then(m => ({ default: m.Copyright })));
const CookiePolicy = lazy(() => import("@/components/legal").then(m => ({ default: m.CookiePolicy })));
const RiskDisclosure = lazy(() => import("@/components/legal").then(m => ({ default: m.RiskDisclosure })));
const FuturesRiskDisclosure = lazy(() => import("@/components/legal").then(m => ({ default: m.FuturesRiskDisclosure })));
const CftcHypotheticalDisclosure = lazy(() => import("@/components/legal").then(m => ({ default: m.CftcHypotheticalDisclosure })));
const TestimonialDisclaimer = lazy(() => import("@/components/legal").then(m => ({ default: m.TestimonialDisclaimer })));
const AffiliateDisclosure = lazy(() => import("@/components/legal").then(m => ({ default: m.AffiliateDisclosure })));
const RefundPolicy = lazy(() => import("@/components/legal").then(m => ({ default: m.RefundPolicy })));
const DMCA = lazy(() => import("@/components/legal").then(m => ({ default: m.DMCA })));

// Journal Pages
const JournalOverview = lazy(() => import("@/pages/app/journal/Overview"));
const New = lazy(() => import("@/pages/app/journal/New"));
const JournalMyTrades = lazy(() => import("@/pages/app/journal/MyTrades"));
const JournalTradeDetail = lazy(() => import("@/pages/app/journal/TradeDetail"));
const JournalImport = lazy(() => import("@/pages/app/journal/Import"));
const JournalExport = lazy(() => import("@/pages/app/journal/Export"));
const JournalNotes = lazy(() => import("@/pages/app/journal/Notes"));
const JournalReportsLayout = lazy(() => import("@/pages/app/journal/reports/ReportsLayout"));
const JournalReportsProgress = lazy(() => import("@/pages/app/journal/reports/ProgressTracker"));
const JournalReportsDayView = lazy(() => import("@/pages/app/journal/reports/DayView"));
const JournalReportsRecaps = lazy(() => import("@/pages/app/journal/reports/AIRecaps"));
const JournalReportsBreakdowns = lazy(() => import("@/pages/app/journal/reports/Breakdowns"));
const JournalReportsAnnualCalendar = lazy(() => import("@/pages/app/journal/reports/AnnualCalendar"));
const JournalReportsCompare = lazy(() => import("@/pages/app/journal/reports/CompareReports"));
const JournalReportsScores = lazy(() => import("@/pages/app/journal/reports/Scores"));
const JournalReportsOverview = lazy(() => import("@/pages/app/journal/reports/Overview"));
const JournalReportsSummary = lazy(() => import("@/pages/app/journal/reports/Summary"));
const JournalReportsPerformance = lazy(() => import("@/pages/app/journal/reports/Performance"));
const JournalReportsOptions = lazy(() => import("@/pages/app/journal/reports/OptionsAnalytics"));
const JournalCalendar = lazy(() => import("@/pages/app/journal/Calendar"));
const JournalPerformance = lazy(() => import("@/pages/app/journal/Performance"));
const Strategies = lazy(() => import("@/pages/app/journal/Strategies"));
const StrategyDetailView = lazy(() =>
  import("@/pages/app/journal/Strategies").then((m) => {
    if (!m.StrategyDetailView) {
      throw new Error(
        "[App] Strategies.tsx is missing the `StrategyDetailView` named export — was it renamed?",
      );
    }
    return { default: m.StrategyDetailView };
  }),
);
const JournalScenarios = lazy(() => import("@/pages/app/journal/Scenarios"));
const JournalCommunity = lazy(() => import("@/pages/app/journal/Community"));
const JournalAcademy = lazy(() => import("@/pages/app/journal/Academy"));
const JournalSettings = lazy(async () => {
  const module = await import("@/pages/app/journal/JournalSettings");
  const Component = (module as any).default ?? (module as any).JournalSettings ?? Object.values(module)[0];
  return { default: Component };
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- retained for Phase 2 removal (copy-trade unification)
const TradeCopier = lazy(() => import("@/pages/app/journal/TradeCopier"));
const Mentor = lazy(() => import("@/features/mentor/pages/Mentor"));
const TradeCompare = lazy(() => import("@/pages/app/journal/TradeCompare"));
// Floor page removed — competition lives in GlobalLeaderboard (Community › Leaderboard tab)

// Mentorship
const MentorshipSpaces = lazy(() => import("@/features/mentor/pages/Spaces"));
const SpaceDetail = lazy(() => import("@/features/mentor/pages/SpaceDetail"));
const FloorFeed = lazy(() => import("@/features/floor/pages/Feed"));
const FloorLeaderboard = lazy(() => import("@/features/floor/pages/Leaderboard"));
const DirectMessages = lazy(() => import("@/features/floor/pages/DirectMessages"));

// Backtest Pages
const BacktestLanding = lazy(() => import("@/pages/app/journal/backtest/BacktestLanding"));
const BacktestOverview = lazy(() => import("@/pages/app/journal/backtest/Overview"));
const BacktestChart = lazy(() => import("@/pages/app/journal/backtest/Chart"));
const BacktestResults = lazy(() => import("@/pages/app/journal/backtest/Results"));
const BacktestBuilder = lazy(() => import("@/pages/app/journal/backtest/Builder"));
const BacktestAnalytics = lazy(() => import("@/pages/app/journal/backtest/Analytics"));
const BacktestTrades = lazy(() => import("@/pages/app/journal/backtest/BacktestTrades"));
const AutoBacktest = lazy(() => import("@/pages/app/journal/backtest/AutoBacktest"));

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
const AdminSupportAiDrafts = lazy(() => import("@/pages/app/all-markets/admin/SupportAiDrafts"));
// Admin CRM (unified — replaces legacy SiteDashboard route).
// Old file at pages/app/all-markets/admin/SiteDashboard.tsx is kept on disk
// as an orphan until Phase 0.5 verifies the new shell is stable in prod.
const AdminCRMShell = lazy(() => import("@/pages/app/admin"));
const AffiliateSmartPage = lazy(() => import("@/pages/app/all-markets/affiliate/AffiliateSmartPage"));  // 🤝 NEW
const TopSecretAdmin = lazy(() => import("@/pages/app/all-markets/TopSecretAdmin"));
const TopSecretPage = lazy(() => import("@/pages/app/TopSecret/TopSecretPage"));
// Catalyst Intelligence Deck — admin Pattern Library (Tree #2, 2026-05-26)
const AdminPatternLibrary = lazy(() => import("@/pages/app/admin/PatternLibrary"));
const AdminPatternLibraryList = lazy(() => import("@/pages/app/admin/PatternLibraryList"));
// Upcoming Events — forward-looking event calendar (Tree #2, 2026-05-27)
const UpcomingEventsView = lazy(() => import("@/pages/app/ai/UpcomingEventsView"));
const AdminUpcomingEvents = lazy(() => import("@/pages/app/admin/UpcomingEventsAdmin"));
// DEV-ONLY: /__dev/seo-analytics — public screen-verification route for the
// admin SEO widget. Remove import + route + delete src/__dev/SeoAnalyticsDevPage.tsx
// before merging Wave 5 to main (the admin route at /app/admin/seo is the prod surface).
import SeoAnalyticsDevPage from "@/__dev/SeoAnalyticsDevPage";
// ETFs
const ETFOverview   = lazy(() => import("@/pages/app/etfs/Overview"));
const ETFLayout     = lazy(() => import("@/pages/app/etfs/ETFLayout"));
const ETFDirectory  = lazy(() => import("@/pages/app/etfs/Directory"));
const ETFScreener   = lazy(() => import("@/pages/app/etfs/Screener"));
const ETFCompare    = lazy(() => import("@/pages/app/etfs/Compare"));
const ETFNews       = lazy(() => import("@/pages/app/etfs/News"));

// Stocks
const StocksOverview = lazy(() => import("@/pages/app/stocks/Overview"));
const StocksScreener = lazy(() => import("@/pages/app/stocks/Screener"));
const StocksMarketPulse = lazy(() => import("@/pages/app/stocks/MarketPulse"));
const StocksMovers = lazy(() => import("@/pages/app/stocks/Movers"));
const StocksNews = lazy(() => import("@/pages/app/stocks/News"));
const StocksSectors = lazy(() => import("@/pages/app/stocks/Sectors"));
const StocksSectorDetail = lazy(() => import("@/pages/app/stocks/SectorDetail"));
const StocksCatalysts = lazy(() => import("@/pages/app/stocks/Catalysts"));
const StocksUpgrades = lazy(() => import("@/pages/app/stocks/Upgrades"));
const StocksValuation = lazy(() => import("@/pages/app/stocks/Valuation"));
const StocksSentiment = lazy(() => import("@/pages/app/stocks/Sentiment"));
const StocksInsider   = lazy(() => import("@/pages/app/stocks/Insider"));
const StocksInsiders  = lazy(() => import("@/pages/app/stocks/Insiders"));
const StocksInsidersManager = lazy(() => import("@/pages/app/stocks/InsidersManager"));
const StocksReports = lazy(() => import("@/pages/app/stocks/Reports"));
const StocksCompare = lazy(() => import("@/pages/app/stocks/Compare"));

// Crypto — 7 Consolidated Pages
const CryptoOverview = lazy(() => import("@/pages/app/crypto/Overview"));
const CryptoCoinDetail = lazy(() => import("@/pages/app/crypto/CoinDetail"));
const CryptoScreener = lazy(() => import("@/pages/app/crypto/Screener"));
const CryptoDerivatives = lazy(() => import("@/pages/app/crypto/Derivatives"));
const CryptoSentiment = lazy(() => import("@/pages/app/crypto/Sentiment"));
const CryptoWatchlist = lazy(() => import("@/pages/app/crypto/Watchlist"));
const CryptoAcademy = lazy(() => import("@/pages/app/crypto/Academy"));
const CryptoDefiTvl = lazy(() => import("@/pages/app/crypto/DefiTvl"));
const CryptoStablecoins = lazy(() => import("@/pages/app/crypto/Stablecoins"));
const CryptoHeatmap = lazy(() => import("@/pages/app/crypto/Heatmap"));
const CryptoWhales = lazy(() => import("@/pages/app/crypto/whales/WhalesHub"));
const CryptoMarketScanner = lazy(() => import("@/pages/app/crypto/scanner/MarketScanner"));

// Trading Arena — admin + beta only, full-screen workstation (Phase 0)
const TradingArenaPage = lazy(() => import("@/pages/app/trading-arena/TradingArena"));

// Futures
const FuturesOverview = lazy(() => import("@/pages/app/futures/Overview"));
const FuturesContracts = lazy(() => import("@/pages/app/futures/Contracts"));
const FuturesCurves = lazy(() => import("@/pages/app/futures/Curves"));
const FuturesPositioning = lazy(() => import("@/pages/app/futures/Positioning"));
const FuturesTools = lazy(() => import("@/pages/app/futures/Tools"));

// Forex
const ForexOverview = lazy(() => import("@/pages/app/forex/Overview"));
const ForexStrength = lazy(() => import("@/pages/app/forex/Strength"));
const ForexCorrelation = lazy(() => import("@/pages/app/forex/Correlation"));
const ForexPairs = lazy(() => import("@/pages/app/forex/Pairs"));
const ForexRates = lazy(() => import("@/pages/app/forex/Rates"));
const ForexDeepAnalysis = lazy(() => import("@/pages/app/forex/DeepAnalysis"));
const ForexAlerts = lazy(() => import("@/pages/app/forex/Alerts"));
const ForexNews = lazy(() => import("@/pages/app/forex/News"));
const ForexHeatmap = lazy(() => import("@/pages/app/forex/Heatmap"));
const ForexPair = lazy(() => import("@/pages/app/forex/Pair"));
const ForexTools = lazy(() => import("@/pages/app/forex/Tools"));
const ForexCBWatch = lazy(() => import("@/pages/app/forex/CBWatch"));
const ForexCOT = lazy(() => import("@/pages/app/forex/COT"));
const ForexCurrency = lazy(() => import("@/pages/app/forex/Currency"));

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
const CommoditiesMarkets = lazy(() => import("@/pages/app/commodities/Markets"));
const CommoditiesMacro = lazy(() => import("@/pages/app/commodities/Macro"));
const CommoditiesPositioning = lazy(() => import("@/pages/app/commodities/Positioning"));
const CommoditiesWatchlist = lazy(() => import("@/pages/app/commodities/Watchlist"));

// Macro — 7-tab container pages
const MacroPulse = lazy(() => import("@/pages/app/macro/tabs/Pulse"));
const MacroRatesCentralBanks = lazy(() => import("@/pages/app/macro/tabs/RatesCentralBanks"));
const MacroInflationGrowth = lazy(() => import("@/pages/app/macro/tabs/InflationGrowth"));
const MacroGlobalMarkets = lazy(() => import("@/pages/app/macro/tabs/GlobalMarkets"));
const MacroRiskRegime = lazy(() => import("@/pages/app/macro/tabs/RiskRegime"));
const MacroDeskPage = lazy(() => import("@/pages/app/macro/tabs/MacroDesk"));

// Options — sealed pending licensed data feed (Track B). Pages kept on disk; routes serve ComingSoon.
// To re-enable: restore lazy imports below, swap ComingSoon back in routes, set OPTIONS_ENABLED=true in constants/nav.ts
import OptionsComingSoon from "@/pages/app/ComingSoon";

// Portfolio
const MyPortfolioPage = lazy(() => import("@/pages/app/portfolio/MyPortfolioPage"));

// Watch List
const MyWatchlistPage = lazy(() => import("@/pages/app/watchlist/MyWatchlistPage"));

// AI
const AIMyPortfolio = lazy(() => import("@/pages/app/ai/MyPortfolio"));
const AIStockAnalyzer = lazy(() => import("@/pages/app/ai/StockAnalyzer"));
const AISectorAnalyzer = lazy(() => import("@/pages/app/ai/SectorAnalyzer"));
const AIMacroAnalyzer = lazy(() => import("@/pages/app/ai/macro-analyzer/MacroAnalyzer"));
const AIOptionsIntelligence = lazy(() => import("@/pages/app/ai/OptionsIntelligenceAI"));
const AIFlowScanner = lazy(() => import("@/pages/app/ai/flow-scanner"));
const AITop5 = lazy(() => import("@/pages/app/ai/Top5"));
// FINO AI: standalone AIAssistant page retired — /app/ai/assistant redirects to the AI Arena; the FINO AI side chat replaces it.
const CopilotTopOpportunitiesPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotTopOpportunitiesPage })));
const CopilotMacroPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotMacroPage })));
const CopilotAIAnalystPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotAIAnalystPage })));
const CopilotHoldingsPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotHoldingsPage })));
const CopilotRisksPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotRisksPage })));
const CopilotAIChatPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotAIChatPage })));
const CopilotSectorFlowPage = lazy(() => import("@/pages/app/ai/copilot/components/SectorFlowPage").then((m) => ({ default: m.SectorFlowPage })));

// Funding
const FundingOverview = lazy(() => import("@/pages/app/funding/Overview"));
const FundingBrokers = lazy(() => import("@/pages/app/funding/Brokers"));
const FundingAdvance = lazy(() => import("@/pages/app/funding/Advance"));
const FundingTransactions = lazy(() => import("@/pages/app/funding/Transactions"));

// LOADING COMPONENT — imported from @/components/ds/Spinner

// WRAPPERS
const SuspenseRoute = memo(({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <ErrorBoundary boundary="suspense-route">
    <Suspense fallback={fallback ?? <RouteSkeleton />}>{children}</Suspense>
  </ErrorBoundary>
));
SuspenseRoute.displayName = 'SuspenseRoute';

const LockedRoute = memo(({ domainId, children }: { domainId: string; children: React.ReactNode }) => (
  <DomainGuard domainId={domainId}>
    <SuspenseRoute>{children}</SuspenseRoute>
  </DomainGuard>
));
LockedRoute.displayName = 'LockedRoute';

// Redirects /app/etfs/:symbol → /app/etfs/:symbol/overview
// so the old bare-symbol URL keeps working after the section-based routing change.
function ETFSymbolRedirect() {
  const { symbol } = useParams<{ symbol: string }>();
  return <Navigate to={`/app/etfs/${symbol}/overview`} replace />;
}

// APP CONTENT
function AppContent() {
  // Consent-gated analytics: boots GA4 + PostHog only after user accepts cookies.
  useAnalytics();

  // Capture first-touch attribution on first render (runs once, idempotent).
  useEffect(() => { captureFirstTouch(); }, []);

  return (
    <>
      {/* Cookie consent banner — mounts once for all routes (public + authenticated) */}
      <CookieConsentBanner />
      {FEATURES.AFFILIATE_TRACKING && <Suspense fallback={null}><AffiliateTracker /></Suspense>}
      <Suspense fallback={null}>
        <WelcomeOffer />
      </Suspense>
      <Routes>
        {/* DEV-ONLY: Design system playground (tree-shaken in prod) */}
        {import.meta.env.DEV && (
          <Route path="/design-lab" element={<SuspenseRoute><DesignLab /></SuspenseRoute>} />
        )}
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<SuspenseRoute><LandingPage /></SuspenseRoute>} />
        {/* /pricing has no standalone page — the public pricing lives in the
            landing's #pricing section. Redirect direct hits there. */}
        <Route path="/pricing" element={<Navigate to="/#pricing" replace />} />
        <Route path="/login" element={<SuspenseRoute><Login /></SuspenseRoute>} />
        <Route path="/auth/login" element={<SuspenseRoute><Login /></SuspenseRoute>} />
        <Route path="/register" element={<SuspenseRoute><Register /></SuspenseRoute>} />
        <Route path="/auth/register" element={<SuspenseRoute><Register /></SuspenseRoute>} />
        <Route path="/forgot-password" element={<SuspenseRoute><ForgotPassword /></SuspenseRoute>} />
        <Route path="/auth/forgot-password" element={<SuspenseRoute><ForgotPassword /></SuspenseRoute>} />
        <Route path="/reset-password" element={<SuspenseRoute><ResetPassword /></SuspenseRoute>} />
        <Route path="/auth/reset-password" element={<SuspenseRoute><ResetPassword /></SuspenseRoute>} />
        {/* Post-signup welcome screen (top-level, no app nav) */}
        <Route path="/welcome" element={<ProtectedRoute><SuspenseRoute><WelcomeScreen /></SuspenseRoute></ProtectedRoute>} />
        <Route path="/about" element={<SuspenseRoute><AboutPage /></SuspenseRoute>} />
        <Route path="/contact" element={<SuspenseRoute><ContactPage /></SuspenseRoute>} />
        <Route path="/links" element={<SuspenseRoute><LinksPage /></SuspenseRoute>} />
        <Route path="/affiliate" element={FEATURES.AFFILIATE_TRACKING ? <SuspenseRoute><AffiliatePage /></SuspenseRoute> : <Navigate to="/" replace />} />
        <Route path="/journal" element={<SuspenseRoute><JournalPublicPage /></SuspenseRoute>} />
        <Route path="/academy" element={<SuspenseRoute><AcademyIndex /></SuspenseRoute>} />
        <Route path="/academy/topics/:topicSlug" element={<SuspenseRoute><AcademyTopicHub /></SuspenseRoute>} />
        <Route path="/academy/:moduleSlug" element={<SuspenseRoute><AcademyModule /></SuspenseRoute>} />
        <Route path="/academy/:moduleSlug/:chapterSlug" element={<SuspenseRoute><AcademyChapter /></SuspenseRoute>} />
        <Route path="/glossary" element={<SuspenseRoute><GlossaryIndex /></SuspenseRoute>} />
        <Route path="/glossary/:slug" element={<SuspenseRoute><GlossaryTerm /></SuspenseRoute>} />
        <Route path="/research" element={<SuspenseRoute><ResearchIndex /></SuspenseRoute>} />
        <Route path="/research/:ticker" element={<SuspenseRoute><TickerResearch /></SuspenseRoute>} />
        <Route path="/journal-copier" element={<SuspenseRoute><JournalCopierPage /></SuspenseRoute>} />
        <Route path="/best-trading-journal-for-tradovate" element={<SuspenseRoute><BestTradingJournalTradovate /></SuspenseRoute>} />
        <Route path="/warzone" element={<ProtectedRoute><SuspenseRoute><WarZonePage /></SuspenseRoute></ProtectedRoute>} />
        <Route path="/warzone-preview" element={<SuspenseRoute><WarZonePage /></SuspenseRoute>} />
        <Route path="/legal" element={<SuspenseRoute><LegalHub /></SuspenseRoute>} />
        <Route path="/legal/terms" element={<SuspenseRoute><TermsOfUse /></SuspenseRoute>} />
        <Route path="/legal/privacy" element={<SuspenseRoute><PrivacyPolicy /></SuspenseRoute>} />
        <Route path="/legal/disclaimer" element={<SuspenseRoute><Disclaimer /></SuspenseRoute>} />
        <Route path="/legal/copyright" element={<SuspenseRoute><Copyright /></SuspenseRoute>} />
        <Route path="/legal/cookies" element={<SuspenseRoute><CookiePolicy /></SuspenseRoute>} />
        <Route path="/legal/risk-disclosure" element={<SuspenseRoute><RiskDisclosure /></SuspenseRoute>} />
        <Route path="/legal/futures-risk" element={<SuspenseRoute><FuturesRiskDisclosure /></SuspenseRoute>} />
        <Route path="/legal/cftc-hypothetical-performance" element={<SuspenseRoute><CftcHypotheticalDisclosure /></SuspenseRoute>} />
        <Route path="/legal/testimonial-disclaimer" element={<SuspenseRoute><TestimonialDisclaimer /></SuspenseRoute>} />
        <Route path="/legal/affiliate-disclosure" element={<SuspenseRoute><AffiliateDisclosure /></SuspenseRoute>} />
        <Route path="/legal/refund" element={<SuspenseRoute><RefundPolicy /></SuspenseRoute>} />
        <Route path="/legal/dmca" element={<SuspenseRoute><DMCA /></SuspenseRoute>} />
        {/* Post-OAuth / post-email-confirmation landing. Supabase redirects here (allowlisted URL),
            then we forward to the proven onboarding screen. Was "/onboarding" — a route that never
            existed, which 404'd every Google sign-in/up. Unified with the email-signup destination. */}
        <Route path="/pricing-selection" element={<Navigate to="/welcome" replace />} />
        
        {/* PROTECTED ROUTES */}
        <Route path="/app" element={<ProtectedRoute><MentorViewProvider><SuspenseRoute><ProtectedAppLayout /></SuspenseRoute></MentorViewProvider></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/home" replace />} />
          <Route path="home" element={<SuspenseRoute><HomePage /></SuspenseRoute>} />

          {/* ALL MARKETS */}
          <Route path="all-markets/overview" element={<SuspenseRoute><AdminBetaGate><AllMarketsOverview /></AdminBetaGate></SuspenseRoute>} />
          <Route path="all-markets/chart" element={<SuspenseRoute><AllMarketsChart /></SuspenseRoute>} />
          <Route path="all-markets/summary" element={<SuspenseRoute><AllMarketsSummary /></SuspenseRoute>} />
          <Route path="all-markets/movers" element={<SuspenseRoute><AllMarketsMovers /></SuspenseRoute>} />
          <Route path="all-markets/sentiment" element={<SuspenseRoute><AllMarketsSentiment /></SuspenseRoute>} />
          <Route path="all-markets/calendar" element={<SuspenseRoute><AllMarketsCalendar /></SuspenseRoute>} />
          <Route path="all-markets/news" element={<SuspenseRoute><AllMarketsNews /></SuspenseRoute>} />
          <Route path="all-markets/heatmap" element={<SuspenseRoute><AllMarketsHeatmap /></SuspenseRoute>} />
          {/* Canonical Screener — cross-asset (Stocks/Crypto toggle), lives at the home/all-markets level */}
          <Route path="all-markets/screener" element={<SuspenseRoute><StocksScreener /></SuspenseRoute>} />
<Route path="all-markets/warzone" element={<SuspenseRoute><WarZonePage /></SuspenseRoute>} />
          <Route path="all-markets/affiliate" element={FEATURES.AFFILIATE_TRACKING ? <SuspenseRoute><AffiliateSmartPage /></SuspenseRoute> : <Navigate to="/app" replace />} />
          <Route path="all-markets/admin/support" element={<ProtectedAdminRoute><SuspenseRoute><AdminSupportTickets /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="all-markets/admin/support-ai" element={<ProtectedAdminRoute><SuspenseRoute><AdminSupportAiDrafts /></SuspenseRoute></ProtectedAdminRoute>} />
          {/* Legacy SiteDashboard URL — redirected to unified Admin CRM */}
          <Route path="all-markets/admin/site-dashboard" element={<Navigate to="/app/admin" replace />} />
          {/* Unified Admin CRM — Phase 0 ships Overview; later phases add more tabs */}
          <Route path="admin/*" element={<ProtectedAdminRoute><SuspenseRoute><AdminCRMShell /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="top-secret" element={<SuspenseRoute><TopSecretPage /></SuspenseRoute>} />
          <Route path="all-markets/top-secret" element={<SuspenseRoute><TopSecretPage /></SuspenseRoute>} />
          <Route path="top-secret/admin" element={<ProtectedAdminRoute><SuspenseRoute><TopSecretAdmin /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="all-markets/top-secret-admin" element={<ProtectedAdminRoute><SuspenseRoute><TopSecretAdmin /></SuspenseRoute></ProtectedAdminRoute>} />
          {/* Catalyst Intelligence Deck — admin Pattern Library (Tree #2) */}
          <Route path="admin/pattern-library" element={<ProtectedAdminRoute><SuspenseRoute><AdminPatternLibrary /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="admin/upcoming-events" element={<ProtectedAdminRoute><SuspenseRoute><AdminUpcomingEvents /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="admin/patterns" element={<ProtectedAdminRoute><SuspenseRoute><AdminPatternLibraryList /></SuspenseRoute></ProtectedAdminRoute>} />
          <Route path="all-markets/pricing" element={<SuspenseRoute><AllMarketsPricing /></SuspenseRoute>} />
          <Route path="plans" element={<SuspenseRoute><PlansPage /></SuspenseRoute>} />

          {/* OPTIONS — sealed pending licensed options data feed (Track B).
              Routes kept so direct URLs don't 404. Serve ComingSoon for all sub-paths.
              To re-enable: restore lazy imports + swap OptionsComingSoon back to real components. */}
          <Route path="options" element={<Navigate to="/app/options/chain" replace />} />
          <Route path="options/chain" element={<OptionsComingSoon title="Options Chain" description="Real-time options chain data is coming in a future release. We're securing the licensed data feed required to power this feature." />} />
          <Route path="options/flow" element={<OptionsComingSoon title="Options Flow" description="Block trades, sweeps, and unusual flow analysis are coming in a future release." />} />
          <Route path="options/volatility" element={<OptionsComingSoon title="Volatility" description="IV rank, skew, and term structure analysis are coming in a future release." />} />
          <Route path="options/strategy" element={<OptionsComingSoon title="Strategy Builder" description="Multi-leg options strategy analysis and P&L modeling are coming in a future release." />} />
          <Route path="options/simulator" element={<OptionsComingSoon title="Options Simulator" description="P&L scenarios, Greeks, and expiration modeling are coming in a future release." />} />
          <Route path="options/greeks-monitor" element={<OptionsComingSoon title="Greeks Monitor" description="Portfolio-level Greeks monitoring is coming in a future release." />} />
          <Route path="options/iv-rank" element={<OptionsComingSoon title="IV Rank / Percentile" description="IV rank and percentile screener are coming in a future release." />} />
          <Route path="options/oi-volume" element={<OptionsComingSoon title="OI / Volume" description="Open interest and volume analysis are coming in a future release." />} />
          <Route path="options/unusual-activity" element={<OptionsComingSoon title="Unusual Activity" description="Unusual options activity scanner is coming in a future release." />} />
          <Route path="options/earnings-iv-crush" element={<OptionsComingSoon title="Earnings IV Crush" description="Earnings volatility crush analysis is coming in a future release." />} />
          <Route path="options/shortcuts" element={<OptionsComingSoon title="Options Shortcuts" description="Quick-access options tools are coming in a future release." />} />

          {/* ETFs — live section (ETF Analyzer + multi-page section) */}
          <Route path="etfs" element={<Navigate to="/app/etfs/overview" replace />} />
          <Route path="etfs/overview"   element={<LockedRoute domainId="etfs"><ETFOverview /></LockedRoute>} />
          <Route path="etfs/directory"  element={<LockedRoute domainId="etfs"><ETFDirectory /></LockedRoute>} />
          <Route path="etfs/screener"   element={<LockedRoute domainId="etfs"><ETFScreener /></LockedRoute>} />
          <Route path="etfs/compare"    element={<LockedRoute domainId="etfs"><ETFCompare /></LockedRoute>} />
          <Route path="etfs/news"       element={<LockedRoute domainId="etfs"><ETFNews /></LockedRoute>} />
          {/* /app/etfs/:symbol → redirect to /app/etfs/:symbol/overview */}
          <Route path="etfs/:symbol" element={<LockedRoute domainId="etfs"><ETFSymbolRedirect /></LockedRoute>} />
          {/* /app/etfs/:symbol/:section → ETFLayout with inline header tabs */}
          <Route path="etfs/:symbol/:section" element={<LockedRoute domainId="etfs"><ETFLayout /></LockedRoute>} />
          {/* Legacy /app/etf/* → redirect to new /app/etfs/* */}
          <Route path="etf" element={<Navigate to="/app/etfs/overview" replace />} />
          <Route path="etf/overview"    element={<Navigate to="/app/etfs/overview"  replace />} />
          <Route path="etf/screener"    element={<Navigate to="/app/etfs/screener"  replace />} />
          <Route path="etf/holdings"    element={<Navigate to="/app/etfs/overview"  replace />} />
          <Route path="etf/flows"       element={<Navigate to="/app/etfs/overview"  replace />} />
          <Route path="etf/performance" element={<Navigate to="/app/etfs/overview"  replace />} />

          {/* STOCKS */}
          <Route path="stocks/overview" element={<LockedRoute domainId="stocks"><AdminBetaGate><StocksOverview /></AdminBetaGate></LockedRoute>} />
          {/* Screener now lives at the all-markets (home) level — see all-markets/screener below.
              Redirect keeps old bookmarks/links working. */}
          <Route path="stocks/screener" element={<Navigate to="/app/all-markets/screener" replace />} />
          {/* Stocks Earnings retired → Market Pulse (market breadth / sentiment / macro, free derived data).
              Old path redirects so existing links/bookmarks don't 404. */}
          <Route path="stocks/earnings" element={<Navigate to="/app/stocks/market-pulse" replace />} />
          <Route path="stocks/market-pulse" element={<LockedRoute domainId="stocks"><StocksMarketPulse /></LockedRoute>} />
          <Route path="stocks/movers" element={<LockedRoute domainId="stocks"><StocksMovers /></LockedRoute>} />
          <Route path="stocks/news" element={<LockedRoute domainId="stocks"><StocksNews /></LockedRoute>} />
          <Route path="stocks/sectors" element={<LockedRoute domainId="stocks"><StocksSectors /></LockedRoute>} />
          <Route path="stocks/sectors/:id" element={<LockedRoute domainId="stocks"><StocksSectorDetail /></LockedRoute>} />
          <Route path="stocks/catalysts" element={<LockedRoute domainId="stocks"><AdminBetaGate><StocksCatalysts /></AdminBetaGate></LockedRoute>} />
          {/* Stocks Upgrades/Downgrades — sealed: analyst-ratings source (Finnhub/FMP) not licensed for redistribution. Sealed pending licensed source.
              To re-enable: restore <LockedRoute domainId="stocks"><StocksUpgrades /></LockedRoute> and remove locked:true from nav.ts. */}
          <Route path="stocks/upgrades" element={<OptionsComingSoon title="Upgrades / Downgrades" description="Analyst ratings data is coming soon — we're securing a licensed data feed." />} />
          <Route path="stocks/valuation" element={<LockedRoute domainId="stocks"><AdminBetaGate><StocksValuation /></AdminBetaGate></LockedRoute>} />
          <Route path="stocks/sentiment" element={<LockedRoute domainId="stocks"><StocksSentiment /></LockedRoute>} />
          <Route path="stocks/insider"  element={<LockedRoute domainId="stocks"><StocksInsider  /></LockedRoute>} />
          <Route path="stocks/insiders" element={<LockedRoute domainId="stocks"><StocksInsiders /></LockedRoute>} />
          <Route path="stocks/insiders/:slug" element={<LockedRoute domainId="stocks"><StocksInsidersManager /></LockedRoute>} />
          <Route path="stocks/reports" element={<LockedRoute domainId="stocks"><StocksReports /></LockedRoute>} />
          <Route path="stocks/compare" element={<LockedRoute domainId="stocks"><StocksCompare /></LockedRoute>} />
          {/* stocks/watchlists now redirects to the real Watch List page under all-markets */}
          <Route path="stocks/watchlists" element={<Navigate to="/app/all-markets/watchlist" replace />} />
          
          {/* CRYPTO — 7 Consolidated Pages */}
          <Route path="crypto/overview" element={<LockedRoute domainId="crypto"><CryptoOverview /></LockedRoute>} />
          <Route path="crypto/coin/:coinId" element={<LockedRoute domainId="crypto"><CryptoCoinDetail /></LockedRoute>} />
          <Route path="crypto/screener" element={<LockedRoute domainId="crypto"><CryptoScreener /></LockedRoute>} />
          <Route path="crypto/derivatives" element={<LockedRoute domainId="crypto"><CryptoDerivatives /></LockedRoute>} />
          <Route path="crypto/sentiment" element={<LockedRoute domainId="crypto"><CryptoSentiment /></LockedRoute>} />
          <Route path="crypto/watchlist" element={<LockedRoute domainId="crypto"><CryptoWatchlist /></LockedRoute>} />
          <Route path="crypto/academy" element={<LockedRoute domainId="crypto"><CryptoAcademy /></LockedRoute>} />
          <Route path="crypto/defi-tvl" element={<LockedRoute domainId="crypto"><CryptoDefiTvl /></LockedRoute>} />
          <Route path="crypto/stablecoins" element={<LockedRoute domainId="crypto"><CryptoStablecoins /></LockedRoute>} />
          <Route path="crypto/heatmap" element={<LockedRoute domainId="crypto"><CryptoHeatmap /></LockedRoute>} />
          <Route path="crypto/whales" element={<LockedRoute domainId="crypto"><Navigate to="/app/crypto/whales/trades" replace /></LockedRoute>} />
          <Route path="crypto/whales/:signal" element={<LockedRoute domainId="crypto"><CryptoWhales /></LockedRoute>} />
          {/* Market Scanner is a fullscreen overlay — use a fullscreen-black loading
              fallback (chunk + auth) so the transition never flashes an app-shell skeleton. */}
          <Route path="crypto/scanner" element={<SuspenseRoute fallback={<div className="fixed inset-0 z-[100] bg-black" />}><AdminBetaGate fallback={<div className="fixed inset-0 z-[100] bg-black" />}><CryptoMarketScanner /></AdminBetaGate></SuspenseRoute>} />

          {/* TRADING ARENA — admin + beta only, full-screen workstation (Phase 0) */}
          <Route path="trading-arena/:section?" element={<SuspenseRoute><AdminBetaGate><TradingArenaPage /></AdminBetaGate></SuspenseRoute>} />

          {/* FUTURES: licensed-data-safe workspace only. No live CME quotes/charts/DOM/OI fetches. */}
          <Route path="futures" element={<Navigate to="/app/futures/overview" replace />} />
          <Route path="futures/overview" element={<LockedRoute domainId="futures"><FuturesOverview /></LockedRoute>} />
          <Route path="futures/contracts" element={<LockedRoute domainId="futures"><FuturesContracts /></LockedRoute>} />
          <Route path="futures/curves" element={<LockedRoute domainId="futures"><FuturesCurves /></LockedRoute>} />
          <Route path="futures/positioning" element={<LockedRoute domainId="futures"><FuturesPositioning /></LockedRoute>} />
          <Route path="futures/tools" element={<LockedRoute domainId="futures"><FuturesTools /></LockedRoute>} />
          <Route path="futures/open-interests" element={<Navigate to="/app/futures/positioning" replace />} />
          <Route path="futures/calendar" element={<Navigate to="/app/futures/overview" replace />} />
          
          {/* FOREX */}
          <Route path="forex/overview" element={<LockedRoute domainId="forex"><ForexOverview /></LockedRoute>} />
          <Route path="forex/strength" element={<LockedRoute domainId="forex"><ForexStrength /></LockedRoute>} />
          <Route path="forex/correlation" element={<LockedRoute domainId="forex"><ForexCorrelation /></LockedRoute>} />
          <Route path="forex/pairs" element={<LockedRoute domainId="forex"><ForexPairs /></LockedRoute>} />
          <Route path="forex/rates" element={<LockedRoute domainId="forex"><ForexRates /></LockedRoute>} />
          <Route path="forex/deep-analysis" element={<LockedRoute domainId="forex"><ForexDeepAnalysis /></LockedRoute>} />
          <Route path="forex/alerts" element={<LockedRoute domainId="forex"><ForexAlerts /></LockedRoute>} />
          <Route path="forex/news" element={<LockedRoute domainId="forex"><ForexNews /></LockedRoute>} />
          <Route path="forex/heatmap" element={<LockedRoute domainId="forex"><ForexHeatmap /></LockedRoute>} />
          <Route path="forex/tools" element={<LockedRoute domainId="forex"><ForexTools /></LockedRoute>} />
          <Route path="forex/pair/:symbol" element={<LockedRoute domainId="forex"><ForexPair /></LockedRoute>} />
          <Route path="forex/cb-watch" element={<LockedRoute domainId="forex"><ForexCBWatch /></LockedRoute>} />
          <Route path="forex/cot" element={<LockedRoute domainId="forex"><ForexCOT /></LockedRoute>} />
          <Route path="forex/currency/:code" element={<LockedRoute domainId="forex"><ForexCurrency /></LockedRoute>} />
          
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
          <Route path="commodities/markets" element={<LockedRoute domainId="commodities"><CommoditiesMarkets /></LockedRoute>} />
          <Route path="commodities/macro" element={<LockedRoute domainId="commodities"><CommoditiesMacro /></LockedRoute>} />
          <Route path="commodities/positioning" element={<LockedRoute domainId="commodities"><CommoditiesPositioning /></LockedRoute>} />
          <Route path="commodities/watchlist" element={<LockedRoute domainId="commodities"><CommoditiesWatchlist /></LockedRoute>} />
          
          {/* MACRO — 7-tab containers */}
          <Route path="macro" element={<Navigate to="/app/macro/pulse" replace />} />
          <Route path="macro/pulse" element={<LockedRoute domainId="macro"><MacroPulse /></LockedRoute>} />
          <Route path="macro/rates" element={<LockedRoute domainId="macro"><MacroRatesCentralBanks /></LockedRoute>} />
          <Route path="macro/indicators" element={<LockedRoute domainId="macro"><MacroInflationGrowth /></LockedRoute>} />
          <Route path="macro/global" element={<LockedRoute domainId="macro"><MacroGlobalMarkets /></LockedRoute>} />
          <Route path="macro/risk" element={<LockedRoute domainId="macro"><MacroRiskRegime /></LockedRoute>} />
          <Route path="macro/desk" element={<LockedRoute domainId="macro"><MacroDeskPage /></LockedRoute>} />

          {/* MACRO — redirects for old paths */}
          <Route path="macro/overview" element={<Navigate to="/app/macro/pulse" replace />} />
          <Route path="macro/cross-asset" element={<Navigate to="/app/macro/global?view=cross-asset" replace />} />
          <Route path="macro/global-heatmap" element={<Navigate to="/app/macro/global?view=heatmap" replace />} />
          <Route path="macro/models" element={<Navigate to="/app/macro/risk?view=models" replace />} />
          <Route path="macro/reports" element={<Navigate to="/app/macro/desk?view=reports" replace />} />
          <Route path="macro/sentiment" element={<Navigate to="/app/macro/desk?view=sentiment" replace />} />
          <Route path="macro/news" element={<Navigate to="/app/macro/desk?view=news" replace />} />
          <Route path="macro/liquidity" element={<Navigate to="/app/macro/risk?view=liquidity" replace />} />
          <Route path="macro/real-yields" element={<Navigate to="/app/macro/rates?view=real-yields" replace />} />
          <Route path="macro/credit-spreads" element={<Navigate to="/app/macro/rates?view=credit-spreads" replace />} />
          
          {/* AI — legacy /app/ai/copilot/* routes redirect to /copilot/* standalone shell */}
          <Route path="ai/copilot" element={<Navigate to="/copilot" replace />} />
          <Route path="ai/copilot/top-opportunities" element={<Navigate to="/copilot/top-opportunities" replace />} />
          <Route path="ai/copilot/macro" element={<Navigate to="/copilot/macro" replace />} />
          <Route path="ai/copilot/sector-flow" element={<Navigate to="/copilot/quant-flow" replace />} />
          <Route path="ai/copilot/quant-flow" element={<Navigate to="/copilot/quant-flow" replace />} />
          <Route path="ai/copilot/ai-analyst" element={<Navigate to="/copilot/ai-analyst" replace />} />
          <Route path="ai/copilot/holdings" element={<Navigate to="/copilot/holdings" replace />} />
          <Route path="ai/copilot/risks" element={<Navigate to="/copilot/risks" replace />} />
          <Route path="ai/copilot/ai-chat" element={<Navigate to="/copilot/ai-chat" replace />} />
          <Route path="ai/my-portfolio" element={<Navigate to="/copilot" replace />} />
          <Route path="ai/stock-analyzer" element={<SuspenseRoute><AIStockAnalyzer /></SuspenseRoute>} />
          <Route path="ai/sector-analyzer" element={<SuspenseRoute><AISectorAnalyzer /></SuspenseRoute>} />
          <Route path="ai/macro-analyzer" element={<SuspenseRoute><AIMacroAnalyzer /></SuspenseRoute>} />
          <Route path="ai/options-intelligence" element={<SuspenseRoute><AIOptionsIntelligence /></SuspenseRoute>} />
          <Route path="ai/flow-scanner" element={<SuspenseRoute><AIFlowScanner /></SuspenseRoute>} />
          <Route path="ai/top-5" element={<SuspenseRoute><AITop5 /></SuspenseRoute>} />
          <Route path="ai/upcoming-events" element={<SuspenseRoute><UpcomingEventsView /></SuspenseRoute>} />
          {/* FINO AI: legacy AI Assistant page → redirect; chat now opens via the FINO AI side widget. */}
          <Route path="ai/assistant" element={<Navigate to="/app/ai/stock-analyzer" replace />} />
          {/* MY PORTFOLIO — lives under all-markets so Markets chrome stays visible */}
          <Route path="all-markets/portfolio" element={<SuspenseRoute><MyPortfolioPage /></SuspenseRoute>} />
          {/* Redirect old /app/portfolio links to the new canonical URL */}
          <Route path="portfolio" element={<Navigate to="/app/all-markets/portfolio" replace />} />
          {/* MY WATCH LIST — canonical URL under all-markets so Markets chrome stays visible */}
          <Route path="all-markets/watchlist" element={<SuspenseRoute><MyWatchlistPage /></SuspenseRoute>} />

          {/* JOURNAL */}
          <Route path="journal" element={<Navigate to="/app/journal/overview" replace />} />
          <Route path="journal/overview" element={<JournalRoute><JournalOverview /></JournalRoute>} />
<Route path="journal/new" element={<JournalRoute><New /></JournalRoute>} />
<Route path="journal/my-trades" element={<JournalRoute><JournalMyTrades /></JournalRoute>} />
<Route path="journal/strategies" element={<JournalRoute><Strategies /></JournalRoute>} />
<Route path="journal/strategies/:id" element={<JournalRoute><StrategyDetailView /></JournalRoute>} />
<Route path="journal/scenarios" element={<JournalRoute><JournalScenarios /></JournalRoute>} />
<Route path="journal/community" element={<JournalRoute><JournalCommunity /></JournalRoute>} />
{/* journal/floor removed — competition lives in Community › Leaderboard tab */}
<Route path="journal/floor" element={<Navigate to="/app/floor/feed" replace />} />
<Route path="journal/academy" element={<JournalRoute><JournalAcademy /></JournalRoute>} />          
<Route path="journal/settings" element={<JournalRoute><JournalSettings /></JournalRoute>} />
<Route path="journal/pricing" element={<JournalRoute><SuspenseRoute><JournalPricingPage /></SuspenseRoute></JournalRoute>} />
<Route path="journal/import" element={<JournalRoute><JournalImport /></JournalRoute>} />
<Route path="journal/export" element={<JournalRoute><JournalExport /></JournalRoute>} />
<Route path="journal/notes" element={<JournalRoute><JournalNotes /></JournalRoute>} />
{/* "Statistics" retired — merged into the unified Reports & Stats hub. Redirect legacy links. */}
<Route path="journal/analytics" element={<Navigate to="/app/journal/reports/overview" replace />} />
{/* Legacy keyword/template "AI Review" retired; redirect to the real LLM-grounded coach (finotaur-ai) */}
<Route path="journal/ai-review" element={<Navigate to="/app/journal/finotaur-ai" replace />} />
<Route path="journal/reports" element={<JournalRoute><JournalReportsLayout /></JournalRoute>}>
  <Route index element={<Navigate to="/app/journal/reports/overview" replace />} />
  <Route path="overview" element={<JournalReportsOverview />} />
  <Route path="progress" element={<JournalReportsProgress />} />
  <Route path="day-view" element={<JournalReportsDayView />} />
  <Route path="breakdowns" element={<JournalReportsBreakdowns />} />
  <Route path="options" element={<JournalReportsOptions />} />
  <Route path="calendar" element={<JournalReportsAnnualCalendar />} />
  <Route path="compare" element={<JournalReportsCompare />} />
  <Route path="scores" element={<JournalReportsScores />} />
  <Route path="summary" element={<JournalReportsSummary />} />
  <Route path="recaps" element={<JournalReportsRecaps />} />
  <Route path="performance" element={<JournalReportsPerformance />} />
</Route>
<Route path="journal/calendar" element={<JournalRoute><JournalCalendar /></JournalRoute>} />
<Route path="journal/performance" element={<JournalRoute><JournalPerformance /></JournalRoute>} />
<Route path="journal/prop-firms" element={<JournalRoute><PropFirmsPage /></JournalRoute>} />
<Route path="journal/trade-copier" element={<Navigate to="/app/automation/copier" replace />} />
<Route path="journal/copy-trading" element={<Navigate to="/app/automation/copier" replace />} />
{/* Phase 3 AI — hidden page, no nav entry yet (Phase 7 swaps nav) */}
<Route path="journal/finotaur-ai" element={<JournalRoute><FinotaurAI /></JournalRoute>} />
{/* journal/mentor → floor/mentor (legacy redirect) */}
<Route path="journal/mentor" element={<Navigate to="/app/mentor/mode" replace />} />
<Route path="journal/trade-compare" element={<JournalRoute><TradeCompare /></JournalRoute>} />
<Route path="journal/:id" element={<JournalRoute><JournalTradeDetail /></JournalRoute>} />

        {/* THE FLOOR — Feed / Leaderboard / DM (beta/admin-only) */}
        <Route path="floor" element={<Navigate to="/app/floor/feed" replace />} />
        <Route path="floor/feed" element={<SuspenseRoute><AdminBetaGate><FloorFeed /></AdminBetaGate></SuspenseRoute>} />
        <Route path="floor/leaderboard" element={<SuspenseRoute><AdminBetaGate><FloorLeaderboard /></AdminBetaGate></SuspenseRoute>} />
        <Route path="floor/dm" element={<SuspenseRoute><AdminBetaGate><DirectMessages /></AdminBetaGate></SuspenseRoute>} />
        {/* legacy redirect: old community URL → feed */}
        <Route path="floor/community" element={<Navigate to="/app/floor/feed" replace />} />

        {/* MENTOR — Mentor Mode + Rooms (beta/admin-only) */}
        <Route path="mentor" element={<Navigate to="/app/mentor/mode" replace />} />
        <Route path="mentor/mode" element={<SuspenseRoute><AdminBetaGate><Mentor /></AdminBetaGate></SuspenseRoute>} />
        <Route path="mentor/rooms" element={<SuspenseRoute><AdminBetaGate><MentorshipSpaces /></AdminBetaGate></SuspenseRoute>} />
        <Route path="mentor/rooms/:id" element={<SuspenseRoute><AdminBetaGate><SpaceDetail /></AdminBetaGate></SuspenseRoute>} />
        {/* legacy redirects: old /app/floor/* mentor+rooms → /app/mentor/* */}
        <Route path="floor/mentor" element={<Navigate to="/app/mentor/mode" replace />} />
        <Route path="floor/rooms" element={<Navigate to="/app/mentor/rooms" replace />} />
        <Route path="floor/rooms/:id" element={<SuspenseRoute><AdminBetaGate><SpaceDetail /></AdminBetaGate></SuspenseRoute>} />

          {/* BACKTEST */}
          <Route path="journal/backtest/auto" element={<BacktestRoute><AutoBacktest /></BacktestRoute>} />
          <Route path="journal/backtest/landing" element={<BacktestRoute><BacktestLanding /></BacktestRoute>} />
          <Route path="journal/backtest/overview" element={<BacktestRoute><BacktestOverview /></BacktestRoute>} />
          <Route path="journal/backtest/chart" element={<BacktestRoute><BacktestChart /></BacktestRoute>} />
          <Route path="journal/backtest/results" element={<BacktestRoute><BacktestResults /></BacktestRoute>} />
          <Route path="journal/backtest/trades" element={<BacktestRoute><BacktestTrades /></BacktestRoute>} />
          <Route path="journal/backtest/builder" element={<BacktestRoute><BacktestBuilder /></BacktestRoute>} />
          <Route path="journal/backtest/analytics" element={<BacktestRoute><BacktestAnalytics /></BacktestRoute>} />
          <Route path="journal/backtest/new" element={<BacktestRoute><BacktestOverview /></BacktestRoute>} />

          {/* AFFILIATE CENTER — gated by FEATURES.AFFILIATE_TRACKING (re-enable for Stripe migration) */}
          {FEATURES.AFFILIATE_TRACKING && (
            <>
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
            </>
          )}

          {/* BACKTEST BACKWARD COMPAT */}
          <Route path="backtest/auto" element={<BacktestRoute><AutoBacktest /></BacktestRoute>} />
          <Route path="backtest/landing" element={<BacktestRoute><BacktestLanding /></BacktestRoute>} />
          <Route path="backtest/overview" element={<BacktestRoute><BacktestOverview /></BacktestRoute>} />
          <Route path="backtest/chart" element={<BacktestRoute><BacktestChart /></BacktestRoute>} />
          <Route path="backtest/results" element={<BacktestRoute><BacktestResults /></BacktestRoute>} />
          <Route path="backtest/builder" element={<BacktestRoute><BacktestBuilder /></BacktestRoute>} />
          <Route path="backtest/analytics" element={<BacktestRoute><BacktestAnalytics /></BacktestRoute>} />
          
          {/* TRADE COPIER — Phase 1 unification: all copy-trade/* routes redirect to /app/automation/copier */}
          <Route path="copy-trade/overview"     element={<Navigate to="/app/automation/copier" replace />} />
          <Route path="copy-trade/trade-copier" element={<Navigate to="/app/automation/copier" replace />} />
          <Route path="copy-trade/manage-risk"  element={<Navigate to="/app/automation/copier" replace />} />
          <Route path="copy-trade/top-traders"  element={<Navigate to="/app/automation/copier" replace />} />
          <Route path="copy-trade/strategies"   element={<Navigate to="/app/automation/copier" replace />} />
          <Route path="copy-trade/portfolios"   element={<Navigate to="/app/automation/copier" replace />} />
          <Route path="copy-trade/leaderboard"  element={<Navigate to="/app/automation/copier" replace />} />
          <Route path="copy-trade/my-copying"   element={<Navigate to="/app/automation/copier" replace />} />
          <Route path="copy-trade/insights"     element={<Navigate to="/app/automation/copier" replace />} />
          
          {/* FUNDING */}
          <Route path="funding/overview" element={<LockedRoute domainId="funding"><FundingOverview /></LockedRoute>} />
          <Route path="funding/brokers" element={<LockedRoute domainId="funding"><FundingBrokers /></LockedRoute>} />
          <Route path="funding/advance" element={<LockedRoute domainId="funding"><FundingAdvance /></LockedRoute>} />
          <Route path="funding/transactions" element={<LockedRoute domainId="funding"><FundingTransactions /></LockedRoute>} />

          {/* AUTOMATION — web config layer (admin/beta only, Session 1: no execution) */}
          <Route path="automation" element={<SuspenseRoute><AdminBetaGate><AutomationShell /></AdminBetaGate></SuspenseRoute>}>
            <Route index element={<Navigate to="risk" replace />} />
            <Route path="risk"   element={<SuspenseRoute><AutomationRiskTab /></SuspenseRoute>} />
            <Route path="copier" element={<SuspenseRoute><AutomationCopierTab /></SuspenseRoute>} />
            <Route path="agent"  element={<SuspenseRoute><AutomationAgentTab /></SuspenseRoute>} />
          </Route>

          <Route path="settings" element={<SuspenseRoute><SettingsShell /></SuspenseRoute>}>
            <Route index element={<Navigate to="account" replace />} />
            <Route path="account" element={<SuspenseRoute><AccountTab /></SuspenseRoute>} />
            <Route path="billing" element={<SuspenseRoute><BillingTab /></SuspenseRoute>} />
            <Route path="notifications" element={<SuspenseRoute><NotificationsTab /></SuspenseRoute>} />
            <Route path="security" element={<SuspenseRoute><SecurityTab /></SuspenseRoute>} />
            <Route path="the-floor" element={<SuspenseRoute><TheFloorTab /></SuspenseRoute>} />
          </Route>
        </Route>

        {/* COPILOT STANDALONE SHELL — opens in new tab, no TopNav/SubNav */}
        <Route path="/copilot" element={<ProtectedRoute><SuspenseRoute><CopilotStandaloneLayout /></SuspenseRoute></ProtectedRoute>}>
          <Route index element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><AIMyPortfolio /></BetaRoute>} />
          <Route path="top-opportunities" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotTopOpportunitiesPage /></BetaRoute>} />
          <Route path="macro" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotMacroPage /></BetaRoute>} />
          <Route path="quant-flow" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotSectorFlowPage /></BetaRoute>} />
          <Route path="sector-flow" element={<Navigate to="/copilot/quant-flow" replace />} />
          <Route path="ai-analyst" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotAIAnalystPage /></BetaRoute>} />
          <Route path="holdings" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotHoldingsPage /></BetaRoute>} />
          <Route path="risks" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotRisksPage /></BetaRoute>} />
          <Route path="ai-chat" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotAIChatPage /></BetaRoute>} />
        </Route>

        {/* DEV-ONLY: public screen-verification for admin SEO widget */}
        <Route path="/__dev/seo-analytics" element={<SeoAnalyticsDevPage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Suspense fallback={null}>
        <SupportWidget />
        <FinoChatDrawer />
      </Suspense>
    </>
  );
}

// MAIN APP
export const App = () => (
  <GlobalErrorBoundary>
    <AppQueryProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PlanChangeConfirmHost />
          <BrowserRouter>
            <ScrollToTop />
            <AuthProvider>
              <TimezoneProvider>
                <RiskSettingsRealtimeProvider>
                  <ImpersonationProvider>
                    <FinoChatProvider>
                      <AppContent />
                    </FinoChatProvider>
                  </ImpersonationProvider>
                </RiskSettingsRealtimeProvider>
              </TimezoneProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AppQueryProvider>
  </GlobalErrorBoundary>
);

export default App;
