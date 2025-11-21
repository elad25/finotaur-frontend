// ui/LoadingOverlay.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Theme } from '../types';
import { cn } from '@/lib/utils';

// ✅ Export interface
export interface LoadingOverlayProps {
  message?: string;
  theme: Theme;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  theme,
  className = '',
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'absolute inset-0 z-40 backdrop-blur-sm flex items-center justify-center',
        isDark ? 'bg-black/60' : 'bg-white/60',
        className
      )}
    >
      <div
        className={cn(
          'rounded-lg border p-6 flex flex-col items-center gap-4 min-w-[200px]',
          isDark
            ? 'bg-black/90 border-[#C9A646]/30'
            : 'bg-white/90 border-gray-200'
        )}
      >
        <Loader2
          className={cn(
            'h-8 w-8 animate-spin',
            isDark ? 'text-[#C9A646]' : 'text-blue-600'
          )}
        />
        <p
          className={cn(
            'text-sm font-medium',
            isDark ? 'text-white' : 'text-gray-900'
          )}
        >
          {message}
        </p>
      </div>
    </div>
  );
};