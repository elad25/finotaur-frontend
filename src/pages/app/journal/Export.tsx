import { useMemo, useState } from "react";
import PageTitle from "@/components/PageTitle";
import { Button } from "@/components/ds/Button";
import { Card } from "@/components/ds/Card";
import { useTrades, type Trade } from "@/hooks/useTradesData";
import { downloadCSV } from "@/utils/export";
import { FileDown, TrendingUp, TrendingDown, Calendar, BarChart2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type OutcomeFilter = "all" | "win" | "loss" | "be" | "open";

function isClosed(trade: Trade): boolean {
  if (trade.input_mode === "risk-only") {
    return trade.pnl !== null && trade.pnl !== undefined;
  }
  return trade.exit_price !== null && trade.exit_price !== undefined;
}

function tradeOutcome(trade: Trade): string {
  if (trade.outcome) return trade.outcome;
  const pnl = Number(trade.pnl ?? 0);
  if (isClosed(trade)) {
    if (pnl > 0) return "WIN";
    if (pnl < 0) return "LOSS";
    return "BE";
  }
  return "OPEN";
}

function formatDateOnly(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

function filterTrades(
  trades: Trade[],
  fromDate: string,
  toDate: string,
  outcome: OutcomeFilter,
): Trade[] {
  return trades.filter((t) => {
    // Date range
    if (fromDate) {
      const tradeDay = formatDateOnly(t.open_at);
      if (tradeDay < fromDate) return false;
    }
    if (toDate) {
      const tradeDay = formatDateOnly(t.open_at);
      if (tradeDay > toDate) return false;
    }
    // Outcome
    if (outcome !== "all") {
      const oc = tradeOutcome(t).toLowerCase();
      if (oc !== outcome) return false;
    }
    return true;
  });
}

function buildCSVRows(trades: Trade[]): string[][] {
  const header: string[] = [
    "Date",
    "Symbol",
    "Side",
    "Quantity",
    "Entry",
    "Exit",
    "P&L",
    "R",
    "Session",
    "Setup",
    "Notes",
    "Tags",
    "Mistake",
    "Next Time",
    "Strategy",
  ];

  const rows = trades.map((t): string[] => [
    formatDateOnly(t.open_at),
    t.symbol ?? "",
    t.side ?? "",
    String(t.quantity ?? ""),
    String(t.entry_price ?? ""),
    String(t.exit_price ?? ""),
    String(t.pnl ?? ""),
    String(
      t.actual_r ?? t.metrics?.actual_r ?? t.rr ?? "",
    ),
    t.session ?? "",
    t.setup ?? "",
    t.notes ?? "",
    Array.isArray((t as any).tags)
      ? (t as any).tags.join(";")
      : (t.quality_tag ?? ""),
    t.mistake ?? "",
    t.next_time ?? "",
    t.strategy_name ?? "",
  ]);

  return [header, ...rows];
}

// ---------------------------------------------------------------------------
// Summary card metric row
// ---------------------------------------------------------------------------
function Metric({
  label,
  value,
  valueClass = "text-ink-primary",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">
        {label}
      </span>
      <span className={`text-2xl font-bold tabular-nums leading-tight ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function JournalExport() {
  const { data: allTrades = [], isLoading } = useTrades();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");

  const filtered = useMemo(
    () => filterTrades(allTrades, fromDate, toDate, outcomeFilter),
    [allTrades, fromDate, toDate, outcomeFilter],
  );

  // Summary stats over the filtered set
  const summary = useMemo(() => {
    const closed = filtered.filter(isClosed);
    const totalPnL = closed.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);

    const dates = filtered
      .map((t) => formatDateOnly(t.open_at))
      .sort();
    const earliest = dates[0] ?? "";
    const latest = dates[dates.length - 1] ?? "";

    return { count: filtered.length, totalPnL, earliest, latest };
  }, [filtered]);

  function handleExport() {
    const rows = buildCSVRows(filtered);
    const filename = `finotaur-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(rows, filename);
  }

  const pnlClass =
    summary.totalPnL > 0
      ? "text-emerald-400"
      : summary.totalPnL < 0
        ? "text-num-negative"
        : "text-ink-primary";

  const pnlDisplay =
    summary.totalPnL >= 0
      ? `+$${Math.abs(summary.totalPnL).toFixed(2)}`
      : `-$${Math.abs(summary.totalPnL).toFixed(2)}`;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageTitle
        title="Export Trades"
        subtitle="Download your trade journal as a CSV file."
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Card variant="default" padding="default">
        <h2 className="mb-ds-4 text-sm font-semibold uppercase tracking-[0.12em] text-gold-primary">
          Filters
        </h2>

        <div className="grid gap-ds-4 sm:grid-cols-3">
          {/* From date */}
          <div className="flex flex-col gap-ds-2">
            <Label className="text-xs text-ink-secondary">From</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border-border-ds-subtle bg-surface-base text-ink-primary focus:border-gold-primary"
            />
          </div>

          {/* To date */}
          <div className="flex flex-col gap-ds-2">
            <Label className="text-xs text-ink-secondary">To</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border-border-ds-subtle bg-surface-base text-ink-primary focus:border-gold-primary"
            />
          </div>

          {/* Outcome */}
          <div className="flex flex-col gap-ds-2">
            <Label className="text-xs text-ink-secondary">Outcome</Label>
            <Select
              value={outcomeFilter}
              onValueChange={(v) => setOutcomeFilter(v as OutcomeFilter)}
            >
              <SelectTrigger className="border-border-ds-subtle bg-surface-base text-ink-primary focus:ring-gold-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectItem value="all">All outcomes</SelectItem>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="be">Break even</SelectItem>
                <SelectItem value="open">Open</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ── Summary ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <Card variant="default" padding="default">
          <p className="text-sm text-ink-secondary animate-pulse">Loading trades…</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card variant="default" padding="default">
          <div className="flex flex-col items-center gap-ds-3 py-ds-6 text-center">
            <BarChart2 className="h-10 w-10 text-ink-muted opacity-40" />
            <p className="text-sm text-ink-secondary">
              No trades match the current filters.
            </p>
            <p className="text-xs text-ink-muted">
              Adjust the date range or outcome filter to include trades.
            </p>
          </div>
        </Card>
      ) : (
        <Card variant="featured" padding="default">
          <h2 className="mb-ds-4 text-sm font-semibold uppercase tracking-[0.12em] text-gold-primary">
            Export summary
          </h2>

          <div className="grid grid-cols-2 gap-ds-5 sm:grid-cols-4">
            <Metric label="Trades" value={summary.count} />
            <Metric label="Total P&L" value={pnlDisplay} valueClass={pnlClass} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">
                Date range
              </span>
              {summary.earliest && summary.latest ? (
                <span className="flex items-center gap-1 text-sm text-ink-primary">
                  <Calendar className="h-3.5 w-3.5 text-gold-primary shrink-0" />
                  {summary.earliest === summary.latest
                    ? summary.earliest
                    : `${summary.earliest} – ${summary.latest}`}
                </span>
              ) : (
                <span className="text-sm text-ink-muted">—</span>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">
                Direction
              </span>
              <span className="flex items-center gap-2 text-sm text-ink-primary">
                {summary.totalPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-num-negative" />
                )}
                {summary.totalPnL >= 0 ? "Net positive" : "Net negative"}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ── Export button ────────────────────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex justify-start">
          <Button
            variant="gold"
            size="default"
            onClick={handleExport}
            showArrow={false}
          >
            <FileDown className="h-4 w-4" />
            Export as CSV
          </Button>
        </div>
      )}
    </div>
  );
}
