export function HolographicAICore({ className = '' }: { className?: string }) {
  const bars = [18, 30, 22, 44, 28, 52, 34, 46, 24, 38, 20, 32];

  return (
    <div
      className={`relative z-10 mt-[-8px] flex h-[278px] w-[500px] max-w-full items-center justify-center overflow-visible ${className}`}
      role="img"
      aria-label="Lightweight AI portfolio signal core"
    >
      <div className="absolute left-1/2 top-1/2 h-[196px] w-[196px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-primary/20 bg-black/24 shadow-[0_0_42px_rgba(201,166,70,0.12)]" />
      <div className="absolute left-1/2 top-1/2 h-[138px] w-[138px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-primary/14" />
      <div className="absolute left-1/2 top-1/2 h-[74px] w-[74px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-primary/28 bg-[radial-gradient(circle,rgba(244,217,123,0.22)_0%,rgba(201,166,70,0.08)_44%,rgba(0,0,0,0)_72%)]" />

      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-primary shadow-[0_0_18px_rgba(244,217,123,0.42)]" />

      <svg
        className="absolute left-1/2 top-1/2 h-[172px] w-[172px] -translate-x-1/2 -translate-y-1/2 overflow-visible"
        viewBox="0 0 172 172"
        aria-hidden="true"
      >
        <circle cx="86" cy="86" r="70" fill="none" stroke="rgba(201,166,70,0.13)" strokeWidth="1" />
        <circle cx="86" cy="86" r="48" fill="none" stroke="rgba(244,217,123,0.12)" strokeWidth="1" strokeDasharray="2 8" />
        <path
          d="M24 88 C36 82, 43 96, 54 88 S75 74, 86 88 S107 103, 119 88 S139 78, 148 88"
          fill="none"
          stroke="rgba(244,217,123,0.72)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M34 104 C52 96, 69 111, 86 102 S117 92, 139 100"
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute left-1/2 top-[55%] flex h-[58px] -translate-x-1/2 items-end gap-[4px] opacity-70">
        {bars.map((height, index) => (
          <span
            key={index}
            className="w-px rounded-full bg-gradient-to-t from-gold-primary/0 via-gold-primary/42 to-[#ffe4a0]/78"
            style={{ height }}
          />
        ))}
      </div>

      <div className="absolute bottom-[20px] left-1/2 h-[18px] w-[220px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(201,166,70,0.13)_0%,rgba(201,166,70,0.04)_52%,rgba(0,0,0,0)_76%)] blur-[10px]" />
    </div>
  );
}
