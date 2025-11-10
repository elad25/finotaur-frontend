import React from "react";

export default function RightInfoPanel({ open }: { open: boolean }) {
  return (
    <aside
      className={`hidden lg:block w-80 border-l border-neutral-800 bg-[#0E0E0E] transition-all duration-300 ${
        open ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div className="p-4 space-y-4">
        <div>
          <div className="text-xs uppercase text-neutral-400 tracking-wider">Market Sentiment</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
            <div className="text-sm text-[#F5F5F5]">Bullish</div>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase text-neutral-400 tracking-wider">Trending</div>
          <ul className="mt-2 space-y-1 text-sm text-[#F5F5F5]">
            <li>Oil (WTI)</li>
            <li>Gold</li>
            <li>Wheat</li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase text-neutral-400 tracking-wider">Top Headlines</div>
          <ul className="mt-2 space-y-2 text-sm text-neutral-300">
            <li className="hover:text-[#F5F5F5] transition">OPEC signals steady output...</li>
            <li className="hover:text-[#F5F5F5] transition">Gold steadies near highs...</li>
            <li className="hover:text-[#F5F5F5] transition">US crop report surprises...</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
