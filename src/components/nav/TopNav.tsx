import React from "react";

export default function TopNav() {
return (
    <div 
      className="flex items-center justify-between gap-3 px-4 py-3 border-b sticky top-0 z-50"
      style={{
        background: 'linear-gradient(to bottom, #0A0A0A, #141414)',
        borderColor: 'rgba(255, 215, 0, 0.08)'
      }}
    >
      {/* Left: brand */}
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold tracking-wide">Finotaur</span>
      </div>

      {/* Right: persistent items */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search symbols, news..."
            className="w-56 rounded-md bg-[#0E0E0E] border border-[#2a2a2a] px-3 py-1.5 text-sm text-[#F5F5F5] placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/30 transition"
          />
          <span className="absolute right-2 top-1.5 text-neutral-500 text-sm">⌘K</span>
        </div>

        <button className="rounded-md border border-[#2a2a2a] px-2 py-1 text-sm hover:border-[#FFD700]/60 hover:shadow-[0_0_12px_rgba(255,215,0,0.15)] transition" aria-label="Alerts">🔔</button>
        <button className="rounded-md border border-[#2a2a2a] px-2 py-1 text-sm hover:border-[#FFD700]/60 hover:shadow-[0_0_12px_rgba(255,215,0,0.15)] transition" aria-label="Settings">⚙️</button>
        <div className="h-6 w-px bg-neutral-800 mx-1" />
        <button className="rounded-full border border-[#2a2a2a] w-8 h-8 text-sm hover:border-[#FFD700]/60 transition" aria-label="Profile">👤</button>
      </div>
    </div>
  );
}
