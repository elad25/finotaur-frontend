// src/pages/app/mentorship/SpaceDetail.tsx
// Route: /app/mentorship/:id
//
// Three-column Discord-like layout on desktop; collapses to a tabbed view on
// mobile (md breakpoint).
//
// Columns:
//   LEFT  — ChannelList (with optional Invite button for managers)
//   CENTER — MessageList (messages + composer)
//   RIGHT  — MemberList (roster + actions)
//
// Auth: currentUserId from useAuth().user.id — the same pattern used across the app.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Hash, Users, Megaphone, Trophy, BarChart2, Newspaper, ClipboardCheck, BookOpen } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useMentorView } from '@/contexts/MentorViewContext';
import {
  useSpace,
  useSpaceChannels,
  useSpaceMembers,
  useOpenDmChannel,
  mapSpaceError,
} from '@/hooks/useMentorshipSpaces';
import { SectionSpinner } from '@/components/ds/Spinner';
import { ChannelList } from '@/components/mentorship/ChannelList';
import { MessageList } from '@/components/mentorship/MessageList';
import { MemberList } from '@/components/mentorship/MemberList';
import { InviteDialog } from '@/components/mentorship/InviteDialog';
import { RoomLeaderboard } from '@/components/mentorship/RoomLeaderboard';
import { RoomAnalytics } from '@/components/mentorship/RoomAnalytics';
import { RoomFeed } from '@/components/mentorship/RoomFeed';
import { RoomReviews } from '@/components/mentorship/RoomReviews';
import { RoomCourses } from '@/components/mentorship/RoomCourses';
import { toast } from '@/hooks/use-toast';
import type { SpaceChannel, SpaceMember } from '@/types/mentorship';
import { cn } from '@/lib/utils';

// ── Top-level room tabs ───────────────────────────────────────────────────────

type RoomTab = 'community' | 'feed' | 'leaderboard' | 'analytics' | 'reviews' | 'courses';

const ROOM_TABS: { id: RoomTab; label: string; icon: React.ElementType }[] = [
  { id: 'community', label: 'Community', icon: Hash },
  { id: 'feed', label: 'Feed', icon: Newspaper },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'reviews', label: 'Reviews', icon: ClipboardCheck },
  { id: 'courses', label: 'Courses', icon: BookOpen },
];

// ── Mobile tabs (inside Community tab) ───────────────────────────────────────

type MobileTab = 'channels' | 'messages' | 'members';

const MOBILE_TABS: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: 'channels', label: 'Channels', icon: Hash },
  { id: 'messages', label: 'Messages', icon: Megaphone },
  { id: 'members', label: 'Members', icon: Users },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Pick the default channel to open: first announcement, else first channel. */
function defaultChannel(channels: SpaceChannel[]): string | null {
  if (channels.length === 0) return null;
  const ann = channels.find((c) => c.type === 'announcement');
  return ann?.id ?? channels[0].id;
}

// ── Avatar + monogram ────────────────────────────────────────────────────────

