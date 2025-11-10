import { useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

export type SummaryTabKey = 'overview' | 'fundamentals' | 'financials' | 'news';
const DEFAULT_TAB: SummaryTabKey = 'overview';

export function useTabSync() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const active = (sp.get('tab') as SummaryTabKey) || DEFAULT_TAB;

  function setActive(next: SummaryTabKey) {
    const nextSp = new URLSearchParams(sp);
    nextSp.set('tab', next);
    navigate({ pathname, search: nextSp.toString() }, { replace: true });
  }

  function linkFor(next: SummaryTabKey) {
    const nextSp = new URLSearchParams(sp);
    nextSp.set('tab', next);
    return `${pathname}?${nextSp.toString()}`;
  }

  return useMemo(() => ({ active, setActive, linkFor }), [active, pathname, sp]);
}
