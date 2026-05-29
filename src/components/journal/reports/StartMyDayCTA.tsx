import { Sunrise } from "lucide-react";

interface StartMyDayCTAProps {
  onClick?: () => void;
}

export default function StartMyDayCTA({ onClick }: StartMyDayCTAProps) {
  return (
    <div className="bg-gradient-to-r from-yellow-600/15 to-transparent rounded-2xl border border-yellow-500/30 p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Sunrise className="w-8 h-8 text-yellow-400 shrink-0" />
        <div>
          <p className="text-yellow-100 font-semibold text-base">Start my day</p>
          <p className="text-zinc-400 text-sm mt-0.5">
            Quick prep before market open — checklist + yesterday&apos;s lessons in 60 seconds.
          </p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={!onClick}
        className="px-4 py-2 rounded-xl border border-yellow-500/40 bg-yellow-600/25 text-yellow-100 hover:bg-yellow-600/35 text-sm transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Open Planner
      </button>
    </div>
  );
}
