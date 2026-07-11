// src/components/fino/FinoQuotaRing.tsx
// =====================================================
// FINO AI — compact quota ring shown next to the drawer title.
// Replaces the old "N of M questions today" pill with a small circular
// progress indicator: full gold ring + ∞ for unlimited tiers, otherwise a
// dashoffset-driven arc that empties as the user's daily questions run out.
// =====================================================

const RADIUS = 12.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈78.54

export default function FinoQuotaRing({
  used,
  limit,
}: {
  used: number;
  limit: number | null;
}) {
  if (limit === null) {
    return (
      <div className="relative flex h-[30px] w-[30px] items-center justify-center" title="Unlimited AI questions">
        <svg width={30} height={30} viewBox="0 0 30 30">
          <circle
            cx={15}
            cy={15}
            r={RADIUS}
            fill="none"
            stroke="#C9A646"
            strokeWidth={2.5}
          />
        </svg>
        <span className="absolute text-[10px] font-bold tabular-nums text-ink-primary">∞</span>
      </div>
    );
  }

  const remaining = Math.max(0, limit - used);
  const fraction = limit > 0 ? remaining / limit : 0;
  const dashoffset = CIRCUMFERENCE * (1 - fraction);

  const color = remaining === 0 ? '#EF4444' : remaining === 1 ? '#F59E0B' : '#C9A646';

  // No number inside the ring — the arc length alone conveys how many
  // questions are left (full → empty), with the exact count on hover.
  return (
    <div
      className="relative flex h-[30px] w-[30px] items-center justify-center"
      title={`${remaining} of ${limit} AI questions left today`}
    >
      <svg width={30} height={30} viewBox="0 0 30 30">
        <circle
          cx={15}
          cy={15}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,.1)"
          strokeWidth={2.5}
        />
        <circle
          cx={15}
          cy={15}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '15px 15px',
            transition: 'stroke-dashoffset 0.3s ease',
          }}
        />
      </svg>
    </div>
  );
}
