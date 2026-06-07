import { DrawingType } from '../../types';
import { Renderer } from './types';
import {
  renderLine,
  renderHorizontal,
  renderVertical,
  renderArrow,
  renderTrendAngle,
  renderHorizontalRay,
  renderCrossLine,
} from './lines';
import {
  renderRectangle,
  renderCircleOrEllipse,
  renderTriangle,
  renderRotatedRectangle,
  renderArc,
} from './shapes';
import {
  renderParallelChannel,
  renderPitchfork,
  renderGannFan,
} from './channels';
import {
  renderFibonacci,
  renderFibonacciExtension,
} from './fib';
import {
  renderBrush,
  renderHighlighter,
} from './freehand';
import {
  renderTextOrNote,
  renderMeasure,
} from './annotations';

export type { Renderer, RenderCtx } from './types';

export const RENDERERS: Partial<Record<DrawingType, Renderer>> = {
  // Lines family
  trendline: renderLine,
  ray: renderLine,
  extended: renderLine,
  horizontal: renderHorizontal,
  vertical: renderVertical,
  arrow: renderArrow,
  'trend-angle': renderTrendAngle,
  'horizontal-ray': renderHorizontalRay,
  'cross-line': renderCrossLine,

  // Shapes family
  rectangle: renderRectangle,
  circle: renderCircleOrEllipse,
  ellipse: renderCircleOrEllipse,
  triangle: renderTriangle,
  'rotated-rectangle': renderRotatedRectangle,
  arc: renderArc,

  // Channels family
  'parallel-channel': renderParallelChannel,
  pitchfork: renderPitchfork,
  'gann-fan': renderGannFan,

  // Fibonacci family
  fibonacci: renderFibonacci,
  'fibonacci-extension': renderFibonacciExtension,

  // Freehand family
  brush: renderBrush,
  highlighter: renderHighlighter,

  // Annotations family
  text: renderTextOrNote,
  note: renderTextOrNote,
  measure: renderMeasure,

  // cursor and cross have no render — intentionally omitted (Partial allows this)
};
