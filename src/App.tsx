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
import { CopilotStandaloneLayout } from "@/layouts/CopilotStandaloneLayout";
import { ProtectedAdminRoute } from "@/components/ProtectedAdminRoute";
import { Suspense, memo } from "react";
import { lazy } from "@/lib/lazyWithRetry";
import { JournalRoute } from "@/components/routes/JournalRoute";
import JournalPublicPage from "@/pages/JournalPublicPage";
import GlossaryIndex from "@/pages/glossary/GlossaryIndex";
import GlossaryTerm from "@/pages/glossary/GlossaryTerm";
import JournalCopierPage from "@/pages/JournalCopierPage";


// 🔥 ROUTE PROTECTION COMPONENTS - Imported from separate files to use AuthProvider correctly
import { BacktestRoute } from "@/components/routes/BacktestRoute";
import { AffiliateRoute } from "@/components/routes/AffiliateRoute";
import { BetaRoute } from "@/components/routes/BetaRoute";

// 🎯 Guided Tour
import GuidedTour from "@/components/onboarding/GuidedTour";
import WelcomeOffer from "@/components/onboarding/WelcomeOffer";
import { WelcomePopup } from "@/components/WelcomePopup";
import WelcomeScreen from "@/pages/onboarding/WelcomeScreen";

import '@/scripts/migrationRunner';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
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

import SupportWidget from "@/components/SupportWidget";
import { AffiliateTracker } from "@/features/affiliate/components/AffiliateTracker";
import { FEATURES } from "@/config/features";

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
import LinksPage from "@/pages/LinksPage";
import { TermsOfUse, PrivacyPolicy, Disclaimer, Copyright, CookiePolicy, RiskDisclosure, FuturesRiskDisclosure, CftcHypotheticalDisclosure, TestimonialDisclaimer, AffiliateDisclosure, RefundPolicy, DMCA, LegalHub } from "@/components/legal";
import ScrollToTop from "@/components/ScrollToTop";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { useAnalytics } from "@/lib/analytics";

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
const JournalPricingPage = lazy(() => import("@/pages/app/journal/JournalPricingPage"));
const PropFirmsPage = lazy(() => import('@/pages/app/journal/PropFirmsPage'));
const PaymentSuccessPage = lazy(() => import("@/pages/app/journal/PaymentSuccessPage"));
const PaymentFailurePage = lazy(() => import("@/pages/app/journal/PaymentFailurePage"));
const HeatmapPage = lazy(() => import("@/pages/HeatmapPage"));
const DesignLab = lazy(() => import("@/pages/DesignLab"));

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
const TradeCopier = lazy(() => import("@/pages/app/journal/TradeCopier"));

// Backtest Pages
const BacktestLanding = lazy(() => import("@/pages/app/journal/backtest/BacktestLanding"));
const BacktestOverview = lazy(() => import("@/pages/app/journal/backtest/Overview"));
const BacktestChart = lazy(() => import("@/pages/app/journal/backtest/Chart"));
const BacktestResults = lazy(() => import("@/pages/app/journal/backtest/Results"));
const BacktestBuilder = lazy(() => import("@/pages/app/journal/backtest/Builder"));
const BacktestAnalytics = lazy(() => import("@/pages/app/journal/backtest/Analytics"));
const BacktestTrades = lazy(() => import("@/pages/app/journal/backtest/BacktestTrades"));

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