function SpaceAvatar({ name, url }: { name: string; url?: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-9 w-9 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center h-9 w-9 rounded-full bg-gradient-gold text-ink-on-gold text-sm font-semibold shrink-0"
    >
      {initial}
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export default function SpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const { enterMentorView } = useMentorView();

  const { space, isLoading: spaceLoading, error: spaceError } = useSpace(id);
  const { channels, isLoading: channelsLoading } = useSpaceChannels(id);
  const { members } = useSpaceMembers(id);
  const openDm = useOpenDmChannel();

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('messages');
  const [activeRoomTab, setActiveRoomTab] = useState<RoomTab>('community');

  // Set default channel once channels load.
  useEffect(() => {
    if (!activeChannelId && channels.length > 0) {
      setActiveChannelId(defaultChannel(channels));
    }
  }, [channels, activeChannelId]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const myRole = space?.my_role ?? 'student';
  const isManager = myRole === 'owner' || myRole === 'co_mentor';

  const activeChannel: SpaceChannel | undefined = channels.find(
    (c) => c.id === activeChannelId,
  );

  // Students cannot post to announcement channels.
  const canPost =
    activeChannel?.type !== 'announcement' || isManager;

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleMessage(userId: string) {
    if (!id) return;
    try {
      const ch = await openDm.mutateAsync({ spaceId: id, userId });
      setActiveChannelId(ch.id);
      setMobileTab('messages');
    } catch (err) {
      toast({ title: 'Could not open DM', description: mapSpaceError(err) });
    }
  }

  function handleViewJournal(member: SpaceMember) {
    enterMentorView(
      member.user_id,
      member.display_name ?? member.email,
      member.email,
    );
    navigate('/app/journal/overview');
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (spaceLoading || channelsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SectionSpinner />
      </div>
    );
  }

  // ── Not found / access denied ──────────────────────────────────────────────

  if (spaceError || !space) {
    return (
      <div className="px-ds-5 py-ds-9 text-center flex flex-col items-center gap-ds-4">
        <p className="text-[15px] text-ink-secondary">
          {spaceError ? mapSpaceError(spaceError) : 'Space not found.'}
        </p>
        <Link
          to="/app/floor/rooms"
          className="text-[13px] text-gold-primary hover:text-gold-hover underline underline-offset-2 transition-colors duration-base"
        >
          Back to Rooms
        </Link>
      </div>
    );
  }

  // ── Shared panel content (used in both desktop columns and mobile tabs) ─────

  const channelListPanel = (
    <ChannelList
      channels={channels}
      members={members}
      currentUserId={currentUserId}
      activeChannelId={activeChannelId}
      onSelect={(chId) => {
        setActiveChannelId(chId);
        setMobileTab('messages');
      }}
      isManager={isManager}
      onInvite={() => setInviteOpen(true)}
    />
  );

  const messagePanel = activeChannelId ? (
    <MessageList
      channelId={activeChannelId}
      channelType={activeChannel?.type ?? 'chat'}
      canPost={canPost}
      currentUserId={currentUserId}
      members={members}
    />
  ) : (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[13px] text-ink-tertiary">Select a channel to start.</p>
    </div>
  );

  const memberPanel = (
    <MemberList
      spaceId={id!}
      members={members}
      myRole={myRole}
      currentUserId={currentUserId}
      onMessage={handleMessage}
      onViewJournal={handleViewJournal}
    />
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ── */}
      <header
        className={cn(
          'shrink-0 flex items-center gap-ds-3 px-ds-5 py-ds-3',
          'border-b border-border-ds-subtle',
        )}
      >
        <Link
          to="/app/floor/rooms"
          className="flex items-center justify-center h-8 w-8 rounded-[6px] text-ink-tertiary hover:text-ink-primary hover:bg-surface-2 transition-colors duration-base"
          aria-label="Back to Rooms"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>

        <SpaceAvatar name={space.name} url={space.avatar_url} />

        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold text-ink-primary leading-snug truncate">
            {space.name}
          </h1>
          <p className="text-[12px] text-ink-tertiary">
            {space.member_count} {space.member_count === 1 ? 'member' : 'members'}
          </p>
        </div>
      </header>

      {/* ── Room-level tab bar (Community / Leaderboard / Analytics) ── */}
      <nav
        className="shrink-0 flex items-center border-b border-border-ds-subtle px-ds-4"
        aria-label="Room sections"
      >
        {ROOM_TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setActiveRoomTab(tabId)}
            className={cn(
              'flex items-center gap-[6px] px-ds-3 py-[10px]',
              'font-sans text-[13px] font-medium',
              'transition-colors duration-base ease-out',
              'border-b-2 -mb-[1px]',
              activeRoomTab === tabId
                ? 'text-ink-primary border-gold-primary'
                : 'text-ink-tertiary border-transparent hover:text-ink-secondary',
            )}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {/* ── Leaderboard tab ── */}
      {activeRoomTab === 'leaderboard' && (
        <div className="flex-1 overflow-y-auto">
          <RoomLeaderboard spaceId={id!} />
        </div>
      )}

      {/* ── Analytics tab ── */}
      {activeRoomTab === 'analytics' && (
        <div className="flex-1 overflow-y-auto">
          <RoomAnalytics spaceId={id!} />
        </div>
      )}

      {/* ── Feed tab ── */}
      {activeRoomTab === 'feed' && (
        <div className="flex-1 overflow-y-auto">
          <RoomFeed spaceId={id!} isManager={isManager} />
        </div>
      )}

      {/* ── Reviews tab ── */}
      {activeRoomTab === 'reviews' && (
        <div className="flex-1 overflow-y-auto">
          <RoomReviews spaceId={id!} isManager={isManager} />
        </div>
      )}

      {/* ── Courses tab ── */}
      {activeRoomTab === 'courses' && (
        <div className="flex-1 overflow-y-auto">
          <RoomCourses spaceId={id!} isManager={isManager} />
        </div>
      )}

      {/* ── Community tab: existing 3-column + mobile layout ── */}
      {activeRoomTab === 'community' && (
        <>
          {/* ── Desktop: 3-column layout ── */}
          <div className="flex-1 hidden md:grid grid-cols-[220px_1fr_220px] overflow-hidden">
            {/* LEFT — Channel rail */}
            <aside
              className="overflow-y-auto border-r border-border-ds-subtle px-ds-2"
              aria-label="Channel list"
            >
              {channelListPanel}
            </aside>

            {/* CENTER — Messages */}
            <main className="flex flex-col overflow-hidden">
              {activeChannel && (
                <div className="shrink-0 flex items-center gap-ds-2 px-ds-4 py-[10px] border-b border-border-ds-subtle">
                  <span className="text-[13px] font-medium text-ink-secondary">
                    {activeChannel.name}
                  </span>
                </div>
              )}
              <div className="flex-1 overflow-hidden flex flex-col">
                {messagePanel}
              </div>
            </main>

            {/* RIGHT — Members */}
            <aside
              className="overflow-y-auto border-l border-border-ds-subtle"
              aria-label="Member list"
            >
              {memberPanel}
            </aside>
          </div>

          {/* ── Mobile: tabbed layout ── */}
          <div className="flex-1 flex flex-col overflow-hidden md:hidden">
            {/* Tab bar */}
            <nav
              className="shrink-0 flex border-b border-border-ds-subtle"
              aria-label="Space navigation"
            >
              {MOBILE_TABS.map(({ id: tabId, label, icon: Icon }) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setMobileTab(tabId)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-[2px] py-[10px]',
                    'text-[11px] font-medium transition-colors duration-base ease-out',
                    mobileTab === tabId
                      ? 'text-gold-primary border-b-2 border-gold-primary -mb-[1px]'
                      : 'text-ink-tertiary hover:text-ink-secondary',
                  )}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </nav>

            {/* Active tab content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {mobileTab === 'channels' && (
                <div className="overflow-y-auto px-ds-2">{channelListPanel}</div>
              )}
              {mobileTab === 'messages' && (
                <div className="flex-1 flex flex-col overflow-hidden">{messagePanel}</div>
              )}
              {mobileTab === 'members' && (
                <div className="overflow-y-auto">{memberPanel}</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Invite dialog ── */}
      <InviteDialog
        spaceId={id!}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </div>
  );
}
