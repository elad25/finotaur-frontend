// src/pages/app/admin/tabs/PlaceholderShell.tsx
// Shared layout for the four "planned" tabs (Leads / Onboarding /
// Integrations / Executive). Each planned tab supplies its own copy,
// feature list, and optional live-data section.

import { Sparkles, CheckCircle2, Circle, type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export interface PlannedFeature {
  label: string;
  status?: 'planned' | 'spec-ready' | 'partial' | 'live';
  detail?: string;
}

interface PlaceholderShellProps {
  title: string;
  subtitle: string;
  intro: string;
  icon: LucideIcon;
  phase: number;
  features: PlannedFeature[];
  /** Optional live-data section (e.g. a free-user count for Leads) */
  liveData?: ReactNode;
  /** Optional "why this matters" section */
  whyItMatters?: ReactNode;
}

const STATUS_STYLES: Record<NonNullable<PlannedFeature['status']>, string> = {
  planned: 'text-gray-500',
  'spec-ready': 'text-blue-400',
  partial: 'text-yellow-400',
  live: 'text-green-400',
};

const STATUS_LABELS: Record<NonNullable<PlannedFeature['status']>, string> = {
  planned: 'Planned',
  'spec-ready': 'Spec ready',
  partial: 'Partial today',
  live: 'Live today',
};

export function PlaceholderShell({
  title,
  subtitle,
  intro,
  icon: Icon,
  phase,
  features,
  liveData,
  whyItMatters,
}: PlaceholderShellProps) {
  return (
    <div className="p-8 space-y-6">
      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full
                         text-[10px] uppercase tracking-wide font-semibold
                         bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20"
            >
              <Sparkles className="w-3 h-3" />
              Phase {phase}
            </span>
          </div>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>
      </header>

      <section className="bg-[#111111] border border-gray-800 rounded-lg p-6">
        <p className="text-gray-300 leading-relaxed">{intro}</p>
      </section>

      {liveData && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">
            What we can already see today
          </h3>
          {liveData}
        </section>
      )}

      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-6 py-3 border-b border-gray-800">
          <h3 className="text-white font-semibold">Planned features</h3>
        </header>
        <ul className="divide-y divide-gray-800">
          {features.map((feature, idx) => {
            const status = feature.status ?? 'planned';
            const isLive = status === 'live' || status === 'partial';
            return (
              <li
                key={idx}
                className="px-6 py-3 flex items-start gap-3 hover:bg-white/[0.02]"
              >
                {isLive ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-200 text-sm">
                      {feature.label}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wide font-semibold ${STATUS_STYLES[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  {feature.detail && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {feature.detail}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {whyItMatters && (
        <section className="bg-[#0E0E0E] border border-[#D4AF37]/20 rounded-lg p-6">
          <h3 className="text-[#D4AF37] font-semibold mb-2 text-sm uppercase tracking-wide">
            Why this matters
          </h3>
          <div className="text-gray-300 text-sm leading-relaxed">
            {whyItMatters}
          </div>
        </section>
      )}
    </div>
  );
}
