import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePortfolioContext } from '@/contexts/PortfolioContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

// Inline type — whisper_paper_trades is not in database.types.ts
interface WhisperSetup {
  id: number;
  date_ny: string;
  asset: string;
  direction: 'long' | 'short';
  take_time_ny: string;
  level_taken: number;
  take_type: string | null;
  entry: number | null;
  sl: number | null;
  tp: number | null;
  outcome: string;
  mss_time_ny: string | null;
  fvg_time_ny: string | null;
  fill_time_ny: string | null;
}

const OUTCOME_LABELS: Record<string, string> = {
  NO_MSS:          'No market structure shift',
  NO_FVG:          'No FVG formed',
  INVALIDATED:     'Invalidated before fill',
  NO_FILL_TP_TAKEN:'TP hit before fill',
  EXPIRED:         'Order expired',
  PENDING:         'Pending',
};

function formatTakeTime(takeTimeNy: string): string {
  try {
    // Timestamps store NY wall-clock as UTC — format with UTC timezone to
    // display the intended NY time without an offset conversion.
    return (
      new Date(takeTimeNy).toLocaleTimeString('en-US', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) + ' NY'
    );
  } catch {
    return takeTimeNy;
  }
}

export default function WhisperSetupsPanel() {
  const { isAdmin } = useAdminAuth();
  const { activePortfolio } = usePortfolioContext();
  const isWhisperAccount = activePortfolio?.name === 'WHISPER (Paper)';

  const { data: setups = [], isLoading, error } = useQuery({
    queryKey: ['whisper-unfilled-setups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whisper_paper_trades')
        .select(
          'id, date_ny, asset, direction, take_time_ny, level_taken, take_type, entry, sl, tp, outcome, mss_time_ny, fvg_time_ny, fill_time_ny'
        )
        .is('fill_time_ny', null)
        .order('date_ny', { ascending: false })
        .order('take_time_ny', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as WhisperSetup[];
    },
    enabled: isAdmin && isWhisperAccount,
    staleTime: 5 * 60 * 1000,
  });

  // Self-gate: renders nothing unless admin + WHISPER (Paper) account selected
  if (!isAdmin || !isWhisperAccount) return null;

  return (
    <Card className="mb-4 bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-200">
          WHISPER Setups — not filled ({setups.length})
        </CardTitle>
        <p className="text-xs text-zinc-500 mt-0.5">
          Liquidity takes that did not become trades (no entry/exit). Filled trades appear in the
          table below.
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-zinc-500">Loading setups…</div>
        ) : error ? (
          <div className="py-6 text-center text-sm text-red-400">Failed to load setups.</div>
        ) : setups.length === 0 ? (
          <div className="py-6 text-center text-sm text-zinc-500">No un-filled setups.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400 text-xs">Date</TableHead>
                  <TableHead className="text-zinc-400 text-xs">Asset</TableHead>
                  <TableHead className="text-zinc-400 text-xs">Dir</TableHead>
                  <TableHead className="text-zinc-400 text-xs">Take time</TableHead>
                  <TableHead className="text-zinc-400 text-xs text-right">Level</TableHead>
                  <TableHead className="text-zinc-400 text-xs">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setups.map((s) => (
                  <TableRow key={s.id} className="border-zinc-800/60 hover:bg-zinc-900/40">
                    <TableCell className="text-xs text-zinc-300 font-mono">{s.date_ny}</TableCell>
                    <TableCell className="text-xs text-zinc-200 font-medium">{s.asset}</TableCell>
                    <TableCell
                      className={`text-xs font-semibold uppercase ${
                        s.direction === 'long' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {s.direction.toUpperCase()}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 font-mono">
                      {formatTakeTime(s.take_time_ny)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-300 text-right font-mono">
                      {Number(s.level_taken).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {OUTCOME_LABELS[s.outcome] ?? s.outcome}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
