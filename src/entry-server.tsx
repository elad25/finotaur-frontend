import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider, type FilledContext } from 'react-helmet-async';
import { Routes, Route } from 'react-router-dom';
import ResearchIndexPage from '@/pages/research/ResearchIndexPage';
import TickerResearchPage from '@/pages/research/TickerResearchPage';

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
