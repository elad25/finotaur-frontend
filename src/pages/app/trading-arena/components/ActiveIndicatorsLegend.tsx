import { Eye, EyeOff, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getArenaIndicatorDefinition,
  type ArenaIndicatorInstance,
} from './indicatorsSettings';
import type { ChartStyleSettings } from './chartStyleSettings';

interface ActiveIndicatorsLegendProps {
  /** One row PER INSTANCE — the same indicator type can appear more than once (e.g. EMA 9 + EMA 21). */
  instances: ArenaIndicatorInstance[];
  hidden: Record<string, boolean>;
  chartStyle: ChartStyleSettings;
  onToggleHidden: (id: string) => void;
  onOpenSettings: (id: string) => void;
  onRemove: (id: string) => void;
}

function instanceValueText(instance: ArenaIndicatorInstance, chartStyle: ChartStyleSettings): string {
  switch (instance.type) {
    case 'ema':
    case 'sma':
    case 'rsi':
    case 'atr': {
      const p = instance.params as { period: number };
      return String(p.period);
    }
    case 'macd': {
      const p = instance.params as { fast: number; slow: number; signal: number };
      return `${p.fast} ${p.slow} ${p.signal}`;
    }
    case 'bbands': {
      const p = instance.params as { period: number; stdDev: number };
      return `${p.period} ${p.stdDev}`;
    }
    case 'volumeProfile':
      return `${chartStyle.volumeProfile.period} ${chartStyle.volumeProfile.anchorSide}`;
    case 'vwap':
    default:
      return '';
  }
}

export function ActiveIndicatorsLegend({
  instances,
  hidden,
  chartStyle,
  onToggleHidden,
  onOpenSettings,
  onRemove,
}: ActiveIndicatorsLegendProps) {
  if (instances.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-30 flex max-w-[min(520px,calc(100%-16px))] flex-col gap-1">
      {instances.map((instance) => {
        const definition = getArenaIndicatorDefinition(instance.type);
        const isHidden = hidden[instance.id] === true;
        const valueText = instanceValueText(instance, chartStyle);
        const EyeIcon = isHidden ? EyeOff : Eye;

        return (
          <div
            key={instance.id}
            className={cn(
              'pointer-events-auto flex h-6 w-fit max-w-full items-center gap-1 rounded px-1.5 text-[11px] font-medium text-[#D8D8D8]',
              isHidden && 'text-[#707070]',
            )}
            style={{ background: 'rgba(8,8,10,0.58)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="truncate">
              <span className="font-semibold">{definition.shortLabel}</span>
              {valueText && <span className="ml-1 text-[#9A9A9A]">{valueText}</span>}
            </span>

            <button
              type="button"
              onClick={() => onToggleHidden(instance.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-[#C0C0C0] hover:bg-white/10 hover:text-white"
              title={isHidden ? 'Show indicator' : 'Hide indicator'}
              aria-label={isHidden ? `Show ${definition.label}` : `Hide ${definition.label}`}
            >
              <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onOpenSettings(instance.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-[#C0C0C0] hover:bg-white/10 hover:text-white"
              title="Indicator settings"
              aria-label={`${definition.label} settings`}
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(instance.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-[#C0C0C0] hover:bg-white/10 hover:text-white"
              title="Remove indicator"
              aria-label={`Remove ${definition.label}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
