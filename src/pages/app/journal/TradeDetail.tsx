import { useEffect, useMemo, useRef, useState } from 'react';
import { JournalTradeDetailSkeletonPage } from "@/components/skeletons/JournalTradeDetailSkeleton";
import { useRegisterJournalFinoContext } from '@/components/fino/useJournalFinoContext';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { uploadScreenshot } from '@/lib/trades';
import { isManualTrade } from '@/lib/trades/isManualTrade';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatTradeDate, formatTradeDateFull } from '@/utils/dateFormatter';
import { formatSessionDisplay, getSessionColor } from '@/constants/tradingSessions';
import { getDTE, getOptionBreakeven, getOptionMaxLoss, getOptionMaxProfit, getStrategyLabel, legSignedPnl, getPipSize, parseForexPair, singleLegFromTrade, type TradeLeg } from '@/utils/tradeCalculations';
import { fetchTradeLegs } from '@/lib/journal/multiLegTrade';
import { Loader2, ArrowLeft, AlertCircle, Pencil, X, ClipboardList, Share2 } from 'lucide-react';
import { ShareTradeDialog } from '@/features/floor/components/ShareTradeDialog';
import { SkeletonStatRow, SkeletonChart, SkeletonText } from '@/components/ds/Skeleton';
import MultiUploadZone from '@/components/journal/MultiUploadZone';
import { ForexMarketStatusChip } from '@/components/journal/ForexMarketStatusChip';
import OptionPayoffChart from '@/components/journal/OptionPayoffChart';
import TradeChart from '@/components/journal/TradeChart';
import { TradeScorecard } from '@/pages/app/journal/finotaur-ai/components/TradeScorecard';
import { TradeStatsList } from '@/components/journal/TradeStatsList';
import type { StatRow } from '@/components/journal/TradeStatsList';
import { StarRating } from '@/components/journal/StarRating';
import { TagMultiSelect } from '@/components/journal/TagMultiSelect';
import StrategyChecklistVerify from '@/components/journal/StrategyChecklistVerify';
import { useTradeTags } from '@/hooks/useTradeTags';
import { useJournalTags } from '@/hooks/useJournalTags';
import { useStrategiesOptimized } from '@/hooks/useStrategies';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { tradeMatchesRule } from '@/lib/journal/autotag';

interface PartialLeg {
  // Common fields written by both the Tradovate edge fn (v48+) and the
  // manual-entry flow in New.tsx. Only `price` and `quantity` are guaranteed.
  price: number;
  quantity: number;
  id?: string;
  fill_id?: number;
  timestamp?: string;
  percentage?: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  fees?: number;
  stop_price?: number;
  take_profit_price?: number;
  open_at: string;
  close_at?: string;
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN';
  pnl?: number;
  session?: string;
  actual_r?: number;
  actual_user_r?: number | null;
  risk_usd?: number;
  reward_usd?: number;
  rr?: number;
  notes?: string;
  setup?: string;
  mistake?: string;
  next_time?: string;
  tags?: string[];
  screenshots?: string[];
  partial_entries?: PartialLeg[];
  partial_exits?: PartialLeg[];
  // Origin of the trade: 'manual' (Add Trade form), 'api' (AI screenshot),
  // or a broker/import source ('tradovate' / 'ibrit' / 'tradingview' / 'csv').
  import_source?: string | null;
  // Real broker name (e.g. 'tradovate') when broker-synced; 'manual' (or
  // missing) for hand-typed and AI-screenshot trades. Gates Global Feed
  // sharing — see isBrokerVerifiedTrade.
  broker?: string | null;
  // Options (single-leg) — populated only when asset_class === 'options'
  asset_class?: string;
  option_type?: 'CALL' | 'PUT';
  strike_price?: number;
  expiration_date?: string;
  option_outcome?: string | null;
  // Multi-leg options spread fields
  leg_count?: number;
  strategy_type?: string;
  // Annotation panel fields
  strategy_id?: string | null;
  trade_rating?: number | null;
  checklist_results?: Record<string, boolean> | null;
  // Forex — populated only when asset_class === 'forex'
  base_currency?: string;
  quote_currency?: string;
  account_currency?: string;
  quote_rate?: number;
  pip_size?: number;
  lot_size?: number;
  // R-from-frozen-stop fields (populated by DB trigger)
  r_stop_price?: number | null;
  r_locked_at?: string | null;
  r_stop_set_at?: string | null;
  risk_class?: 'risk_defined' | 'risk_free' | 'no_stop' | null;
  locked_profit_usd?: number | null;
}

// Expiration-outcome values for single-leg options. Empty string = "normal
// close / not applicable" and is saved as NULL.
const OPTION_OUTCOMES: { value: string; label: string }[] = [
  { value: '', label: 'Normal close' },
  { value: 'expired_worthless', label: 'Expired worthless' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'exercised', label: 'Exercised' },
];

const optionOutcomeLabel = (value?: string | null): string | null => {
  if (!value) return null;
  return OPTION_OUTCOMES.find((o) => o.value === value)?.label ?? value;
};

interface EditDraft {
  notes: string;
  setup: string;
  mistake: string;
  next_time: string;
  tags: string; // comma-separated; split on save
  actual_user_r: string; // string for input binding; parsed to number | null on save
  option_outcome: string; // '' = normal close (saved as NULL)
  expiration_date: string; // ISO date string, options only
  // Annotation panel fields
  strategyId: string | null;
  checklistResults: Record<string, boolean>;
}

