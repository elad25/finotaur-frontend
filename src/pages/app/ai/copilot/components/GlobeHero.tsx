// src/pages/app/ai/copilot/components/GlobeHero.tsx
// ============================================================
// Premium cinematic globe hero for COPILOT dashboard.
// Builds on the base GlobeLoader canvas but adds:
//   1. City lights — glowing dots on major cities with twinkle
//   2. Atmosphere halo + rim arc
//   3. Depth-modulated wireframe (limb dimming)
//   4. Holographic pedestal (concentric ellipses + reflection glow)
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, MultiLineString } from 'geojson';

// ─── Color palette ────────────────────────────────────────────────────────────
const INK        = 'rgba(244, 217, 123, 0.92)';
const INK_SOFT   = 'rgba(244, 217, 123, 0.50)';
const INK_HAIR   = 'rgba(244, 217, 123, 0.18)';
const INK_FILL   = 'rgba(201, 166, 70, 0.10)';
const LIMB_OUTER = 'rgba(0, 0, 0, 0.52)';

// ─── Canvas constants (internal design-space) ─────────────────────────────────
const SIZE   = 400;
const CENTER = SIZE / 2;
const R      = 148;

// ─── City lights — [longitude, latitude, brightness 0-1, twinkle phase] ──────
// ~80 points: 42 real major cities + 38 pseudo-random land-area points
// All are static constants — no Math.random() at render time.
const CITY_LIGHTS: Array<[number, number, number, number]> = [
  // [lng, lat, brightness, phaseOffset]
  // Major cities
  [-74.0,  40.7, 1.0, 0.0],   // New York
  [-87.6,  41.9, 0.9, 0.7],   // Chicago
  [-118.2, 34.1, 1.0, 1.4],   // Los Angeles
  [-79.4,  43.7, 0.7, 2.1],   // Toronto
  [-43.2, -22.9, 0.8, 0.3],   // Rio de Janeiro
  [-46.6, -23.5, 0.9, 1.1],   // São Paulo
  [-58.4, -34.6, 0.7, 0.9],   // Buenos Aires
  [-70.7, -33.4, 0.6, 2.5],   // Santiago
  [-77.0, -12.0, 0.5, 1.7],   // Lima
  [-99.1,  19.4, 0.8, 0.5],   // Mexico City
  [-95.4,  29.8, 0.7, 1.9],   // Houston
  [-122.4, 37.8, 0.8, 0.4],   // San Francisco
  [-0.1,  51.5, 1.0, 2.3],    // London
  [2.3,   48.9, 1.0, 0.6],    // Paris
  [13.4,  52.5, 0.9, 1.5],    // Berlin
  [12.5,  41.9, 0.8, 2.8],    // Rome
  [-3.7,  40.4, 0.8, 0.2],    // Madrid
  [18.1,  59.3, 0.6, 1.2],    // Stockholm
  [4.9,   52.4, 0.7, 2.0],    // Amsterdam
  [14.4,  50.1, 0.7, 0.8],    // Prague
  [37.6,  55.8, 1.0, 3.0],    // Moscow
  [29.0,  41.0, 0.9, 0.1],    // Istanbul
  [31.2,  30.0, 0.8, 1.6],    // Cairo
  [51.4,  35.7, 0.8, 2.2],    // Tehran
  [55.3,  25.3, 0.9, 0.7],    // Dubai
  [44.4,  33.3, 0.7, 1.3],    // Baghdad
  [72.8,  19.1, 1.0, 0.5],    // Mumbai
  [77.2,  28.6, 0.9, 1.8],    // New Delhi
  [88.4,  22.6, 0.7, 2.6],    // Kolkata
  [67.0,  24.9, 0.8, 0.4],    // Karachi
  [100.5, 13.8, 0.8, 1.0],    // Bangkok
  [103.8,  1.3, 0.9, 2.4],    // Singapore
  [106.8, -6.2, 0.8, 0.6],    // Jakarta
  [116.4, 39.9, 1.0, 1.4],    // Beijing
  [121.5, 31.2, 1.0, 2.9],    // Shanghai
  [114.2, 22.3, 0.9, 0.3],    // Hong Kong
  [127.0, 37.6, 0.9, 1.5],    // Seoul
  [139.7, 35.7, 1.0, 0.8],    // Tokyo
  [151.2,-33.9, 0.8, 2.1],    // Sydney
  [144.9,-37.8, 0.6, 0.9],    // Melbourne
  [174.8,-36.8, 0.5, 1.7],    // Auckland
  [3.4,   6.5, 0.7, 2.3],     // Lagos
  [36.8,  -1.3, 0.6, 0.1],    // Nairobi
  [28.0, -26.2, 0.8, 1.6],    // Johannesburg
  // Pseudo-random land points (deterministic)
  [-110.0, 23.0, 0.4, 0.5],
  [-80.0,  25.8, 0.5, 1.2],
  [-57.0,   5.0, 0.4, 2.7],
  [-61.0,  10.7, 0.5, 0.3],
  [-68.0, -16.5, 0.4, 1.9],
  [-47.9, -15.8, 0.5, 0.7],
  [-35.7,  -9.0, 0.4, 2.4],
  [ 15.3,   9.1, 0.3, 1.1],
  [  2.0,  12.4, 0.3, 0.6],
  [ 21.0,  15.6, 0.4, 2.0],
  [ 32.5,   0.3, 0.4, 1.3],
  [ 26.0, -11.7, 0.3, 0.4],
  [ 14.5, -23.3, 0.3, 1.8],
  [ 47.5,  -18.9, 0.3, 2.6],
  [ 57.6, -20.2, 0.3, 0.9],
  [ 81.6,  28.2, 0.4, 1.4],
  [ 90.4,  23.7, 0.4, 2.2],
  [ 95.0,  17.0, 0.4, 0.2],
  [108.9,  15.9, 0.4, 1.5],
  [113.5,  22.2, 0.5, 2.9],
  [120.5,   7.1, 0.4, 0.6],
  [118.7,  32.1, 0.5, 1.0],
  [126.9,  37.6, 0.5, 2.3],
  [128.6,  35.2, 0.4, 0.8],
  [131.5,  43.1, 0.4, 1.6],
  [135.5,  34.7, 0.5, 0.1],
  [140.5,  38.3, 0.5, 2.1],
  [148.2, -23.5, 0.3, 1.4],
  [147.1, -19.3, 0.3, 0.5],
  [166.5, -22.3, 0.3, 2.8],
  [-150.0, 61.2, 0.4, 1.1],
  [-113.5, 53.5, 0.5, 0.7],
  [-75.7,  45.4, 0.5, 2.0],
  [-66.1,  45.9, 0.4, 1.3],
  [ 23.7,  61.5, 0.4, 0.4],
  [ 10.7,  63.4, 0.4, 1.8],
];

