/**
 * drawings2/ToolbarFlyout.tsx
 *
 * Presentational flyout panel that renders to the RIGHT of a toolbar group button.
 * Supported items are selectable; unsupported items are dimmed with a "Soon" pill.
 */

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolItem } from './toolbarGroups';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ToolbarFlyoutProps {
  title?: string;
  items: ToolItem[];
  activeToolId: string;
  onSelect: (item: ToolItem) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ToolbarFlyout({ title, items, activeToolId, onSelect }: ToolbarFlyoutProps) {
  return (
    <div
      className={cn(
        'absolute left-full top-0 ml-1 z-[60]',
        'bg-surface-1 backdrop-blur-md',
        'border border-border-ds-default',
        'rounded-[12px]',
        'shadow-xl',
        'min-w-[200px] py-1',
        'pointer-events-auto',
      )}
    >
      {title && (
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary border-b border-border-ds-subtle mb-1">
          {title}
        </div>
      )}

      {items.map((item) => {
        const isActive = item.id === activeToolId;
        const isDisabled = !item.supported;

        return (
          <button
            key={item.id}
            type="button"
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) onSelect(item);
            }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
              isDisabled
                ? 'opacity-50 cursor-not-allowed text-ink-tertiary'
                : isActive
                ? 'text-gold-primary'
                : 'text-ink-secondary hover:bg-surface-2 hover:text-ink-primary',
            )}
          >
            {/* Active check indicator */}
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {isActive ? (
                <Check size={12} className="text-gold-primary" />
              ) : (
                <item.icon size={14} />
              )}
            </span>

            {/* Label */}
            <span className="flex-1 truncate">{item.label}</span>

            {/* Right side: shortcut + soon pill */}
            <span className="ml-auto flex items-center gap-1.5 shrink-0">
              {item.shortcut && !isDisabled && (
                <span className="text-[10px] text-ink-tertiary">{item.shortcut}</span>
              )}
              {isDisabled && (
                <span className="bg-surface-2 text-ink-tertiary text-[9px] px-1.5 py-0.5 rounded leading-none">
                  Soon
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
