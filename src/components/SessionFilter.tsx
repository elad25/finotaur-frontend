// src/components/SessionFilter.tsx
// ✅ v8.5.2: Filter trades by trading session
import { useTimezoneSettings } from '@/hooks/useTimezoneSettings';
import { formatSessionName, getSessionColor } from '@/utils/sessionHelpers';

interface SessionFilterProps {
  selectedSession: string | null;
  onSessionChange: (session: string | null) => void;
}

export default function SessionFilter({ selectedSession, onSessionChange }: SessionFilterProps) {
  const { sessions, loading } = useTimezoneSettings();

  if (loading || sessions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSessionChange(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          selectedSession === null
            ? 'bg-[#C9A646] text-black'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
        }`}
      >
        All Sessions
      </button>
      
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSessionChange(session.session_name)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedSession === session.session_name
              ? 'text-black'
              : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: selectedSession === session.session_name 
              ? session.color 
              : `${session.color}20`,
            color: selectedSession === session.session_name 
              ? '#000' 
              : session.color,
            border: `1px solid ${session.color}${selectedSession === session.session_name ? '' : '40'}`,
          }}
        >
          {formatSessionName(session.session_name)}
        </button>
      ))}
    </div>
  );
}