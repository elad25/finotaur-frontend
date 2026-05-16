// ==========================================
// PSYCHOLOGY TAB — lazy-loaded chunk
// ==========================================
import type { ReactNode } from "react";
import {
  Heart,
  Focus,
  Shield,
  AlertCircle,
  AlertTriangle,
  Flame,
  Brain,
  Lightbulb,
  CheckCircle,
} from "lucide-react";
import type { StrategyStats, Trade } from "@/utils/statsCalculations";

function MindsetBar({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs flex items-center gap-1" style={{ color: '#EAEAEA' }}>
          {icon} {label}
        </span>
        <span className="text-xs font-bold" style={{ color: '#C9A646' }}>{value}/100</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, #C9A646 0%, #00C46C 100%)'
          }}
        />
      </div>
    </div>
  );
}

function PsychologyCard({
  title,
  icon,
  mainValue,
  label,
  insight,
  color
}: {
  title: string;
  icon: ReactNode;
  mainValue: string | number;
  label: string;
  insight: string;
  color: string;
}) {
  return (
    <div
      className="p-4 rounded-lg"
      style={{
        background: 'rgba(20,20,20,0.6)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: '#EAEAEA' }}>
        <div style={{ color: '#C9A646' }}>{icon}</div>
        {title}
      </h4>
      <div className="mb-2">
        <div className="text-xs mb-1" style={{ color: '#9A9A9A' }}>{label}</div>
        <div className="text-3xl font-bold" style={{ color }}>
          {mainValue}
        </div>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: '#9A9A9A' }}>
        {insight}
      </p>
    </div>
  );
}