// Local mirror of MultiUploadZone's internal Screenshot shape (not exported from that module).
interface PendingScreenshot {
  file: File;
  preview: string;
  compressed?: File;
  compressing?: boolean;
}

const LEG_VISIBLE_CAP = 3;

function LegsList({
  legs,
  label,
  tone,
}: {
  legs: PartialLeg[];
  label: string;
  tone: 'entry' | 'exit';
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? legs : legs.slice(0, LEG_VISIBLE_CAP);
  const hidden = Math.max(0, legs.length - LEG_VISIBLE_CAP);
  const arrow = tone === 'entry' ? '▲' : '▼';
  const arrowColor = tone === 'entry' ? 'text-green-400' : 'text-red-400';

  return (
    <div>
      <label className="text-sm text-zinc-500 mb-2 block">
        {label} <span className="text-zinc-600">({legs.length})</span>
      </label>
      <ul className="space-y-1.5">
        {visible.map((leg, i) => (
          <li
            key={leg.id ?? leg.fill_id ?? i}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2">
              <span className={`${arrowColor} text-xs`}>{arrow}</span>
              <span className="text-white font-mono">
                ${leg.price.toFixed(2)}
              </span>
            </span>
            <span className="text-zinc-500 font-mono text-xs">
              × {leg.quantity}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs text-zinc-400 hover:text-[#C9A646] transition-colors"
        >
          … +{hidden} more
        </button>
      )}
      {expanded && legs.length > LEG_VISIBLE_CAP && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 text-xs text-zinc-400 hover:text-[#C9A646] transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}

function tradeToEditDraft(trade: Trade): EditDraft {
  return {
    notes: trade.notes ?? '',
    setup: trade.setup ?? '',
    mistake: trade.mistake ?? '',
    next_time: trade.next_time ?? '',
    tags: (trade.tags ?? []).join(', '),
    actual_user_r:
      trade.actual_user_r != null ? String(trade.actual_user_r) : '',
    option_outcome: trade.option_outcome ?? '',
    expiration_date: trade.expiration_date ?? '',
    strategyId: trade.strategy_id ?? null,
    checklistResults: trade.checklist_results ?? {},
  };
}

export default function JournalTradeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { toast } = useToast();
  const { id: userId } = useEffectiveUser();

  const [trade, setTrade] = useState<Trade | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // FINO page context — this trade (incl. the trader's own reflections) + summary.
  const finoEntity = useMemo(
    () =>
      trade
        ? {
            type: 'trade',
            symbol: trade.symbol,
            side: trade.side,
            pnl: trade.pnl,
            rr: trade.rr,
            riskUsd: trade.risk_usd,
            rewardUsd: trade.reward_usd,
            entryPrice: trade.entry_price,
            exitPrice: trade.exit_price,
            stopPrice: trade.stop_price,
            session: trade.session,
            openAt: trade.open_at,
            closeAt: trade.close_at,
            assetClass: trade.asset_class,
            tags: trade.tags,
            setup: trade.setup,
            mistake: trade.mistake,
            nextTime: trade.next_time,
            notes: trade.notes,
          }
        : null,
    [trade],
  );
  useRegisterJournalFinoContext(finoEntity);
  const [loading, setLoading] = useState(true);
  const [legs, setLegs] = useState<TradeLeg[]>([]);

  // ---- edit state ----
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---- screenshot edit state ----
  // existingScreenshots: URLs already persisted on the trade (user may remove some).
  // pendingFiles: new File objects added in this edit session (not yet uploaded).
  const [existingScreenshots, setExistingScreenshots] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingScreenshot[]>([]);

  // Ref for the Setup & Verification panel — used to scroll into view when the
  // trader clicks the "Review against your strategy" prompt.
  const setupPanelRef = useRef<HTMLDivElement>(null);

  // ---- annotation panel state (tags split by category) ----
  const [mistakeIds, setMistakeIds] = useState<string[]>([]);
  const [mentalIds, setMentalIds] = useState<string[]>([]);

  // Hooks for the annotation panel
  const { tagIds: linkedTagIds, setTradeTags } = useTradeTags(trade?.id);
  const { tags: allJournalTags } = useJournalTags(); // all categories — used to split by category
  const { data: strategies = [] } = useStrategiesOptimized(userId ?? undefined);

  useEffect(() => {
    if (id) {
      fetchTrade();
    }
  }, [id]);

  // Fetch option spread legs when the trade is a multi-leg spread.
  useEffect(() => {
    if (!trade?.id || !trade.leg_count || trade.leg_count <= 1) return;
    let cancelled = false;
    fetchTradeLegs(trade.id).then((result) => {
      if (!cancelled) setLegs(result);
    });
    return () => { cancelled = true; };
  }, [trade?.id, trade?.leg_count]);

  // Split linked tag IDs into mistake / mental whenever the linked set or tag metadata loads.
  // This runs on initial load and whenever linkedTagIds changes (e.g. after a save).
  useEffect(() => {
    const mistakeSet = new Set(
      allJournalTags.filter((t) => t.category === 'mistake').map((t) => t.id),
    );
    const mentalSet = new Set(
      allJournalTags.filter((t) => t.category === 'mental').map((t) => t.id),
    );
    setMistakeIds(linkedTagIds.filter((id) => mistakeSet.has(id)));
    setMentalIds(linkedTagIds.filter((id) => mentalSet.has(id)));
  }, [linkedTagIds, allJournalTags]);

  // Warn before unload if the user has unsaved edits.
  useEffect(() => {
    if (!isEditing || !draft || !trade) return;
    const baseline = tradeToEditDraft(trade);
    const isDirty = (Object.keys(baseline) as Array<keyof EditDraft>).some((key) => {
      const a = draft[key];
      const b = baseline[key];
      // Deep-compare object fields to avoid false-positive dirty on {}.
      if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
        return JSON.stringify(a) !== JSON.stringify(b);
      }
      return a !== b;
    });
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isEditing, draft, trade]);

  const fetchTrade = async () => {
    try {
      // maybeSingle(): a missing/soft-deleted trade returns data=null with NO error,
      // so a normal "not found" state renders the graceful UI without logging an error.
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      setTrade(data);
    } catch (error) {
      console.error('Error fetching trade:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    if (!trade) return;
    setDraft(tradeToEditDraft(trade));
    setExistingScreenshots(trade.screenshots ?? []);
    setPendingFiles([]);
    setSaveError(null);
    // mistakeIds / mentalIds are already correctly set by the useEffect above;
    // no reset needed here — they reflect the current persisted state.
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(null);
    setExistingScreenshots([]);
    setPendingFiles([]);
    setSaveError(null);
    setIsEditing(false);
  };

  /**
   * Opens edit mode focused on the strategy adherence section.
   * Used by the "Review against your strategy" prompt so broker-synced
   * trades without checklist_results get a clear, one-click path to review.
   */
  const handleStartStrategyReview = () => {
    handleEditClick();
    // Scroll the Setup & Verification panel into view after React re-renders.
    requestAnimationFrame(() => {
      setupPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleSave = async () => {
    if (!trade || !draft) return;
    setSaving(true);
    setSaveError(null);

    // Build payload with only the fields this form manages
    const parsedTags = draft.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const parsedR =
      draft.actual_user_r.trim() === ''
        ? null
        : Number(draft.actual_user_r);

    // Upload any pending screenshot files; skip nulls (failed uploads).
    const filesToUpload = pendingFiles.map((s) => s.compressed ?? s.file);
    const uploadedUrls = await Promise.all(filesToUpload.map((f) => uploadScreenshot(f)));
    const successfulUrls = uploadedUrls.filter((url): url is string => url !== null);

    if (uploadedUrls.some((url) => url === null)) {
      // Surface partial-failure info; uploadScreenshot already calls its own
      // toast.error internally, but we also set saveError so the banner shows.
      const failCount = uploadedUrls.filter((url) => url === null).length;
      setSaveError(
        `${failCount} screenshot${failCount > 1 ? 's' : ''} failed to upload — other changes were still saved.`,
      );
    }

    const finalScreenshots = [...existingScreenshots, ...successfulUrls];

    // Supabase update accepts null to clear a column; we type the payload
    // explicitly rather than fighting Partial<Trade> optional-vs-nullable.
    const payload: {
      notes: string | null;
      setup: string | null;
      mistake: string | null;
      next_time: string | null;
      tags: string[] | null;
      actual_user_r: number | null;
      screenshots: string[];
      strategy_id: string | null;
      checklist_results: Record<string, boolean> | null;
      option_outcome?: string | null;
      expiration_date?: string | null;
    } = {
      notes: draft.notes || null,
      setup: draft.setup || null,
      mistake: draft.mistake || null,
      next_time: draft.next_time || null,
      tags: parsedTags.length > 0 ? parsedTags : null,
      actual_user_r:
        parsedR !== null && !isNaN(parsedR) ? parsedR : null,
      screenshots: finalScreenshots,
      strategy_id: draft.strategyId || null,
      checklist_results:
        Object.keys(draft.checklistResults).length > 0 ? draft.checklistResults : null,
    };

    // Options-only: persist the expiration outcome and expiration date
    // (empty string → NULL). Guarded so non-option trades never write these columns.
    if (trade.asset_class === 'options') {
      payload.option_outcome = draft.option_outcome || null;
      payload.expiration_date = draft.expiration_date || null;
    }

    try {
      const [{ data, error }] = await Promise.all([
        supabase
          .from('trades')
          .update(payload)
          .eq('id', trade.id)
          .select()
          .single(),
        // Persist the tag links (mistake + mental) for this trade.
        setTradeTags([...mistakeIds, ...mentalIds]),
      ]);

      if (error) throw error;

      setTrade(data as Trade);
      setIsEditing(false);
      setDraft(null);
      setExistingScreenshots([]);
      setPendingFiles([]);

      // Invalidate React Query caches so MyTrades / stats reflect the change
      queryClient.invalidateQueries({ queryKey: queryKeys.tradeDetail(trade.id) });
      queryClient.invalidateQueries({ queryKey: ['trades'] });

      toast({
        title: 'Trade updated',
        description: 'Your notes and tags have been saved.',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save — please try again.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  async function handleRateTrade(value: number) {
    if (!trade) return;
    const newRating = value === 0 ? null : value;
    const prev = trade.trade_rating ?? null;
    setTrade({ ...trade, trade_rating: newRating });
    try {
      const { error } = await supabase.from('trades').update({ trade_rating: newRating }).eq('id', trade.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: queryKeys.tradeDetail(trade.id) });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    } catch {
      setTrade({ ...trade, trade_rating: prev });
      toast({ title: 'Could not save rating', description: 'Please try again.' });
    }
  }

  if (loading) {
    return <JournalTradeDetailSkeletonPage />;
  }

  if (!trade) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-zinc-500">Trade not found</p>
          <button
            onClick={() => navigate('/app/journal/my-trades')}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Back to Trades
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/app/journal/my-trades')}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{trade.symbol}</h1>

            {/* Session Badge */}
            {trade.session && (
              <span className={`px-3 py-1 rounded-lg border text-sm font-medium ${getSessionColor(trade.session)}`}>
                {formatSessionDisplay(trade.session)}
              </span>
            )}

            {/* Side Badge */}
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
              trade.side === 'LONG'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {trade.side}
            </span>

            {/* Option Type Badge */}
            {trade.asset_class === 'options' && trade.option_type && (
              <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                trade.option_type === 'CALL'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30'
              }`}>
                {trade.option_type}
              </span>
            )}

            {/* Outcome Badge */}
            {trade.outcome && trade.outcome !== 'OPEN' && (
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                trade.outcome === 'WIN'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : trade.outcome === 'LOSS'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-zinc-700 text-zinc-300 border border-zinc-600'
              }`}>
                {trade.outcome}
              </span>
            )}

            {/* Risk-Free Badge */}
            {trade.risk_class === 'risk_free' && (
              <span className="px-3 py-1 rounded-lg text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Risk-Free
              </span>
            )}
          </div>
          <p className="text-zinc-400 mt-1">{formatTradeDateFull(trade.open_at, timezone)}</p>
        </div>

        {/* Edit / Share / Save / Cancel buttons */}
        {!isEditing ? (
          <div className="flex items-center gap-2">
            {/* Share is available for manual trades too — ShareTradeDialog
                gates the Global destination internally (broker-verified only)
                but community rooms and mentor review remain open to all trades. */}
            <button
              onClick={() => setShareDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 text-sm font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" style={{ color: '#C9A646' }} />
              Share
            </button>
            <button
              onClick={handleEditClick}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 text-sm font-medium transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 border border-zinc-600 rounded-lg text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-black transition-opacity disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #E8C97A 50%, #C9A646 100%)',
              }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* ── Trade Rating (prominent, instant-save) ──────────────────── */}
      <div className="rounded-[12px] border border-[#C9A646]/30 bg-gradient-to-br from-[#C9A646]/[0.10] to-transparent px-5 py-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_24px_rgba(201,166,70,0.08)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C9A646]">Trade Rating</p>
          <p className="text-xs text-zinc-500 mt-0.5">How well did you execute this trade?</p>
        </div>
        <div className="flex items-center gap-3">
          <StarRating value={trade.trade_rating ?? null} onChange={handleRateTrade} size="xl" />
          <span className="text-base font-bold tabular-nums text-white min-w-[3rem] text-right">
            {trade.trade_rating != null ? `${trade.trade_rating}/5` : '—'}
          </span>
        </div>
      </div>

      {/* ── Stats Panel (TradeZella-style flat list) ─────────────────────── */}
      {(() => {
        // Build the duration string (reuse same calc from old Duration card)
        let durationStr: string | null = null;
        if (trade.close_at) {
          const diff = new Date(trade.close_at).getTime() - new Date(trade.open_at).getTime();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const days = Math.floor(hours / 24);
          durationStr = days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
        }

        const isRiskFree = trade.risk_class === 'risk_free';
        const rValue = isRiskFree ? null : (trade.actual_user_r != null ? trade.actual_user_r : trade.actual_r);

        // Format locked profit using same currency style as the rest of the panel
        const fmtUSD = (v: number) => `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Build rows — only include rows that have a real value
        const rows: StatRow[] = [
          { label: 'Side', value: trade.side, tone: trade.side === 'LONG' ? 'positive' : 'negative' },
          { label: 'Contracts', value: String(trade.quantity) },
          ...(trade.outcome && trade.outcome !== 'OPEN'
            ? [{ label: 'Outcome', value: trade.outcome, tone: (trade.outcome === 'WIN' ? 'positive' : trade.outcome === 'LOSS' ? 'negative' : 'muted') as StatRow['tone'] }]
            : []),
          // R-Multiple: show "Risk-Free" label when risk_class === 'risk_free'; otherwise show the number
          ...(isRiskFree
            ? [{ label: 'R-Multiple', value: 'Risk-Free', tone: 'positive' as StatRow['tone'] }]
            : rValue != null
              ? [{ label: 'R-Multiple', value: `${rValue > 0 ? '+' : ''}${rValue.toFixed(2)}R`, tone: (rValue > 0 ? 'positive' : 'negative') as StatRow['tone'] }]
              : []),
          // Locked Profit: only for risk-free trades
          ...(isRiskFree && trade.locked_profit_usd != null
            ? [{ label: 'Locked Profit', value: fmtUSD(trade.locked_profit_usd), tone: 'positive' as StatRow['tone'] }]
            : []),
          ...(trade.rr
            ? [{ label: 'Risk:Reward', value: `1:${trade.rr.toFixed(2)}` }]
            : []),
          ...(durationStr ? [{ label: 'Duration', value: durationStr, tone: 'muted' as StatRow['tone'] }] : []),
          { label: 'Entry', value: `$${trade.entry_price.toFixed(2)}` },
          ...(trade.exit_price ? [{ label: 'Exit', value: `$${trade.exit_price.toFixed(2)}` }] : []),
          ...(trade.stop_price ? [{ label: 'Stop Loss', value: `$${trade.stop_price.toFixed(2)}`, tone: 'negative' as StatRow['tone'] }] : []),
          ...(trade.take_profit_price ? [{ label: 'Take Profit', value: `$${trade.take_profit_price.toFixed(2)}`, tone: 'positive' as StatRow['tone'] }] : []),
          ...(trade.fees ? [{ label: 'Fees', value: `$${trade.fees.toFixed(2)}`, tone: 'muted' as StatRow['tone'] }] : []),
          ...(trade.risk_usd ? [{ label: 'Risk Amount', value: `$${trade.risk_usd.toFixed(2)}`, tone: 'negative' as StatRow['tone'] }] : []),
          ...(trade.reward_usd ? [{ label: 'Reward Potential', value: `$${trade.reward_usd.toFixed(2)}`, tone: 'positive' as StatRow['tone'] }] : []),
          ...(trade.session ? [{ label: 'Session', value: formatSessionDisplay(trade.session), tone: 'muted' as StatRow['tone'] }] : []),
          { label: 'Entry Time', value: formatTradeDate(trade.open_at, timezone), tone: 'muted' as StatRow['tone'] },
          ...(trade.close_at ? [{ label: 'Exit Time', value: formatTradeDate(trade.close_at, timezone), tone: 'muted' as StatRow['tone'] }] : []),
        ];

        const pnlHeadline = trade.pnl != null
          ? {
              label: 'Net P&L',
              value: `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)} USD`,
              tone: (trade.pnl > 0 ? 'positive' : trade.pnl < 0 ? 'negative' : 'default') as 'positive' | 'negative' | 'default',
            }
          : undefined;

        return <TradeStatsList headline={pnlHeadline} rows={rows} />;
      })()}

      {/* Execution Legs — visible when the trade was scaled on either side. */}
      {(() => {
        const entries = Array.isArray(trade.partial_entries) ? trade.partial_entries : [];
        const exits = Array.isArray(trade.partial_exits) ? trade.partial_exits : [];
        const scaled = entries.length > 1 || exits.length > 1;
        if (!scaled) return null;
        return (
          <div className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Execution Legs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {entries.length >= 1 ? (
                <LegsList legs={entries} label="Entries" tone="entry" />
              ) : (
                <div />
              )}
              {exits.length >= 1 ? (
                <LegsList legs={exits} label="Exits" tone="exit" />
              ) : (
                <div />
              )}
            </div>
          </div>
        );
      })()}

      {/* Option Details — single-leg options only */}
      {trade.asset_class === 'options' && (() => {
        const dte = getDTE(trade.expiration_date);
        const breakeven = getOptionBreakeven(trade);
        const maxLoss = getOptionMaxLoss(trade);
        const maxProfit = getOptionMaxProfit(trade);
        const fmtExtremum = (e: { value: number | null; unlimited: boolean }) =>
          e.unlimited ? 'Unlimited' : e.value != null ? `$${e.value.toFixed(2)}` : '—';
        return (
          <div className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Option Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trade.option_type && (
                <div>
                  <label className="text-sm text-zinc-500 mb-1 block">Type</label>
                  <div className={`text-lg font-semibold ${trade.option_type === 'CALL' ? 'text-emerald-400' : 'text-red-300'}`}>
                    {trade.option_type}
                  </div>
                </div>
              )}
              {trade.strike_price != null && (
                <div>
                  <label className="text-sm text-zinc-500 mb-1 block">Strike</label>
                  <div className="text-lg font-semibold text-white">${trade.strike_price.toFixed(2)}</div>
                </div>
              )}
              {trade.expiration_date && (
                <div>
                  <label className="text-sm text-zinc-500 mb-1 block">Expiration</label>
                  <div className="text-lg font-semibold text-white">
                    {trade.expiration_date}
                    {dte != null && (
                      <span className={`ml-2 text-sm font-normal ${dte < 0 ? 'text-zinc-500' : dte <= 7 ? 'text-amber-300' : 'text-zinc-400'}`}>
                        ({dte < 0 ? 'expired' : `${dte} DTE`})
                      </span>
                    )}
                  </div>
                </div>
              )}
              {breakeven != null && (
                <div>
                  <label className="text-sm text-zinc-500 mb-1 block">Breakeven</label>
                  <div className="text-lg font-semibold text-white">${breakeven.toFixed(2)}</div>
                </div>
              )}
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Max Loss</label>
                <div className="text-lg font-semibold text-red-400">{fmtExtremum(maxLoss)}</div>
              </div>
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Max Profit</label>
                <div className="text-lg font-semibold text-green-400">{fmtExtremum(maxProfit)}</div>
              </div>
              {optionOutcomeLabel(trade.option_outcome) && (
                <div>
                  <label className="text-sm text-zinc-500 mb-1 block">Outcome</label>
                  <div className="text-lg font-semibold text-zinc-200">{optionOutcomeLabel(trade.option_outcome)}</div>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-zinc-600">
              Breakeven and max profit/loss are theoretical, at expiration, and exclude commissions. Short positions carry undefined risk.
            </p>
          </div>
        );
      })()}

      {/* Forex Details — forex trades only */}
      {trade.asset_class === 'forex' && (() => {
        const { base, quote } = parseForexPair(trade.symbol);
        const pipSize = trade.pip_size ?? getPipSize(trade.symbol);
        const acct = trade.account_currency ?? 'USD';
        const rate = trade.quote_rate ?? 1;
        const crossCurrency = !!quote && quote !== acct.toUpperCase();
        return (
          <div className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Forex Details</h3>
              <ForexMarketStatusChip />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {base && quote && (
                <div>
                  <label className="text-sm text-zinc-500 mb-1 block">Pair</label>
                  <div className="text-lg font-semibold text-white">{base}/{quote}</div>
                </div>
              )}
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Pip Size</label>
                <div className="text-lg font-semibold text-white">{pipSize}</div>
              </div>
              {trade.lot_size != null && (
                <div>
                  <label className="text-sm text-zinc-500 mb-1 block">Lot Size</label>
                  <div className="text-lg font-semibold text-white">{trade.lot_size.toLocaleString('en-US')}</div>
                </div>
              )}
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Account Currency</label>
                <div className="text-lg font-semibold text-white">{acct}</div>
              </div>
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Quote Rate</label>
                <div className="text-lg font-semibold text-white">
                  {rate}
                  <span className="ml-2 text-sm font-normal text-zinc-400">
                    {crossCurrency ? `${quote} → ${acct}` : 'no conversion'}
                  </span>
                </div>
              </div>
            </div>
            {crossCurrency && rate === 1 && (
              <p className="mt-4 text-xs text-amber-300">
                Quote rate is 1.0 on a cross-currency pair — P&amp;L is not converted to {acct}. Edit the trade to set the {quote}→{acct} rate.
              </p>
            )}
            <p className="mt-4 text-xs text-zinc-600">
              P&amp;L is computed as price move × (lots × lot size) × quote rate, expressed in the account currency.
            </p>
          </div>
        );
      })()}

      {/* Multi-Leg Spread — shown only when leg_count > 1 */}
      {trade.leg_count && trade.leg_count > 1 && (
        <div className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            {getStrategyLabel(trade.strategy_type) ?? 'Multi-Leg'} &middot; {trade.leg_count} legs
          </h3>
          {legs.length === 0 ? (
            <p className="text-zinc-600 text-sm italic">Loading legs…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-zinc-500 font-medium pb-3 pr-4">#</th>
                    <th className="text-left text-zinc-500 font-medium pb-3 pr-4">Type</th>
                    <th className="text-left text-zinc-500 font-medium pb-3 pr-4">Side</th>
                    <th className="text-left text-zinc-500 font-medium pb-3 pr-4">Strike</th>
                    <th className="text-left text-zinc-500 font-medium pb-3 pr-4">Qty</th>
                    <th className="text-left text-zinc-500 font-medium pb-3 pr-4">Entry</th>
                    <th className="text-left text-zinc-500 font-medium pb-3 pr-4">Exit</th>
                    <th className="text-left text-zinc-500 font-medium pb-3">P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {legs.map((leg, idx) => {
                    const pnl = legSignedPnl(leg);
                    return (
                      <tr key={idx}>
                        <td className="py-3 pr-4 text-zinc-500">{idx + 1}</td>
                        <td className={`py-3 pr-4 font-medium ${leg.option_type === 'CALL' ? 'text-green-400' : 'text-red-400'}`}>
                          {leg.option_type ?? '—'}
                        </td>
                        <td className="py-3 pr-4 text-zinc-300">{leg.side ?? '—'}</td>
                        <td className="py-3 pr-4 text-zinc-300 font-mono">
                          {leg.strike_price != null ? `$${leg.strike_price.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 pr-4 text-zinc-300">{leg.quantity}</td>
                        <td className="py-3 pr-4 text-zinc-300 font-mono">
                          {leg.entry_price != null ? `$${leg.entry_price.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 pr-4 text-zinc-300 font-mono">
                          {leg.exit_price != null ? `$${leg.exit_price.toFixed(2)}` : '—'}
                        </td>
                        <td className={`py-3 font-mono ${pnl == null ? 'text-zinc-500' : pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pnl == null ? '—' : `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payoff at Expiration — options only (single-leg or multi-leg) */}
      {trade.asset_class === 'options' && (() => {
        const isMulti = !!trade.leg_count && trade.leg_count > 1;
        const single = singleLegFromTrade(trade);
        const chartLegs: TradeLeg[] = isMulti ? legs : (single ? [single] : []);
        if (!chartLegs.length) return null;
        return (
          <div className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Payoff at Expiration</h3>
            <OptionPayoffChart legs={chartLegs} />
            <p className="mt-4 text-xs text-zinc-600">
              Theoretical net P&amp;L if the underlying settles at each price on expiration day.
              Intrinsic value only — excludes time value, commissions, and early assignment.
            </p>
          </div>
        );
      })()}

      {/* Price chart — the trade plotted with entry/exit markers.
          Manual trades have no synced market chart, so show a note instead. */}
      {trade && (
        isManualTrade(trade) ? (
          <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-zinc-300">Chart unavailable for manually added trades</p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              This trade was entered manually, so there is no synced market chart to display.
            </p>
          </div>
        ) : (
          <TradeChart trade={trade} />
        )
      )}

      {/* Trade Scorecard */}
      {id && <TradeScorecard tradeId={id} />}

      {/* ── Setup & Verification ─────────────────────────────────────────── */}
      <div ref={setupPanelRef} className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Setup & Verification</h3>

        {/* Strategy picker */}
        <div className="mb-4">
          <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Strategy</label>
          {(() => {
            // Determine auto-match status for the currently linked strategy.
            const linkedStrategy = strategies.find((s) => s.id === trade.strategy_id);
            const isAutoMatched =
              !!linkedStrategy &&
              Array.isArray((linkedStrategy as any).matchRules) &&
              (linkedStrategy as any).matchRules.length > 0 &&
              // trade cast to any because local Trade type may not match the matcher's Trade type
              tradeMatchesRule(trade as any, (linkedStrategy as any).matchRules);

            if (isEditing && draft) {
              // Suggestion chip: first strategy whose rules match this trade (only when none selected).
              const suggested = !draft.strategyId
                ? strategies.find(
                    (s) =>
                      Array.isArray((s as any).matchRules) &&
                      (s as any).matchRules.length > 0 &&
                      tradeMatchesRule(trade as any, (s as any).matchRules),
                  )
                : undefined;

              return (
                <>
                  <select
                    value={draft.strategyId ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, strategyId: e.target.value || null })
                    }
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#C9A646] transition-colors"
                  >
                    <option value="">— No setup —</option>
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  {/* Helper text */}
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Auto-linked to the strategy whose match rules fit this trade. Pick a different
                    strategy to override.
                  </p>

                  {/* Suggestion chip (only when no strategy is selected) */}
                  {suggested && (
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, strategyId: suggested.id })}
                      className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#C9A646] px-2.5 py-0.5 text-xs text-[#C9A646] hover:bg-[#C9A646]/10 transition-colors"
                    >
                      Suggested: {suggested.name}
                    </button>
                  )}
                </>
              );
            }

            // Read-only display
            return (
              <p className="text-white text-sm flex items-center gap-2">
                {trade.strategy_id
                  ? (strategies.find((s) => s.id === trade.strategy_id)?.name ?? '—')
                  : '—'}
                {trade.strategy_id && (
                  isAutoMatched ? (
                    <span
                      title="Linked automatically because this trade matches the strategy's rules."
                      className="inline-flex items-center rounded-full border border-[#C9A646]/40 bg-[#C9A646]/10 px-2 py-0.5 text-[11px] font-medium text-[#C9A646]"
                    >
                      Auto-matched
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                      Manual
                    </span>
                  )
                )}
              </p>
            );
          })()}
        </div>

        {/*
          Post-trade review prompt — visible in read-only mode when a strategy
          is linked but checklist_results is empty/null. Broker-synced trades
          arrive without checklist data, so this is the primary nudge for the
          trader to mark adherence after a trade closes.
        */}
        {!isEditing && trade.strategy_id && !trade.checklist_results && (
          <button
            type="button"
            onClick={handleStartStrategyReview}
            className={[
              'mb-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left',
              'border border-[#C9A646]/30 bg-[#C9A646]/[0.06]',
              'hover:bg-[#C9A646]/[0.10] transition-colors duration-150',
            ].join(' ')}
          >
            <ClipboardList className="h-4 w-4 shrink-0 text-[#C9A646]" />
            <span className="text-[13px] font-medium text-[#C9A646]">
              Review against your strategy
            </span>
            <span className="ml-auto text-[11px] text-white/30">Not reviewed yet</span>
          </button>
        )}

        {/* Checklist */}
        <StrategyChecklistVerify
          strategyId={isEditing && draft ? draft.strategyId : trade.strategy_id}
          results={isEditing && draft ? draft.checklistResults : trade.checklist_results}
          onChange={(results) => draft && setDraft({ ...draft, checklistResults: results })}
          readOnly={!isEditing}
          actual={{
            rr: trade.rr,
            rMultiple: trade.actual_user_r ?? trade.actual_r,
          }}
        />
      </div>

      {/* ── Tags ─────────────────────────────────────────────────────────── */}
      <div className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Tags</h3>
        <div className="space-y-4">
          <TagMultiSelect
            category="mistake"
            label="Mistakes"
            selectedTagIds={mistakeIds}
            onChange={setMistakeIds}
            readOnly={!isEditing}
          />
          <TagMultiSelect
            category="mental"
            label="Mental"
            selectedTagIds={mentalIds}
            onChange={setMentalIds}
            readOnly={!isEditing}
          />
        </div>
      </div>

      {/* Trade Notes — view mode or edit mode */}
      <div className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Trade Notes</h3>

        {/* Save error banner */}
        {isEditing && saveError && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {isEditing && draft ? (
          /* ---- EDIT MODE ---- */
          <div className="space-y-5">
            {/* Setup */}
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Setup</label>
              <textarea
                value={draft.setup}
                onChange={(e) => setDraft({ ...draft, setup: e.target.value })}
                rows={3}
                placeholder="Describe the setup…"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 px-3 py-2 text-sm resize-y focus:outline-none focus:border-[#C9A646] transition-colors"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Notes</label>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={3}
                placeholder="General trade notes…"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 px-3 py-2 text-sm resize-y focus:outline-none focus:border-[#C9A646] transition-colors"
              />
            </div>

            {/* Mistake */}
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Mistake</label>
              <textarea
                value={draft.mistake}
                onChange={(e) => setDraft({ ...draft, mistake: e.target.value })}
                rows={3}
                placeholder="What went wrong?"
                className="w-full rounded-lg bg-zinc-800 border border-red-900/40 text-white placeholder:text-zinc-600 px-3 py-2 text-sm resize-y focus:outline-none focus:border-red-500/60 transition-colors"
              />
            </div>

            {/* Next Time */}
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Next Time</label>
              <textarea
                value={draft.next_time}
                onChange={(e) => setDraft({ ...draft, next_time: e.target.value })}
                rows={2}
                placeholder="What would you do differently?"
                className="w-full rounded-lg bg-zinc-800 border border-blue-900/40 text-white placeholder:text-zinc-600 px-3 py-2 text-sm resize-y focus:outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block font-medium">
                Tags <span className="text-zinc-600 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                placeholder="breakout, news-play, early-entry"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 px-3 py-2 text-sm focus:outline-none focus:border-[#C9A646] transition-colors"
              />
            </div>

            {/* R-Multiple override */}
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block font-medium">
                R-Multiple Override{' '}
                <span className="text-zinc-600 font-normal">(leave blank to use calculated value)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={draft.actual_user_r}
                onChange={(e) => setDraft({ ...draft, actual_user_r: e.target.value })}
                placeholder="e.g. 2.5"
                className="w-48 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 px-3 py-2 text-sm focus:outline-none focus:border-[#C9A646] transition-colors"
              />
            </div>

            {/* Options-only: settlement outcome + expiration date */}
            {trade.asset_class === 'options' && (
              <>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Option outcome</label>
                  <select
                    value={draft.option_outcome}
                    onChange={(e) => setDraft({ ...draft, option_outcome: e.target.value })}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#C9A646] transition-colors"
                  >
                    {OPTION_OUTCOMES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Expiration date</label>
                  <input
                    type="date"
                    value={draft.expiration_date}
                    onChange={(e) => setDraft({ ...draft, expiration_date: e.target.value })}
                    className="w-48 rounded-lg bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#C9A646] transition-colors"
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          /* ---- VIEW MODE ---- */
          <>
            {(trade.notes || trade.setup || trade.mistake || trade.next_time) ? (
              <div className="space-y-4">
                {trade.setup && (
                  <div>
                    <label className="text-sm text-zinc-500 mb-1 block">Setup</label>
                    <p className="text-white whitespace-pre-wrap">{trade.setup}</p>
                  </div>
                )}
                {trade.notes && (
                  <div>
                    <label className="text-sm text-zinc-500 mb-1 block">Notes</label>
                    <p className="text-white whitespace-pre-wrap">{trade.notes}</p>
                  </div>
                )}
                {trade.mistake && (
                  <div>
                    <label className="text-sm text-zinc-500 mb-1 block">Mistake</label>
                    <p className="text-red-400 whitespace-pre-wrap">{trade.mistake}</p>
                  </div>
                )}
                {trade.next_time && (
                  <div>
                    <label className="text-sm text-zinc-500 mb-1 block">Next Time</label>
                    <p className="text-blue-400 whitespace-pre-wrap">{trade.next_time}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-zinc-600 text-sm italic">No notes yet. Click Edit to add some.</p>
            )}
          </>
        )}
      </div>

      {/* Screenshots */}
      {isEditing ? (
        <div className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Screenshots</h3>

          {/* Existing screenshot thumbnails with remove control */}
          {existingScreenshots.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {existingScreenshots.map((url, index) => (
                <div
                  key={url}
                  className="relative group rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900/50"
                >
                  <div className="aspect-video">
                    <img
                      src={url}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExistingScreenshots((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600/90 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Remove screenshot"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload zone for new files */}
          <MultiUploadZone
            screenshots={pendingFiles}
            onScreenshotsChange={setPendingFiles}
            maxFiles={Math.max(0, 4 - existingScreenshots.length)}
          />
        </div>
      ) : (
        (trade.screenshots && trade.screenshots.length > 0) && (
          <div className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Screenshots</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trade.screenshots.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Trade screenshot ${index + 1}`}
                  className="w-full rounded-lg border border-zinc-800"
                />
              ))}
            </div>
          </div>
        )
      )}

      {/* Share trade dialog — mounted here so it overlays the full page */}
      {trade && (
        <ShareTradeDialog
          trade={{
            id: trade.id,
            symbol: trade.symbol,
            side: trade.side,
            pnl: trade.pnl,
            entry_price: trade.entry_price,
            exit_price: trade.exit_price,
            quantity: trade.quantity,
            close_at: trade.close_at,
            setup: trade.setup,
            broker: trade.broker,
          }}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}
    </div>
  );
}
