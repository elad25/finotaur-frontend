/**
 * /best-trading-journal-for-futures — SEO landing page.
 *
 * Target keyword: "best trading journal for futures traders"
 * Audience: Futures traders looking for tick-accurate, automated journal analytics.
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
  Zap,
  Brain,
  BarChart3,
  Layers,
  Calendar,
  Target,
  Activity,
  Clock,
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
    question: "Which futures and brokers does it support?",
    answer:
      "Finotaur auto-syncs with Tradovate and other leading brokers, and journals any futures you trade — index futures like ES and NQ, energies like CL, metals like GC, and more, including micros.",
  },
  {
    question: "Does it handle ticks and point values correctly?",
    answer:
      "Yes. Finotaur imports each contract with the right tick size and point value, so your P&L and statistics reflect real futures math, not stock-style price math.",
  },
  {
    question: "Can I track micro contracts (like MES and MNQ)?",
    answer:
      "Yes. Micros are journaled with their own contract math alongside their full-size counterparts.",
  },
  {
    question: "Does it work for prop-firm and funded futures accounts?",
    answer:
      "Yes. Finotaur is built futures-first and supports prop-firm and evaluation accounts, with multiple accounts tracked side by side.",
  },
  {
    question: "Do I have to enter trades manually?",
    answer:
      "No. Automatic broker sync imports your fills, orders, and fees for you. You add context — tags, notes, and screenshots.",
  },
  {
    question: "How much does it cost?",
    answer:
      "You can start free — the demo portfolio includes 10 journal trades and 3 AI stock analyses a day, no card required. The Trader plan is $44.99/month with a 14-day free trial and adds unlimited trades, multiple broker connections, and the AI trading coach.",
  },
];

// ---------------------------------------------------------------------------
// Comparison table rows
// ---------------------------------------------------------------------------
const COMPARISON_ROWS = [
  "Tick- and point-accurate P&L",
  "R-multiple & expectancy",
  "Per-contract normalization",
  "Multiple futures accounts",
  "Session / time-of-day analysis",
  "Automatic import of fills & fees",
];

// ---------------------------------------------------------------------------
// Feature cards
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    Icon: BarChart3,
    title: "Tick- and point-accurate P&L",
    description: "Every contract's math handled — ticks, points, and multipliers, not just price.",
  },
  {
    Icon: Target,
    title: "R-multiple & expectancy",
    description: "Grade trades by risk, not just dollars, with canonical R analytics.",
  },
  {
    Icon: Layers,
    title: "Per-contract & per-account views",
    description: "Normalize to one contract or one account to compare apples to apples.",
  },
  {
    Icon: Activity,
    title: "Excursion analysis (MFE/MAE)",
    description: "See how far trades ran your way and against you, to tune stops and targets.",
  },
  {
    Icon: Clock,
    title: "Session & time-of-day performance",
    description: "Find your best and worst hours across the full futures session.",
  },
  {
    Icon: Zap,
    title: "Automatic broker sync",
    description: "Fills, orders, and fees import on their own, around the clock.",
  },
  {
    Icon: Brain,
    title: "AI trading coach (FINO)",
    description: "Daily ranked insights and a Leak Finder that names your costliest mistake.",
  },
  {
    Icon: Calendar,
    title: "Calendar, tags & strategies",
    description: "Annotate trades and measure adherence to your playbook.",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function BestTradingJournalFutures() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Best Trading Journal for Futures Traders"
        description="A trading journal built for futures: tick- and contract-accurate analytics, automatic broker sync, R-multiple stats, and an AI coach — for ES, NQ, CL and more. 14-day free trial."
        path="/best-trading-journal-for-futures"
        jsonLd={[
          webPage({
            name: "Best Trading Journal for Futures Traders",
            description:
              "A trading journal built for futures: tick- and contract-accurate analytics, automatic broker sync, R-multiple stats, and an AI coach.",
            path: "/best-trading-journal-for-futures",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Best Trading Journal for Futures Traders", "/best-trading-journal-for-futures"],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>TRADING JOURNAL · BUILT FOR FUTURES</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          The Best Trading Journal for Futures Traders
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Finotaur is a trading journal built for futures traders. It auto-imports your fills,
          understands ticks, contracts, and point values, and turns them into accurate R-multiple
          analytics and AI feedback — across ES, NQ, CL, GC, and the rest of your book. No manual
          entry, no spreadsheet math.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Futures-accurate math · Automatic broker sync · Cancel anytime
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — THE PROBLEM
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>THE PROBLEM</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Stock journals get futures wrong
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Ticks and points, not just price
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              A fill at 4512.25 isn't a dollar — it's ticks and a point value. Generic journals
              built for stocks miss that math.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Per-contract P&L matters
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Size, partial fills, and contract multipliers change everything. Your stats are only
              as good as the math behind them.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Sessions run almost around the clock
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Futures don't stop at the stock-market close. A journal that buckets by equity hours
              hides your real edge by session.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — HOW IT WORKS
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>HOW IT WORKS</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Futures-accurate from the first fill
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">01</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Connect your broker
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Link Tradovate and other leading brokers in seconds. No manual entry.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">02</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Fills import with the right math
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Contracts, ticks, fees, and point values are imported and calculated for you.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">03</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              See accurate analytics + AI feedback
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              R-multiple, expectancy, and an AI coach that flags what to fix next.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — FEATURES
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>FEATURES</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Built for futures math
        </SectionTitle>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-ds-5 mt-ds-7 max-w-6xl mx-auto">
          {FEATURES.map(({ Icon, title, description }) => (
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
        <SectionEyebrow>HOW TO CHOOSE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          What a futures journal must get right
        </SectionTitle>

        <div className="mt-ds-7 max-w-2xl mx-auto">
          <p className="text-ink-tertiary text-[13px] text-center mb-ds-4">
            Finotaur vs. a manual spreadsheet.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                    Feature
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle text-center">
                    Manual spreadsheet
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-gold-primary p-ds-3 border-b border-border-ds-subtle text-center">
                    Finotaur
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row}>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary text-sm">
                      {row}
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-center">
                      <X className="w-4 h-4 text-ink-tertiary mx-auto" aria-label="No" />
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-center">
                      <Check className="w-4 h-4 text-gold-primary mx-auto" aria-label="Yes" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — PRICING
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>PRICING</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Start free. Upgrade when it pays for itself.
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-3xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">Free</h3>
            <p className="text-gold-primary font-semibold text-2xl mt-ds-2">$0/month</p>
            <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-4 space-y-ds-2">
              <li>No card required</li>
              <li>Demo portfolio — 10 trades</li>
              <li>AI Stock Analyzer — 3 analyses/day</li>
              <li>Full analytics, strategies & Academy</li>
            </ul>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">Trader</h3>
            <p className="text-gold-primary font-semibold text-2xl mt-ds-2">$44.99/month</p>
            <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-4 space-y-ds-2">
              <li>Everything in Free, plus:</li>
              <li>Unlimited trades</li>
              <li>Multiple broker connections</li>
              <li>AI trading coach & Finotaur Score</li>
            </ul>
          </Card>
        </div>

        <div className="flex flex-col items-center gap-ds-5 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
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
          SECTION 7 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Futures journal — frequently asked questions
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
          SECTION 8 — FINAL CTA
      ================================================================ */}
      <SectionShell atmosphere="full" beam={true}>
        <SectionEyebrow>GET STARTED</SectionEyebrow>

        <SectionTitle as="h2" size="lg" gradient="split">
          Turn your futures executions into an edge
        </SectionTitle>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Connect your broker in seconds. Cancel anytime.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
