import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider, type FilledContext } from 'react-helmet-async';
import { Routes, Route } from 'react-router-dom';
import ResearchIndexPage from '@/pages/research/ResearchIndexPage';
import TickerResearchPage from '@/pages/research/TickerResearchPage';

// Marketing / GEO pages (Wave 2 — added alongside the research SSR tree).
// Same minimal HelmetProvider + StaticRouter stack; these pages only use
// react-router-dom (Navbar/Footer) + framer-motion, no auth/query context.
import FAQPage from '@/pages/learn/FAQPage';
import LearnIndexPage from '@/pages/learn/LearnIndexPage';
import HowToPassPropFirmEvaluation from '@/pages/learn/HowToPassPropFirmEvaluation';
import TradeCopierGuide from '@/pages/learn/TradeCopierGuide';
import HowToStopRevengeTrading from '@/pages/learn/HowToStopRevengeTrading';
import FindYourTradingLeaks from '@/pages/learn/FindYourTradingLeaks';
import WinRateProfitFactorExpectancy from '@/pages/learn/WinRateProfitFactorExpectancy';
import IsATradingJournalWorthIt from '@/pages/learn/IsATradingJournalWorthIt';
import ReviewsPage from '@/pages/ReviewsPage';
import BestTradingJournalTradovate from '@/pages/BestTradingJournalTradovate';
import BestTradingJournalFutures from '@/pages/BestTradingJournalFutures';
import BestTradingJournalPropFirm from '@/pages/BestTradingJournalPropFirm';
import AITradingJournal from '@/pages/AITradingJournal';
import JournalCopierPage from '@/pages/JournalCopierPage';

// GEO / comparison pages (Wave 3) — same minimal SSR stack, no auth/query context.
import BestTradingJournal from '@/pages/compare/BestTradingJournal';
import TradeZellaAlternative from '@/pages/compare/TradeZellaAlternative';
import FinotaurVsTradeZella from '@/pages/compare/FinotaurVsTradeZella';
import FinotaurVsTraderSync from '@/pages/compare/FinotaurVsTraderSync';
import FinotaurVsTradesViz from '@/pages/compare/FinotaurVsTradesViz';

export interface SsrHelmetStrings {
  title: string;
  meta: string;
  link: string;
  script: string;
  htmlAttributes: string;
  bodyAttributes: string;
}

export interface SsrResult {
  html: string;
  helmet: SsrHelmetStrings;
}

/**
 * Render a research-tree URL to a static HTML string.
 * - Minimal provider stack: HelmetProvider + StaticRouter only.
 *   No QueryClient / AuthProvider / Sentry — research pages don't depend on them.
 * - Returns the body HTML + serialized Helmet sections for injection
 *   into the index.html shell by the prerender script.
 */
export function render(url: string): SsrResult {
  const helmetContext = {} as FilledContext;
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <Routes>
          <Route path="/research" element={<ResearchIndexPage />} />
          <Route path="/research/:ticker" element={<TickerResearchPage />} />

          {/* Marketing / GEO routes (Wave 2) */}
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/learn" element={<LearnIndexPage />} />
          <Route path="/learn/how-to-pass-a-prop-firm-evaluation" element={<HowToPassPropFirmEvaluation />} />
          <Route path="/learn/trade-copier-guide" element={<TradeCopierGuide />} />
          <Route path="/learn/how-to-stop-revenge-trading" element={<HowToStopRevengeTrading />} />
          <Route path="/learn/find-your-trading-leaks" element={<FindYourTradingLeaks />} />
          <Route path="/learn/win-rate-profit-factor-expectancy" element={<WinRateProfitFactorExpectancy />} />
          <Route path="/learn/is-a-trading-journal-worth-it" element={<IsATradingJournalWorthIt />} />
          <Route path="/best-trading-journal-for-tradovate" element={<BestTradingJournalTradovate />} />
          <Route path="/best-trading-journal-for-futures" element={<BestTradingJournalFutures />} />
          <Route path="/best-trading-journal-for-prop-firm" element={<BestTradingJournalPropFirm />} />
          <Route path="/ai-trading-journal" element={<AITradingJournal />} />
          <Route path="/journal-copier" element={<JournalCopierPage />} />

          {/* GEO / comparison routes (Wave 3) */}
          <Route path="/best-trading-journal" element={<BestTradingJournal />} />
          <Route path="/tradezella-alternative" element={<TradeZellaAlternative />} />
          <Route path="/finotaur-vs-tradezella" element={<FinotaurVsTradeZella />} />
          <Route path="/finotaur-vs-tradersync" element={<FinotaurVsTraderSync />} />
          <Route path="/finotaur-vs-tradesviz" element={<FinotaurVsTradesViz />} />
        </Routes>
      </StaticRouter>
    </HelmetProvider>
  );
  const { helmet } = helmetContext;
  return {
    html,
    helmet: {
      title: helmet?.title.toString() ?? '',
      meta: helmet?.meta.toString() ?? '',
      link: helmet?.link.toString() ?? '',
      script: helmet?.script.toString() ?? '',
      htmlAttributes: helmet?.htmlAttributes.toString() ?? '',
      bodyAttributes: helmet?.bodyAttributes.toString() ?? '',
    },
  };
}
