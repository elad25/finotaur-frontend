/**
 * GlobeLoader — animated gold globe with real country outlines.
 *
 * Ported from `design_handoff_globe_loader/Globe Loader Gold.html` (designer
 * handoff). Visuals (z-order back→front):
 *   1. Halo  — radial gold glow, pulses scale + opacity
 *   2. Outer whirl  — dashed orbit + 3 sweeping arcs + 3 particles, spinning
 *   3. Inner counter-whirl  — 2 thinner arcs + 2 particles
 *   4. Globe  — canvas rendering of d3.geoOrthographic projection with
 *      lit-sphere fill, country outlines (glow + crisp pass), 42 twinkling
 *      city lights, and great-circle connection arcs spawning every 900ms.
 *
 * Sizing: the loader keeps its internal 200×200 design with a 60px halo
 * bleed, but the wrapper can be scaled via `size` prop (default 200, hero
 * uses 480). Animation timing is decoupled from size.
 */

import * as React from "react";
import {
  geoOrthographic,
  geoPath,
  geoInterpolate,
  geoDistance,
} from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, LineString } from "geojson";

const SIZE = 200;
const RADIUS = 92;
const CX = SIZE / 2;
const CY = SIZE / 2;
const ROTATE_SPEED = 10; // deg/sec — slowed from 28 for elegance
const HALF_PI = Math.PI / 2;

const GOLD = "#f7c66b";
const GOLD_BRIGHT = "#ffd87a"; // brighter gold for highlights
const GOLD_DIM = "rgba(247, 198, 107, 0.70)"; // was 0.55 — more visible
// Warmer, brighter lit-sphere gradient (was #171108 → #070502)
const NIGHT_HI = "#4a3318";
const NIGHT_LO = "#1a1208";
// Faint gold fill for country interiors — gives "lit from within" feel
const COUNTRY_FILL = "rgba(247, 198, 107, 0.06)";

// 42 major cities — [lon, lat, magnitude 1–3]
const CITIES: Array<[number, number, number]> = [
  [-74.0, 40.7, 3], [-87.6, 41.9, 2], [-118.2, 34.1, 3], [-79.4, 43.7, 2],
  [-99.1, 19.4, 2], [-46.6, -23.5, 2], [-58.4, -34.6, 2], [-77.0, -12.0, 1],
  [-70.7, -33.4, 1], [-0.1, 51.5, 3], [2.3, 48.9, 3], [13.4, 52.5, 2],
  [12.5, 41.9, 2], [-3.7, 40.4, 2], [18.1, 59.3, 1], [37.6, 55.8, 3],
  [29.0, 41.0, 2], [31.2, 30.0, 2], [51.4, 35.7, 2], [55.3, 25.3, 2],
  [72.8, 19.1, 3], [77.2, 28.6, 2], [88.4, 22.6, 1], [67.0, 24.9, 2],
  [100.5, 13.8, 2], [103.8, 1.3, 2], [106.8, -6.2, 2], [116.4, 39.9, 3],
  [121.5, 31.2, 3], [114.2, 22.3, 2], [127.0, 37.6, 2], [139.7, 35.7, 3],
  [151.2, -33.9, 2], [144.9, -37.8, 1], [174.8, -36.8, 1], [3.4, 6.5, 2],
  [36.8, -1.3, 1], [28.0, -26.2, 2], [-43.2, -22.9, 2], [-95.4, 29.8, 1],
  [-122.4, 37.8, 2], [-73.6, 45.5, 1],
];

interface Connection {
  interp: (t: number) => [number, number];
  start: number;
  duration: number;
}

// ---------------------------------------------------------------------------
// World atlas loader — fetched once, cached at module level
// ---------------------------------------------------------------------------
let cachedCountries: FeatureCollection<Geometry> | null = null;
let inFlightFetch: Promise<FeatureCollection<Geometry> | null> | null = null;

function loadWorldAtlas(): Promise<FeatureCollection<Geometry> | null> {
  if (cachedCountries) return Promise.resolve(cachedCountries);
  if (inFlightFetch) return inFlightFetch;
  inFlightFetch = fetch(
    "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json",
  )
    .then((r) => r.json())
    .then((topo) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fc = feature(topo, topo.objects.countries as any) as
        | FeatureCollection<Geometry>
        | Feature<Geometry>;
      cachedCountries =
        "features" in fc
          ? fc
          : ({ type: "FeatureCollection", features: [fc] } as FeatureCollection<Geometry>);
      return cachedCountries;
    })
    .catch((e) => {
      console.error("[GlobeLoader] Failed to load world atlas", e);
      return null;
    });
  return inFlightFetch;
}

