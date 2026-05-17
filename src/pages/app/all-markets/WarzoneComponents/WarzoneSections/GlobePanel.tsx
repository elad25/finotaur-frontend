/**
 * GlobePanel — interactive dotted WebGL globe (via cobe) + floating quote cards.
 *
 * Uses cobe (~3KB) to render a GPU-accelerated dotted earth that slowly auto-
 * rotates. Tinted in FINOTAUR gold. The 4 quote cards float over the corners.
 */

import * as React from "react";
import createGlobe from "cobe";
import { Price, Change } from "@/components/ds/NumberDisplay";
import { cn } from "@/lib/utils";

function GlobeCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const pointerInteracting = React.useRef<number | null>(null);
  const pointerInteractionMovement = React.useRef(0);
  const rotation = React.useRef(0);
  const widthRef = React.useRef(400);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const onResize = () => {
      const parent = canvas.parentElement;
      if (parent && parent.offsetWidth > 0) widthRef.current = parent.offsetWidth;
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", onResize);

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      phi: 0,
      theta: 0.3,
      dark: 0.85,
      diffuse: 2.4,
      mapSamples: 22000,
      mapBrightness: 9,
      baseColor: [0.30, 0.22, 0.10],
      markerColor: [1.0, 0.85, 0.35],
      glowColor: [0.95, 0.72, 0.30],
      markers: [
        { location: [40.7128, -74.006], size: 0.10 },   // NYC
        { location: [51.5074, -0.1278], size: 0.09 },   // London
        { location: [35.6762, 139.6503], size: 0.10 },  // Tokyo
        { location: [22.3193, 114.1694], size: 0.08 },  // Hong Kong
        { location: [1.3521, 103.8198], size: 0.07 },   // Singapore
        { location: [50.1109, 8.6821], size: 0.07 },    // Frankfurt
        { location: [37.7749, -122.4194], size: 0.08 }, // SF
        { location: [41.8781, -87.6298], size: 0.07 },  // Chicago
        { location: [-33.8688, 151.2093], size: 0.07 }, // Sydney
        { location: [25.2048, 55.2708], size: 0.07 },   // Dubai
        { location: [55.7558, 37.6173], size: 0.06 },   // Moscow
        { location: [19.076, 72.8777], size: 0.07 },    // Mumbai
        { location: [-23.5505, -46.6333], size: 0.07 }, // São Paulo
        { location: [-26.2041, 28.0473], size: 0.05 },  // Johannesburg
        { location: [31.2304, 121.4737], size: 0.08 },  // Shanghai
      ],
      onRender: (state: Record<string, number>) => {
        if (!pointerInteracting.current) rotation.current += 0.003;
        state.phi = rotation.current + pointerInteractionMovement.current;
        state.width = widthRef.current * 2;
        state.height = widthRef.current * 2;
      },
    } as Parameters<typeof createGlobe>[1]);

    // Fade canvas in once first paint lands
    setTimeout(() => {
      if (canvas) canvas.style.opacity = "1";
    }, 50);

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full aspect-square">
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
          if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta / 200;
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          contain: "layout paint size",
          opacity: 0,
          transition: "opacity 600ms ease-out",
        }}
        aria-label="Interactive globe"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FloatingQuoteCard — small frosted card with symbol + price + change.
// ---------------------------------------------------------------------------
function FloatingQuoteCard({
  symbol,
  rows,
  className,
  style,
}: {
  symbol: string;
  rows: Array<{ label: string; price: number; change: number }>;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "absolute z-20 px-4 py-3 rounded-[12px]",
        "bg-surface-glass backdrop-blur-glass",
        "border-[0.5px] border-gold-border",
        "shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
        "min-w-[140px]",
        className,
      )}
      style={style}
    >
      <div className="font-sans text-[10px] tracking-[1.5px] uppercase text-gold-primary mb-2">
        {symbol}
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            {row.label && (
              <span className="font-sans text-[10px] uppercase tracking-wider text-ink-tertiary">
                {row.label}
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Price value={row.price} size="small" format="plain" decimals={2} />
              <Change value={row.change} format="percent" decimals={2} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GlobePanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative w-full aspect-square max-w-[640px] mx-auto",
        className,
      )}
    >
      {/* Warm gold halo behind globe */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(244,217,123,0.30) 0%, rgba(201,166,70,0.14) 35%, transparent 65%)",
        }}
      />
      {/* Subtle static dot grid behind canvas — guarantees something visible
          even if WebGL fails to mount the globe. */}
      <div
        aria-hidden
        className="absolute inset-[12%] rounded-full pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(circle at center, rgba(201,166,70,0.12) 0%, transparent 70%)",
          boxShadow:
            "inset 0 0 80px rgba(201,166,70,0.20), 0 0 80px rgba(201,166,70,0.15)",
          border: "0.5px solid rgba(201,166,70,0.25)",
        }}
      />

      <GlobeCanvas />

      {/* Floating quote cards */}
      <FloatingQuoteCard
        symbol="US Futures"
        className="top-[4%] left-[-2%] md:left-[2%]"
        rows={[
          { label: "ES", price: 5278.25, change: 0.58 },
          { label: "NQ", price: 18432.5, change: 0.74 },
          { label: "YM", price: 39612.0, change: 0.28 },
        ]}
      />

      <FloatingQuoteCard
        symbol="DXY"
        className="top-[8%] right-[-2%] md:right-[2%]"
        rows={[{ label: "", price: 104.32, change: 0.21 }]}
      />

      <FloatingQuoteCard
        symbol="10Y Yield"
        className="bottom-[10%] left-[-2%] md:left-[1%]"
        rows={[
          { label: "", price: 4.38, change: -0.04 },
          { label: "2Y", price: 4.71, change: -0.06 },
        ]}
      />

      <FloatingQuoteCard
        symbol="S&P 500"
        className="bottom-[6%] right-[-2%] md:right-[2%]"
        rows={[{ label: "", price: 5269.91, change: 0.58 }]}
      />
    </div>
  );
}
