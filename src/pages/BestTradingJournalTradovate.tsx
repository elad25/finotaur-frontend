/**
 * /best-trading-journal-for-tradovate — SEO landing page.
 *
 * Target keyword: "best trading journal for tradovate"
 * Audience: Tradovate futures traders looking for an automated journal.
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
  Tag,
  Calendar,
  Trophy,
  GraduationCap,
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
    question: "Does Finotaur connect to Tradovate?",
    answer:
      "Yes. Finotaur connects directly to your Tradovate account using secure OAuth and imports your fills, orders, fees, and positions automatically — no manual entry and no stored passwords.",
  },
  {
    question: "Will it import my trades automatically?",
    answer:
      "Yes. Once connected, your Tradovate trades sync on their own around the clock, so your journal stays current without any copy-pasting.",
  },
  {
    question: "Can I connect more than one Tradovate account?",
    answer:
      "Yes. You can track multiple Tradovate accounts — funded, evaluation, and personal — side by side in one journal.",
  },
  {
    question: "Does it work for prop-firm (funded) accounts?",
    answer:
      "Yes. Finotaur is built futures-first and supports prop-firm and evaluation accounts on Tradovate.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. The Trader plan includes a 14-day free trial, so you can connect Tradovate and see your journal before paying anything — and the free tier lets you try the journal with 10 trades, no card required.",
  },
  {
    question: "How much does it cost?",
    answer:
      "You can start free with a 10-trade demo portfolio. The Trader plan is $44.99/month with a 14-day free trial and adds unlimited trades, multiple broker connections, and the AI trading coach. See the pricing page for current details.",
  },
  {
    question: "Do I have to enter trades manually?",
    answer:
      "No. Automatic Tradovate sync imports your executions for you. You add the context — tags, notes, and screenshots — not the raw data.",
  },
];

// ---------------------------------------------------------------------------
// Comparison table rows
// ---------------------------------------------------------------------------
const COMPARISON_ROWS = [
  "Automatic Tradovate import",
  "Futures-accurate R & P&L",
  "Multiple Tradovate accounts",
  "AI feedback on your mistakes",
  "Tags, notes & screenshots",
  "Behavioral & risk alerts",
  "Built-in trading education",
];

// ---------------------------------------------------------------------------
// Feature cards
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    Icon: Zap,
    title: "Automatic Tradovate sync",
    description: "Fills, orders, fees, and positions import with zero manual entry.",
  },
  {
    Icon: Brain,
    title: "AI trading coach (FINO)",
    description: "Daily ranked insights and a Leak Finder that names your costliest recurring mistake.",
  },
  {
    Icon: BarChart3,
    title: "Futures-accurate analytics",
    description: "R-multiple, expectancy, and P&L that understand contracts, ticks, and partial fills.",
  },
  {
    Icon: Layers,
    title: "Multi-account & prop-firm ready",
    description: "Track funded, evaluation, and personal Tradovate accounts side by side.",
  },
  {
    Icon: Tag,
    title: "Tags, notes & screenshots",
    description: "Annotate every trade and build a searchable record of your decisions.",
  },
  {
    Icon: Calendar,
    title: "Calendar, sessions & strategies",
    description: "See performance by day and session, and measure adherence to your playbook.",
  },
  {
    Icon: Trophy,
    title: "Finotaur Score",
    description: "One number that grades your real edge across discipline, risk, and consistency.",
  },
  {
    Icon: GraduationCap,
    title: "300+ lesson Academy",
    description: "Structured trading education included, from fundamentals to advanced execution.",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function BestTradingJournalTradovate() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Best Trading Journal for Tradovate"
        description="Finotaur is a trading journal built for Tradovate. Connect your account, auto-import every fill, and get AI-powered analytics and a trading coach — no manual entry. 14-day free trial."
        path="/best-trading-journal-for-tradovate"
        jsonLd={[
          webPage({
            name: "Best Trading Journal for Tradovate",
            description:
              "A trading journal built for Tradovate: automatic trade import, futures-accurate analytics, and an AI trading coach.",
            path: "/best-trading-journal-for-tradovate",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Best Trading Journal for Tradovate", "/best-trading-journal-for-tradovate"],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>TRADING JOURNAL · BUILT FOR TRADOVATE</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          The Best Trading Journal for Tradovate
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Finotaur connects directly to your Tradovate account, auto-imports every fill, and turns
          your real executions into performance analytics, behavioral insights, and an AI trading
          coach — with zero manual entry. Built futures-first, with native support for prop-firm
          and multiple Tradovate accounts.
        </p>

        {/* Tradovate trust badge */}
        <div className="flex items-center justify-center gap-3 mt-ds-5">
          <img
            src="/brokers/tradovate-mark.svg"
            alt="Tradovate logo"
            className="h-6 w-auto"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/brokers/tradovate.png";
            }}
          />
          <span className="text-ink-secondary text-sm">Works natively with Tradovate</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Connect Tradovate in seconds · No spreadsheets · Cancel anytime
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — THE PROBLEM
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>THE PROBLEM</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Spreadsheets weren't built for futures
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Manual entry eats your edge
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Copy-pasting fills from Tradovate into a spreadsheet is slow and error-prone. Every
              missed trade is a blind spot in your stats.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Futures math is different
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Contracts, ticks, and multi-account prop setups break generic journals that were built
              for stocks.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              No feedback loop
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              A spreadsheet records what happened. It never tells you what to fix next.
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
          Connect once. Your journal builds itself.
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">01</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Connect Tradovate securely
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Link your Tradovate account in seconds with OAuth. No passwords stored.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">02</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Trades import automatically
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Every fill, order, and position syncs on its own, around the clock — no manual entry.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">03</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Get analytics + AI feedback
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              See your real performance and risk, and let the AI coach name the exact mistakes
              costing you money.
            </p>
          </Card>
        </div>

        <p className="text-ink-secondary text-[15px] text-center mt-ds-6 max-w-2xl mx-auto">
          Connect multiple Tradovate accounts — funded, evaluation, and personal — in one place.
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — FEATURES
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>FEATURES</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Built for the way futures traders actually work
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
          What makes a great Tradovate journal
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
          Tradovate journal — frequently asked questions
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
          Turn your Tradovate executions into an edge
        </SectionTitle>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Connect Tradovate in seconds. Cancel anytime.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
