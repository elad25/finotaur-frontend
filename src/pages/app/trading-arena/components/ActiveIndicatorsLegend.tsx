import { Eye, EyeOff, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ARENA_INDICATOR_DEFINITIONS,
  type ArenaIndicatorEnabled,
  type ArenaIndicatorKey,
  type ArenaIndicatorParams,
} from './indicatorsSettings';
import type { ChartStyleSettings } from './chartStyleSettings';

interface ActiveIndicatorsLegendProps {
  enabled: ArenaIndicatorEnabled;
  hidden: Partial<Record<ArenaIndicatorKey, boolean>>;
  params: ArenaIndicatorParams;
  chartStyle: ChartStyleSettings;
  onToggleHidden: (key: ArenaIndicatorKey) => void;
  onOpenSettings: (key: ArenaIndicatorKey) => void;
  onRemove: (key: ArenaIndicatorKey) => void;
}

function indicatorValueText(key: ArenaIndicatorKey, params: ArenaIndicatorParams, chartStyle: ChartStyleSettings): string {
  switch (key) {
    case 'ema':
      return String(params.ema.period);
    case 'sma':
      return String(params.sma.period);
    case 'rsi':
      return String(params.rsi.period);
    case 'atr':
      return String(params.atr.period);
    case 'macd':
      return `${params.macd.fast} ${params.macd.slow} ${params.macd.signal}`;
    case 'bbands':
      return `${params.bbands.period} ${params.bbands.stdDev}`;
    case 'volumeProfile':
      return `${chartStyle.volumeProfile.period} ${chartStyle.volumeProfile.anchorSide}`;
    case 'vwap':
    default:
      return '';
  }
}

export function ActiveIndicatorsLegend({
  enabled,
  hidden,
  params,
  chartStyle,
  onToggleHidden,
  onOpenSettings,
  onRemove,
}: ActiveIndicatorsLegendProps) {
  const activeDefinitions = ARENA_INDICATOR_DEFINITIONS.filter((definition) => enabled[definition.key]);

  if (activeDefinitions.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-30 flex max-w-[min(520px,calc(100%-16px))] flex-col gap-1">
      {activeDefinitions.map((definition) => {
        const isHidden = hidden[definition.key] === true;
        const valueText = indicatorValueText(definition.key, params, chartStyle);
        const EyeIcon = isHidden ? EyeOff : Eye;

        return (
          <div
            key={definition.key}
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
              onClick={() => onToggleHidden(definition.key)}
              className="flex h-5 w-5 items-center justify-center rounded text-[#C0C0C0] hover:bg-white/10 hover:text-white"
              title={isHidden ? 'Show indicator' : 'Hide indicator'}
              aria-label={isHidden ? `Show ${definition.label}` : `Hide ${definition.label}`}
            >
              <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onOpenSettings(definition.key)}
              className="flex h-5 w-5 items-center justify-center rounded text-[#C0C0C0] hover:bg-white/10 hover:text-white"
              title="Indicator settings"
              aria-label={`${definition.label} settings`}
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(definition.key)}
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
