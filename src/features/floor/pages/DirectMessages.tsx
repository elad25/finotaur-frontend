// Route: /app/floor/dm
// Standalone Direct Messages page — wraps MessagesPanel, reads ?dm=<userId> from URL.

import { useSearchParams } from 'react-router-dom';
import { MessagesPanel } from '@/features/floor/components/MessagesPanel';
import { cn } from '@/lib/utils';

export default function DirectMessages() {
  const [searchParams] = useSearchParams();
  const dmUser = searchParams.get('dm');

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Page header ── */}
      <header
        className={cn(
          'shrink-0 px-ds-5 pt-ds-5 pb-ds-4',
          'border-b border-border-ds-subtle',
        )}
      >
        <h1 className="font-sans text-[20px] font-semibold text-ink-primary leading-snug">
          The Floor — Messages
        </h1>
        <p className="mt-[4px] font-sans text-[13px] text-ink-tertiary">
          Your private conversations.
        </p>
      </header>

      {/* ── Messages body ── */}
      <div className="flex-1 overflow-hidden">
        <MessagesPanel initialUserId={dmUser ?? undefined} />
      </div>
    </div>
  );
}
