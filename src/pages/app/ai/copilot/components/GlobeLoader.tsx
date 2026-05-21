import { useEffect, useRef, useState } from 'react';
import { geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, MultiLineString } from 'geojson';

// Monochrome gold-ink scale on a transparent dark surface.
// Maps the README's "ink on warm off-white" tokens to the COPILOT dark theme.
const INK = 'rgba(244, 217, 123, 0.92)';
const INK_SOFT = 'rgba(244, 217, 123, 0.50)';
const INK_FAINT = 'rgba(244, 217, 123, 0.22)';
const INK_HAIR = 'rgba(244, 217, 123, 0.14)';
const INK_FILL = 'rgba(201, 166, 70, 0.10)';
const LIMB_INNER = 'rgba(0, 0, 0, 0)';
const LIMB_OUTER = 'rgba(0, 0, 0, 0.55)';

const SIZE = 400;
const CENTER = SIZE / 2;
const R = 150;

const HALOS = [
  { radius: 1.06 * R, span: 1.2, speed: 0.22, phase: 0 },
  { radius: 1.14 * R, span: 0.9, speed: -0.17, phase: 0.6 * Math.PI },
  { radius: 1.24 * R, span: 0.55, speed: 0.12, phase: 1.3 * Math.PI },
];

type Particle = {
  a: number;
  r: number;
  v: number;
  len: number;
  lw: number;
  o: number;
  tilt: number;
};

function makeParticles(): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < 38; i++) {
    list.push({
      a: Math.random() * Math.PI * 2,
      r: R * (1.05 + Math.random() * 0.32),
      v: 0.25 + Math.random() * 0.7,
      len: 0.08 + Math.random() * 0.28,
      lw: 0.8 + Math.random() * 1.6,
      o: 0.35 + Math.random() * 0.45,
      tilt: (Math.random() - 0.5) * 0.6,
    });
  }
  return list;
}

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

