import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/landing-new/Navbar';

interface GlossaryLayoutProps {
  /** Page heading (term title, or "Glossary" for index) */
  heading: string;
  /** Subtitle / summary line */
  subtitle?: string;
  /** Show "Back to Glossary" link (only on term pages) */
  showBackLink?: boolean;
  /** Eyebrow label above heading (e.g. "Term · Options") */
  eyebrow?: string;
  /** Term position number, e.g. "01" (only for term pages — adds magazine feel) */
  termNumber?: string;
  children: ReactNode;
}

/**
 * Premium magazine-style layout for /glossary and /glossary/:slug pages.
 *
 * Visual language mirrors the LandingPage Hero/Section components:
 *  - Deep radial atmosphere (no flat black background)
 *  - 3-layer gold light beam from above
 *  - Playfair Display serif for the title (matches landing heading-serif)
 *  - Hairline gold rule under header
 *  - Construction crosshairs at corners
 *  - Generous reading width (max-w-2xl) + magazine-paragraph spacing
 *  - Drop-cap on first paragraph of article body
 */
export function GlossaryLayout({
  heading,
  subtitle,
  showBackLink = false,
  eyebrow,
  termNumber,
  children,
}: GlossaryLayoutProps) {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Playfair Display for headings — matches LandingPage heading-serif */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        .glossary-heading-serif {
          font-family: 'Playfair Display', Georgia, serif;
          letter-spacing: -0.02em;
        }
        .glossary-article p {
          font-size: 1.0625rem;
          line-height: 1.85;
          color: rgba(255, 255, 255, 0.86);
          margin: 0 0 1.4rem 0;
          letter-spacing: 0.005em;
        }
        .glossary-article h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.65rem;
          font-weight: 500;
          color: rgba(244, 228, 184, 0.95);
          margin: 3rem 0 1.1rem 0;
          line-height: 1.3;
          letter-spacing: -0.01em;
        }
        .glossary-article a {
          color: #C9A646;
          text-decoration: none;
          border-bottom: 1px solid rgba(201, 166, 70, 0.35);
          transition: border-color 0.2s ease, color 0.2s ease;
        }
        .glossary-article a:hover {
          color: #E6C364;
          border-bottom-color: rgba(230, 195, 100, 0.7);
        }
        .glossary-article code {
          background: rgba(201, 166, 70, 0.08);
          color: #E6C364;
          padding: 0.125rem 0.4rem;
          border-radius: 3px;
          font-size: 0.92em;
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
          border: 1px solid rgba(201, 166, 70, 0.15);
        }
        .glossary-article strong {
          color: rgba(255, 255, 255, 0.98);
          font-weight: 600;
        }
        .glossary-article em {
          color: rgba(244, 228, 184, 0.92);
          font-style: italic;
        }
        /* Drop-cap on first paragraph */
        .glossary-article > p:first-child::first-letter {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 3.8rem;
          line-height: 0.9;
          float: left;
          margin: 0.3rem 0.6rem 0 0;
          color: #C9A646;
          font-weight: 500;
        }
      `}</style>

      {/* ===== ATMOSPHERE — radial gradient depth ===== */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(40, 32, 18, 0.5) 0%, rgba(15, 13, 10, 0.95) 50%, #0a0a0a 100%)',
          }}
        />
        {/* Layer 1 — ambient gold glow */}
        <div
          className="absolute"
          style={{
            top: '-15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120%',
            height: '70%',
            background:
              'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(201,166,70,0.16) 0%, rgba(201,166,70,0.08) 30%, rgba(201,166,70,0.02) 55%, transparent 75%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Layer 2 — medium beam */}
        <div
          className="absolute"
          style={{
            top: '-8%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: '60%',
            background:
              'radial-gradient(ellipse 45% 70% at 50% 0%, rgba(230,195,100,0.18) 0%, rgba(220,180,80,0.08) 35%, transparent 70%)',
            mixBlendMode: 'screen',
            filter: 'blur(25px)',
          }}
        />
        {/* Ceiling hairline */}
        <div className="absolute top-[78px] left-0 right-0 h-px">
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-32 h-px bg-gradient-to-r from-transparent via-[#F4E4B8]/55 to-transparent blur-[0.5px]" />
        </div>
      </div>

      {/* ===== CORNER CROSSHAIRS — blueprint signature ===== */}
      <svg
        className="absolute top-[120px] left-8 md:left-16 w-3.5 h-3.5 pointer-events-none opacity-60"
        viewBox="0 0 14 14" fill="none" aria-hidden="true"
      >
        <line x1="7" y1="2" x2="7" y2="12" stroke="rgba(201,166,70,0.7)" strokeWidth="0.8" />
        <line x1="2" y1="7" x2="12" y2="7" stroke="rgba(201,166,70,0.7)" strokeWidth="0.8" />
      </svg>
      <svg
        className="absolute top-[120px] right-8 md:right-16 w-3.5 h-3.5 pointer-events-none opacity-60"
        viewBox="0 0 14 14" fill="none" aria-hidden="true"
      >
        <line x1="7" y1="2" x2="7" y2="12" stroke="rgba(201,166,70,0.7)" strokeWidth="0.8" />
        <line x1="2" y1="7" x2="12" y2="7" stroke="rgba(201,166,70,0.7)" strokeWidth="0.8" />
      </svg>

      <Navbar />

      {/* ===== CONTENT ===== */}
      <div className="relative z-10 container mx-auto px-6 pt-32 pb-24 max-w-2xl">
        {showBackLink && (
          <Link
            to="/glossary"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50 hover:text-[#C9A646] mb-10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All terms
          </Link>
        )}

        {/* ===== HEADER ===== */}
        <header className="mb-16">
          <div className="flex items-baseline gap-4 mb-5">
            {termNumber && (
              <span className="font-mono text-xs tracking-[0.2em] text-[#C9A646]/80">
                №&nbsp;{termNumber}
              </span>
            )}
            <div className="text-xs uppercase tracking-[0.22em] text-[#C9A646]/85">
              {eyebrow ?? 'Finotaur · Glossary'}
            </div>
          </div>

          <h1 className="glossary-heading-serif text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.05] mb-7 text-white">
            {heading}
          </h1>

          {subtitle && (
            <p className="text-lg md:text-xl leading-relaxed text-white/70 max-w-xl font-light">
              {subtitle}
            </p>
          )}

          {/* Hairline gold divider */}
          <div className="mt-12 relative">
            <div className="h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
            <div className="absolute left-1/2 -translate-x-1/2 -top-px w-24 h-px bg-gradient-to-r from-transparent via-[#F4E4B8]/70 to-transparent blur-[0.5px]" />
          </div>
        </header>

        {/* ===== ARTICLE ===== */}
        <article className="glossary-article">
          {children}
        </article>
      </div>
    </div>
  );
}
