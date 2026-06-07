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
  renderFibChannel,
  renderFibTimezone,
  renderFibCircles,
  renderFibSpeedFan,
  renderFibSpiral,
  renderFibWedge,
  renderPitchfan,
} from './fibadvanced';
import {
  renderGannBox,
  renderGannSquare,
  renderGannSquareFixed,
  renderPitchforkSchiff,
  renderPitchforkModified,
  renderPitchforkInside,
} from './gann';
import {
  renderBrush,
  renderHighlighter,
} from './freehand';
import {
  renderTextOrNote,
  renderMeasure,
} from './annotations';
import {
  renderEmoji,
  renderSticker,
  renderIcon,
  renderCallout,
  renderComment,
  renderPriceLabel,
  renderSignpost,
  renderFlag,
  renderArrowUp,
  renderArrowDown,
  renderArrowLeft,
  renderArrowRight,
} from './markers';
import {
  renderLongPosition,
  renderShortPosition,
} from './position';
import {
  renderPriceRange,
  renderDateRange,
  renderDatePriceRange,
} from './ranges';
import {
  renderCurve,
  renderDoubleCurve,
  renderForecast,
  renderProjection,
  renderBarsPattern,
  renderGhostFeed,
  renderAnchoredText,
  renderAnchoredNote,
  renderPriceNote,
  renderArrowMarker,
} from './extras';
import {
  renderXABCD,
  renderCypher,
  renderABCD,
  renderThreeDrives,
  renderHeadShoulders,
  renderTrianglePattern,
  renderElliottImpulse,
  renderElliottCorrection,
  renderElliottTriangle,
  renderElliottWXY,
  renderElliottWXYXZ,
  renderCyclicLines,
  renderTimeCycles,
  renderSineLine,
} from './patterns';

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
  curve: renderCurve,
  'double-curve': renderDoubleCurve,

  // Channels family
  'parallel-channel': renderParallelChannel,
  pitchfork: renderPitchfork,
  'gann-fan': renderGannFan,

  // Fibonacci family
  fibonacci: renderFibonacci,
  'fibonacci-extension': renderFibonacciExtension,

  // Advanced Fibonacci family (P2)
  'fib-channel': renderFibChannel,
  'fib-timezone': renderFibTimezone,
  'fib-circles': renderFibCircles,
  'fib-speed-fan': renderFibSpeedFan,
  'fib-spiral': renderFibSpiral,
  'fib-wedge': renderFibWedge,
  pitchfan: renderPitchfan,

  // Advanced Gann / Pitchfork family (P2)
  'gann-box': renderGannBox,
  'gann-square': renderGannSquare,
  'gann-square-fixed': renderGannSquareFixed,
  'pitchfork-schiff': renderPitchforkSchiff,
  'pitchfork-modified': renderPitchforkModified,
  'pitchfork-inside': renderPitchforkInside,

  // Freehand family
  brush: renderBrush,
  highlighter: renderHighlighter,

  // Annotations family
  text: renderTextOrNote,
  note: renderTextOrNote,
  measure: renderMeasure,

  // Emoji / icon markers
  emoji: renderEmoji,
  sticker: renderSticker,
  icon: renderIcon,

  // Annotation markers
  callout: renderCallout,
  comment: renderComment,
  'price-label': renderPriceLabel,
  signpost: renderSignpost,
  flag: renderFlag,
  'arrow-up': renderArrowUp,
  'arrow-down': renderArrowDown,
  'arrow-left': renderArrowLeft,
  'arrow-right': renderArrowRight,
  // Anchored annotations
  'anchored-text': renderAnchoredText,
  'anchored-note': renderAnchoredNote,
  'price-note': renderPriceNote,
  'arrow-marker': renderArrowMarker,

  // Position / Range tools (P7)
  'long-position': renderLongPosition,
  'short-position': renderShortPosition,
  'price-range': renderPriceRange,
  'date-range': renderDateRange,
  'date-price-range': renderDatePriceRange,
  // Projection tools (Position group)
  forecast: renderForecast,
  projection: renderProjection,
  'bars-pattern': renderBarsPattern,
  'ghost-feed': renderGhostFeed,

  // Pattern tools (P6) — Harmonic
  xabcd: renderXABCD,
  cypher: renderCypher,
  abcd: renderABCD,
  'three-drives': renderThreeDrives,

  // Pattern tools (P6) — Chart Patterns
  'head-shoulders': renderHeadShoulders,
  'triangle-pattern': renderTrianglePattern,

  // Pattern tools (P6) — Elliott Wave
  'elliott-impulse': renderElliottImpulse,
  'elliott-correction': renderElliottCorrection,
  'elliott-triangle': renderElliottTriangle,
  'elliott-wxy': renderElliottWXY,
  'elliott-wxyxz': renderElliottWXYXZ,

  // Pattern tools (P6) — Cycles
  'cyclic-lines': renderCyclicLines,
  'time-cycles': renderTimeCycles,
  'sine-line': renderSineLine,

  // cursor and cross have no render — intentionally omitted (Partial allows this)
};
