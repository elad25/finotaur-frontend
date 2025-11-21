// hooks/useDrawings.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Drawing, DrawingType, DrawingPoint, DrawingStyle, Theme } from '../types';
import { DrawingEngine } from '../drawings/DrawingEngine';

// ✅ Export interfaces
export interface UseDrawingsOptions {
  symbol: string;
  theme: Theme;
  initialDrawings?: Drawing[];
  onDrawingsChange?: (drawings: Drawing[]) => void;
  autoSave?: boolean;
}

export interface UseDrawingsReturn {
  drawings: Drawing[];
  activeDrawing: Drawing | null;
  selectedDrawing: Drawing | null;
  currentTool: DrawingType | 'cursor' | 'cross';
  canUndo: boolean;
  canRedo: boolean;
  setCurrentTool: (tool: DrawingType | 'cursor' | 'cross') => void;
  startDrawing: (point: DrawingPoint) => void;
  updateDrawing: (point: DrawingPoint) => void;
  finishDrawing: () => Drawing | null;
  cancelDrawing: () => void;
  selectDrawing: (point: { x: number; y: number }, threshold?: number) => Drawing | null;
  deselectAll: () => void;
  deleteSelected: () => boolean;
  deleteById: (id: string) => boolean;
  deleteAll: () => void;
  lockSelected: () => boolean;
  toggleVisibility: () => void;
  updateStyle: (id: string, style: Partial<DrawingStyle>) => boolean;
  undo: () => boolean;
  redo: () => boolean;
  bringToFront: (id: string) => boolean;
  sendToBack: (id: string) => boolean;
  saveDrawings: () => void;
  loadDrawings: () => boolean;
}

/**
 * ===================================
 * USE DRAWINGS HOOK
 * Manages drawing state and operations
 * ===================================
 */
export const useDrawings = ({
  symbol,
  theme,
  initialDrawings = [],
  onDrawingsChange,
  autoSave = true,
}: UseDrawingsOptions): UseDrawingsReturn => {
  const engineRef = useRef<DrawingEngine | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>(initialDrawings);
  const [activeDrawing, setActiveDrawing] = useState<Drawing | null>(null);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [currentTool, setCurrentToolState] = useState<DrawingType | 'cursor' | 'cross'>('cursor');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize engine
  useEffect(() => {
    engineRef.current = new DrawingEngine(initialDrawings, theme);
    
    // Load saved drawings for this symbol
    if (autoSave) {
      engineRef.current.loadDrawings(symbol);
      setDrawings([...engineRef.current.getDrawings()]);
    }

    return () => {
      if (autoSave && engineRef.current) {
        engineRef.current.saveDrawings(symbol);
      }
    };
  }, [symbol, theme, autoSave]);

  // Update theme
  useEffect(() => {
    engineRef.current?.setTheme(theme);
  }, [theme]);

  // Sync drawings state
  const syncDrawings = useCallback(() => {
    if (engineRef.current) {
      const newDrawings = engineRef.current.getDrawings();
      setDrawings(newDrawings);
      setCanUndo(engineRef.current.canUndo());
      setCanRedo(engineRef.current.canRedo());
      
      if (onDrawingsChange) {
        onDrawingsChange(newDrawings);
      }

      if (autoSave) {
        engineRef.current.saveDrawings(symbol);
      }
    }
  }, [onDrawingsChange, autoSave, symbol]);

  const setCurrentTool = useCallback((tool: DrawingType | 'cursor' | 'cross') => {
    engineRef.current?.setCurrentTool(tool);
    setCurrentToolState(tool);
  }, []);

  const startDrawing = useCallback((point: DrawingPoint) => {
    engineRef.current?.startDrawing(point);
    setActiveDrawing(engineRef.current?.getActiveDrawing() || null);
  }, []);

  const updateDrawing = useCallback((point: DrawingPoint) => {
    engineRef.current?.updateDrawing(point);
    setActiveDrawing(engineRef.current?.getActiveDrawing() || null);
  }, []);

  const finishDrawing = useCallback(() => {
    const result = engineRef.current?.finishDrawing() || null;
    setActiveDrawing(null);
    syncDrawings();
    return result;
  }, [syncDrawings]);

  const cancelDrawing = useCallback(() => {
    engineRef.current?.cancelDrawing();
    setActiveDrawing(null);
  }, []);

  const selectDrawing = useCallback((point: { x: number; y: number }, threshold?: number) => {
    const result = engineRef.current?.selectDrawing(point, threshold) || null;
    setSelectedDrawing(result);
    syncDrawings();
    return result;
  }, [syncDrawings]);

  const deselectAll = useCallback(() => {
    engineRef.current?.deselectAll();
    setSelectedDrawing(null);
    syncDrawings();
  }, [syncDrawings]);

  const deleteSelected = useCallback(() => {
    const result = engineRef.current?.deleteSelected() || false;
    if (result) {
      setSelectedDrawing(null);
      syncDrawings();
    }
    return result;
  }, [syncDrawings]);

  const deleteById = useCallback((id: string) => {
    const result = engineRef.current?.deleteById(id) || false;
    if (result) {
      syncDrawings();
    }
    return result;
  }, [syncDrawings]);

  const deleteAll = useCallback(() => {
    engineRef.current?.deleteAll();
    setSelectedDrawing(null);
    syncDrawings();
  }, [syncDrawings]);

  const lockSelected = useCallback(() => {
    const result = engineRef.current?.lockSelected() || false;
    if (result) {
      syncDrawings();
    }
    return result;
  }, [syncDrawings]);

  const toggleVisibility = useCallback(() => {
    engineRef.current?.toggleVisibility();
    syncDrawings();
  }, [syncDrawings]);

  const updateStyle = useCallback((id: string, style: Partial<DrawingStyle>) => {
    const result = engineRef.current?.updateDrawingStyle(id, style) || false;
    if (result) {
      syncDrawings();
    }
    return result;
  }, [syncDrawings]);

  const undo = useCallback(() => {
    const result = engineRef.current?.undo() || false;
    if (result) {
      syncDrawings();
    }
    return result;
  }, [syncDrawings]);

  const redo = useCallback(() => {
    const result = engineRef.current?.redo() || false;
    if (result) {
      syncDrawings();
    }
    return result;
  }, [syncDrawings]);

  const bringToFront = useCallback((id: string) => {
    const result = engineRef.current?.bringToFront(id) || false;
    if (result) {
      syncDrawings();
    }
    return result;
  }, [syncDrawings]);

  const sendToBack = useCallback((id: string) => {
    const result = engineRef.current?.sendToBack(id) || false;
    if (result) {
      syncDrawings();
    }
    return result;
  }, [syncDrawings]);

  const saveDrawings = useCallback(() => {
    engineRef.current?.saveDrawings(symbol);
  }, [symbol]);

  const loadDrawings = useCallback(() => {
    const result = engineRef.current?.loadDrawings(symbol) || false;
    if (result) {
      syncDrawings();
    }
    return result;
  }, [symbol, syncDrawings]);

  return {
    drawings,
    activeDrawing,
    selectedDrawing,
    currentTool,
    canUndo,
    canRedo,
    setCurrentTool,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    selectDrawing,
    deselectAll,
    deleteSelected,
    deleteById,
    deleteAll,
    lockSelected,
    toggleVisibility,
    updateStyle,
    undo,
    redo,
    bringToFront,
    sendToBack,
    saveDrawings,
    loadDrawings,
  };
};