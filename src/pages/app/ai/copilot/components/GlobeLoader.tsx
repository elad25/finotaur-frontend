import { useEffect, useRef, useState } from 'react';
import { geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, MultiLineString } from 'geojson';

// Monochrome gold-ink scale on a transparent dark surface.
// Maps the README's "ink on warm off-white" tokens to the COPILOT dark theme.
const INK = 'rgba(244, 217, 123, 0.92)';
const INK_SOFT = 'rgba(244, 217, 123, 0.50)';
const INK_HAIR = 'rgba(244, 217, 123, 0.14)';
const INK_FILL = 'rgba(201, 166, 70, 0.10)';
const LIMB_INNER = 'rgba(0, 0, 0, 0)';
const LIMB_OUTER = 'rgba(0, 0, 0, 0.55)';

const SIZE = 400;
const CENTER = SIZE / 2;
const R = 150;

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
    const globe = globeRef.current;
    if (!globe) return;

    const gctx = globe.getContext('2d');
    if (!gctx) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const projection = geoOrthographic()
      .scale(R)
      .translate([CENTER, CENTER])
      .clipAngle(90);
    const path = geoPath(projection, gctx);
    const graticule = geoGraticule10();

    const t0 = performance.now();

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
        ref={globeRef}
        width={SIZE}
        height={SIZE}
        className="absolute inset-0"
        style={style}
      />
    </div>
  );
}
