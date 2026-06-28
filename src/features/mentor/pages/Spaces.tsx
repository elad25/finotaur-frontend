// src/pages/app/mentorship/Spaces.tsx
// Route: /app/mentorship/spaces
//
// Sections:
//   1. Page header — title + subtitle + "Create a space" CTA (top-right)
//   2. Invite-accept banner — reads ?invite=<token>, calls useAcceptInvite
//   3. Your Spaces grid — useMySpaces; loading→skeletons, empty→empty state, data→SpaceCard
//   4. CreateSpaceDialog — opened by the header CTA

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';
import { SkeletonGrid } from '@/components/ds/Skeleton';
import { SpaceCard } from '@/features/mentor/components/SpaceCard';
import { CreateSpaceDialog } from '@/features/mentor/components/CreateSpaceDialog';
import { useMySpaces, useAcceptInvite, useDeleteSpace, useLeaveSpace, mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import { useUserProfile, isAdminUser } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Premium gate helper ────────────────────────────────────────────────────────
//
// A user can create a space if they hold a FINOTAUR / enterprise platform plan
// or are an admin/vip.

function useCanCreateSpace(): boolean {
  const { profile } = useUserProfile();
  if (!profile) return false;
  if (isAdminUser(profile)) return true;
  // Premium via journal account_type
  if (profile.account_type === 'premium') return true;
  // Premium via platform plan
  const premiumPlatformPlans = ['finotaur', 'platform_finotaur', 'enterprise', 'platform_enterprise'];
  if (
    profile.platform_plan &&
    premiumPlatformPlans.includes(profile.platform_plan) &&
    ['active', 'trial', 'trialing'].includes(profile.platform_subscription_status ?? '')
  ) {
    return true;
  }
  return false;
}

// ── Invite banner ──────────────────────────────────────────────────────────────

interface InviteBannerProps {
  token: string;
}

function InviteBanner({ token }: InviteBannerProps) {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useAcceptInvite();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleAccept() {
    try {
      await mutateAsync(token);
      toast({ title: 'Invite accepted', description: 'You have joined the Room.' });
      // Clear invite param and stay on the page (list will refetch via onSuccess).
      navigate('/app/floor/rooms', { replace: true });
    } catch (err) {
      toast({ title: 'Could not accept invite', description: mapSpaceError(err) });
      setDismissed(true);
    }
  }

  return (
    <Card
      variant="featured"
      padding="default"
      className="mb-ds-6 flex flex-col sm:flex-row sm:items-center gap-ds-4"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-ink-primary">
          You&apos;ve been invited to a Room
        </p>
        <p className="text-[13px] text-ink-secondary mt-ds-1">
          Accept to join the Room and start collaborating.
        </p>
      </div>
      <div className="flex items-center gap-ds-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            navigate('/app/floor/rooms', { replace: true });
          }}
          className="text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors duration-base"
        >
          Dismiss
        </button>
        <Button
          variant="gold"
          size="compact"
          showArrow={false}
          disabled={isPending}
          onClick={handleAccept}
        >
          {isPending ? 'Joining…' : 'Accept invite'}
        </Button>
      </div>
    </Card>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptySpaces({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'py-ds-9 px-ds-5 text-center',
        'rounded-[12px] border-[0.5px] border-border-ds-subtle border-dashed',
      )}
    >
      <Users
        className="mb-ds-4 text-ink-tertiary"
        size={40}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <p className="text-[15px] font-medium text-ink-primary">No Rooms yet</p>
      <p className="mt-ds-2 text-[13px] text-ink-secondary max-w-xs">
        Create your first Room to start coaching, broadcasting, and building your community.
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className={cn(
          'mt-ds-5 text-[13px] font-medium text-gold-primary underline underline-offset-2',
          'hover:text-gold-hover transition-colors duration-base',
        )}
      >
        Create a Room
      </button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Spaces() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const { spaces, isLoading } = useMySpaces();
  const canCreate = useCanCreateSpace();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutateAsync: deleteSpace } = useDeleteSpace();
  const { mutateAsync: leaveSpace } = useLeaveSpace();

  return (
    <div className="px-ds-5 md:px-ds-6 py-ds-6 max-w-7xl mx-auto">

      {/* ── 1. Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-ds-4 mb-ds-7">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary leading-tight">
            Rooms
          </h1>
          <p className="mt-ds-2 text-[14px] text-ink-secondary">
            Your trading communities — run a Room, broadcast, and coach.
          </p>
        </div>

        {/* Create CTA — one gold button per viewport per DS rule */}
        <Button
          variant="gold"
          size="default"
          showArrow={false}
          onClick={() => setDialogOpen(true)}
          className="self-start sm:self-auto shrink-0"
        >
          Create a Room
        </Button>
      </div>

      {/* ── 2. Invite banner ── */}
      {inviteToken && <InviteBanner token={inviteToken} />}

      {/* ── 3. Your Spaces ── */}
      <section aria-labelledby="spaces-heading">
        <h2
          id="spaces-heading"
          className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4"
        >
          Your Rooms
        </h2>

        {isLoading ? (
          // Skeleton: 3-card grid mirrors the loaded layout.
          <SkeletonGrid count={3} cols={3} cardLines={3} />
        ) : spaces.length === 0 ? (
          <EmptySpaces onCreateClick={() => setDialogOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-ds-4">
            {spaces.map((space) => (
              <SpaceCard
                key={space.space_id}
                space={space}
                onClick={() => navigate(`/app/floor/rooms/${space.space_id}`)}
                onDelete={space.role === 'owner' ? async () => {
                  try {
                    await deleteSpace(space.space_id);
                  } catch (err) {
                    toast({ title: 'Could not delete', description: mapSpaceError(err), variant: 'destructive' });
                  }
                } : undefined}
                onLeave={space.role !== 'owner' ? async () => {
                  try {
                    await leaveSpace(space.space_id);
                  } catch (err) {
                    toast({ title: 'Could not leave', description: mapSpaceError(err), variant: 'destructive' });
                  }
                } : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 4. Create dialog ── */}
      <CreateSpaceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        canCreate={canCreate}
      />
    </div>
  );
}
