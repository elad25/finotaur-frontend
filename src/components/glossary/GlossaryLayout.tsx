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
  children: ReactNode;
}

/**
 * Shared layout for /glossary and /glossary/:slug pages.
 *
 * Styling is explicit (no `prose` plugin assumed) so this works regardless of
 * whether @tailwindcss/typography is wired into the config.
 */
export function GlossaryLayout({
  heading,
  subtitle,
  showBackLink = false,
  children,
}: GlossaryLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
        {showBackLink && (
          <Link
            to="/glossary"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All terms
          </Link>
        )}

        <header className="mb-10 border-b border-border/40 pb-8">
          <div className="text-xs uppercase tracking-widest text-primary/80 mb-3">
            Trading Glossary
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            {heading}
          </h1>
          {subtitle && (
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </header>

        <article className="glossary-article">
          {children}
        </article>
      </div>

      {/* Scoped typographic styling for glossary article content.
          Inline <style> avoids touching globals.css and keeps the scope local. */}
      <style>{`
        .glossary-article p {
          font-size: 1.0625rem;
          line-height: 1.75;
          color: hsl(var(--foreground) / 0.9);
          margin: 0 0 1.25rem 0;
        }
        .glossary-article h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: hsl(var(--primary) / 0.9);
          margin: 2.5rem 0 1rem 0;
          line-height: 1.3;
        }
        .glossary-article a {
          color: hsl(var(--primary));
          text-decoration: none;
        }
        .glossary-article a:hover {
          text-decoration: underline;
        }
        .glossary-article code {
          background: hsl(var(--card) / 0.4);
          color: hsl(var(--primary));
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .glossary-article strong {
          color: hsl(var(--foreground));
          font-weight: 600;
        }
        .glossary-article em {
          color: hsl(var(--foreground) / 0.95);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
