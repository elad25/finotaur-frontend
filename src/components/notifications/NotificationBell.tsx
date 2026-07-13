// src/components/notifications/NotificationBell.tsx
// =====================================================
// Header notification bell — dropdown list of in-app announcements.
// Mounted in TopNav (Home only). Uses useNotifications() for data +
// realtime invalidation.
// =====================================================

import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNotifications, type UserNotification } from '@/hooks/useNotifications';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function NotificationRow({
  item,
  onRead,
}: {
  item: UserNotification;
  onRead: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!item.is_read) onRead(item.id);
      }}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-[8px] transition-colors duration-150',
        'hover:bg-surface-2',
        !item.is_read && 'bg-surface-1',
      )}
    >
      <div className="flex items-start gap-2">
        {!item.is_read && (
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold-primary shrink-0" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink-primary truncate">
              {item.title}
            </p>
            <span className="text-[10px] text-ink-tertiary shrink-0 whitespace-nowrap">
              {relativeTime(item.published_at)}
            </span>
          </div>
          {item.message && (
            <p className="text-[12px] text-ink-secondary mt-0.5 line-clamp-2">
              {item.message}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#A0A0A0] transition-colors hover:bg-[#1A1A1A] hover:text-[#F4F4F4] flex-shrink-0"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-mono tabular-nums flex items-center justify-center"
              aria-hidden="true"
            >
              {badgeLabel}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[360px] p-0 bg-surface-base border border-border-ds-subtle rounded-[12px] z-[150] overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-ds-subtle">
          <span className="text-[13px] font-semibold text-ink-primary">Notifications</span>
          <button
            type="button"
            onClick={() => markAllRead()}
            disabled={unreadCount === 0}
            className={cn(
              'text-[11px] font-medium transition-colors',
              unreadCount === 0
                ? 'text-ink-muted cursor-not-allowed'
                : 'text-gold-primary hover:text-gold-bright',
            )}
          >
            Mark all read
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Bell className="h-5 w-5 text-ink-muted" />
              <p className="text-[12px] text-ink-secondary">You're all caught up</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {notifications.map((item) => (
                <NotificationRow key={item.id} item={item} onRead={markRead} />
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
