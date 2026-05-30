/**
 * Shared sub-components used by multiple extracted COPILOT panels.
 * Moved from FinotaurCopilotDashboard.tsx so that panels living in
 * brief/panels/ and code remaining in the dashboard can both import
 * without duplication.
 */

import type { ElementType, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function PanelHeader({ title, action, actionTo }: { title: string; action?: string; actionTo?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[13px] uppercase text-gold-primary">{title}</p>
      {action && actionTo && (
        <Link to={actionTo} className="rounded-[5px] border border-gold-primary/22 bg-black/30 px-3 py-1 text-[9px] uppercase text-gold-primary hover:bg-gold-primary/10">
          {action}
        </Link>
      )}
      {action && !actionTo && (
        <button className="rounded-[5px] border border-gold-primary/22 bg-black/30 px-3 py-1 text-[9px] uppercase text-gold-primary hover:bg-gold-primary/10">
          {action}
        </button>
      )}
    </div>
  );
}

export function InsightRow({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <div className="flex gap-3 border-b border-gold-primary/10 py-3 last:border-b-0">
      <div className="h-8 w-8 rounded-[6px] border border-gold-primary/20 bg-gold-primary/9 flex items-center justify-center text-gold-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] text-gold-primary">{title}</p>
        <p className="mt-1 text-xs text-ink-secondary">{text}</p>
      </div>
    </div>
  );
}
