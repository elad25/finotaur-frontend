import { Drawing, DrawingPoint, DrawingStyle } from '../../types';
import { ISeriesApi } from 'lightweight-charts';

export interface RenderCtx {
  ctx: CanvasRenderingContext2D;
  toPixel: (point: DrawingPoint) => { x: number; y: number } | null;
  canvas: HTMLCanvasElement;
  colors: Record<string, string>;
  /** normalized style (drawing.style ?? fallback) — strokeStyle/fillStyle/lineWidth/dash already applied to ctx before call */
  style: DrawingStyle;
  /** resolved stroke color (accounts for selected/locked state) */
  color: string;
  /** candlestick series — needed by fibonacci-extension for coordinateToPrice */
  candlestickSeries: ISeriesApi<'Candlestick'> | null;
}

export type Renderer = (rc: RenderCtx, drawing: Drawing) => void;
