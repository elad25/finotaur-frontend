import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { webPage, breadcrumbList } from '@/components/seo/jsonLd';

/**
 * LEGAL & DISCLOSURES HUB
 * Index page linking every legal document, organized by category.
 */

type LegalLink = { label: string; href: string; description: string };
type LegalSection = { heading: string; intro?: string; links: LegalLink[] };

const sections: LegalSection[] = [
  {
    heading: 'Terms of Service',
    intro: 'The agreements that govern your use of Finotaur.',
    links: [
      { label: 'Terms of Use', href: '/legal/terms', description: 'The master agreement between you and Finotaur.' },
      { label: 'Privacy Policy', href: '/legal/privacy', description: 'What data we collect, how we use it, and your rights.' },
      { label: 'Cookie Policy', href: '/legal/cookies', description: 'Cookies and similar tracking technologies we use.' },
      { label: 'Acceptable Use', href: '/legal/acceptable-use', description: 'Rules of conduct on the platform.' },
      { label: 'Refund Policy', href: '/legal/refund', description: 'Subscription cancellation and refund eligibility.' },
    ],
  },
  {
    heading: 'Trading Risk Disclosures',
    intro: 'Disclosures required for trading-related content and integrations.',
    links: [
      { label: 'Risk Disclosure', href: '/legal/risk-disclosure', description: 'General trading and investment risk overview.' },
      { label: 'Futures Risk Disclosure', href: '/legal/futures-risk', description: 'Risk disclosure specific to futures and options on futures.' },
      { label: 'CFTC Hypothetical Performance Disclosure', href: '/legal/cftc-hypothetical-performance', description: 'CFTC Rule 4.41(b) language for backtests and simulated results.' },
    ],
  },
  {
    heading: 'Endorsements & Affiliations',
    intro: 'How we handle testimonials, paid partnerships, and affiliate links.',
    links: [
      { label: 'Testimonial Disclaimer', href: '/legal/testimonial-disclaimer', description: 'Individual results may vary; testimonials are not typical.' },
      { label: 'Affiliate Disclosure', href: '/legal/affiliate-disclosure', description: 'FTC-required disclosure for affiliate and partner links.' },
    ],
  },
  {
    heading: 'Other Policies',
    links: [
      { label: 'Disclaimer', href: '/legal/disclaimer', description: 'General site disclaimer.' },
      { label: 'AI Disclaimer', href: '/legal/ai-disclaimer', description: 'Disclaimer covering AI-generated content and analytics.' },
      { label: 'Copyright', href: '/legal/copyright', description: 'Copyright notice and intellectual property rights.' },
      { label: 'DMCA', href: '/legal/dmca', description: 'DMCA takedown procedure for copyright infringement claims.' },
    ],
  },
];

const LegalHub = () => {
  const description = 'Finotaur legal hub — Terms of Use, Privacy Policy, Cookie Policy, Risk Disclosures, and all compliance documents in one place.';

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Legal & Disclosures"
        description={description}
        path="/legal"
        jsonLd={[
          webPage({ name: 'Legal & Disclosures', description, path: '/legal' }),
          breadcrumbList([
            ['Home', '/'],
            ['Legal', '/legal'],
          ]),
        ]}
      />
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30">
        <div className="container mx-auto px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-4">Legal &amp; Disclosures</h1>
          <p className="text-muted-foreground mb-12">
            The complete list of Finotaur's legal documents, compliance disclosures, and policy pages.
          </p>

          {sections.map((section) => (
            <section key={section.heading} className="mb-12">
              <h2 className="text-2xl font-semibold mb-2">{section.heading}</h2>
              {section.intro && (
                <p className="text-sm text-muted-foreground mb-6">{section.intro}</p>
              )}
              <ul className="not-prose space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="group flex items-start justify-between gap-4 p-4 rounded-lg border border-border/40 bg-card/30 hover:bg-card/60 hover:border-border transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {link.label}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {link.description}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="mt-16 text-sm text-muted-foreground">
            Questions about any policy? Email{' '}
            <a href="mailto:support@finotaur.com" className="text-primary hover:underline">
              support@finotaur.com
            </a>
            .
          </p>

          <p className="mt-8 text-muted-foreground">
            &copy; {new Date().getFullYear()} Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalHub;
