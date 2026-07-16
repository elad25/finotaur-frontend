import { useEffect, useMemo, useRef, useState } from 'react';
import { Settings, X } from 'lucide-react';
import type { Interval } from '@/components/charting/types';

interface FootprintChartProps {
  symbol: string;
  interval: Interval;
}

interface FootprintSettings {
  basePeriodValue: number;
  ticksPerLevel: number;
  sizeFilter: number;
  levelsPerCandle: number;
  candleWidth: number;
  gap: number;
  rowHeight: number;
  profileWidth: number;
  strengthSensitivity: number;
  showAsProfile: boolean;
  showVolume: boolean;
  showImbalance: boolean;
  imbalanceRatio: number;
  minimumDeltaForImbalance: number;
  showMaximum: boolean;
  hideText: boolean;
  centerOpenCloseBar: boolean;
}

interface FootprintLevel {
  price: number;
  bid: number;
  ask: number;
}

interface FootprintCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  levels: FootprintLevel[];
}

const DEFAULT_SETTINGS: FootprintSettings = {
  basePeriodValue: 5,
  ticksPerLevel: 12,
  sizeFilter: 0,
  levelsPerCandle: 10,
  candleWidth: 116,
  gap: 10,
  rowHeight: 28,
  profileWidth: 12,
  strengthSensitivity: 20,
  showAsProfile: true,
  showVolume: false,
  showImbalance: true,
  imbalanceRatio: 3,
  minimumDeltaForImbalance: 10,
  showMaximum: true,
  hideText: false,
  centerOpenCloseBar: true,
};

const PRICE_STEP = 2.5;

