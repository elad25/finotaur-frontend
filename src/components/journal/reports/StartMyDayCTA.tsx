import { Sunrise } from "lucide-react";

interface StartMyDayCTAProps {
  onClick?: () => void;
}

export default function StartMyDayCTA({ onClick }: StartMyDayCTAProps) {
  return (
    <div className="rounded-[12px] border-[0.5px] border-gold-border bg-[#C9A646]/[0.06] p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Sunrise className="w-8 h-8 text-[#C9A646] shrink-0" />
        <div>
          <p className="text-ink-primary font-semibold text-base">Start my day</p>
          <p className="text-ink-secondary text-sm mt-0.5">
            Quick prep before market open — checklist + yesterday&apos;s lessons in 60 seconds.
          </p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={!onClick}
        className="px-4 py-2 rounded-md border border-gold-border bg-[#C9A646]/55 text-white hover:bg-[#C9A646]/70 text-sm font-medium transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Open Planner
      </button>
    </div>
  );
}
