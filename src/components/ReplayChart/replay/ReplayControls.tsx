// replay/ReplayControls.tsx - CLEAN VERSION WITHOUT STATS
import React, { useMemo } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  Scissors,
  X,
} from 'lucide-react';
import { Theme, ReplaySpeed } from '../types';
import { REPLAY_SPEEDS } from '../constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ReplayControlsProps {
  isPlaying: boolean;
  speed: ReplaySpeed;
  currentIndex: number;
  totalCandles: number;
  progress: number;
  cutPointIndex?: number | null;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
  onProgressChange: (percentage: number) => void;
  onSetCutPoint: (index: number) => void;
  onClearCutPoint?: () => void;
  theme: Theme;
  className?: string;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying,
  speed,
  currentIndex,
  totalCandles,
  progress,
  cutPointIndex,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onJumpToStart,
  onJumpToEnd,
  onSpeedChange,
  onProgressChange,
  onSetCutPoint,
  onClearCutPoint,
  theme,
  className = '',
}) => {
  const isDark = theme === 'dark';

  const cutPointPercentage = useMemo(() => {
    if (cutPointIndex === null || cutPointIndex === undefined) return null;
    return (cutPointIndex / totalCandles) * 100;
  }, [cutPointIndex, totalCandles]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value);
    onProgressChange(percentage);
  };

  const progressDisplay = useMemo(() => {
    return `${currentIndex + 1} / ${totalCandles}`;
  }, [currentIndex, totalCandles]);

  const hasCutPoint = cutPointIndex !== null && cutPointIndex !== undefined;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-1/2 -translate-x-1/2 h-16 border-t backdrop-blur-md flex items-center px-6 gap-4 z-30 rounded-t-xl shadow-2xl transition-all duration-300',
        isDark ? 'bg-[#0A0A0A]/98 border-[#C9A646]/30' : 'bg-white/98 border-gray-200',
        className
      )}
      style={{
        width: '75%',
        maxWidth: '1400px',
        minWidth: '800px',
      }}
    >
      {/* SCISSORS & CUT POINT CONTROLS */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onSetCutPoint(currentIndex)}
          className={cn(
            'h-9 w-9 p-0 transition-all',
            hasCutPoint && (isDark ? 'bg-[#C9A646]/20' : 'bg-blue-100'),
            isDark ? 'hover:bg-[#C9A646]/10 text-[#C9A646]' : 'hover:bg-gray-100'
          )}
          title="Cut at current position (C)"
        >
          <Scissors className="h-4 w-4" />
        </Button>

        {hasCutPoint && onClearCutPoint && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearCutPoint}
            className={cn(
              'h-8 w-8 p-0 transition-all',
              isDark ? 'hover:bg-red-500/10 text-red-500' : 'hover:bg-red-50 text-red-600'
            )}
            title="Clear cut point"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className={cn('h-6 w-px', isDark ? 'bg-[#C9A646]/20' : 'bg-gray-300')} />

      {/* PLAYBACK CONTROLS */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onJumpToStart}
          className={cn(
            'h-9 w-9 p-0',
            isDark ? 'hover:bg-white/10 text-[#C9A646]' : 'hover:bg-gray-100'
          )}
          title="Jump to Start (Home)"
        >
          <ChevronsLeft className="h-5 w-5" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onStepBackward}
          className={cn(
            'h-9 w-9 p-0',
            isDark ? 'hover:bg-white/10 text-[#C9A646]' : 'hover:bg-gray-100'
          )}
          title="Step Backward (←)"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          size="sm"
          onClick={isPlaying ? onPause : onPlay}
          className={cn(
            'h-11 w-11 p-0 rounded-full shadow-lg transition-all hover:scale-105',
            isDark
              ? 'bg-[#C9A646] hover:bg-[#C9A646]/80 text-black'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          )}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onStepForward}
          className={cn(
            'h-9 w-9 p-0',
            isDark ? 'hover:bg-white/10 text-[#C9A646]' : 'hover:bg-gray-100'
          )}
          title="Step Forward (→)"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onJumpToEnd}
          className={cn(
            'h-9 w-9 p-0',
            isDark ? 'hover:bg-white/10 text-[#C9A646]' : 'hover:bg-gray-100'
          )}
          title="Jump to End (End)"
        >
          <ChevronsRight className="h-5 w-5" />
        </Button>
      </div>

      <div className={cn('h-6 w-px', isDark ? 'bg-[#C9A646]/20' : 'bg-gray-300')} />

      {/* PROGRESS BAR WITH CUT POINT INDICATOR */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="relative">
          {cutPointPercentage !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full z-10 pointer-events-none transition-all"
              style={{
                left: `${cutPointPercentage}%`,
                backgroundColor: isDark ? '#C9A646' : '#3b82f6',
              }}
            >
              <div
                className={cn(
                  'absolute -top-2 left-1/2 -translate-x-1/2 rounded-full shadow-lg',
                  'h-3 w-3',
                  isDark ? 'bg-[#C9A646]' : 'bg-blue-600'
                )}
              />
            </div>
          )}

          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleProgressChange}
            className={cn(
              'w-full h-2 rounded-lg appearance-none cursor-pointer transition-all',
              isDark
                ? 'bg-white/10 [&::-webkit-slider-thumb]:bg-[#C9A646]'
                : 'bg-gray-200 [&::-webkit-slider-thumb]:bg-blue-600',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:h-4',
              '[&::-webkit-slider-thumb]:w-4',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:cursor-pointer',
              '[&::-webkit-slider-thumb]:shadow-lg',
              '[&::-webkit-slider-thumb]:transition-transform',
              '[&::-webkit-slider-thumb]:hover:scale-110',
              '[&::-moz-range-thumb]:h-4',
              '[&::-moz-range-thumb]:w-4',
              '[&::-moz-range-thumb]:rounded-full',
              '[&::-moz-range-thumb]:border-0',
              '[&::-moz-range-thumb]:shadow-lg',
              isDark
                ? '[&::-moz-range-thumb]:bg-[#C9A646]'
                : '[&::-moz-range-thumb]:bg-blue-600'
            )}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <span className={cn('font-medium', isDark ? 'text-[#C9A646]/60' : 'text-gray-500')}>
            {progressDisplay}
          </span>
          {hasCutPoint && (
            <span
              className={cn(
                'text-xs font-semibold flex items-center gap-1',
                isDark ? 'text-[#C9A646]' : 'text-blue-600'
              )}
            >
              <Scissors className="h-3 w-3" />
              Cut at #{(cutPointIndex || 0) + 1}
            </span>
          )}
        </div>
      </div>

      <div className={cn('h-6 w-px', isDark ? 'bg-[#C9A646]/20' : 'bg-gray-300')} />

      {/* SPEED CONTROL */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              'h-9 px-3 gap-2 min-w-[80px]',
              isDark ? 'hover:bg-white/10 text-[#C9A646]' : 'hover:bg-gray-100'
            )}
          >
            <Gauge className="h-4 w-4" />
            <span className="text-sm font-semibold">{speed}x</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className={cn(
            isDark ? 'bg-black border-[#C9A646]/30' : 'bg-white border-gray-200'
          )}
        >
          {REPLAY_SPEEDS.map(s => (
            <DropdownMenuItem
              key={s}
              onClick={() => onSpeedChange(s as ReplaySpeed)}
              className={cn(
                'cursor-pointer',
                isDark ? 'hover:bg-[#C9A646]/10' : 'hover:bg-gray-50'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-medium">{s}x</span>
                {speed === s && (
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      isDark ? 'bg-[#C9A646]' : 'bg-blue-600'
                    )}
                  />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};