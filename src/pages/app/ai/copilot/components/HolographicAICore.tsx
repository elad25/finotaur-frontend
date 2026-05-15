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
  visible: boolean;
}

interface HolographicAICoreProps {
  className?: string;
  width?: number;
  height?: number;
}

const GOLD = '#d8b451';
const GOLD_BRIGHT = '#ffe4a0';
const GOLD_DOT = '#c9a646';

export function HolographicAICore({ width = 430, height = 318, className = '' }: HolographicAICoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    let cancelled = false;

    const containerWidth = Math.min(width, window.innerWidth - 40);
    const containerHeight = Math.min(height, window.innerHeight - 100);
    const radius = Math.min(containerWidth, containerHeight) / 2.5;

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
        const coordinates = geometry.coordinates;

        if (!pointInPolygon(point, coordinates[0])) {
          return false;
        }

        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) {
            return false;
          }
        }

        return true;
      }

      if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false;

            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true;
                break;
              }
            }

            if (!inHole) {
              return true;
            }
          }
        }
      }

      return false;
    };

    const generateDotsInPolygon = (feature: LandFeature, dotSpacing = 16) => {
      const dots: [number, number][] = [];
      const [[minLng, minLat], [maxLng, maxLat]] = d3.geoBounds(feature);
      const stepSize = dotSpacing * 0.08;

      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat];
          if (pointInFeature(point, feature)) {
            dots.push(point);
          }
        }
      }

      return dots;
    };

    const allDots: DotData[] = [];
    let landFeatures: LandFeatureCollection | null = null;

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight);

      const currentScale = projection.scale();
      const scaleFactor = currentScale / radius;
      const cx = containerWidth / 2;
      const cy = containerHeight / 2;

      context.save();
      context.shadowColor = 'rgba(216, 180, 81, 0.34)';
      context.shadowBlur = 22;
      context.beginPath();
      context.arc(cx, cy, currentScale, 0, 2 * Math.PI);
      context.fillStyle = '#000000';
      context.fill();
      context.strokeStyle = GOLD_BRIGHT;
      context.lineWidth = 2 * scaleFactor;
      context.stroke();
      context.restore();

      if (landFeatures) {
        const graticule = d3.geoGraticule();

        context.beginPath();
        path(graticule());
        context.strokeStyle = GOLD;
        context.lineWidth = 1 * scaleFactor;
        context.globalAlpha = 0.22;
        context.stroke();
        context.globalAlpha = 1;

        context.beginPath();
        landFeatures.features.forEach((feature) => {
          path(feature);
        });
        context.strokeStyle = GOLD_BRIGHT;
        context.lineWidth = 1 * scaleFactor;
        context.globalAlpha = 0.72;
        context.stroke();
        context.globalAlpha = 1;

        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat]);
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            context.beginPath();
            context.arc(projected[0], projected[1], 1.2 * scaleFactor, 0, 2 * Math.PI);
            context.fillStyle = GOLD_DOT;
            context.globalAlpha = 0.82;
            context.fill();
            context.globalAlpha = 1;
          }
        });
      }
    };

    const loadWorldData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(LAND_DATA_URL);
        if (!response.ok) throw new Error('Failed to load land data');

        landFeatures = (await response.json()) as LandFeatureCollection;

        landFeatures.features.forEach((feature) => {
          const dots = generateDotsInPolygon(feature, 16);
          dots.forEach(([lng, lat]) => {
            allDots.push({ lng, lat, visible: true });
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

    const rotation: [number, number] = [0, 0];
    const rotationSpeed = 0.5;

    const rotate = () => {
      rotation[0] += rotationSpeed;
      projection.rotate(rotation);
      render();
    };

    const rotationTimer = d3.timer(rotate);

    void loadWorldData();

    return () => {
      cancelled = true;
      rotationTimer.stop();
    };
  }, [width, height]);

  if (error) {
    return (
      <div className={`relative z-10 flex h-[318px] w-[430px] max-w-full items-center justify-center rounded-[8px] bg-black/10 ${className}`}>
        <p className="text-center text-[10px] uppercase tracking-[0.22em] text-gold-primary/70">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative z-10 mt-[-16px] flex h-[318px] w-[500px] max-w-full items-center justify-center overflow-visible ${className}`}
      role="img"
      aria-label="Gold rotating market Earth visualization"
    >
      <canvas
        ref={canvasRef}
        className="block h-auto max-w-full rounded-[8px] bg-transparent"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.28em] text-gold-primary/70">
          Loading market globe
        </div>
      )}
    </div>
  );
}
