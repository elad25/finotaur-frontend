// src/components/MentorViewBanner.tsx
// Global top banner shown while a mentor is viewing a student's journal.
// Provides the exit ("Back from Mentor Mode"). Renders nothing otherwise.

import { useNavigate } from 'react-router-dom';
import { Eye, ArrowLeft } from 'lucide-react';
import { useMentorView } from '@/contexts/MentorViewContext';

export function MentorViewBanner() {
  const { isMentorView, studentName, studentEmail, exitMentorView } = useMentorView();
  const navigate = useNavigate();

  if (!isMentorView) return null;

  const label = studentName || studentEmail || 'student';

  const handleExit = () => {
    exitMentorView();
    navigate('/app/journal/mentor');
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2">
      <div className="flex items-center gap-2 text-sm text-amber-300 min-w-0">
        <Eye className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          You're watching <span className="font-semibold">{label}</span> with Mentor Mode
          <span className="hidden sm:inline text-amber-300/70"> · read-only</span>
        </span>
      </div>
      <button
        type="button"
        onClick={handleExit}
        className="flex items-center gap-1.5 flex-shrink-0 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/20 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back from Mentor Mode
      </button>
    </div>
  );
}
