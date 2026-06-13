// src/pages/app/ai/copilot/components/GlobeHero.tsx
// ============================================================
// Premium cinematic globe hero for COPILOT dashboard.
// Builds on the base GlobeLoader canvas but adds:
//   1. Traveling light pulses — beams sweeping great-circle arcs between
//      land points ("data traveling around the world"); endpoints sourced
//      from CITY_LIGHTS, routed via a seeded PRNG (no Math.random at render)
//   2. Atmosphere halo + rim arc
//   3. Depth-modulated wireframe (limb dimming)
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { geoOrthographic, geoPath, geoGraticule10, geoInterpolate, geoDistance } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, MultiLineString } from 'geojson';

// ─── Color palette ────────────────────────────────────────────────────────────
const INK        = 'rgba(244, 217, 123, 0.92)';
const INK_SOFT   = 'rgba(244, 217, 123, 0.50)';
const INK_HAIR   = 'rgba(244, 217, 123, 0.18)';
const INK_FILL   = 'rgba(201, 166, 70, 0.10)';
const LIMB_OUTER = 'rgba(0, 0, 0, 0.52)';

// Pulse streak color components (gold) — used in drawArc
const PULSE_R = 244;
const PULSE_G = 217;
const PULSE_B = 123;

// ─── Canvas constants (internal design-space) ─────────────────────────────────
const SIZE   = 400;
const CENTER = SIZE / 2;
const R      = 148;

// Scale factor vs the 200-px reference design (R_ref=88).
// Used to scale pixel sizes (bloom radius, line widths, shadow blur) proportionally.
const SCALE = R / 88; // ≈ 1.682

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

// ─── Seeded PRNG (mulberry32) — deterministic pulse routing, no Math.random() ──
// Seed is a fixed constant so routing is lively but not nondeterministic at render.
function mulberry32(seed: number) {
  let s = seed;
  return function (): number {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = z + Math.imul(z ^ (z >>> 7), 61 | z) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 0xFFFFFFFF;
  };
}
const prng = mulberry32(0xDEADBEEF);

// Extract [lng, lat] coordinate pairs from CITY_LIGHTS for pulse endpoints
const PULSE_POINTS: Array<[number, number]> = CITY_LIGHTS.map(([lng, lat]) => [lng, lat]);

// ─── Pulse arc type ───────────────────────────────────────────────────────────
type PulseArc = {
  a: [number, number];
  b: [number, number];
  interp: (t: number) => [number, number];
  t: number;
  speed: number;
  life: number;
};

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

    // ── Pulse arc state ──────────────────────────────────────────────────────
    const arcs: PulseArc[] = [];
    let sinceSpawn = 0;
    let lastFrameTime = t0;

    function spawnArc() {
      const pts = PULSE_POINTS;
      if (pts.length < 2) return;
      const a = pts[(prng() * pts.length) | 0];
      let b = pts[(prng() * pts.length) | 0];
      let guard = 0;
      while (b === a || geoDistance(a, b) < 0.5) {
        b = pts[(prng() * pts.length) | 0];
        if (++guard > 12) break;
      }
      arcs.push({
        a, b,
        interp: geoInterpolate(a, b) as (t: number) => [number, number],
        t: 0,
        speed: 0.45 + prng() * 0.35,
        life: 0,
      });
    }

    // Seed 3 arcs at staggered progress so globe reads live immediately
    for (let i = 0; i < 3; i++) {
      spawnArc();
      if (arcs.length > 0) arcs[arcs.length - 1].t = 0.2 + i * 0.2;
    }

    function stepPulses(dt: number) {
      sinceSpawn += dt;
      if (sinceSpawn > 0.55 && arcs.length < 5) {
        sinceSpawn = 0;
        spawnArc();
      }
      for (let i = arcs.length - 1; i >= 0; i--) {
        arcs[i].t += dt * arcs[i].speed;
        arcs[i].life += dt;
        if (arcs[i].t >= 1) arcs.splice(i, 1);
      }
    }

    function drawArc(arc: PulseArc) {
      const head = arc.t;
      const tailLen = 0.5;
      const tail = Math.max(0, head - tailLen);
      const N = 36;

      // Fade in over first fraction of life, fade out near destination
      const fade = Math.min(1, arc.life * 2.6) * Math.min(1, (1 - arc.t) * 5 + 0.1);
      if (fade <= 0.01) return;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw the streak as short sub-segments ramping up toward the head
      let prev = arc.interp(tail) as [number, number];
      for (let i = 1; i <= N; i++) {
        const f = i / N;                // 0 at tail → 1 at head
        const pt = arc.interp(tail + (head - tail) * f) as [number, number];
        const ease = f * f;             // brightness concentrated at head

        ctx.beginPath();
        path({ type: 'LineString', coordinates: [prev, pt] });
        ctx.strokeStyle = `rgba(${PULSE_R},${PULSE_G},${PULSE_B},1)`;
        ctx.globalAlpha = fade * (0.04 + ease * 0.62);
        ctx.lineWidth = (0.3 + ease * 1.5) * SCALE;
        ctx.shadowColor = `rgba(${PULSE_R},${PULSE_G},${PULSE_B},1)`;
        ctx.shadowBlur  = (0.5 + ease * 3) * SCALE;
        ctx.stroke();
        prev = pt;
      }

      // Head bloom — radial gradient halo at the leading point
      const hp = arc.interp(head) as [number, number];
      const rotArr = projection.rotate();
      const rotCenter: [number, number] = [-rotArr[0], -rotArr[1]];
      if (geoDistance(hp, rotCenter) < Math.PI / 2 - 0.02) {
        const p = projection(hp);
        if (p) {
          const bloomR = 3.8 * SCALE;
          const coreR  = 0.9 * SCALE;
          const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], bloomR);
          g.addColorStop(0,   `rgba(${PULSE_R},${PULSE_G},${PULSE_B},1)`);
          g.addColorStop(0.4, `rgba(${PULSE_R},${PULSE_G},${PULSE_B},0.45)`);
          g.addColorStop(1,   `rgba(${PULSE_R},${PULSE_G},${PULSE_B},0)`);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = fade;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p[0], p[1], bloomR, 0, 2 * Math.PI);
          ctx.fill();
          // Tiny bright core dot
          ctx.globalAlpha = fade;
          ctx.fillStyle = `rgba(${PULSE_R},${PULSE_G},${PULSE_B},1)`;
          ctx.beginPath();
          ctx.arc(p[0], p[1], coreR, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      ctx.restore();
      ctx.globalAlpha = 1;
    }

    const drawFrame = (t: number, _dt: number) => {
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

      // ── 6. Traveling light pulses ─────────────────────────────────────────
      // Drawn last within the sphere clip so streaks hug the globe surface.
      // Head bloom is also drawn here in the same pass (matching handoff draw order).
      // prefers-reduced-motion: suppress pulses entirely (no static fallback needed).
      if (!reduceMotion) {
        for (let i = 0; i < arcs.length; i++) drawArc(arcs[i]);
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
      const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
      lastFrameTime = now;
      if (!reduceMotion) stepPulses(dt);
      drawFrame(t, dt);
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
