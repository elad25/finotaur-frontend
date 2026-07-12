// src/components/charting/depthPalettes.ts
//
// Pure color-LUT module for DepthMatrixLayer's heatmap render. Extracted out
// of DepthMatrixLayer.tsx (Task S2 — "Arena WOW" liquidity restyle) so the
// palette math is independently unit-testable and so a caller (LiquidityTab)
// can pick a palette by id without DepthMatrixLayer knowing anything about
// UI/preferences.
//
// 🔴 BACKWARD-COMPAT CONTRACT: 'classic' below is BIT-FOR-BIT IDENTICAL to
// DepthMatrixLayer.tsx's original hardcoded STOPS/buildLUT/FAINT_COLOR (pre
// Task S2). MarketScanner.tsx mounts DepthMatrixLayer without a `palette`
// prop — DepthMatrixLayer defaults to 'classic' — so MarketScanner's render
// must stay pixel-identical. Do not "improve" the classic stops.

export type DepthPaletteId = 'finotaur' | 'classic' | 'thermal';

type RGB = [number, number, number];
interface PaletteStop {
  t: number;
  rgb: RGB;
}

// ── Palette definitions ──────────────────────────────────────────────────────

// 'classic' — exact copy of the original DepthMatrixLayer STOPS constant
// (navy → blue → cyan → yellow → white-hot).
const CLASSIC_STOPS: PaletteStop[] = [
  { t: 0.00, rgb: [10,  20,  45 ] },  // slightly lifted navy (not near-black)
  { t: 0.18, rgb: [20,  70,  160] },  // blue — ramp starts earlier
  { t: 0.40, rgb: [0,   200, 220] },  // cyan — medium walls reach here
  { t: 0.65, rgb: [255, 216, 61 ] },  // yellow — large walls
  { t: 0.88, rgb: [255, 255, 255] },  // white-hot — top of ramp
];

// 'finotaur' — NEW DEFAULT for the Liquidity tab (Task S2). Premium
// gold-on-black: near-black → deep bronze → gold (#C9A646, the brand gold
// token used across the Arena's chrome) → warm white for the hottest walls.
const FINOTAUR_STOPS: PaletteStop[] = [
  { t: 0.00, rgb: [8,   7,   6  ] },  // near-black (matches FinotaurChart's #08080a bg register)
  { t: 0.30, rgb: [77,  49,  20 ] },  // deep bronze
  { t: 0.62, rgb: [201, 166, 70 ] },  // brand gold #C9A646
  { t: 0.88, rgb: [255, 244, 214] },  // warm white — hottest walls
];

// 'thermal' — ATAS/inferno-like: dark → purple → red → orange → yellow.
const THERMAL_STOPS: PaletteStop[] = [
  { t: 0.00, rgb: [12,  6,   20 ] },  // near-black plum
  { t: 0.28, rgb: [85,  20,  110] },  // purple
  { t: 0.52, rgb: [200, 30,  40 ] },  // red
  { t: 0.75, rgb: [240, 120, 20 ] },  // orange
  { t: 0.92, rgb: [255, 220, 60 ] },  // yellow-hot
];

const PALETTE_STOPS: Record<DepthPaletteId, PaletteStop[]> = {
  classic: CLASSIC_STOPS,
  finotaur: FINOTAUR_STOPS,
  thermal: THERMAL_STOPS,
};

/** Precomputed 256-entry RGBA Uint32 LUT (ABGR in little-endian Uint32) for the given palette's stops. */
function buildLUT(stops: PaletteStop[]): Uint32Array {
  const lut = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let r = 0, g = 0, b = 0;
    for (let s = 1; s < stops.length; s++) {
      const { t: t0, rgb: c0 } = stops[s - 1];
      const { t: t1, rgb: c1 } = stops[s];
      if (t >= t0 && t <= t1) {
        const frac = (t - t0) / (t1 - t0);
        r = Math.round(c0[0] + (c1[0] - c0[0]) * frac);
        g = Math.round(c0[1] + (c1[1] - c0[1]) * frac);
        b = Math.round(c0[2] + (c1[2] - c0[2]) * frac);
        break;
      }
    }
    // Pack as ABGR (ImageData is RGBA in memory, but Uint32 on little-endian
    // hosts reads as ABGR where A is the most-significant byte stored last).
    lut[i] = (0xff << 24) | (b << 16) | (g << 8) | r;
  }
  return lut;
}

// Lazily built + memoized per palette id — built once per palette, not per render.
const lutCache = new Map<DepthPaletteId, Uint32Array>();

/** Returns the 256-entry Uint32 LUT for `id`, building + caching it on first use. */
export function getPaletteLUT(id: DepthPaletteId): Uint32Array {
  let lut = lutCache.get(id);
  if (!lut) {
    lut = buildLUT(PALETTE_STOPS[id]);
    lutCache.set(id, lut);
  }
  return lut;
}

/**
 * Faint "below vLo" context color for a palette — the palette's first stop
 * (its darkest/coolest color) at alpha 0x40 (~25% opacity), same formula the
 * original DepthMatrixLayer used for FAINT_COLOR (navy @ 25%).
 */
export function getPaletteFaintColor(id: DepthPaletteId): number {
  const [r, g, b] = PALETTE_STOPS[id][0].rgb;
  return (0x40 << 24) | (b << 16) | (g << 8) | r;
}

/** All palette ids, in the order they should appear in a picker UI. */
export const DEPTH_PALETTE_IDS: readonly DepthPaletteId[] = ['finotaur', 'classic', 'thermal'];

export const DEPTH_PALETTE_LABELS: Record<DepthPaletteId, string> = {
  finotaur: 'Finotaur',
  classic: 'Classic',
  thermal: 'Thermal',
};

/** Type guard + fallback — used by preference sanitizers. */
export function isDepthPaletteId(v: unknown): v is DepthPaletteId {
  return v === 'finotaur' || v === 'classic' || v === 'thermal';
}