// ---------------------------------------------------------------------------
// Globe canvas — render loop encapsulated here
// ---------------------------------------------------------------------------
function GlobeCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = canvas.width / SIZE;
    ctx.scale(DPR, DPR);

    const projection = geoOrthographic()
      .scale(RADIUS)
      .translate([CX, CY])
      .clipAngle(90)
      .rotate([0, -15, 0]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pathFn = geoPath(projection as any, ctx);
    const sphere = { type: "Sphere" } as const;

    const connections: Connection[] = [];
    function spawnConnection() {
      const a = CITIES[Math.floor(Math.random() * CITIES.length)];
      let b = a;
      while (b === a) b = CITIES[Math.floor(Math.random() * CITIES.length)];
      connections.push({
        interp: geoInterpolate([a[0], a[1]], [b[0], b[1]]),
        start: performance.now(),
        duration: 2200 + Math.random() * 1400,
      });
    }
    spawnConnection();
    spawnConnection();
    const connectionInterval = setInterval(spawnConnection, 900);

    let countries: FeatureCollection<Geometry> | null = null;
    let cancelled = false;
    loadWorldAtlas().then((fc) => {
      if (!cancelled) countries = fc;
    });

    let rafId = 0;
    const draw = (t: number) => {
      const lon = (t / 1000) * ROTATE_SPEED;
      projection.rotate([lon % 360, -15, 0]);

      ctx.clearRect(0, 0, SIZE, SIZE);

      // Lit-sphere fill
      const grad = ctx.createRadialGradient(
        CX - RADIUS * 0.35,
        CY - RADIUS * 0.4,
        RADIUS * 0.1,
        CX,
        CY,
        RADIUS,
      );
      grad.addColorStop(0, NIGHT_HI);
      grad.addColorStop(1, NIGHT_LO);

      ctx.beginPath();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pathFn(sphere as any);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pathFn(sphere as any);
      ctx.clip();

      // Countries — three-pass: faint fill (lit-from-within) + wide glow + crisp top
      if (countries) {
        // Pass 1: faint warm fill — gives continents a subtle "lit" body
        ctx.shadowBlur = 0;
        ctx.beginPath();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathFn(countries as any);
        ctx.fillStyle = COUNTRY_FILL;
        ctx.fill();

        // Pass 2: wide soft glow
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathFn(countries as any);
        ctx.strokeStyle = GOLD_DIM;
        ctx.lineWidth = 1.3;
        ctx.lineJoin = "round";
        ctx.stroke();

        // Pass 3: bright crisp line on top
        ctx.shadowBlur = 3;
        ctx.beginPath();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathFn(countries as any);
        ctx.strokeStyle = GOLD_BRIGHT;
        ctx.lineWidth = 0.85;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // City lights with twinkle
      const twinkleT = t / 1000;
      const center = projection.invert?.([CX, CY]);
      if (center) {
        for (let i = 0; i < CITIES.length; i++) {
          const c = CITIES[i];
          if (geoDistance([c[0], c[1]], center) > HALF_PI) continue;
          const p = projection([c[0], c[1]]);
          if (!p) continue;
          const mag = c[2];
          const tw = 0.65 + 0.35 * Math.sin(twinkleT * 2 + i * 1.7);

          // Outer halo — bigger, brighter
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = 7 + mag * 2;
          ctx.fillStyle = `rgba(247, 198, 107, ${0.55 * tw})`;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 0.85 + mag * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // Bright core — larger, more saturated
          ctx.shadowBlur = 3;
          ctx.fillStyle = `rgba(255, 240, 200, ${0.95 * tw})`;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 0.55 + mag * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Connection arcs
        for (let i = connections.length - 1; i >= 0; i--) {
          const c = connections[i];
          const elapsed = t - c.start;
          const prog = elapsed / c.duration;
          if (prog > 1.25) {
            connections.splice(i, 1);
            continue;
          }
          const trail = 0.45;
          const head = Math.min(1, prog);
          const tail = Math.max(0, prog - trail);
          if (head <= tail) continue;

          const STEPS = 28;
          const coords: Array<[number, number]> = [];
          for (let k = 0; k <= STEPS; k++) {
            const s = tail + (head - tail) * (k / STEPS);
            coords.push(c.interp(s));
          }
          const line: LineString = { type: "LineString", coordinates: coords };

          ctx.shadowColor = GOLD;
          ctx.shadowBlur = 5;
          ctx.beginPath();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pathFn(line as any);
          ctx.strokeStyle = "rgba(247, 198, 107, 0.55)";
          ctx.lineWidth = 1.4;
          ctx.lineCap = "round";
          ctx.stroke();

          ctx.shadowBlur = 2;
          ctx.beginPath();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pathFn(line as any);
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 0.7;
          ctx.stroke();

          if (prog <= 1) {
            const headCoord = c.interp(head);
            if (geoDistance(headCoord, center) <= HALF_PI) {
              const headPt = projection(headCoord);
              if (headPt) {
                ctx.shadowBlur = 8;
                ctx.fillStyle = "#fff3d4";
                ctx.beginPath();
                ctx.arc(headPt[0], headPt[1], 1.4, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();

      // Glowing sphere rim — stronger
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pathFn(sphere as any);
      ctx.strokeStyle = "rgba(247, 198, 107, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const frame = (t: number) => {
      draw(t);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      clearInterval(connectionInterval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="absolute inset-0 w-full h-full"
      aria-hidden
    />
  );
}

// ---------------------------------------------------------------------------
// Whirl rings (outer + inner counter-rotating) — pure SVG, animated via CSS
// ---------------------------------------------------------------------------
function Whirl({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg
      viewBox="-100 -100 200 200"
      className={
        reverse
          ? "absolute inset-0 w-full h-full pointer-events-none wz-globe-whirl-rev"
          : "absolute inset-0 w-full h-full pointer-events-none wz-globe-whirl"
      }
      style={{
        filter: "drop-shadow(0 0 3px rgba(247, 198, 107, 0.35))",
      }}
      aria-hidden
    >
      {!reverse && (
        <circle
          cx="0"
          cy="0"
          r="96"
          fill="none"
          stroke="rgba(247, 198, 107, 0.18)"
          strokeWidth="0.6"
          strokeDasharray="1 4"
        />
      )}
      {!reverse ? (
        <>
          <g fill="none" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round">
            <path d="M 92 0 A 92 92 0 0 1 65.05 65.05" />
          </g>
          <g
            fill="none"
            stroke={GOLD_DIM}
            strokeWidth="1.2"
            strokeLinecap="round"
            transform="rotate(140)"
          >
            <path d="M 92 0 A 92 92 0 0 1 79.67 45.99" />
          </g>
          <g
            fill="none"
            stroke={GOLD_DIM}
            strokeWidth="1"
            strokeLinecap="round"
            transform="rotate(240)"
          >
            <path d="M 92 0 A 92 92 0 0 1 86.45 31.49" />
          </g>
          <g className="wz-globe-pulse">
            <circle cx="92" cy="0" r="1.8" fill={GOLD} />
            <circle cx="78" cy="49" r="1.2" fill={GOLD_DIM} />
            <circle cx="46" cy="80" r="0.9" fill="rgba(247,198,107,0.18)" />
          </g>
        </>
      ) : (
        <>
          <g fill="none" stroke={GOLD_DIM} strokeWidth="0.8" strokeLinecap="round">
            <path d="M 86 0 A 86 86 0 0 1 74.48 43.0" />
          </g>
          <g
            fill="none"
            stroke="rgba(247,198,107,0.18)"
            strokeWidth="0.8"
            strokeLinecap="round"
            transform="rotate(180)"
          >
            <path d="M 86 0 A 86 86 0 0 1 60.81 60.81" />
          </g>
          <g className="wz-globe-pulse">
            <circle cx="86" cy="0" r="1.2" fill={GOLD_DIM} />
            <circle cx="-86" cy="0" r="1" fill="rgba(247,198,107,0.18)" />
          </g>
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export default function GlobeLoader({
  size = 200,
  className,
}: {
  size?: number;
  className?: string;
}) {
  // CSS-injected via inline tag so the animation keyframes are scoped/local
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
      }}
    >
      <style>{`
        @keyframes wz-globe-spin     { to { transform: rotate(360deg);  } }
        @keyframes wz-globe-spin-rev { to { transform: rotate(-360deg); } }
        @keyframes wz-globe-halo-pulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes wz-globe-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .wz-globe-whirl { animation: wz-globe-spin 2.6s linear infinite; transform-origin: center; }
        .wz-globe-whirl-rev { animation: wz-globe-spin-rev 4.2s linear infinite; transform-origin: center; }
        .wz-globe-pulse { animation: wz-globe-pulse 2.2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
      `}</style>

      {/* Halo — bleeds 30% beyond the box on every side */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          inset: `-${size * 0.3}px`,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(247,198,107,0.42) 0%, rgba(247,198,107,0.22) 28%, rgba(247,198,107,0.08) 46%, transparent 62%)",
          filter: "blur(6px)",
          animation: "wz-globe-halo-pulse 3.4s ease-in-out infinite",
        }}
      >
        <div
          aria-hidden
          className="absolute"
          style={{
            inset: `${size * 0.2}px`,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,220,150,0.35) 0%, rgba(247,198,107,0.18) 40%, transparent 70%)",
            filter: "blur(3px)",
          }}
        />
      </div>

      {/* Whirls */}
      <Whirl />
      <Whirl reverse />

      {/* Globe canvas */}
      <GlobeCanvas />
    </div>
  );
}
