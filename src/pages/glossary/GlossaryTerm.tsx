import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { GlossaryLayout } from '@/components/glossary/GlossaryLayout';
import { SEO } from '@/components/seo/SEO';
import { breadcrumbList } from '@/components/seo/jsonLd';
import { getGlossaryTerm, glossaryBySlug, glossaryTerms } from '@/content/glossary/terms';

const SITE_URL = 'https://www.finotaur.com';

/**
 * /glossary/:slug — dynamic term page.
 *
 * On unknown slug, redirects to the glossary index. (We could 404, but a
 * redirect feels less broken when someone follows a stale link.)
 */
export default function GlossaryTerm() {
  const { slug } = useParams<{ slug: string }>();
  const term = slug ? getGlossaryTerm(slug) : undefined;

  if (!term) {
    return <Navigate to="/glossary" replace />;
  }

  const path = `/glossary/${term.slug}`;
  const Content = term.Component;

  // Position of this term in the master list — drives the magazine "№ 01" label
  const termIdx = glossaryTerms.findIndex((t) => t.slug === term.slug);
  const termNumber = termIdx >= 0 ? String(termIdx + 1).padStart(2, '0') : undefined;

  // DefinedTerm structured data — tells Google this page defines a vocabulary term.
  // Specific to glossary content and richer than a generic Article schema.
  const definedTermJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term.title,
    description: term.summary,
    url: `${SITE_URL}${path}`,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Finotaur Trading Glossary',
      url: `${SITE_URL}/glossary`,
    },
    dateModified: term.published,
  };

  const relatedTerms = term.related
    .map((s) => glossaryBySlug[s])
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <>
      <SEO
        title={`${term.title}`}
        description={term.summary}
        path={path}
        jsonLd={[
          definedTermJsonLd,
          breadcrumbList([
            ['Home', '/'],
            ['Glossary', '/glossary'],
            [term.title, path],
          ]),
        ]}
      />
      <GlossaryLayout
        heading={term.title}
        subtitle={term.summary}
        eyebrow={`Finotaur · Glossary · ${term.keyword.toUpperCase()}`}
        termNumber={termNumber}
        showBackLink
      >
        <Content />

        {relatedTerms.length > 0 && (
          <aside className="not-prose mt-20 pt-10 relative">
            {/* Gold hairline divider above "See also" */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

            <div className="text-[10px] uppercase tracking-[0.28em] text-[#C9A646]/85 mb-7">
              Continue Reading
            </div>

            <ul className="space-y-3 list-none p-0">
              {relatedTerms.map((rt) => (
                <li key={rt.slug}>
                  <Link
                    to={`/glossary/${rt.slug}`}
                    className="group flex items-start gap-4 px-5 py-4 rounded-sm
                               border border-white/[0.06] bg-white/[0.015]
                               hover:border-[#C9A646]/35 hover:bg-[#C9A646]/[0.03]
                               transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span
                          className="text-base md:text-lg font-medium text-white
                                     group-hover:text-[#F4E4B8] transition-colors"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          {rt.title}
                        </span>
                        <ArrowUpRight
                          className="w-3.5 h-3.5 text-white/30 group-hover:text-[#C9A646]
                                     group-hover:translate-x-0.5 group-hover:-translate-y-0.5
                                     transition-all"
                        />
                      </div>
                      <p className="text-sm leading-relaxed text-white/55 group-hover:text-white/70 transition-colors">
                        {rt.summary}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </GlossaryLayout>
    </>
  );
}
