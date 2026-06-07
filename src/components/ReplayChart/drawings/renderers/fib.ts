import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

export const renderFibonacci: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  if (drawing.points.length < 2) return;
  const p1 = toPixel(drawing.points[0]);
  const p2 = toPixel(drawing.points[1]);
  if (!p1 || !p2) return;

  const levels = drawing.levels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const priceDiff = drawing.points[1].price - drawing.points[0].price;

  levels.forEach(level => {
    const price = drawing.points[0].price + priceDiff * level;
    const levelPoint = toPixel({ time: drawing.points[0].time, price });
    if (!levelPoint) return;

    ctx.beginPath();
    ctx.moveTo(0, levelPoint.y);
    ctx.lineTo(canvas.width, levelPoint.y);
    ctx.stroke();

    if (drawing.showLabels !== false) {
      ctx.fillStyle = color;
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${(level * 100).toFixed(1)}% (${price.toFixed(2)})`,
        canvas.width - 10,
        levelPoint.y - 5
      );
    }
  });
};

export const renderFibonacciExtension: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color, candlestickSeries } = rc;
  // A=p0, B=p1, C=p2; levels projected from C using AB range in pixel space
  if (drawing.points.length < 3) return;
  const pA = toPixel(drawing.points[0]);
  const pB = toPixel(drawing.points[1]);
  const pC = toPixel(drawing.points[2]);
  if (!pA || !pB || !pC) return;

  const extLevels = [0, 0.382, 0.618, 1, 1.618, 2.618];
  const dyAB = pB.y - pA.y; // pixel range AB

  const xLeft = Math.min(pA.x, pC.x);

  extLevels.forEach(level => {
    const ly = pC.y + dyAB * level;
    // Map pixel y back to price for the label
    const price = candlestickSeries
      ? candlestickSeries.coordinateToPrice(ly)
      : null;

    ctx.beginPath();
    ctx.moveTo(xLeft, ly);
    ctx.lineTo(canvas.width, ly);
    ctx.stroke();

    if (drawing.showLabels !== false) {
      ctx.fillStyle = color;
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      const priceLabel = price !== null ? price.toFixed(2) : '';
      ctx.fillText(
        `${level} (${priceLabel})`,
        canvas.width - 10,
        ly - 5
      );
    }
  });
};
