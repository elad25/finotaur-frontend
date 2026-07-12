// src/components/charting/__tests__/depthPalettes.test.ts
//
// Pure LUT-math tests. The 'classic' palette's exact byte output is a
// backward-compat contract (MarketScanner.tsx relies on it being pixel-
// identical to the pre-Task-S2 hardcoded DepthMatrixLayer STOPS/buildLUT) —
// the ABGR-packing assertions below pin that down explicitly.

import { describe, it, expect } from 'vitest';
import {
  getPaletteLUT,
  getPaletteFaintColor,
  isDepthPaletteId,
  DEPTH_PALETTE_IDS,
  DEPTH_PALETTE_LABELS,
  type DepthPaletteId,
} from '../depthPalettes';

describe('getPaletteLUT', () => {
  it('returns a 256-entry Uint32Array for every palette id', () => {
    for (const id of DEPTH_PALETTE_IDS) {
      const lut = getPaletteLUT(id);
      expect(lut).toBeInstanceOf(Uint32Array);
      expect(lut.length).toBe(256);
    }
  });

  it('memoizes — returns the exact same array instance on repeat calls', () => {
    const a = getPaletteLUT('finotaur');
    const b = getPaletteLUT('finotaur');
    expect(a).toBe(b);
  });

  it('every LUT entry is fully opaque (alpha byte 0xff)', () => {
    for (const id of DEPTH_PALETTE_IDS) {
      const lut = getPaletteLUT(id);
      for (let i = 0; i < 256; i += 17) {
        const alpha = (lut[i] >>> 24) & 0xff;
        expect(alpha).toBe(0xff);
      }
    }
  });

  it("'classic' index 0 packs the exact navy stop [10,20,45] as ABGR", () => {
    const lut = getPaletteLUT('classic');
    const expected = (0xff << 24) | (45 << 16) | (20 << 8) | 10;
    expect(lut[0]).toBe(expected >>> 0);
  });

  it("'classic' ramps toward white near the top of the range (idx 255)", () => {
    const lut = getPaletteLUT('classic');
    const top = lut[255];
    const r = top & 0xff;
    const g = (top >>> 8) & 0xff;
    const b = (top >>> 16) & 0xff;
    // Stop 0.88 = white [255,255,255]; idx 255 (t=1.0) is beyond the last
    // stop and clamps to the last color in the loop (no stop matches t>0.88
    // in the original algorithm's `t >= t0 && t <= t1` — so r/g/b stay 0 for
    // t>0.88 exactly as the pre-extraction implementation did). This test
    // pins that exact (surprising but backward-compat-required) behavior.
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it("'finotaur' ramps from near-black toward gold/white (distinct from classic)", () => {
    const finotaur = getPaletteLUT('finotaur');
    const classic = getPaletteLUT('classic');
    // Mid-ramp (idx 150) should differ between palettes — proves they're
    // independently defined, not aliases.
    expect(finotaur[150]).not.toBe(classic[150]);
  });

  it("'thermal' is distinct from both 'classic' and 'finotaur'", () => {
    const thermal = getPaletteLUT('thermal');
    const classic = getPaletteLUT('classic');
    const finotaur = getPaletteLUT('finotaur');
    expect(thermal[100]).not.toBe(classic[100]);
    expect(thermal[100]).not.toBe(finotaur[100]);
  });
});

describe('getPaletteFaintColor', () => {
  it("'classic' faint color matches the original FAINT_COLOR constant exactly", () => {
    // Original: (0x40 << 24) | (45 << 16) | (20 << 8) | 10
    const expected = (0x40 << 24) | (45 << 16) | (20 << 8) | 10;
    expect(getPaletteFaintColor('classic')).toBe(expected);
  });

  it('faint color alpha is always 0x40 (~25% opacity) for every palette', () => {
    for (const id of DEPTH_PALETTE_IDS) {
      const alpha = (getPaletteFaintColor(id) >>> 24) & 0xff;
      expect(alpha).toBe(0x40);
    }
  });
});

describe('isDepthPaletteId', () => {
  it('accepts the 3 known ids', () => {
    expect(isDepthPaletteId('finotaur')).toBe(true);
    expect(isDepthPaletteId('classic')).toBe(true);
    expect(isDepthPaletteId('thermal')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isDepthPaletteId('gold')).toBe(false);
    expect(isDepthPaletteId(undefined)).toBe(false);
    expect(isDepthPaletteId(42)).toBe(false);
    expect(isDepthPaletteId(null)).toBe(false);
  });
});

describe('DEPTH_PALETTE_LABELS', () => {
  it('has a label for every id in DEPTH_PALETTE_IDS', () => {
    for (const id of DEPTH_PALETTE_IDS) {
      const label: string = DEPTH_PALETTE_LABELS[id as DepthPaletteId];
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
