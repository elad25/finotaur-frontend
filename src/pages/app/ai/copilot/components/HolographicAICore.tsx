import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const LAND_DATA_URL =
  'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json';

type PolygonRing = [number, number][];
type LandGeometry =
  | { type: 'Polygon'; coordinates: PolygonRing[] }
  | { type: 'MultiPolygon'; coordinates: PolygonRing[][] };

interface LandFeature {
  type: 'Feature';
  geometry: LandGeometry;
  properties?: Record<string, unknown>;
}

interface LandFeatureCollection {
  type: 'FeatureCollection';
  features: LandFeature[];
}

interface DotData {
  lng: number;
  lat: number;
}

export function HolographicAICore({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let cancelled = false;
    let landFeatures: LandFeatureCollection | null = null;
    const allDots: DotData[] = [];

    const containerWidth = 360;
    const containerHeight = 276;
    const radius = Math.min(containerWidth, containerHeight) / 2.45;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90);

    const path = d3.geoPath().projection(projection).context(context);
    const graticule = d3.geoGraticule();

    const pointInPolygon = (point: [number, number], polygon: PolygonRing): boolean => {
      const [x, y] = point;
      let inside = false;

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }

      return inside;
    };

    const pointInFeature = (point: [number, number], feature: LandFeature): boolean => {
      const geometry = feature.geometry;

      if (geometry.type === 'Polygon') {
        if (!pointInPolygon(point, geometry.coordinates[0])) return false;

        for (let i = 1; i < geometry.coordinates.length; i++) {
          if (pointInPolygon(point, geometry.coordinates[i])) return false;
        }

        return true;
      }

      if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
          if (!pointInPolygon(point, polygon[0])) continue;

          let inHole = false;
          for (let i = 1; i < polygon.length; i++) {
            if (pointInPolygon(point, polygon[i])) {
              inHole = true;
              break;
            }
          }

          if (!inHole) return true;
        }
      }

      return false;
    };

    const generateDotsInPolygon = (feature: LandFeature, dotSpacing = 17) => {
      const dots: [number, number][] = [];
      const [[minLng, minLat], [maxLng, maxLat]] = d3.geoBounds(feature);
      const stepSize = dotSpacing * 0.08;

      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat];
          if (pointInFeature(point, feature)) dots.push(point);
        }
      }

      return dots;
    };

    const drawGoldGlow = (cx: number, cy: number, currentScale: number) => {
      const glow = context.createRadialGradient(cx, cy, currentScale * 0.24, cx, cy, currentScale * 1.34);
      glow.addColorStop(0, 'rgba(255, 226, 143, 0.18)');
      glow.addColorStop(0.5, 'rgba(201, 166, 70, 0.08)');
      glow.addColorStop(1, 'rgba(201, 166, 70, 0)');

      context.save();
      context.globalCompositeOperation = 'screen';
      context.fillStyle = glow;
      context.beginPath();
      context.arc(cx, cy, currentScale * 1.36, 0, 2 * Math.PI);
      context.fill();
      context.restore();
    };

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight);

      const cx = containerWidth / 2;
      const cy = containerHeight / 2;
      const currentScale = projection.scale();
      const scaleFactor = currentScale / radius;

      drawGoldGlow(cx, cy, currentScale);

      const sphere = context.createRadialGradient(
        cx - currentScale * 0.34,
        cy - currentScale * 0.38,
        currentScale * 0.12,
        cx,
        cy,
        currentScale,
      );
      sphere.addColorStop(0, 'rgba(255, 229, 155, 0.13)');
      sphere.addColorStop(0.3, 'rgba(62, 45, 16, 0.72)');
      sphere.addColorStop(0.68, 'rgba(4, 4, 3, 0.96)');
      sphere.addColorStop(1, 'rgba(0, 0, 0, 1)');

      context.beginPath();
      context.arc(cx, cy, currentScale, 0, 2 * Math.PI);
      context.fillStyle = sphere;
      context.fill();

      context.save();
      context.beginPath();
      context.arc(cx, cy, currentScale, 0, 2 * Math.PI);
      context.clip();

      if (landFeatures) {
        context.beginPath();
        path(graticule());
        context.strokeStyle = 'rgba(255, 218, 126, 0.16)';
        context.lineWidth = 0.7 * scaleFactor;
        context.stroke();

        context.beginPath();
        landFeatures.features.forEach((feature) => {
          path(feature);
        });
        context.strokeStyle = 'rgba(255, 226, 143, 0.48)';
        context.lineWidth = 0.8 * scaleFactor;
        context.stroke();

        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat]);
          if (
            projected &&
            projected[0] >= cx - currentScale &&
            projected[0] <= cx + currentScale &&
            projected[1] >= cy - currentScale &&
            projected[1] <= cy + currentScale
          ) {
            context.beginPath();
            context.arc(projected[0], projected[1], 1.05 * scaleFactor, 0, 2 * Math.PI);
            context.fillStyle = 'rgba(255, 214, 118, 0.68)';
            context.fill();
          }
        });
      }

      const reflection = context.createLinearGradient(cx - currentScale, cy - currentScale, cx, cy);
      reflection.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
      reflection.addColorStop(0.42, 'rgba(255, 225, 150, 0.035)');
      reflection.addColorStop(1, 'rgba(255, 255, 255, 0)');
      context.fillStyle = reflection;
      context.beginPath();
      context.ellipse(cx - currentScale * 0.28, cy - currentScale * 0.32, currentScale * 0.34, currentScale * 0.13, -0.58, 0, 2 * Math.PI);
      context.fill();

      context.restore();

      context.beginPath();
      context.arc(cx, cy, currentScale, 0, 2 * Math.PI);
      context.strokeStyle = 'rgba(255, 225, 145, 0.76)';
      context.lineWidth = 1.3 * scaleFactor;
      context.stroke();

      context.beginPath();
      context.arc(cx, cy, currentScale + 7, 0, 2 * Math.PI);
      context.strokeStyle = 'rgba(201, 166, 70, 0.16)';
      context.lineWidth = 0.8;
      context.stroke();
    };

    const loadWorldData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(LAND_DATA_URL);
        if (!response.ok) throw new Error('Failed to load land data');

        landFeatures = (await response.json()) as LandFeatureCollection;
        landFeatures.features.forEach((feature) => {
          generateDotsInPolygon(feature).forEach(([lng, lat]) => {
            allDots.push({ lng, lat });
          });
        });

        if (!cancelled) {
          render();
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load market globe');
          setIsLoading(false);
        }
      }
    };

    const rotation: [number, number] = [0, -8];
    const rotationTimer = d3.timer(() => {
      rotation[0] += 0.42;
      projection.rotate(rotation);
      render();
    });

    void loadWorldData();

    return () => {
      cancelled = true;
      rotationTimer.stop();
    };
  }, []);

  return (
    <div
      className={`relative z-10 mt-[-12px] flex h-[286px] w-[500px] max-w-full items-center justify-center overflow-visible ${className}`}
      role="img"
      aria-label="Gold rotating financial market globe"
    >
      <div className="absolute left-1/2 top-1/2 h-[235px] w-[235px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,226,143,0.18),rgba(201,166,70,0.07)_40%,rgba(0,0,0,0)_70%)] blur-lg" />
      <div className="absolute bottom-[18px] left-1/2 h-[24px] w-[230px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(255,221,133,0.18)_0%,rgba(201,166,70,0.06)_50%,rgba(0,0,0,0)_76%)] blur-[10px]" />
      <canvas
        ref={canvasRef}
        className="relative z-10 block max-w-full"
        aria-hidden="true"
      />
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-[10px] uppercase tracking-[0.28em] text-gold-primary/70">
          Loading market globe
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-[10px] uppercase tracking-[0.22em] text-gold-primary/70">
          {error}
        </div>
      )}
    </div>
  );
}
