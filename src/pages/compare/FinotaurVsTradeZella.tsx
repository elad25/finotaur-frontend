/**
 * /finotaur-vs-tradezella — SEO comparison landing page.
 *
 * Target keyword: "finotaur vs tradezella"
 * Audience: traders directly comparing the two products feature-for-feature.
 *
 * Honesty rule: this page names where TradeZella wins (AI backtesting depth)
 * as explicitly as where Finotaur wins. All TradeZella facts are dated and
 * sourced; do not add unverified claims (e.g. refund terms).
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Copy, ShieldCheck, Plus, Minus } from "lucide-react";

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
    question: "Which is better for futures traders?",
    answer:
      "Finotaur is built futures-first: Tradovate auto-sync, multi-account and prop-firm support, a built-in trade copier, and a live prop-firm risk dashboard. TradeZella also auto-syncs Tradovate and NinjaTrader (routed through the Tradovate API), but has no trade copier or dedicated prop-risk tooling as of July 2026.",
  },
  {
    question: "Does either have a free plan?",
    answer:
      "Finotaur does. Every new account automatically gets 14 days of full access to Trader and Investor features — no card required. Afterwards you keep a free plan with 10 manual trades and preview mode. Paid plans start when you upgrade. TradeZella has no free plan and no advertised free trial as of July 2026; every tier requires payment upfront.",
  },
  {
    question: "Which has better AI?",
    answer:
      "It depends what you need. TradeZella's AI backtesting suite is genuinely the strongest in this category — no-code automated backtesting over roughly 11 years of data, 3 AI agents, trade replay. But its AI usage is credit-metered (500-3,000 credits/month by tier). Finotaur's AI coach reviews your synced trades — daily briefings, a 7-family Leak Detector with dollar verdicts, Revenge Radar, and Pattern of the Week — without a separate credit ceiling on that review.",
  },
  {
    question: "Does TradeZella work with Tradovate?",
    answer:
      "Yes — both platforms do. TradeZella auto-syncs Tradovate (and NinjaTrader via the Tradovate API). Finotaur also auto-syncs Tradovate via OAuth. The difference is what happens after the sync: Finotaur adds a built-in trade copier and prop-firm risk dashboard, plus a market-intelligence terminal, in the same product.",
  },
];

// ---------------------------------------------------------------------------
// Comparison table rows
// ---------------------------------------------------------------------------
type CellValue = "yes" | "no" | "text";

interface ComparisonRow {
  label: string;
  finotaur: { value: CellValue; text?: string };
  tradezella: { value: CellValue; text?: string };
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: "Free plan",
    finotaur: { value: "yes" },
    tradezella: { value: "no" },
  },
  {
    label: "Free trial",
    finotaur: { value: "text", text: "14 days, all features, no card" },
    tradezella: { value: "no" },
  },
  {
    label: "Entry price (annual billing)",
    finotaur: { value: "text", text: "Free" },
    tradezella: { value: "text", text: "$26/mo (Essential)" },
  },
  {
    label: "Tradovate auto-sync",
    finotaur: { value: "yes" },
    tradezella: { value: "yes" },
  },
  {
    label: "AI model",
    finotaur: { value: "text", text: "AI coach on synced trades" },
    tradezella: { value: "text", text: "Credit-metered (500-3,000/mo)" },
  },
  {
    label: "AI backtesting (no-code, ~11yr data)",
    finotaur: { value: "no" },
    tradezella: { value: "yes" },
  },
  {
    label: "Trade copier",
    finotaur: { value: "yes" },
    tradezella: { value: "no" },
  },
  {
    label: "Prop-firm risk tooling",
    finotaur: { value: "text", text: "Live drawdown & loss-capacity" },
    tradezella: { value: "no" },
  },
  {
    label: "Market-intelligence terminal (AI stock/macro)",
    finotaur: { value: "yes" },
    tradezella: { value: "no" },
  },
  {
    label: "Trustpilot rating",
    finotaur: { value: "text", text: "—" },
    tradezella: { value: "text", text: "4.8 (978 reviews)" },
  },
];

function ComparisonCell({ cell }: { cell: { value: CellValue; text?: string } }) {
  if (cell.value === "yes") {
    return <Check className="w-4 h-4 text-gold-primary mx-auto" aria-label="Yes" />;
  }
  if (cell.value === "no") {
    return <X className="w-4 h-4 text-ink-tertiary mx-auto" aria-label="No" />;
  }
  return <span className="text-ink-primary text-sm">{cell.text}</span>;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function FinotaurVsTradeZella() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Finotaur vs TradeZella (2026)"
        titleAsIs
        description="Finotaur vs TradeZella, compared honestly: pricing, AI, Tradovate sync, trade copier, and prop-firm tooling. See which trading journal fits how you actually trade."
        path="/finotaur-vs-tradezella"
        jsonLd={[
          webPage({
            name: "Finotaur vs TradeZella (2026)",
            description:
              "A feature-by-feature comparison of Finotaur and TradeZella covering pricing, AI, Tradovate sync, trade copier, and prop-firm tooling.",
            path: "/finotaur-vs-tradezella",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Finotaur vs TradeZella", "/finotaur-vs-tradezella"],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>COMPARISON · FINOTAUR VS TRADEZELLA</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          Finotaur vs TradeZella (2026)
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          TradeZella is the stronger pick for no-code AI backtesting. Finotaur is the stronger
          pick for futures and prop-firm traders who want broker-synced journaling, an AI coach,
          a built-in trade copier, and prop-risk tracking in one platform — and it's the only one
          of the two with a free plan.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start free</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          No card required to start · 14 days of full access at signup
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — QUICK VERDICT
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>QUICK VERDICT</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Which one fits you
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Choose TradeZella if...
            </h3>
            <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-4 space-y-ds-2 list-disc pl-5">
              <li>No-code AI backtesting over years of history is your top priority</li>
              <li>You want 3 AI agents and trade replay for strategy testing</li>
              <li>You value a well-established support reputation (4.8 on Trustpilot, 978 reviews)</li>
              <li>You're comfortable paying before trying the product</li>
            </ul>
          </Card>

          <Card variant="featured" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Choose Finotaur if...
            </h3>
            <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-4 space-y-ds-2 list-disc pl-5">
              <li>You trade futures and want prop-firm risk tracking built in</li>
              <li>You want to replicate your own trading across accounts with a trade copier</li>
              <li>You'd rather start free and try before you commit to a paid plan</li>
              <li>You want a journal, an AI coach, and a market-intelligence terminal together</li>
            </ul>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — FULL COMPARISON TABLE
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>SIDE BY SIDE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Full feature comparison
        </SectionTitle>

        <div className="mt-ds-7 max-w-3xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                    Feature
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-gold-primary p-ds-3 border-b border-border-ds-subtle text-center">
                    Finotaur
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle text-center">
                    TradeZella
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary text-sm">
                      {row.label}
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-center">
                      <ComparisonCell cell={row.finotaur} />
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-center">
                      <ComparisonCell cell={row.tradezella} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-ink-tertiary text-[13px] text-center mt-ds-5 max-w-xl mx-auto">
            Methodology: TradeZella pricing and features checked from tradezella.com's published
            pages, July 2026. We build Finotaur — assume we're biased, and check the sources
            yourself.
          </p>
          <p className="text-ink-tertiary text-[12px] text-center mt-ds-2">
            Last updated: July 2026
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — PRICING COMPARED
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>PRICING COMPARED</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Both ladders, side by side
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-6 mt-ds-7 max-w-4xl mx-auto">
          <div>
            <h3 className="font-wordmark font-medium text-lg text-ink-primary mb-ds-3 text-center">
              Finotaur
            </h3>
            <div className="space-y-ds-3">
              <Card variant="default" padding="compact">
                <p className="text-ink-primary font-medium">Free</p>
                <p className="text-gold-primary font-semibold text-xl mt-ds-1">$0/month</p>
                <p className="text-ink-tertiary text-[13px] mt-ds-1">No card required</p>
              </Card>
              <Card variant="featured" padding="compact">
                <p className="text-ink-primary font-medium">Trader</p>
                <p className="text-gold-primary font-semibold text-xl mt-ds-1">
                  $44.99/mo <span className="text-ink-tertiary text-sm font-normal">or $409/yr</span>
                </p>
                <p className="text-ink-tertiary text-[13px] mt-ds-1">14 days free at signup</p>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="font-wordmark font-medium text-lg text-ink-primary mb-ds-3 text-center">
              TradeZella
            </h3>
            <div className="space-y-ds-3">
              <Card variant="default" padding="compact">
                <p className="text-ink-primary font-medium">Essential</p>
                <p className="text-ink-secondary font-semibold text-xl mt-ds-1">
                  $35/mo <span className="text-ink-tertiary text-sm font-normal">($26/mo annual)</span>
                </p>
                <p className="text-ink-tertiary text-[13px] mt-ds-1">1 trading account, 500 AI credits</p>
              </Card>
              <Card variant="default" padding="compact">
                <p className="text-ink-primary font-medium">Pro</p>
                <p className="text-ink-secondary font-semibold text-xl mt-ds-1">
                  $59/mo <span className="text-ink-tertiary text-sm font-normal">($44/mo annual)</span>
                </p>
                <p className="text-ink-tertiary text-[13px] mt-ds-1">50 trading accounts, 1,500 AI credits</p>
              </Card>
              <Card variant="default" padding="compact">
                <p className="text-ink-primary font-medium">Ultra</p>
                <p className="text-ink-secondary font-semibold text-xl mt-ds-1">
                  $99/mo <span className="text-ink-tertiary text-sm font-normal">($74/mo annual)</span>
                </p>
                <p className="text-ink-tertiary text-[13px] mt-ds-1">Unlimited accounts, 3,000 AI credits</p>
              </Card>
            </div>
          </div>
        </div>

        <p className="text-ink-tertiary text-[12px] text-center mt-ds-6">
          TradeZella pricing from tradezella.com/pricing, July 2026. Prices and tiers change —
          verify current pricing on each provider's own site before deciding.
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — THE COPIER DIFFERENCE
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>THE COPIER DIFFERENCE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Why the trade copier matters
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <Copy className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Built into Finotaur
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Finotaur includes a trade copier for replicating your own trading across your own
              connected accounts — funded, evaluation, or personal — without a separate tool.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <X className="w-6 h-6 text-ink-tertiary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Absent from TradeZella
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              As of July 2026, TradeZella's published pages show no trade copier feature. If
              copying is part of your workflow, it's a separate tool to source and manage.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <ShieldCheck className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Paired with prop-risk tracking
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              The copier sits next to a live prop-firm dashboard — drawdown distance and
              daily-loss capacity — so replicated trades stay inside your account's rules.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Finotaur vs TradeZella — frequently asked questions
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
          SECTION 7 — CROSS-LINKS
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>KEEP COMPARING</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          More ways to evaluate Finotaur
        </SectionTitle>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Link
            to="/tradezella-alternative"
            className="text-ink-secondary text-sm hover:text-gold-primary transition-colors"
          >
            Looking for a TradeZella alternative? →
          </Link>
          <Link
            to="/best-trading-journal-for-tradovate"
            className="text-ink-secondary text-sm hover:text-gold-primary transition-colors"
          >
            Best trading journal for Tradovate →
          </Link>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 8 — FINAL CTA
      ================================================================ */}
      <SectionShell atmosphere="subtle" beam={true}>
        <SectionEyebrow>GET STARTED</SectionEyebrow>

        <SectionTitle as="h2" size="large" gradient="split">
          See which one fits your trading, free
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
          No card required · 14 days of full access at signup · Cancel anytime
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
