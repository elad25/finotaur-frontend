// drawings/DrawingEngine.ts
// ✅ Fixed: colors.default → colors.primary
// ✅ Fixed: lineStyle: 0 → lineStyle: 'solid'
// ✅ Fixed: Drawing object now includes all required fields (tool, color, lineWidth, timestamp)

import { Drawing, DrawingPoint, DrawingType, DrawingStyle, Theme, POINTS_REQUIRED } from '../types';
import { DRAWING_COLORS } from '../constants';
import {
  pointToLineDistance,
  pointToCircleDistance,
  isPointInRectangle,
  Point,
  Rectangle,
} from '../utils/geometry';

interface HistoryAction {
  type: 'add' | 'edit' | 'delete';
  drawing: Drawing;
  previousState?: Drawing;
}

/**
 * ===================================
 * DRAWING ENGINE
 * Manages drawings with layer system, selection, and history
 * ===================================
 */
export class DrawingEngine {
  private drawings: Drawing[] = [];
  private activeDrawing: Drawing | null = null;
  private selectedDrawing: Drawing | null = null;
  private currentTool: DrawingType | 'cursor' | 'cross' = 'cursor';
  private theme: Theme = 'dark';

  // History
  private historyStack: HistoryAction[] = [];
  private historyIndex: number = -1;
  private maxHistorySize: number = 50;

  // Drag state
  private isDragging: boolean = false;
  private draggedDrawing: Drawing | null = null;
  private draggedPointIndex: number = -1;
  private dragOffset: Point = { x: 0, y: 0 };

  constructor(initialDrawings: Drawing[] = [], theme: Theme = 'dark') {
    this.drawings = initialDrawings;
    this.theme = theme;
  }

  // ===================================
  // GETTERS & SETTERS
  // ===================================

  getDrawings(): Drawing[] {
    return [...this.drawings];
  }

  setDrawings(drawings: Drawing[]): void {
    this.drawings = drawings;
  }

  getVisibleDrawings(): Drawing[] {
    return this.drawings.filter(d => d.visible);
  }

  getDrawingById(id: string): Drawing | undefined {
    return this.drawings.find(d => d.id === id);
  }

  setCurrentTool(tool: DrawingType | 'cursor' | 'cross'): void {
    this.currentTool = tool;
    this.activeDrawing = null;
  }

  getCurrentTool(): DrawingType | 'cursor' | 'cross' {
    return this.currentTool;
  }

  getSelectedDrawing(): Drawing | null {
    return this.selectedDrawing;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
  }

  getActiveDrawing(): Drawing | null {
    return this.activeDrawing;
  }

  // ===================================
  // DRAWING CREATION
  // ===================================

