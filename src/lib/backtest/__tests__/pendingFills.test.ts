// src/lib/backtest/__tests__/pendingFills.test.ts
// Vitest lock tests for the pure pending-order fill engine extracted from
// BacktestChart.tsx's handleReplayBarReveal (Phase 6 pending-order loop).
// No window/DOM access — pure function tests.

import { describe, it, expect } from 'vitest';
import { evaluatePendingOrder } from '../pendingFills';
import type { PendingOrder } from '@/hooks/useBacktestSession';
import type { Bar } from '@/components/charting/types';

function bar(partial: Partial<Bar> & { open: number; high: number; low: number; close: number }): Bar {
  return { time: 1000 as Bar['time'], volume: 0, ...partial };
}

function order(partial: Partial<PendingOrder> & Pick<PendingOrder, 'side' | 'type' | 'triggerPrice'>): PendingOrder {
  return {
    id: 'ord_1',
    size: 1,
    createdAt: 0,
    ...partial,
  };
}

describe('evaluatePendingOrder — LIMIT', () => {
  it('LONG: touch (low <= T), fills at min(T, open) — plain touch, no gap', () => {
    const o = order({ side: 'LONG', type: 'LIMIT', triggerPrice: 100 });
    const b = bar({ open: 102, high: 103, low: 99, close: 101 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
  });

  it('LONG: gap-through (open below T) fills at open, limit-or-better', () => {
    const o = order({ side: 'LONG', type: 'LIMIT', triggerPrice: 202.72 });
    const b = bar({ open: 200.09, high: 201, low: 199, close: 200.5 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 200.09 });
  });

  it('LONG: no touch (low > T) → none', () => {
    const o = order({ side: 'LONG', type: 'LIMIT', triggerPrice: 100 });
    const b = bar({ open: 105, high: 106, low: 101, close: 104 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'none' });
  });

  it('SHORT: touch (high >= T), fills at max(T, open)', () => {
    const o = order({ side: 'SHORT', type: 'LIMIT', triggerPrice: 100 });
    const b = bar({ open: 98, high: 101, low: 97, close: 99 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
  });

  it('SHORT: gap-through (open above T) fills at open', () => {
    const o = order({ side: 'SHORT', type: 'LIMIT', triggerPrice: 100 });
    const b = bar({ open: 103, high: 104, low: 102, close: 103.5 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 103 });
  });

  it('SHORT: no touch (high < T) → none', () => {
    const o = order({ side: 'SHORT', type: 'LIMIT', triggerPrice: 100 });
    const b = bar({ open: 95, high: 99, low: 94, close: 96 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'none' });
  });
});

describe('evaluatePendingOrder — MIT', () => {
  it('LONG: touch fills at trigger (market)', () => {
    const o = order({ side: 'LONG', type: 'MIT', triggerPrice: 100 });
    const b = bar({ open: 102, high: 103, low: 99, close: 101 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
  });

  it('SHORT: touch fills at trigger (market)', () => {
    const o = order({ side: 'SHORT', type: 'MIT', triggerPrice: 100 });
    const b = bar({ open: 98, high: 101, low: 97, close: 99 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
  });

  it('no touch → none', () => {
    const o = order({ side: 'LONG', type: 'MIT', triggerPrice: 100 });
    const b = bar({ open: 105, high: 106, low: 101, close: 104 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'none' });
  });
});

describe('evaluatePendingOrder — STOP (gap-realism fix)', () => {
  it('LONG breakout stop: plain touch fills at trigger (no gap)', () => {
    const o = order({ side: 'LONG', type: 'STOP', triggerPrice: 100 });
    const b = bar({ open: 99, high: 101, low: 98, close: 100.5 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
  });

  it('LONG breakout stop: gap-through open fills at worse open price (max(T, open))', () => {
    const o = order({ side: 'LONG', type: 'STOP', triggerPrice: 100 });
    const b = bar({ open: 105, high: 106, low: 104, close: 105.5 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 105 });
  });

  it('SHORT breakdown stop: plain touch fills at trigger (no gap)', () => {
    const o = order({ side: 'SHORT', type: 'STOP', triggerPrice: 100 });
    const b = bar({ open: 101, high: 102, low: 99, close: 100.5 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
  });

  it('SHORT breakdown stop: gap-through open fills at worse open price (min(T, open))', () => {
    const o = order({ side: 'SHORT', type: 'STOP', triggerPrice: 100 });
    const b = bar({ open: 95, high: 96, low: 94, close: 94.5 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 95 });
  });

  it('LONG: no touch (high < T) → none', () => {
    const o = order({ side: 'LONG', type: 'STOP', triggerPrice: 100 });
    const b = bar({ open: 95, high: 99, low: 94, close: 96 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'none' });
  });

  it('SHORT: no touch (low > T) → none', () => {
    const o = order({ side: 'SHORT', type: 'STOP', triggerPrice: 100 });
    const b = bar({ open: 105, high: 106, low: 101, close: 104 });
    expect(evaluatePendingOrder(o, b)).toEqual({ action: 'none' });
  });
});

describe('evaluatePendingOrder — STOP_LIMIT (full matrix)', () => {
  describe('LONG', () => {
    it('trigger + fill same bar: A = max(T, open) <= L → fills at A', () => {
      // T=100, L=103. Bar opens at 100 (no gap), high touches 101 → A=max(100,100)=100 <= 103 → fill@100
      const o = order({ side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 103 });
      const b = bar({ open: 100, high: 101, low: 99, close: 100.5 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
    });

    it('gap above L: trigger only, no fill, order remains (bar low never reaches L back down)', () => {
      // T=100, L=103. Bar gaps open at 106 (A=max(100,106)=106 > L=103); low=105 never reaches L.
      const o = order({ side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 103 });
      const b = bar({ open: 106, high: 108, low: 105, close: 107 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'trigger' });
    });

    it('same-bar pullback: A > L but bar.low <= L → fills at L', () => {
      // T=100, L=103. Bar gaps open at 106 (A=106 > L=103), but low pulls back to 102 <= L.
      const o = order({ side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 103 });
      const b = bar({ open: 106, high: 108, low: 102, close: 104 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 103 });
    });

    it('subsequent bar after trigger: triggeredAt set, low<=L fills at min(L, open)', () => {
      const o = order({ side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 103, triggeredAt: 900 });
      const b = bar({ open: 104, high: 105, low: 102, close: 103 });
      // min(L=103, open=104) = 103
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 103 });
    });

    it('subsequent bar after trigger: open gaps below L → fills at open (limit-or-better)', () => {
      const o = order({ side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 103, triggeredAt: 900 });
      const b = bar({ open: 101, high: 102, low: 100, close: 101.5 });
      // min(L=103, open=101) = 101
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 101 });
    });

    it('subsequent bar after trigger: no touch (low > L) → none', () => {
      const o = order({ side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 103, triggeredAt: 900 });
      const b = bar({ open: 105, high: 106, low: 104, close: 105.5 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'none' });
    });

    it('marketable (L=T), no gap: fills at max(T, open) same bar', () => {
      const o = order({ side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 100 });
      const b = bar({ open: 99, high: 101, low: 98, close: 100.5 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
    });

    it('marketable (L=T), gap-through open: triggers only (mirrors STOP gap-realism — cannot fill worse than the trigger without breaching L)', () => {
      const o = order({ side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 100 });
      const b = bar({ open: 105, high: 106, low: 104, close: 105.5 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'trigger' });
    });

    it('marketable (L defaults to T when limitPrice omitted) behaves the same as marketable', () => {
      const o = order({ side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100 });
      const b = bar({ open: 99, high: 101, low: 98, close: 100.5 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
    });

    it('no breakout (high < T) → none, order remains untouched', () => {
      const o = order({ side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 103 });
      const b = bar({ open: 95, high: 99, low: 94, close: 96 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'none' });
    });
  });

  describe('SHORT (mirror of LONG)', () => {
    it('trigger + fill same bar: A = min(T, open) >= L → fills at A', () => {
      // T=100, L=97. Bar opens at 100 (no gap), low touches 99 → A=min(100,100)=100 >= 97 → fill@100
      const o = order({ side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 97 });
      const b = bar({ open: 100, high: 101, low: 99, close: 99.5 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
    });

    it('gap below L: trigger only, no fill, order remains', () => {
      // T=100, L=97. Bar gaps open at 94 (A=min(100,94)=94 < L=97); high=95 never reaches L back up.
      const o = order({ side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 97 });
      const b = bar({ open: 94, high: 95, low: 92, close: 93 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'trigger' });
    });

    it('same-bar pullback: A < L but bar.high >= L → fills at L', () => {
      // T=100, L=97. Bar gaps open at 94 (A=94 < L=97), but high pulls back up to 98 >= L.
      const o = order({ side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 97 });
      const b = bar({ open: 94, high: 98, low: 92, close: 96 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 97 });
    });

    it('subsequent bar after trigger: triggeredAt set, high>=L fills at max(L, open)', () => {
      const o = order({ side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 97, triggeredAt: 900 });
      const b = bar({ open: 96, high: 98, low: 95, close: 97 });
      // max(L=97, open=96) = 97
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 97 });
    });

    it('subsequent bar after trigger: open gaps above L → fills at open (limit-or-better)', () => {
      const o = order({ side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 97, triggeredAt: 900 });
      const b = bar({ open: 99, high: 100, low: 98, close: 98.5 });
      // max(L=97, open=99) = 99
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 99 });
    });

    it('subsequent bar after trigger: no touch (high < L) → none', () => {
      const o = order({ side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 97, triggeredAt: 900 });
      const b = bar({ open: 95, high: 96, low: 94, close: 95.5 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'none' });
    });

    it('marketable (L=T), no gap: fills at min(T, open) same bar', () => {
      const o = order({ side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 100 });
      const b = bar({ open: 101, high: 102, low: 99, close: 99.5 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
    });

    it('marketable (L=T), gap-through open: triggers only (mirrors STOP gap-realism)', () => {
      const o = order({ side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 100 });
      const b = bar({ open: 95, high: 96, low: 94, close: 94.5 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'trigger' });
    });

    it('marketable (limitPrice omitted, defaults to T)', () => {
      const o = order({ side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100 });
      const b = bar({ open: 101, high: 102, low: 99, close: 100.5 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'fill', fillPrice: 100 });
    });

    it('no breakout (low > T) → none, order remains untouched', () => {
      const o = order({ side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 97 });
      const b = bar({ open: 105, high: 106, low: 101, close: 104 });
      expect(evaluatePendingOrder(o, b)).toEqual({ action: 'none' });
    });
  });
});
