// ui/DrawingToolbar.tsx
import React from 'react';
import {
  MousePointer2,
  TrendingUp,
  Minus,
  MoveVertical,
  GitCommit,
  Square,
  Circle,
  Pencil,
  Type,
  Ruler,
  Percent,
  Trash2,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';
import { Theme, DrawingType } from '../types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// ✅ Export interface
export interface DrawingToolbarProps {
  currentTool: DrawingType | 'cursor' | 'cross';
  hasSelection: boolean;
  isSelectionLocked: boolean;
  canUndo: boolean;
  canRedo: boolean;
  theme: Theme;
  onToolSelect: (tool: DrawingType | 'cursor' | 'cross') => void;
  onDeleteSelected?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onLockToggle?: () => void;
  onVisibilityToggle?: () => void;
  className?: string;
}

const TOOLS: Array<{
  id: DrawingType | 'cursor' | 'cross';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
}> = [
  { id: 'cursor', icon: MousePointer2, label: 'Select', shortcut: 'C' },
  { id: 'cross', icon: MousePointer2, label: 'Crosshair', shortcut: 'X' },
  { id: 'trendline', icon: TrendingUp, label: 'Trend Line', shortcut: 'T' },
  { id: 'horizontal', icon: Minus, label: 'Horizontal Line', shortcut: 'H' },
  { id: 'vertical', icon: MoveVertical, label: 'Vertical Line', shortcut: 'V' },
  { id: 'ray', icon: GitCommit, label: 'Ray', shortcut: 'R' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'brush', icon: Pencil, label: 'Brush' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'measure', icon: Ruler, label: 'Measure' },
  { id: 'fibonacci', icon: Percent, label: 'Fibonacci', shortcut: 'F' },
];

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  currentTool,
  hasSelection,
  isSelectionLocked,
  canUndo,
  canRedo,
  theme,
  onToolSelect,
  onDeleteSelected,
  onUndo,
  onRedo,
  onLockToggle,
  onVisibilityToggle,
  className = '',
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'absolute top-4 left-4 z-20 backdrop-blur-md rounded-lg border p-2 flex flex-col gap-1',
        isDark
          ? 'bg-black/80 border-[#C9A646]/30'
          : 'bg-white/80 border-gray-200',
        className
      )}
    >
      {TOOLS.map((tool, index) => (
        <React.Fragment key={tool.id}>
          {(index === 2 || index === 6 || index === 9) && (
            <Separator
              className={cn(
                'my-1',
                isDark ? 'bg-[#C9A646]/20' : 'bg-gray-200'
              )}
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              'h-9 w-9 p-0 group relative',
              currentTool === tool.id
                ? isDark
                  ? 'bg-[#C9A646]/20 text-[#C9A646]'
                  : 'bg-blue-100 text-blue-600'
                : isDark
                ? 'hover:bg-[#C9A646]/10 text-[#C9A646]'
                : 'hover:bg-gray-100 text-gray-700'
            )}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
          >
            <tool.icon className="h-4 w-4" />
            
            <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              {tool.label}
              {tool.shortcut && (
                <span className="ml-2 opacity-60">{tool.shortcut}</span>
              )}
            </div>
          </Button>
        </React.Fragment>
      ))}

      <Separator
        className={cn('my-1', isDark ? 'bg-[#C9A646]/20' : 'bg-gray-200')}
      />

      <Button
        size="sm"
        variant="ghost"
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          'h-9 w-9 p-0',
          isDark
            ? 'hover:bg-[#C9A646]/10 text-[#C9A646] disabled:opacity-30'
            : 'hover:bg-gray-100 disabled:opacity-30'
        )}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(
          'h-9 w-9 p-0',
          isDark
            ? 'hover:bg-[#C9A646]/10 text-[#C9A646] disabled:opacity-30'
            : 'hover:bg-gray-100 disabled:opacity-30'
        )}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      {hasSelection && (
        <>
          <Separator
            className={cn('my-1', isDark ? 'bg-[#C9A646]/20' : 'bg-gray-200')}
          />

          <Button
            size="sm"
            variant="ghost"
            onClick={onLockToggle}
            className={cn(
              'h-9 w-9 p-0',
              isDark
                ? 'hover:bg-[#C9A646]/10 text-[#C9A646]'
                : 'hover:bg-gray-100'
            )}
            title={isSelectionLocked ? 'Unlock' : 'Lock'}
          >
            {isSelectionLocked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onDeleteSelected}
            className={cn(
              'h-9 w-9 p-0',
              isDark
                ? 'hover:bg-red-500/10 text-red-500'
                : 'hover:bg-red-50 text-red-600'
            )}
            title="Delete (Del)"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}

      <Separator
        className={cn('my-1', isDark ? 'bg-[#C9A646]/20' : 'bg-gray-200')}
      />

      <Button
        size="sm"
        variant="ghost"
        onClick={onVisibilityToggle}
        className={cn(
          'h-9 w-9 p-0',
          isDark
            ? 'hover:bg-[#C9A646]/10 text-[#C9A646]'
            : 'hover:bg-gray-100'
        )}
        title="Toggle All Drawings"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
};