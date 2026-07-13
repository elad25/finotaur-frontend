// src/components/AuthLandingGate.tsx
// TEMP DIAGNOSTIC v3 — REAL logic (actually navigates), but records every
// decision to sessionStorage first so we can read the timeline after it lands.
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { PageLoader } from '@/components/ds/Spinner';

const SESSION_SETTLE_GRACE_MS = 6_000;

function rec(s: string) {
  try {
    const prev = sessionStorage.getItem('__gate') || '';
    sessionStorage.setItem('__gate', prev + s + '\n');
  } catch { /* ignore */ }
}

export default function AuthLandingGate() {
  const { user, isLoading } = useAuth();
  const [graceElapsed, setGraceElapsed] = useState(false);

  useEffect(() => {
    rec(`${Math.round(performance.now())} MOUNT`);
    const timer = setTimeout(() => setGraceElapsed(true), SESSION_SETTLE_GRACE_MS);
    return () => { rec(`${Math.round(performance.now())} UNMOUNT`); clearTimeout(timer); };
  }, []);

  const t = Math.round(performance.now());
  if (user) {
    rec(`${t} NAV_welcome_user L=${isLoading} G=${graceElapsed}`);
    return <Navigate to="/welcome" replace />;
  }
  if (isLoading || !graceElapsed) {
    rec(`${t} LOADER L=${isLoading} G=${graceElapsed}`);
    return <PageLoader />;
  }
  rec(`${t} NAV_welcome_grace L=${isLoading} G=${graceElapsed}`);
  return <Navigate to="/welcome" replace />;
}
