// drawings/DrawingEngine.ts - FIXED VERSION
// ✅ Fixed: colors.default → colors.primary
// ✅ Fixed: lineStyle: 0 → lineStyle: 'solid'

import { Drawing, DrawingPoint, DrawingType, DrawingStyle, Theme } from '../types';
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
    this.activeDrawing = {
      id: this.generateId(),
      type: this.currentTool as DrawingType,
      points: [point],
      style: {
        color: colors.primary,
        lineWidth: 2,
        lineStyle: 'solid',
      },
      visible: true,
      locked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  updateDrawing(point: DrawingPoint): void {
    if (!this.activeDrawing) return;

    const { type } = this.activeDrawing;

    switch (type) {
      case 'brush':
        // For brush, keep adding points
        this.activeDrawing.points.push(point);
        break;

      case 'horizontal':
        // Horizontal line only updates price
        this.activeDrawing.points = [
          { time: this.activeDrawing.points[0].time, price: point.price }
        ];
        break;

      case 'vertical':
        // Vertical line only updates time
        this.activeDrawing.points = [
          { time: point.time, price: this.activeDrawing.points[0].price }
        ];
        break;

      default:
        // For other tools, update the second point
        if (this.activeDrawing.points.length === 1) {
          this.activeDrawing.points.push(point);
        } else {
          this.activeDrawing.points[1] = point;
        }
        break;
    }

    this.activeDrawing.updatedAt = Date.now();
  }

  finishDrawing(): Drawing | null {
    if (!this.activeDrawing) return null;

    const { type, points } = this.activeDrawing;

    // Validate minimum points
    if (type === 'brush' && points.length < 2) {
      this.activeDrawing = null;
      return null;
    }

    if (type !== 'brush' && type !== 'horizontal' && type !== 'vertical' && points.length < 2) {
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
      case 'measure':
        const dx = point.x - points[0].time;
        const dy = point.y - points[0].price;
        return Math.sqrt(dx * dx + dy * dy);

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