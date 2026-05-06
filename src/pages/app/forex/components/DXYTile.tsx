import { useEffect, useState } from 'react';
import { api } from '@/lib/apiBase';
import { Card, Eyebrow } from '@/components/ds/Card';
import { Price, Change } from '@/components/ds/NumberDisplay';
import type { MacroSnapshotLite } from './types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; price: number; dailyChange: number; dailyChangePercent: number; weeklyChangePercent: number | null }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

export default function DXYTile() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(api('/api/macro/snapshot'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: MacroSnapshotLite = await res.json();
        if (cancelled) return;

        const dxy = data.assets?.find((a) => a.symbol === 'DXY' || a.name === 'US Dollar Index');
        if (!dxy || dxy.price == null || dxy.dailyChange == null || dxy.dailyChangePercent == null) {
          setState({ kind: 'empty' });
          return;
        }
        setState({
          kind: 'ready',
          price: dxy.price,
          dailyChange: dxy.dailyChange,
          dailyChangePercent: dxy.dailyChangePercent,
          weeklyChangePercent: dxy.weeklyChangePercent ?? null,
        });
      } catch (e) {
        if (cancelled) return;
        setState({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to load DXY' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="h-full">
      <div className="flex flex-col gap-ds-3 h-full">
        <div className="flex items-baseline justify-between">
          <Eyebrow>US Dollar Index</Eyebrow>
          <span className="font-sans text-[11px] uppercase tracking-[1px] text-ink-tertiary">DXY</span>
        </div>

        {state.kind === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <span className="font-mono text-num-default text-ink-tertiary">…</span>
          </div>
        )}

        {state.kind === 'empty' && (
          <div className="flex-1 flex items-center text-num-small text-ink-tertiary">No data available</div>
        )}

        {state.kind === 'error' && (
          <div className="flex-1 flex items-center text-num-small text-num-negative">Error: {state.message}</div>
        )}

        {state.kind === 'ready' && (
          <>
            <div className="flex flex-col gap-ds-1 flex-1">
              <Price value={state.price} size="display" format="plain" decimals={3} />
              <div className="flex items-baseline gap-ds-3 mt-ds-2">
                <Change value={state.dailyChange} format="plain" decimals={3} />
                <Change value={state.dailyChangePercent} format="percent" decimals={2} />
              </div>
            </div>

            {state.weeklyChangePercent != null && (
              <div className="flex items-baseline gap-ds-2 pt-ds-2 border-t-[0.5px] border-border-ds-subtle">
                <span className="font-sans text-[11px] uppercase tracking-[1px] text-ink-tertiary">Week</span>
                <Change value={state.weeklyChangePercent} format="percent" decimals={2} />
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