// Crypto — 7 Consolidated Pages
const CryptoOverview = lazy(() => import("@/pages/app/crypto/Overview"));
const CryptoCoinDetail = lazy(() => import("@/pages/app/crypto/CoinDetail"));
const CryptoScreener = lazy(() => import("@/pages/app/crypto/Screener"));
const CryptoDerivatives = lazy(() => import("@/pages/app/crypto/Derivatives"));
const CryptoSentiment = lazy(() => import("@/pages/app/crypto/Sentiment"));
const CryptoWatchlist = lazy(() => import("@/pages/app/crypto/Watchlist"));
const CryptoAcademy = lazy(() => import("@/pages/app/crypto/Academy"));

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
const AIMyPortfolio = lazy(() => import("@/pages/app/ai/MyPortfolio"));
const AIStockAnalyzer = lazy(() => import("@/pages/app/ai/StockAnalyzer"));
const AISectorAnalyzer = lazy(() => import("@/pages/app/ai/SectorAnalyzer"));
const AIMacroAnalyzer = lazy(() => import("@/pages/app/ai/macro-analyzer/MacroAnalyzer"));
const AIOptionsIntelligence = lazy(() => import("@/pages/app/ai/OptionsIntelligenceAI"));
const AIFlowScanner = lazy(() => import("@/pages/app/ai/flow-scanner"));
const AITop5 = lazy(() => import("@/pages/app/ai/Top5"));
const AIAssistant = lazy(() => import("@/pages/app/ai/AIAssistant"));
const CopilotTopOpportunitiesPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotTopOpportunitiesPage })));
const CopilotMacroPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotMacroPage })));
const CopilotAIAnalystPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotAIAnalystPage })));
const CopilotHoldingsPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotHoldingsPage })));
const CopilotRisksPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotRisksPage })));
const CopilotAIChatPage = lazy(() => import("@/pages/app/ai/copilot/CopilotSectionPages").then((m) => ({ default: m.CopilotAIChatPage })));

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
  // Consent-gated analytics: boots GA4 + PostHog only after user accepts cookies.
  useAnalytics();

  return (
    <>
      {/* Cookie consent banner — mounts once for all routes (public + authenticated) */}
      <CookieConsentBanner />
      {FEATURES.AFFILIATE_TRACKING && <AffiliateTracker />}
      {/* 🎯 Guided Tour Overlay - renders on top of everything */}
      <GuidedTour />
      <WelcomeOffer />
      {/* Risk Setup popup — self-gated: only on /app/journal/* + 1h after onboarding completion */}
      <WelcomePopup />
      <Routes>
        {/* DEV-ONLY: Design system playground (tree-shaken in prod) */}
        {import.meta.env.DEV && (
          <Route path="/design-lab" element={<DesignLab />} />
        )}
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
        {/* Post-signup welcome screen (top-level, no app nav) */}
        <Route path="/welcome" element={<ProtectedRoute><WelcomeScreen /></ProtectedRoute>} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/links" element={<LinksPage />} />
        <Route path="/affiliate" element={FEATURES.AFFILIATE_TRACKING ? <AffiliatePage /> : <Navigate to="/" replace />} />
        <Route path="/journal" element={<JournalPublicPage />} />
        <Route path="/glossary" element={<GlossaryIndex />} />
        <Route path="/glossary/:slug" element={<GlossaryTerm />} />
        <Route path="/journal-copier" element={<JournalCopierPage />} />
        <Route path="/warzone" element={<ProtectedRoute><SuspenseRoute><WarZonePage /></SuspenseRoute></ProtectedRoute>} />
        <Route path="/warzone-preview" element={<SuspenseRoute><WarZonePage /></SuspenseRoute>} />
        <Route path="/legal" element={<LegalHub />} />
        <Route path="/legal/terms" element={<TermsOfUse />} />
        <Route path="/legal/privacy" element={<PrivacyPolicy />} />
        <Route path="/legal/disclaimer" element={<Disclaimer />} />
        <Route path="/legal/copyright" element={<Copyright />} />
        <Route path="/legal/cookies" element={<CookiePolicy />} />
        <Route path="/legal/risk-disclosure" element={<RiskDisclosure />} />
        <Route path="/legal/futures-risk" element={<FuturesRiskDisclosure />} />
        <Route path="/legal/cftc-hypothetical-performance" element={<CftcHypotheticalDisclosure />} />
        <Route path="/legal/testimonial-disclaimer" element={<TestimonialDisclaimer />} />
        <Route path="/legal/affiliate-disclosure" element={<AffiliateDisclosure />} />
        <Route path="/legal/refund" element={<RefundPolicy />} />
        <Route path="/legal/dmca" element={<DMCA />} />
        <Route path="/pricing-selection" element={<Navigate to="/onboarding" replace />} />
        
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
          
          {/* CRYPTO — 7 Consolidated Pages */}
          <Route path="crypto/overview" element={<LockedRoute domainId="crypto"><CryptoOverview /></LockedRoute>} />
          <Route path="crypto/coin/:coinId" element={<LockedRoute domainId="crypto"><CryptoCoinDetail /></LockedRoute>} />
          <Route path="crypto/screener" element={<LockedRoute domainId="crypto"><CryptoScreener /></LockedRoute>} />
          <Route path="crypto/derivatives" element={<LockedRoute domainId="crypto"><CryptoDerivatives /></LockedRoute>} />
          <Route path="crypto/sentiment" element={<LockedRoute domainId="crypto"><CryptoSentiment /></LockedRoute>} />
          <Route path="crypto/watchlist" element={<LockedRoute domainId="crypto"><CryptoWatchlist /></LockedRoute>} />
          <Route path="crypto/academy" element={<LockedRoute domainId="crypto"><CryptoAcademy /></LockedRoute>} />
          
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
          
          {/* AI — legacy /app/ai/copilot/* routes redirect to /copilot/* standalone shell */}
          <Route path="ai/copilot" element={<Navigate to="/copilot" replace />} />
          <Route path="ai/copilot/top-opportunities" element={<Navigate to="/copilot/top-opportunities" replace />} />
          <Route path="ai/copilot/macro" element={<Navigate to="/copilot/macro" replace />} />
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
          <Route path="ai/assistant" element={<SuspenseRoute><AIAssistant /></SuspenseRoute>} />
          {/* JOURNAL */}
          <Route path="journal" element={<Navigate to="/app/journal/overview" replace />} />
          <Route path="journal/overview" element={<JournalRoute><JournalOverview /></JournalRoute>} />
<Route path="journal/new" element={<JournalRoute><New /></JournalRoute>} />
<Route path="journal/my-trades" element={<JournalRoute><JournalMyTrades /></JournalRoute>} />
<Route path="journal/strategies" element={<JournalRoute><Strategies /></JournalRoute>} />
<Route path="journal/strategies/:id" element={<JournalRoute><StrategyDetailView /></JournalRoute>} />
<Route path="journal/scenarios" element={<JournalRoute><JournalScenarios /></JournalRoute>} />
<Route path="journal/community" element={<JournalRoute><JournalCommunity /></JournalRoute>} />
<Route path="journal/academy" element={<JournalRoute><JournalAcademy /></JournalRoute>} />          
<Route path="journal/settings" element={<JournalRoute><JournalSettings /></JournalRoute>} />
<Route path="journal/pricing" element={<JournalRoute><SuspenseRoute><JournalPricingPage /></SuspenseRoute></JournalRoute>} />
<Route path="journal/import" element={<JournalRoute><JournalImport /></JournalRoute>} />
<Route path="journal/export" element={<JournalRoute><JournalExport /></JournalRoute>} />
<Route path="journal/notes" element={<JournalRoute><JournalNotes /></JournalRoute>} />
<Route path="journal/analytics" element={<JournalRoute><JournalAnalytics /></JournalRoute>} />
<Route path="journal/ai-review" element={<JournalRoute><JournalAIReview /></JournalRoute>} />
<Route path="journal/calendar" element={<JournalRoute><JournalCalendar /></JournalRoute>} />
<Route path="journal/performance" element={<JournalRoute><JournalPerformance /></JournalRoute>} />
<Route path="journal/prop-firms" element={<JournalRoute><PropFirmsPage /></JournalRoute>} />
<Route path="journal/trade-copier" element={<Navigate to="/app/copy-trade/overview" replace />} />
<Route path="journal/copy-trading" element={<Navigate to="/app/copy-trade/overview" replace />} />
<Route path="journal/:id" element={<JournalRoute><JournalTradeDetail /></JournalRoute>} />

          {/* BACKTEST */}
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
          <Route path="backtest/analytics" element={<BacktestRoute><BacktestAnalytics /></BacktestRoute>} />
          
          {/* TRADE COPIER */}
          {/* TRADE COPIER — beta-only (gated via DomainGuard, domain copy-trade has beta:true in constants/nav.ts) */}
          <Route path="copy-trade/overview" element={<LockedRoute domainId="copy-trade"><TradeCopier /></LockedRoute>} />
          <Route path="copy-trade/trade-copier" element={<LockedRoute domainId="copy-trade"><TradeCopier /></LockedRoute>} />
          <Route path="copy-trade/manage-risk" element={<LockedRoute domainId="copy-trade"><TradeCopier /></LockedRoute>} />
          <Route path="copy-trade/top-traders" element={<Navigate to="/app/copy-trade/overview" replace />} />
          <Route path="copy-trade/strategies" element={<Navigate to="/app/copy-trade/overview" replace />} />
          <Route path="copy-trade/portfolios" element={<Navigate to="/app/copy-trade/overview" replace />} />
          <Route path="copy-trade/leaderboard" element={<Navigate to="/app/copy-trade/overview" replace />} />
          <Route path="copy-trade/my-copying" element={<Navigate to="/app/copy-trade/overview" replace />} />
          <Route path="copy-trade/insights" element={<Navigate to="/app/copy-trade/overview" replace />} />
          
          {/* FUNDING */}
          <Route path="funding/overview" element={<LockedRoute domainId="funding"><FundingOverview /></LockedRoute>} />
          <Route path="funding/brokers" element={<LockedRoute domainId="funding"><FundingBrokers /></LockedRoute>} />
          <Route path="funding/advance" element={<LockedRoute domainId="funding"><FundingAdvance /></LockedRoute>} />
          <Route path="funding/transactions" element={<LockedRoute domainId="funding"><FundingTransactions /></LockedRoute>} />
          
          <Route path="settings" element={<SuspenseRoute><SettingsLayout /></SuspenseRoute>} />
        </Route>

        {/* COPILOT STANDALONE SHELL — opens in new tab, no TopNav/SubNav */}
        <Route path="/copilot" element={<ProtectedRoute><CopilotStandaloneLayout /></ProtectedRoute>}>
          <Route index element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><AIMyPortfolio /></BetaRoute>} />
          <Route path="top-opportunities" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotTopOpportunitiesPage /></BetaRoute>} />
          <Route path="macro" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotMacroPage /></BetaRoute>} />
          <Route path="ai-analyst" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotAIAnalystPage /></BetaRoute>} />
          <Route path="holdings" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotHoldingsPage /></BetaRoute>} />
          <Route path="risks" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotRisksPage /></BetaRoute>} />
          <Route path="ai-chat" element={<BetaRoute fallbackPath="/app/ai/stock-analyzer"><CopilotAIChatPage /></BetaRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <SupportWidget />
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
          <BrowserRouter>
            <ScrollToTop />
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
  </GlobalErrorBoundary>
);

export default App;
