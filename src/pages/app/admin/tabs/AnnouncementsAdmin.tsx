// src/pages/app/admin/tabs/AnnouncementsAdmin.tsx
// =====================================================
// Admin "Announcements" composer.
// Publishes in-app + email announcements to a curated audience segment via
// the `publish-announcement` edge function, and lists recent announcements
// via the `get_recent_announcements` RPC.
// =====================================================

import { useEffect, useState } from 'react';
import {
  Megaphone,
  Send,
  Clock,
  Users,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ds/Card';
import { SkeletonTable } from '@/components/ds/Skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChannelKey = 'inapp' | 'email';
type ScheduleMode = 'now' | 'later';
type Priority = 'normal' | 'high';

type AudienceKey =
  | 'all_users'
  | 'all_paying'
  | 'premium'
  | 'basic'
  | 'free'
  | 'active_this_week'
  | 'inactive_30_days'
  | 'cancelled_winback';

interface RecentAnnouncement {
  id: string;
  title: string;
  message: string;
  channels: string[];
  audience_filter: Record<string, boolean>;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  published_at: string;
  created_at: string;
}

interface PublishResult {
  sent?: true;
  scheduled?: true;
  test?: true;
  id?: string;
  counts?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

const CHANNELS: { key: ChannelKey; label: string; icon: typeof Mail }[] = [
  { key: 'inapp', label: 'In-app', icon: MessageSquare },
  { key: 'email', label: 'Email', icon: Mail },
];

const AUDIENCE_SEGMENTS: { key: AudienceKey; label: string }[] = [
  { key: 'all_users', label: 'All users' },
  { key: 'all_paying', label: 'All paying' },
  { key: 'premium', label: 'Premium' },
  { key: 'basic', label: 'Basic' },
  { key: 'free', label: 'Free only' },
  { key: 'active_this_week', label: 'Active this week' },
  { key: 'inactive_30_days', label: 'Inactive 30 days' },
  { key: 'cancelled_winback', label: 'Cancelled / expired (win-back)' },
];

function audienceLabel(filter: Record<string, boolean>): string {
  const key = Object.keys(filter).find((k) => filter[k]);
  return AUDIENCE_SEGMENTS.find((s) => s.key === key)?.label ?? key ?? '—';
}

function statusColor(status: string): string {
  switch (status) {
    case 'sent':
      return 'text-status-success';
    case 'scheduled':
      return 'text-status-info';
    case 'failed':
      return 'text-num-negative';
    default:
      return 'text-ink-secondary';
  }
}

function relativeDate(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnouncementsAdmin() {
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState<Set<ChannelKey>>(new Set(['inapp']));
  const [audienceKey, setAudienceKey] = useState<AudienceKey>('all_users');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [testEmail, setTestEmail] = useState(user?.email ?? '');

  // Recipient estimate
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Recent list
  const [recent, setRecent] = useState<RecentAnnouncement[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    if (!testEmail && user?.email) setTestEmail(user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // ---- Estimated recipients ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCount(true);
      try {
        const { data, error } = await supabase.rpc('get_announcement_recipient_count', {
          p_filters: { [audienceKey]: true },
        });
        if (cancelled) return;
        if (error) {
          console.error('[AnnouncementsAdmin] recipient count failed:', error);
          setRecipientCount(null);
          return;
        }
        setRecipientCount((data as number) ?? 0);
      } finally {
        if (!cancelled) setLoadingCount(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audienceKey]);

  // ---- Recent announcements ----
  const loadRecent = async () => {
    setLoadingRecent(true);
    try {
      const { data, error } = await supabase.rpc('get_recent_announcements', {
        p_limit: 20,
      });
      if (error) {
        console.error('[AnnouncementsAdmin] get_recent_announcements failed:', error);
        return;
      }
      setRecent((data ?? []) as RecentAnnouncement[]);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  // ---- Validation ----
  const isValid = title.trim().length > 0 && message.trim().length > 0 && channels.size > 0;

  const toggleChannel = (key: ChannelKey) => {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildBody = (overrides?: { test_email?: string }) => ({
    title: title.trim(),
    message: message.trim(),
    channels: Array.from(channels),
    audience_filter: { [audienceKey]: true },
    scheduled_at:
      scheduleMode === 'later' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    priority,
    ...(overrides?.test_email ? { test_email: overrides.test_email } : {}),
  });

  // ---- Publish / schedule ----
  const handlePublish = async () => {
    if (!isValid) return;
    if (scheduleMode === 'later' && !scheduledAt) {
      toast.error('Pick a date/time to schedule this announcement');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('publish-announcement', {
        body: buildBody(),
      });
      if (error) throw error;
      const result = data as PublishResult;
      if (result.scheduled) {
        toast.success('Announcement scheduled');
      } else {
        toast.success('Announcement sent');
      }
      setTitle('');
      setMessage('');
      setChannels(new Set(['inapp']));
      setAudienceKey('all_users');
      setScheduleMode('now');
      setScheduledAt('');
      setPriority('normal');
      await loadRecent();
    } catch (err) {
      console.error('[AnnouncementsAdmin] publish failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to publish announcement');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Send test ----
  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error('Enter an email to send the test to');
      return;
    }
    if (!title.trim() || !message.trim()) {
      toast.error('Fill in title and message before sending a test');
      return;
    }
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke('publish-announcement', {
        body: buildBody({ test_email: testEmail.trim() }),
      });
      if (error) throw error;
      toast.success(`Test sent to ${testEmail.trim()}`);
    } catch (err) {
      console.error('[AnnouncementsAdmin] test send failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send test');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-4xl px-ds-4 py-ds-6 space-y-ds-6">
        {/* Header */}
        <header className="flex items-start gap-ds-3">
          <div className="w-12 h-12 rounded-lg bg-gold-primary/10 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6 text-gold-primary" />
          </div>
          <div>
            <span className="font-sans text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
              Admin
            </span>
            <h1 className="font-sans text-[24px] font-semibold text-ink-primary mt-ds-1">
              Announcements
            </h1>
            <p className="font-sans text-[13px] text-ink-secondary mt-ds-1">
              Compose and publish in-app / email announcements to a segmented audience.
            </p>
          </div>
        </header>

        {/* Composer */}
        <Card variant="default" padding="spacious" className="space-y-ds-5">
          {/* Title */}
          <div className="space-y-ds-1">
            <label className="font-sans text-[12px] font-medium text-ink-secondary">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New feature: Options journaling is live"
              className="w-full font-sans text-[14px] bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[8px] px-ds-3 py-ds-2 text-ink-primary placeholder:text-ink-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary"
            />
          </div>

          {/* Message */}
          <div className="space-y-ds-1">
            <label className="font-sans text-[12px] font-medium text-ink-secondary">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Body copy. Supports {{name}}, {{email}}, {{plan}} merge tokens for the email channel."
              className="w-full font-sans text-[14px] bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[8px] px-ds-3 py-ds-2 text-ink-primary placeholder:text-ink-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary resize-y"
            />
          </div>

          {/* Channels + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
            <div className="space-y-ds-1">
              <label className="font-sans text-[12px] font-medium text-ink-secondary">
                Channels
              </label>
              <div className="flex items-center gap-ds-2">
                {CHANNELS.map(({ key, label, icon: Icon }) => {
                  const active = channels.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleChannel(key)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-ds-3 py-ds-2 rounded-[8px]',
                        'font-sans text-[13px] font-medium transition-colors duration-base',
                        'border-[0.5px]',
                        active
                          ? 'bg-gold-primary/10 border-gold-border text-gold-primary'
                          : 'bg-surface-1 border-border-ds-subtle text-ink-secondary hover:text-ink-primary',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-ds-1">
              <label className="font-sans text-[12px] font-medium text-ink-secondary">
                Priority
              </label>
              <div className="flex items-center gap-ds-2">
                {(['normal', 'high'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'px-ds-3 py-ds-2 rounded-[8px] capitalize',
                      'font-sans text-[13px] font-medium transition-colors duration-base',
                      'border-[0.5px]',
                      priority === p
                        ? 'bg-gold-primary/10 border-gold-border text-gold-primary'
                        : 'bg-surface-1 border-border-ds-subtle text-ink-secondary hover:text-ink-primary',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audience */}
          <div className="space-y-ds-1">
            <div className="flex items-center justify-between">
              <label className="font-sans text-[12px] font-medium text-ink-secondary">
                Audience
              </label>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-gold-primary">
                <Users className="w-3 h-3" />
                {loadingCount ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : recipientCount !== null ? (
                  `~${recipientCount.toLocaleString('en-US')} recipients`
                ) : (
                  '—'
                )}
              </span>
            </div>
            <select
              value={audienceKey}
              onChange={(e) => setAudienceKey(e.target.value as AudienceKey)}
              className="w-full font-sans text-[13px] bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[8px] px-ds-3 py-ds-2 text-ink-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary"
            >
              {AUDIENCE_SEGMENTS.map((seg) => (
                <option key={seg.key} value={seg.key}>
                  {seg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule */}
          <div className="space-y-ds-1">
            <label className="font-sans text-[12px] font-medium text-ink-secondary">
              Send
            </label>
            <div className="flex items-center gap-ds-2 flex-wrap">
              {(['now', 'later'] as ScheduleMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScheduleMode(mode)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-ds-3 py-ds-2 rounded-[8px] capitalize',
                    'font-sans text-[13px] font-medium transition-colors duration-base',
                    'border-[0.5px]',
                    scheduleMode === mode
                      ? 'bg-gold-primary/10 border-gold-border text-gold-primary'
                      : 'bg-surface-1 border-border-ds-subtle text-ink-secondary hover:text-ink-primary',
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {mode === 'now' ? 'Now' : 'Later'}
                </button>
              ))}
              {scheduleMode === 'later' && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="font-mono text-[13px] tabular-nums bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[8px] px-ds-3 py-ds-2 text-ink-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary"
                />
              )}
            </div>
          </div>

          {/* Test send + Publish */}
          <div className="flex items-center justify-between gap-ds-3 pt-ds-2 border-t-[0.5px] border-border-ds-subtle flex-wrap">
            <div className="flex items-center gap-ds-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="admin@finotaur.com"
                className="font-sans text-[13px] bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[8px] px-ds-3 py-ds-2 text-ink-primary placeholder:text-ink-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary w-[220px]"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={sendingTest}
                className={cn(
                  'inline-flex items-center gap-1.5 px-ds-3 py-ds-2 rounded-[8px]',
                  'font-sans text-[13px] font-medium',
                  'border-[0.5px] border-border-ds-subtle text-ink-secondary hover:text-ink-primary',
                  'transition-colors duration-base',
                  sendingTest && 'cursor-not-allowed opacity-60',
                )}
              >
                {sendingTest ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send test to me
              </button>
            </div>

            <button
              type="button"
              onClick={handlePublish}
              disabled={!isValid || submitting}
              className={cn(
                'inline-flex items-center gap-ds-2 px-ds-5 py-ds-2 rounded-[12px]',
                'bg-gradient-gold text-black shadow-glow-gold-resting',
                'font-sans text-[13px] font-semibold',
                'hover:opacity-90 transition-opacity duration-base',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary',
                (!isValid || submitting) && 'cursor-not-allowed opacity-50',
              )}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : scheduleMode === 'later' ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {scheduleMode === 'later' ? 'Schedule' : 'Publish now'}
            </button>
          </div>
        </Card>

        {/* Recent announcements */}
        <section className="space-y-ds-3">
          <h2 className="font-sans text-[15px] font-semibold text-ink-primary">
            Recent announcements
          </h2>

          {loadingRecent && <SkeletonTable rows={5} cols={5} />}

          {!loadingRecent && recent.length === 0 && (
            <Card variant="default" padding="spacious">
              <p className="text-center font-sans text-[13px] text-ink-secondary">
                No announcements sent yet.
              </p>
            </Card>
          )}

          {!loadingRecent && recent.length > 0 && (
            <Card variant="default" padding="compact">
              <table className="w-full">
                <thead>
                  <tr className="border-b-[0.5px] border-border-ds-subtle">
                    {['Title', 'Channels', 'Audience', 'Status', 'When'].map((h) => (
                      <th
                        key={h}
                        className="text-left font-sans text-[11px] font-medium tracking-[0.5px] uppercase text-ink-secondary py-ds-2 px-ds-2"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((ann) => (
                    <tr
                      key={ann.id}
                      className="border-b-[0.5px] border-border-ds-subtle hover:bg-surface-1 transition-colors duration-base"
                    >
                      <td className="py-ds-3 px-ds-2 font-sans text-[13px] text-ink-primary">
                        <div className="line-clamp-1 max-w-[240px]">{ann.title}</div>
                      </td>
                      <td className="py-ds-3 px-ds-2 font-sans text-[12px] text-ink-secondary capitalize">
                        {ann.channels.join(', ')}
                      </td>
                      <td className="py-ds-3 px-ds-2 font-sans text-[12px] text-ink-secondary">
                        {audienceLabel(ann.audience_filter)}
                      </td>
                      <td className={cn('py-ds-3 px-ds-2 font-sans text-[12px] font-medium capitalize', statusColor(ann.status))}>
                        <span className="inline-flex items-center gap-1">
                          {ann.status === 'sent' && <CheckCircle2 className="w-3 h-3" />}
                          {ann.status}
                        </span>
                      </td>
                      <td className="py-ds-3 px-ds-2 font-mono text-[11px] tabular-nums text-ink-secondary whitespace-nowrap">
                        {relativeDate(ann.sent_at ?? ann.scheduled_at ?? ann.published_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

export default AnnouncementsAdmin;
