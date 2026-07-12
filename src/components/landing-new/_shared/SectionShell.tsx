// src/components/landing-new/_shared/SectionShell.tsx
// ================================================
// SectionShell — Consistent section wrapper for all landing-page sections.
// Provides atmosphere (background), optional Hero-style gold beam, optional
// construction markers, and a scroll-triggered fade-in via framer-motion.
// ================================================

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// CrossMarker sub-component — matches Hero.tsx exactly
// ---------------------------------------------------------------------------
function CrossMarker() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60" aria-hidden="true">
      <line x1="7" y1="2" x2="7" y2="12" stroke="rgba(201,166,70,0.6)" strokeWidth="0.8" />
      <line x1="2" y1="7" x2="12" y2="7" stroke="rgba(201,166,70,0.6)" strokeWidth="0.8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Atmosphere = 'full' | 'subtle' | 'none';

type Props = {
  id?: string;
  /** Background treatment for the section. Default: 'subtle' */
  atmosphere?: Atmosphere;
  /** Render the Hero-style 3-layer gold beam at the top of the section. Default: false */
  beam?: boolean;
  /** Render corner crosshairs + guide lines (blueprint aesthetic). Default: false */
  constructionMarkers?: boolean;
  className?: string;
  children: React.ReactNode;
};

// ---------------------------------------------------------------------------
// SectionShell
// ---------------------------------------------------------------------------
export function SectionShell({
  id,
  atmosphere = 'subtle',
  beam = false,
  constructionMarkers = false,
  className,
  children,
}: Props) {
  return (
    <section
      id={id}
      className={cn('relative overflow-hidden py-8 md:py-12', className)}
    >
      {/* ========== ATMOSPHERE LAYER ========== */}
      {atmosphere !== 'none' && (
        <div className="absolute inset-0 z-0" aria-hidden="true">
          {atmosphere === 'full' ? (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, var(--bg-section-radial-mid) 0%, var(--bg-section-deep) 60%, var(--bg-section-base) 100%)',
              }}
            />
          ) : (
            // 'subtle' — flat section base colour
            <div className="absolute inset-0 bg-section-base" />
          )}
        </div>
      )}

      {/* ========== ATMOSPHERIC LIGHT BEAM (3 soft layers) — matches Hero.tsx ========== */}
      {beam && (
        <>
          {/* Layer 1 — Ambient glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-20%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '100%',
              background:
                'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(201, 166, 70, 0.18) 0%, rgba(201, 166, 70, 0.10) 25%, rgba(201, 166, 70, 0.04) 50%, transparent 75%)',
              filter: 'blur(40px)',
              zIndex: 1,
            }}
            aria-hidden="true"
          />

          {/* Layer 2 — Medium beam (light volume) */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '90%',
              background:
                'radial-gradient(ellipse 45% 70% at 50% 0%, rgba(230, 195, 100, 0.22) 0%, rgba(220, 180, 80, 0.12) 30%, rgba(201, 166, 70, 0.05) 60%, transparent 85%)',
              mixBlendMode: 'screen',
              filter: 'blur(20px)',
              zIndex: 2,
            }}
            aria-hidden="true"
          />

          {/* Layer 3 — Core highlight (source) */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-5%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '30%',
              height: '70%',
              background:
                'radial-gradient(ellipse 30% 50% at 50% 0%, rgba(255, 220, 140, 0.25) 0%, rgba(230, 195, 100, 0.10) 40%, transparent 80%)',
              mixBlendMode: 'screen',
              filter: 'blur(15px)',
              zIndex: 3,
            }}
            aria-hidden="true"
          />

          {/* Ceiling hairline — "source line" at very top, matches Hero top:78px */}
          <div className="absolute top-[78px] left-0 right-0 h-px pointer-events-none" aria-hidden="true" style={{ zIndex: 4 }}>
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-32 h-px bg-gradient-to-r from-transparent via-[#F4E4B8]/60 to-transparent blur-[0.5px]" />
          </div>
        </>
      )}

      {/* ========== CONSTRUCTION MARKERS ========== */}
      {constructionMarkers && (
        <>
          {/* 4 corner crosshair markers */}
          <div className="absolute top-[40px] left-[18%] pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }}>
            <CrossMarker />
          </div>
          <div className="absolute top-[40px] right-[18%] pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }}>
            <CrossMarker />
          </div>
          <div className="absolute bottom-[40px] left-[18%] pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }}>
            <CrossMarker />
          </div>
          <div className="absolute bottom-[40px] right-[18%] pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }}>
            <CrossMarker />
          </div>

          {/* Vertical guide lines framing the content area */}
          <div className="absolute top-0 left-[18%] w-px h-full bg-gradient-to-b from-transparent via-[#C9A646]/15 to-[#C9A646]/5 pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }} />
          <div className="absolute top-0 right-[18%] w-px h-full bg-gradient-to-b from-transparent via-[#C9A646]/15 to-[#C9A646]/5 pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }} />

          {/* Horizontal guide lines at top/bottom of content area */}
          <div className="absolute top-[40px] left-[18%] right-[18%] h-px bg-gradient-to-r from-transparent via-[#C9A646]/12 to-transparent pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }} />
          <div className="absolute bottom-[40px] left-[18%] right-[18%] h-px bg-gradient-to-r from-transparent via-[#C9A646]/12 to-transparent pointer-events-none" aria-hidden="true" style={{ zIndex: 5 }} />
        </>
      )}

      {/* ========== CONTENT ========== */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
