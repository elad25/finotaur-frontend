// src/components/floor/FloorProfileGate.tsx
// =====================================================
// THE FLOOR — profile completeness gate
// If the user has not set a Floor username + display
// name, renders a centered prompt instead of children.
// =====================================================

import { useState } from 'react';
import { useFloorProfile } from '@/features/floor/hooks/useFloorProfile';
import { FloorProfileDialog } from './FloorProfileDialog';

interface FloorProfileGateProps {
  children: React.ReactNode;
}

export function FloorProfileGate({ children }: FloorProfileGateProps) {
  const { isComplete, isLoading, refetch } = useFloorProfile();
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Loading ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-8 w-8 rounded-full border-2 animate-spin"
          style={{
            borderColor: 'rgba(201,166,70,0.3)',
            borderTopColor: '#C9A646',
          }}
        />
      </div>
    );
  }

  // ── Profile complete — pass through ─────────────
  if (isComplete) {
    return <>{children}</>;
  }

  // ── Gate — profile not set up ────────────────────
  return (
    <>
      <div className="flex items-center justify-center px-4 py-20">
        <div
          className="w-full max-w-sm rounded-[20px] p-8 text-center space-y-4"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.06) 0%, rgba(201,166,70,0.02) 100%)',
            border: '1px solid rgba(201,166,70,0.2)',
          }}
        >
          {/* Logo — FINOTAUR bull, blended naturally into the card (no container) */}
          <div className="flex justify-center">
            <img
              src="/BULL%20ONLY.png"
              alt="FINOTAUR"
              className="h-24 w-auto object-contain"
              style={{
                maskImage: 'radial-gradient(ellipse at center, black 56%, transparent 82%)',
                WebkitMaskImage: 'radial-gradient(ellipse at center, black 56%, transparent 82%)',
              }}
            />
          </div>

          {/* Heading */}
          <h2 className="text-base font-semibold text-white">
            Set up your Floor profile
          </h2>

          {/* Body */}
          <p className="text-sm leading-relaxed" style={{ color: '#888' }}>
            Choose a unique nickname and an avatar before you can post,
            compete, or appear on the leaderboard. Your nickname stays
            for 3 months.
          </p>

          {/* CTA */}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center justify-center rounded-[12px] px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #E8C766 100%)',
              color: '#0A0A0A',
            }}
          >
            Set up profile
          </button>
        </div>
      </div>

      <FloorProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => {
          setDialogOpen(false);
          void refetch();
        }}
      />
    </>
  );
}
