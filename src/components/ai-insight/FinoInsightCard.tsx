// src/components/ai-insight/FinoInsightCard.tsx
// L1 "ambient AI insight" card — renders a compact, cached AI card per page context.
// Fetches from public backend endpoints; renders nothing on no-data or error (null-safe by design).

import { useEffect, useState } from 'react';
import { Card, Eyebrow } from '@/components/ds/Card';
import { SectionSpinner } from '@/components/ds/Spinner';
import { getApiBase } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types — one interface per card kind; no `any`
// ---------------------------------------------------------------------------

interface StockCard {
  ticker: string;
  pattern_type: string;
  confidence: number;
  evidence_text: string;
  invalidation_text: string | null;
  grade: string | null;
  key_lesson: string | null;
}

interface SectorCard {
  sector_name: string;
  sentiment: string;
  ai_bull_case: string;
  ai_bear_case: string;
  ai_key_trade: string;
}

interface MacroCard {
  regime: string;
  risk_level: string;
  fed_policy: string;
  rotation_theme: string;
  ai_macro_narrative: string;
  favored_sectors: string[];
  avoid_sectors: string[];
}

type CardData =
  | { kind: 'stock'; card: StockCard }
  | { kind: 'sector'; card: SectorCard }
  | { kind: 'macro'; card: MacroCard };

// ---------------------------------------------------------------------------
// Fetch helper — returns null on any error, never throws
// ---------------------------------------------------------------------------

async function fetchInsightCard(
  kind: 'stock' | 'sector' | 'macro',
  symbol?: string,
): Promise<CardData | null> {
  try {
    const base = getApiBase();
    let url: string;
    if (kind === 'macro') {
      url = `${base}/ai/cards/macro`;
    } else if (symbol) {
      url = `${base}/ai/cards/${kind}/${encodeURIComponent(symbol)}`;
    } else {
      return null;
    }

    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    if (!json.card) return null;

    return { kind, card: json.card } as CardData;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Confidence badge — pill-style, color-coded by value
// ---------------------------------------------------------------------------

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 75 ? 'text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10'
    : pct >= 50 ? 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10'
    : 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10';
  return (
    <span className={`inline-block rounded-[4px] border px-2 py-0.5 text-[10px] font-semibold uppercase ${color}`}>
      {pct}% confidence
    </span>
  );
}

// ---------------------------------------------------------------------------
// Chip — small label pill for sentiment / regime / sector lists
// ---------------------------------------------------------------------------

function Chip({ label, variant = 'neutral' }: { label: string; variant?: 'bull' | 'bear' | 'neutral' }) {
  const color =
    variant === 'bull' ? 'text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10'
    : variant === 'bear' ? 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10'
    : 'text-[#C9A646] border-[#C9A646]/30 bg-[#C9A646]/10';
  return (
    <span className={`inline-block rounded-[4px] border px-2 py-0.5 text-[10px] font-medium ${color}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Card layouts per kind
// ---------------------------------------------------------------------------

function StockLayout({ card }: { card: StockCard }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink-primary">{card.pattern_type}</span>
        <ConfidenceBadge value={card.confidence} />
        {card.grade && (
          <span className="inline-block rounded-[4px] border border-gold-border/60 bg-gold-primary/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase text-gold-primary">
            Grade: {card.grade}
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-ink-secondary line-clamp-3">
        {card.evidence_text}
      </p>

      {card.key_lesson && (
        <p className="text-[11px] leading-relaxed text-ink-tertiary">
          Key lesson: {card.key_lesson}
        </p>
      )}
    </div>
  );
}

function SectorLayout({ card }: { card: SectorCard }) {
  const sentimentVariant: 'bull' | 'bear' | 'neutral' =
    /bull/i.test(card.sentiment) ? 'bull'
    : /bear/i.test(card.sentiment) ? 'bear'
    : 'neutral';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip label={card.sentiment} variant={sentimentVariant} />
        <span className="text-sm font-semibold text-ink-primary">{card.ai_key_trade}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[8px] border border-[#22C55E]/20 bg-[#22C55E]/5 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase text-[#22C55E]">Bull</p>
          <p className="text-[12px] leading-relaxed text-ink-secondary line-clamp-3">
            {card.ai_bull_case}
          </p>
        </div>
        <div className="rounded-[8px] border border-[#EF4444]/20 bg-[#EF4444]/5 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase text-[#EF4444]">Bear</p>
          <p className="text-[12px] leading-relaxed text-ink-secondary line-clamp-3">
            {card.ai_bear_case}
          </p>
        </div>
      </div>
    </div>
  );
}

function MacroLayout({ card }: { card: MacroCard }) {
  const riskVariant: 'bull' | 'bear' | 'neutral' =
    /low/i.test(card.risk_level) ? 'bull'
    : /high/i.test(card.risk_level) ? 'bear'
    : 'neutral';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip label={card.regime} variant="neutral" />
        <Chip label={`Risk: ${card.risk_level}`} variant={riskVariant} />
        {card.fed_policy && (
          <span className="text-[11px] text-ink-tertiary">{card.fed_policy}</span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-ink-secondary line-clamp-3">
        {card.ai_macro_narrative}
      </p>

      {(card.favored_sectors?.length > 0 || card.avoid_sectors?.length > 0) && (
        <div className="flex flex-wrap items-start gap-3">
          {card.favored_sectors?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-semibold uppercase text-[#22C55E]">Favor:</span>
              {card.favored_sectors.slice(0, 3).map((s) => (
                <Chip key={s} label={s} variant="bull" />
              ))}
            </div>
          )}
          {card.avoid_sectors?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-semibold uppercase text-[#EF4444]">Avoid:</span>
              {card.avoid_sectors.slice(0, 3).map((s) => (
                <Chip key={s} label={s} variant="bear" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface FinoInsightCardProps {
  kind: 'stock' | 'sector' | 'macro';
  /** Required for kind="stock" and kind="sector". Ignored for kind="macro". */
  symbol?: string;
  className?: string;
}

export function FinoInsightCard({ kind, symbol, className }: FinoInsightCardProps) {
  const [state, setState] = useState<'loading' | 'empty' | 'ready'>('loading');
  const [cardData, setCardData] = useState<CardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setCardData(null);

    fetchInsightCard(kind, symbol).then((result) => {
      if (cancelled) return;
      if (result) {
        setCardData(result);
        setState('ready');
      } else {
        setState('empty');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [kind, symbol]);

  // Render nothing when no data (empty or error path)
  if (state === 'empty') return null;

  return (
    <Card variant="featured" className={`w-full mb-4 ${className ?? ''}`}>
      <div className="space-y-3">
        <Eyebrow>AI INSIGHT</Eyebrow>

        {state === 'loading' && (
          <SectionSpinner className="py-4" />
        )}

        {state === 'ready' && cardData?.kind === 'stock' && (
          <StockLayout card={cardData.card} />
        )}
        {state === 'ready' && cardData?.kind === 'sector' && (
          <SectorLayout card={cardData.card} />
        )}
        {state === 'ready' && cardData?.kind === 'macro' && (
          <MacroLayout card={cardData.card} />
        )}

        <p className="text-[10px] text-ink-tertiary">
          AI · may be delayed
        </p>
      </div>
    </Card>
  );
}