  startDrawing(point: DrawingPoint): void {
    if (this.currentTool === 'cursor' || this.currentTool === 'cross') return;

    const colors = this.theme === 'dark' ? DRAWING_COLORS.dark : DRAWING_COLORS.light;

    // 🔥 FIX: colors.default → colors.primary
    // 🔥 FIX: lineStyle: 0 → lineStyle: 'solid'
    // 🔥 FIX: Added required Drawing fields: tool, color, lineWidth, timestamp
    this.activeDrawing = {
      id: this.generateId(),
      type: this.currentTool as DrawingType,
      tool: this.currentTool as DrawingType,
      points: [point],
      style: {
        color: colors.primary,
        lineWidth: 2,
        lineStyle: 'solid',
      },
      color: colors.primary,
      lineWidth: 2,
      visible: true,
      locked: false,
      timestamp: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  updateDrawing(point: DrawingPoint): void {
    if (!this.activeDrawing) return;

    const { type } = this.activeDrawing;

    switch (type) {
      case 'brush':
      case 'highlighter':
        // Freehand tools: keep appending every move point.
        this.activeDrawing.points.push(point);
        break;

      case 'horizontal':
        // Horizontal line only updates price; time is locked to the first click.
        this.activeDrawing.points = [
          { time: this.activeDrawing.points[0].time, price: point.price },
        ];
        break;

      case 'vertical':
        // Vertical line only updates time; price is locked to the first click.
        this.activeDrawing.points = [
          { time: point.time, price: this.activeDrawing.points[0].price },
        ];
        break;

      default: {
        // General N-point tools: the last slot is always the live "preview" point
        // that tracks the cursor. If the array already has a preview slot (length ≥ 2
        // for 2-point tools, or after commitPoint() added one for 3+-point tools),
        // overwrite that last slot. If there is only the first committed anchor (just
        // started), append so the renderer has two points to draw the rubber-band.
        const required = POINTS_REQUIRED[type] ?? 2;
        if (required === 0) {
          // Should not reach here for non-freehand tools, but guard gracefully.
          this.activeDrawing.points.push(point);
          break;
        }
        if (this.activeDrawing.points.length <= required) {
          if (this.activeDrawing.points.length === 1) {
            // First mouse-move after startDrawing: append the preview anchor so
            // the renderer always has at least 2 points for a visible rubber-band.
            this.activeDrawing.points.push(point);
          } else {
            // Subsequent moves while still collecting anchors: update the last
            // (in-progress) preview slot in-place.
            this.activeDrawing.points[this.activeDrawing.points.length - 1] = point;
          }
        }
        // If points.length === required, all anchors are committed and finishDrawing()
        // is about to be called by the click loop — nothing to update.
        break;
      }
    }

    this.activeDrawing.updatedAt = Date.now();
  }

  /**
   * Commit the current in-progress (last) point and append a new preview point
   * for the next anchor. Called by the click loop when the user clicks mid-way
   * through a 3+-point tool (e.g. triangle: click 1→2 commits p1, starts p2).
   */
  commitPoint(point: DrawingPoint): void {
    if (!this.activeDrawing) return;
    const { type } = this.activeDrawing;
    const required = POINTS_REQUIRED[type] ?? 2;
    if (required < 3) return; // Only relevant for 3+-point tools.

    // Lock the current last point to the clicked position, then add a new preview.
    const last = this.activeDrawing.points.length - 1;
    this.activeDrawing.points[last] = point;
    // Append a duplicate as the new in-progress preview anchor.
    this.activeDrawing.points.push({ ...point });
    this.activeDrawing.updatedAt = Date.now();
  }

  finishDrawing(): Drawing | null {
    if (!this.activeDrawing) return null;

    const { type, points } = this.activeDrawing;
    const required = POINTS_REQUIRED[type] ?? 2;

    // Validate minimum points using the POINTS_REQUIRED map.
    if (required === 0) {
      // Freehand tools (brush, highlighter) need at least 2 recorded positions.
      if (points.length < 2) {
        this.activeDrawing = null;
        return null;
      }
    } else if (points.length < required) {
      // Fixed-anchor tools must have all required anchor points committed.
      this.activeDrawing = null;
      return null;
    }

    // Add to drawings
    this.drawings.push(this.activeDrawing);

    // Add to history
    this.addToHistory({
      type: 'add',
      drawing: { ...this.activeDrawing },
    });

    const completed = this.activeDrawing;
    this.activeDrawing = null;

    return completed;
  }

  cancelDrawing(): void {
    this.activeDrawing = null;
  }

  // ===================================
  // SELECTION
  // ===================================

  selectDrawing(point: Point, threshold: number = 10): Drawing | null {
    // Find closest drawing to the point
    let closestDrawing: Drawing | null = null;
    let minDistance = threshold;

    for (const drawing of this.getVisibleDrawings()) {
      if (drawing.locked) continue;

      const distance = this.getDistanceToDrawing(drawing, point);
      if (distance < minDistance) {
        minDistance = distance;
        closestDrawing = drawing;
      }
    }

    // Update selection
    this.drawings.forEach(d => (d.selected = false));
    if (closestDrawing) {
      closestDrawing.selected = true;
    }
    this.selectedDrawing = closestDrawing;

    return closestDrawing;
  }

  deselectAll(): void {
    this.drawings.forEach(d => (d.selected = false));
    this.selectedDrawing = null;
  }

  selectById(id: string): boolean {
    const drawing = this.drawings.find(d => d.id === id);
    if (!drawing) return false;

    this.drawings.forEach(d => (d.selected = false));
    drawing.selected = true;
    this.selectedDrawing = drawing;

    return true;
  }

  // ===================================
  // MODIFICATION
  // ===================================

  deleteSelected(): boolean {
    if (!this.selectedDrawing) return false;

    const index = this.drawings.indexOf(this.selectedDrawing);
    if (index === -1) return false;

    // Add to history
    this.addToHistory({
      type: 'delete',
      drawing: { ...this.selectedDrawing },
    });

    this.drawings.splice(index, 1);
    this.selectedDrawing = null;

    return true;
  }

  deleteById(id: string): boolean {
    const drawing = this.drawings.find(d => d.id === id);
    if (!drawing) return false;

    const index = this.drawings.indexOf(drawing);
    if (index === -1) return false;

    // Add to history
    this.addToHistory({
      type: 'delete',
      drawing: { ...drawing },
    });

    this.drawings.splice(index, 1);
    
    if (this.selectedDrawing?.id === id) {
      this.selectedDrawing = null;
    }

    return true;
  }

  deleteAll(): void {
    // Store all for potential undo
    const allDrawings = [...this.drawings];
    allDrawings.forEach(drawing => {
      this.addToHistory({
        type: 'delete',
        drawing: { ...drawing },
      });
    });

    this.drawings = [];
    this.selectedDrawing = null;
  }

  lockSelected(): boolean {
    if (!this.selectedDrawing) return false;
    
    const previousState = { ...this.selectedDrawing };
    this.selectedDrawing.locked = !this.selectedDrawing.locked;
    
    this.addToHistory({
      type: 'edit',
      drawing: { ...this.selectedDrawing },
      previousState,
    });

    return true;
  }

  toggleVisibility(): void {
    const allHidden = this.drawings.every(d => !d.visible);
    this.drawings.forEach(d => (d.visible = !allHidden));
  }

  updateDrawingStyle(id: string, style: Partial<DrawingStyle>): boolean {
    const drawing = this.drawings.find(d => d.id === id);
    if (!drawing) return false;

    const previousState = { ...drawing };
    drawing.style = { ...drawing.style, ...style };
    drawing.updatedAt = Date.now();

    this.addToHistory({
      type: 'edit',
      drawing: { ...drawing },
      previousState,
    });

    return true;
  }

  /**
   * Update top-level fields on a drawing (text, emoji, fontSize, fontWeight,
   * textAlign, iconName, etc.). Style sub-fields go through updateDrawingStyle.
   */
  updateDrawingData(id: string, patch: Partial<Drawing>): boolean {
    const drawing = this.drawings.find(d => d.id === id);
    if (!drawing) return false;

    const previousState = { ...drawing };
    // Apply patch fields, excluding id/type/tool/points which must not change.
    const { id: _id, type: _type, tool: _tool, points: _points, ...safePatch } = patch as Partial<Drawing> & { id?: string; type?: string; tool?: string; points?: unknown };
    Object.assign(drawing, safePatch);
    drawing.updatedAt = Date.now();

    this.addToHistory({
      type: 'edit',
      drawing: { ...drawing },
      previousState,
    });

    return true;
  }

  // ===================================
  // DRAG & DROP
  // ===================================

  startDrag(point: Point, threshold: number = 10): boolean {
    const drawing = this.selectDrawing(point, threshold);
    if (!drawing || drawing.locked) return false;

    this.isDragging = true;
    this.draggedDrawing = drawing;
    
    // Find which point to drag (if near a point)
    this.draggedPointIndex = this.findNearestPoint(drawing, point, threshold);
    
    if (this.draggedPointIndex === -1) {
      // Drag entire drawing
      this.dragOffset = {
        x: point.x - drawing.points[0].time,
        y: point.y - drawing.points[0].price,
      };
    }

    return true;
  }

  updateDrag(point: Point): boolean {
    if (!this.isDragging || !this.draggedDrawing) return false;

    const previousState = { ...this.draggedDrawing };

    if (this.draggedPointIndex !== -1) {
      // Drag specific point
      this.draggedDrawing.points[this.draggedPointIndex] = {
        time: point.x,
        price: point.y,
      };
    } else {
      // Drag entire drawing
      const deltaX = point.x - this.dragOffset.x - this.draggedDrawing.points[0].time;
      const deltaY = point.y - this.dragOffset.y - this.draggedDrawing.points[0].price;

      this.draggedDrawing.points = this.draggedDrawing.points.map(p => ({
        time: p.time + deltaX,
        price: p.price + deltaY,
      }));
    }

    this.draggedDrawing.updatedAt = Date.now();

    return true;
  }

  endDrag(): boolean {
    if (!this.isDragging) return false;

    if (this.draggedDrawing) {
      this.addToHistory({
        type: 'edit',
        drawing: { ...this.draggedDrawing },
      });
    }

    this.isDragging = false;
    this.draggedDrawing = null;
    this.draggedPointIndex = -1;

    return true;
  }

  // ===================================
  // DISTANCE CALCULATIONS
  // ===================================

  private getDistanceToDrawing(drawing: Drawing, point: Point): number {
    const { type, points } = drawing;

    switch (type) {
      case 'trendline':
      case 'ray':
      case 'extended':
        if (points.length < 2) return Infinity;
        return pointToLineDistance(
          point,
          { x: points[0].time, y: points[0].price },
          { x: points[1].time, y: points[1].price }
        );

      case 'horizontal':
        return Math.abs(point.y - points[0].price);

      case 'vertical':
        return Math.abs(point.x - points[0].time);

      case 'rectangle':
        if (points.length < 2) return Infinity;
        const rect: Rectangle = {
          x1: points[0].time,
          y1: points[0].price,
          x2: points[1].time,
          y2: points[1].price,
        };
        if (isPointInRectangle(point, rect)) return 0;
        
        // Distance to nearest edge
        const distances = [
          Math.abs(point.x - rect.x1),
          Math.abs(point.x - rect.x2),
          Math.abs(point.y - rect.y1),
          Math.abs(point.y - rect.y2),
        ];
        return Math.min(...distances);

      case 'circle':
        if (points.length < 2) return Infinity;
        const center = { x: points[0].time, y: points[0].price };
        const radius = Math.sqrt(
          Math.pow(points[1].time - points[0].time, 2) +
            Math.pow(points[1].price - points[0].price, 2)
        );
        return pointToCircleDistance(point, center, radius);

      case 'brush':
        let minDist = Infinity;
        for (let i = 0; i < points.length - 1; i++) {
          const dist = pointToLineDistance(
            point,
            { x: points[i].time, y: points[i].price },
            { x: points[i + 1].time, y: points[i + 1].price }
          );
          minDist = Math.min(minDist, dist);
        }
        return minDist;

      case 'text':
      case 'note':
      case 'measure': {
        const dx = point.x - points[0].time;
        const dy = point.y - points[0].price;
        return Math.sqrt(dx * dx + dy * dy);
      }

      // Emoji / icon markers — 1 point, Euclidean distance to anchor.
      case 'emoji':
      case 'sticker':
      case 'icon':
      // Annotation markers — 1 point each.
      case 'comment':
      case 'price-label':
      case 'signpost':
      case 'flag':
      case 'arrow-up':
      case 'arrow-down':
      case 'arrow-left':
      case 'arrow-right': {
        const dx = point.x - points[0].time;
        const dy = point.y - points[0].price;
        return Math.sqrt(dx * dx + dy * dy);
      }

      // callout: 2-point tool — minimum distance to either anchor.
      case 'callout': {
        let minCalloutDist = Infinity;
        for (const p of points) {
          const adx = point.x - p.time;
          const ady = point.y - p.price;
          const dist = Math.sqrt(adx * adx + ady * ady);
          if (dist < minCalloutDist) minCalloutDist = dist;
        }
        return minCalloutDist;
      }

      // fibonacci: 2-point tool — distance to the segment between anchor points.
      case 'fibonacci':
        if (points.length < 2) return Infinity;
        return pointToLineDistance(
          point,
          { x: points[0].time, y: points[0].price },
          { x: points[1].time, y: points[1].price }
        );

      // New line-segment tools: reuse the existing line-distance helper.
      case 'trend-angle':
      case 'arrow':
      case 'horizontal-ray':
        if (points.length < 2) return Infinity;
        return pointToLineDistance(
          point,
          { x: points[0].time, y: points[0].price },
          { x: points[1].time, y: points[1].price }
        );

      // cross-line: distance to the closer of its horizontal or vertical axis.
      case 'cross-line':
        if (points.length < 1) return Infinity;
        return Math.min(
          Math.abs(point.y - points[0].price),
          Math.abs(point.x - points[0].time)
        );

      // Position tools (3-point): min distance to any of the 3 anchors.
      case 'long-position':
      case 'short-position': {
        let minPosDist = Infinity;
        for (const p of points) {
          const adx = point.x - p.time;
          const ady = point.y - p.price;
          const dist = Math.sqrt(adx * adx + ady * ady);
          if (dist < minPosDist) minPosDist = dist;
        }
        return minPosDist;
      }

      // Range tools (2-point): min distance to either anchor.
      case 'price-range':
      case 'date-range':
      case 'date-price-range': {
        let minRangeDist = Infinity;
        for (const p of points) {
          const adx = point.x - p.time;
          const ady = point.y - p.price;
          const dist = Math.sqrt(adx * adx + ady * ady);
          if (dist < minRangeDist) minRangeDist = dist;
        }
        return minRangeDist;
      }

      // Multi-anchor tools: distance to nearest anchor point (acceptable for selection).
      case 'parallel-channel':
      case 'rotated-rectangle':
      case 'triangle':
      case 'arc':
      case 'pitchfork':
      case 'fibonacci-extension':
      case 'ellipse': {
        let minAnchorDist = Infinity;
        for (const p of points) {
          const adx = point.x - p.time;
          const ady = point.y - p.price;
          const dist = Math.sqrt(adx * adx + ady * ady);
          if (dist < minAnchorDist) minAnchorDist = dist;
        }
        return minAnchorDist;
      }

      // highlighter: same as brush — distance to nearest segment.
      case 'highlighter': {
        let minSegDist = Infinity;
        for (let i = 0; i < points.length - 1; i++) {
          const dist = pointToLineDistance(
            point,
            { x: points[i].time, y: points[i].price },
            { x: points[i + 1].time, y: points[i + 1].price }
          );
          minSegDist = Math.min(minSegDist, dist);
        }
        return minSegDist;
      }

      // gann-fan: distance to first anchor point (fan origin).
      case 'gann-fan': {
        if (points.length < 1) return Infinity;
        const gdx = point.x - points[0].time;
        const gdy = point.y - points[0].price;
        return Math.sqrt(gdx * gdx + gdy * gdy);
      }

      // Advanced 2-pt fib/gann tools (P2): min distance to either anchor.
      case 'fib-timezone':
      case 'fib-circles':
      case 'fib-speed-fan':
      case 'fib-spiral':
      case 'gann-box':
      case 'gann-square':
      case 'gann-square-fixed': {
        let min2Dist = Infinity;
        for (const p of points) {
          const adx = point.x - p.time;
          const ady = point.y - p.price;
          const dist = Math.sqrt(adx * adx + ady * ady);
          if (dist < min2Dist) min2Dist = dist;
        }
        return min2Dist;
      }

      // Advanced 3-pt fib/gann/pitchfork tools (P2): min distance to any of 3 anchors.
      case 'fib-channel':
      case 'fib-wedge':
      case 'pitchfan':
      case 'pitchfork-schiff':
      case 'pitchfork-modified':
      case 'pitchfork-inside': {
        let min3Dist = Infinity;
        for (const p of points) {
          const adx = point.x - p.time;
          const ady = point.y - p.price;
          const dist = Math.sqrt(adx * adx + ady * ady);
          if (dist < min3Dist) min3Dist = dist;
        }
        return min3Dist;
      }

      default:
        return Infinity;
    }
  }

  private findNearestPoint(drawing: Drawing, point: Point, threshold: number): number {
    let nearestIndex = -1;
    let minDistance = threshold;

    drawing.points.forEach((p, index) => {
      const dx = point.x - p.time;
      const dy = point.y - p.price;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  // ===================================
  // HISTORY (UNDO/REDO)
  // ===================================

  private addToHistory(action: HistoryAction): void {
    // Remove any actions after current index
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);

    // Add new action
    this.historyStack.push(action);

    // Limit history size
    if (this.historyStack.length > this.maxHistorySize) {
      this.historyStack.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo(): boolean {
    if (this.historyIndex < 0) return false;

    const action = this.historyStack[this.historyIndex];
    this.historyIndex--;

    switch (action.type) {
      case 'add':
        const addIndex = this.drawings.findIndex(d => d.id === action.drawing.id);
        if (addIndex !== -1) {
          this.drawings.splice(addIndex, 1);
        }
        break;

      case 'delete':
        this.drawings.push(action.drawing);
        break;

      case 'edit':
        if (action.previousState) {
          const editIndex = this.drawings.findIndex(d => d.id === action.drawing.id);
          if (editIndex !== -1) {
            this.drawings[editIndex] = action.previousState;
          }
        }
        break;
    }

    return true;
  }

  redo(): boolean {
    if (this.historyIndex >= this.historyStack.length - 1) return false;

    this.historyIndex++;
    const action = this.historyStack[this.historyIndex];

    switch (action.type) {
      case 'add':
        this.drawings.push(action.drawing);
        break;

      case 'delete':
        const deleteIndex = this.drawings.findIndex(d => d.id === action.drawing.id);
        if (deleteIndex !== -1) {
          this.drawings.splice(deleteIndex, 1);
        }
        break;

      case 'edit':
        const editIndex = this.drawings.findIndex(d => d.id === action.drawing.id);
        if (editIndex !== -1) {
          this.drawings[editIndex] = action.drawing;
        }
        break;
    }

    return true;
  }

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.historyStack.length - 1;
  }

  // ===================================
  // LAYERS
  // ===================================

  bringToFront(id: string): boolean {
    const drawing = this.drawings.find(d => d.id === id);
    if (!drawing) return false;

    const index = this.drawings.indexOf(drawing);
    this.drawings.splice(index, 1);
    this.drawings.push(drawing);

    return true;
  }

  sendToBack(id: string): boolean {
    const drawing = this.drawings.find(d => d.id === id);
    if (!drawing) return false;

    const index = this.drawings.indexOf(drawing);
    this.drawings.splice(index, 1);
    this.drawings.unshift(drawing);

    return true;
  }

  // ===================================
  // UTILITIES
  // ===================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getDrawingCount(): number {
    return this.drawings.length;
  }

  getVisibleCount(): number {
    return this.drawings.filter(d => d.visible).length;
  }

  getLockedCount(): number {
    return this.drawings.filter(d => d.locked).length;
  }

  // ===================================
  // EXPORT / IMPORT
  // ===================================

  exportDrawings(): Drawing[] {
    return this.drawings.map(d => ({ ...d }));
  }

  importDrawings(drawings: Drawing[]): void {
    this.drawings = drawings.map(d => ({ ...d }));
    this.selectedDrawing = null;
    this.activeDrawing = null;
  }

  // ===================================
  // PERSISTENCE
  // ===================================

  saveDrawings(symbol: string): void {
    try {
      const key = `finotaur_drawings_${symbol}`;
      localStorage.setItem(key, JSON.stringify(this.exportDrawings()));
    } catch (error) {
      console.error('Failed to save drawings:', error);
    }
  }

  loadDrawings(symbol: string): boolean {
    try {
      const key = `finotaur_drawings_${symbol}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        this.importDrawings(JSON.parse(stored));
        return true;
      }
    } catch (error) {
      console.error('Failed to load drawings:', error);
    }

    return false;
  }

  clearStoredDrawings(symbol: string): void {
    try {
      const key = `finotaur_drawings_${symbol}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear drawings:', error);
    }
  }
}