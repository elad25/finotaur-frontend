/**
 * ResearchIndexPage — /research
 *
 * Browsable directory of 2,500+ tickers with sector filtering,
 * debounced search, and 60-per-page pagination.
 *
 * SEO-critical public page. No auth, no window/document access,
 * prerender-safe. Imported directly in App.tsx (not lazy) for SSG.
 */

import { useState, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ds/Button';
import { listAllTickers } from '@/lib/seo/loadTickerData';
import type { TickerUniverseEntry } from '@/lib/seo/types';
import Navbar from '@/components/landing-new/Navbar';
import Footer from '@/components/landing-new/Footer';

const SITE_URL = 'https://www.finotaur.com';
const PAGE_SIZE = 60;

// ---------------------------------------------------------------------------
// JSON-LD for the collection page
// ---------------------------------------------------------------------------

function collectionPageSchema(count: number): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Stock Research — Free Analysis on 2,500+ Tickers',
    description:
      "Browse FINOTAUR's free stock research and analysis library. Real-time fundamentals, news, and insights on 2,500+ US stocks and ETFs.",
    url: `${SITE_URL}/research`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Finotaur',
      url: SITE_URL,
    },
    numberOfItems: count,
  };
}

// ---------------------------------------------------------------------------
// Ticker card
// ---------------------------------------------------------------------------

function TickerCard({ t }: { t: TickerUniverseEntry }) {
  return (
    <Link
      to={`/research/${t.ticker}`}
      className="group block rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-[#C9A646]/30 hover:bg-[#C9A646]/[0.04]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-lg font-bold text-[#C9A646] group-hover:text-[#F4D97B] transition-colors">
          {t.ticker}
        </span>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {t.type === 'etf' ? 'ETF' : 'Stock'}
        </span>
      </div>
      <p className="mt-1 text-sm text-white/70 leading-snug line-clamp-2">
        {t.name}
      </p>
      {t.sector && (
        <p className="mt-2 text-xs text-white/40">{t.sector}</p>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ResearchIndexPage() {
  const allTickers = useMemo(() => listAllTickers(), []);

  // Unique sectors for dropdown
  const sectors = useMemo(() => {
    const set = new Set<string>();
    allTickers.forEach((t) => {
      if (t.sector) set.add(t.sector);
    });
    return ['All sectors', ...Array.from(set).sort()];
  }, [allTickers]);

  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All sectors');
  const [page, setPage] = useState(1);

  // Debounce ref — simple 200ms debounce without an external hook
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 200);
  }, []);

  const handleSectorChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSectorFilter(e.target.value);
    setPage(1);
  }, []);

  // Filtered list
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return allTickers.filter((t) => {
      const matchesSector =
        sectorFilter === 'All sectors' || t.sector === sectorFilter;
      const matchesSearch =
        q === '' ||
        t.ticker.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q);
      return matchesSector && matchesSearch;
    });
  }, [allTickers, debouncedSearch, sectorFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const description =
    "Browse FINOTAUR's free stock research and analysis library. Real-time fundamentals, news, and insights on 2,500+ US stocks and ETFs.";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <SEO
        title="Stock Research — Free Analysis on 2,500+ Tickers"
        description={description}
        path="/research"
        jsonLd={collectionPageSchema(allTickers.length)}
      />

      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C9A646]/30 bg-[#C9A646]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#C9A646]">
            Free Research Library
          </div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            Stock &amp; ETF Research
          </h1>
          <p className="mt-3 text-white/60 md:text-lg">
            Fundamentals, news, and analysis for{' '}
            <span className="font-semibold text-white">{allTickers.length.toLocaleString()}</span> US
            stocks and ETFs — all free.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by ticker or company name…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#C9A646]/40 focus:ring-1 focus:ring-[#C9A646]/30"
            />
          </div>

          {/* Sector dropdown */}
          <select
            value={sectorFilter}
            onChange={handleSectorChange}
            className="rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#C9A646]/40 sm:w-56"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Result count */}
        <p className="mb-4 text-xs text-white/40">
          {filtered.length.toLocaleString()} result{filtered.length !== 1 ? 's' : ''}
          {debouncedSearch || sectorFilter !== 'All sectors'
            ? ` matching your filters`
            : ''}
        </p>

        {/* Grid */}
        {pageSlice.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {pageSlice.map((t) => (
              <TickerCard key={t.ticker} t={t} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-white/40">
            No tickers found matching your search.
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button
              variant="goldOutline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-white/50">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="goldOutline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
