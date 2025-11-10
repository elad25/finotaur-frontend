import React from "react";

export default function QuickActionBar() {
  return (
    <div className="fixed top-20 right-4 z-30 flex flex-col gap-2">
      <button className="rounded-md border border-[#2a2a2a] bg-[#0E0E0E] px-3 py-2 text-xs text-[#F5F5F5] hover:border-[#FFD700]/60 hover:shadow-[0_0_12px_rgba(255,215,0,0.15)] transition">
        + Add to Watchlist
      </button>
      <button className="rounded-md border border-[#2a2a2a] bg-[#0E0E0E] px-3 py-2 text-xs text-[#F5F5F5] hover:border-[#FFD700]/60 hover:shadow-[0_0_12px_rgba(255,215,0,0.15)] transition">
        🔔 Set Alert
      </button>
      <button className="rounded-md border border-[#2a2a2a] bg-[#0E0E0E] px-3 py-2 text-xs text-[#F5F5F5] hover:border-[#FFD700]/60 hover:shadow-[0_0_12px_rgba(255,215,0,0.15)] transition">
        📊 Open Chart
      </button>
      <button className="rounded-md border border-[#2a2a2a] bg-[#0E0E0E] px-3 py-2 text-xs text-[#F5F5F5] hover:border-[#FFD700]/60 hover:shadow-[0_0_12px_rgba(255,215,0,0.15)] transition">
        🧠 AI Insights
      </button>
    </div>
  );
}