function buildFootprintCandles(settings: FootprintSettings): FootprintCandle[] {
  const anchors = [29747.5, 29739.5, 29748.5, 29750.5, 29731.5, 29736.5, 29727.5];
  const shapes = [
    [32, 45, 45, 56, 37, 7, 18, 2],
    [0, 6, 12, 21, 16, 15, 33, 23, 28, 12, 18, 4, 11, 7, 31, 20, 33, 11],
    [33, 37, 19, 30, 0, 20, 18, 32, 11, 17, 12, 9, 0, 8, 1, 8, 2, 2, 8, 3],
    [2, 13, 20, 4, 9, 7, 7, 9, 30, 2, 11, 17, 35, 14, 16, 38, 40, 68, 42, 49, 24, 17],
    [18, 42, 28, 31, 44, 11, 63, 18, 25, 10, 17, 7],
    [7, 19, 26, 36, 14, 12, 12, 28, 9, 8, 4, 6],
    [0, 0, 12, 20, 27, 13, 34, 29, 25, 18],
  ];

  return anchors.map((anchor, candleIndex) => {
    const raw = shapes[candleIndex];
    const maxPairs = Math.max(4, Math.min(settings.levelsPerCandle, Math.floor(raw.length / 2)));
    const levels = Array.from({ length: maxPairs }, (_, levelIndex) => {
      const bid = raw[(levelIndex * 2) % raw.length];
      const ask = raw[(levelIndex * 2 + 1) % raw.length];
      return {
        price: anchor - levelIndex * PRICE_STEP,
        bid: bid >= settings.sizeFilter ? bid : 0,
        ask: ask >= settings.sizeFilter ? ask : 0,
      };
    });
    const prices = levels.map((level) => level.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const bullish = candleIndex === 0 || candleIndex === 2 || candleIndex === 5;

    return {
      time: `${String(8 + candleIndex).padStart(2, '0')}:3${candleIndex}`,
      open: bullish ? low + PRICE_STEP : high - PRICE_STEP,
      high,
      low,
      close: bullish ? high - PRICE_STEP : low + PRICE_STEP,
      levels,
    };
  });
}

function drawFootprintChart(
  canvas: HTMLCanvasElement,
  candles: FootprintCandle[],
  settings: FootprintSettings,
  symbol: string,
  interval: Interval
) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = '#050506';
  ctx.fillRect(0, 0, rect.width, rect.height);

  const top = 34;
  const bottomStats = 90;
  const chartBottom = rect.height - bottomStats;
  const leftPad = 32;
  const rightScale = 78;
  const chartRight = rect.width - rightScale;
  const allPrices = candles.flatMap((candle) => candle.levels.map((level) => level.price));
  const minPrice = Math.min(...allPrices) - PRICE_STEP * 2;
  const maxPrice = Math.max(...allPrices) + PRICE_STEP * 2;
  const priceRange = maxPrice - minPrice || 1;
  const yForPrice = (price: number) =>
    top + ((maxPrice - price) / priceRange) * (chartBottom - top - 20);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let y = top; y <= chartBottom; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(chartRight, Math.round(y) + 0.5);
    ctx.stroke();
  }
  for (let x = leftPad; x <= chartRight; x += 86) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, chartBottom);
    ctx.stroke();
  }

  ctx.font = '12px Inter, Arial, sans-serif';
  for (let price = Math.ceil(minPrice / 5) * 5; price <= maxPrice; price += 5) {
    const y = yForPrice(price);
    ctx.fillStyle = 'rgba(230,230,230,0.8)';
    ctx.fillText(price.toFixed(2), chartRight + 10, y + 4);
  }

  const totalWidth = candles.length * settings.candleWidth + (candles.length - 1) * settings.gap;
  const startX = Math.max(leftPad, (chartRight - totalWidth) / 2);
  const bidColor = 'rgba(255, 75, 75, 0.58)';
  const askColor = 'rgba(94, 218, 121, 0.58)';
  const bidStrong = 'rgba(255, 135, 135, 0.82)';
  const askStrong = 'rgba(134, 230, 151, 0.82)';

  candles.forEach((candle, candleIndex) => {
    const x = startX + candleIndex * (settings.candleWidth + settings.gap);
    const bodyTop = yForPrice(candle.high);
    const bodyBottom = yForPrice(candle.low);
    const centerX = x + settings.candleWidth / 2;
    const half = settings.candleWidth / 2;
    const maxLevelVol = Math.max(...candle.levels.map((level) => level.bid + level.ask), 1);
    const maxSide = Math.max(...candle.levels.flatMap((level) => [level.bid, level.ask]), 1);

    ctx.strokeStyle = 'rgba(235,235,235,0.58)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, bodyTop - 8, settings.candleWidth, bodyBottom - bodyTop + 16);

    ctx.strokeStyle = candle.close >= candle.open ? '#19d44f' : '#ff2020';
    ctx.lineWidth = Math.max(5, settings.profileWidth * 0.58);
    ctx.beginPath();
    ctx.moveTo(centerX, yForPrice(candle.high) - 8);
    ctx.lineTo(centerX, yForPrice(candle.low) + 8);
    ctx.stroke();

    if (settings.centerOpenCloseBar) {
      ctx.strokeStyle = candle.close >= candle.open ? '#18f15a' : '#ff2b2b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, yForPrice(candle.open));
      ctx.lineTo(centerX, yForPrice(candle.close));
      ctx.stroke();
    }

    candle.levels.forEach((level, levelIndex) => {
      const y = bodyTop + levelIndex * settings.rowHeight;
      const rowY = Math.min(y, bodyBottom - settings.rowHeight + 6);
      const bidRatio = level.bid / maxSide;
      const askRatio = level.ask / maxSide;
      const totalRatio = (level.bid + level.ask) / maxLevelVol;
      const isBuyImbalance =
        settings.showImbalance &&
        level.ask >= settings.minimumDeltaForImbalance &&
        level.ask / Math.max(level.bid, 1) >= settings.imbalanceRatio;
      const isSellImbalance =
        settings.showImbalance &&
        level.bid >= settings.minimumDeltaForImbalance &&
        level.bid / Math.max(level.ask, 1) >= settings.imbalanceRatio;
      const isMax = settings.showMaximum && (level.bid === maxSide || level.ask === maxSide);

      ctx.fillStyle = isSellImbalance || isMax ? bidStrong : bidColor;
      ctx.fillRect(centerX - half, rowY, half * Math.max(0.55, bidRatio), settings.rowHeight - 1);
      ctx.fillStyle = isBuyImbalance || isMax ? askStrong : askColor;
      ctx.fillRect(centerX, rowY, half * Math.max(0.55, askRatio), settings.rowHeight - 1);

      if (settings.showAsProfile) {
        const profileHeight = Math.max(3, (settings.rowHeight - 5) * totalRatio);
        ctx.fillStyle = candle.close >= candle.open ? '#1eff5d' : '#ff2424';
        ctx.fillRect(
          centerX - settings.profileWidth / 2,
          rowY + (settings.rowHeight - profileHeight) / 2,
          settings.profileWidth,
          profileHeight
        );
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeRect(centerX - half, rowY, half, settings.rowHeight - 1);
      ctx.strokeRect(centerX, rowY, half, settings.rowHeight - 1);

      if (!settings.hideText) {
        ctx.font = `${isBuyImbalance || isSellImbalance || isMax ? '700' : '500'} 14px Inter, Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.fillStyle = isSellImbalance ? '#ff00de' : isMax && level.bid >= level.ask ? '#2443ff' : '#d0d0d0';
        ctx.fillText(String(level.bid), centerX - 8, rowY + settings.rowHeight / 2);
        ctx.textAlign = 'left';
        ctx.fillStyle = isBuyImbalance ? '#00f0ff' : isMax && level.ask > level.bid ? '#00f0ff' : '#d0d0d0';
        ctx.fillText(String(level.ask), centerX + 8, rowY + settings.rowHeight / 2);
      }
    });

    ctx.fillStyle = 'rgba(220,220,220,0.65)';
    ctx.textAlign = 'center';
    ctx.font = '12px Inter, Arial, sans-serif';
    ctx.fillText(candle.time, centerX, rect.height - 16);
  });

  const currentPrice = candles[candles.length - 1]?.close ?? 29725.25;
  const currentY = yForPrice(currentPrice);
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.moveTo(0, currentY);
  ctx.lineTo(chartRight, currentY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#050505';
  ctx.fillRect(chartRight - 2, currentY - 13, rightScale, 26);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 12px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(currentPrice.toFixed(2), chartRight + 8, currentY + 4);

  const statsTop = rect.height - bottomStats + 4;
  const statsHeight = 76;
  const statWidth = Math.max(90, (chartRight - startX) / candles.length);
  candles.forEach((candle, index) => {
    const x = startX + index * statWidth;
    const totalBid = candle.levels.reduce((sum, level) => sum + level.bid, 0);
    const totalAsk = candle.levels.reduce((sum, level) => sum + level.ask, 0);
    const delta = totalAsk - totalBid;
    const rows = [
      { value: totalBid + totalAsk, color: 'rgba(255,255,255,0.72)', bg: 'rgba(70,70,78,0.78)' },
      { value: delta, color: delta >= 0 ? '#29f08a' : '#ff6666', bg: delta >= 0 ? 'rgba(0,110,55,0.44)' : 'rgba(110,0,0,0.48)' },
      { value: `${((delta / Math.max(totalBid + totalAsk, 1)) * 100).toFixed(1)}%`, color: delta >= 0 ? '#29f08a' : '#ff6666', bg: delta >= 0 ? 'rgba(0,95,50,0.56)' : 'rgba(130,0,0,0.54)' },
    ];
    rows.forEach((row, rowIndex) => {
      ctx.fillStyle = row.bg;
      ctx.fillRect(x, statsTop + rowIndex * (statsHeight / 3), statWidth - 1, statsHeight / 3 - 1);
      ctx.fillStyle = row.color;
      ctx.font = '700 12px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(row.value), x + statWidth / 2, statsTop + rowIndex * (statsHeight / 3) + 17);
    });
  });

  ctx.fillStyle = 'rgba(201,166,70,0.08)';
  ctx.font = '900 56px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FINOTAUR', chartRight / 2, chartBottom / 2 + 18);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '600 12px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${symbol} - ${interval} - Volumetric BidAsk`, 14, 22);
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid grid-cols-[1fr_280px] items-center gap-4 text-sm text-black">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function FootprintChart({ symbol, interval }: FootprintChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<FootprintSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const candles = useMemo(() => buildFootprintCandles(settings), [settings]);

  useEffect(() => {
    const draw = () => {
      if (canvasRef.current) {
        drawFootprintChart(canvasRef.current, candles, settings, symbol, interval);
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    if (wrapRef.current) observer.observe(wrapRef.current);
    window.addEventListener('resize', draw);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [candles, interval, settings, symbol]);

  const updateSetting = <K extends keyof FootprintSettings>(key: K, value: FootprintSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full bg-[#050506]"
      onDoubleClick={() => setSettingsOpen(true)}
    >
      <canvas ref={canvasRef} className="h-full w-full cursor-crosshair" />

      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="absolute right-4 top-4 flex h-8 items-center gap-2 border border-white/10 bg-black/70 px-3 text-xs text-zinc-200 hover:border-[#C9A646]/50 hover:text-[#C9A646]"
      >
        <Settings className="h-3.5 w-3.5" />
        Properties
      </button>

      <div className="pointer-events-none absolute bottom-3 left-4 text-xs text-zinc-500">
        Double click chart to edit volumetric settings
      </div>

      {settingsOpen && (
        <div className="absolute inset-0 z-50 flex items-start justify-end bg-black/35">
          <div className="m-6 h-[calc(100%-48px)] w-[620px] overflow-y-auto border border-black bg-[#e5e5e5] text-black shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/30 bg-white px-3 py-2">
              <span className="text-sm font-medium">Properties</span>
              <button type="button" onClick={() => setSettingsOpen(false)} className="p-1 hover:bg-black/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-4">
              <section className="space-y-2">
                <h3 className="border-b border-black/20 pb-1 text-sm font-bold">Data Series</h3>
                <SettingRow label="Type">
                  <select className="border border-black bg-white px-2 py-1" value="Volumetric" onChange={() => undefined}>
                    <option>Volumetric</option>
                  </select>
                </SettingRow>
                <SettingRow label="Base period type">
                  <select className="border border-black bg-white px-2 py-1" value="Minute" onChange={() => undefined}>
                    <option>Minute</option>
                  </select>
                </SettingRow>
                <SettingRow label="Base period value">
                  <input className="border border-black px-2 py-1" type="number" value={settings.basePeriodValue} onChange={(event) => updateSetting('basePeriodValue', Number(event.target.value))} />
                </SettingRow>
                <SettingRow label="Delta type">
                  <select className="border border-black bg-white px-2 py-1" value="Bid Ask" onChange={() => undefined}>
                    <option>Bid Ask</option>
                  </select>
                </SettingRow>
                <SettingRow label="Ticks per level">
                  <input className="border border-black px-2 py-1" type="number" value={settings.ticksPerLevel} onChange={(event) => updateSetting('ticksPerLevel', Number(event.target.value))} />
                </SettingRow>
                <SettingRow label="Size filter">
                  <input className="border border-black px-2 py-1" type="number" value={settings.sizeFilter} onChange={(event) => updateSetting('sizeFilter', Number(event.target.value))} />
                </SettingRow>
              </section>

              <section className="space-y-2">
                <h3 className="border-b border-black/20 pb-1 text-sm font-bold">Chart style</h3>
                <SettingRow label="Chart style">
                  <select className="border border-black bg-white px-2 py-1" value="Volumetric" onChange={() => undefined}>
                    <option>Volumetric</option>
                  </select>
                </SettingRow>
                <SettingRow label="Chart style type">
                  <select className="border border-black bg-white px-2 py-1" value="BidAsk" onChange={() => undefined}>
                    <option>BidAsk</option>
                  </select>
                </SettingRow>
                <SettingRow label="Center open close bar">
                  <input type="checkbox" checked={settings.centerOpenCloseBar} onChange={(event) => updateSetting('centerOpenCloseBar', event.target.checked)} />
                </SettingRow>
                <SettingRow label="Show as profile">
                  <input type="checkbox" checked={settings.showAsProfile} onChange={(event) => updateSetting('showAsProfile', event.target.checked)} />
                </SettingRow>
                <SettingRow label="Show volume">
                  <input type="checkbox" checked={settings.showVolume} onChange={(event) => updateSetting('showVolume', event.target.checked)} />
                </SettingRow>
                <SettingRow label="Strength sensitivity">
                  <input className="border border-black px-2 py-1" type="number" value={settings.strengthSensitivity} onChange={(event) => updateSetting('strengthSensitivity', Number(event.target.value))} />
                </SettingRow>
                <SettingRow label="Show imbalance">
                  <input type="checkbox" checked={settings.showImbalance} onChange={(event) => updateSetting('showImbalance', event.target.checked)} />
                </SettingRow>
                <SettingRow label="Imbalance ratio">
                  <input className="border border-black px-2 py-1" type="number" value={settings.imbalanceRatio} onChange={(event) => updateSetting('imbalanceRatio', Number(event.target.value))} />
                </SettingRow>
                <SettingRow label="Minimum delta for imbalance">
                  <input className="border border-black px-2 py-1" type="number" value={settings.minimumDeltaForImbalance} onChange={(event) => updateSetting('minimumDeltaForImbalance', Number(event.target.value))} />
                </SettingRow>
                <SettingRow label="Show maximum">
                  <input type="checkbox" checked={settings.showMaximum} onChange={(event) => updateSetting('showMaximum', event.target.checked)} />
                </SettingRow>
                <SettingRow label="Hide text">
                  <input type="checkbox" checked={settings.hideText} onChange={(event) => updateSetting('hideText', event.target.checked)} />
                </SettingRow>
              </section>

              <section className="space-y-2">
                <h3 className="border-b border-black/20 pb-1 text-sm font-bold">Visual</h3>
                <SettingRow label="Levels per candle">
                  <input className="border border-black px-2 py-1" type="number" min={4} max={12} value={settings.levelsPerCandle} onChange={(event) => updateSetting('levelsPerCandle', Number(event.target.value))} />
                </SettingRow>
                <SettingRow label="Candle width">
                  <input type="range" min={80} max={150} value={settings.candleWidth} onChange={(event) => updateSetting('candleWidth', Number(event.target.value))} />
                </SettingRow>
                <SettingRow label="Box row height">
                  <input type="range" min={20} max={34} value={settings.rowHeight} onChange={(event) => updateSetting('rowHeight', Number(event.target.value))} />
                </SettingRow>
                <SettingRow label="Volume profile width">
                  <input type="range" min={4} max={22} value={settings.profileWidth} onChange={(event) => updateSetting('profileWidth', Number(event.target.value))} />
                </SettingRow>
                <SettingRow label="Candle gap">
                  <input type="range" min={2} max={28} value={settings.gap} onChange={(event) => updateSetting('gap', Number(event.target.value))} />
                </SettingRow>
              </section>

              <div className="pb-4 text-right text-sm italic">preset volumetric</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
