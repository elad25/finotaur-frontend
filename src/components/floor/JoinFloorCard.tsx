// src/components/floor/JoinFloorCard.tsx
// =====================================================
// CTA card for joining the active Floor competition,
// or a locked state when the user has already joined.
// =====================================================

import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Trophy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FloorCompetition } from '@/hooks/useFloor';
import {
  useMyFloorParticipation,
  useJoinFloor,
} from '@/hooks/useFloor';

interface JoinFloorCardProps {
  competition: FloorCompetition;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export const JoinFloorCard = memo(function JoinFloorCard({
  competition,
}: JoinFloorCardProps) {
  const { data: participation, isLoading: participationLoading } =
    useMyFloorParticipation(competition.id);
  const { mutate: joinFloor, isPending, error, reset } = useJoinFloor();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleConfirm = () => {
    reset();
    joinFloor(
      { competitionId: competition.id },
      {
        onSuccess: () => setDialogOpen(false),
      },
    );
  };

  // Determine if the error is broker_required (special inline link case)
  const isBrokerRequired =
    error?.message?.toLowerCase().includes('broker') ?? false;

  if (participationLoading) {
    return (
      <div
        className="rounded-[20px] h-[88px] animate-pulse"
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}
      />
    );
  }

  // Already joined — locked state
  if (participation) {
    return (
      <div
        className="rounded-[20px] p-5 flex items-center gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.03) 100%)',
          border: '1px solid rgba(201,166,70,0.25)',
        }}
      >
        <div
          className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: 'rgba(201,166,70,0.15)',
            border: '1px solid rgba(201,166,70,0.3)',
          }}
        >
          <Lock className="h-5 w-5" style={{ color: '#E8C766' }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#E8C766' }}>
            You&apos;re competing in {competition.title}
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: '#666' }}>
            Your decision is locked until {formatDate(competition.period_end)}.
          </p>
        </div>
      </div>
    );
  }

  // Not joined — CTA
  return (
    <>
      <div
        className="rounded-[20px] p-5"
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              background: 'rgba(201,166,70,0.1)',
              border: '1px solid rgba(201,166,70,0.25)',
            }}
          >
            <Trophy className="h-5 w-5" style={{ color: '#C9A646' }} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">Join The Floor</h3>
            <p className="mt-1 text-[12px]" style={{ color: '#888' }}>
              Only your real broker-verified trades count — manual entries are
              never included.
            </p>
            <p className="mt-1 text-[11px]" style={{ color: '#555' }}>
              Minimum {competition.min_trades} trades to qualify.
            </p>
          </div>

          <button
            onClick={() => { reset(); setDialogOpen(true); }}
            className="flex-shrink-0 rounded-[10px] px-4 py-2 text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #E8C766 100%)',
              color: '#0A0A0A',
            }}
          >
            Join this month&apos;s competition
          </button>
        </div>

        {/* Inline error (non-broker) */}
        {error && !isBrokerRequired && (
          <p
            className="mt-3 text-[12px] rounded-lg px-3 py-2"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            {error.message}
          </p>
        )}

        {/* Broker required error with settings link */}
        {error && isBrokerRequired && (
          <p
            className="mt-3 text-[12px] rounded-lg px-3 py-2"
            style={{ background: 'rgba(201,166,70,0.08)', color: '#C9A646', border: '1px solid rgba(201,166,70,0.2)' }}
          >
            Connect a broker first to compete.{' '}
            <Link
              to="/app/journal/settings"
              className="underline underline-offset-2 font-medium hover:opacity-80"
            >
              Go to Settings
            </Link>
          </p>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: '#0A0A0A',
            border: '1px solid rgba(201,166,70,0.25)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-semibold">
              Join the competition?
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
            By joining, your verified results become public on the leaderboard.
            This choice is locked until the competition ends — you can&apos;t
            opt out mid-cycle. Only your real broker-verified trades count;
            manual trades are never included.
          </p>

          {/* Dialog-level error */}
          {error && (
            <div>
              {isBrokerRequired ? (
                <p
                  className="text-[12px] rounded-lg px-3 py-2"
                  style={{ background: 'rgba(201,166,70,0.08)', color: '#C9A646', border: '1px solid rgba(201,166,70,0.2)' }}
                >
                  Connect a broker first to compete.{' '}
                  <Link
                    to="/app/journal/settings"
                    onClick={() => setDialogOpen(false)}
                    className="underline underline-offset-2 font-medium hover:opacity-80"
                  >
                    Go to Settings
                  </Link>
                </p>
              ) : (
                <p
                  className="text-[12px] rounded-lg px-3 py-2"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {error.message}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
              className="rounded-[10px] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
              style={{ color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="rounded-[10px] px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #E8C766 100%)',
                color: '#0A0A0A',
              }}
            >
              {isPending ? 'Joining…' : 'Join & lock in'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

JoinFloorCard.displayName = 'JoinFloorCard';
