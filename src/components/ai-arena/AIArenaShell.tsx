// src/components/ai-arena/AIArenaShell.tsx
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AIArenaHero } from './AIArenaHero';
import { AIArenaTabNav, type AIArenaTab } from './AIArenaTabNav';
import { AIArenaKpiCard, type AIArenaKpiCardProps } from './AIArenaKpiCard';
import { ConstructionMarker } from './_atoms/ConstructionMarker';

export interface AIArenaShellProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Replaces the default AIArenaHero when provided. */
  customHero?: ReactNode;
  kpis?: AIArenaKpiCardProps[];
  actions?: ReactNode;
  tabs?: {
    items: AIArenaTab[];
    activeId: string;
    onChange: (id: string) => void;
  };
  beam?: boolean;
  constructionMarkers?: boolean;
  goldHalo?: boolean;
  disableMotion?: boolean;
  className?: string;
  children: ReactNode;
}

export function AIArenaShell({
  eyebrow,
  title,
  subtitle,
  customHero,
  kpis,
  actions,
  tabs,
  beam = true,
  constructionMarkers = true,
  goldHalo = true,
  disableMotion = false,
  className,
  children,
}: AIArenaShellProps) {
  return (
    <section className={cn('relative min-h-screen overflow-hidden bg-section-base', className)}>
      {/* Atmosphere — radial gradient */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, var(--bg-section-radial-mid) 0%, var(--bg-section-deep) 60%, var(--bg-section-base) 100%)',
        }}
      />

      {/* Gold halo — subtle, breaks the black-box feel */}
      {goldHalo && (
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '40%',
            background:
              'radial-gradient(ellipse 50% 60% at 50% 0%, var(--beam-ambient) 0%, transparent 70%)',
            filter: 'blur(60px)',
            zIndex: 1,
          }}
        />
      )}

      {/* 3-layer gold beam (matches Hero/SectionShell) */}
      {beam && (
        <>
          <div
            className="absolute pointer-events-none"
            aria-hidden="true"
            style={{
              top: '-20%', left: '50%', transform: 'translateX(-50%)',
              width: '120%', height: '70%',
              background:
                'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.10) 25%, rgba(201,166,70,0.04) 50%, transparent 75%)',
              filter: 'blur(40px)', zIndex: 1,
            }}
          />
          <div
            className="absolute pointer-events-none"
            aria-hidden="true"
            style={{
              top: '-10%', left: '50%', transform: 'translateX(-50%)',
              width: '80%', height: '60%',
              background:
                'radial-gradient(ellipse 45% 70% at 50% 0%, rgba(230,195,100,0.22) 0%, rgba(220,180,80,0.12) 30%, rgba(201,166,70,0.05) 60%, transparent 85%)',
              mixBlendMode: 'screen', filter: 'blur(20px)', zIndex: 2,
            }}
          />
          <div
            className="absolute pointer-events-none"
            aria-hidden="true"
            style={{
              top: '-5%', left: '50%', transform: 'translateX(-50%)',
              width: '30%', height: '50%',
              background:
                'radial-gradient(ellipse 30% 50% at 50% 0%, rgba(255,220,140,0.25) 0%, rgba(230,195,100,0.10) 40%, transparent 80%)',
              mixBlendMode: 'screen', filter: 'blur(15px)', zIndex: 3,
            }}
          />
          {/* Ceiling hairline */}
          <div className="absolute top-[64px] left-0 right-0 h-px pointer-events-none" aria-hidden="true" style={{ zIndex: 4 }}>
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />
          </div>
        </>
      )}

      {/* Construction markers */}
      {constructionMarkers && (
        <>
          <div className="absolute top-[40px] left-[8%] pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }}><ConstructionMarker /></div>
          <div className="absolute top-[40px] right-[8%] pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }}><ConstructionMarker /></div>
          <div className="absolute bottom-[40px] left-[8%] pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }}><ConstructionMarker /></div>
          <div className="absolute bottom-[40px] right-[8%] pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }}><ConstructionMarker /></div>
          <div className="absolute top-0 left-[8%] w-px h-full bg-gradient-to-b from-transparent via-[color:var(--construction-line)] to-transparent pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }} />
          <div className="absolute top-0 right-[8%] w-px h-full bg-gradient-to-b from-transparent via-[color:var(--construction-line)] to-transparent pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }} />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16">
        <MotionWrap disableMotion={disableMotion}>
          {customHero
            ? customHero
            : eyebrow && title
              ? <AIArenaHero eyebrow={eyebrow} title={title} subtitle={subtitle} actions={actions} />
              : null}
        </MotionWrap>

        {kpis && kpis.length > 0 && (
          <MotionWrap disableMotion={disableMotion} delay={0.05}>
            <div className="mt-ds-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-ds-3 md:gap-ds-4">
              {kpis.map((k) => <AIArenaKpiCard key={k.id} {...k} />)}
            </div>
          </MotionWrap>
        )}

        {/* Hairline divider */}
        <div
          className="my-ds-7 h-px"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, var(--gold-eyebrow-hairline) 50%, transparent 100%)',
          }}
        />

        {tabs && (
          <div className="mb-ds-6">
            <AIArenaTabNav items={tabs.items} activeId={tabs.activeId} onChange={tabs.onChange} />
          </div>
        )}

        <MotionWrap disableMotion={disableMotion} delay={0.1}>
          {children}
        </MotionWrap>
      </div>
    </section>
  );
}

function MotionWrap({ disableMotion, delay = 0, children }: { disableMotion?: boolean; delay?: number; children: ReactNode }) {
  if (disableMotion) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
