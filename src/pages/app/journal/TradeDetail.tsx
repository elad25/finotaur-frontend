import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { uploadScreenshot } from '@/lib/trades';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatTradeDate, formatTradeDateFull } from '@/utils/dateFormatter';
import { formatSessionDisplay, getSessionColor } from '@/constants/tradingSessions';
import { Loader2, ArrowLeft, Calendar, TrendingUp, DollarSign, Target, AlertCircle, Pencil, X } from 'lucide-react';
import MultiUploadZone from '@/components/journal/MultiUploadZone';

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
}

interface EditDraft {
  notes: string;
  setup: string;
  mistake: string;
  next_time: string;
  tags: string; // comma-separated; split on save
  actual_user_r: string; // string for input binding; parsed to number | null on save
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
  };
}

export default function JournalTradeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { toast } = useToast();

  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (id) {
      fetchTrade();
    }
  }, [id]);

  // Warn before unload if the user has unsaved edits.
  useEffect(() => {
    if (!isEditing || !draft || !trade) return;
    const baseline = tradeToEditDraft(trade);
    const isDirty = (Object.keys(baseline) as Array<keyof EditDraft>).some(
      (key) => draft[key] !== baseline[key],
    );
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
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

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
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(null);
    setExistingScreenshots([]);
    setPendingFiles([]);
    setSaveError(null);
    setIsEditing(false);
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
    } = {
      notes: draft.notes || null,
      setup: draft.setup || null,
      mistake: draft.mistake || null,
      next_time: draft.next_time || null,
      tags: parsedTags.length > 0 ? parsedTags : null,
      actual_user_r:
        parsedR !== null && !isNaN(parsedR) ? parsedR : null,
      screenshots: finalScreenshots,
    };

    try {
      const { data, error } = await supabase
        .from('trades')
        .update(payload)
        .eq('id', trade.id)
        .select()
        .single();

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A646]" />
      </div>
    );
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
    <div className="p-6 space-y-6">
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
          </div>
          <p className="text-zinc-400 mt-1">{formatTradeDateFull(trade.open_at, timezone)}</p>
        </div>

        {/* Edit / Save / Cancel buttons */}
        {!isEditing ? (
          <button
            onClick={handleEditClick}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 text-sm font-medium transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
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

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* P&L Card */}
        {trade.pnl !== null && trade.pnl !== undefined && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">P&L</span>
            </div>
            <div className={`text-2xl font-bold ${
              trade.pnl > 0 ? 'text-green-400' : trade.pnl < 0 ? 'text-red-400' : 'text-zinc-400'
            }`}>
              {trade.pnl > 0 ? '+' : ''}{trade.pnl < 0 ? '' : ''}{Math.abs(trade.pnl).toFixed(2)} USD
            </div>
          </div>
        )}

        {/* R-Multiple Card */}
        {(trade.actual_user_r != null || trade.actual_r) && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">R-Multiple</span>
            </div>
            {(() => {
              const r = trade.actual_user_r != null ? trade.actual_user_r : trade.actual_r;
              if (r == null) return null;
              return (
                <div className={`text-2xl font-bold ${r > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {r > 0 ? '+' : ''}{r.toFixed(2)}R
                </div>
              );
            })()}
          </div>
        )}

        {/* Risk:Reward Card */}
        {trade.rr && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">Risk:Reward</span>
            </div>
            <div className="text-2xl font-bold text-white">
              1:{trade.rr.toFixed(2)}
            </div>
          </div>
        )}

        {/* Duration Card */}
        {trade.close_at && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">Duration</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {(() => {
                const diff = new Date(trade.close_at!).getTime() - new Date(trade.open_at).getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const days = Math.floor(hours / 24);
                if (days > 0) return `${days}d ${hours % 24}h`;
                return `${hours}h`;
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Trade Details */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Trade Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Entry */}
          <div>
            <label className="text-sm text-zinc-500 mb-1 block">Entry Price</label>
            <div className="text-lg font-semibold text-white">${trade.entry_price.toFixed(2)}</div>
          </div>

          {/* Exit */}
          {trade.exit_price && (
            <div>
              <label className="text-sm text-zinc-500 mb-1 block">Exit Price</label>
              <div className="text-lg font-semibold text-white">${trade.exit_price.toFixed(2)}</div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-sm text-zinc-500 mb-1 block">Quantity</label>
            <div className="text-lg font-semibold text-white">{trade.quantity}</div>
          </div>

          {/* Stop Loss */}
          {trade.stop_price && (
            <div>
              <label className="text-sm text-zinc-500 mb-1 block">Stop Loss</label>
              <div className="text-lg font-semibold text-red-400">${trade.stop_price.toFixed(2)}</div>
            </div>
          )}

          {/* Take Profit */}
          {trade.take_profit_price && (
            <div>
              <label className="text-sm text-zinc-500 mb-1 block">Take Profit</label>
              <div className="text-lg font-semibold text-green-400">${trade.take_profit_price.toFixed(2)}</div>
            </div>
          )}

          {/* Entry Time */}
          <div>
            <label className="text-sm text-zinc-500 mb-1 block">Entry Time</label>
            <div className="text-lg font-semibold text-white">{formatTradeDate(trade.open_at, timezone)}</div>
          </div>

          {/* Exit Time */}
          {trade.close_at && (
            <div>
              <label className="text-sm text-zinc-500 mb-1 block">Exit Time</label>
              <div className="text-lg font-semibold text-white">{formatTradeDate(trade.close_at, timezone)}</div>
            </div>
          )}
        </div>

        {/* Execution Legs — visible when the trade was scaled on either side.
            When section is shown, BOTH columns render (even if one side is 1
            leg) so the user can see at what price the single-leg side filled. */}
        {(() => {
          const entries = Array.isArray(trade.partial_entries) ? trade.partial_entries : [];
          const exits = Array.isArray(trade.partial_exits) ? trade.partial_exits : [];
          const scaled = entries.length > 1 || exits.length > 1;
          if (!scaled) return null;
          return (
            <div className="mt-6 pt-6 border-t border-zinc-800">
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
      </div>

      {/* Risk Management */}
      {(trade.risk_usd || trade.reward_usd) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Risk Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trade.risk_usd && (
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Risk Amount</label>
                <div className="text-lg font-semibold text-red-400">${trade.risk_usd.toFixed(2)}</div>
              </div>
            )}
            {trade.reward_usd && (
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Reward Potential</label>
                <div className="text-lg font-semibold text-green-400">${trade.reward_usd.toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trade Notes — view mode or edit mode */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Trade Notes</h3>

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

      {/* Tags */}
      {!isEditing && trade.tags && trade.tags.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {trade.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-lg text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Screenshots */}
      {isEditing ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Screenshots</h3>

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
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Screenshots</h3>
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
    </div>
  );
}
