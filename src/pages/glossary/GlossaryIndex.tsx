import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { GlossaryLayout } from '@/components/glossary/GlossaryLayout';
import { SEO } from '@/components/seo/SEO';
import { breadcrumbList, webPage } from '@/components/seo/jsonLd';
import { glossaryTerms } from '@/content/glossary/terms';

/**
 * /glossary — index page listing every term.
 * Card list rendered as magazine TOC: number, title, summary, gold hover.
 */
export default function GlossaryIndex() {
  const description =
    'Plain-English explanations of trading concepts — options flow, dark pools, IV rank, and the terms that actually matter when reading the tape. Written by the Finotaur team.';

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
        heading="The Glossary"
        eyebrow="Finotaur · Knowledge"
        subtitle="Plain-English explanations of the terms that actually matter when you're reading the tape. No textbook fluff — just what each concept is, why it matters, and where it shows up in practice."
      >
        {/* Count + cadence note */}
        <div className="flex items-baseline justify-between mb-10 -mt-2">
          <span className="font-mono text-xs tracking-[0.18em] text-white/40">
            {String(glossaryTerms.length).padStart(2, '0')} {glossaryTerms.length === 1 ? 'TERM' : 'TERMS'}
          </span>
          <span className="font-mono text-xs tracking-[0.18em] text-white/30">
            UPDATED CONTINUOUSLY
          </span>
        </div>

        {/* Term cards */}
        <ul className="not-prose space-y-3 list-none p-0">
          {glossaryTerms.map((term, idx) => (
            <li key={term.slug}>
              <Link
                to={`/glossary/${term.slug}`}
                className="group relative block px-6 py-7 md:px-8 md:py-8 rounded-sm
                           border border-white/[0.06]
                           bg-gradient-to-b from-white/[0.025] to-transparent
                           hover:border-[#C9A646]/40 hover:from-[#C9A646]/[0.04]
                           transition-all duration-300
                           overflow-hidden"
                style={{
                  boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset',
                }}
              >
                {/* Gold edge accent on left (appears on hover) */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-px
                             bg-gradient-to-b from-transparent via-[#C9A646]/60 to-transparent
                             opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />

                <div className="flex items-start gap-5 md:gap-7">
                  {/* Number */}
                  <span
                    className="font-mono text-xs tracking-[0.18em] text-[#C9A646]/70
                               pt-1 flex-shrink-0 w-8 group-hover:text-[#C9A646] transition-colors"
                  >
                    №{String(idx + 1).padStart(2, '0')}
                  </span>

                  {/* Title + summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h2
                        className="text-xl md:text-2xl font-medium text-white
                                   group-hover:text-[#F4E4B8] transition-colors"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.01em' }}
                      >
                        {term.title}
                      </h2>
                      <ArrowUpRight
                        className="w-4 h-4 text-white/30 group-hover:text-[#C9A646]
                                   group-hover:translate-x-0.5 group-hover:-translate-y-0.5
                                   transition-all duration-300"
                      />
                    </div>
                    <p className="text-sm md:text-[0.95rem] leading-relaxed text-white/60
                                  group-hover:text-white/75 transition-colors">
                      {term.summary}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Closing note */}
        <div className="mt-16 pt-10 border-t border-white/[0.06]">
          <p className="text-sm text-white/40 text-center font-light italic"
             style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            New entries added weekly. Suggest a term:{' '}
            <a href="mailto:hello@finotaur.com" className="text-[#C9A646] hover:underline">
              hello@finotaur.com
            </a>
          </p>
        </div>
      </GlossaryLayout>
    </>
  );
}