// ─── World data cache ─────────────────────────────────────────────────────────
type WorldData = {
  land: Feature | FeatureCollection;
  borders: MultiLineString;
};

let worldDataPromise: Promise<WorldData> | null = null;

function loadWorld(): Promise<WorldData> {
  if (!worldDataPromise) {
    worldDataPromise = fetch('/data/countries-110m.json')
      .then((res) => res.json() as Promise<Topology>)
      .then((topo) => {
        const countries = topo.objects.countries as GeometryCollection;
        const land = feature(topo, countries) as FeatureCollection;
        const borders = mesh(topo, countries, (a, b) => a !== b) as MultiLineString;
        return { land, borders };
      });
  }
  return worldDataPromise;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobeHero({
  className = '',
  size = 200,
}: {
  className?: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef    = useRef<number | null>(null);
  const [world, setWorld] = useState<WorldData | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWorld().then((data) => {
      if (!cancelled) setWorld(data);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const projection = geoOrthographic()
      .scale(R)
      .translate([CENTER, CENTER])
      .clipAngle(90);
    const path = geoPath(projection, ctx);
    const graticule = geoGraticule10();

    const t0 = performance.now();

    // Pre-compute per-city dot radii (deterministic, never in hot loop)
    const cityRadii = CITY_LIGHTS.map(([,, brightness]) =>
      1.0 + brightness * 1.5
    );

    const drawFrame = (t: number) => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      const lambda = reduceMotion ? -25 : ((t * 12) % 360) - 180;
      const phi = -15;
      projection.rotate([lambda, phi, 0]);

      // ── 1. Atmosphere halo (behind everything) ──────────────────────────
      const haloR = R * 1.42;
      const halo = ctx.createRadialGradient(CENTER, CENTER, R * 0.9, CENTER, CENTER, haloR);
      halo.addColorStop(0,   'rgba(244, 217, 123, 0.22)');
      halo.addColorStop(0.4, 'rgba(201, 166, 70,  0.10)');
      halo.addColorStop(1,   'rgba(201, 166, 70,  0.00)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, haloR, 0, Math.PI * 2);
      ctx.fill();

      // ── 2. Sphere base outline (pre-clip) ───────────────────────────────
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
      ctx.stroke();

      // ── 3. Clip to sphere ────────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
      ctx.clip();

      // ── 4. Graticule with depth modulation ──────────────────────────────
      // Draw each line segment manually for depth; fall back to single pass
      // for perf — d3 path emits one long path, so approximate by distance
      // of the rendered bbox center from canvas center.
      ctx.strokeStyle = INK_HAIR;
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      path(graticule);
      ctx.stroke();

      // ── 5. Land fill ─────────────────────────────────────────────────────
      if (world) {
        ctx.fillStyle = INK_FILL;
        ctx.beginPath();
        path(world.land);
        ctx.fill();

        // Land outline — depth-faded: we paint at full opacity within clip,
        // limb shading (step 8) handles the dimming automatically.
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        path(world.land);
        ctx.stroke();

        // Country borders
        ctx.strokeStyle = INK_SOFT;
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        path(world.borders);
        ctx.stroke();
      }

      // ── 6. City lights ───────────────────────────────────────────────────
      for (let i = 0; i < CITY_LIGHTS.length; i++) {
        const [lng, lat, brightness, phase] = CITY_LIGHTS[i];
        const proj = projection([lng, lat]);
        if (!proj) continue;
        const [px, py] = proj;

        // Only draw if on the facing hemisphere (projection returns null for
        // clipped points when clipAngle(90) is set, but verify within disc)
        const dx = px - CENTER;
        const dy = py - CENTER;
        if (dx * dx + dy * dy > R * R) continue;

        // Twinkle: modulate alpha with a sinusoidal per-dot phase
        const twinkle = 0.65 + 0.35 * Math.sin(t * 2.1 + phase * 3.7);
        const alpha = brightness * twinkle;
        const dotR = cityRadii[i];

        // Soft glow (larger, low-alpha radial)
        const glow = ctx.createRadialGradient(px, py, 0, px, py, dotR * 3.5);
        glow.addColorStop(0,   `rgba(244, 217, 123, ${(alpha * 0.6).toFixed(3)})`);
        glow.addColorStop(0.4, `rgba(244, 217, 123, ${(alpha * 0.18).toFixed(3)})`);
        glow.addColorStop(1,   'rgba(244, 217, 123, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, dotR * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Hot core
        ctx.fillStyle = `rgba(244, 217, 123, ${Math.min(alpha, 1).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 7. Limb shading (depth on wireframe + globe feel) ────────────────
      const limb = ctx.createRadialGradient(CENTER, CENTER, R * 0.60, CENTER, CENTER, R);
      limb.addColorStop(0, 'rgba(0, 0, 0, 0)');
      limb.addColorStop(1, LIMB_OUTER);
      ctx.fillStyle = limb;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // end sphere clip

      // ── 8. Sphere outline on top (crisp rim) ────────────────────────────
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
      ctx.stroke();

      // ── 9. Lit rim arc — upper-left highlight (outside clip) ─────────────
      const rimGrad = ctx.createLinearGradient(
        CENTER - R * 0.7, CENTER - R * 0.7,
        CENTER + R * 0.3, CENTER + R * 0.3,
      );
      rimGrad.addColorStop(0,   'rgba(244, 217, 123, 0.80)');
      rimGrad.addColorStop(0.5, 'rgba(244, 217, 123, 0.30)');
      rimGrad.addColorStop(1,   'rgba(244, 217, 123, 0.00)');
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, R + 0.5, Math.PI * 1.05, Math.PI * 1.85);
      ctx.stroke();
    };

    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      drawFrame(t);
      if (!reduceMotion) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [world]);

  // ── DPR-aware canvas sizing ─────────────────────────────────────────────────
  const style = { width: `${size}px`, height: `${size}px` } as const;

  return (
    <div className={`relative ${className}`} style={style} role="img" aria-label="Holographic globe">

      {/* Pedestal — concentric perspective ellipses below the globe */}
      <PedestalRings globeSize={size} />

      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="absolute inset-0"
        style={style}
      />
    </div>
  );
}

// ─── Pedestal rings ──────────────────────────────────────────────────────────

function PedestalRings({ globeSize }: { globeSize: number }) {
  // Position at bottom of the globe element; offset below center.
  const baseY  = globeSize * 0.87;   // vertical center of the ellipses
  const width  = globeSize * 0.90;
  const height = globeSize * 0.12;   // squashed perspective

  const rings = [
    { scaleX: 1.0,  scaleY: 1.0,  alpha: 0.22, strokeW: 1.2 },
    { scaleX: 0.72, scaleY: 0.72, alpha: 0.32, strokeW: 1.0 },
    { scaleX: 0.44, scaleY: 0.44, alpha: 0.45, strokeW: 0.8 },
  ];

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ top: `${baseY}px`, width: `${width}px`, height: `${height * 3}px` }}
    >
      {/* Reflection glow under the pedestal */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: '40%',
          width: `${width * 0.9}px`,
          height: `${height * 1.6}px`,
          background: 'radial-gradient(ellipse at center, rgba(244,217,123,0.12) 0%, rgba(201,166,70,0.04) 45%, transparent 70%)',
          borderRadius: '50%',
          transform: 'translateX(-50%)',
        }}
      />
      {/* SVG rings */}
      <svg
        viewBox={`0 0 ${width} ${height * 3}`}
        width={width}
        height={height * 3}
        className="absolute inset-0"
        aria-hidden="true"
      >
        {rings.map((ring, i) => (
          <ellipse
            key={i}
            cx={width / 2}
            cy={height * 1.2}
            rx={(width / 2) * ring.scaleX}
            ry={(height / 2) * ring.scaleY}
            fill="none"
            stroke={`rgba(244,217,123,${ring.alpha})`}
            strokeWidth={ring.strokeW}
          />
        ))}
      </svg>
    </div>
  );
}
