import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "@/components/PageTitle";
import { useTrades } from "@/hooks/useTradesData";
import type { Trade } from "@/hooks/useTradesData";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, FileText, Tag, AlertTriangle, ArrowRight } from "lucide-react";

// ─── helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function hasNotes(trade: Trade): boolean {
  return !!(trade.notes || trade.setup || trade.mistake || trade.next_time);
}

function outcomeClass(outcome: Trade["outcome"]): string {
  switch (outcome) {
    case "WIN":
      return "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
    case "LOSS":
      return "border-red-400/45 bg-red-500/15 text-red-200";
    case "BE":
      return "border-zinc-500/40 text-zinc-400 bg-zinc-500/10";
    default:
      return "border-yellow-500/40 text-yellow-400 bg-yellow-500/10";
  }
}

function outcomeLabel(outcome: Trade["outcome"]): string {
  switch (outcome) {
    case "WIN":
      return "Win";
    case "LOSS":
      return "Loss";
    case "BE":
      return "Break Even";
    default:
      return "Open";
  }
}

function pnlFormatted(pnl: number | undefined): string {
  if (pnl === undefined || pnl === null) return "—";
  const sign = pnl >= 0 ? "+" : "−";
  return `${sign}$${Math.abs(pnl).toFixed(2)}`;
}

function pnlColor(pnl: number | undefined): string {
  if (pnl === undefined || pnl === null) return "text-zinc-400";
  return pnl >= 0 ? "text-emerald-400" : "text-red-400";
}

// ─── shared compact trade row (Tags tab) ───────────────────────────────────

function CompactTradeRow({
  trade,
  onClick,
}: {
  trade: Trade;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-900/80 hover:border-zinc-700"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-semibold text-white">{trade.symbol}</span>
        <span className="text-zinc-500 text-xs tabular-nums">{formatDate(trade.open_at)}</span>
        <Badge
          variant="outline"
          className={`text-xs ${outcomeClass(trade.outcome)}`}
        >
          {outcomeLabel(trade.outcome)}
        </Badge>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`font-medium tabular-nums text-xs ${pnlColor(trade.pnl)}`}>
          {pnlFormatted(trade.pnl)}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
      </div>
    </button>
  );
}

// ─── Notes tab ─────────────────────────────────────────────────────────────

interface NoteField {
  label: string;
  value: string;
  color: string;
}

