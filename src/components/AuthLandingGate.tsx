// src/components/AuthLandingGate.tsx
// TEMP DIAGNOSTIC BUILD — renders live gate state to the DOM, does NOT navigate.
// Reverted to the real implementation before merge.
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';

const SESSION_SETTLE_GRACE_MS = 6_000;

export default function AuthLandingGate() {
  const { user, isLoading } = useAuth();
  const [graceElapsed, setGraceElapsed] = useState(false);
  const [, force] = useState(0);
  const logRef = useRef<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setGraceElapsed(true), SESSION_SETTLE_GRACE_MS);
    // heartbeat so the panel refreshes even without other state changes
    const hb = setInterval(() => force((n) => n + 1), 500);
    return () => { clearTimeout(timer); clearInterval(hb); };
  }, []);

  logRef.current.push(
    `${Math.round(performance.now())}ms u=${!!user} L=${isLoading} G=${graceElapsed} path=${typeof window !== 'undefined' ? window.location.pathname : ''}`
  );
  if (logRef.current.length > 60) logRef.current.shift();

  return (
    <pre
      data-authgate="1"
      style={{
        position: 'fixed', top: 0, left: 0, zIndex: 999999,
        background: '#000', color: '#0f0', fontSize: 11, lineHeight: 1.3,
        padding: 10, margin: 0, maxWidth: '100vw', whiteSpace: 'pre-wrap',
      }}
    >
      {`AUTHGATE-DIAG\n${logRef.current.join('\n')}`}
    </pre>
  );
}
