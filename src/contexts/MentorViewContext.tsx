// src/contexts/MentorViewContext.tsx
// Mentor View — lets an accepted mentor browse a student's ENTIRE journal
// (every sidebar page) scoped to the student's user id, read-only.
//
// Mechanism: while active, useEffectiveUser() returns the student's id, so all
// journal pages/hooks transparently query the student's data. Access is still
// enforced server-side by RLS (is_accepted_mentor_of) — NEVER service_role.
//
// State is persisted in sessionStorage so it survives sidebar navigation and
// reloads, and is scoped to the tab (closing the tab ends the view).

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface MentorViewState {
  studentUserId: string | null;
  studentName: string | null;
  studentEmail: string | null;
}

interface MentorViewContextValue extends MentorViewState {
  isMentorView: boolean;
  enterMentorView: (studentUserId: string, studentName: string, studentEmail: string) => void;
  exitMentorView: () => void;
}

const STORAGE_KEY = 'finotaur_mentor_view';

const EMPTY: MentorViewState = {
  studentUserId: null,
  studentName: null,
  studentEmail: null,
};

// Default value so consumers never crash when rendered outside the provider.
const MentorViewContext = createContext<MentorViewContextValue>({
  ...EMPTY,
  isMentorView: false,
  enterMentorView: () => {},
  exitMentorView: () => {},
});

function readStored(): MentorViewState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<MentorViewState>;
    if (parsed && typeof parsed.studentUserId === 'string' && parsed.studentUserId) {
      return {
        studentUserId: parsed.studentUserId,
        studentName: parsed.studentName ?? null,
        studentEmail: parsed.studentEmail ?? null,
      };
    }
  } catch {
    // sessionStorage unavailable or malformed — fall through to empty.
  }
  return EMPTY;
}

export function MentorViewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MentorViewState>(readStored);

  const enterMentorView = useCallback(
    (studentUserId: string, studentName: string, studentEmail: string) => {
      const next: MentorViewState = { studentUserId, studentName, studentEmail };
      setState(next);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore persistence failures (private mode / quota)
      }
    },
    [],
  );

  const exitMentorView = useCallback(() => {
    setState(EMPTY);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value: MentorViewContextValue = {
    ...state,
    isMentorView: !!state.studentUserId,
    enterMentorView,
    exitMentorView,
  };

  return <MentorViewContext.Provider value={value}>{children}</MentorViewContext.Provider>;
}

export function useMentorView(): MentorViewContextValue {
  return useContext(MentorViewContext);
}
