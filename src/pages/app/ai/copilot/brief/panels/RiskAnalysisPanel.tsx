import { PremiumFrame } from '../PremiumFrame';
import { PanelHeader } from './_shared';

function RiskManagementGoldMark() {
  const totalTicks = 44;
  const fillFraction = 0.72;
  const startDeg = -132;
  const endDeg = 132;
  const ticks = Array.from({ length: totalTicks }, (_, index) => {
    const progress = index / (totalTicks - 1);
    const deg = startDeg + (endDeg - startDeg) * progress;
    const rad = ((deg - 90) * Math.PI) / 180;
    const inner = 57;
    const outer = index % 4 === 0 ? 72 : 68;
    return {
      x1: Math.cos(rad) * inner,
      y1: Math.sin(rad) * inner,
      x2: Math.cos(rad) * outer,
      y2: Math.sin(rad) * outer,
      bright: progress <= fillFraction,
      width: index % 4 === 0 ? 2.1 : 1.35,
    };
  });

  return (
    <div className="relative h-32 w-32">
      <div className="absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(244,217,123,0.18),rgba(201,166,70,0.05)_42%,transparent_68%)] blur-md" />
      <svg viewBox="-100 -100 200 200" className="relative h-full w-full overflow-visible drop-shadow-[0_0_22px_rgba(201,166,70,0.26)]" aria-hidden="true">
        <defs>
          <linearGradient id="riskGoldArc" x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="45%" stopColor="var(--gold-primary)" />
            <stop offset="100%" stopColor="var(--gold-deep)" />
          </linearGradient>
          <linearGradient id="riskGoldText" x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="60%" stopColor="var(--gold-primary)" />
            <stop offset="100%" stopColor="var(--gold-deep)" />
          </linearGradient>
          <radialGradient id="riskGoldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(244,217,123,0.46)" />
            <stop offset="60%" stopColor="rgba(201,166,70,0.10)" />
            <stop offset="100%" stopColor="rgba(201,166,70,0)" />
          </radialGradient>
        </defs>

        <circle r="82" fill="url(#riskGoldGlow)" opacity="0.56" />
        <circle r="88" fill="none" stroke="rgba(244,217,123,0.14)" strokeWidth="0.8" />
        <g opacity="0.72">
          <animateTransform attributeName="transform" type="scale" values="0.985;1.035;0.985" dur="4.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.48;0.78;0.48" dur="4.2s" repeatCount="indefinite" />
          <circle
            r="88"
            fill="none"
            stroke="url(#riskGoldArc)"
            strokeWidth="1.15"
            strokeLinecap="round"
          />
        </g>
        <circle r="78" fill="none" stroke="url(#riskGoldArc)" strokeWidth="0.9" strokeDasharray="1 4" opacity="0.68" />
        <circle r="54" fill="none" stroke="rgba(244,217,123,0.18)" strokeWidth="0.7" />

        <g stroke="url(#riskGoldArc)" strokeLinecap="round">
          {ticks.map((tick, index) => (
            <line
              key={index}
              x1={tick.x1.toFixed(2)}
              y1={tick.y1.toFixed(2)}
              x2={tick.x2.toFixed(2)}
              y2={tick.y2.toFixed(2)}
              strokeWidth={tick.width}
              opacity={tick.bright ? 0.95 : 0.25}
            />
          ))}
        </g>

        <g stroke="url(#riskGoldArc)" strokeLinecap="round" fill="none" opacity="0.7">
          <path d="M -76 -20 A 78 78 0 0 0 -76 20" strokeWidth="1.4" />
          <path d="M 76 -20 A 78 78 0 0 1 76 20" strokeWidth="1.4" />
          <path d="M -60 -54 A 78 78 0 0 0 -50 -64" strokeWidth="1.1" />
          <path d="M 60 -54 A 78 78 0 0 1 50 -64" strokeWidth="1.1" />
          <path d="M -60 54 A 78 78 0 0 1 -50 64" strokeWidth="1.1" />
          <path d="M 60 54 A 78 78 0 0 0 50 64" strokeWidth="1.1" />
        </g>

        <g fill="var(--gold-bright)" opacity="0.82">
          <polygon points="0,-58 2.1,-55 0,-52 -2.1,-55" />
          <polygon points="0,58 2.1,55 0,52 -2.1,55" />
          <polygon points="-58,0 -55,2.1 -52,0 -55,-2.1" />
          <polygon points="58,0 55,2.1 52,0 55,-2.1" />
        </g>

      </svg>
    </div>
  );
}

export function RiskAnalysisPanel({
  className,
  isConnected,
}: {
  className?: string;
  isConnected: boolean;
}) {
  if (!isConnected) {
    return (
      <PremiumFrame className={`min-h-[210px] ${className}`}>
        <div className="p-5">
          <PanelHeader title="RISK ANALYSIS" action="VIEW ALL" actionTo="/app/ai/copilot/risks" />
          <div className="mt-4 flex min-h-[120px] items-center justify-center">
            <span className="text-[13px] text-ink-tertiary">Connect a broker to see your risk profile</span>
          </div>
        </div>
      </PremiumFrame>
    );
  }

  const rows = [
    ['Market Risk', 'Medium'],
    ['Credit Risk', 'Low'],
    ['Liquidity Risk', 'Low'],
    ['Volatility Risk', 'Medium'],
    ['Concentration Risk', 'Low'],
  ];
  return (
    <PremiumFrame className={`min-h-[210px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="RISK ANALYSIS" action="VIEW ALL" actionTo="/app/ai/copilot/risks" />
        <div className="mt-4 grid grid-cols-[130px_1fr] gap-4 items-center">
          <RiskManagementGoldMark />
          <div className="space-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-ink-secondary">{label}</span>
                <span className={value === 'Medium' ? 'text-gold-primary' : 'text-ink-primary'}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PremiumFrame>
  );
}
