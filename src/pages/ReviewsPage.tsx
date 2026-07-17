/**
 * /reviews — public reviews page.
 *
 * Lists real Finotaur member testimonials (see `src/data/reviews.ts`,
 * the single source of truth shared with the landing page carousel) as
 * a static, crawlable grid — not a carousel, since a static grid is
 * easier for search engines to index than JS-driven auto-scroll.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 *
 * IMPORTANT: we intentionally do NOT emit ratingValue / reviewRating /
 * aggregateRating anywhere on this page. We have no numeric rating data
 * collected from members, and fabricating one would be a false
 * structured-data claim.
 */

import { Link } from "react-router-dom";
import { Quote } from "lucide-react";

import Navbar from "@/components/landing-new/Navbar";
import Footer from "@/components/landing-new/Footer";
import { SectionShell } from "@/components/landing-new/_shared/SectionShell";
import { SectionEyebrow } from "@/components/landing-new/_shared/SectionEyebrow";
import { SectionTitle } from "@/components/landing-new/_shared/SectionTitle";
import { Button } from "@/components/ds/Button";
import { SEO } from "@/components/seo/SEO";
import { webPage, breadcrumbList } from "@/components/seo/jsonLd";
import { PUBLIC_REVIEWS, type PublicReview } from "@/data/reviews";

// ---------------------------------------------------------------------------
// highlightText — wraps the accent phrase in gold (same approach as
// src/components/landing-new/Testimonials.tsx)
// ---------------------------------------------------------------------------
function highlightText(text: string, highlight: string): React.ReactNode {
  if (!highlight) return text;
  const parts = text.split(highlight);
  if (parts.length < 2) return text;
  return (
    <>
      {parts[0]}
      <span className="text-gold-primary font-semibold">{highlight}</span>
      {parts[1]}
    </>
  );
}

// ---------------------------------------------------------------------------
// ReviewCard
// ---------------------------------------------------------------------------
function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <div
      className={[
        "p-6 rounded-2xl relative group transition-all duration-300",
        "bg-section-card-rest border border-gold-border",
        "shadow-card-rest hover:shadow-card-hover",
      ].join(" ")}
    >
      <Quote className="absolute top-4 right-4 w-8 h-8 text-gold-primary/40" aria-hidden="true" />

      <p className="text-ink-secondary text-sm leading-relaxed mb-4">
        &ldquo;{highlightText(review.text, review.highlight)}&rdquo;
      </p>

      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border border-gold-border"
          style={{
            background: "linear-gradient(135deg, var(--gold-primary), rgba(168,136,56,1))",
            color: "var(--text-on-gold)",
          }}
        >
          {review.avatar}
        </div>
        <div>
          <p className="text-ink-primary font-semibold text-sm">{review.name}</p>
          <p className="text-ink-tertiary text-xs">{review.role}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SoftwareApplication + review JSON-LD — built inline for this page.
// No ratingValue / reviewRating / aggregateRating anywhere — no numeric
// rating data exists, so none is fabricated.
// ---------------------------------------------------------------------------
function buildReviewsSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Finotaur",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://www.finotaur.com",
    review: PUBLIC_REVIEWS.map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.name,
      },
      reviewBody: review.text,
    })),
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Reviews — What Traders Say About the AI Trading Journal"
        description="Read real reviews from Finotaur members on the auto-syncing trading journal, AI trading coach, and market intelligence tools. See what traders say about trading with Finotaur."
        path="/reviews"
        jsonLd={[
          webPage({
            name: "Finotaur Reviews",
            description:
              "Real reviews from Finotaur members on the auto-syncing trading journal, AI trading coach, and market intelligence tools.",
            path: "/reviews",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Reviews", "/reviews"],
          ]),
          buildReviewsSchema(),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>REVIEWS</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          Finotaur Reviews
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          What real traders say about trading with FINOTAUR.
        </p>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Last updated: July 2026
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — REVIEW GRID
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>FROM OUR MEMBERS</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          What Our Members Say
        </SectionTitle>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-ds-5 mt-ds-7 max-w-6xl mx-auto">
          {PUBLIC_REVIEWS.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — SHARE YOUR EXPERIENCE
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>SHARE YOUR EXPERIENCE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Trading with Finotaur?
        </SectionTitle>

        <p className="text-ink-secondary text-[15px] leading-relaxed text-center max-w-xl mx-auto mt-ds-4">
          If you're a Finotaur member, we'd love to hear about your experience with the journal, the
          AI coach, or the market intelligence tools. Reach out and let us know — submitted reviews
          may be published on this page.
        </p>

        <div className="flex justify-center mt-ds-6">
          <Button asChild variant="goldOutline" size="lg">
            <Link to="/contact">Send your review</Link>
          </Button>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — FINAL CTA
      ================================================================ */}
      <SectionShell atmosphere="full" beam={true}>
        <SectionEyebrow>GET STARTED</SectionEyebrow>

        <SectionTitle as="h2" size="lg" gradient="split">
          See what Finotaur can do for your trading
        </SectionTitle>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start free</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          No card required for the free tier. Cancel anytime.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
