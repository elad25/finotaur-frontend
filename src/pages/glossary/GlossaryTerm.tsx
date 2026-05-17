import { Link, useParams, Navigate } from 'react-router-dom';
import { GlossaryLayout } from '@/components/glossary/GlossaryLayout';
import { SEO } from '@/components/seo/SEO';
import { breadcrumbList } from '@/components/seo/jsonLd';
import { getGlossaryTerm, glossaryBySlug } from '@/content/glossary/terms';

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
        showBackLink
      >
        <Content />

        {relatedTerms.length > 0 && (
          <aside className="not-prose mt-16 pt-8 border-t border-border/40">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              See also
            </div>
            <ul className="space-y-2 list-none p-0">
              {relatedTerms.map((rt) => (
                <li key={rt.slug}>
                  <Link
                    to={`/glossary/${rt.slug}`}
                    className="text-primary hover:underline"
                  >
                    {rt.title}
                  </Link>
                  <span className="text-sm text-muted-foreground ml-2">
                    — {rt.summary}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </GlossaryLayout>
    </>
  );
}
