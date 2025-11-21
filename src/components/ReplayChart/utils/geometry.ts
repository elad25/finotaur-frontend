// utils/geometry.ts

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * ===================================
 * DISTANCE CALCULATIONS
 * ===================================
 */

/**
 * Calculate distance between two points
 */
export const pointDistance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate distance from point to line segment
 */
export const pointToLineDistance = (
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;

  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate distance from point to circle edge
 */
export const pointToCircleDistance = (
  point: Point,
  center: Point,
  radius: number
): number => {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distToCenter = Math.sqrt(dx * dx + dy * dy);
  return Math.abs(distToCenter - radius);
};

/**
 * ===================================
 * INTERSECTION CHECKS
 * ===================================
 */

/**
 * Check if point is inside rectangle
 */
export const isPointInRectangle = (point: Point, rect: Rectangle): boolean => {
  const minX = Math.min(rect.x1, rect.x2);
  const maxX = Math.max(rect.x1, rect.x2);
  const minY = Math.min(rect.y1, rect.y2);
  const maxY = Math.max(rect.y1, rect.y2);

  return (
    point.x >= minX &&
    point.x <= maxX &&
    point.y >= minY &&
    point.y <= maxY
  );
};

/**
 * Check if point is inside circle
 */
export const isPointInCircle = (
  point: Point,
  center: Point,
  radius: number
): boolean => {
  const distance = pointDistance(point, center);
  return distance <= radius;
};

/**
 * Check if two rectangles intersect
 */
export const rectanglesIntersect = (rect1: Rectangle, rect2: Rectangle): boolean => {
  return !(
    rect1.x2 < rect2.x1 ||
    rect1.x1 > rect2.x2 ||
    rect1.y2 < rect2.y1 ||
    rect1.y1 > rect2.y2
  );
};

/**
 * ===================================
 * GEOMETRIC CALCULATIONS
 * ===================================
 */

/**
 * Calculate angle between two points (in radians)
 */
export const calculateAngle = (p1: Point, p2: Point): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

/**
 * Calculate angle in degrees
 */
export const calculateAngleDegrees = (p1: Point, p2: Point): number => {
  return (calculateAngle(p1, p2) * 180) / Math.PI;
};

/**
 * Rotate point around center
 */
export const rotatePoint = (
  point: Point,
  center: Point,
  angle: number
): Point => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
};

/**
 * Get center point of rectangle
 */
export const getRectangleCenter = (rect: Rectangle): Point => {
  return {
    x: (rect.x1 + rect.x2) / 2,
    y: (rect.y1 + rect.y2) / 2,
  };
};

/**
 * Get bounding box of points
 */
export const getBoundingBox = (points: Point[]): Rectangle | null => {
  if (points.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  points.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  return { x1: minX, y1: minY, x2: maxX, y2: maxY };
};

/**
 * Expand rectangle by padding
 */
export const expandRectangle = (
  rect: Rectangle,
  padding: number
): Rectangle => {
  return {
    x1: rect.x1 - padding,
    y1: rect.y1 - padding,
    x2: rect.x2 + padding,
    y2: rect.y2 + padding,
  };
};

/**
 * ===================================
 * LINE CALCULATIONS
 * ===================================
 */

/**
 * Extend line infinitely
 */
export const extendLine = (
  p1: Point,
  p2: Point,
  canvasWidth: number,
  canvasHeight: number
): { start: Point; end: Point } => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  if (dx === 0) {
    // Vertical line
    return {
      start: { x: p1.x, y: 0 },
      end: { x: p1.x, y: canvasHeight },
    };
  }

  if (dy === 0) {
    // Horizontal line
    return {
      start: { x: 0, y: p1.y },
      end: { x: canvasWidth, y: p1.y },
    };
  }

  // Calculate line equation: y = mx + b
  const slope = dy / dx;
  const intercept = p1.y - slope * p1.x;

  // Find intersections with canvas edges
  const points: Point[] = [];

  // Left edge (x = 0)
  const yLeft = intercept;
  if (yLeft >= 0 && yLeft <= canvasHeight) {
    points.push({ x: 0, y: yLeft });
  }

  // Right edge (x = canvasWidth)
  const yRight = slope * canvasWidth + intercept;
  if (yRight >= 0 && yRight <= canvasHeight) {
    points.push({ x: canvasWidth, y: yRight });
  }

  // Top edge (y = 0)
  const xTop = -intercept / slope;
  if (xTop >= 0 && xTop <= canvasWidth) {
    points.push({ x: xTop, y: 0 });
  }

  // Bottom edge (y = canvasHeight)
  const xBottom = (canvasHeight - intercept) / slope;
  if (xBottom >= 0 && xBottom <= canvasWidth) {
    points.push({ x: xBottom, y: canvasHeight });
  }

  // Return first two intersection points
  if (points.length >= 2) {
    return { start: points[0], end: points[1] };
  }

  // Fallback to original points
  return { start: p1, end: p2 };
};

/**
 * ===================================
 * FIBONACCI LEVELS
 * ===================================
 */

export const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/**
 * Calculate Fibonacci retracement levels
 */
export const calculateFibonacciLevels = (
  startPrice: number,
  endPrice: number
): Array<{ level: number; price: number; label: string }> => {
  const diff = endPrice - startPrice;

  return FIBONACCI_LEVELS.map(level => ({
    level,
    price: startPrice + diff * level,
    label: `${(level * 100).toFixed(1)}%`,
  }));
};

/**
 * ===================================
 * SNAP TO GRID
 * ===================================
 */

/**
 * Snap point to grid
 */
export const snapToGrid = (point: Point, gridSize: number): Point => {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
};

/**
 * Snap value to nearest
 */
export const snapToNearest = (value: number, step: number): number => {
  return Math.round(value / step) * step;
};