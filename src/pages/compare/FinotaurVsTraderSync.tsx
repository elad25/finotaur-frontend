/**
 * /finotaur-vs-tradersync — SEO comparison landing page.
 *
 * Target keyword: "finotaur vs tradersync"
 * Audience: futures traders comparing Finotaur to TraderSync.
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
    question: "Which is better for prop-firm traders, Finotaur or TraderSync?",
    answer:
      "Finotaur is built futures-first with a dedicated prop-risk dashboard that tracks live drawdown distance and daily-loss capacity in real time. TraderSync supports basic multi-account and funded-account tracking, but as of July 2026 it does not advertise a dedicated prop-risk dashboard — so if that specific tool matters to you, Finotaur is the closer fit.",
  },
  {
    question: "Does TraderSync have a trade copier?",
    answer:
      "No — as of July 2026, TraderSync does not offer a trade copier. Finotaur includes a built-in copier for self-copying trades across your own connected accounts (for example, mirroring a strategy from a personal account into a funded evaluation account).",
  },
  {
    question: "Which one has a free plan?",
    answer:
      "Finotaur has a genuine free plan (a 10-trade demo journal, no card required), and every new account also automatically gets 14 days of full access to Trader and Investor features before falling back to that free plan. TraderSync does not offer a free plan — it offers a 7-day free trial across all of its paid tiers, starting at $22.46/month billed annually.",
  },
  {
    question: "Does TraderSync auto-sync with Tradovate?",
    answer:
      "TraderSync's own broker pages list Tradovate and NinjaTrader with \"Autosync\" support — that's TraderSync's claim, not independently verified by us. Finotaur connects to Tradovate through a read/write-scoped OAuth API integration that imports fills, orders, fees, and positions automatically, with no manual entry.",
  },
];

// ---------------------------------------------------------------------------
// Comparison table rows
// ---------------------------------------------------------------------------
type RowValue = { kind: "yes" } | { kind: "no" } | { kind: "text"; label: string };

const COMPARISON_ROWS: Array<{ feature: string; tradersync: RowValue; finotaur: RowValue }> = [
  {
    feature: "Entry price (billed annually)",
    tradersync: { kind: "text", label: "$22.46/mo (Pro)" },
    finotaur: { kind: "text", label: "$0 (Free plan)" },
  },
  {
    feature: "Free plan",
    tradersync: { kind: "no" },
    finotaur: { kind: "yes" },
  },
  {
    feature: "Free trial",
    tradersync: { kind: "text", label: "7 days, all plans" },
    finotaur: { kind: "text", label: "14-day welcome (new accounts), no card" },
  },
  {
    feature: "Tradovate sync",
    tradersync: { kind: "text", label: "\"Autosync\" (vendor claim)" },
    finotaur: { kind: "text", label: "OAuth API auto-sync" },
  },
  {
    feature: "AI coach",
    tradersync: { kind: "text", label: "Cypher — capped 5/15/60 msgs/day by tier" },
    finotaur: { kind: "text", label: "FINO — daily briefings, Leak Detector, Revenge Radar" },
  },
  {
    feature: "Built-in trade copier",
    tradersync: { kind: "no" },
    finotaur: { kind: "yes" },
  },
  {
    feature: "Dedicated prop-risk dashboard",
    tradersync: { kind: "text", label: "Basic funded-account tracking only" },
    finotaur: { kind: "text", label: "Live drawdown + daily-loss capacity" },
  },
  {
    feature: "Market-replay simulator (Level II)",
    tradersync: { kind: "yes" },
    finotaur: { kind: "no" },
  },
  {
    feature: "Trustpilot",
    tradersync: { kind: "text", label: "4.4 (316 reviews)" },
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
export default function FinotaurVsTraderSync() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Finotaur vs TraderSync (2026)"
        titleAsIs
        description="An honest comparison of Finotaur and TraderSync for futures traders: pricing, Tradovate sync, AI coaching, trade copier, and prop-risk tools — checked from TraderSync's published pages, July 2026."
        path="/finotaur-vs-tradersync"
        jsonLd={[
          webPage({
            name: "Finotaur vs TraderSync (2026)",
            description:
              "Side-by-side comparison of Finotaur and TraderSync: pricing, Tradovate sync, AI coach, trade copier, and prop-firm tooling.",
            path: "/finotaur-vs-tradersync",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Finotaur vs TraderSync", "/finotaur-vs-tradersync"],
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
          Finotaur vs TraderSync
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          TraderSync is a solid veteran journal with a standout market-replay simulator. Finotaur
          is built futures-first with an AI coach that isn't message-capped, a built-in trade
          copier, and a prop-risk dashboard — and includes a free plan.
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
          Methodology: TraderSync pricing and features checked from its published pages, July
          2026. We build Finotaur — assume we're biased, and check the sources yourself.
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
              Pick TraderSync if...
            </h3>
            <ul className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3 space-y-ds-2">
              <li>You want a market-replay simulator with Level II data down to 250ms precision.</li>
              <li>You trade a broad mix of assets and want a decade-plus track record.</li>
              <li>You don't need a trade copier or a dedicated prop-risk dashboard.</li>
            </ul>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Pick Finotaur if...
            </h3>
            <ul className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3 space-y-ds-2">
              <li>You want to start free and only pay once the journal proves its worth.</li>
              <li>You want an AI coach with no daily message cap and dollar-quantified leaks.</li>
              <li>You want a built-in trade copier and a live prop-risk dashboard in the same product.</li>
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
          Finotaur vs TraderSync, feature by feature
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
                    TraderSync
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
                      <RowCell value={row.tradersync} />
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
            <DashIcon className="w-3 h-3" /> Some Trustpilot reviews report TraderSync's API sync
            dropping closing executions with certain brokers.
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
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">TraderSync</h3>
            <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-4 space-y-ds-2">
              <li>Pro — $22.46/mo annual ($29.95 monthly)</li>
              <li>Premium — $37.46/mo annual ($49.95 monthly)</li>
              <li>Elite — $59.96/mo annual ($79.95 monthly)</li>
              <li>No free plan · 7-day free trial on all tiers</li>
              <li>Futures options & full asset coverage require Elite</li>
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
          SECTION 5 — THE COPIER DIFFERENCE
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>WHAT'S DIFFERENT</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          The copier difference
        </SectionTitle>

        <div className="max-w-2xl mx-auto mt-ds-6">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            As of July 2026, TraderSync does not offer a trade copier — it's a journaling and
            analytics tool, not an execution tool. Finotaur includes a built-in copier for
            self-copying trades across your own connected accounts: mirror a strategy from your
            personal account into a funded evaluation account, or keep two of your own accounts in
            sync, without leaving the journal. Pair that with a live prop-risk dashboard tracking
            drawdown distance and daily-loss capacity, and Finotaur covers the loop from execution
            to risk to review in one product — where TraderSync focuses on the review layer alone.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Finotaur vs TraderSync — frequently asked questions
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