function NoteCard({
  trade,
  onClick,
}: {
  trade: Trade;
  onClick: () => void;
}) {
  const fields: NoteField[] = [
    trade.setup
      ? { label: "Setup", value: trade.setup, color: "text-blue-400" }
      : null,
    trade.notes
      ? { label: "Notes", value: trade.notes, color: "text-zinc-300" }
      : null,
    trade.mistake
      ? { label: "Mistake", value: trade.mistake, color: "text-red-400" }
      : null,
    trade.next_time
      ? { label: "Next Time", value: trade.next_time, color: "text-yellow-400" }
      : null,
  ].filter((f): f is NoteField => f !== null);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/70"
    >
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-white text-base">{trade.symbol}</span>
          <span className="text-zinc-500 text-xs tabular-nums">{formatDate(trade.open_at)}</span>
          <Badge
            variant="outline"
            className={`text-xs ${outcomeClass(trade.outcome)}`}
          >
            {outcomeLabel(trade.outcome)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-semibold tabular-nums ${pnlColor(trade.pnl)}`}>
            {pnlFormatted(trade.pnl)}
          </span>
          <ArrowRight className="h-4 w-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Note fields */}
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.label} className="flex gap-2 text-sm">
            <span className="shrink-0 w-20 text-xs font-medium text-zinc-500 uppercase tracking-wide pt-0.5">
              {field.label}
            </span>
            <span className={`min-w-0 break-words ${field.color}`}>{field.value}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

function NotesTab({ trades }: { trades: Trade[] }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const tradesWithNotes = trades.filter(hasNotes);
    if (!search.trim()) return tradesWithNotes;
    const q = search.toLowerCase();
    return tradesWithNotes.filter(
      (t) =>
        (t.notes?.toLowerCase().includes(q)) ||
        (t.setup?.toLowerCase().includes(q)) ||
        (t.mistake?.toLowerCase().includes(q)) ||
        (t.next_time?.toLowerCase().includes(q)) ||
        t.symbol.toLowerCase().includes(q),
    );
  }, [trades, search]);

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes, setups, mistakes…"
          className="pl-9 bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600"
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? "No matching notes" : "No notes yet"}
          description={
            search
              ? "Try a different search term."
              : "Open a trade and fill in Setup, Notes, Mistake, or Next Time to see them here."
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
            {filtered.length} trade{filtered.length !== 1 ? "s" : ""} with notes
          </p>
          <div className="space-y-3">
            {filtered.map((trade) => (
              <NoteCard
                key={trade.id}
                trade={trade}
                onClick={() => navigate(`/app/journal/${trade.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tags tab ───────────────────────────────────────────────────────────────

function TagsTab({ trades }: { trades: Trade[] }) {
  const navigate = useNavigate();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Build frequency map — trades.tags is text[] from DB
  const tagFrequency = useMemo(() => {
    const map = new Map<string, number>();
    for (const trade of trades) {
      const tags: string[] = Array.isArray((trade as any).tags)
        ? (trade as any).tags
        : [];
      for (const tag of tags) {
        const t = tag.trim();
        if (t) map.set(t, (map.get(t) ?? 0) + 1);
      }
    }
    // Sort by count desc, then alpha
    return Array.from(map.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [trades]);

  const filteredTrades = useMemo(() => {
    if (!selectedTag) return [];
    return trades.filter((t) => {
      const tags: string[] = Array.isArray((t as any).tags)
        ? (t as any).tags
        : [];
      return tags.map((x) => x.trim()).includes(selectedTag);
    });
  }, [trades, selectedTag]);

  if (tagFrequency.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="No tags yet"
        description="Tag trades in the trade detail view to see a frequency breakdown here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Tag cloud */}
      <div>
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide mb-3">
          {tagFrequency.length} unique tag{tagFrequency.length !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {tagFrequency.map(([tag, count]) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(isActive ? null : tag)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-all
                  ${isActive
                    ? "border-yellow-500/60 bg-yellow-500/15 text-yellow-300"
                    : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/80 hover:text-white"
                  }`}
              >
                <span>{tag}</span>
                <span
                  className={`rounded-full px-1.5 py-0 text-xs font-semibold tabular-nums
                    ${isActive ? "bg-yellow-500/30 text-yellow-200" : "bg-zinc-800 text-zinc-400"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtered trade list */}
      {selectedTag && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
            {filteredTrades.length} trade{filteredTrades.length !== 1 ? "s" : ""} tagged &ldquo;{selectedTag}&rdquo;
          </p>
          <div className="space-y-2">
            {filteredTrades.map((trade) => (
              <CompactTradeRow
                key={trade.id}
                trade={trade}
                onClick={() => navigate(`/app/journal/${trade.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mistakes tab ───────────────────────────────────────────────────────────

function MistakeCard({
  trade,
  onClick,
}: {
  trade: Trade;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-red-900/30 bg-zinc-900/40 p-5 transition-all hover:border-red-800/50 hover:bg-zinc-900/70"
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-white text-base">{trade.symbol}</span>
          <span className="text-zinc-500 text-xs tabular-nums">{formatDate(trade.open_at)}</span>
          <Badge
            variant="outline"
            className={`text-xs ${outcomeClass(trade.outcome)}`}
          >
            {outcomeLabel(trade.outcome)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-semibold tabular-nums ${pnlColor(trade.pnl)}`}>
            {pnlFormatted(trade.pnl)}
          </span>
          <ArrowRight className="h-4 w-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Mistake */}
      <div className="flex gap-2 text-sm mb-2">
        <span className="shrink-0 w-20 text-xs font-medium text-zinc-500 uppercase tracking-wide pt-0.5">
          Mistake
        </span>
        <span className="text-red-300 break-words min-w-0">{trade.mistake}</span>
      </div>

      {/* Next time */}
      {trade.next_time && (
        <div className="flex gap-2 text-sm">
          <span className="shrink-0 w-20 text-xs font-medium text-zinc-500 uppercase tracking-wide pt-0.5">
            Next Time
          </span>
          <span className="text-yellow-400 break-words min-w-0">{trade.next_time}</span>
        </div>
      )}
    </button>
  );
}

function MistakesTab({ trades }: { trades: Trade[] }) {
  const navigate = useNavigate();

  const tradesWithMistake = useMemo(
    () =>
      trades
        .filter((t) => !!t.mistake)
        .slice() // already sorted newest-first from useTrades
        ,
    [trades],
  );

  if (tradesWithMistake.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No mistakes logged"
        description="When you log a mistake on a trade, it appears here so you can learn from it."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
        {tradesWithMistake.length} trade{tradesWithMistake.length !== 1 ? "s" : ""} with mistakes logged
      </p>
      <div className="space-y-3">
        {tradesWithMistake.map((trade) => (
          <MistakeCard
            key={trade.id}
            trade={trade}
            onClick={() => navigate(`/app/journal/${trade.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 py-16 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <Icon className="h-6 w-6 text-zinc-500" strokeWidth={1.5} />
      </div>
      <p className="text-base font-semibold text-zinc-300 mb-1">{title}</p>
      <p className="text-sm text-zinc-500 max-w-xs">{description}</p>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function JournalNotes() {
  const { data: trades = [], isLoading } = useTrades();

  return (
    <div className="p-6 space-y-6">
      <PageTitle title="Notes & Tags" subtitle="Browse and search your trade annotations" />

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <span className="animate-pulse text-sm">Loading trades…</span>
        </div>
      ) : (
        <Tabs defaultValue="notes" className="space-y-5">
          <TabsList className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 h-auto gap-1">
            <TabsTrigger
              value="notes"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5 inline-block" />
              Notes
            </TabsTrigger>
            <TabsTrigger
              value="tags"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all"
            >
              <Tag className="mr-1.5 h-3.5 w-3.5 inline-block" />
              Tags
            </TabsTrigger>
            <TabsTrigger
              value="mistakes"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all"
            >
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5 inline-block" />
              Mistakes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-0">
            <NotesTab trades={trades} />
          </TabsContent>

          <TabsContent value="tags" className="mt-0">
            <TagsTab trades={trades} />
          </TabsContent>

          <TabsContent value="mistakes" className="mt-0">
            <MistakesTab trades={trades} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
