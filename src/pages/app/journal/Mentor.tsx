// src/pages/app/journal/Mentor.tsx
// Mentor Mode — dual-role tab at /app/journal/mentor.
//   Section A "My Mentor"   (student role): add a mentor by email + manage requests.
//   Section B "My Students" (mentor role) : accept/decline requests + view students' journals.
// All access is RLS-enforced server-side; this page only calls SECURITY DEFINER RPCs
// via the normal supabase client (never supabaseAdmin).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useMentorView } from '@/contexts/MentorViewContext';
import { Users, ChevronRight, Clock, GraduationCap, UserPlus, X, Check } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useMyStudents,
  useMyMentors,
  usePendingMentorRequests,
  useRequestMentor,
  useRespondToMentorRequest,
  useRevokeRelationship,
  mapMentorError,
  type StudentLink,
  type MentorLink,
  type PendingRequest,
} from '@/hooks/useMentorRelationships';

const GOLD = '#C9A646';

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ================================================
// SECTION A — MY MENTOR (student role)
// ================================================

function StatusBadge({ status }: { status: MentorLink['status'] }) {
  const isActive = status === 'accepted';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          : 'border border-amber-500/40 bg-amber-500/10 text-amber-400'
      }`}
    >
      {isActive ? 'Active' : 'Pending'}
    </span>
  );
}

function MentorRow({ mentor, onRemove, removing }: { mentor: MentorLink; onRemove: () => void; removing: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-medium text-white truncate">{mentor.display_name}</span>
        <span className="text-sm text-zinc-400 truncate">{mentor.email}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <StatusBadge status={mentor.status} />
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 text-zinc-300 hover:text-white hover:border-red-500/50"
          disabled={removing}
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

function MyMentorSection() {
  const [email, setEmail] = useState('');
  const { mentors, isLoading } = useMyMentors();
  const requestMentor = useRequestMentor();
  const revoke = useRevokeRelationship();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    requestMentor.mutate(trimmed, {
      onSuccess: () => {
        toast.success(`Request sent to ${trimmed}.`);
        setEmail('');
      },
      onError: (err) => toast.error(mapMentorError(err)),
    });
  };

  const handleRemove = (m: MentorLink) => {
    if (!window.confirm(`Remove ${m.display_name} as your mentor?`)) return;
    revoke.mutate(m.relationship_id, {
      onSuccess: () => toast.success('Mentor removed.'),
      onError: (err) => toast.error(mapMentorError(err)),
    });
  };

  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
          <GraduationCap className="h-4 w-4" style={{ color: GOLD }} />
          My Mentor
        </CardTitle>
        <p className="text-sm text-zinc-500">
          Add your mentor by email. They must approve your request before they can view your journal.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mentor@example.com"
            className="flex-1 rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C9A646]/70"
          />
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={requestMentor.isPending || !email.trim()}
            className="flex-shrink-0"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            {requestMentor.isPending ? 'Sending…' : 'Send Request'}
          </Button>
        </form>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : mentors.length === 0 ? (
          <p className="text-sm text-zinc-500 py-2">You haven't added a mentor yet.</p>
        ) : (
          <div className="space-y-2">
            {mentors.map((m) => (
              <MentorRow
                key={m.relationship_id}
                mentor={m}
                removing={revoke.isPending}
                onRemove={() => handleRemove(m)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ================================================
// SECTION B — MY STUDENTS (mentor role)
// ================================================

function PendingRequestRow({
  request,
  onRespond,
  responding,
}: {
  request: PendingRequest;
  onRespond: (accept: boolean) => void;
  responding: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-medium text-white truncate">{request.display_name}</span>
        <span className="text-sm text-zinc-400 truncate">{request.email}</span>
        <span className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
          <Clock className="h-3 w-3" />
          Requested {formatDate(request.created_at)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="default"
          size="sm"
          disabled={responding}
          onClick={() => onRespond(true)}
        >
          <Check className="h-4 w-4 mr-1" />
          Accept
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 text-zinc-300 hover:text-white"
          disabled={responding}
          onClick={() => onRespond(false)}
        >
          <X className="h-4 w-4 mr-1" />
          Decline
        </Button>
      </div>
    </div>
  );
}

function StudentRow({
  student,
  onView,
  onRemove,
  removing,
}: {
  student: StudentLink;
  onView: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group">
      <button type="button" onClick={onView} className="flex flex-col gap-0.5 min-w-0 flex-1 text-left">
        <span className="font-medium text-white truncate">{student.display_name}</span>
        <span className="text-sm text-zinc-400 truncate">{student.email}</span>
        <span className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
          <Clock className="h-3 w-3" />
          Accepted {formatDate(student.accepted_at)}
        </span>
      </button>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 text-zinc-300 hover:text-white hover:border-red-500/50"
          disabled={removing}
          onClick={onRemove}
        >
          Remove
        </Button>
        <button type="button" onClick={onView} aria-label="View journal">
          <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-[#C9A646] transition-colors" />
        </button>
      </div>
    </div>
  );
}

function MyStudentsSection() {
  const navigate = useNavigate();
  const { enterMentorView } = useMentorView();
  const { students, isLoading: studentsLoading } = useMyStudents();
  const { requests, isLoading: requestsLoading } = usePendingMentorRequests();
  const respond = useRespondToMentorRequest();
  const revoke = useRevokeRelationship();

  const handleView = (s: StudentLink) => {
    enterMentorView(s.student_id, s.display_name, s.email);
    navigate('/app/journal/overview');
  };

  const handleRespond = (req: PendingRequest, accept: boolean) => {
    respond.mutate(
      { relationshipId: req.relationship_id, accept },
      {
        onSuccess: () => toast.success(accept ? `Accepted ${req.display_name}.` : `Declined ${req.display_name}.`),
        onError: (err) => toast.error(mapMentorError(err)),
      },
    );
  };

  const handleRemove = (s: StudentLink) => {
    if (!window.confirm(`Remove ${s.display_name} from your students?`)) return;
    revoke.mutate(s.relationship_id, {
      onSuccess: () => toast.success('Student removed.'),
      onError: (err) => toast.error(mapMentorError(err)),
    });
  };

  const isLoading = studentsLoading || requestsLoading;

  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
          <Users className="h-4 w-4" style={{ color: GOLD }} />
          My Students
          {!isLoading && students.length > 0 && (
            <span className="ml-auto text-sm font-normal text-zinc-500">{students.length} active</span>
          )}
        </CardTitle>
        <p className="text-sm text-zinc-500">
          Students who add you as their mentor appear here once you accept. Click a student to view their journal (read-only).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" />
          </div>
        ) : (
          <>
            {requests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-400/80">Pending requests</p>
                {requests.map((req) => (
                  <PendingRequestRow
                    key={req.relationship_id}
                    request={req}
                    responding={respond.isPending}
                    onRespond={(accept) => handleRespond(req, accept)}
                  />
                ))}
              </div>
            )}

            {students.length === 0 ? (
              <p className="text-sm text-zinc-500 py-2">No students have added you as their mentor yet.</p>
            ) : (
              <div className="space-y-2">
                {requests.length > 0 && (
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Active students</p>
                )}
                {students.map((s) => (
                  <StudentRow
                    key={s.relationship_id}
                    student={s}
                    removing={revoke.isPending}
                    onView={() => handleView(s)}
                    onRemove={() => handleRemove(s)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ================================================
// PAGE
// ================================================

export default function Mentor() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mentor Mode</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Connect with a mentor to share your journal, or review your students' journals.
        </p>
      </div>

      <MyMentorSection />
      <MyStudentsSection />
    </div>
  );
}
