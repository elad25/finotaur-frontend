// src/pages/app/admin/PatternLibraryList.tsx
// ─────────────────────────────────────────────────────────────────────────
// Pattern Library list page — Catalyst Intelligence Deck (Tree #2).
// Created 2026-05-26.
//
// Filterable table of saved patterns (admin-reviewed). Filters: category,
// direction, sector. Used by admin to review/inspect what the scanner is
// learning from.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, BookOpen, ExternalLink } from 'lucide-react';
import { SkeletonTable } from '@/components/ds/Skeleton';
import {
  listPatterns,
  getAdminKey,
  type SavedPattern,
  type CatalystCategory,
  type Direction,
} from '../../../services/patternLibrary.api';

const CATEGORIES: { value: '' | CatalystCategory; label: string }[] = [
  { value: '', label: 'All categories' },
  { value: 'regulation', label: 'Regulation' },
  { value: 'gov_procurement', label: 'Gov Procurement' },
  { value: 'trade_policy', label: 'Trade Policy' },
  { value: 'subsidy', label: 'Subsidy' },
  { value: 'geopolitical', label: 'Geopolitical' },
  { value: 'court_ruling', label: 'Court Ruling' },
  { value: 'fda_binary', label: 'FDA Binary' },
  { value: 'state_mandate', label: 'State Mandate' },
];

export default function PatternLibraryList() {
  const [patterns, setPatterns] = useState<SavedPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<'' | CatalystCategory>('');
  const [direction, setDirection] = useState<'' | Direction>('');
  const [sectorQuery, setSectorQuery] = useState('');

  const fetchList = async () => {
    setError(null);
    setLoading(true);
    try {
      const filters: Parameters<typeof listPatterns>[0] = { limit: 100 };
      if (category) filters.category = category;
      if (direction) filters.direction = direction;
      if (sectorQuery.trim()) filters.sector = sectorQuery.trim();
      const { patterns: data } = await listPatterns(filters);
      setPatterns(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getAdminKey()) fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!getAdminKey()) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
        <p className="text-gray-400">
          Admin key not set. Visit{' '}
          <a href="/app/admin/pattern-library" className="underline" style={{ color: '#C9A646' }}>
            Pattern Library
          </a>{' '}
          to enter it first.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6" style={{ color: '#C9A646' }} />
          Pattern Library
        </h1>
        <a
          href="/app/admin/pattern-library"
          className="text-sm hover:underline"
          style={{ color: '#C9A646' }}
        >
          + Analyze new pattern
        </a>
      </header>

      {/* Filters */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as '' | CatalystCategory)}
          className="px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as '' | Direction)}
          className="px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
        >
          <option value="">Any direction</option>
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>
        <input
          type="text"
          placeholder="Sector (e.g. defense)"
          value={sectorQuery}
          onChange={(e) => setSectorQuery(e.target.value)}
          className="px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
        />
        <button
          onClick={fetchList}
          disabled={loading}
          className="px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #C9A646 0%, #B8963F 100%)',
            color: '#0F0F0F',
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Apply'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Table */}
      {loading && !patterns.length ? (
        <SkeletonTable rows={6} cols={7} />
      ) : patterns.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center text-gray-400">
          No patterns yet. Analyze a ticker to add the first one.
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0a0a] text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Ticker</th>
                <th className="px-4 py-3 text-left">Direction</th>
                <th className="px-4 py-3 text-right">Return</th>
                <th className="px-4 py-3 text-left">Catalyst</th>
                <th className="px-4 py-3 text-left">Sector</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {patterns.map((p) => (
                <tr key={p.id} className="hover:bg-[#0a0a0a]">
                  <td className="px-4 py-3 text-white font-semibold">{p.ticker}</td>
                  <td className="px-4 py-3">
                    <span className={p.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}>
                      {p.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {p.return_pct >= 0 ? '+' : ''}
                    {p.return_pct}%
                  </td>
                  <td className="px-4 py-3 text-gray-300">{p.first_catalyst_category}</td>
                  <td className="px-4 py-3 text-gray-300">{p.first_catalyst_sector || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {p.move_start_date} → {p.move_end_date}
                  </td>
                  <td className="px-4 py-3">
                    {p.first_catalyst_source_url && (
                      <a
                        href={p.first_catalyst_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#C9A646' }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