export default function PsychologyTab({ stats, trades }: { stats: StrategyStats; trades: Trade[] }) {
  const emotionalControl = Math.min(100, Math.max(0, 100 - ((stats.maxConsecutiveLosses || 0) * 15)));
  const disciplineScore = stats.avgRR >= 2 ? 90 : stats.avgRR >= 1.5 ? 70 : stats.avgRR >= 1 ? 50 : 30;
  const riskManagement = stats.profitFactor >= 2 ? 95 : stats.profitFactor >= 1.5 ? 80 : stats.profitFactor >= 1 ? 60 : 40;
  const overallMindset = Math.round((emotionalControl + disciplineScore + riskManagement) / 3);

  let revengeTrades = 0;
  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i - 1];
    const curr = trades[i];
    const prevR = prev.metrics?.rr || prev.metrics?.actual_r || 0;
    const currR = curr.metrics?.rr || curr.metrics?.actual_r || 0;

    if (prevR < 0 && currR < 0) {
      const timeDiff = new Date(curr.open_at).getTime() - new Date(prev.close_at || prev.open_at).getTime();
      if (timeDiff < 1000 * 60 * 30) {
        revengeTrades++;
      }
    }
  }

  let personalityType = 'Balanced';
  if (stats.avgTradeDuration && stats.avgTradeDuration < 2) personalityType = 'Scalper';
  else if (stats.avgTradeDuration && stats.avgTradeDuration > 24) personalityType = 'Position Trader';
  else if (stats.consistency && stats.consistency > 70) personalityType = 'Systematic';
  else if (stats.prematurelyClosed && stats.prematurelyClosed > stats.totalTrades * 0.4) personalityType = 'Impulsive';

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl p-6 backdrop-blur-md relative overflow-hidden"
        style={{
          background: 'rgba(14,14,14,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '3px solid #C9A646',
        }}
      >
        <div
          className="absolute top-0 right-0 w-1/2 h-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #C9A646 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <h3
          className="text-xs uppercase tracking-widest mb-5 flex items-center gap-2"
          style={{ color: '#C9A646', fontWeight: 700 }}
        >
          <Brain className="w-4 h-4" />
          Trading Mindset Analysis
        </h3>

        <div className="flex items-center gap-6 mb-6 relative z-10">
          <div className="flex-1">
            <div className="text-5xl font-bold mb-2" style={{
              color: overallMindset >= 75 ? '#00C46C' : overallMindset >= 50 ? '#C9A646' : '#E44545'
            }}>
              {overallMindset}/100
            </div>
            <p className="text-xs" style={{ color: '#9A9A9A' }}>
              Your Trading Mindset Score
            </p>
            <p className="text-xs mt-1" style={{ color: '#C9A646' }}>
              Personality: {personalityType}
            </p>
          </div>

          <div className="flex-1 space-y-3">
            <MindsetBar label="Emotional Control" value={emotionalControl} icon={<Heart className="w-3 h-3" />} />
            <MindsetBar label="Discipline" value={disciplineScore} icon={<Focus className="w-3 h-3" />} />
            <MindsetBar label="Risk Management" value={riskManagement} icon={<Shield className="w-3 h-3" />} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <PsychologyCard
          title="Loss Recovery"
          icon={<AlertCircle className="w-4 h-4" />}
          mainValue={stats.maxConsecutiveLosses || 0}
          label="Max Consecutive Losses"
          insight={
            (stats.maxConsecutiveLosses || 0) === 1
              ? 'Perfect! You maintain discipline.'
              : (stats.maxConsecutiveLosses || 0) === 2
              ? 'Good control of emotions.'
              : (stats.maxConsecutiveLosses || 0) === 3
              ? 'Consider a cooldown rule.'
              : 'Critical: Implement strict cooldown after 2 losses.'
          }
          color={(stats.maxConsecutiveLosses || 0) <= 2 ? '#00C46C' : (stats.maxConsecutiveLosses || 0) === 3 ? '#C9A646' : '#E44545'}
        />

        <PsychologyCard
          title="Risk Behavior"
          icon={<Shield className="w-4 h-4" />}
          mainValue={stats.avgRR.toFixed(2)}
          label="Average R:R Ratio"
          insight={
            stats.avgRR >= 2.5 ? 'Excellent - you let winners run.' :
            stats.avgRR >= 2 ? 'Great discipline maintained.' :
            stats.avgRR >= 1.5 ? 'Good. Consider holding longer.' :
            'Work on letting winners run more.'
          }
          color={stats.avgRR >= 2 ? '#00C46C' : stats.avgRR >= 1.5 ? '#C9A646' : '#E44545'}
        />

        <PsychologyCard
          title="Emotional Patterns"
          icon={<Heart className="w-4 h-4" />}
          mainValue={`${stats.maxConsecutiveWins || 0}/${stats.maxConsecutiveLosses || 0}`}
          label="Win Streak / Loss Streak"
          insight={
            (stats.maxConsecutiveWins || 0) > (stats.maxConsecutiveLosses || 0) * 2
              ? 'You capitalize on winning momentum well.'
              : 'Focus on extending win streaks and cutting losses faster.'
          }
          color="#C9A646"
        />

        <PsychologyCard
          title="Revenge Trading"
          icon={<Flame className="w-4 h-4" />}
          mainValue={revengeTrades}
          label="Suspected Revenge Trades"
          insight={
            revengeTrades === 0 ? 'Excellent control - no revenge trading detected.' :
            revengeTrades <= 2 ? 'Minimal revenge trading. Keep it up.' :
            'Warning: Multiple revenge trades detected. Take breaks after losses.'
          }
          color={revengeTrades === 0 ? '#00C46C' : revengeTrades <= 2 ? '#C9A646' : '#E44545'}
        />
      </div>

      {stats.prematurelyClosed && stats.prematurelyClosed > stats.totalTrades * 0.3 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: '#101010',
            border: '1px solid rgba(255,193,7,0.3)',
          }}
        >
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#FFC107' }} />
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: '#FFC107' }}>
                Cognitive Bias Detected: Loss Aversion
              </h4>
              <p className="text-xs leading-relaxed" style={{ color: '#9A9A9A' }}>
                You closed {((stats.prematurelyClosed / stats.totalTrades) * 100).toFixed(0)}% of winning trades
                before reaching take profit. This indicates loss aversion bias - the fear of losing unrealized gains.
                Trust your analysis and let winners run to target.
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className="rounded-xl p-5"
        style={{
          background: 'rgba(14,14,14,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#C9A646' }}>
          <Lightbulb className="w-4 h-4" />
          Recommended Actions
        </h4>
        <ul className="space-y-2 text-xs" style={{ color: '#9A9A9A' }}>
          <li className="flex gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#C9A646' }} />
            <span>Take 15-minute break after every losing trade</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#C9A646' }} />
            <span>Journal emotional state before and after each trade</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#C9A646' }} />
            <span>Stop trading for the day after 2 consecutive losses</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#C9A646' }} />
            <span>Weekly review to identify emotional patterns and triggers</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#C9A646' }} />
            <span>Set alerts for take profit levels to avoid premature exits</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
