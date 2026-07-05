/**
 * /ai-trading-journal — SEO landing page.
 *
 * Target keyword: "ai trading journal"
 * Audience: Traders looking for an AI-powered journal that coaches them, not just records trades.
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
  ShieldCheck,
  Trophy,
  Search,
  TrendingUp,
  FileText,
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
    question: "What does the AI actually do?",
    answer:
      "FINO analyzes your real, broker-verified trades and gives you a daily ranked briefing, a Leak Finder that names your costliest recurring mistake, pattern detection, behavioral alerts, and a single score for your edge.",
  },
  {
    question: "Is it automatic, or do I log trades myself?",
    answer:
      "It's automatic. Finotaur connects to your broker and imports your trades for you, so the AI always works on current, real data.",
  },
  {
    question: "Which brokers does it connect to?",
    answer:
      "Finotaur auto-syncs with Tradovate and other leading brokers, importing your fills, orders, and fees.",
  },
  {
    question: "Does the AI work on my own trades or generic advice?",
    answer:
      "It works on your own executions. Insights are grounded in your real trade history, not generic tips.",
  },
  {
    question: "Is the AI coach included in every plan?",
    answer:
      "The AI trading coach (FINO) is part of the Premium plan ($44.99/month). The Basic plan ($24.99/month, 14-day free trial) includes the full journal and analytics.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. The Basic plan includes a 14-day free trial so you can connect your broker and see your journal first.",
  },
];

// ---------------------------------------------------------------------------
// Comparison table rows
// ---------------------------------------------------------------------------
const COMPARISON_ROWS = [
  "AI feedback on your trades",
  "Automatic pattern detection",
  "Behavioral & risk alerts",
  "One score for your edge",
  "Automatic import",
  "Custom AI reports",
];

// ---------------------------------------------------------------------------
// Feature cards
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    Icon: Brain,
    title: "Daily AI briefing",
    description: "Ranked insights on what to fix first, every day.",
  },
  {
    Icon: Search,
    title: "Leak Finder",
    description: "The AI names the exact recurring mistake costing you money.",
  },
  {
    Icon: TrendingUp,
    title: "Pattern of the Week",
    description: "Your biggest recurring edge or leak, surfaced automatically.",
  },
  {
    Icon: ShieldCheck,
    title: "Behavioral & risk alerts",
    description: "Get flagged before you tilt or oversize.",
  },
  {
    Icon: Trophy,
    title: "Finotaur Score",
    description: "One number that grades your real edge across discipline, risk, and consistency.",
  },
  {
    Icon: FileText,
    title: "Custom AI reports",
    description: "Ask for the analysis you want and get it on your real data.",
  },
  {
    Icon: Zap,
    title: "Automatic import",
    description: "Every trade lands in your journal with no manual entry.",
  },
  {
    Icon: BarChart3,
    title: "Full performance analytics",
    description: "Equity curve, R-multiple, and advanced stats under the AI layer.",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function AITradingJournal() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="AI Trading Journal"
        description="An AI trading journal that auto-imports your trades and coaches you: daily ranked insights, a Leak Finder that names your costliest mistake, behavioral alerts, and one score for your real edge. 14-day free trial."
        path="/ai-trading-journal"
        jsonLd={[
          webPage({
            name: "AI Trading Journal",
            description:
              "An AI trading journal that auto-imports your trades and coaches you: daily ranked insights, a Leak Finder, behavioral alerts, and one score for your real edge.",
            path: "/ai-trading-journal",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["AI Trading Journal", "/ai-trading-journal"],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>AI TRADING JOURNAL · MEET FINO</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          An AI Trading Journal That Actually Coaches You
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Finotaur is an AI trading journal. It connects to your broker, imports every trade
          automatically, and puts an AI coach on your shoulder — daily ranked insights, a Leak
          Finder that names the exact mistake costing you money, and one score for your real edge.
          Less logging, more learning.
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
          Automatic import · AI coach · Cancel anytime
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — THE PROBLEM
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>THE PROBLEM</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          A spreadsheet records. It doesn't coach.
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Data without direction
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              A grid of trades tells you what happened. It never tells you what to fix next.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              You can't see your own patterns
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              The leaks that cost the most are the ones you're blind to — that's exactly what an AI
              coach surfaces.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Manual logging kills consistency
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              If journaling is a chore, you stop doing it. Automatic import keeps the loop alive.
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
          Connect once. Your AI coach does the rest.
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">01</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Connect your broker
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Link Tradovate and other leading brokers in seconds — trades import automatically.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">02</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              FINO analyzes your real trades
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              The AI reads your actual executions, not hypotheticals.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">03</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Get ranked fixes + alerts
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Daily insights, a named top mistake, and alerts before you tilt.
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
          Your AI trading coach (FINO)
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
          AI journal vs a plain spreadsheet
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
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">Basic</h3>
            <p className="text-gold-primary font-semibold text-2xl mt-ds-2">$24.99/month</p>
            <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-4 space-y-ds-2">
              <li>14-day free trial</li>
              <li>25 trades/month</li>
              <li>1 broker connection</li>
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

        <p className="text-ink-secondary text-[14px] text-center mt-ds-5">
          The AI trading coach (FINO) is included with Premium.
        </p>

        <div className="flex flex-col items-center gap-ds-5 mt-ds-5">
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
          AI trading journal — frequently asked questions
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
          Put an AI coach on your trading
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
