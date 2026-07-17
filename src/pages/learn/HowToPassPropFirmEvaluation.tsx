/**
 * /learn/how-to-pass-a-prop-firm-evaluation — GEO answer page.
 *
 * Target query: "how to pass a prop firm evaluation"
 * Audience: futures traders attempting a funded-account evaluation (Apex, Topstep, etc.)
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Target,
  ShieldAlert,
  TrendingDown,
  ClipboardList,
  LineChart,
  Layers,
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

const PAGE_PATH = "/learn/how-to-pass-a-prop-firm-evaluation";

// ---------------------------------------------------------------------------
// FAQ data — single source of truth for both the accordion and faqPage() schema
// ---------------------------------------------------------------------------
const FAQS = [
  {
    question: "Why do most traders fail prop firm challenges?",
    answer:
      "Mostly position sizing, not strategy. Traders size positions relative to their account size instead of their trailing drawdown limit, so a normal losing streak breaches the rule before the strategy ever gets a fair test. Published industry estimates put pass rates around 15-20% at Topstep and 12-18% at Apex.",
  },
  {
    question: "What is trailing drawdown?",
    answer:
      "Trailing drawdown is a maximum-loss limit that moves up as your account's high-water mark rises, but never moves back down when you draw down again. Static drawdown, by contrast, is fixed to your starting balance. Trailing rules punish oversized wins as much as losses, because the limit locks in behind your peak equity.",
  },
  {
    question: "Should I journal differently for a funded account?",
    answer:
      "Yes. On a funded or evaluation account, track distance-to-drawdown and daily-loss capacity remaining alongside your normal trade notes — not just win/loss and R-multiple. The rule you can breach matters as much as the trade you took.",
  },
  {
    question: "Can I track multiple funded accounts in one journal?",
    answer:
      "Yes. Finotaur lets you connect and track multiple evaluation and funded accounts side by side, each with its own drawdown distance and daily-loss capacity, instead of juggling spreadsheets per account.",
  },
];

// ---------------------------------------------------------------------------
// 7-step checklist
// ---------------------------------------------------------------------------
const CHECKLIST = [
  {
    title: "Know your drawdown type",
    description:
      "Read your firm's rules before your first trade. Trailing and static drawdown behave differently, and assuming the wrong one is the fastest way to get blindsided.",
  },
  {
    title: "Size from your drawdown, not your account size",
    description:
      "Calculate position size from how much room you have left before the drawdown limit — not from the account's face value. This single change prevents most breaches.",
  },
  {
    title: "Set a hard daily stop",
    description:
      "Decide your maximum daily loss before the session starts, and stop trading the instant you hit it. No exceptions, no \"one more trade to get it back.\"",
  },
  {
    title: "Trade one setup",
    description:
      "Evaluations reward consistency, not creativity. Pick the setup you know best and repeat it — don't audition new strategies with firm capital on the line.",
  },
  {
    title: "Journal every session",
    description:
      "Log every trade, including the ones you skipped and why. The sessions you don't review are the ones that repeat their mistakes.",
  },
  {
    title: "Review weekly",
    description:
      "Set aside time each week to look at your drawdown distance, daily-loss patterns, and rule violations — not just P&L.",
  },
  {
    title: "Don't rush the evaluation",
    description:
      "There is no bonus for passing fast. Rushing to hit a profit target increases size and risk exactly when discipline matters most.",
  },
];

export default function HowToPassPropFirmEvaluation() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="How to Pass a Prop Firm Evaluation"
        description="Most evaluation failures come from position sizing against drawdown rules, not strategy. Learn trailing vs. static drawdown, daily loss limits, and a 7-step checklist to pass."
        path={PAGE_PATH}
        jsonLd={[
          webPage({
            name: "How to Pass a Prop Firm Evaluation",
            description:
              "A practical guide to passing a futures prop firm evaluation: drawdown types, daily loss limits, and a 7-step checklist.",
            path: PAGE_PATH,
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Learn", "/learn"],
            ["How to Pass a Prop Firm Evaluation", PAGE_PATH],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO + DIRECT ANSWER
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-1.5 text-[13px] text-ink-tertiary mb-ds-5">
          <Link to="/" className="hover:text-gold-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/learn" className="hover:text-gold-primary transition-colors">
            Learn
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-ink-secondary">How to Pass a Prop Firm Evaluation</span>
        </nav>

        <SectionEyebrow>PROP FIRM EVALUATIONS</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          How to Pass a Prop Firm Evaluation
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Most traders fail prop firm evaluations because of position sizing against the drawdown
          rule, not because of a bad strategy. Published industry estimates put pass rates around
          15-20% at Topstep and 12-18% at Apex. Passing consistently means sizing from your
          drawdown limit — not your account size — and enforcing a hard daily stop before every
          session.
        </p>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-5">Last updated: July 2026</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-6">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — WHY MOST TRADERS FAIL
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>THE #1 KILLER</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Why most traders fail (it's not the strategy)
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6 space-y-ds-4">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            Per published industry estimates, only around 15-20% of Topstep challenges and 12-18%
            of Apex evaluations end in a pass. The strategies traders bring in are usually
            reasonable. What breaks the evaluation is oversizing relative to the trailing drawdown
            rule — a position sized for the account's face value, not for the room actually left
            before the drawdown limit is breached.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            A single oversized loss can consume most of the available drawdown room in one trade,
            leaving no margin for the normal losing streaks every strategy produces. Fixing sizing
            first — before touching the strategy — is the highest-leverage change most traders can
            make.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <ShieldAlert className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">Oversizing</h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              The single most common evaluation-breaking mistake — sizing from account size, not
              drawdown room.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <TrendingDown className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">Rule confusion</h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Not knowing whether your drawdown is trailing or static leads to sizing decisions
              that look safe but aren't.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <Target className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">Rushing the target</h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Increasing size to hit the profit target faster raises risk exactly when the account
              can least afford it.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — TRAILING VS STATIC DRAWDOWN (definitional)
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>DEFINITIONS</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Trailing drawdown vs. static drawdown
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Trailing drawdown
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              A maximum-loss limit that moves up as your account's high-water mark (highest
              closed-equity point) rises — but never moves back down when equity falls again. The
              limit trails your peak balance, so profits you bank effectively raise the floor you
              must stay above.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Static drawdown
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              A fixed maximum-loss limit set against your starting balance and, once reached, it
              does not move regardless of how much profit you've since made. Static rules are more
              forgiving once you've built a cushion above your starting balance.
            </p>
          </Card>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-6 max-w-2xl mx-auto">
          Always confirm which type your specific evaluation uses — the two can call for very
          different sizing decisions on the same account.
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — DAILY LOSS LIMITS / CAPACITY REMAINING
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>RISK MANAGEMENT</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Daily loss limits and capacity remaining before entry
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            Most evaluations also enforce a daily loss limit, separate from the overall drawdown.
            Before every entry, the question isn't just "what's my stop" — it's "how much capacity
            do I have left today, and does this position size fit inside it." A trader who checks
            capacity remaining before every entry rarely gets surprised by a daily-limit breach; a
            trader who only checks it after a loss usually finds out too late.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — 7-STEP CHECKLIST
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>THE CHECKLIST</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          The 7-step checklist to pass your evaluation
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-7 space-y-ds-5">
          {CHECKLIST.map((item, index) => (
            <div key={item.title} className="flex gap-ds-4">
              <span className="font-mono text-gold-muted text-sm shrink-0 pt-1">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-wordmark font-medium text-lg text-ink-primary">
                  {item.title}
                </h3>
                <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-1">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — HOW FINOTAUR HELPS
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>HOW FINOTAUR HELPS</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Built for evaluation and funded accounts
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <ClipboardList className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Auto-synced journal for eval accounts
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Connect your evaluation or funded account and every fill imports automatically — no
              manual entry, no missed trades in your review.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <LineChart className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Prop risk dashboard
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Track live distance to your drawdown limit and daily-loss capacity remaining, across
              all your connected accounts, before you place your next trade.
            </p>
          </Card>
        </div>

        <div className="flex items-center justify-center gap-ds-3 mt-ds-6">
          <Layers className="w-4 h-4 text-ink-tertiary" />
          <p className="text-ink-tertiary text-[13px]">
            Track multiple funded and evaluation accounts side by side, in one journal.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 7 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Prop firm evaluations — frequently asked questions
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
          Track your evaluation with the discipline it demands
        </SectionTitle>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Connect your evaluation account in seconds. Cancel anytime.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
