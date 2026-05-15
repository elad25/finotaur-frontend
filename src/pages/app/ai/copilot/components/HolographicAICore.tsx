const pulseDots = [
  { left: '18%', top: '42%', delay: '0s' },
  { left: '31%', top: '29%', delay: '1.1s' },
  { left: '68%', top: '33%', delay: '0.7s' },
  { left: '78%', top: '55%', delay: '1.8s' },
  { left: '47%', top: '72%', delay: '1.4s' },
  { left: '58%', top: '20%', delay: '2.2s' },
];

const verticalTicks = Array.from({ length: 28 }, (_, index) => {
  const height = 12 + ((index * 17) % 31);
  return { height, delay: `${index * 0.08}s` };
});

export function HolographicAICore({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative z-10 mt-[-8px] flex h-[278px] w-[500px] max-w-full items-center justify-center overflow-visible ${className}`}
      role="img"
      aria-label="Minimal AI signal hub with financial waveform and market pulses"
    >
      <div className="absolute inset-x-[8%] top-1/2 h-px bg-gradient-to-r from-transparent via-[#d8b451]/30 to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-[178px] w-[178px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d8b451]/22 shadow-[0_0_34px_rgba(216,180,81,0.08)] animate-[aiHubRotate_18s_linear_infinite]" />
      <div className="absolute left-1/2 top-1/2 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#ffe4a0]/18 animate-[aiHubRotateReverse_24s_linear_infinite]" />
      <div className="absolute left-1/2 top-1/2 h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#7a5c1d]/28 bg-[radial-gradient(circle,rgba(216,180,81,0.11)_0%,rgba(216,180,81,0.035)_46%,rgba(0,0,0,0)_72%)]" />

      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffe4a0] shadow-[0_0_18px_rgba(255,228,160,0.55)] animate-[aiHubBreathe_3.8s_ease-in-out_infinite]" />
      <div className="absolute left-1/2 top-1/2 h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d8b451]/24 animate-[aiHubBreathe_4.6s_ease-in-out_infinite]" />

      <svg
        className="absolute left-1/2 top-1/2 h-[188px] w-[188px] -translate-x-1/2 -translate-y-1/2 overflow-visible animate-[aiHubRotate_28s_linear_infinite]"
        viewBox="0 0 188 188"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="aiHubGoldWave" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#d8b451" stopOpacity="0" />
            <stop offset="18%" stopColor="#d8b451" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#ffe4a0" stopOpacity="0.74" />
            <stop offset="82%" stopColor="#d8b451" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d8b451" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M18 94 C28 91, 34 98, 42 94 S56 84, 66 94 S80 109, 92 94 S108 78, 121 94 S137 111, 150 94 S164 83, 170 94"
          fill="none"
          stroke="url(#aiHubGoldWave)"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="animate-[aiHubWave_5s_ease-in-out_infinite]"
        />
        <path
          d="M25 109 C43 104, 52 112, 67 108 S94 96, 112 106 S139 119, 163 105"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.16"
          strokeWidth="0.8"
          strokeLinecap="round"
          className="animate-[aiHubWaveSoft_6.5s_ease-in-out_infinite]"
        />
      </svg>

      <div className="absolute left-1/2 top-[54%] flex h-[54px] -translate-x-1/2 items-end gap-[3px] opacity-55">
        {verticalTicks.map((tick, index) => (
          <span
            key={index}
            className="w-px rounded-full bg-gradient-to-t from-[#7a5c1d]/0 via-[#d8b451]/42 to-[#ffe4a0]/70 animate-[aiHubTick_2.8s_ease-in-out_infinite]"
            style={{ height: `${tick.height}px`, animationDelay: tick.delay }}
          />
        ))}
      </div>

      {pulseDots.map((dot, index) => (
        <span
          key={index}
          className="absolute h-1.5 w-1.5 rounded-full bg-[#d8b451]/80 shadow-[0_0_12px_rgba(216,180,81,0.34)] animate-[aiHubPulse_4.8s_ease-in-out_infinite]"
          style={{ left: dot.left, top: dot.top, animationDelay: dot.delay }}
        />
      ))}

      <div className="absolute bottom-[18px] left-1/2 h-[18px] w-[210px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(216,180,81,0.15)_0%,rgba(216,180,81,0.04)_48%,rgba(0,0,0,0)_74%)] blur-[10px]" />
      <div className="absolute left-1/2 top-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(216,180,81,0.055)_0%,rgba(216,180,81,0.02)_34%,rgba(0,0,0,0)_66%)]" />

      <style>{`
        @keyframes aiHubRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes aiHubRotateReverse {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to { transform: translate(-50%, -50%) rotate(0deg); }
        }

        @keyframes aiHubBreathe {
          0%, 100% { opacity: 0.76; filter: brightness(0.94); }
          50% { opacity: 1; filter: brightness(1.16); }
        }

        @keyframes aiHubWave {
          0%, 100% { transform: translateX(-5px); opacity: 0.58; }
          50% { transform: translateX(5px); opacity: 0.9; }
        }

        @keyframes aiHubWaveSoft {
          0%, 100% { transform: translateX(6px); opacity: 0.15; }
          50% { transform: translateX(-6px); opacity: 0.28; }
        }

        @keyframes aiHubPulse {
          0%, 100% { opacity: 0.18; transform: scale(0.72); }
          42% { opacity: 0.78; transform: scale(1); }
          68% { opacity: 0.28; transform: scale(1.45); }
        }

        @keyframes aiHubTick {
          0%, 100% { opacity: 0.24; transform: scaleY(0.72); }
          50% { opacity: 0.72; transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
