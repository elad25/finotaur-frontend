/**
 * /journal-copier — wedge landing page for Marketing Launch 1.6.
 *
 * CTA → Whop Journal Premium monthly ($44.99). Verified pricing in
 * whop-config.ts line 89 (plan_v7QKxkvKIZooe).
 */

import { Link } from "react-router-dom";

import Navbar from "@/components/landing-new/Navbar";
import Footer from "@/components/landing-new/Footer";
import { SectionShell } from "@/components/landing-new/_shared/SectionShell";
import { SectionEyebrow } from "@/components/landing-new/_shared/SectionEyebrow";
import { SectionTitle } from "@/components/landing-new/_shared/SectionTitle";
import { Button } from "@/components/ds/Button";
import { Card } from "@/components/ds/Card";
import { SEO } from "@/components/seo/SEO";
import { webPage, breadcrumbList } from "@/components/seo/jsonLd";

const WHOP_URL = "https://whop.com/checkout/plan_N33S1p5Y3dHrK"; // Journal Premium monthly (current plan), $44.99

export default function JournalCopierPage() {
  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Journal + Copier, integrated — $44.99/mo"
        description="Tradervue charges $30. TickTickTrader charges $50–$100. Finotaur ships a trade journal and broker copier as one integrated product for $44.99/month. Same like-for-like scope, one workflow, one subscription."
        path="/journal-copier"
        jsonLd={[
          webPage({ name: "Journal + Copier — Finotaur", description: "Trade journal and broker copier, integrated, $44.99/month.", path: "/journal-copier" }),
          breadcrumbList([["Home", "/"], ["Journal + Copier", "/journal-copier"]]),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true} constructionMarkers={true}>
        <SectionEyebrow>JOURNAL + COPIER · $44.99/MO</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          $30 + $80 = $110.<br />Or <span className="text-gold-primary">$44.99</span>.
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Tradervue journals your trades. TickTickTrader copies them. Finotaur ships both, integrated, for the price of one.
        </p>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <a href={WHOP_URL} target="_blank" rel="noopener noreferrer">
              Start with Journal + Copier — $44.99/mo
            </a>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          <Link to="/pricing-selection" className="hover:text-gold-primary transition-colors">
            Or browse all plans →
          </Link>
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — WEDGE MATH
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>THE MATH</SectionEyebrow>

        <SectionTitle gradient="white">Two subscriptions, separately. Or one platform.</SectionTitle>

        <div className="max-w-3xl mx-auto overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                  Tool
                </th>
                <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                  Function
                </th>
                <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle text-right">
                  Monthly
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary">Tradervue Pro</td>
                <td className="p-ds-3 border-b border-border-ds-subtle text-ink-secondary">Journal</td>
                <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary font-mono tabular-nums text-right">$30</td>
              </tr>
              <tr>
                <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary">TickTickTrader</td>
                <td className="p-ds-3 border-b border-border-ds-subtle text-ink-secondary">Copier</td>
                <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary font-mono tabular-nums text-right">$50–$100</td>
              </tr>
              <tr>
                <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary">Combined</td>
                <td className="p-ds-3 border-b border-border-ds-subtle text-ink-secondary">Journal + Copier</td>
                <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary font-mono tabular-nums text-right">$80–$130</td>
              </tr>
              <tr className="bg-gold-primary/10 border border-gold-primary/30">
                <td className="p-ds-3 text-ink-primary font-medium">Finotaur</td>
                <td className="p-ds-3 text-ink-secondary">Journal + Copier</td>
                <td className="p-ds-3 text-gold-primary font-semibold font-mono tabular-nums text-right">$44.99</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Pricing verified 2026-05-07. Educational only — not financial advice.
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — WHAT YOU GET
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>WHAT YOU GET</SectionEyebrow>

        <SectionTitle gradient="horizontal-gold">One workflow, end to end.</SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">01</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Setup-level tags persist
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              A winning setup tagged in the journal travels into the copier, so the configuration that worked on one broker can be mirrored to another without re-keying.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">02</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              The journal feeds the copier
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Trades you log are trades you can replicate. Not two disconnected workflows — one continuous loop from observation through execution.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">03</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              No spreadsheet stitching
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              No CSV exports between tools. No reconciliation pass on Sunday morning. One subscription, one source of truth, one report.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — CLOSING CTA
      ================================================================ */}
      <SectionShell atmosphere="full" constructionMarkers={true}>
        <SectionEyebrow>GET STARTED</SectionEyebrow>

        <SectionTitle size="large" gradient="vertical-lit">
          Journal + Copier.<br />Integrated. $44.99 a month.
        </SectionTitle>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <a href={WHOP_URL} target="_blank" rel="noopener noreferrer">
              Subscribe — $44.99/month
            </a>
          </Button>
        </div>
      </SectionShell>

      <Footer />
    </div>
  );
}
