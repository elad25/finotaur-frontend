import React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import type { DashboardStats } from "@/hooks/useDashboardData";
import { computeFinoScore, FINO_SCORE_MIN_TRADES } from "@/lib/finoScore";

const PANEL =
  "relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]";

const GOLD = "#C9A646";

const SCORE_TOOLTIP =
  "Your overall trading quality score (0–100), blending six metrics from your closed trades: win rate, profit factor, average win/loss, recovery factor, max drawdown and consistency. It updates automatically as you log more trades.";

interface FinoScoreProps {
  stats: DashboardStats | null | undefined;
}

const FinoScore: React.FC<FinoScoreProps> = ({ stats }) => {
  const { overall, axes, hasEnoughData, closedTrades } = React.useMemo(
    () => computeFinoScore(stats),
    [stats],
  );

  const markerPct = Math.max(0, Math.min(100, overall));

  return (
    <div className={`${PANEL} flex min-h-[300px] flex-col px-4 py-3`}>
      <div className="mb-2 flex items-center gap-1.5">
        <h3 className="text-[13px] font-semibold text-white/82">FINO Score</h3>
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={SCORE_TOOLTIP}
                onClick={(e) => e.preventDefault()}
                className="inline-flex shrink-0 items-center justify-center"
              >
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-white/38 transition-colors hover:text-[#E8C766]"
                  role="img"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              className="max-w-[260px] border-[#E8C766]/25 bg-[rgba(10,10,10,0.96)] text-[11px] font-medium leading-snug text-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
            >
              {SCORE_TOOLTIP}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="relative flex-1">
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={axes} outerRadius="70%" margin={{ top: 8, right: 22, bottom: 8, left: 22 }}>
            <PolarGrid stroke="rgba(255,255,255,0.10)" />
            <PolarAngleAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.62)", fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke={GOLD}
              strokeWidth={2}
              fill={GOLD}
              fillOpacity={hasEnoughData ? 0.32 : 0.06}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
        {!hasEnoughData && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="rounded-lg bg-black/60 px-3 py-2 text-[11px] font-medium leading-snug text-white/70">
              Log at least {FINO_SCORE_MIN_TRADES} closed trades to unlock your FINO Score.
              {closedTrades > 0 && ` (${closedTrades}/${FINO_SCORE_MIN_TRADES})`}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2">
        <div className="mb-1 text-[11px] font-medium text-white/55">Your FINO Score</div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold tabular-nums" style={{ color: GOLD }}>
            {hasEnoughData ? overall.toFixed(2) : "—"}
          </span>
          <div className="relative flex-1 pt-1">
            <div
              className="h-2 w-full rounded-full"
              style={{
                background: "linear-gradient(90deg,#EF4444 0%,#F2C85F 50%,#3BC76E 100%)",
                opacity: hasEnoughData ? 1 : 0.4,
              }}
            />
            {hasEnoughData && (
              <div
                className="absolute top-[2px] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-[#0a0a0a]"
                style={{ left: `${markerPct}%` }}
              />
            )}
            <div className="mt-1 flex justify-between text-[8px] tabular-nums text-white/35">
              <span>0</span>
              <span>20</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinoScore;
