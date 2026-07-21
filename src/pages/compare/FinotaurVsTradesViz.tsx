/**
 * /finotaur-vs-tradesviz — SEO comparison landing page.
 *
 * Target keyword: "finotaur vs tradesviz"
 * Audience: futures traders comparing Finotaur to TradesViz.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Minus as DashIcon, Plus, Minus } from "lucide-react";

import Navbar from "@/components/landing-new/Navbar";
import Footer from "@/components/landing-new/Footer";
import { SectionShell } from "@/components/landing-new/_shared/SectionShell";
import { SectionEyebrow } from "@/components/landing-new/_shared/SectionEyebrow";
import { SectionTitle } from "@/components/landing-new/_shared/SectionTitle";
import { Button } from "@/components/ds/Button";
import { Card } from "@/components/ds/Card";
import { SEO } from "@/components/seo/SEO";
import { webPage, breadcrumbList, faqPage } from "@/components/seo/jsonLd";

// ---------------------------------------------------------------------------
// FAQ data — single source of truth for both the accordion and faqPage() schema
// ---------------------------------------------------------------------------
const FAQS = [
  {
    question: "Is TradesViz really free?",
    answer:
      "Yes — as of July 2026, TradesViz offers a genuine free-forever plan covering up to 3,000 executions/month with basic analytics, no card required. It's the strongest free tier in this category, and we say so plainly. Finotaur also has a free plan (a 10-trade demo journal), but TradesViz's free tier goes further on volume.",
  },
  {
    question: "Which is better for prop-firm traders?",
    answer:
      "Both support prop-firm accounts, but with different tools. TradesViz's Platinum tier adds prop-firm compliance tracking (rule checks against your firm's requirements). Finotaur has a live prop-risk dashboard that tracks real-time drawdown distance and daily-loss capacity. If you want compliance-rule tracking, TradesViz's approach fits; if you want a live risk gauge, Finotaur's does.",
  },
  {
    question: "Does TradesViz have a trade copier?",
    answer:
      "No — as of July 2026, TradesViz does not offer a trade copier. Finotaur includes a built-in copier for self-copying trades across your own connected accounts.",
  },
  {
    question: "Which has better AI analysis?",
    answer:
      "It depends what you want from AI. TradesViz's Platinum-tier AI Coach gives you review, Q&A over your trades, and daily summaries — a dashboard you interpret. Finotaur's FINO coach is more opinionated: it runs daily briefings and a Leak Detector across 7 diagnostic families that name your costliest mistake in dollar terms, plus a Revenge Radar for emotional trading. Neither is objectively \"better\" — one hands you data, the other hands you a verdict.",
  },
];

// ---------------------------------------------------------------------------
// Comparison table rows
// ---------------------------------------------------------------------------
type RowValue = { kind: "yes" } | { kind: "no" } | { kind: "text"; label: string };

const COMPARISON_ROWS: Array<{ feature: string; tradesviz: RowValue; finotaur: RowValue }> = [
  {
    feature: "Entry price",
    tradesviz: { kind: "text", label: "$0/mo forever (Free)" },
    finotaur: { kind: "text", label: "$0/mo (Free plan)" },
  },
  {
    feature: "Free plan",
    tradesviz: { kind: "text", label: "Yes — up to 3,000 executions/mo" },
    finotaur: { kind: "text", label: "Yes — 10-trade demo journal" },
  },
  {
    feature: "Tradovate auto-sync",
    tradesviz: { kind: "yes" },
    finotaur: { kind: "yes" },
  },
  {
    feature: "AI approach",
    tradesviz: { kind: "text", label: "AI Coach review + Q&A dashboards (Platinum)" },
    finotaur: { kind: "text", label: "Opinionated coach, dollar-quantified leaks" },
  },
  {
    feature: "Built-in trade copier",
    tradesviz: { kind: "no" },
    finotaur: { kind: "yes" },
  },
  {
    feature: "Prop-firm tooling",
    tradesviz: { kind: "text", label: "Compliance rule tracking (Platinum)" },
    finotaur: { kind: "text", label: "Live drawdown + daily-loss dashboard" },
  },
  {
    feature: "Analytics depth (chart types)",
    tradesviz: { kind: "text", label: "100+ chart types" },
    finotaur: { kind: "text", label: "Fewer, more opinionated views" },
  },
  {
    feature: "Trustpilot",
    tradesviz: { kind: "text", label: "4.3 (92 reviews, unclaimed profile)" },
    finotaur: { kind: "text", label: "No profile yet" },
  },
];

function RowCell({ value }: { value: RowValue }) {
  if (value.kind === "yes") {
    return <Check className="w-4 h-4 text-gold-primary mx-auto" aria-label="Yes" />;
  }
  if (value.kind === "no") {
    return <X className="w-4 h-4 text-ink-tertiary mx-auto" aria-label="No" />;
  }
  return <span className="text-ink-secondary text-[13px]">{value.label}</span>;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function FinotaurVsTradesViz() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Finotaur vs TradesViz (2026)"
        titleAsIs
        description="An honest comparison of Finotaur and TradesViz for futures traders: free plans, Tradovate auto-sync, AI analysis, trade copier, and prop-firm tools — checked from TradesViz's published pages, July 2026."
        path="/finotaur-vs-tradesviz"
        jsonLd={[
          webPage({
            name: "Finotaur vs TradesViz (2026)",
            description:
              "Side-by-side comparison of Finotaur and TradesViz: pricing, Tradovate auto-sync, AI analysis, trade copier, and prop-firm tooling.",
            path: "/finotaur-vs-tradesviz",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Finotaur vs TradesViz", "/finotaur-vs-tradesviz"],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>COMPARISON · JULY 2026</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          Finotaur vs TradesViz
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          TradesViz is the value king — a real free-forever plan and very deep analytics.
          Finotaur trades raw chart count for an opinionated AI coach that names your leaks in
          dollars, a built-in trade copier, prop-risk tracking, and a market-intelligence terminal
          in one product.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start free</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4 max-w-xl mx-auto">
          Methodology: TradesViz pricing and features checked from its published pages, July 2026.
          We build Finotaur — assume we're biased, and check the sources yourself.
          <br />
          Last updated: July 2026.
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — QUICK VERDICT
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>QUICK VERDICT</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Who should pick which
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Pick TradesViz if...
            </h3>
            <ul className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3 space-y-ds-2">
              <li>You want the strongest free-forever tier in the category (up to 3,000 executions/mo).</li>
              <li>You want the deepest analytics available — 100+ chart types.</li>
              <li>You're comfortable interpreting dashboards yourself rather than getting a verdict.</li>
            </ul>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Pick Finotaur if...
            </h3>
            <ul className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3 space-y-ds-2">
              <li>You want an AI coach that names your costliest mistake in dollars, not just a chart.</li>
              <li>You want a built-in trade copier and a live prop-risk dashboard in the same product.</li>
              <li>You want market-intelligence tools (AI stock/macro analysis) alongside your journal.</li>
            </ul>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — COMPARISON TABLE
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>SIDE BY SIDE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Finotaur vs TradesViz, feature by feature
        </SectionTitle>

        <div className="mt-ds-7 max-w-3xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                    Feature
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle text-center">
                    TradesViz
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-gold-primary p-ds-3 border-b border-border-ds-subtle text-center">
                    Finotaur
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary text-sm">
                      {row.feature}
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-center">
                      <RowCell value={row.tradesviz} />
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-center">
                      <RowCell value={row.finotaur} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-ink-tertiary text-[12px] text-center mt-ds-4 flex items-center justify-center gap-1">
            <DashIcon className="w-3 h-3" /> Some reviewers describe TradesViz's import flow as
            clunky and its UI as dense for beginners.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — PRICING COMPARED
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>PRICING</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Pricing compared
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-3xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">TradesViz</h3>
            <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-4 space-y-ds-2">
              <li>Free — $0 forever, up to 3,000 executions/mo</li>
              <li>Pro — $14.99/mo annual ($19.99 monthly)</li>
              <li>Platinum — $22.49/mo annual ($29.99 monthly)</li>
              <li>7-day trial on paid tiers</li>
              <li>AI, universal simulator, options flow, prop compliance & backtester on Platinum</li>
            </ul>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">Finotaur</h3>
            <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-4 space-y-ds-2">
              <li>Free — $0/month, 10-trade demo journal, no card</li>
              <li>Trader — $44.99/mo or $409/yr</li>
              <li>Tradovate OAuth auto-sync, multiple accounts (funded/eval)</li>
              <li>AI coach, Leak Detector, Revenge Radar, trade copier, prop-risk dashboard included</li>
            </ul>
          </Card>
        </div>

        <div className="flex flex-col items-center gap-ds-5 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start free — 14 days of full access</Link>
          </Button>
          <Link
            to="/pricing"
            className="text-ink-secondary text-sm hover:text-gold-primary transition-colors"
          >
            See full pricing →
          </Link>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — DIFFERENT PHILOSOPHIES
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>WHAT'S DIFFERENT</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Different philosophies
        </SectionTitle>

        <div className="max-w-2xl mx-auto mt-ds-6">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            TradesViz's philosophy is data-rich dashboards you interpret yourself — 100+ chart
            types, a universal simulator across 40,000+ tickers, and deep analytics, all for a
            genuinely free-forever entry tier. Finotaur's philosophy is an AI that tells you what's
            costing you money: the Leak Detector runs 7 diagnostic families against your trades and
            names the specific pattern in dollar terms, the Revenge Radar flags emotional trading
            in the moment, and a built-in trade copier plus live prop-risk dashboard extend the
            product beyond review into execution and risk. Neither approach is wrong — TradesViz
            gives you more raw material, Finotaur gives you more of a verdict.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Finotaur vs TradesViz — frequently asked questions
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-7 space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 + index * 0.04 }}
              >
                <div
                  className="rounded-xl overflow-hidden transition-all duration-300"
                  style={{
                    background: isOpen
                      ? "linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(10,10,10,0.95) 100%)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${
                      isOpen ? "rgba(201,166,70,0.25)" : "rgba(255,255,255,0.06)"
                    }`,
                  }}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-5 md:p-6 text-left group"
                  >
                    <span
                      className={`text-base md:text-lg font-semibold pr-4 transition-colors duration-300 ${
                        isOpen
                          ? "text-gold-primary"
                          : "text-ink-primary group-hover:text-ink-secondary"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
                      style={{
                        background: isOpen
                          ? "rgba(201,166,70,0.2)"
                          : "rgba(255,255,255,0.05)",
                        border: `1px solid ${
                          isOpen ? "rgba(201,166,70,0.4)" : "rgba(255,255,255,0.1)"
                        }`,
                      }}
                    >
                      {isOpen ? (
                        <Minus className="w-4 h-4 text-gold-primary" />
                      ) : (
                        <Plus className="w-4 h-4 text-ink-tertiary" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 md:px-6 pb-5 md:pb-6">
                          <div className="h-px bg-gradient-to-r from-gold-border via-gold-border/50 to-transparent mb-4" />
                          <p className="text-ink-secondary leading-relaxed text-sm md:text-base">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 7 — RELATED COMPARISONS
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>KEEP EXPLORING</SectionEyebrow>

        <SectionTitle as="h2" size="large" gradient="split">
          More ways to evaluate Finotaur
        </SectionTitle>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-6">
          <Link
            to="/best-trading-journal"
            className="text-ink-secondary text-sm hover:text-gold-primary transition-colors"
          >
            Best Trading Journal →
          </Link>
          <Link
            to="/tradezella-alternative"
            className="text-ink-secondary text-sm hover:text-gold-primary transition-colors"
          >
            Finotaur as a TradeZella Alternative →
          </Link>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 8 — FINAL CTA
      ================================================================ */}
      <SectionShell atmosphere="subtle" beam={true}>
        <SectionEyebrow>GET STARTED</SectionEyebrow>

        <SectionTitle as="h2" size="large" gradient="split">
          Try the journal built for futures traders
        </SectionTitle>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start free</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          No card required for the free plan. Cancel anytime.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
