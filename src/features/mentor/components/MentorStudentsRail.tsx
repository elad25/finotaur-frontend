// src/features/mentor/components/MentorStudentsRail.tsx
// Compact left rail listing every student a mentor is connected with.
// Sits between the global sidebar and the Mentor Mode content. Clicking a
// student scrolls to + highlights that student's row in the "My Students"
// card (handled by the parent page via onSelectStudent). Data comes from the
// same RLS-protected list_my_students() RPC as the main list, so the two
// React-Query subscribers share one cached result.

import { Users } from 'lucide-react';
import { useMyStudents } from '@/features/mentor/hooks/useMentorRelationships';

const GOLD = '#C9A646';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MentorStudentsRail({
  onSelectStudent,
  activeStudentId,
}: {
  onSelectStudent: (studentId: string) => void;
  activeStudentId: string | null;
}) {
  const { students, isLoading } = useMyStudents();

  // Hide the rail entirely while loading or when this user mentors no one —
  // it is a navigation aid, not a primary surface.
  if (isLoading || students.length === 0) return null;

  return (
    <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 self-start sticky top-4 max-h-[calc(100vh-6rem)] rounded-xl border border-white/10 bg-zinc-900/60">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <Users className="h-4 w-4" style={{ color: GOLD }} />
        <span className="text-sm font-semibold text-zinc-200">My Students</span>
        <span className="ml-auto text-xs text-zinc-500">{students.length}</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {students.map((s) => {
          const isActive = s.student_id === activeStudentId;
          return (
            <button
              key={s.relationship_id}
              type="button"
              onClick={() => onSelectStudent(s.student_id)}
              title={`${s.display_name} — ${s.email}`}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                isActive
                  ? 'bg-[#C9A646]/10 ring-1 ring-[#C9A646]/50'
                  : 'hover:bg-white/5'
              }`}
            >
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-zinc-200"
                aria-hidden
              >
                {initials(s.display_name)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-white">{s.display_name}</span>
                <span className="truncate text-xs text-zinc-500">{s.email}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
