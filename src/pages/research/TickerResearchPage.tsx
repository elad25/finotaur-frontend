/**
 * TickerResearchPage — /research/:ticker
 *
 * SEO-critical public page. No auth required, no window/document access,
 * prerender-safe. Imported directly in App.tsx (not lazy) for SSG.
 */

import { useParams, Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';
import { TickerHero } from '@/components/research/TickerHero';
import { FundamentalsTable } from '@/components/research/FundamentalsTable';
import { AutoSummary } from '@/components/research/AutoSummary';
import { NewsList } from '@/components/research/NewsList';
import { SectorPeers } from '@/components/research/SectorPeers';
import { getTickerData, listAllTickers } from '@/lib/seo/loadTickerData';
import { generateSummary } from '@/lib/seo/autoSummary';
import { buildTickerJsonLd } from '@/lib/seo/jsonLdTicker';
import Navbar from '@/components/landing-new/Navbar';
import Footer from '@/components/landing-new/Footer';

// ---------------------------------------------------------------------------
// 404 sub-component
// ---------------------------------------------------------------------------

function TickerNotFound({ ticker }: { ticker: string }) {
  return (
    <>
      <SEO
        title="Ticker not found"
        description="The requested ticker symbol could not be found in our research database."
        path={`/research/${ticker}`}
        noindex
      />
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-32 text-center">
          <p className="mb-4 font-mono text-6xl font-bold text-[#C9A646]">404</p>
          <h1 className="mb-4 text-2xl font-semibold">Ticker not found</h1>
          <p className="mb-8 text-white/60">
            We don't have research data for <span className="font-mono text-white">{ticker}</span>.
          </p>
          <Button variant="gold" asChild showArrow={false}>
            <Link to="/research">Browse all tickers</Link>
          </Button>
        </div>
        <Footer />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TickerResearchPage() {
  const { ticker: rawTicker } = useParams<{ ticker: string }>();
  const ticker = (rawTicker ?? '').toUpperCase();

  const t = getTickerData(ticker);

  if (!t) {
    return <TickerNotFound ticker={ticker} />;
  }

  const summary = generateSummary(t);
  const jsonLd = buildTickerJsonLd(t);
  const universe = listAllTickers();

  // SEO description: 150-char max
  const seoDescription = `Latest ${t.name} (${t.ticker}) stock analysis.${t.price.last != null ? ` Price $${t.price.last.toFixed(2)}.` : ''} ${t.sector ? `${t.sector} sector.` : ''} Fundamentals, news, and ${t.ticker} research at Finotaur.`.slice(0, 160);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <SEO
        title={`${t.name} (${t.ticker}) Stock Analysis`}
        description={seoDescription}
        path={`/research/${t.ticker}`}
        jsonLd={jsonLd}
      />

      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs text-white/40">
          <Link to="/" className="hover:text-white/70 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/research" className="hover:text-white/70 transition-colors">Research</Link>
          <span>/</span>
          <span className="font-mono text-white/60">{t.ticker}</span>
        </nav>

        <div className="space-y-8">
          {/* Hero card. Price data is protected server-side (403 for non-admin
              on raw Polygon endpoints). NOT wrapped in PriceGate here: this is a
              prerendered/SSR public SEO route, and PriceGate -> useAdminAuth pulls
              the browser-only supabase client into the SSR bundle (window is not
              defined at prerender). Server gate is the source of protection. */}
          <TickerHero t={t} />

          {/* Auto-generated summary */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              About {t.name}
            </h2>
            <AutoSummary summary={summary} />
          </section>

          {/* Fundamentals */}
          <FundamentalsTable fundamentals={t.fundamentals} />

          {/* News */}
          <NewsList items={t.news} />

          {/* Sector peers */}
          <SectorPeers
            currentTicker={t.ticker}
            sector={t.sector}
            universe={universe}
          />

          {/* Footer CTA */}
          <Card variant="featured" padding="spacious">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-white">
                  Want real-time analysis on {t.ticker}?
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Track it free in your trading journal. Log trades, tag setups, and review your edge.
                </p>
              </div>
              <Button variant="gold" size="default" asChild showArrow={false}>
                <Link to={`/register?ref=seo&ticker=${t.ticker}`}>
                  Get started
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
