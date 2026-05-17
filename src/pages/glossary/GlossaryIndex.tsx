import { Link } from 'react-router-dom';
import { GlossaryLayout } from '@/components/glossary/GlossaryLayout';
import { SEO } from '@/components/seo/SEO';
import { breadcrumbList, webPage } from '@/components/seo/jsonLd';
import { glossaryTerms } from '@/content/glossary/terms';

/**
 * /glossary — index page listing every term.
 */
export default function GlossaryIndex() {
  const description =
    'Plain-English explanations of trading concepts — options flow, dark pools, IV rank, and the terms that actually matter when reading the tape. Written by the Finotaur team.';

  // ItemList structured data — helps Google understand this is a curated index
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Finotaur Trading Glossary',
    description,
    itemListElement: glossaryTerms.map((term, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `https://www.finotaur.com/glossary/${term.slug}`,
      name: term.title,
    })),
  };

  return (
    <>
      <SEO
        title="Trading Glossary"
        description={description}
        path="/glossary"
        jsonLd={[
          webPage({ name: 'Trading Glossary', description, path: '/glossary' }),
          breadcrumbList([
            ['Home', '/'],
            ['Glossary', '/glossary'],
          ]),
          itemListJsonLd,
        ]}
      />
      <GlossaryLayout
        heading="Trading Glossary"
        subtitle="Plain-English explanations of the terms that actually matter when you're reading the tape. No textbook fluff — just what each concept is, why it matters, and where it shows up in practice."
      >
        <p className="not-prose text-sm text-muted-foreground mb-8">
          {glossaryTerms.length} {glossaryTerms.length === 1 ? 'term' : 'terms'} and growing.
        </p>

        <ul className="not-prose space-y-4 list-none p-0">
          {glossaryTerms.map((term) => (
            <li key={term.slug}>
              <Link
                to={`/glossary/${term.slug}`}
                className="group block p-5 rounded-lg border border-border/40 bg-card/30
                           hover:bg-card/60 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-4 mb-1.5">
                  <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {term.title}
                  </span>
                  <span className="text-xs text-muted-foreground/60 flex-shrink-0">
                    Read →
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {term.summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </GlossaryLayout>
    </>
  );
}
