/**
 * /tradezella-alternative — SEO comparison landing page.
 *
 * Target keyword: "tradezella alternative"
 * Audience: traders evaluating TradeZella who are pricing out alternatives
 * (usually triggered by the no-free-plan / AI-credit-limit / no-copier gaps).
 *
 * Honesty rule: TradeZella has real strengths (AI backtesting depth, support
 * reputation) — this page says so explicitly. All TradeZella facts are dated
 * and sourced; do not add unverified claims (e.g. refund terms).
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Minus as DashIcon,
  Gift,
  Brain,
  RefreshCw,
  Copy,
  ShieldCheck,
  Plus,
  Minus,
} from "lucide-react";

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
    question: "Is there a free TradeZella alternative?",
    answer:
      "Yes. TradeZella has no free plan and no advertised free trial as of July 2026 — you need to pay before you can see the product. Finotaur has a free plan (a 10-trade demo journal, no card required) plus a 14-day free trial on the paid Trader plan.",
  },
  {
    question: "Does TradeZella have a trade copier?",
    answer:
      "No. As of July 2026, TradeZella does not offer a trade copier. Finotaur includes a built-in copier for replicating your own trading across your own connected accounts.",
  },
  {
    question: "Can I try Finotaur before paying?",
    answer:
      "Yes. Start on the free plan with no card required, or start the Trader plan's 14-day free trial to unlock unlimited trades, broker auto-sync, and the AI coach.",
  },
  {
    question: "Does TradeZella limit how much AI I can use?",
    answer:
      "Yes. TradeZella meters AI usage with a credit system — 500 credits/month on Essential, 1,500 on Pro, and 3,000 on Ultra. Finotaur's AI review of your synced trades isn't gated by a separate credit balance.",
  },
  {
    question: "Does TradeZella work with Tradovate?",
    answer:
      "Yes, TradeZella auto-syncs Tradovate. It also supports NinjaTrader, routed through the Tradovate API. Finotaur also auto-syncs Tradovate via OAuth, and adds a built-in trade copier and prop-firm risk tooling on top of the synced data.",
  },
];

// ---------------------------------------------------------------------------
// Comparison table rows
// ---------------------------------------------------------------------------
type CellValue = "yes" | "no" | "text";

interface ComparisonRow {
  label: string;
  tradezella: { value: CellValue; text?: string };
  finotaur: { value: CellValue; text?: string };
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: "Entry price (annual billing)",
    tradezella: { value: "text", text: "$26/mo (Essential)" },
    finotaur: { value: "text", text: "Free" },
  },
  {
    label: "Free plan",
    tradezella: { value: "no" },
    finotaur: { value: "yes" },
  },
  {
    label: "Free trial",
    tradezella: { value: "no" },
    finotaur: { value: "text", text: "14 days (Trader)" },
  },
  {
    label: "Tradovate auto-sync",
    tradezella: { value: "yes" },
    finotaur: { value: "yes" },
  },
  {
    label: "AI model",
    tradezella: { value: "text", text: "Credit-metered (500-3,000/mo)" },
    finotaur: { value: "text", text: "AI coach on synced trades" },
  },
  {
    label: "Trade copier",
    tradezella: { value: "no" },
    finotaur: { value: "yes" },
  },
  {
    label: "Prop-firm risk tooling",
    tradezella: { value: "no" },
    finotaur: { value: "text", text: "Live drawdown & loss-capacity" },
  },
  {
    label: "Trustpilot rating",
    tradezella: { value: "text", text: "4.8 (978 reviews)" },
    finotaur: { value: "text", text: "—" },
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
// "What Finotaur does differently" cards
// ---------------------------------------------------------------------------
const DIFFERENTIATORS = [
  {
    Icon: Gift,
    title: "Free start, then a real trial",
    description:
      "Begin on a free 10-trade demo journal with no card required. Move to the 14-day Trader trial when you're ready to connect a live account.",
  },
  {
    Icon: Brain,
    title: "AI review without credit anxiety",
    description:
      "FINO reviews your synced trades — daily briefings, a Leak Detector across 7 mistake families with dollar verdicts, Revenge Radar, and a Pattern of the Week.",
  },
  {
    Icon: Copy,
    title: "Journal, copier & prop-risk in one",
    description:
      "A built-in trade copier lets you replicate your own trading across your own connected accounts, alongside a live prop-firm drawdown and daily-loss dashboard.",
  },
  {
    Icon: RefreshCw,
    title: "A market-intelligence terminal, included",
    description:
      "AI stock and macro analysis backed by institutional-grade data lives in the same product as your journal — not a separate subscription.",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function TradeZellaAlternative() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="TradeZella Alternative (2026)"
        description="Looking for a TradeZella alternative? Compare pricing, AI limits, and the trade copier gap — and see why Finotaur offers a free plan, a 14-day trial, and a built-in copier."
        path="/tradezella-alternative"
        jsonLd={[
          webPage({
            name: "TradeZella Alternative (2026): Finotaur",
            description:
              "A honest comparison of TradeZella and Finotaur for traders evaluating alternatives: pricing, AI credit limits, and trade copier availability.",
            path: "/tradezella-alternative",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["TradeZella Alternative", "/tradezella-alternative"],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>COMPARISON · TRADEZELLA ALTERNATIVE</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          TradeZella Alternative (2026): Finotaur
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Traders look for a TradeZella alternative mainly over three things: no free plan or
          trial, an AI-credit system that meters how much coaching you can use, and no trade
          copier. Finotaur offers a free start, a 14-day Trader trial, AI review that isn't
          credit-metered, and a built-in copier with prop-firm risk tracking.
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
          No card required to start · 14-day free trial on Trader
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — WHY TRADERS LOOK FOR AN ALTERNATIVE
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>WHY TRADERS LOOK FOR AN ALTERNATIVE</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          The gaps that send traders searching
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              No free plan or free trial
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              As of TradeZella's July 2026 pricing page, every tier requires payment upfront —
              Essential starts at $35/mo ($26/mo billed annually). There's no way to use the
              product before you pay.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              AI usage is credit-metered
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              TradeZella's AI runs on a credit allowance — 500/month on Essential, 1,500 on Pro,
              3,000 on Ultra. Heavy AI users can hit the ceiling and need to wait or upgrade.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Top tier runs $99/month
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Ultra (unlimited accounts, 3,000 AI credits) lists at $99/mo, or $74/mo billed
              annually — a meaningful commitment before you know if the workflow fits you.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              No trade copier
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              As of July 2026, TradeZella does not offer a trade copier. If replicating your own
              trading across accounts matters to you, it isn't part of the product.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — WHERE TRADEZELLA GENUINELY WINS
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>BEING HONEST</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Where TradeZella genuinely wins
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <Brain className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              AI backtesting depth
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              TradeZella's no-code automated backtesting over roughly 11 years of data, with 3 AI
              agents and trade replay, is a genuinely strong and differentiated feature. It's the
              deepest backtesting suite in this category.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <ShieldCheck className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Strong support reputation
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              TradeZella carries a 4.8 rating across 978 Trustpilot reviews (a claimed, paid
              profile) — a solid signal for support responsiveness and user satisfaction.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <DashIcon className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Education library
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              TradeZella pairs its journal with a built-out education library, which can help
              newer traders who want structured learning alongside their trade data.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — WHAT FINOTAUR DOES DIFFERENTLY
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>WHAT FINOTAUR DOES DIFFERENTLY</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Built to remove the friction TradeZella adds
        </SectionTitle>

        <div className="grid sm:grid-cols-2 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          {DIFFERENTIATORS.map(({ Icon, title, description }) => (
            <Card key={title} variant="default" padding="default">
              <Icon className="w-6 h-6 text-gold-primary mb-ds-3" />
              <h3 className="font-wordmark font-medium text-lg text-ink-primary">{title}</h3>
              <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — COMPARISON TABLE
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>SIDE BY SIDE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          TradeZella vs. Finotaur
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
                    TradeZella
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-gold-primary p-ds-3 border-b border-border-ds-subtle text-center">
                    Finotaur
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
                      <ComparisonCell cell={row.tradezella} />
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-center">
                      <ComparisonCell cell={row.finotaur} />
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
          SECTION 6 — SWITCHING
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>SWITCHING</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Moving over takes minutes, not a migration project
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">01</span>
            <h3 className="font-wordmark font-medium text-xl text-ink-primary mt-ds-3">
              Connect Tradovate via OAuth
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Link your account securely in seconds. No passwords stored, no manual setup.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">02</span>
            <h3 className="font-wordmark font-medium text-xl text-ink-primary mt-ds-3">
              History imports automatically
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Your fills, orders, fees, and positions sync on their own — no CSV exports and no
              wrangling spreadsheets to bring your history over.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">03</span>
            <h3 className="font-wordmark font-medium text-xl text-ink-primary mt-ds-3">
              Start getting AI feedback
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Once synced, FINO reviews your trades and surfaces the mistakes worth fixing first.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 7 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          TradeZella alternative — frequently asked questions
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
          SECTION 8 — CROSS-LINKS
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>KEEP COMPARING</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          More ways to evaluate Finotaur
        </SectionTitle>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Link
            to="/finotaur-vs-tradezella"
            className="text-ink-secondary text-sm hover:text-gold-primary transition-colors"
          >
            Finotaur vs TradeZella: full feature comparison →
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
          SECTION 9 — FINAL CTA
      ================================================================ */}
      <SectionShell atmosphere="full" beam={true}>
        <SectionEyebrow>GET STARTED</SectionEyebrow>

        <SectionTitle as="h2" size="large" gradient="split">
          Try the free plan before you commit to anything
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
          No card required · 14-day free trial on Trader · Cancel anytime
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