export function GlobeLoader({
  className = '',
  size = 200,
}: {
  className?: string;
  size?: number;
}) {
  const whirlRef = useRef<HTMLCanvasElement | null>(null);
  const globeRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [world, setWorld] = useState<WorldData | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWorld().then((data) => {
      if (!cancelled) setWorld(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const whirl = whirlRef.current;
    const globe = globeRef.current;
    if (!whirl || !globe) return;

    const wctx = whirl.getContext('2d');
    const gctx = globe.getContext('2d');
    if (!wctx || !gctx) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const particles = makeParticles();
    const projection = geoOrthographic()
      .scale(R)
      .translate([CENTER, CENTER])
      .clipAngle(90);
    const path = geoPath(projection, gctx);
    const graticule = geoGraticule10();

    const t0 = performance.now();

    const drawWhirl = (t: number) => {
      wctx.clearRect(0, 0, SIZE, SIZE);

      // Inner faint ring
      wctx.strokeStyle = INK_HAIR;
      wctx.lineWidth = 1;
      wctx.beginPath();
      wctx.arc(CENTER, CENTER, R * 1.045, 0, Math.PI * 2);
      wctx.stroke();

      // Halo sweeping arcs — fading tails composed of 28 sub-arcs
      const segs = 28;
      for (const halo of HALOS) {
        const head = halo.phase + halo.speed * t;
        const span = halo.span;
        for (let i = 0; i < segs; i++) {
          const a1 = head - (i / segs) * span;
          const a2 = head - ((i + 1) / segs) * span;
          const o = (1 - i / segs) * 0.55;
          wctx.strokeStyle = `rgba(244, 217, 123, ${o.toFixed(3)})`;
          wctx.lineWidth = 1.2;
          wctx.lineCap = 'round';
          wctx.beginPath();
          wctx.arc(
            CENTER,
            CENTER,
            halo.radius,
            Math.min(a1, a2),
            Math.max(a1, a2),
          );
          wctx.stroke();
        }
      }

      // Particle streaks — tilted ellipse orbits, 4-segment alpha ramp
      for (const p of particles) {
        if (!reduceMotion) p.a += p.v * 0.016;
        const sub = 4;
        const cosT = Math.cos(p.tilt);
        const sinT = Math.sin(p.tilt);
        const rx = p.r;
        const ry = p.r * 0.92;
        wctx.lineCap = 'round';
        wctx.lineWidth = p.lw;
        for (let i = 0; i < sub; i++) {
          const f1 = i / sub;
          const f2 = (i + 1) / sub;
          const a1 = p.a - f1 * p.len;
          const a2 = p.a - f2 * p.len;
          const o = (1 - f1) * p.o;
          wctx.strokeStyle = `rgba(244, 217, 123, ${o.toFixed(3)})`;
          const x1 = CENTER + Math.cos(a1) * rx * cosT - Math.sin(a1) * ry * sinT;
          const y1 = CENTER + Math.cos(a1) * rx * sinT + Math.sin(a1) * ry * cosT;
          const x2 = CENTER + Math.cos(a2) * rx * cosT - Math.sin(a2) * ry * sinT;
          const y2 = CENTER + Math.cos(a2) * rx * sinT + Math.sin(a2) * ry * cosT;
          wctx.beginPath();
          wctx.moveTo(x1, y1);
          wctx.lineTo(x2, y2);
          wctx.stroke();
        }
      }

      // Outer ring + ticks (whole ring drifts +0.02 rad/s)
      const tickAngle = reduceMotion ? 0 : 0.02 * t;
      wctx.strokeStyle = INK_FAINT;
      wctx.lineWidth = 0.8;
      wctx.beginPath();
      wctx.arc(CENTER, CENTER, R * 1.32, 0, Math.PI * 2);
      wctx.stroke();

      for (let i = 0; i < 60; i++) {
        const major = i % 5 === 0;
        const ang = (i / 60) * Math.PI * 2 + tickAngle;
        const inner = R * 1.32;
        const outer = inner + (major ? 10 : 4);
        wctx.strokeStyle = major ? INK_SOFT : INK_HAIR;
        wctx.lineWidth = major ? 1.1 : 0.7;
        wctx.beginPath();
        wctx.moveTo(CENTER + Math.cos(ang) * inner, CENTER + Math.sin(ang) * inner);
        wctx.lineTo(CENTER + Math.cos(ang) * outer, CENTER + Math.sin(ang) * outer);
        wctx.stroke();
      }
    };

    const drawGlobe = (t: number) => {
      gctx.clearRect(0, 0, SIZE, SIZE);

      const lambda = reduceMotion ? -25 : ((t * 12) % 360) - 180;
      const phi = -15;
      projection.rotate([lambda, phi, 0]);

      // Sphere outline (drawn twice — once before fills, once on top, per spec)
      gctx.strokeStyle = INK;
      gctx.lineWidth = 1.2;
      gctx.beginPath();
      gctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
      gctx.stroke();

      // Clip subsequent geographic drawing to the sphere disk
      gctx.save();
      gctx.beginPath();
      gctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
      gctx.clip();

      // Graticule
      gctx.strokeStyle = INK_HAIR;
      gctx.lineWidth = 0.5;
      gctx.beginPath();
      path(graticule);
      gctx.stroke();

      if (world) {
        // Land fill
        gctx.fillStyle = INK_FILL;
        gctx.beginPath();
        path(world.land);
        gctx.fill();

        // Land outline (continents)
        gctx.strokeStyle = INK;
        gctx.lineWidth = 0.9;
        gctx.beginPath();
        path(world.land);
        gctx.stroke();

        // Country borders (interior mesh)
        gctx.strokeStyle = INK_SOFT;
        gctx.lineWidth = 0.7;
        gctx.beginPath();
        path(world.borders);
        gctx.stroke();
      }

      // Limb shading — radial gradient inside the sphere
      const grad = gctx.createRadialGradient(
        CENTER,
        CENTER,
        R * 0.65,
        CENTER,
        CENTER,
        R,
      );
      grad.addColorStop(0, LIMB_INNER);
      grad.addColorStop(1, LIMB_OUTER);
      gctx.fillStyle = grad;
      gctx.beginPath();
      gctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
      gctx.fill();

      gctx.restore();

      // Sphere outline again on top to keep the limb crisp
      gctx.strokeStyle = INK;
      gctx.lineWidth = 1.2;
      gctx.beginPath();
      gctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
      gctx.stroke();
    };

    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      drawWhirl(t);
      drawGlobe(t);
      if (!reduceMotion) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [world]);

  const style = { width: `${size}px`, height: `${size}px` } as const;
  return (
    <div
      className={`relative ${className}`}
      style={style}
      role="img"
      aria-label="Rotating globe"
    >
      <canvas
        ref={whirlRef}
        width={SIZE}
        height={SIZE}
        className="absolute inset-0"
        style={style}
      />
      <canvas
        ref={globeRef}
        width={SIZE}
        height={SIZE}
        className="absolute inset-0"
        style={style}
      />
    </div>
  );
}
