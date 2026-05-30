// src/pages/app/journal/MentorStudentView.tsx
// Read-only view of a student's journal for an accepted mentor.
// Route: /app/journal/mentor/:studentId
//
// Authorization is enforced at two layers:
//   1. UX guard (this file): only renders if the student is in the mentor's
//      accepted-students list (from useMyStudents).
//   2. Supabase RLS (server): the mentor's JWT can only read rows owned by
//      students who have an accepted mentor_relationships row with this mentor.

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMyStudents } from '@/hooks/useMentorRelationships';
import JournalOverview from '@/pages/app/journal/Overview';
import MyTrades from '@/pages/app/journal/MyTrades';
import FinotaurAI from '@/pages/app/journal/finotaur-ai/FinotaurAI';

// ================================================
// TYPES
// ================================================

type Tab = 'overview' | 'trades' | 'finotaur-ai';

// ================================================
// TAB CONTROL
// ================================================

interface SegmentedControlProps {
  value: Tab;
  onChange: (tab: Tab) => void;
}

function SegmentedControl({ value, onChange }: SegmentedControlProps) {
  const base =
    'px-4 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A646]/70';
  const active = 'bg-[#C9A646] text-black';
  const inactive = 'text-zinc-400 hover:text-white';

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-white/5 p-1">
      <button
        type="button"
        className={`${base} ${value === 'overview' ? active : inactive}`}
        onClick={() => onChange('overview')}
      >
        Overview
      </button>
      <button
        type="button"
        className={`${base} ${value === 'trades' ? active : inactive}`}
        onClick={() => onChange('trades')}
      >
        Trades
      </button>
      <button
        type="button"
        className={`${base} ${value === 'finotaur-ai' ? active : inactive}`}
        onClick={() => onChange('finotaur-ai')}
      >
        FINOTAUR AI
      </button>
    </div>
  );
}

// ================================================
// ACCESS DENIED CARD
// ================================================

function AccessDenied() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center gap-6 text-center">
      <div className="rounded-full bg-white/5 p-6">
        <EyeOff className="h-8 w-8 text-zinc-500" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">Access Restricted</h2>
        <p className="text-zinc-400 text-sm mt-2">
          You don't have access to this journal. You can only view the journals of
          students who have accepted your mentorship invitation.
        </p>
      </div>
      <Link
        to="/app/journal/mentor"
        className="text-[#C9A646] hover:underline text-sm font-medium"
      >
        ← Back to Mentor Mode
      </Link>
    </div>
  );
}

// ================================================
// PAGE
// ================================================

export default function MentorStudentView() {
  const { studentId } = useParams<{ studentId: string }>();
  const { students, isLoading } = useMyStudents();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Loading state while the accepted-students list is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C9A646]" />
      </div>
    );
  }

  // UX authorization guard: student must be in the accepted list
  const student = students.find((s) => s.student_id === studentId);
  if (!student) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-0">
      {/* Sticky header bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Back link + student identity */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/app/journal/mentor"
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Mentor Mode
            </Link>
            <span className="text-zinc-600 select-none">·</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-white truncate">{student.display_name}</span>
              <span className="hidden sm:inline text-zinc-500 text-sm truncate">{student.email}</span>
            </div>
          </div>

          {/* Read-only badge */}
          <div className="flex items-center gap-3 sm:ml-auto flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              <EyeOff className="h-3 w-3" />
              Read-only
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="max-w-7xl mx-auto mt-3">
          <SegmentedControl value={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {/* Journal content */}
      <div>
        {activeTab === 'overview' ? (
          <JournalOverview overrideUserId={student.student_id} readOnly />
        ) : activeTab === 'trades' ? (
          <MyTrades overrideUserId={student.student_id} readOnly />
        ) : (
          <FinotaurAI overrideUserId={student.student_id} readOnly />
        )}
      </div>
    </div>
  );
}
