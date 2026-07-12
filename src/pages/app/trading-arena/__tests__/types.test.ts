// src/pages/app/trading-arena/__tests__/types.test.ts
//
// Coverage for the TabId slug mapping (toTabId) and the TRADING_ARENA_TABS
// registry, focused on the new 'dom' tab added alongside the DOM ladder
// feature.

import { describe, it, expect } from 'vitest';
import { toTabId, TRADING_ARENA_TABS } from '../types';

describe('toTabId', () => {
  it("maps the 'dom' slug to the 'dom' TabId", () => {
    expect(toTabId('dom')).toBe('dom');
  });

  it('passes through every other valid TabId unchanged', () => {
    expect(toTabId('chart')).toBe('chart');
    expect(toTabId('order-flow')).toBe('order-flow');
    expect(toTabId('liquidity')).toBe('liquidity');
  });

  it('redirects legacy/removed section slugs to order-flow', () => {
    expect(toTabId('orderflow')).toBe('order-flow');
    expect(toTabId('footprint')).toBe('order-flow');
    expect(toTabId('footprint-chart')).toBe('order-flow');
  });

  it("defaults unknown/removed slugs (including undefined) to 'chart'", () => {
    expect(toTabId('tape')).toBe('chart');
    expect(toTabId('cvd')).toBe('chart');
    expect(toTabId('options')).toBe('chart');
    expect(toTabId('futures')).toBe('chart');
    expect(toTabId('forex')).toBe('chart');
    expect(toTabId('not-a-real-slug')).toBe('chart');
    expect(toTabId(undefined)).toBe('chart');
    expect(toTabId('')).toBe('chart');
  });
});

describe('TRADING_ARENA_TABS', () => {
  it('contains a dom entry with the expected id/label/locked shape', () => {
    const domTab = TRADING_ARENA_TABS.find((tab) => tab.id === 'dom');
    expect(domTab).toBeDefined();
    expect(domTab).toEqual({ id: 'dom', label: 'DOM', locked: false });
  });

  it('every tab id round-trips through toTabId to itself', () => {
    for (const tab of TRADING_ARENA_TABS) {
      expect(toTabId(tab.id)).toBe(tab.id);
    }
  });
});
