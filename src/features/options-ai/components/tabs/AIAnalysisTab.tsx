// src/features/options-ai/components/tabs/AIAnalysisTab.tsx
// =====================================================
// OPTIONS AI — AI Analysis Tab
// =====================================================
// Renders a senior-analyst structured read from the
// /api/options-ai/ai-analysis/:symbol endpoint.
// Follows the existing tab card/section/loading/error
// patterns established in DarkPoolTab.tsx.
// Design tokens: DESIGN_SYSTEM.md (no hardcoded hex).
// =====================================================

import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, RefreshCw, Eye, BookOpen, Swords, Binoculars, ShieldAlert } from 'lucide-react';
import { Card, SectionHeader, SkeletonCard } from '../ui';
import { fetchAiAnalysis } from '../../services/aiAnalysis.service';
import type { AiAnalysisResult } from '../../types/options-ai.types';
import { Button } from '@/components/ds/Button';

// ── Symbol input validation ──────────────────────────
const SYMBOL_RE = /^[A-Z]{1,6}$/;

function normalizeSymbol(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
}

// ── Relative time formatter ──────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ── Skeleton while loading ───────────────────────────
function AiAnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonCard className="h-[120px]" />
      <SkeletonCard className="h-[100px]" />
      <SkeletonCard className="h-[100px]" />
      <SkeletonCard className="h-[120px]" />
    </div>
  );
}

// ── Section card ─────────────────────────────────────
const AnalysisSection = memo(function AnalysisSection({
  icon: Icon,
  heading,
  children,
  delay = 0,
  iconBg = 'gold',
}: {
  icon: React.ComponentType<{ className?: string }>;
  heading: string;
  children: React.ReactNode;
  delay?: number;
  iconBg?: 'gold' | 'purple' | 'orange' | 'green' | 'red';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card>
        <div className="p-5">
          <SectionHeader icon={Icon} title={heading} iconBg={iconBg} />
          <div className="mt-4">{children}</div>
        </div>
      </Card>
    </motion.div>
  );
});

// ── Main component ────────────────────────────────────
interface Props {
  /** Default ticker symbol; uppercase 1–6 letters. */
  symbol?: string;
}

export const AIAnalysisTab = memo(function AIAnalysisTab({ symbol: initialSymbol = 'SPY' }: Props) {
  const [inputValue, setInputValue] = useState(initialSymbol.toUpperCase());
  const [activeSymbol, setActiveSymbol] = useState(initialSymbol.toUpperCase());

  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (sym: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchAiAnalysis(sym, abortRef.current.signal);
      setResult(data);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Failed to load AI analysis');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and when activeSymbol changes
  useEffect(() => {
    load(activeSymbol);
    return () => { abortRef.current?.abort(); };
  }, [activeSymbol, load]);

  // Sync input when parent symbol prop changes (e.g. page-level symbol changes)
  useEffect(() => {
    const sym = initialSymbol.toUpperCase();
    setInputValue(sym);
    setActiveSymbol(sym);
  }, [initialSymbol]);

  function handleAnalyze() {
    const sym = normalizeSymbol(inputValue);
    if (!SYMBOL_RE.test(sym)) return;
    setActiveSymbol(sym);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAnalyze();
  }

  const analysis = result?.analysis ?? null;
  const meta = result?.meta ?? null;
  const noData = result !== null && analysis === null;

  return (
    <div className="space-y-5">

      {/* ── Symbol picker ─────────────────────────────── */}
      <Card>
        <div className="p-5">
          <SectionHeader
            icon={Brain}
            title="AI Analysis"
            subtitle="Senior-analyst read generated from live options data"
            iconBg="gold"
          />
          <div className="mt-4 flex items-center gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6))}
              onKeyDown={handleKeyDown}
              placeholder="e.g. SPY"
              maxLength={6}
              aria-label="Ticker symbol"
              className="w-28 rounded-md px-3 py-2 text-sm font-medium text-white placeholder:text-[#555] focus:outline-none focus:ring-2 transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '0.5px solid rgba(255,255,255,0.12)',
                fontVariantNumeric: 'tabular-nums',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--gold-primary, #C9A646)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,166,70,0.15)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <Button
              variant="gold"
              size="sm"
              showArrow={false}
              onClick={handleAnalyze}
              disabled={loading || !SYMBOL_RE.test(normalizeSymbol(inputValue))}
            >
              {loading ? 'Analyzing…' : 'Analyze'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Loading ───────────────────────────────────── */}
      {loading && <AiAnalysisSkeleton />}

      {/* ── Error ─────────────────────────────────────── */}
      {!loading && error && (
        <Card>
          <div className="p-8 text-center">
            <AlertTriangle
              className="mx-auto mb-4 h-10 w-10 opacity-50"
              style={{ color: 'var(--status-error, #E24B4A)' }}
            />
            <h3 className="mb-2 text-base font-semibold text-white">Analysis unavailable</h3>
            <p className="mb-4 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{error}</p>
            <button
              onClick={() => load(activeSymbol)}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-200"
              style={{
                borderColor: 'rgba(201,166,70,0.2)',
                color: '#C9A646',
                background: 'rgba(201,166,70,0.07)',
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* ── No-data state ─────────────────────────────── */}
      {!loading && noData && (
        <Card>
          <div className="p-8 text-center">
            <Eye
              className="mx-auto mb-4 h-10 w-10 opacity-30"
              style={{ color: 'rgba(255,255,255,0.65)' }}
            />
            <h3 className="mb-2 text-base font-semibold text-white">Insufficient options data</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {result?.message ?? 'Not enough options activity to generate an AI analysis for this symbol.'}
            </p>
          </div>
        </Card>
      )}

      {/* ── Success: structured analysis ──────────────── */}
      {!loading && analysis && meta && (
        <>
          {/* 1. The Read */}
          <AnalysisSection icon={BookOpen} heading="The Read" iconBg="gold" delay={0.05}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {analysis.read}
            </p>
          </AnalysisSection>

          {/* 2. Context */}
          <AnalysisSection icon={Eye} heading="Context" iconBg="purple" delay={0.12}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {analysis.context}
            </p>
          </AnalysisSection>

          {/* 3. The Other Side */}
          <AnalysisSection icon={Swords} heading="The Other Side" iconBg="orange" delay={0.19}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {analysis.counterArgument}
            </p>
          </AnalysisSection>

          {/* 4. What To Watch */}
          <AnalysisSection icon={Binoculars} heading="What To Watch" iconBg="green" delay={0.26}>
            <ul className="space-y-2">
              {analysis.whatToWatch.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: '#C9A646' }}
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </AnalysisSection>

          {/* 5. Footer: risk note + generated time */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.33, duration: 0.35 }}
            className="px-1 pb-2 text-xs leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.30)' }}
          >
            <ShieldAlert className="mr-1.5 inline-block h-3 w-3 shrink-0 align-middle" />
            {analysis.riskNote || meta.disclaimer}
            {' · '}
            Generated {relativeTime(meta.generatedAt)}
            {meta.cached ? ' · cached' : ''}
          </motion.div>
        </>
      )}

    </div>
  );
});
